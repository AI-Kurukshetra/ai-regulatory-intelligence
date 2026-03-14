-- Phase 2 reliability: atomic transaction ingestion + queue self-healing.

CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_unique_transaction_job
  ON public.jobs (
    organization_id,
    job_type,
    ((payload ->> 'transaction_id'))
  )
  WHERE job_type IN ('score_transaction', 'screen_sanctions')
    AND payload ? 'transaction_id';

CREATE OR REPLACE FUNCTION public.ingest_transaction(
  p_idempotency_key TEXT,
  p_external_tx_id TEXT DEFAULT NULL,
  p_from_account_id UUID DEFAULT NULL,
  p_to_account_id UUID DEFAULT NULL,
  p_amount NUMERIC DEFAULT NULL,
  p_currency TEXT DEFAULT 'USD',
  p_transaction_type TEXT DEFAULT NULL,
  p_counterparty_country TEXT DEFAULT NULL,
  p_counterparty_name TEXT DEFAULT NULL
)
RETURNS TABLE (
  transaction_id UUID,
  idempotent_replay BOOLEAN,
  jobs_enqueued INT
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_user_id UUID;
  v_transaction_id UUID;
  v_inserted BOOLEAN := FALSE;
  v_inserted_jobs INT := 0;
  v_requeued_jobs INT := 0;
BEGIN
  v_user_id := auth.uid();
  v_org_id := public.current_org_id();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Authenticated profile is missing an organization';
  END IF;

  IF p_idempotency_key IS NULL OR btrim(p_idempotency_key) = '' THEN
    RAISE EXCEPTION 'Idempotency key is required';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Transaction amount must be positive';
  END IF;

  INSERT INTO public.transactions (
    organization_id,
    idempotency_key,
    external_tx_id,
    from_account_id,
    to_account_id,
    amount,
    currency,
    transaction_type,
    counterparty_country,
    counterparty_name,
    status
  )
  VALUES (
    v_org_id,
    btrim(p_idempotency_key),
    p_external_tx_id,
    p_from_account_id,
    p_to_account_id,
    p_amount,
    p_currency,
    p_transaction_type,
    p_counterparty_country,
    p_counterparty_name,
    'pending'
  )
  ON CONFLICT (organization_id, idempotency_key) DO NOTHING
  RETURNING id INTO v_transaction_id;

  IF v_transaction_id IS NULL THEN
    SELECT t.id
    INTO v_transaction_id
    FROM public.transactions t
    WHERE t.organization_id = v_org_id
      AND t.idempotency_key = btrim(p_idempotency_key);

    IF v_transaction_id IS NULL THEN
      RAISE EXCEPTION 'Unable to load transaction for idempotency key %', p_idempotency_key;
    END IF;
  ELSE
    v_inserted := TRUE;
  END IF;

  WITH desired_jobs AS (
    SELECT
      v_org_id AS organization_id,
      'score_transaction'::TEXT AS job_type,
      jsonb_build_object('transaction_id', v_transaction_id) AS payload
    UNION ALL
    SELECT
      v_org_id AS organization_id,
      'screen_sanctions'::TEXT AS job_type,
      jsonb_build_object('transaction_id', v_transaction_id) AS payload
  ),
  inserted_jobs AS (
    INSERT INTO public.jobs (organization_id, job_type, payload, status)
    SELECT organization_id, job_type, payload, 'queued'
    FROM desired_jobs
    ON CONFLICT DO NOTHING
    RETURNING 1
  )
  SELECT count(*) INTO v_inserted_jobs FROM inserted_jobs;

  UPDATE public.jobs
  SET
    status = 'queued',
    run_after = now(),
    updated_at = now(),
    last_error = NULL
  WHERE organization_id = v_org_id
    AND payload ->> 'transaction_id' = v_transaction_id::TEXT
    AND status = 'failed'
    AND (
      (
        job_type = 'score_transaction'
        AND EXISTS (
          SELECT 1
          FROM public.transactions t
          WHERE t.id = v_transaction_id
            AND t.scored_at IS NULL
        )
      )
      OR (
        job_type = 'screen_sanctions'
        AND EXISTS (
          SELECT 1
          FROM public.transactions t
          WHERE t.id = v_transaction_id
            AND (t.screened_at IS NULL OR t.screening_status = 'pending')
        )
      )
    );

  GET DIAGNOSTICS v_requeued_jobs = ROW_COUNT;

  IF v_inserted THEN
    INSERT INTO public.audit_logs (
      organization_id,
      actor_user_id,
      action,
      entity_type,
      entity_id,
      after_data
    )
    VALUES (
      v_org_id,
      v_user_id,
      'transaction.ingested',
      'transaction',
      v_transaction_id,
      jsonb_build_object(
        'amount', p_amount,
        'currency', p_currency,
        'status', 'pending',
        'counterparty_name', p_counterparty_name
      )
    );
  END IF;

  RETURN QUERY
  SELECT
    v_transaction_id,
    NOT v_inserted,
    v_inserted_jobs + v_requeued_jobs;
END;
$$;

REVOKE ALL ON FUNCTION public.ingest_transaction(TEXT, TEXT, UUID, UUID, NUMERIC, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ingest_transaction(TEXT, TEXT, UUID, UUID, NUMERIC, TEXT, TEXT, TEXT, TEXT) TO authenticated;

WITH desired_jobs AS (
  SELECT
    t.organization_id,
    'score_transaction'::TEXT AS job_type,
    jsonb_build_object('transaction_id', t.id) AS payload
  FROM public.transactions t
  WHERE t.scored_at IS NULL

  UNION ALL

  SELECT
    t.organization_id,
    'screen_sanctions'::TEXT AS job_type,
    jsonb_build_object('transaction_id', t.id) AS payload
  FROM public.transactions t
  WHERE t.screened_at IS NULL OR t.screening_status = 'pending'
)
INSERT INTO public.jobs (organization_id, job_type, payload, status)
SELECT organization_id, job_type, payload, 'queued'
FROM desired_jobs
ON CONFLICT DO NOTHING;
