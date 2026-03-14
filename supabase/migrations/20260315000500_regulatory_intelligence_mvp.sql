-- Rapid MVP slice: regulatory document ingestion, AI analysis, and intelligence dashboard support.

create table if not exists public.regulatory_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  source text not null,
  source_url text,
  jurisdiction text not null default 'US',
  document_type text not null default 'guidance'
    check (document_type in ('rule', 'guidance', 'enforcement', 'notice', 'policy', 'other')),
  content text not null,
  summary text,
  change_type text,
  impact_level text
    check (impact_level in ('critical', 'high', 'medium', 'low')),
  key_points jsonb not null default '[]'::jsonb,
  affected_areas jsonb not null default '[]'::jsonb,
  action_items jsonb not null default '[]'::jsonb,
  tags jsonb not null default '[]'::jsonb,
  requires_attention boolean not null default false,
  attention_reason text,
  analysis_status text not null default 'pending'
    check (analysis_status in ('pending', 'completed', 'fallback', 'failed')),
  analysis_model text,
  published_at timestamptz,
  effective_at timestamptz,
  analyzed_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_regulatory_documents_org_created
  on public.regulatory_documents(organization_id, created_at desc);

create index if not exists idx_regulatory_documents_org_attention
  on public.regulatory_documents(organization_id, requires_attention, analyzed_at desc);

create index if not exists idx_regulatory_documents_org_impact
  on public.regulatory_documents(organization_id, impact_level, analyzed_at desc);

alter table public.regulatory_documents enable row level security;

create policy regulatory_documents_org_all on public.regulatory_documents
  for all
  using (organization_id = public.current_org_id())
  with check (organization_id = public.current_org_id());
