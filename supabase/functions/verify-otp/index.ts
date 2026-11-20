// Edge Function: check a verification code and mint a session.
//
// On success it returns a single-use `tokenHash` which the browser exchanges
// via `supabase.auth.verifyOtp({ token_hash, type: 'email' })`. The session
// itself is therefore still created by GoTrue — this function only vouches
// that the person controls the mailbox.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { jsonResponse, preflight } from '../_shared/cors.ts';
import {
  OTP_POLICY,
  normalizeEmail,
  isValidEmail,
  sanitizeOtpInput,
  hashOtp,
  timingSafeEqual,
  checkOtpUsable,
  describeOtpRejection,
} from '../_shared/otp-core.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const OTP_PEPPER = Deno.env.get('OTP_PEPPER') || '';

/** Same copy for "no such code" and "wrong code" so neither leaks the other. */
const GENERIC_FAILURE = 'That code is incorrect or has expired. Request a new one.';

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');

  const pre = preflight(req);
  if (pre) return pre;

  if (req.method !== 'POST') {
    return jsonResponse({ ok: false, message: 'Method not allowed' }, 405, origin);
  }
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !OTP_PEPPER) {
    return jsonResponse({ ok: false, message: 'Auth backend is not configured.' }, 500, origin);
  }

  let email = '';
  let code = '';
  try {
    const body = await req.json();
    email = normalizeEmail(String(body?.email ?? ''));
    code = sanitizeOtpInput(String(body?.code ?? ''));
  } catch {
    return jsonResponse({ ok: false, message: 'Invalid request body.' }, 400, origin);
  }

  if (!isValidEmail(email) || code.length !== OTP_POLICY.length) {
    return jsonResponse({ ok: false, message: GENERIC_FAILURE }, 400, origin);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    // ─── Find the newest live code ───────────────────────────────────────────
    const { data: record, error: lookupError } = await supabase
      .from('email_otps')
      .select('id, code_hash, salt, attempts, expires_at, consumed_at')
      .eq('email', email)
      .is('consumed_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lookupError) throw lookupError;

    const usability = checkOtpUsable(record ?? null);
    if (!usability.usable) {
      return jsonResponse(
        {
          ok: false,
          reason: usability.reason,
          message:
            usability.reason === 'not_found'
              ? GENERIC_FAILURE
              : describeOtpRejection(usability.reason),
        },
        400,
        origin,
      );
    }

    // ─── Compare ─────────────────────────────────────────────────────────────
    const candidate = await hashOtp(code, email, record!.salt as string, OTP_PEPPER);

    if (!timingSafeEqual(candidate, record!.code_hash as string)) {
      const attempts = (record!.attempts as number) + 1;
      const exhausted = attempts >= OTP_POLICY.maxVerifyAttempts;

      await supabase
        .from('email_otps')
        .update({
          attempts,
          // Burn the code outright once the budget is gone.
          consumed_at: exhausted ? new Date().toISOString() : null,
        })
        .eq('id', record!.id);

      return jsonResponse(
        {
          ok: false,
          reason: exhausted ? 'too_many_attempts' : 'incorrect',
          attemptsRemaining: Math.max(0, OTP_POLICY.maxVerifyAttempts - attempts),
          message: exhausted
            ? describeOtpRejection('too_many_attempts')
            : `${GENERIC_FAILURE} ${OTP_POLICY.maxVerifyAttempts - attempts} attempt(s) left.`,
        },
        400,
        origin,
      );
    }

    // ─── Correct — burn the code before issuing anything ─────────────────────
    // Conditioned on `consumed_at IS NULL` so two racing requests cannot both
    // mint a session from one code.
    const { data: claimed, error: claimError } = await supabase
      .from('email_otps')
      .update({ consumed_at: new Date().toISOString(), attempts: (record!.attempts as number) + 1 })
      .eq('id', record!.id)
      .is('consumed_at', null)
      .select('id')
      .maybeSingle();

    if (claimError) throw claimError;
    if (!claimed) {
      return jsonResponse(
        { ok: false, reason: 'already_used', message: describeOtpRejection('already_used') },
        400,
        origin,
      );
    }

    // ─── Ensure the auth user exists ─────────────────────────────────────────
    const { error: createError } = await supabase.auth.admin.createUser({
      email,
      // The code they just entered IS the proof of ownership.
      email_confirm: true,
    });

    // An existing account is the normal case for returning applicants.
    if (createError && !isAlreadyRegistered(createError)) throw createError;

    // ─── Mint the single-use token the browser will redeem ───────────────────
    const { data: link, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });
    if (linkError) throw linkError;

    const tokenHash = link?.properties?.hashed_token;
    if (!tokenHash) throw new Error('GoTrue did not return a token hash');

    return jsonResponse({ ok: true, tokenHash, email }, 200, origin);
  } catch (error) {
    console.error('verify-otp failed', error);
    return jsonResponse(
      { ok: false, message: 'Could not complete verification. Please try again.' },
      500,
      origin,
    );
  }
});

/** GoTrue reports a duplicate signup through a few different shapes. */
function isAlreadyRegistered(error: unknown): boolean {
  const err = error as { code?: string; status?: number; message?: string };
  if (err?.code === 'email_exists' || err?.code === 'user_already_exists') return true;
  if (err?.status === 422) return true;
  return /already (been )?registered|already exists/i.test(err?.message || '');
}
