DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END;
$$;
