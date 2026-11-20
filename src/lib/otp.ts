/**
 * Email OTP rules, re-exported for the browser app.
 *
 * The implementation deliberately lives in `supabase/functions/_shared/` so
 * that the Supabase CLI bundles it with the `send-otp` / `verify-otp` Edge
 * Functions. Importing it from here means the client and the server can never
 * drift on code length, expiry, attempt budgets or resend cooldowns.
 *
 * Add new OTP logic to `otp-core.ts`, not to this file.
 */

export * from '../../supabase/functions/_shared/otp-core.ts';
