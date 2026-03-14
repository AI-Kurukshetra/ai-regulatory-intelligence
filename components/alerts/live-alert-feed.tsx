'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { RiskBadge } from '@/components/transactions/risk-badge'
import { StatusBadge } from '@/components/transactions/status-badge'
import { createClient } from '@/lib/supabase/client'
import type { AlertListItem } from '@/lib/alerts/queries'
import type { Database } from '@/types/supabase'
import { formatCompactId, formatDateTime, formatLabel } from '@/lib/utils/formatters'

type AlertRow = Database['public']['Tables']['alerts']['Row']

type LiveAlertFeedProps = {
  initialAlerts: AlertListItem[]
  organizationId: string
}

function sortAlerts(alerts: AlertListItem[]) {
  return [...alerts].sort(
    (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
  )
}

function normalizeAlertRow(alert: AlertRow): AlertListItem {
  return {
    id: alert.id,
    alert_type: alert.alert_type,
    severity: alert.severity,
    status: alert.status,
    title: alert.title,
    description: alert.description,
    transaction_id: alert.transaction_id,
    created_at: alert.created_at,
    updated_at: alert.updated_at
  }
}

function upsertAlert(existingAlerts: AlertListItem[], incomingAlert: AlertListItem) {
  const nextAlerts = [incomingAlert, ...existingAlerts.filter((alert) => alert.id !== incomingAlert.id)]
  return sortAlerts(nextAlerts).slice(0, 25)
}

export function LiveAlertFeed({ initialAlerts, organizationId }: LiveAlertFeedProps) {
  const supabase = useMemo(() => createClient(), [])
  const [alerts, setAlerts] = useState(() => sortAlerts(initialAlerts))
  const [connectionState, setConnectionState] = useState<'connecting' | 'live'>('connecting')

  useEffect(() => {
    const channel = supabase
      .channel(`alerts-live-${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'alerts',
          filter: `organization_id=eq.${organizationId}`
        },
        (payload: RealtimePostgresChangesPayload<AlertRow>) => {
          if (payload.eventType === 'DELETE') {
            const deletedAlert = payload.old as Partial<AlertRow>
            if (deletedAlert.id) {
              setAlerts((currentAlerts) =>
                currentAlerts.filter((alert) => alert.id !== deletedAlert.id)
              )
            }
            return
          }

          const nextAlert = payload.new as AlertRow

          if (!nextAlert?.id) {
            return
          }

          setAlerts((currentAlerts) => upsertAlert(currentAlerts, normalizeAlertRow(nextAlert)))
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionState('live')
        }
      })

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [organizationId, supabase])

  if (alerts.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center">
        <p className="text-sm uppercase tracking-[0.2em] text-slate-500">No active alerts</p>
        <h2 className="mt-3 text-xl font-semibold">The live feed is quiet</h2>
        <p className="mt-2 text-sm text-slate-400">
          As soon as a transaction crosses the review threshold, it will appear here automatically.
        </p>
      </div>
    )
  }

  return (
    <div className="glass-card rounded-2xl p-4">
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Realtime feed</p>
          <h2 className="mt-2 text-xl font-semibold">Latest alerts</h2>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs uppercase tracking-[0.16em] text-cyan-100">
          <span className="h-2 w-2 rounded-full bg-cyan-300" />
          {connectionState}
        </div>
      </div>

      <div className="space-y-3">
        {alerts.map((alert) => (
          <article
            key={alert.id}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:bg-white/[0.05]"
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <RiskBadge level={alert.severity} />
                  <StatusBadge status={alert.status} />
                </div>
                <h3 className="text-lg font-medium text-slate-100">{alert.title}</h3>
                <p className="text-sm text-slate-400">{alert.description ?? 'No alert description available.'}</p>
              </div>
              <div className="text-right text-xs uppercase tracking-[0.16em] text-slate-500">
                <p>{formatLabel(alert.alert_type)}</p>
                <p className="mt-2">{formatDateTime(alert.created_at)}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2 text-sm text-slate-300 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono text-xs text-slate-500">{formatCompactId(alert.id, 8, 4)}</span>
                {alert.transaction_id ? (
                  <Link
                    className="text-cyan-300 transition hover:text-cyan-200 hover:underline"
                    href={`/transactions/${alert.transaction_id}`}
                  >
                    Review transaction
                  </Link>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
