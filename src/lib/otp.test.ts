import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  OTP_POLICY,
  normalizeEmail,
  isValidEmail,
  maskEmail,
  generateOtpCode,
  generateSalt,
  hashOtp,
  timingSafeEqual,
  sanitizeOtpInput,
  isCompleteOtp,
  checkOtpUsable,
  expiresAt,
  checkSendRateLimit,
  formatCountdown,
  describeOtpRejection,
} from '@/lib/otp';

const NOW = new Date('2026-11-01T10:00:00.000Z');
const ago = (seconds: number) => new Date(NOW.getTime() - seconds * 1000).toISOString();
const ahead = (seconds: number) => new Date(NOW.getTime() + seconds * 1000).toISOString();

afterEach(() => {
  vi.restoreAllMocks();
});

describe('normalizeEmail', () => {
  it('lowercases and trims', () => {
    expect(normalizeEmail('  Aditi.Sharma@Gmail.COM \n')).toBe('aditi.sharma@gmail.com');
  });

  it('is idempotent', () => {
    const once = normalizeEmail(' A@B.co ');
    expect(normalizeEmail(once)).toBe(once);
  });
});

describe('isValidEmail', () => {
  it.each([
    'a@b.co',
    'aditi.sharma@manit.ac.in',
    'student+tag@college.edu',
    'UPPER@EXAMPLE.COM',
    'first_last@sub.domain.org',
  ])('accepts %s', (email) => {
    expect(isValidEmail(email)).toBe(true);
  });

  it.each([
    ['empty', ''],
    ['whitespace only', '   '],
    ['no @', 'nobody.example.com'],
    ['no dot in domain', 'someone@localhost'],
    ['two @', 'a@b@c.com'],
    ['leading dot in local part', '.a@b.co'],
    ['trailing dot in local part', 'a.@b.co'],
    ['consecutive dots', 'a..b@c.co'],
    ['inner space', 'a b@c.co'],
    ['comma', 'a,b@c.co'],
    ['angle brackets', '<a@b.co>'],
    ['domain starting with hyphen', 'a@-b.co'],
    ['missing local part', '@b.co'],
  ])('rejects %s', (_label, email) => {
    expect(isValidEmail(email)).toBe(false);
  });

  it('rejects addresses over 254 characters', () => {
    expect(isValidEmail(`${'a'.repeat(250)}@example.com`)).toBe(false);
  });

  it('rejects a local part over 64 characters', () => {
    expect(isValidEmail(`${'a'.repeat(65)}@example.com`)).toBe(false);
  });

  it('validates the normalized form, not the raw input', () => {
    expect(isValidEmail('  Someone@Example.com  ')).toBe(true);
  });
});

describe('maskEmail', () => {
  it('keeps the first and last character of the local part', () => {
    expect(maskEmail('aditi@gmail.com')).toBe('a***i@gmail.com');
  });

  it('handles a two-character local part without revealing it', () => {
    expect(maskEmail('ab@x.co')).toBe('a*@x.co');
  });

  it('handles a one-character local part', () => {
    expect(maskEmail('a@x.co')).toBe('a*@x.co');
  });

  it('caps the number of stars so long addresses do not leak length', () => {
    expect(maskEmail('averyveryverylongaddress@x.co')).toBe('a******s@x.co');
  });

  it('normalizes before masking', () => {
    expect(maskEmail('  ADITI@Gmail.com ')).toBe('a***i@gmail.com');
  });

  it('returns the input unchanged when there is no @', () => {
    expect(maskEmail('not-an-email')).toBe('not-an-email');
  });
});

