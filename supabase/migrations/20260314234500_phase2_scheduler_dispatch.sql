-- Phase 2 scheduler preparation for Supabase Cron + Edge Functions.

create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function public.invoke_phase2_job_scheduler(
  p_job_types text[] default array['score_transaction', 'screen_sanctions'],
  p_limit integer default 10
)
returns bigint
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_project_url text;
  v_publishable_key text;
  v_app_url text;
  v_job_secret text;
  v_request_id bigint;
begin
  select decrypted_secret
    into v_project_url
  from vault.decrypted_secrets
  where name = 'phase2_scheduler_project_url'
  limit 1;

  select decrypted_secret
    into v_publishable_key
  from vault.decrypted_secrets
  where name = 'phase2_scheduler_publishable_key'
  limit 1;

  select decrypted_secret
    into v_app_url
  from vault.decrypted_secrets
  where name = 'phase2_scheduler_app_url'
  limit 1;

  select decrypted_secret
    into v_job_secret
  from vault.decrypted_secrets
  where name = 'phase2_scheduler_job_secret'
  limit 1;

  if coalesce(v_project_url, '') = '' then
    raise exception 'Missing vault secret: phase2_scheduler_project_url';
  end if;

  if coalesce(v_publishable_key, '') = '' then
    raise exception 'Missing vault secret: phase2_scheduler_publishable_key';
  end if;

  if coalesce(v_app_url, '') = '' then
    raise exception 'Missing vault secret: phase2_scheduler_app_url';
  end if;

  if coalesce(v_job_secret, '') = '' then
    raise exception 'Missing vault secret: phase2_scheduler_job_secret';
  end if;

  select net.http_post(
    url := rtrim(v_project_url, '/') || '/functions/v1/process-jobs',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_publishable_key
    ),
    body := jsonb_build_object(
      'job_types', to_jsonb(coalesce(p_job_types, array['score_transaction', 'screen_sanctions']::text[])),
      'limit', greatest(1, least(coalesce(p_limit, 10), 50)),
      'app_url', v_app_url,
      'job_secret', v_job_secret
    ),
    timeout_milliseconds := 10000
  )
    into v_request_id;

  return v_request_id;
end;
$$;

comment on function public.invoke_phase2_job_scheduler(text[], integer) is
  'Dispatches the Supabase process-jobs Edge Function with Vault-backed app and job-runner secrets.';
