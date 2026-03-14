import { generateSarDraft } from '@/lib/ai/sar-draft'
import { insertAuditLog } from '@/lib/audit/service'
import { getCaseDetail } from '@/lib/cases/queries'
import type { CaseCreateInput, CaseNoteCreateInput, CaseUpdateInput } from '@/lib/cases/schema'
import { canTransitionCaseStatus, buildCaseNumber } from '@/lib/cases/transitions'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { Database } from '@/types/supabase'

type ProfileContext = {
  id: string
  organization_id: string
}

type CaseRow = Database['public']['Tables']['cases']['Row']
type CaseInsert = Database['public']['Tables']['cases']['Insert']
type CaseUpdate = Database['public']['Tables']['cases']['Update']
type CaseAlertInsert = Database['public']['Tables']['case_alerts']['Insert']
type CaseNoteRow = Database['public']['Tables']['case_notes']['Row']
type CaseNoteInsert = Database['public']['Tables']['case_notes']['Insert']
type AlertRow = Database['public']['Tables']['alerts']['Row']
type ReportRow = Database['public']['Tables']['reports']['Row']
type ReportInsert = Database['public']['Tables']['reports']['Insert']

type ServiceError = {
  status: number
  code: string
  message: string
  details?: unknown
}

type ServiceResult<T> = { data: T; meta?: Record<string, unknown> } | { error: ServiceError }

function serviceError(
  status: number,
  code: string,
  message: string,
  details?: unknown
): ServiceResult<never> {
  return {
    error: {
      status,
      code,
      message,
      details
    }
  }
}

async function loadCaseRecord(caseId: string, organizationId: string) {
  const { data, error } = await supabaseAdmin
    .from('cases')
    .select('id, case_number, title, description, status, priority, assigned_to, created_by, created_at, updated_at')
    .eq('organization_id', organizationId)
    .eq('id', caseId)
    .maybeSingle()

  return {
    data: (data as CaseRow | null) ?? null,
    error
  }
}

