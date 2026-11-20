-- ============================================================================
-- AWS re:Invent Watch & Build Party 2026, Bhopal
-- Database Schema, Functions, and Strict Row Level Security (RLS)
-- ============================================================================

-- Enable pgcrypto for UUIDs & hashing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. ADMINS TABLE
-- Stores authorized event roles: super_admin, reviewer, volunteer
CREATE TABLE IF NOT EXISTS public.admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'reviewer', 'volunteer')),
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 2. REGISTRATIONS TABLE
CREATE TABLE IF NOT EXISTS public.registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL UNIQUE,
  city TEXT NOT NULL,
  role TEXT NOT NULL,
  org TEXT NOT NULL,
  course TEXT,
  year TEXT,
  id_number TEXT,
  linkedin TEXT,
  github TEXT,
  experience TEXT NOT NULL,
  interests TEXT[] NOT NULL DEFAULT '{}',
  why_attend TEXT NOT NULL,
  build_goal TEXT NOT NULL,
  heard_from TEXT NOT NULL,
  id_card_path TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'waitlisted', 'cancelled')),
  reject_reason TEXT,
  reviewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewer_note TEXT,
  reviewed_at TIMESTAMPTZ,
  ticket_code TEXT UNIQUE,
  qr_secret TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Index frequently searched fields
CREATE INDEX IF NOT EXISTS idx_reg_status ON public.registrations(status);
CREATE INDEX IF NOT EXISTS idx_reg_user_id ON public.registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_reg_ticket_code ON public.registrations(ticket_code);
CREATE INDEX IF NOT EXISTS idx_reg_email ON public.registrations(email);
CREATE INDEX IF NOT EXISTS idx_reg_phone ON public.registrations(phone);

-- 3. CHECK-INS TABLE
CREATE TABLE IF NOT EXISTS public.checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  checked_in_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  method TEXT NOT NULL CHECK (method IN ('qr_scan', 'manual_search', 'walk_in'))
);

CREATE INDEX IF NOT EXISTS idx_checkin_reg_id ON public.checkins(registration_id);

-- 4. EMAIL QUEUE TABLE
-- Used to respect the 300 free emails/day limit of Brevo
CREATE TABLE IF NOT EXISTS public.email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email TEXT NOT NULL,
  template TEXT NOT NULL,
  variables JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  sent_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_email_queue_status_sched ON public.email_queue(status, scheduled_for);

