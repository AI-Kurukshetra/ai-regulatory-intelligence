-- Phase 2 foundation: default org rules and safe job claiming for background workers.

CREATE UNIQUE INDEX IF NOT EXISTS idx_rules_org_name ON public.rules(organization_id, name);

CREATE OR REPLACE FUNCTION public.seed_default_rules(target_org_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.rules (organization_id, name, rule_type, conditions, severity, is_active)
  VALUES
    (
      target_org_id,
      'Large transaction threshold',
      'threshold',
      jsonb_build_object('amount_gte', 10000),
      'high',
      true
    ),
    (
      target_org_id,
      'High-risk country corridor',
      'geo',
      jsonb_build_object('countries', jsonb_build_array('AE', 'IR', 'KP', 'RU', 'SY')),
      'high',
      true
    ),
    (
      target_org_id,
      'Rapid repeat outflow velocity',
      'velocity',
      jsonb_build_object(
        'window_hours', 24,
        'transaction_count_gte', 3,
        'aggregate_amount_gte', 20000
      ),
      'medium',
      true
    )
  ON CONFLICT (organization_id, name) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_organization_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.seed_default_rules(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_organization_created_seed_defaults ON public.organizations;
CREATE TRIGGER on_organization_created_seed_defaults
  AFTER INSERT ON public.organizations
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_organization_defaults();

DO $$
DECLARE
  org_record RECORD;
BEGIN
  FOR org_record IN SELECT id FROM public.organizations LOOP
    PERFORM public.seed_default_rules(org_record.id);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_jobs(p_job_type TEXT, p_limit INT DEFAULT 10)
RETURNS SETOF public.jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH next_jobs AS (
    SELECT j.id
    FROM public.jobs j
    WHERE j.job_type = p_job_type
      AND j.status = 'queued'
      AND j.run_after <= now()
      AND j.attempts < j.max_attempts
    ORDER BY j.run_after ASC, j.created_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT GREATEST(p_limit, 1)
  )
  UPDATE public.jobs j
  SET
    status = 'processing',
    attempts = j.attempts + 1,
    updated_at = now(),
    last_error = NULL
  FROM next_jobs
  WHERE j.id = next_jobs.id
  RETURNING j.*;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_jobs(TEXT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_jobs(TEXT, INT) TO service_role;
