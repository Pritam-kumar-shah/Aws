/**
 * Email OTP core — the single source of truth for every OTP rule.
 *
 * It lives under `supabase/functions/_shared/` so the Supabase CLI bundles it
 * with the Edge Functions; the browser app reaches it through the thin
 * `src/lib/otp.ts` re-export. Browser, Node (tests) and Deno therefore all run
 * the exact same expiry, cooldown and quota logic.
 *
 * IMPORTANT: this module must stay dependency-free and use only Web-standard
 * APIs (`crypto.getRandomValues`, `crypto.subtle`, `TextEncoder`). No `@/`
 * aliases, no React, no Node built-ins — Deno has to be able to run it as-is.
 */

// ─── Tunables ────────────────────────────────────────────────────────────────

export const OTP_POLICY = {
  /** Number of digits in the emailed code. */
  length: 6,
  /** How long a code stays valid. */
  ttlSeconds: 10 * 60,
  /** Wrong-code guesses allowed before the code is burned. */
  maxVerifyAttempts: 5,
  /** Minimum gap between two "send code" requests for the same email. */
  resendCooldownSeconds: 60,
  /** Codes a single email may request inside `rateLimitWindowSeconds`. */
  maxSendsPerWindow: 5,
  rateLimitWindowSeconds: 60 * 60,
} as const;

export type OtpPolicy = typeof OTP_POLICY;

// ─── Email handling ──────────────────────────────────────────────────────────

/**
 * Practical email check: one `@`, a dotted domain, no whitespace, no
 * consecutive dots. Deliberately stricter than the RFC and deliberately
 * looser than a full parser — bad addresses just waste send quota.
 */
