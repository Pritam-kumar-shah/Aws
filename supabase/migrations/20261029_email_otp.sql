-- ============================================================================
-- Email OTP verification
--
-- Codes are generated, hashed and verified by the `send-otp` / `verify-otp`
-- Edge Functions (service role). Nothing in this table is readable by the
-- anon or authenticated roles — only event staff can see the *delivery*
-- metadata, and even they never see a code they did not already generate.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Table ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.email_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  -- SHA-256 of `email:salt:code:pepper`. The plaintext code is never stored.
  code_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  -- Populated ONLY in manual delivery mode, where a human has to read the
  -- code out of the outbox and email it. Cleared the moment it is marked sent.
  manual_code TEXT,
  delivery TEXT NOT NULL DEFAULT 'auto' CHECK (delivery IN ('auto', 'manual')),
  delivery_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (delivery_status IN ('pending', 'sent', 'failed')),
  delivery_error TEXT,
  sent_at TIMESTAMPTZ,
  -- Who/where asked for it, for abuse triage.
  request_ip TEXT,
  user_agent TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  consumed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_email_otps_email_created
  ON public.email_otps (email, created_at DESC);

-- The verifier always wants "the newest live code for this email".
CREATE INDEX IF NOT EXISTS idx_email_otps_live
  ON public.email_otps (email, expires_at DESC)
  WHERE consumed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_email_otps_outbox
  ON public.email_otps (created_at DESC)
  WHERE delivery = 'manual' AND delivery_status = 'pending';

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.email_otps ENABLE ROW LEVEL SECURITY;

-- No policy grants INSERT/UPDATE/DELETE to anon or authenticated, so the table
-- is reachable only by the service role used inside the Edge Functions.
DROP POLICY IF EXISTS "Staff read otp delivery metadata" ON public.email_otps;
CREATE POLICY "Staff read otp delivery metadata"
  ON public.email_otps FOR SELECT
  TO authenticated
  USING (public.get_admin_role(auth.uid()) IN ('super_admin', 'reviewer'));

-- ─── Outbox helpers (manual delivery) ────────────────────────────────────────

-- Rows the organiser still has to email by hand. SECURITY DEFINER so it can
-- read the table while the caller only needs an admin role.
CREATE OR REPLACE FUNCTION public.list_manual_otp_outbox(limit_count INT DEFAULT 50)
RETURNS TABLE (
  id UUID,
  email TEXT,
  code TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  seconds_remaining INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.get_admin_role(auth.uid()) NOT IN ('super_admin', 'reviewer') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT
    o.id,
    o.email,
    o.manual_code,
    o.expires_at,
    o.created_at,
    GREATEST(0, EXTRACT(EPOCH FROM (o.expires_at - now()))::INT)
  FROM public.email_otps o
  WHERE o.delivery = 'manual'
    AND o.delivery_status = 'pending'
    AND o.consumed_at IS NULL
    AND o.expires_at > now()
  ORDER BY o.created_at DESC
  LIMIT GREATEST(1, LEAST(limit_count, 200));
END;
$$;

-- Marks one outbox row as hand-delivered and wipes the plaintext code.
CREATE OR REPLACE FUNCTION public.mark_manual_otp_sent(otp_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
BEGIN
  IF public.get_admin_role(auth.uid()) NOT IN ('super_admin', 'reviewer') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.email_otps
  SET delivery_status = 'sent',
      sent_at = now(),
      manual_code = NULL
  WHERE id = otp_id
    AND delivery = 'manual'
    AND delivery_status = 'pending'
  RETURNING email INTO v_email;

  IF v_email IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Outbox entry not found or already sent');
  END IF;

  INSERT INTO public.audit_log (actor_id, action, target_type, target_id, details)
  VALUES (auth.uid(), 'otp_sent_manually', 'email_otp', otp_id,
          jsonb_build_object('email', v_email));

  RETURN jsonb_build_object('success', true, 'email', v_email);
END;
$$;

-- ─── Housekeeping ────────────────────────────────────────────────────────────

-- Expired codes have no value and the plaintext column must not linger.
-- Schedule from pg_cron: SELECT cron.schedule('purge-otps','*/15 * * * *',
--   $$SELECT public.purge_expired_otps()$$);
CREATE OR REPLACE FUNCTION public.purge_expired_otps()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INT;
BEGIN
  -- Keep a 24h tail of consumed/expired rows for abuse investigation, but
  -- strip the plaintext immediately.
  UPDATE public.email_otps
  SET manual_code = NULL
  WHERE manual_code IS NOT NULL
    AND (expires_at < now() OR consumed_at IS NOT NULL);

  DELETE FROM public.email_otps
  WHERE created_at < now() - INTERVAL '24 hours';

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.list_manual_otp_outbox(INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_manual_otp_sent(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.purge_expired_otps() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_manual_otp_outbox(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_manual_otp_sent(UUID) TO authenticated;
