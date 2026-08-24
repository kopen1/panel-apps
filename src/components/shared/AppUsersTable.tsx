import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import DataTable, { Column } from '@/components/shared/DataTable'
import { RefreshCw } from 'lucide-react'
import { formatDate, timeAgo } from '@/utils/formatters'

interface AppUser {
  id: string
  device_id: string
  is_premium: boolean
  theme_preference: string
  last_active_at: string | null
  created_at: string
}

interface AppUsersTableProps {
  appId: string
}

export default function AppUsersTable({ appId }: AppUsersTableProps) {
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)

  const fetchUsers = async () => {
    setLoading(true)
    const [countRes, dataRes] = await Promise.all([
      supabase.from('app_users').select('id', { count: 'exact', head: true }).eq('app_id', appId),
      supabase
        .from('app_users')
        .select('*')
        .eq('app_id', appId)
        .order('created_at', { ascending: false })
        .limit(100),
    ])
    if (countRes.count !== null) setTotal(countRes.count)
    if (dataRes.data) setUsers(dataRes.data as AppUser[])
    setLoading(false)
  }

  useEffect(() => {
    fetchUsers()
  }, [appId])

  const columns: Column<AppUser>[] = [
    {
      key: 'device_id',
      header: 'Device ID',
      render: (u) => (
        <span className="font-mono text-xs">
          {u.device_id.slice(0, 8)}…{u.device_id.slice(-4)}
        </span>
      ),
    },
    {
      key: 'is_premium',
      header: 'Premium',
      render: (u) =>
        u.is_premium ? (
          <span className="text-xs px-2 py-0.5 rounded bg-warning/10 text-warning">PREMIUM</span>
        ) : (
          <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">Free</span>
        ),
    },
    {
      key: 'theme_preference',
      header: 'Theme',
      render: (u) => <span className="capitalize">{u.theme_preference}</span>,
      hideOnMobile: true,
    },
    {
      key: 'last_active_at',
      header: 'Last Active',
      render: (u) => (u.last_active_at ? timeAgo(u.last_active_at) : '-'),
    },
    {
      key: 'created_at',
      header: 'Joined',
      render: (u) => formatDate(u.created_at),
      hideOnMobile: true,
    },
  ]

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">App Users</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {total} total user{total === 1 ? '' : 's'} (showing max 100)
          </p>
        </div>
        <button onClick={fetchUsers} className="btn-secondary text-xs">
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>
      <DataTable
        columns={columns}
        data={users}
        loading={loading}
        emptyMessage="Belum ada user yang pakai app ini"
        rowKey={(u) => u.id}
      />
    </div>
  )
}