const EMAIL_RE = /^[^\s@,;:<>()[\]\\"]+@[^\s@.]+(?:\.[^\s@.]+)+$/;

/** Lowercase + trim. The single place that decides what "same email" means. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  const normalized = normalizeEmail(email);
  if (normalized.length === 0 || normalized.length > 254) return false;
  if (normalized.includes('..')) return false;
  const [local, domain] = normalized.split('@');
  if (!local || !domain) return false;
  if (local.length > 64) return false;
  if (local.startsWith('.') || local.endsWith('.')) return false;
  if (domain.startsWith('-') || domain.endsWith('-')) return false;
  return EMAIL_RE.test(normalized);
}

/**
 * `a***i@gmail.com` — shown back to the user so they can spot a typo without
 * us echoing a full address into a shared screen or a log line.
 */
export function maskEmail(email: string): string {
  const normalized = normalizeEmail(email);
  const at = normalized.lastIndexOf('@');
  if (at <= 0) return normalized;
  const local = normalized.slice(0, at);
  const domain = normalized.slice(at);
  if (local.length <= 2) return `${local[0]}*${domain}`;
  return `${local[0]}${'*'.repeat(Math.min(local.length - 2, 6))}${local[local.length - 1]}${domain}`;
}

// ─── Code generation ─────────────────────────────────────────────────────────

/**
 * Cryptographically-random numeric code, rejection-sampled so every digit is
 * uniform (`% 10` on a raw byte would bias 0-5).
 */
export function generateOtpCode(length: number = OTP_POLICY.length): string {
  if (!Number.isInteger(length) || length < 4 || length > 12) {
    throw new RangeError(`OTP length must be an integer between 4 and 12, got ${length}`);
  }
  let code = '';
  const buffer = new Uint8Array(length * 2);
  while (code.length < length) {
    crypto.getRandomValues(buffer);
    for (const byte of buffer) {
      if (code.length === length) break;
      // 250 is the largest multiple of 10 <= 255; everything above is rejected.
      if (byte < 250) code += String(byte % 10);
    }
  }
  return code;
}

/** Random hex string used as the per-row hash salt. */
export function generateSalt(bytes = 16): string {
  const buffer = new Uint8Array(bytes);
  crypto.getRandomValues(buffer);
  return Array.from(buffer, (b) => b.toString(16).padStart(2, '0')).join('');
}

// ─── Hashing ─────────────────────────────────────────────────────────────────

/**
 * Codes are never stored in the clear. The hash binds the code to the email
 * and to a per-row salt, so a leaked row cannot be replayed against another
 * address and a rainbow table over 10^6 codes is useless without the salt.
 *
 * `pepper` is a server-side secret (never shipped to the browser); pass `''`
 * on the client — the client only ever *verifies against the server*, so it
 * has no reason to compute a real hash.
 */
export async function hashOtp(
  code: string,
  email: string,
  salt: string,
  pepper = '',
): Promise<string> {
  const material = `${normalizeEmail(email)}:${salt}:${code}:${pepper}`;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(material));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Length-independent, content-constant-time comparison. Guards the verify
 * endpoint against timing oracles that would otherwise leak the code digit by
 * digit.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

// ─── Input sanitising ────────────────────────────────────────────────────────

/**
 * Strips everything a user might paste around a code — spaces, dashes, and the
 * zero-width characters some mail clients inject into copied text.
 */
export function sanitizeOtpInput(raw: string, length: number = OTP_POLICY.length): string {
  return raw.replace(/\D/g, '').slice(0, length);
}

export function isCompleteOtp(raw: string, length: number = OTP_POLICY.length): boolean {
  return sanitizeOtpInput(raw, length).length === length;
}

// ─── Expiry / attempts / rate limiting ───────────────────────────────────────

export interface OtpRecord {
  /** ISO timestamp. */
  expires_at: string;
  /** ISO timestamp, set once the code has been successfully used. */
  consumed_at?: string | null;
  attempts: number;
}

export type OtpRejection =
  | 'expired'
  | 'already_used'
  | 'too_many_attempts'
  | 'not_found';

export interface OtpCheckResult {
  usable: boolean;
  reason?: OtpRejection;
  attemptsRemaining: number;
}

/**
 * Decides whether a stored code may still be *tried*. Separate from the hash
 * comparison so the state machine can be unit-tested without crypto.
 */
export function checkOtpUsable(
  record: OtpRecord | null | undefined,
  now: Date = new Date(),
  policy: OtpPolicy = OTP_POLICY,
): OtpCheckResult {
  if (!record) return { usable: false, reason: 'not_found', attemptsRemaining: 0 };

  const remaining = Math.max(0, policy.maxVerifyAttempts - record.attempts);

  if (record.consumed_at) {
    return { usable: false, reason: 'already_used', attemptsRemaining: 0 };
  }
  if (record.attempts >= policy.maxVerifyAttempts) {
    return { usable: false, reason: 'too_many_attempts', attemptsRemaining: 0 };
  }
  if (new Date(record.expires_at).getTime() <= now.getTime()) {
    return { usable: false, reason: 'expired', attemptsRemaining: remaining };
  }
  return { usable: true, attemptsRemaining: remaining };
}

export function expiresAt(from: Date = new Date(), policy: OtpPolicy = OTP_POLICY): Date {
  return new Date(from.getTime() + policy.ttlSeconds * 1000);
}

export interface RateLimitDecision {
  allowed: boolean;
  reason?: 'cooldown' | 'window_quota';
  /** Seconds the caller must wait. 0 when allowed. */
  retryAfterSeconds: number;
  sendsRemaining: number;
}

/**
 * Two independent brakes:
 *  1. a short cooldown so the "Resend" button cannot be spammed, and
 *  2. a rolling hourly quota so one address cannot drain the daily mail quota.
 *
 * `recentSendTimestamps` are ISO strings for this email; anything older than
 * the window is ignored, so the caller can pass a generous slice.
 */
export function checkSendRateLimit(
  recentSendTimestamps: readonly string[],
  now: Date = new Date(),
  policy: OtpPolicy = OTP_POLICY,
): RateLimitDecision {
  const nowMs = now.getTime();
  const windowStart = nowMs - policy.rateLimitWindowSeconds * 1000;

  const inWindow = recentSendTimestamps
    .map((ts) => new Date(ts).getTime())
    .filter((ms) => Number.isFinite(ms) && ms > windowStart)
    .sort((a, b) => b - a);

  const sendsRemaining = Math.max(0, policy.maxSendsPerWindow - inWindow.length);

  const last = inWindow[0];
  if (last !== undefined) {
    const sinceLast = (nowMs - last) / 1000;
    if (sinceLast < policy.resendCooldownSeconds) {
      return {
        allowed: false,
        reason: 'cooldown',
        retryAfterSeconds: Math.ceil(policy.resendCooldownSeconds - sinceLast),
        sendsRemaining,
      };
    }
  }

  if (inWindow.length >= policy.maxSendsPerWindow) {
    // Wait until the oldest send in the window ages out.
    const oldest = inWindow[inWindow.length - 1];
    const retryAfter = Math.ceil((oldest + policy.rateLimitWindowSeconds * 1000 - nowMs) / 1000);
    return {
      allowed: false,
      reason: 'window_quota',
      retryAfterSeconds: Math.max(1, retryAfter),
      sendsRemaining: 0,
    };
  }

  return { allowed: true, retryAfterSeconds: 0, sendsRemaining };
}

// ─── Presentation helpers ────────────────────────────────────────────────────

/** Seconds to `m:ss` for the resend countdown, e.g. `95` → `1:35`. */
export function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, Math.ceil(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/** User-facing copy for every rejection the server can return. */
export function describeOtpRejection(reason: OtpRejection | undefined): string {
  switch (reason) {
    case 'expired':
      return 'That code has expired. Request a new one.';
    case 'already_used':
      return 'That code has already been used. Request a new one.';
    case 'too_many_attempts':
      return 'Too many incorrect attempts. Request a fresh code.';
    case 'not_found':
      return 'We could not find an active code for this email. Request a new one.';
    default:
      return 'That code is incorrect. Check your email and try again.';
  }
}
