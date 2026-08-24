import { useEffect, useState } from 'react'
import {
  Smartphone,
  Users,
  Activity,
  DollarSign,
  Eye,
  MousePointerClick,
  Wrench,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import StatCard from '@/components/shared/StatCard'
import { formatNumber, formatCurrency } from '@/utils/formatters'

interface DashboardStats {
  total_apps: number
  total_users: number
  active_users_24h: number
  ads_global_enabled: boolean
  total_active_slots: number
  revenue_today: number
  impressions_today: number
  clicks_today: number
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [appsInMaintenance, setAppsInMaintenance] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      const { data: statsData, error: statsError } = await supabase
        .from('v_dashboard_stats')
        .select('*')
        .single()
      if (!statsError && statsData) setStats(statsData as DashboardStats)

      const { count } = await supabase
        .from('apps')
        .select('id', { count: 'exact', head: true })
        .eq('maintenance_mode', true)
      setAppsInMaintenance(count || 0)

      setLoading(false)
    }
    fetch()
  }, [])

  if (loading || !stats) {
    return <div className="text-slate-500 dark:text-slate-400">Loading dashboard…</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Ringkasan ekosistem Irkop Apps</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Apps" value={stats.total_apps} icon={Smartphone} />
        <StatCard label="Total Users" value={formatNumber(stats.total_users)} icon={Users} color="info" />
        <StatCard label="Active 24h" value={formatNumber(stats.active_users_24h)} icon={Activity} color="success" />
        <StatCard
          label="Ads Global"
          value={stats.ads_global_enabled ? 'ON' : 'OFF'}
          icon={Eye}
          color={stats.ads_global_enabled ? 'success' : 'warning'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <StatCard label="Active Slots" value={stats.total_active_slots} icon={Eye} color="info" />
        <StatCard label="Impressions Today" value={formatNumber(stats.impressions_today)} icon={Eye} color="primary" />
        <StatCard label="Clicks Today" value={formatNumber(stats.clicks_today)} icon={MousePointerClick} color="warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <StatCard label="Revenue Today" value={formatCurrency(stats.revenue_today)} icon={DollarSign} color="success" />
        <StatCard
          label="Apps in Maintenance"
          value={appsInMaintenance}
          icon={Wrench}
          color={appsInMaintenance > 0 ? 'warning' : 'primary'}
        />
      </div>
    </div>
  )
}