-- 5. AUDIT LOG TABLE
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 6. SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Default Settings Seed
INSERT INTO public.settings (key, value)
VALUES
  ('capacity', '300'::jsonb),
  ('registration_open', 'true'::jsonb),
  ('email_daily_limit', '280'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- HELPER FUNCTIONS & RPC PROCEDURES
-- ============================================================================

-- Function to check current user's admin role (Security Definer avoids recursion)
CREATE OR REPLACE FUNCTION public.get_admin_role(uid UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role FROM public.admins WHERE user_id = uid;
  RETURN v_role;
END;
$$;

-- Function: Cancel registration & automatically promote the next waitlisted applicant
CREATE OR REPLACE FUNCTION public.cancel_registration(reg_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cancelled_status TEXT;
  v_promoted_id UUID;
  v_promoted_email TEXT;
  v_promoted_name TEXT;
  v_new_ticket_code TEXT;
  v_new_secret TEXT;
BEGIN
  -- Mark current registration as cancelled
  UPDATE public.registrations
  SET status = 'cancelled', updated_at = now()
  WHERE id = reg_id
  RETURNING status INTO v_cancelled_status;

  IF v_cancelled_status IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Registration not found');
  END IF;

  -- Find the oldest waitlisted candidate to auto-promote
  SELECT id, email, name INTO v_promoted_id, v_promoted_email, v_promoted_name
  FROM public.registrations
  WHERE status = 'waitlisted'
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_promoted_id IS NOT NULL THEN
    -- Generate unique ticket code
    v_new_ticket_code := 'REINV-' || upper(substring(md5(random()::text) from 1 for 6));
    v_new_secret := gen_random_uuid()::text;

    UPDATE public.registrations
    SET
      status = 'approved',
      ticket_code = v_new_ticket_code,
      qr_secret = v_new_secret,
      reviewed_at = now(),
      updated_at = now()
    WHERE id = v_promoted_id;

    -- Queue promotion email
    INSERT INTO public.email_queue (to_email, template, variables, status)
    VALUES (
      v_promoted_email,
      'waitlist_promoted',
      jsonb_build_object(
        'name', v_promoted_name,
        'ticket_code', v_new_ticket_code
      ),
      'queued'
    );
  END IF;

  RETURN jsonb_build_object('success', true, 'promoted_id', v_promoted_id);
END;
$$;

-- Function: Get dashboard statistics in a single performant query
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total INT;
  v_pending INT;
  v_approved INT;
  v_rejected INT;
  v_waitlisted INT;
  v_checked_in INT;
  v_cancelled INT;
  v_capacity INT;
  v_emails_today INT;
  v_email_limit INT;
BEGIN
  SELECT
    count(*),
    count(*) FILTER (WHERE status = 'pending'),
    count(*) FILTER (WHERE status = 'approved'),
    count(*) FILTER (WHERE status = 'rejected'),
    count(*) FILTER (WHERE status = 'waitlisted'),
    count(*) FILTER (WHERE status = 'cancelled')
  INTO v_total, v_pending, v_approved, v_rejected, v_waitlisted, v_cancelled
  FROM public.registrations;

  SELECT count(*) INTO v_checked_in FROM public.checkins;

  SELECT (value::text)::int INTO v_capacity FROM public.settings WHERE key = 'capacity';
  SELECT (value::text)::int INTO v_email_limit FROM public.settings WHERE key = 'email_daily_limit';

  SELECT count(*) INTO v_emails_today
  FROM public.email_queue
  WHERE status = 'sent' AND sent_at >= date_trunc('day', now());

  RETURN jsonb_build_object(
    'total', coalesce(v_total, 0),
    'pending', coalesce(v_pending, 0),
    'approved', coalesce(v_approved, 0),
    'rejected', coalesce(v_rejected, 0),
    'waitlisted', coalesce(v_waitlisted, 0),
    'checked_in', coalesce(v_checked_in, 0),
    'cancelled', coalesce(v_cancelled, 0),
    'capacity', coalesce(v_capacity, 300),
    'emails_sent_today', coalesce(v_emails_today, 0),
    'email_daily_limit', coalesce(v_email_limit, 280)
  );
END;
$$;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- 1. REGISTRATIONS POLICIES
-- Anyone authenticated can view their own application
CREATE POLICY "Users can view own registration"
  ON public.registrations FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR
    public.get_admin_role(auth.uid()) IS NOT NULL
  );

-- An applicant can insert their initial registration
CREATE POLICY "Users can submit own registration"
  ON public.registrations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- An applicant can update their draft ONLY when pending, and cannot modify sensitive admin fields
CREATE POLICY "Users can edit pending registration"
  ON public.registrations FOR UPDATE
  TO authenticated
  USING (
    (auth.uid() = user_id AND status = 'pending') OR
    public.get_admin_role(auth.uid()) IN ('super_admin', 'reviewer')
  );

-- Delete policy: Only super_admin or user self-deletion
CREATE POLICY "Admins can delete registration"
  ON public.registrations FOR DELETE
  TO authenticated
  USING (public.get_admin_role(auth.uid()) = 'super_admin');

-- 2. ADMINS TABLE POLICIES
CREATE POLICY "Users can read own admin role"
  ON public.admins FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.get_admin_role(auth.uid()) = 'super_admin');

CREATE POLICY "Super admins manage admins"
  ON public.admins FOR ALL
  TO authenticated
  USING (public.get_admin_role(auth.uid()) = 'super_admin');

-- 3. CHECKINS POLICIES
CREATE POLICY "Staff can view checkins"
  ON public.checkins FOR SELECT
  TO authenticated
  USING (public.get_admin_role(auth.uid()) IS NOT NULL);

CREATE POLICY "Staff can create checkins"
  ON public.checkins FOR INSERT
  TO authenticated
  WITH CHECK (public.get_admin_role(auth.uid()) IS NOT NULL);

-- 4. EMAIL QUEUE POLICIES
CREATE POLICY "Admins view email queue"
  ON public.email_queue FOR SELECT
  TO authenticated
  USING (public.get_admin_role(auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users queue emails"
  ON public.email_queue FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 5. AUDIT LOG POLICIES
CREATE POLICY "Admins insert audit log"
  ON public.audit_log FOR INSERT
  TO authenticated
  WITH CHECK (public.get_admin_role(auth.uid()) IS NOT NULL);

CREATE POLICY "Admins view audit log"
  ON public.audit_log FOR SELECT
  TO authenticated
  USING (public.get_admin_role(auth.uid()) IS NOT NULL);

-- 6. SETTINGS POLICIES
CREATE POLICY "Public read settings"
  ON public.settings FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Super admins update settings"
  ON public.settings FOR UPDATE
  TO authenticated
  USING (public.get_admin_role(auth.uid()) = 'super_admin');

-- ============================================================================
-- STORAGE BUCKET CREATION & POLICIES
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('id_cards', 'id_cards', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Allow authenticated users to upload only to their own folder path: {user_id}/*
CREATE POLICY "Users can upload their own id card"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'id_cards' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow reviewers and owners to read/download signed URLs
CREATE POLICY "Reviewers and owner read id cards"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'id_cards' AND (
      (storage.foldername(name))[1] = auth.uid()::text OR
      public.get_admin_role(auth.uid()) IN ('super_admin', 'reviewer')
    )
  );