describe('generateOtpCode', () => {
  it('returns the configured number of digits', () => {
    const code = generateOtpCode();
    expect(code).toHaveLength(OTP_POLICY.length);
    expect(code).toMatch(/^\d+$/);
  });

  it('honours an explicit length', () => {
    expect(generateOtpCode(8)).toHaveLength(8);
  });

  it.each([3, 13, 6.5, Number.NaN])('rejects invalid length %s', (length) => {
    expect(() => generateOtpCode(length)).toThrow(RangeError);
  });

  it('produces varied codes', () => {
    const codes = new Set(Array.from({ length: 200 }, () => generateOtpCode()));
    // 200 draws from 10^6 colliding more than a handful of times would mean
    // the generator is not actually random.
    expect(codes.size).toBeGreaterThan(195);
  });

  it('rejection-samples so every digit stays uniform', () => {
    // Bytes 250-255 would bias digits 0-5 under a naive `% 10`.
    const scripted = [250, 251, 252, 253, 254, 255, 7, 17, 27, 37, 47, 57];
    let cursor = 0;
    vi.spyOn(crypto, 'getRandomValues').mockImplementation(((buffer: Uint8Array) => {
      for (let i = 0; i < buffer.length; i++) {
        buffer[i] = scripted[cursor % scripted.length];
        cursor++;
      }
      return buffer;
    }) as typeof crypto.getRandomValues);

    // The six out-of-range bytes must be discarded, not folded in.
    expect(generateOtpCode(6)).toBe('777777');
  });

  it('keeps leading zeros', () => {
    vi.spyOn(crypto, 'getRandomValues').mockImplementation(((buffer: Uint8Array) => {
      buffer.fill(0);
      return buffer;
    }) as typeof crypto.getRandomValues);
    expect(generateOtpCode(6)).toBe('000000');
  });
});

describe('generateSalt', () => {
  it('returns hex of twice the requested byte length', () => {
    expect(generateSalt(16)).toMatch(/^[0-9a-f]{32}$/);
    expect(generateSalt(8)).toMatch(/^[0-9a-f]{16}$/);
  });

  it('does not repeat', () => {
    const salts = new Set(Array.from({ length: 50 }, () => generateSalt()));
    expect(salts.size).toBe(50);
  });
});

