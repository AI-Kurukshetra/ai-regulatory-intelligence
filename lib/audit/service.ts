import { supabaseAdmin } from '@/lib/supabase/admin'
import type { Database } from '@/types/supabase'

type AuditLogInsert = Database['public']['Tables']['audit_logs']['Insert']

export async function insertAuditLog(auditInsert: AuditLogInsert) {
  return supabaseAdmin.from('audit_logs').insert(auditInsert as never)
}
