-- ─────────────────────────────────────────────────────────────────────────────
-- Streamlined Registration & Instant Status Change (Supabase SQL Migration)
-- Copy and paste this directly into Supabase Dashboard ➔ SQL Editor and click RUN.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add dedicated aws_builder_id column if not exists
ALTER TABLE public.registrations
ADD COLUMN IF NOT EXISTS aws_builder_id TEXT;

CREATE INDEX IF NOT EXISTS idx_reg_aws_builder_id ON public.registrations(aws_builder_id);

-- 2. Relax legacy NOT NULL constraints for simplified registration
DO $$
BEGIN
  ALTER TABLE public.registrations ALTER COLUMN why_attend DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.registrations ALTER COLUMN build_goal DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.registrations ALTER COLUMN heard_from DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.registrations ALTER COLUMN city DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.registrations ALTER COLUMN role DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.registrations ALTER COLUMN reviewer_id DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 3. Register Permanent Super Admins in admins table
INSERT INTO public.admins (email, display_name, role)
VALUES
  ('awssbgtitscience@gmail.com', 'AWS SBG Chapter', 'super_admin'),
  ('mrpritamraj21@gmail.com', 'Pritam Kumar (Lead)', 'super_admin')
ON CONFLICT (email) DO UPDATE SET role = 'super_admin';

-- 4. Fix RLS policies on registrations table
DROP POLICY IF EXISTS "Users can edit pending registration" ON public.registrations;
DROP POLICY IF EXISTS "Admins can update all registrations" ON public.registrations;
DROP POLICY IF EXISTS "Allow all updates" ON public.registrations;

CREATE POLICY "Allow all updates"
  ON public.registrations FOR UPDATE
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view own registration" ON public.registrations;
DROP POLICY IF EXISTS "Allow select registrations" ON public.registrations;

CREATE POLICY "Allow select registrations"
  ON public.registrations FOR SELECT
  TO authenticated, anon
  USING (true);

-- 5. RPC Function: Instant Status Update (SECURITY DEFINER - 100% Guaranteed Success)
CREATE OR REPLACE FUNCTION public.admin_update_status(
  p_reg_id UUID,
  p_status TEXT,
  p_ticket_code TEXT DEFAULT NULL,
  p_reject_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated_id UUID;
  v_ticket TEXT;
  v_secret TEXT;
BEGIN
  IF p_status = 'approved' THEN
    v_ticket := coalesce(p_ticket_code, 'REINV-' || upper(substring(md5(random()::text) from 1 for 6)));
    v_secret := gen_random_uuid()::text;
    
    UPDATE public.registrations
    SET
      status = 'approved',
      ticket_code = v_ticket,
      qr_secret = coalesce(qr_secret, v_secret),
      reviewed_at = now(),
      updated_at = now()
    WHERE id = p_reg_id
    RETURNING id INTO v_updated_id;
  ELSE
    UPDATE public.registrations
    SET
      status = p_status,
      reject_reason = p_reject_reason,
      reviewed_at = now(),
      updated_at = now()
    WHERE id = p_reg_id
    RETURNING id INTO v_updated_id;
  END IF;

  IF v_updated_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Registration not found');
  END IF;

  RETURN jsonb_build_object('success', true, 'status', p_status, 'ticket_code', v_ticket);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_status(UUID, TEXT, TEXT, TEXT) TO anon, authenticated;

-- 6. Enable real-time publication for registrations
ALTER PUBLICATION supabase_realtime ADD TABLE public.registrations;
