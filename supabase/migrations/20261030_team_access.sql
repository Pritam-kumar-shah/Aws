-- ============================================================================
-- Migration: 20261030_team_access.sql
-- Role-based Access Control (Super Admin, Reviewer/Admin, Volunteer)
-- Allows Super Admin to add, modify, and delete roles directly from the website
-- ============================================================================

-- 1. Ensure `admins` table can support email-based invites before user registers
ALTER TABLE public.admins ALTER COLUMN user_id DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'admins' AND column_name = 'email'
  ) THEN
    ALTER TABLE public.admins ADD COLUMN email TEXT UNIQUE;
  END IF;
END $$;

-- Index email for fast authentication lookups
CREATE INDEX IF NOT EXISTS idx_admins_email ON public.admins(email);

-- Ensure owner is in admins table
INSERT INTO public.admins (email, display_name, role)
VALUES ('vijaymalsah442@gmail.com', 'Vijay (Owner)', 'super_admin')
ON CONFLICT (email) DO UPDATE SET role = 'super_admin';

-- 2. Function: Check any user's role by email or user_id
CREATE OR REPLACE FUNCTION public.get_user_role(p_email TEXT, p_user_id UUID DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean_email TEXT;
  v_role TEXT;
  v_admin_id UUID;
BEGIN
  v_clean_email := lower(trim(coalesce(p_email, '')));

  -- Permanent owner is ALWAYS super_admin
  IF v_clean_email = 'vijaymalsah442@gmail.com' THEN
    RETURN 'super_admin';
  END IF;

  -- 1. Check by email
  IF v_clean_email <> '' THEN
    SELECT id, role INTO v_admin_id, v_role
    FROM public.admins
    WHERE lower(email) = v_clean_email
    LIMIT 1;

    -- If found and user_id was null, bind it now
    IF v_admin_id IS NOT NULL AND p_user_id IS NOT NULL THEN
      UPDATE public.admins
      SET user_id = p_user_id
      WHERE id = v_admin_id AND user_id IS NULL;
    END IF;

    IF v_role IS NOT NULL THEN
      RETURN v_role;
    END IF;
  END IF;

  -- 2. Check by user_id
  IF p_user_id IS NOT NULL THEN
    SELECT role INTO v_role
    FROM public.admins
    WHERE user_id = p_user_id
    LIMIT 1;

    IF v_role IS NOT NULL THEN
      RETURN v_role;
    END IF;
  END IF;

  RETURN NULL;
END;
$$;

-- 3. Update existing get_admin_role to leverage email check as well
CREATE OR REPLACE FUNCTION public.get_admin_role(uid UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_email TEXT;
BEGIN
  -- Look up user's email from auth.users
  SELECT email INTO v_email FROM auth.users WHERE id = uid;

  IF lower(trim(coalesce(v_email, ''))) = 'vijaymalsah442@gmail.com' THEN
    RETURN 'super_admin';
  END IF;

  SELECT role INTO v_role
  FROM public.admins
  WHERE user_id = uid OR (v_email IS NOT NULL AND lower(email) = lower(trim(v_email)))
  LIMIT 1;

  RETURN v_role;
END;
$$;

-- 4. Function: Manage Team Member (Add / Update / Delete) from Website
CREATE OR REPLACE FUNCTION public.manage_team_member(
  p_action TEXT,
  p_email TEXT,
  p_name TEXT DEFAULT '',
  p_role TEXT DEFAULT 'volunteer'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
  v_caller_email TEXT;
  v_target_email TEXT;
BEGIN
  v_caller_role := public.get_admin_role(auth.uid());
  SELECT email INTO v_caller_email FROM auth.users WHERE id = auth.uid();
  v_target_email := lower(trim(coalesce(p_email, '')));

  -- Authorization check: Caller MUST be Super Admin or Owner
  IF lower(trim(coalesce(v_caller_email, ''))) <> 'vijaymalsah442@gmail.com' AND v_caller_role <> 'super_admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only Super Admin can manage team permissions');
  END IF;

  -- Target email validation
  IF v_target_email = '' OR position('@' in v_target_email) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid email address provided');
  END IF;

  -- Protect Owner account from demotion or deletion
  IF v_target_email = 'vijaymalsah442@gmail.com' AND p_action IN ('delete', 'update_role') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Owner account cannot be modified or deleted');
  END IF;

  -- Role validation
  IF p_role NOT IN ('super_admin', 'reviewer', 'volunteer') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid role: must be super_admin, reviewer, or volunteer');
  END IF;

  -- Action 1: ADD MEMBER
  IF p_action = 'add' THEN
    INSERT INTO public.admins (email, display_name, role)
    VALUES (v_target_email, trim(coalesce(p_name, 'Team Member')), p_role)
    ON CONFLICT (email) DO UPDATE
    SET display_name = EXCLUDED.display_name,
        role = EXCLUDED.role;

    RETURN jsonb_build_object('success', true, 'message', 'Member added successfully');

  -- Action 2: UPDATE ROLE
  ELSIF p_action = 'update_role' THEN
    UPDATE public.admins
    SET role = p_role
    WHERE lower(email) = v_target_email;

    RETURN jsonb_build_object('success', true, 'message', 'Role updated successfully');

  -- Action 3: DELETE MEMBER
  ELSIF p_action = 'delete' THEN
    DELETE FROM public.admins
    WHERE lower(email) = v_target_email;

    RETURN jsonb_build_object('success', true, 'message', 'Member removed successfully');
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Unknown action');
  END IF;
END;
$$;

-- 5. Function: List Team Members for Website UI
CREATE OR REPLACE FUNCTION public.list_team_members()
RETURNS TABLE (
  id TEXT,
  name TEXT,
  email TEXT,
  role TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Always return owner first, then all other admins
  RETURN QUERY
  SELECT
    coalesce(a.id::text, 'owner-vijay') AS id,
    coalesce(a.display_name, 'Vijay (Owner)') AS name,
    'vijaymalsah442@gmail.com'::text AS email,
    'super_admin'::text AS role,
    coalesce(a.created_at, now()) AS created_at
  FROM (SELECT 1) dummy
  LEFT JOIN public.admins a ON lower(a.email) = 'vijaymalsah442@gmail.com'
  UNION ALL
  SELECT
    a.id::text,
    coalesce(a.display_name, 'Team Member'),
    a.email,
    a.role,
    a.created_at
  FROM public.admins a
  WHERE lower(coalesce(a.email, '')) <> 'vijaymalsah442@gmail.com'
  ORDER BY role = 'super_admin' DESC, created_at ASC;
END;
$$;

-- 6. Checkin Gate Scanner RPC Lookups
CREATE OR REPLACE FUNCTION public.lookup_registration_by_ticket(p_ticket_code TEXT)
RETURNS SETOF public.registrations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.registrations
  WHERE lower(ticket_code) = lower(trim(p_ticket_code));
END;
$$;

CREATE OR REPLACE FUNCTION public.lookup_registration_by_id(p_reg_id UUID)
RETURNS SETOF public.registrations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.registrations
  WHERE id = p_reg_id;
END;
$$;

-- Permissions
GRANT EXECUTE ON FUNCTION public.get_user_role(TEXT, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_role(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.manage_team_member(TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_team_members() TO authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_registration_by_ticket(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_registration_by_id(UUID) TO authenticated;