describe('hashOtp', () => {
  it('is deterministic for identical inputs', async () => {
    const a = await hashOtp('123456', 'a@b.co', 'salt', 'pepper');
    const b = await hashOtp('123456', 'a@b.co', 'salt', 'pepper');
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it('changes when the code changes', async () => {
    const a = await hashOtp('123456', 'a@b.co', 'salt', 'pepper');
    const b = await hashOtp('123457', 'a@b.co', 'salt', 'pepper');
    expect(a).not.toBe(b);
  });

  it('binds the hash to the email so a row cannot be replayed elsewhere', async () => {
    const a = await hashOtp('123456', 'a@b.co', 'salt', 'pepper');
    const b = await hashOtp('123456', 'c@d.co', 'salt', 'pepper');
    expect(a).not.toBe(b);
  });

  it('changes when the salt changes', async () => {
    const a = await hashOtp('123456', 'a@b.co', 'salt-1', 'pepper');
    const b = await hashOtp('123456', 'a@b.co', 'salt-2', 'pepper');
    expect(a).not.toBe(b);
  });

  it('changes when the pepper changes', async () => {
    const a = await hashOtp('123456', 'a@b.co', 'salt', 'pepper-1');
    const b = await hashOtp('123456', 'a@b.co', 'salt', 'pepper-2');
    expect(a).not.toBe(b);
  });

  it('normalizes the email before hashing', async () => {
    const a = await hashOtp('123456', '  A@B.CO ', 'salt', 'pepper');
    const b = await hashOtp('123456', 'a@b.co', 'salt', 'pepper');
    expect(a).toBe(b);
  });
});

describe('timingSafeEqual', () => {
  it('matches identical strings', () => {
    expect(timingSafeEqual('abc123', 'abc123')).toBe(true);
  });

  it('rejects differing strings of equal length', () => {
    expect(timingSafeEqual('abc123', 'abc124')).toBe(false);
  });

  it('rejects differing lengths', () => {
    expect(timingSafeEqual('abc', 'abcd')).toBe(false);
    expect(timingSafeEqual('abcd', 'abc')).toBe(false);
  });

  it('treats two empty strings as equal', () => {
    expect(timingSafeEqual('', '')).toBe(true);
  });

  it('does not short-circuit on the first differing character', () => {
    // Both comparisons must inspect the whole string; a prefix difference and
    // a suffix difference are indistinguishable from the result alone.
    expect(timingSafeEqual('Xbcdef', 'abcdef')).toBe(false);
    expect(timingSafeEqual('abcdeX', 'abcdef')).toBe(false);
  });
});

describe('sanitizeOtpInput', () => {
  it.each([
    ['123456', '123456'],
    ['123 456', '123456'],
    ['123-456', '123456'],
    ['  123456  ', '123456'],
    ['code: 123456', '123456'],
    ['1​2​3456', '123456'],
  ])('normalizes %s', (raw, expected) => {
    expect(sanitizeOtpInput(raw)).toBe(expected);
  });

  it('truncates past the configured length', () => {
    expect(sanitizeOtpInput('1234567890')).toBe('123456');
  });

  it('respects an explicit length', () => {
    expect(sanitizeOtpInput('1234567890', 4)).toBe('1234');
  });

  it('returns an empty string when there are no digits', () => {
    expect(sanitizeOtpInput('abcdef')).toBe('');
  });
});

describe('isCompleteOtp', () => {
  it('is true only at exactly the required length', () => {
    expect(isCompleteOtp('12345')).toBe(false);
    expect(isCompleteOtp('123456')).toBe(true);
    expect(isCompleteOtp('123 456')).toBe(true);
    expect(isCompleteOtp('1234567')).toBe(true); // truncated to six
  });
});

describe('checkOtpUsable', () => {
  it('accepts a fresh unconsumed record', () => {
    const result = checkOtpUsable({ expires_at: ahead(300), attempts: 0 }, NOW);
    expect(result).toEqual({ usable: true, attemptsRemaining: OTP_POLICY.maxVerifyAttempts });
  });

  it('reports not_found for a missing record', () => {
    expect(checkOtpUsable(null, NOW)).toEqual({
      usable: false,
      reason: 'not_found',
      attemptsRemaining: 0,
    });
    expect(checkOtpUsable(undefined, NOW).reason).toBe('not_found');
  });

  it('rejects a consumed record', () => {
    const result = checkOtpUsable(
      { expires_at: ahead(300), attempts: 1, consumed_at: ago(10) },
      NOW,
    );
    expect(result.usable).toBe(false);
    expect(result.reason).toBe('already_used');
  });

  it('rejects once the attempt budget is spent', () => {
    const result = checkOtpUsable(
      { expires_at: ahead(300), attempts: OTP_POLICY.maxVerifyAttempts },
      NOW,
    );
    expect(result.usable).toBe(false);
    expect(result.reason).toBe('too_many_attempts');
    expect(result.attemptsRemaining).toBe(0);
  });

  it('rejects an expired record', () => {
    const result = checkOtpUsable({ expires_at: ago(1), attempts: 0 }, NOW);
    expect(result.usable).toBe(false);
    expect(result.reason).toBe('expired');
  });

  it('treats expiry exactly at now as expired', () => {
    expect(checkOtpUsable({ expires_at: NOW.toISOString(), attempts: 0 }, NOW).reason).toBe(
      'expired',
    );
  });

  it('prefers already_used over expired when both apply', () => {
    const result = checkOtpUsable({ expires_at: ago(10), attempts: 0, consumed_at: ago(20) }, NOW);
    expect(result.reason).toBe('already_used');
  });

  it('counts down remaining attempts', () => {
    expect(checkOtpUsable({ expires_at: ahead(300), attempts: 3 }, NOW).attemptsRemaining).toBe(
      OTP_POLICY.maxVerifyAttempts - 3,
    );
  });
});

describe('expiresAt', () => {
  it('adds the policy TTL', () => {
    expect(expiresAt(NOW).toISOString()).toBe(ahead(OTP_POLICY.ttlSeconds));
  });
});

describe('checkSendRateLimit', () => {
  it('allows the first request', () => {
    const result = checkSendRateLimit([], NOW);
    expect(result.allowed).toBe(true);
    expect(result.retryAfterSeconds).toBe(0);
    expect(result.sendsRemaining).toBe(OTP_POLICY.maxSendsPerWindow);
  });

  it('blocks inside the resend cooldown and reports the wait', () => {
    const result = checkSendRateLimit([ago(10)], NOW);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('cooldown');
    expect(result.retryAfterSeconds).toBe(OTP_POLICY.resendCooldownSeconds - 10);
  });

  it('allows again once the cooldown elapses', () => {
    const result = checkSendRateLimit([ago(OTP_POLICY.resendCooldownSeconds + 1)], NOW);
    expect(result.allowed).toBe(true);
  });

  it('treats the cooldown boundary as elapsed', () => {
    expect(checkSendRateLimit([ago(OTP_POLICY.resendCooldownSeconds)], NOW).allowed).toBe(true);
  });

  it('blocks once the hourly quota is spent', () => {
    const sends = Array.from({ length: OTP_POLICY.maxSendsPerWindow }, (_, i) => ago(120 * (i + 1)));
    const result = checkSendRateLimit(sends, NOW);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('window_quota');
    expect(result.sendsRemaining).toBe(0);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('ignores sends that have aged out of the window', () => {
    const stale = Array.from({ length: 10 }, (_, i) =>
      ago(OTP_POLICY.rateLimitWindowSeconds + 60 * (i + 1)),
    );
    const result = checkSendRateLimit(stale, NOW);
    expect(result.allowed).toBe(true);
    expect(result.sendsRemaining).toBe(OTP_POLICY.maxSendsPerWindow);
  });

  it('reports the wait until the oldest send ages out', () => {
    const oldestAge = OTP_POLICY.rateLimitWindowSeconds - 300;
    const sends = [
      ago(oldestAge),
      ...Array.from({ length: OTP_POLICY.maxSendsPerWindow - 1 }, (_, i) => ago(120 * (i + 1))),
    ];
    const result = checkSendRateLimit(sends, NOW);
    expect(result.reason).toBe('window_quota');
    expect(result.retryAfterSeconds).toBe(300);
  });

  it('ignores unparseable timestamps instead of throwing', () => {
    const result = checkSendRateLimit(['not-a-date', '', 'Invalid Date'], NOW);
    expect(result.allowed).toBe(true);
    expect(result.sendsRemaining).toBe(OTP_POLICY.maxSendsPerWindow);
  });

  it('does not care about input ordering', () => {
    const shuffled = [ago(400), ago(10), ago(200)];
    expect(checkSendRateLimit(shuffled, NOW).reason).toBe('cooldown');
  });

  it('cooldown takes precedence over the window quota', () => {
    const sends = [ago(5), ...Array.from({ length: 8 }, (_, i) => ago(200 * (i + 1)))];
    expect(checkSendRateLimit(sends, NOW).reason).toBe('cooldown');
  });
});

describe('formatCountdown', () => {
  it.each([
    [0, '0:00'],
    [5, '0:05'],
    [59, '0:59'],
    [60, '1:00'],
    [95, '1:35'],
    [600, '10:00'],
  ])('formats %i seconds as %s', (seconds, expected) => {
    expect(formatCountdown(seconds)).toBe(expected);
  });

  it('clamps negatives to zero', () => {
    expect(formatCountdown(-30)).toBe('0:00');
  });

  it('rounds partial seconds up so it never shows 0:00 while time remains', () => {
    expect(formatCountdown(0.2)).toBe('0:01');
  });
});

describe('describeOtpRejection', () => {
  it.each(['expired', 'already_used', 'too_many_attempts', 'not_found'] as const)(
    'returns distinct copy for %s',
    (reason) => {
      expect(describeOtpRejection(reason)).toMatch(/\w/);
    },
  );

  it('gives every reason a different message', () => {
    const messages = (['expired', 'already_used', 'too_many_attempts', 'not_found'] as const).map(
      describeOtpRejection,
    );
    expect(new Set(messages).size).toBe(messages.length);
  });

  it('falls back for an unknown reason', () => {
    expect(describeOtpRejection(undefined)).toContain('incorrect');
  });
});

describe('end-to-end hash round trip', () => {
  it('a generated code verifies against its own stored hash and nothing else', async () => {
    const email = 'builder@manit.ac.in';
    const pepper = 'server-pepper';
    const code = generateOtpCode();
    const salt = generateSalt();
    const stored = await hashOtp(code, email, salt, pepper);

    expect(timingSafeEqual(await hashOtp(code, email, salt, pepper), stored)).toBe(true);

    const wrong = code === '000000' ? '111111' : '000000';
    expect(timingSafeEqual(await hashOtp(wrong, email, salt, pepper), stored)).toBe(false);
    expect(timingSafeEqual(await hashOtp(code, 'other@x.co', salt, pepper), stored)).toBe(false);
    expect(timingSafeEqual(await hashOtp(code, email, salt, 'wrong-pepper'), stored)).toBe(false);
  });
});
