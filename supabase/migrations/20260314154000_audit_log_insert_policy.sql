-- Allow authenticated users to append audit events in their own organization.
CREATE POLICY audit_logs_insert_org ON audit_logs
  FOR INSERT
  WITH CHECK (
    organization_id = public.current_org_id()
    AND actor_user_id = auth.uid()
  );

