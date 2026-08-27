import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Loader2,
  Smartphone,
  Pencil,
  Trash2,
  Wrench,
  Copy,
  Check,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import AdsConfig from './AdsConfig'
import StatCard from '@/components/shared/StatCard'
import AppUsersTable from '@/components/shared/AppUsersTable'
import EditAppModal from '@/components/modals/EditAppModal'
import DeleteAppModal from '@/components/modals/DeleteAppModal'
import { formatNumber, formatCurrency } from '@/utils/formatters'
import { cn } from '@/utils/cn'
import AppReleases from './AppReleases'

interface AppDetail {
  id: string
  name: string
  package_name: string
  description: string | null
  ads_enabled: boolean
  is_active: boolean
  maintenance_mode: boolean
  admob_app_id: string | null
  config_cache_ttl: number
  config_version: string
}

interface AppMetrics {
  total_users: number
  active_users_24h: number
  active_slots: number
  total_impressions: number
  total_clicks: number
  total_revenue: number
}

export default function AppDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [app, setApp] = useState<AppDetail | null>(null)
  const [metrics, setMetrics] = useState<AppMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [togglingMaint, setTogglingMaint] = useState(false)
  const [copied, setCopied] = useState(false)

  const fetchAll = async () => {
    if (!id) return
    const [appRes, metricsRes] = await Promise.all([
      supabase.from('apps').select('*').eq('id', id).single(),
      supabase
        .from('v_app_metrics')
        .select('total_users, active_users_24h, active_slots, total_impressions, total_clicks, total_revenue')
        .eq('app_id', id)
        .single(),
    ])
    if (!appRes.error && appRes.data) setApp(appRes.data as AppDetail)
    if (!metricsRes.error && metricsRes.data) setMetrics(metricsRes.data as AppMetrics)
    setLoading(false)
  }

  useEffect(() => {
    fetchAll()
  }, [id])

  const toggleMaintenance = async () => {
    if (!app) return
    setTogglingMaint(true)
    const { error } = await supabase
      .from('apps')
      .update({ maintenance_mode: !app.maintenance_mode })
      .eq('id', app.id)
    if (!error) setApp({ ...app, maintenance_mode: !app.maintenance_mode })
    setTogglingMaint(false)
  }

  const copyAppId = async () => {
    if (!app?.admob_app_id) return
    try {
      await navigator.clipboard.writeText(app.admob_app_id)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback untuk browser lama
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }
  if (!app) return <div className="text-slate-500 dark:text-slate-400">App tidak ditemukan.</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Link
          to="/apps"
          className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Apps
        </Link>
        <div className="flex gap-2">
          <button onClick={() => setEditOpen(true)} className="btn-secondary text-xs">
            <Pencil className="w-3 h-3" /> Edit
          </button>
          <button
            onClick={() => setDeleteOpen(true)}
            className="btn text-xs bg-danger/10 text-danger hover:bg-danger hover:text-white"
          >
            <Trash2 className="w-3 h-3" /> Delete
          </button>
        </div>
      </div>

      {/* Header App Info */}
      <div className="card">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Smartphone className="w-7 h-7" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white truncate">
              {app.name}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-mono truncate">
              {app.package_name}
            </p>
          </div>
        </div>
        {app.description && (
          <p className="mt-4 text-sm text-slate-700 dark:text-slate-300">{app.description}</p>
        )}

        {/* AdMob App ID */}
        <div className="mt-4 p-3 rounded-md bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="min-w-0">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                AdMob App ID
              </div>
              <div className="text-sm font-mono text-slate-900 dark:text-slate-200 truncate">
                {app.admob_app_id || '— belum diisi —'}
              </div>
            </div>
            {app.admob_app_id && (
              <button
                onClick={copyAppId}
                className="btn-secondary text-xs flex-shrink-0"
                title="Copy App ID"
              >
                {copied ? (
                  <Check className="w-3 h-3 text-success" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            Untuk dokumentasi. ID asli sudah hardcoded di AndroidManifest.xml app.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 text-sm">
          <div>
            <div className="text-slate-500">Status</div>
            <div className={app.is_active ? 'text-success' : 'text-slate-400'}>
              {app.is_active ? 'Active' : 'Inactive'}
            </div>
          </div>
          <div>
            <div className="text-slate-500">App-level Ads</div>
            <div className={app.ads_enabled ? 'text-success' : 'text-slate-400'}>
              {app.ads_enabled ? 'ON' : 'OFF'}
            </div>
          </div>
          <div>
            <div className="text-slate-500">Cache TTL</div>
            <div className="text-slate-700 dark:text-slate-300">{app.config_cache_ttl}s</div>
          </div>
          <div>
            <div className="text-slate-500">Config Version</div>
            <div className="text-slate-700 dark:text-slate-300">{app.config_version}</div>
          </div>
        </div>

        {/* Maintenance per-app */}
        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
                <Wrench className="w-4 h-4" /> Maintenance Mode (Per App)
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Saat ON, Flutter app ini akan tampilkan layar maintenance ke user.
              </p>
            </div>
            <button
              onClick={toggleMaintenance}
              disabled={togglingMaint}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium',
                app.maintenance_mode
                  ? 'bg-warning/20 text-warning'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400'
              )}
            >
              {togglingMaint ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : app.maintenance_mode ? (
                'Maintenance: ON'
              ) : (
                'Maintenance: OFF'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Users & Metrics */}
      <div className="card">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Users & Metrics
        </h2>
        {metrics ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard label="Total Users" value={formatNumber(metrics.total_users)} icon={Smartphone} color="info" />
            <StatCard label="Active 24h" value={formatNumber(metrics.active_users_24h)} icon={Smartphone} color="success" />
            <StatCard label="Active Slots" value={metrics.active_slots} icon={Smartphone} color="primary" />
            <StatCard label="Impressions" value={formatNumber(metrics.total_impressions)} icon={Smartphone} color="info" />
            <StatCard label="Clicks" value={formatNumber(metrics.total_clicks)} icon={Smartphone} color="warning" />
            <StatCard label="Revenue" value={formatCurrency(metrics.total_revenue)} icon={Smartphone} color="success" />
          </div>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">Metrics belum tersedia.</p>
        )}
      </div>

      <AppUsersTable appId={app.id} />

      <AppReleases appId={app.id} />

      <AdsConfig
        appId={app.id}
        appAdsEnabled={app.ads_enabled}
        onAppAdsToggle={async (next) => {
          const { error } = await supabase
            .from('apps')
            .update({ ads_enabled: next })
            .eq('id', app.id)
          if (!error) setApp({ ...app, ads_enabled: next })
        }}
      />

      <EditAppModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        app={app}
        onUpdated={() => {
          setEditOpen(false)
          fetchAll()
        }}
      />

      <DeleteAppModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        app={app}
        onDeleted={() => {
          setDeleteOpen(false)
          navigate('/apps')
        }}
      />
    </div>
  )
}
