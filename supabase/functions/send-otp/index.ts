// Edge Function: issue an email verification code.
//
// Flow: validate → rate limit → generate → store (hashed) → send.
// The rules live in ../_shared/otp-core.ts so the browser and this function
// can never disagree about expiry, cooldowns or quotas.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { jsonResponse, preflight } from '../_shared/cors.ts';
import { sendMail, resolveTransport, senderIdentity } from '../_shared/mailer.ts';
import { buildOtpEmail } from '../_shared/otpEmail.ts';
import {
  OTP_POLICY,
  normalizeEmail,
  isValidEmail,
  generateOtpCode,
  generateSalt,
  hashOtp,
  expiresAt,
  checkSendRateLimit,
} from '../_shared/otp-core.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const OTP_PEPPER = Deno.env.get('OTP_PEPPER') || '';

/** Mirrors what the browser shows, so copy stays consistent. */
const GENERIC_SENT_MESSAGE = 'If that address can receive mail, a code is on its way.';

function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for') || '';
  return forwarded.split(',')[0].trim() || req.headers.get('cf-connecting-ip') || 'unknown';
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');

  const pre = preflight(req);
  if (pre) return pre;

  if (req.method !== 'POST') {
    return jsonResponse({ ok: false, message: 'Method not allowed' }, 405, origin);
  }
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return jsonResponse(
      { ok: false, message: 'Auth backend is not configured.' },
      500,
      origin,
    );
  }
  if (!OTP_PEPPER) {
    // Without the pepper, a leaked table row is brute-forceable offline.
    return jsonResponse(
      { ok: false, message: 'Auth backend is not configured (missing OTP_PEPPER).' },
      500,
      origin,
    );
  }

  let email = '';
  try {
    const body = await req.json();
    email = normalizeEmail(String(body?.email ?? ''));
  } catch {
    return jsonResponse({ ok: false, message: 'Invalid request body.' }, 400, origin);
  }

  if (!isValidEmail(email)) {
    return jsonResponse({ ok: false, message: 'Enter a valid email address.' }, 400, origin);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    // ─── Rate limit ──────────────────────────────────────────────────────────
    const windowStart = new Date(
      Date.now() - OTP_POLICY.rateLimitWindowSeconds * 1000,
    ).toISOString();

    const { data: recent, error: recentError } = await supabase
      .from('email_otps')
      .select('created_at')
      .eq('email', email)
      .gte('created_at', windowStart)
      .order('created_at', { ascending: false })
      .limit(OTP_POLICY.maxSendsPerWindow + 1);

    if (recentError) throw recentError;

    const decision = checkSendRateLimit((recent ?? []).map((r) => r.created_at as string));
    if (!decision.allowed) {
      return jsonResponse(
        {
          ok: false,
          message:
            decision.reason === 'cooldown'
              ? `Please wait ${decision.retryAfterSeconds}s before requesting another code.`
              : 'Too many codes requested for this address. Try again later.',
          retryAfterSeconds: decision.retryAfterSeconds,
        },
        429,
        origin,
      );
    }

    // ─── Generate + store ────────────────────────────────────────────────────
    const code = generateOtpCode();
    const salt = generateSalt();
    const codeHash = await hashOtp(code, email, salt, OTP_PEPPER);
    const expiry = expiresAt();
    const transport = resolveTransport();
    const isManual = transport === 'manual';

    // Any older live code for this address is retired, so a user who clicks
    // "resend" can never be confused about which code still works.
    await supabase
      .from('email_otps')
      .update({ consumed_at: new Date().toISOString() })
      .eq('email', email)
      .is('consumed_at', null);

    const { data: inserted, error: insertError } = await supabase
      .from('email_otps')
      .insert({
        email,
        code_hash: codeHash,
        salt,
        manual_code: isManual ? code : null,
        delivery: isManual ? 'manual' : 'auto',
        delivery_status: 'pending',
        expires_at: expiry.toISOString(),
        request_ip: clientIp(req),
        user_agent: (req.headers.get('user-agent') || '').slice(0, 300),
      })
      .select('id')
      .single();

    if (insertError) throw insertError;

    // ─── Deliver ─────────────────────────────────────────────────────────────
    if (isManual) {
      return jsonResponse(
        {
          ok: true,
          delivery: 'manual',
          message: `${GENERIC_SENT_MESSAGE} It is being sent by hand from ${senderIdentity().address}.`,
          resendAfterSeconds: OTP_POLICY.resendCooldownSeconds,
          expiresInSeconds: OTP_POLICY.ttlSeconds,
        },
        200,
        origin,
      );
    }

    const result = await sendMail(
      buildOtpEmail({
        to: email,
        code,
        expiresInMinutes: Math.round(OTP_POLICY.ttlSeconds / 60),
      }),
    );

    if (!result.delivered) {
      // Park the code for manual rescue rather than stranding the applicant.
      await supabase
        .from('email_otps')
        .update({
          delivery: 'manual',
          delivery_status: 'pending',
          manual_code: code,
          delivery_error: (result.error || 'Delivery failed').slice(0, 500),
        })
        .eq('id', inserted.id);

      console.error('OTP delivery failed', { transport: result.transport, error: result.error });

      return jsonResponse(
        {
          ok: true,
          delivery: 'manual',
          message: `${GENERIC_SENT_MESSAGE} Automatic delivery is having trouble, so the team is sending this one by hand.`,
          resendAfterSeconds: OTP_POLICY.resendCooldownSeconds,
          expiresInSeconds: OTP_POLICY.ttlSeconds,
        },
        200,
        origin,
      );
    }

    await supabase
      .from('email_otps')
      .update({ delivery_status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', inserted.id);

    return jsonResponse(
      {
        ok: true,
        delivery: 'auto',
        message: GENERIC_SENT_MESSAGE,
        resendAfterSeconds: OTP_POLICY.resendCooldownSeconds,
        expiresInSeconds: OTP_POLICY.ttlSeconds,
      },
      200,
      origin,
    );
  } catch (error) {
    console.error('send-otp failed', error);
    return jsonResponse(
      { ok: false, message: 'Could not send a verification code right now. Please try again.' },
      500,
      origin,
    );
  }
});