async function validateAssignableProfile(
  organizationId: string,
  profileId: string | null | undefined
) {
  if (!profileId) {
    return { data: null, error: null }
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('id', profileId)
    .maybeSingle()

  return {
    data: data?.id ?? null,
    error
  }
}

async function loadAlertsForCaseCreation(organizationId: string, alertIds: string[]) {
  const uniqueAlertIds = [...new Set(alertIds)]
  const { data, error } = await supabaseAdmin
    .from('alerts')
    .select('id, title, description, severity, status, assigned_to')
    .eq('organization_id', organizationId)
    .in('id', uniqueAlertIds)

  return {
    data: (data as Pick<
      AlertRow,
      'id' | 'title' | 'description' | 'severity' | 'status' | 'assigned_to'
    >[] | null) ?? [],
    error
  }
}

async function alertsAlreadyLinked(alertIds: string[]) {
  const { data, error } = await supabaseAdmin
    .from('case_alerts')
    .select('alert_id, case_id')
    .in('alert_id', [...new Set(alertIds)])

  return {
    data: (data ?? []) as Pick<Database['public']['Tables']['case_alerts']['Row'], 'alert_id' | 'case_id'>[],
    error
  }
}

async function touchCase(caseId: string) {
  return supabaseAdmin
    .from('cases')
    .update({
      updated_at: new Date().toISOString()
    } as CaseUpdate)
    .eq('id', caseId)
}

export async function createCaseFromAlerts(input: {
  actor: ProfileContext
  payload: CaseCreateInput
}): Promise<ServiceResult<CaseRow>> {
  const { actor, payload } = input
  const uniqueAlertIds = [...new Set(payload.alert_ids)]

  const [{ data: alerts, error: alertsError }, { data: linkedAlerts, error: linkedAlertsError }] =
    await Promise.all([
      loadAlertsForCaseCreation(actor.organization_id, uniqueAlertIds),
      alertsAlreadyLinked(uniqueAlertIds)
    ])

  if (alertsError) {
    return serviceError(500, 'ALERT_LOOKUP_FAILED', 'Failed to load alerts for case creation')
  }

  if (linkedAlertsError) {
    return serviceError(500, 'CASE_LINK_LOOKUP_FAILED', 'Failed to validate alert case links')
  }

  if (alerts.length !== uniqueAlertIds.length) {
    return serviceError(404, 'ALERT_NOT_FOUND', 'One or more alerts could not be found in your organization')
  }

  if (linkedAlerts.length > 0) {
    return serviceError(409, 'ALERT_ALREADY_LINKED', 'One or more alerts are already linked to a case', {
      alert_ids: linkedAlerts.map((link) => link.alert_id)
    })
  }

  const { data: assignedProfileId, error: assignedProfileError } = await validateAssignableProfile(
    actor.organization_id,
    payload.assigned_to
  )

  if (assignedProfileError) {
    return serviceError(500, 'ASSIGNEE_LOOKUP_FAILED', 'Failed to validate case assignee')
  }

  if (payload.assigned_to && !assignedProfileId) {
    return serviceError(400, 'INVALID_ASSIGNEE', 'Assigned user must belong to the same organization')
  }

  const caseInsert: CaseInsert = {
    organization_id: actor.organization_id,
    case_number: buildCaseNumber(),
    title: payload.title,
    description: payload.description ?? null,
    priority: payload.priority,
    status: 'open',
    created_by: actor.id,
    assigned_to: payload.assigned_to ?? null
  }

  const { data: createdCase, error: caseCreateError } = await supabaseAdmin
    .from('cases')
    .insert(caseInsert as never)
    .select('*')
    .single()

  if (caseCreateError || !createdCase) {
    return serviceError(500, 'CASE_CREATE_FAILED', 'Failed to create case')
  }

  const caseAlertInserts: CaseAlertInsert[] = uniqueAlertIds.map((alertId) => ({
    case_id: createdCase.id,
    alert_id: alertId
  }))

  const { error: caseAlertInsertError } = await supabaseAdmin
    .from('case_alerts')
    .insert(caseAlertInserts as never)

  if (caseAlertInsertError) {
    await supabaseAdmin.from('cases').delete().eq('id', createdCase.id)
    return serviceError(500, 'CASE_ALERT_LINK_FAILED', 'Failed to link alerts to the case')
  }

  const { error: alertStatusError } = await supabaseAdmin
    .from('alerts')
    .update({
      status: 'in_review',
      updated_at: new Date().toISOString(),
      ...(payload.assigned_to ? { assigned_to: payload.assigned_to } : {})
    } as Database['public']['Tables']['alerts']['Update'])
    .eq('organization_id', actor.organization_id)
    .in('id', uniqueAlertIds)

  if (alertStatusError) {
    return serviceError(500, 'ALERT_UPDATE_FAILED', 'Case created but linked alerts could not be updated')
  }

  let createdNote: CaseNoteRow | null = null
  if (payload.initial_note) {
    const noteInsert: CaseNoteInsert = {
      organization_id: actor.organization_id,
      case_id: createdCase.id,
      author_user_id: actor.id,
      note: payload.initial_note
    }

    const { data: insertedNote, error: noteError } = await supabaseAdmin
      .from('case_notes')
      .insert(noteInsert as never)
      .select('*')
      .single()

    if (noteError) {
      return serviceError(500, 'CASE_NOTE_CREATE_FAILED', 'Case created but the initial note could not be saved')
    }

    createdNote = (insertedNote as CaseNoteRow | null) ?? null
    await touchCase(createdCase.id)
  }

  await insertAuditLog({
    organization_id: actor.organization_id,
    actor_user_id: actor.id,
    action: 'case.created',
    entity_type: 'case',
    entity_id: createdCase.id,
    after_data: {
      alert_ids: uniqueAlertIds,
      priority: createdCase.priority,
      assigned_to: createdCase.assigned_to
    }
  })

  if (createdNote) {
    await insertAuditLog({
      organization_id: actor.organization_id,
      actor_user_id: actor.id,
      action: 'case.note_added',
      entity_type: 'case',
      entity_id: createdCase.id,
      after_data: {
        note_id: createdNote.id
      }
    })
  }

  return {
    data: createdCase as CaseRow
  }
}

export async function updateCaseRecord(input: {
  actor: ProfileContext
  caseId: string
  payload: CaseUpdateInput
}): Promise<ServiceResult<CaseRow>> {
  const { actor, caseId, payload } = input
  const { data: existingCase, error: caseError } = await loadCaseRecord(caseId, actor.organization_id)

  if (caseError) {
    return serviceError(500, 'CASE_LOOKUP_FAILED', 'Failed to load case')
  }

  if (!existingCase) {
    return serviceError(404, 'CASE_NOT_FOUND', 'Case not found')
  }

  if (payload.status && !canTransitionCaseStatus(existingCase.status as never, payload.status)) {
    return serviceError(
      400,
      'INVALID_STATUS_TRANSITION',
      `Cannot move case from ${existingCase.status} to ${payload.status}`
    )
  }

  const { data: assignedProfileId, error: assignedProfileError } = await validateAssignableProfile(
    actor.organization_id,
    payload.assigned_to
  )

  if (assignedProfileError) {
    return serviceError(500, 'ASSIGNEE_LOOKUP_FAILED', 'Failed to validate case assignee')
  }

  if (payload.assigned_to && !assignedProfileId) {
    return serviceError(400, 'INVALID_ASSIGNEE', 'Assigned user must belong to the same organization')
  }

  const caseUpdate: CaseUpdate = {
    updated_at: new Date().toISOString()
  }

  if (payload.title !== undefined) {
    caseUpdate.title = payload.title
  }

  if (payload.description !== undefined) {
    caseUpdate.description = payload.description
  }

  if (payload.priority !== undefined) {
    caseUpdate.priority = payload.priority
  }

  if (payload.status !== undefined) {
    caseUpdate.status = payload.status
  }

  if (payload.assigned_to !== undefined) {
    caseUpdate.assigned_to = payload.assigned_to
  }

  const { data: updatedCase, error: updateError } = await supabaseAdmin
    .from('cases')
    .update(caseUpdate as never)
    .eq('organization_id', actor.organization_id)
    .eq('id', caseId)
    .select('*')
    .single()

  if (updateError || !updatedCase) {
    return serviceError(500, 'CASE_UPDATE_FAILED', 'Failed to update case')
  }

  await insertAuditLog({
    organization_id: actor.organization_id,
    actor_user_id: actor.id,
    action: 'case.updated',
    entity_type: 'case',
    entity_id: caseId,
    before_data: {
      status: existingCase.status,
      priority: existingCase.priority,
      assigned_to: existingCase.assigned_to
    },
    after_data: {
      status: updatedCase.status,
      priority: updatedCase.priority,
      assigned_to: updatedCase.assigned_to
    }
  })

  return {
    data: updatedCase as CaseRow
  }
}

export async function addCaseNoteRecord(input: {
  actor: ProfileContext
  caseId: string
  payload: CaseNoteCreateInput
}): Promise<ServiceResult<CaseNoteRow>> {
  const { actor, caseId, payload } = input
  const { data: existingCase, error: caseError } = await loadCaseRecord(caseId, actor.organization_id)

  if (caseError) {
    return serviceError(500, 'CASE_LOOKUP_FAILED', 'Failed to load case')
  }

  if (!existingCase) {
    return serviceError(404, 'CASE_NOT_FOUND', 'Case not found')
  }

  const caseNoteInsert: CaseNoteInsert = {
    organization_id: actor.organization_id,
    case_id: caseId,
    author_user_id: actor.id,
    note: payload.note
  }

  const { data: createdNote, error: noteError } = await supabaseAdmin
    .from('case_notes')
    .insert(caseNoteInsert as never)
    .select('*')
    .single()

  if (noteError || !createdNote) {
    return serviceError(500, 'CASE_NOTE_CREATE_FAILED', 'Failed to create case note')
  }

  await touchCase(caseId)

  await insertAuditLog({
    organization_id: actor.organization_id,
    actor_user_id: actor.id,
    action: 'case.note_added',
    entity_type: 'case',
    entity_id: caseId,
    after_data: {
      note_id: createdNote.id
    }
  })

  return {
    data: createdNote as CaseNoteRow
  }
}

export async function generateSarDraftForCase(input: {
  actor: ProfileContext
  caseId: string
}): Promise<ServiceResult<ReportRow>> {
  const { actor, caseId } = input
  const { data: caseDetail, error: caseDetailError } = await getCaseDetail(
    supabaseAdmin,
    actor.organization_id,
    caseId
  )

  if (caseDetailError) {
    return serviceError(500, 'CASE_DETAIL_FAILED', 'Failed to load case context for SAR drafting')
  }

  if (!caseDetail) {
    return serviceError(404, 'CASE_NOT_FOUND', 'Case not found')
  }

  const sarDraft = await generateSarDraft({
    case: {
      case_number: caseDetail.case_number,
      title: caseDetail.title,
      priority: caseDetail.priority,
      status: caseDetail.status,
      description: caseDetail.description
    },
    alerts: caseDetail.alerts.map((alert) => ({
      title: alert.title,
      severity: alert.severity,
      alert_type: alert.alert_type,
      description: alert.description,
      created_at: alert.created_at
    })),
    transactions: caseDetail.transactions.map((transaction) => ({
      id: transaction.id,
      external_tx_id: transaction.external_tx_id,
      amount: transaction.amount,
      currency: transaction.currency,
      transaction_type: transaction.transaction_type,
      status: transaction.status,
      risk_score: transaction.risk_score,
      risk_level: transaction.risk_level,
      created_at: transaction.created_at
    })),
    notes: caseDetail.notes.map((note) => ({
      note: note.note,
      created_at: note.created_at,
      author_name: note.author?.full_name ?? null
    }))
  })

  const { data: existingDraft } = await supabaseAdmin
    .from('reports')
    .select('*')
    .eq('organization_id', actor.organization_id)
    .eq('case_id', caseId)
    .eq('report_type', 'SAR')
    .in('status', ['draft', 'review'])
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let report: ReportRow | null = null

  if (existingDraft) {
    const { data: updatedReport, error: reportUpdateError } = await supabaseAdmin
      .from('reports')
      .update({
        narrative: sarDraft.narrative,
        generated_by_model: sarDraft.model,
        status: 'draft',
        updated_at: new Date().toISOString()
      } as Database['public']['Tables']['reports']['Update'])
      .eq('id', existingDraft.id)
      .select('*')
      .single()

    if (reportUpdateError || !updatedReport) {
      return serviceError(500, 'REPORT_UPDATE_FAILED', 'Failed to persist the SAR draft')
    }

    report = updatedReport as ReportRow
  } else {
    const reportInsert: ReportInsert = {
      organization_id: actor.organization_id,
      case_id: caseId,
      report_type: 'SAR',
      status: 'draft',
      narrative: sarDraft.narrative,
      generated_by_model: sarDraft.model
    }

    const { data: createdReport, error: reportCreateError } = await supabaseAdmin
      .from('reports')
      .insert(reportInsert as never)
      .select('*')
      .single()

    if (reportCreateError || !createdReport) {
      return serviceError(500, 'REPORT_CREATE_FAILED', 'Failed to create the SAR draft')
    }

    report = createdReport as ReportRow
  }

  const nextCaseStatus =
    caseDetail.status === 'sar_filed' || caseDetail.status === 'closed' ? caseDetail.status : 'pending_sar'

  const { error: caseUpdateError } = await supabaseAdmin
    .from('cases')
    .update({
      status: nextCaseStatus,
      updated_at: new Date().toISOString()
    } as CaseUpdate)
    .eq('organization_id', actor.organization_id)
    .eq('id', caseId)

  if (caseUpdateError) {
    return serviceError(500, 'CASE_STATUS_UPDATE_FAILED', 'SAR draft created but case status could not be updated')
  }

  const escalatableAlertIds = caseDetail.alerts
    .filter((alert) => alert.status === 'new' || alert.status === 'in_review')
    .map((alert) => alert.id)

  if (escalatableAlertIds.length > 0) {
    const { error: alertsEscalationError } = await supabaseAdmin
      .from('alerts')
      .update({
        status: 'escalated',
        updated_at: new Date().toISOString()
      } as Database['public']['Tables']['alerts']['Update'])
      .eq('organization_id', actor.organization_id)
      .in('id', escalatableAlertIds)

    if (alertsEscalationError) {
      return serviceError(500, 'ALERT_ESCALATION_FAILED', 'SAR draft created but linked alerts could not be escalated')
    }
  }

  await insertAuditLog({
    organization_id: actor.organization_id,
    actor_user_id: actor.id,
    action: 'report.sar_generated',
    entity_type: 'report',
    entity_id: report.id,
    after_data: {
      case_id: caseId,
      generated_by_model: sarDraft.model,
      fallback: sarDraft.usedFallback
    }
  })

  return {
    data: report,
    meta: {
      used_fallback: sarDraft.usedFallback
    }
  }
}
