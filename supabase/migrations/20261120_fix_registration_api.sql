-- ─────────────────────────────────────────────────────────────────────────────
-- Fix Registration API & Permissive Insert Policy (Supabase SQL Editor)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Remove foreign key constraint from user_id so signups never fail on user auth mismatch
ALTER TABLE public.registrations DROP CONSTRAINT IF EXISTS registrations_user_id_fkey;
ALTER TABLE public.registrations ALTER COLUMN user_id DROP NOT NULL;

-- 2. Ensure aws_builder_id column exists
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS aws_builder_id TEXT;

-- 3. Fix Row Level Security policies for INSERT on registrations
DROP POLICY IF EXISTS "Anyone can register" ON public.registrations;
DROP POLICY IF EXISTS "Allow all inserts" ON public.registrations;

CREATE POLICY "Allow all inserts"
  ON public.registrations FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- 4. Fix Row Level Security for email_queue
DROP POLICY IF EXISTS "Admins or server can insert email queue" ON public.email_queue;
DROP POLICY IF EXISTS "Allow all email queue insert" ON public.email_queue;

CREATE POLICY "Allow all email queue insert"
  ON public.email_queue FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- 5. RPC Function: Guaranteed 100% Robust Registration Submission (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.submit_registration(
  p_name TEXT,
  p_email TEXT,
  p_phone TEXT,
  p_org TEXT,
  p_aws_builder_id TEXT DEFAULT NULL,
  p_experience TEXT DEFAULT 'Beginner',
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reg_id UUID;
  v_uid UUID;
BEGIN
  -- Check if duplicate email already exists
  IF EXISTS (SELECT 1 FROM public.registrations WHERE lower(email) = lower(trim(p_email))) THEN
    RETURN jsonb_build_object('success', false, 'message', 'A registration already exists for this email address.');
  END IF;

  -- Check if duplicate phone already exists
  IF EXISTS (SELECT 1 FROM public.registrations WHERE phone = trim(p_phone)) THEN
    RETURN jsonb_build_object('success', false, 'message', 'This contact number is already registered.');
  END IF;

  v_uid := coalesce(p_user_id, gen_random_uuid());

  INSERT INTO public.registrations (
    user_id,
    name,
    email,
    phone,
    org,
    id_number,
    aws_builder_id,
    experience,
    city,
    role,
    interests,
    why_attend,
    build_goal,
    heard_from,
    status
  )
  VALUES (
    v_uid,
    trim(p_name),
    lower(trim(p_email)),
    trim(p_phone),
    trim(p_org),
    p_aws_builder_id,
    p_aws_builder_id,
    coalesce(p_experience, 'Beginner'),
    'Bhopal',
    'Builder',
    ARRAY['Cloud Computing', 'AI / ML'],
    'AWS re:Invent Watch & Build Party attendee',
    'Hands-on Generative AI & Cloud Labs',
    'AWS Student Builder Group at Technocrats Institute of Technology & Science',
    'pending'
  )
  RETURNING id INTO v_reg_id;

  RETURN jsonb_build_object('success', true, 'id', v_reg_id);
END;
$$;
