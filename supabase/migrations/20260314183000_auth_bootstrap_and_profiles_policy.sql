-- Fix profile access policy to avoid recursive org lookup during auth context checks.
DROP POLICY IF EXISTS profiles_select ON profiles;

CREATE POLICY profiles_select_self ON profiles
  FOR SELECT
  USING (id = auth.uid());

-- Auto-provision organization + profile for new auth users.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id UUID;
  inferred_org_name TEXT;
  inferred_full_name TEXT;
BEGIN
  inferred_org_name := COALESCE(
    NULLIF(new.raw_user_meta_data ->> 'organization_name', ''),
    CASE
      WHEN new.email IS NOT NULL AND position('@' in new.email) > 0 THEN split_part(new.email, '@', 2)
      ELSE 'Default Organization'
    END
  );

  inferred_full_name := COALESCE(
    NULLIF(new.raw_user_meta_data ->> 'full_name', ''),
    new.email
  );

  INSERT INTO public.organizations (name, jurisdiction)
  VALUES (inferred_org_name, 'US')
  RETURNING id INTO new_org_id;

  INSERT INTO public.profiles (id, organization_id, role, full_name)
  VALUES (new.id, new_org_id, 'admin', inferred_full_name);

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_auth_user();

-- Backfill existing auth users with missing profiles.
DO $$
DECLARE
  u RECORD;
  backfill_org_id UUID;
  backfill_org_name TEXT;
  backfill_full_name TEXT;
BEGIN
  FOR u IN
    SELECT id, email, raw_user_meta_data
    FROM auth.users au
    WHERE NOT EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = au.id
    )
  LOOP
    backfill_org_name := COALESCE(
      NULLIF(u.raw_user_meta_data ->> 'organization_name', ''),
      CASE
        WHEN u.email IS NOT NULL AND position('@' in u.email) > 0 THEN split_part(u.email, '@', 2)
        ELSE 'Default Organization'
      END
    );

    backfill_full_name := COALESCE(
      NULLIF(u.raw_user_meta_data ->> 'full_name', ''),
      u.email
    );

    INSERT INTO public.organizations (name, jurisdiction)
    VALUES (backfill_org_name, 'US')
    RETURNING id INTO backfill_org_id;

    INSERT INTO public.profiles (id, organization_id, role, full_name)
    VALUES (u.id, backfill_org_id, 'admin', backfill_full_name);
  END LOOP;
END;
$$;

