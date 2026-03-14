-- Phase 3 foundation: investigator notes for case operations.

CREATE TABLE IF NOT EXISTS public.case_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  author_user_id UUID NOT NULL REFERENCES public.profiles(id),
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_case_notes_case_created
  ON public.case_notes(case_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_case_notes_org_case
  ON public.case_notes(organization_id, case_id);

ALTER TABLE public.case_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY case_notes_org_all ON public.case_notes
  FOR ALL
  USING (organization_id = public.current_org_id())
  WITH CHECK (organization_id = public.current_org_id());
