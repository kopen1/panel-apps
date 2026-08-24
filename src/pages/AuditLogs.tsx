import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import DataTable, { Column } from '@/components/shared/DataTable'
import { RefreshCw, Filter } from 'lucide-react'
import { formatDate } from '@/utils/formatters'

interface AuditLog {
  id: string
  admin_id: string | null
  action: string
  target_table: string
  target_id: string | null
  old_value: Record<string, unknown> | null
  new_value: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
  admin_email?: string | null
}

interface AdminMap {
  [key: string]: string | null
}

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [tableFilter, setTableFilter] = useState<string>('')

  const fetchLogs = async () => {
    setLoading(true)
    let query = supabase
      .from('audit_logs')
      .select('id, admin_id, action, target_table, target_id, old_value, new_value, ip_address, created_at')
      .order('created_at', { ascending: false })
      .limit(200)

    if (tableFilter) {
      query = query.eq('target_table', tableFilter)
    }

    const { data, error } = await query
    if (error) {
      console.error('Failed to fetch audit logs:', error)
      setLoading(false)
      return
    }

    // Fetch admin emails
    const adminIds = Array.from(new Set(data?.map((l: AuditLog) => l.admin_id).filter(Boolean) as string[]))
    let adminMap: AdminMap = {}
    if (adminIds.length > 0) {
      const { data: admins } = await supabase
        .from('admin_users')
        .select('id, email')
        .in('id', adminIds)
      adminMap = (admins || []).reduce((acc: AdminMap, a: { id: string; email: string | null }) => {
        acc[a.id] = a.email
        return acc
      }, {})
    }

    const logsWithEmail = (data || []).map((l: AuditLog) => ({
      ...l,
      admin_email: l.admin_id ? adminMap[l.admin_id] : null,
    }))

    setLogs(logsWithEmail as AuditLog[])
    setLoading(false)
  }

  useEffect(() => {
    fetchLogs()
  }, [tableFilter])

  const columns: Column<AuditLog>[] = [
    {
      key: 'created_at',
      header: 'Waktu',
      render: (l) => (
        <span className="text-xs whitespace-nowrap">{formatDate(l.created_at)}</span>
      ),
    },
    {
      key: 'admin_email',
      header: 'Admin',
      render: (l) => (
        <span className="text-xs">{l.admin_email || 'unknown'}</span>
      ),
      hideOnMobile: true,
    },
    {
      key: 'action',
      header: 'Aksi',
      render: (l) => {
        const colors: Record<string, string> = {
          insert: 'bg-success/10 text-success',
          update: 'bg-info/10 text-info',
          delete: 'bg-danger/10 text-danger',
        }
        return (
          <span className={`text-xs px-2 py-0.5 rounded font-medium ${colors[l.action] || 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
            {l.action}
          </span>
        )
      },
    },
    {
      key: 'target_table',
      header: 'Tabel',
      render: (l) => <span className="font-mono text-xs">{l.target_table}</span>,
    },
    {
      key: 'target_id',
      header: 'Target ID',
      render: (l) => (
        <span className="font-mono text-xs text-slate-500">
          {l.target_id ? `${l.target_id.slice(0, 8)}…` : '-'}
        </span>
      ),
      hideOnMobile: true,
    },
    {
      key: 'changes',
      header: 'Detail',
      render: (l) => {
        if (!l.old_value && !l.new_value) return '-'
        const newValue = l.new_value as Record<string, unknown> | null
        const keys = newValue ? Object.keys(newValue).slice(0, 3) : []
        return (
          <span className="text-xs text-slate-500">
            {keys.length > 0 ? keys.join(', ') : 'N/A'}
          </span>
        )
      },
    },
  ]

  const tableOptions = ['', 'apps', 'ads_slots', 'global_config', 'admin_users']

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Audit Logs</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Riwayat perubahan oleh admin (max 200 entri terbaru)
        </p>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={tableFilter}
              onChange={(e) => setTableFilter(e.target.value)}
              className="input py-1 text-sm w-auto"
            >
              {tableOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt === '' ? 'Semua tabel' : opt}
                </option>
              ))}
            </select>
          </div>
          <button onClick={fetchLogs} className="btn-secondary text-xs">
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>
        <DataTable
          columns={columns}
          data={logs}
          loading={loading}
          emptyMessage="Belum ada log perubahan"
          rowKey={(l) => l.id}
        />
      </div>
    </div>
  )
}
