ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS counterparty_name TEXT,
  ADD COLUMN IF NOT EXISTS screening_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (screening_status IN ('pending','clear','review','hit','skipped')),
  ADD COLUMN IF NOT EXISTS screened_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_transactions_org_screening_status
  ON public.transactions(organization_id, screening_status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.watchlist_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL DEFAULT 'OFAC',
  list_name TEXT NOT NULL DEFAULT 'OFAC_SDN',
  external_ref TEXT,
  entity_name TEXT NOT NULL,
  entity_type TEXT NOT NULL DEFAULT 'unknown'
    CHECK (entity_type IN ('individual','entity','vessel','aircraft','program','unknown')),
  country TEXT,
  aliases JSONB NOT NULL DEFAULT '[]'::jsonb,
  name_normalized TEXT NOT NULL,
  aliases_normalized JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_watchlist_entries_source_ref
  ON public.watchlist_entries(source, list_name, external_ref)
  WHERE external_ref IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_watchlist_entries_name_trgm
  ON public.watchlist_entries
  USING gin(name_normalized gin_trgm_ops);

CREATE TABLE IF NOT EXISTS public.sanctions_hits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  watchlist_entry_id UUID NOT NULL REFERENCES public.watchlist_entries(id),
  screening_provider TEXT NOT NULL DEFAULT 'system',
  match_score NUMERIC(5,4) NOT NULL CHECK (match_score >= 0 AND match_score <= 1),
  hit_status TEXT NOT NULL CHECK (hit_status IN ('potential','confirmed','dismissed')),
  matched_field TEXT NOT NULL,
  matched_value TEXT NOT NULL,
  rationale TEXT,
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, transaction_id, watchlist_entry_id, matched_field)
);

CREATE INDEX IF NOT EXISTS idx_sanctions_hits_org_tx
  ON public.sanctions_hits(organization_id, transaction_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.normalize_screening_name(input TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT trim(regexp_replace(upper(coalesce(input, '')), '[^A-Z0-9 ]', '', 'g'))
$$;

CREATE OR REPLACE FUNCTION public.search_watchlist_candidates(
  p_search_name TEXT,
  p_limit INT DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  source TEXT,
  list_name TEXT,
  entity_name TEXT,
  entity_type TEXT,
  country TEXT,
  aliases JSONB,
  name_normalized TEXT,
  aliases_normalized JSONB,
  score REAL
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH query AS (
    SELECT public.normalize_screening_name(p_search_name) AS normalized
  ),
  scored_candidates AS (
    SELECT
      w.id,
      w.source,
      w.list_name,
      w.entity_name,
      w.entity_type,
      w.country,
      w.aliases,
      w.name_normalized,
      w.aliases_normalized,
      GREATEST(
        similarity(w.name_normalized, q.normalized),
        CASE
          WHEN q.normalized <> '' AND w.name_normalized = q.normalized THEN 1::REAL
          ELSE 0::REAL
        END,
        COALESCE((
          SELECT max(
            GREATEST(
              similarity(alias_value, q.normalized),
              CASE
                WHEN q.normalized <> '' AND alias_value = q.normalized THEN 0.99::REAL
                ELSE 0::REAL
              END
            )
          )
          FROM jsonb_array_elements_text(w.aliases_normalized) AS alias_table(alias_value)
        ), 0::REAL)
      ) AS score
    FROM public.watchlist_entries w
    CROSS JOIN query q
    WHERE w.is_active = true
      AND q.normalized <> ''
      AND (
        w.name_normalized % q.normalized
        OR w.name_normalized ILIKE '%' || split_part(q.normalized, ' ', 1) || '%'
        OR EXISTS (
          SELECT 1
          FROM jsonb_array_elements_text(w.aliases_normalized) AS alias_table(alias_value)
          WHERE alias_value % q.normalized
             OR alias_value ILIKE '%' || split_part(q.normalized, ' ', 1) || '%'
        )
      )
  )
  SELECT *
  FROM scored_candidates
  ORDER BY score DESC, entity_name ASC
  LIMIT GREATEST(p_limit, 1);
$$;

ALTER TABLE public.watchlist_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sanctions_hits ENABLE ROW LEVEL SECURITY;

CREATE POLICY watchlist_entries_select_authenticated ON public.watchlist_entries
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY sanctions_hits_org_all ON public.sanctions_hits
  FOR ALL
  USING (organization_id = public.current_org_id())
  WITH CHECK (organization_id = public.current_org_id());

REVOKE ALL ON FUNCTION public.search_watchlist_candidates(TEXT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_watchlist_candidates(TEXT, INT) TO authenticated, service_role;
