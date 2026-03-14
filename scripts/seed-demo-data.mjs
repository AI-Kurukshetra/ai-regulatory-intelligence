#!/usr/bin/env node
/**
 * Seed demo data for AI Regulatory Intelligence demo
 * Creates a demo user, org, customers, transactions, alerts, cases, and regulatory docs.
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

// Load env
const envPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '../.env.local')
const envContent = readFileSync(envPath, 'utf8')
const env = Object.fromEntries(
  envContent.split('\n')
    .filter(line => line && !line.startsWith('#'))
    .map(line => line.split('=').map((v, i) => i === 0 ? v.trim() : line.slice(line.indexOf('=') + 1).trim()))
    .filter(([k]) => k)
)

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const DEMO_EMAIL = 'demo@aml-demo.com'
const DEMO_PASSWORD = 'Demo@123456'

async function main() {
  console.log('🌱 Seeding demo data...')

  // 1. Create demo user
  console.log('Creating demo user...')
  let userId
  const { data: existingUsers } = await supabase.auth.admin.listUsers()
  const existing = existingUsers?.users?.find(u => u.email === DEMO_EMAIL)
  if (existing) {
    userId = existing.id
    console.log(`  → User already exists: ${userId}`)
  } else {
    const { data: newUser, error: userErr } = await supabase.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
    })
    if (userErr) { console.error('Error creating user:', userErr); process.exit(1) }
    userId = newUser.user.id
    console.log(`  → Created user: ${userId}`)
  }

  // 2. Create organization
  console.log('Creating organization...')
  let orgId
  const { data: orgs } = await supabase.from('organizations').select('id').eq('name', 'Apex Financial Group').limit(1)
  if (orgs?.length) {
    orgId = orgs[0].id
    console.log(`  → Org already exists: ${orgId}`)
  } else {
    const { data: org, error: orgErr } = await supabase.from('organizations').insert({
      name: 'Apex Financial Group',
      jurisdiction: 'US',
    }).select().single()
    if (orgErr) { console.error('Error creating org:', orgErr); process.exit(1) }
    orgId = org.id
    console.log(`  → Created org: ${orgId}`)
  }

  // 3. Create profile
  console.log('Creating profile...')
  const { data: existingProfile } = await supabase.from('profiles').select('id').eq('id', userId).single()
  if (!existingProfile) {
    const { error: profileErr } = await supabase.from('profiles').insert({
      id: userId,
      organization_id: orgId,
      role: 'compliance_officer',
      full_name: 'Alex Morgan',
    })
    if (profileErr) { console.error('Error creating profile:', profileErr); process.exit(1) }
    console.log('  → Created profile')
  } else {
    console.log('  → Profile already exists')
  }

  // 4. Create customers
  console.log('Creating customers...')
  const customerData = [
    { external_id: 'CUST-001', full_name: 'Marcus Chen', country_of_residence: 'US', kyc_status: 'verified', risk_tier: 'high' },
    { external_id: 'CUST-002', full_name: 'Elena Rodriguez', country_of_residence: 'MX', kyc_status: 'verified', risk_tier: 'standard' },
    { external_id: 'CUST-003', full_name: 'Dmitri Volkov', country_of_residence: 'RU', kyc_status: 'in_review', risk_tier: 'high' },
    { external_id: 'CUST-004', full_name: 'Sarah Thompson', country_of_residence: 'GB', kyc_status: 'verified', risk_tier: 'low' },
    { external_id: 'CUST-005', full_name: 'Ahmad Al-Rashid', country_of_residence: 'AE', kyc_status: 'verified', risk_tier: 'standard' },
  ]
  const customerIds = {}
  for (const c of customerData) {
    const { data: existing } = await supabase.from('customers').select('id').eq('organization_id', orgId).eq('external_id', c.external_id).single()
    if (existing) {
      customerIds[c.external_id] = existing.id
    } else {
      const { data, error } = await supabase.from('customers').insert({ ...c, organization_id: orgId }).select().single()
      if (error) { console.error('Customer error:', error); continue }
      customerIds[c.external_id] = data.id
    }
  }
  console.log(`  → ${Object.keys(customerIds).length} customers ready`)

  // 5. Create accounts
  console.log('Creating accounts...')
  const accountData = [
    { external_id: 'ACC-1001', customer_ext: 'CUST-001', currency: 'USD', status: 'active' },
    { external_id: 'ACC-1002', customer_ext: 'CUST-002', currency: 'USD', status: 'active' },
    { external_id: 'ACC-1003', customer_ext: 'CUST-003', currency: 'USD', status: 'frozen' },
    { external_id: 'ACC-1004', customer_ext: 'CUST-004', currency: 'GBP', status: 'active' },
    { external_id: 'ACC-1005', customer_ext: 'CUST-005', currency: 'USD', status: 'active' },
    { external_id: 'ACC-9999', customer_ext: null, currency: 'USD', status: 'active' }, // external counterparty
  ]
  const accountIds = {}
  for (const a of accountData) {
    const custId = a.customer_ext ? customerIds[a.customer_ext] : null
    const { data: existing } = await supabase.from('accounts').select('id').eq('organization_id', orgId).eq('external_id', a.external_id).single()
    if (existing) {
      accountIds[a.external_id] = existing.id
    } else {
      const { data, error } = await supabase.from('accounts').insert({
        external_id: a.external_id,
        organization_id: orgId,
        customer_id: custId,
        currency: a.currency,
        status: a.status,
      }).select().single()
      if (error) { console.error('Account error:', error); continue }
      accountIds[a.external_id] = data.id
    }
  }
  console.log(`  → ${Object.keys(accountIds).length} accounts ready`)

  // 6. Create transactions
  console.log('Creating transactions...')
  const now = new Date()
  const txData = [
    { key: 'TX-001', from: 'ACC-1001', to: 'ACC-9999', amount: 98500, type: 'wire_transfer', status: 'flagged', risk_score: 87, risk_level: 'critical', country: 'RU', explanation: 'High-value wire to sanctioned-country counterparty' },
    { key: 'TX-002', from: 'ACC-1003', to: 'ACC-9999', amount: 45000, type: 'wire_transfer', status: 'flagged', risk_score: 79, risk_level: 'high', country: 'CN', explanation: 'Frozen account transaction attempt' },
    { key: 'TX-003', from: 'ACC-1002', to: 'ACC-1004', amount: 12500, type: 'transfer', status: 'completed', risk_score: 35, risk_level: 'medium', country: 'MX', explanation: 'Cross-border transfer medium risk' },
    { key: 'TX-004', from: 'ACC-1004', to: 'ACC-1005', amount: 5200, type: 'transfer', status: 'completed', risk_score: 15, risk_level: 'low', country: 'GB', explanation: 'Normal transfer' },
    { key: 'TX-005', from: 'ACC-1001', to: 'ACC-9999', amount: 32000, type: 'wire_transfer', status: 'flagged', risk_score: 82, risk_level: 'critical', country: 'KP', explanation: 'Transaction involving high-risk jurisdiction' },
    { key: 'TX-006', from: 'ACC-1005', to: 'ACC-1002', amount: 8750, type: 'transfer', status: 'completed', risk_score: 22, risk_level: 'low', country: 'AE', explanation: 'Standard cross-border transfer' },
    { key: 'TX-007', from: 'ACC-1002', to: 'ACC-9999', amount: 67300, type: 'wire_transfer', status: 'processing', risk_score: 65, risk_level: 'high', country: 'VE', explanation: 'High-value transfer to monitored jurisdiction' },
    { key: 'TX-008', from: 'ACC-1004', to: 'ACC-1001', amount: 3100, type: 'transfer', status: 'completed', risk_score: 10, risk_level: 'low', country: 'GB', explanation: 'Low risk domestic transfer' },
  ]
  const txIds = {}
  for (let i = 0; i < txData.length; i++) {
    const t = txData[i]
    const created = new Date(now.getTime() - (txData.length - i) * 3600000 * 2) // spread over time
    const { data: existing } = await supabase.from('transactions').select('id').eq('organization_id', orgId).eq('idempotency_key', t.key).single()
    if (existing) {
      txIds[t.key] = existing.id
    } else {
      const { data, error } = await supabase.from('transactions').insert({
        organization_id: orgId,
        idempotency_key: t.key,
        external_tx_id: t.key,
        from_account_id: accountIds[t.from],
        to_account_id: accountIds[t.to],
        amount: t.amount,
        currency: 'USD',
        counterparty_country: t.country,
        transaction_type: t.type,
        status: t.status,
        risk_score: t.risk_score,
        risk_level: t.risk_level,
        risk_explanation: t.explanation,
        scored_at: created,
        created_at: created,
      }).select().single()
      if (error) { console.error('Transaction error:', error); continue }
      txIds[t.key] = data.id
    }
  }
  console.log(`  → ${Object.keys(txIds).length} transactions ready`)

  // 7. Create alerts
  console.log('Creating alerts...')
  const alertData = [
    { txKey: 'TX-001', type: 'sanctions_hit', severity: 'critical', status: 'new', title: 'Sanctions Screening Hit: Russia Wire Transfer', description: 'Transaction TX-001 flagged for potential OFAC violation. Wire transfer of $98,500 to RU-based counterparty.' },
    { txKey: 'TX-005', type: 'sanctions_hit', severity: 'critical', status: 'in_review', title: 'DPRK Jurisdiction Alert: High-Risk Transfer', description: 'Transaction TX-005 involves North Korea — automatically escalated per OFAC compliance protocols.' },
    { txKey: 'TX-002', type: 'frozen_account', severity: 'high', status: 'escalated', title: 'Frozen Account Activity: Dmitri Volkov', description: 'Transaction attempted from frozen account ACC-1003. Compliance review required.' },
    { txKey: 'TX-007', type: 'threshold', severity: 'high', status: 'new', title: 'Large Wire to Venezuela: $67,300', description: 'Exceeds $50K threshold for monitored jurisdictions. Requires analyst review within 24 hours.' },
    { txKey: 'TX-003', type: 'velocity', severity: 'medium', status: 'new', title: 'Cross-Border Velocity: Elena Rodriguez', description: 'Multiple cross-border transactions in 48-hour window. Pattern analysis required.' },
  ]
  const alertIds = {}
  for (const a of alertData) {
    const txId = txIds[a.txKey]
    const { data: existing } = await supabase.from('alerts').select('id').eq('organization_id', orgId).eq('title', a.title).single()
    if (existing) {
      alertIds[a.txKey] = existing.id
    } else {
      const { data, error } = await supabase.from('alerts').insert({
        organization_id: orgId,
        transaction_id: txId,
        alert_type: a.type,
        severity: a.severity,
        status: a.status,
        title: a.title,
        description: a.description,
      }).select().single()
      if (error) { console.error('Alert error:', error); continue }
      alertIds[a.txKey] = data.id
    }
  }
  console.log(`  → ${Object.keys(alertIds).length} alerts ready`)

  // 8. Create cases
  console.log('Creating cases...')
  const caseData = [
    { number: 'CASE-2024-001', status: 'in_progress', priority: 'critical', title: 'Suspected OFAC Violation: Marcus Chen', description: 'Two high-value wire transfers to sanctioned jurisdictions by customer Marcus Chen. Investigation opened per compliance protocol.' },
    { number: 'CASE-2024-002', status: 'pending_sar', priority: 'high', title: 'Structuring Pattern: Venezuela Transfers', description: 'Multiple large-value transfers to Venezuela below CTR threshold. Potential structuring activity detected.' },
    { number: 'CASE-2024-003', status: 'open', priority: 'high', title: 'Frozen Account Breach Attempt', description: 'Transaction initiated from frozen account ACC-1003 belonging to Dmitri Volkov. Account controls review required.' },
  ]
  const caseIds = {}
  for (const c of caseData) {
    const { data: existing } = await supabase.from('cases').select('id').eq('organization_id', orgId).eq('case_number', c.number).single()
    if (existing) {
      caseIds[c.number] = existing.id
    } else {
      const { data, error } = await supabase.from('cases').insert({
        organization_id: orgId,
        case_number: c.number,
        status: c.status,
        priority: c.priority,
        title: c.title,
        description: c.description,
        created_by: userId,
        assigned_to: userId,
      }).select().single()
      if (error) { console.error('Case error:', error); continue }
      caseIds[c.number] = data.id
    }
  }
  console.log(`  → ${Object.keys(caseIds).length} cases ready`)

  // 9. Link alerts to cases
  console.log('Linking alerts to cases...')
  const links = [
    { caseNum: 'CASE-2024-001', alertTxKey: 'TX-001' },
    { caseNum: 'CASE-2024-001', alertTxKey: 'TX-005' },
    { caseNum: 'CASE-2024-002', alertTxKey: 'TX-007' },
    { caseNum: 'CASE-2024-003', alertTxKey: 'TX-002' },
  ]
  for (const l of links) {
    const caseId = caseIds[l.caseNum]
    const alertId = alertIds[l.alertTxKey]
    if (!caseId || !alertId) continue
    const { data: existing } = await supabase.from('case_alerts').select('case_id').eq('case_id', caseId).eq('alert_id', alertId).single()
    if (!existing) {
      const { error } = await supabase.from('case_alerts').insert({ case_id: caseId, alert_id: alertId })
      if (error && !error.message.includes('duplicate')) console.error('Case-alert link error:', error)
    }
  }

  // 10. Create regulatory documents
  console.log('Creating regulatory documents...')
  const regDocs = [
    {
      title: 'FinCEN Advisory: Enhanced Due Diligence for High-Risk Jurisdictions',
      source: 'FinCEN',
      source_url: 'https://www.fincen.gov',
      jurisdiction: 'US',
      document_type: 'guidance',
      content: 'Financial institutions must implement enhanced due diligence procedures for customers and transactions involving high-risk jurisdictions including Russia, North Korea, Iran, and Venezuela. Institutions must document their risk assessment methodology and maintain records for a minimum of 5 years.',
      summary: 'Updated guidance on EDD requirements for high-risk jurisdiction transactions. Requires enhanced monitoring and documentation.',
      change_type: 'Enhanced Requirements',
      impact_level: 'critical',
      key_points: JSON.stringify(['EDD required for all DPRK/Iran/Russia transactions', 'Documentation retention increased to 5 years', 'Real-time monitoring mandatory for >$10K transfers']),
      affected_areas: JSON.stringify(['KYC/EDD', 'Transaction Monitoring', 'Record Keeping']),
      action_items: JSON.stringify(['Review all high-risk jurisdiction customers', 'Update EDD procedures', 'Configure monitoring thresholds']),
      tags: JSON.stringify(['EDD', 'high-risk', 'jurisdictions', 'FinCEN']),
      requires_attention: true,
      attention_reason: 'Directly impacts current active cases involving Russia and DPRK transactions',
      analysis_status: 'completed',
      published_at: new Date(now.getTime() - 7 * 86400000).toISOString(),
    },
    {
      title: 'OFAC SDN List Update: New Designations Q1 2024',
      source: 'OFAC',
      source_url: 'https://www.treasury.gov/ofac',
      jurisdiction: 'US',
      document_type: 'notice',
      content: 'The Office of Foreign Assets Control has designated 23 additional entities and individuals to the Specially Designated Nationals list. Financial institutions must screen all existing customers against updated list within 30 days.',
      summary: 'OFAC adds 23 new SDN designations. Immediate customer screening required.',
      change_type: 'New Designations',
      impact_level: 'critical',
      key_points: JSON.stringify(['23 new entities/individuals added to SDN list', '30-day compliance window for re-screening', 'Immediate freeze on matching accounts']),
      affected_areas: JSON.stringify(['Sanctions Screening', 'Account Management', 'Customer Due Diligence']),
      action_items: JSON.stringify(['Run full customer base re-screening within 30 days', 'Freeze any matching accounts immediately', 'File OFAC reports for any matches found']),
      tags: JSON.stringify(['OFAC', 'SDN', 'sanctions', 'designations']),
      requires_attention: true,
      attention_reason: 'Active customer base must be re-screened against new designations',
      analysis_status: 'completed',
      published_at: new Date(now.getTime() - 3 * 86400000).toISOString(),
    },
    {
      title: 'BSA/AML Examination Manual: Updated SAR Filing Procedures',
      source: 'FFIEC',
      source_url: 'https://www.ffiec.gov',
      jurisdiction: 'US',
      document_type: 'guidance',
      content: 'Updated procedures for Suspicious Activity Report filing, including new thresholds, timelines, and narrative requirements. SAR narratives must now include transaction pattern analysis and customer risk tier assessment.',
      summary: 'Updated SAR filing procedures with enhanced narrative requirements and new transaction pattern analysis requirements.',
      change_type: 'Procedural Update',
      impact_level: 'high',
      key_points: JSON.stringify(['30-day SAR filing window unchanged', 'Narrative must include risk tier assessment', 'Transaction pattern analysis now required', 'Continuing activity SARs at 90-day intervals']),
      affected_areas: JSON.stringify(['SAR Filing', 'Case Management', 'Compliance Reporting']),
      action_items: JSON.stringify(['Update SAR narrative templates', 'Review pending SARs against new requirements', 'Train analysts on new pattern analysis section']),
      tags: JSON.stringify(['SAR', 'BSA', 'AML', 'filing procedures', 'FFIEC']),
      requires_attention: false,
      analysis_status: 'completed',
      published_at: new Date(now.getTime() - 14 * 86400000).toISOString(),
    },
    {
      title: 'FinCEN Final Rule: Beneficial Ownership Requirements',
      source: 'FinCEN',
      source_url: 'https://www.fincen.gov',
      jurisdiction: 'US',
      document_type: 'rule',
      content: 'Final rule implementing the Corporate Transparency Act. All covered entities must report beneficial ownership information to FinCEN. Financial institutions must update their CDD programs to collect and verify beneficial ownership data from legal entity customers.',
      summary: 'CTA implementation rule requiring beneficial ownership reporting for legal entities.',
      change_type: 'New Rule',
      impact_level: 'high',
      key_points: JSON.stringify(['All LLCs, corps must report beneficial owners', 'Financial institutions update CDD programs', 'Access FinCEN BOI database for verification', 'Effective January 1, 2024']),
      affected_areas: JSON.stringify(['Customer Due Diligence', 'KYC', 'Legal Entity Customers']),
      action_items: JSON.stringify(['Update CDD onboarding forms', 'Configure FinCEN BOI API integration', 'Re-verify all legal entity customers']),
      tags: JSON.stringify(['beneficial ownership', 'CTA', 'CDD', 'FinCEN', 'legal entity']),
      requires_attention: false,
      analysis_status: 'completed',
      published_at: new Date(now.getTime() - 21 * 86400000).toISOString(),
    },
    {
      title: 'FinCEN Alert: Virtual Asset Service Provider Compliance',
      source: 'FinCEN',
      source_url: 'https://www.fincen.gov',
      jurisdiction: 'US',
      document_type: 'enforcement',
      content: 'FinCEN has issued enforcement actions against several VASPs for failure to implement adequate AML programs. Financial institutions that provide correspondent banking services to crypto exchanges must apply enhanced due diligence.',
      summary: 'Enforcement action guidance for FIs providing services to crypto exchanges. EDD required.',
      change_type: 'Enforcement Guidance',
      impact_level: 'medium',
      key_points: JSON.stringify(['EDD required for VASP correspondent relationships', 'Risk-based approach to crypto customer monitoring', 'Transaction monitoring must cover crypto conversions']),
      affected_areas: JSON.stringify(['Virtual Assets', 'Correspondent Banking', 'Transaction Monitoring']),
      action_items: JSON.stringify(['Review VASP customer relationships', 'Apply EDD to crypto exchange customers', 'Update transaction monitoring rules for crypto']),
      tags: JSON.stringify(['VASP', 'crypto', 'virtual assets', 'enforcement', 'FinCEN']),
      requires_attention: false,
      analysis_status: 'completed',
      published_at: new Date(now.getTime() - 10 * 86400000).toISOString(),
    },
  ]
  for (const doc of regDocs) {
    const { data: existing } = await supabase.from('regulatory_documents').select('id').eq('organization_id', orgId).eq('title', doc.title).single()
    if (!existing) {
      const { error } = await supabase.from('regulatory_documents').insert({
        ...doc,
        organization_id: orgId,
        key_points: JSON.parse(doc.key_points),
        affected_areas: JSON.parse(doc.affected_areas),
        action_items: JSON.parse(doc.action_items),
        tags: JSON.parse(doc.tags),
        created_by: userId,
      })
      if (error) console.error('Reg doc error:', error)
    }
  }
  console.log('  → Regulatory documents ready')

  console.log('\n✅ Demo data seeded successfully!')
  console.log(`\n📧 Login: ${DEMO_EMAIL}`)
  console.log(`🔑 Password: ${DEMO_PASSWORD}`)
  console.log(`🌐 App URL: http://localhost:3002`)
}

main().catch(console.error)
