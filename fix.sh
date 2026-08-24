#!/usr/bin/env bash
set -e
cd ~/workspace/projects/irkop-panel

GREEN='\033[0;32m'; BLUE='\033[0;34m'; NC='\033[0m'
print_step() { echo -e "${BLUE}▶ $1${NC}"; }
print_ok()   { echo -e "${GREEN}✓ $1${NC}"; }

# === 1. Update AppDetail.tsx — tampilkan AdMob App ID ===
print_step "Update AppDetail.tsx..."
cat > src/pages/AppDetail.tsx << 'EOF'
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
EOF

# === 2. Update EditAppModal — tambah field AdMob App ID ===
print_step "Update EditAppModal.tsx..."
cat > src/components/modals/EditAppModal.tsx << 'EOF'
import { useState, FormEvent, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import { supabase } from '@/lib/supabase'
import { Loader2, Save, AlertTriangle, Info } from 'lucide-react'

interface App {
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

interface EditAppModalProps {
  open: boolean
  onClose: () => void
  app: App | null
  onUpdated: () => void
}

export default function EditAppModal({ open, onClose, app, onUpdated }: EditAppModalProps) {
  const [name, setName] = useState('')
  const [packageName, setPackageName] = useState('')
  const [description, setDescription] = useState('')
  const [admobAppId, setAdmobAppId] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [cacheTtl, setCacheTtl] = useState(3600)
  const [configVersion, setConfigVersion] = useState('v1')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (app) {
      setName(app.name)
      setPackageName(app.package_name)
      setDescription(app.description || '')
      setAdmobAppId(app.admob_app_id || '')
      setIsActive(app.is_active)
      setMaintenanceMode(app.maintenance_mode ?? false)
      setCacheTtl(app.config_cache_ttl ?? 3600)
      setConfigVersion(app.config_version || 'v1')
      setError('')
    }
  }, [app])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!app) return
    setError('')

    if (!name.trim()) {
      setError('Nama app wajib diisi')
      return
    }

    const pkg = packageName.trim().toLowerCase()
    if (!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*){1,}$/.test(pkg)) {
      setError('Format package name salah. Contoh: com.irkop.appa')
      return
    }

    // Validasi format AdMob App ID (kalau diisi)
    const trimmedAdmob = admobAppId.trim()
    if (trimmedAdmob && !/^ca-app-pub-\d+~\d+$/.test(trimmedAdmob)) {
      setError('Format AdMob App ID salah. Harus: ca-app-pub-XXXX~XXXX (pakai tilde ~)')
      return
    }

    setLoading(true)
    const { error: updateError } = await supabase
      .from('apps')
      .update({
        name: name.trim(),
        package_name: pkg,
        description: description.trim() || null,
        admob_app_id: trimmedAdmob || null,
        is_active: isActive,
        maintenance_mode: maintenanceMode,
        config_cache_ttl: Number(cacheTtl) || 3600,
        config_version: configVersion.trim() || 'v1',
      })
      .eq('id', app.id)

    if (updateError) {
      let msg = updateError.message
      if (msg.includes('duplicate key')) {
        msg = 'Package name sudah dipakai app lain.'
      }
      setError(msg)
    } else {
      onUpdated()
    }
    setLoading(false)
  }

  return (
    <Modal open={open} onClose={onClose} title={`Edit ${app?.name || ''}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Nama App *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
            required
            autoFocus
            maxLength={100}
          />
        </div>

        <div>
          <label className="label">Package Name *</label>
          <input
            type="text"
            value={packageName}
            onChange={(e) => setPackageName(e.target.value.toLowerCase())}
            className="input font-mono"
            required
          />
          <div className="mt-1 flex items-start gap-1 text-xs text-warning">
            <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
            <span>Mengubah package name akan break app yang sudah ter-install!</span>
          </div>
        </div>

        <div>
          <label className="label">AdMob App ID</label>
          <input
            type="text"
            value={admobAppId}
            onChange={(e) => setAdmobAppId(e.target.value)}
            className="input font-mono text-xs"
            placeholder="ca-app-pub-XXXXXXXX~XXXXXXXX"
          />
          <div className="mt-1 flex items-start gap-1 text-xs text-slate-500 dark:text-slate-400">
            <Info className="w-3 h-3 flex-shrink-0 mt-0.5" />
            <span>
              Format tilde (~). Untuk catatan saja — ID asli harus di-hardcode di AndroidManifest.xml saat build.
            </span>
          </div>
        </div>

        <div>
          <label className="label">Deskripsi</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input"
            rows={3}
            maxLength={500}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Status</label>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`w-full px-3 py-2 rounded-md text-sm font-medium ${
                isActive
                  ? 'bg-success/20 text-success'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
              }`}
            >
              {isActive ? 'Active' : 'Inactive'}
            </button>
          </div>
          <div>
            <label className="label">Maintenance</label>
            <button
              type="button"
              onClick={() => setMaintenanceMode(!maintenanceMode)}
              className={`w-full px-3 py-2 rounded-md text-sm font-medium ${
                maintenanceMode
                  ? 'bg-warning/20 text-warning'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
              }`}
            >
              {maintenanceMode ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Cache TTL (detik)</label>
            <input
              type="number"
              value={cacheTtl}
              onChange={(e) => setCacheTtl(Number(e.target.value))}
              className="input"
              min={60}
              max={86400}
            />
          </div>
          <div>
            <label className="label">Config Version</label>
            <input
              type="text"
              value={configVersion}
              onChange={(e) => setConfigVersion(e.target.value)}
              className="input font-mono"
            />
          </div>
        </div>

        {error && (
          <div className="text-sm text-danger bg-danger/10 border border-danger/20 rounded-md p-3">
            {error}
          </div>
        )}

        <div className="flex gap-2 justify-end pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            Batal
          </button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Simpan
          </button>
        </div>
      </form>
    </Modal>
  )
}
EOF

# === 3. Update NewAppModal — tambah field AdMob App ID ===
print_step "Update NewAppModal.tsx..."
cat > src/components/modals/NewAppModal.tsx << 'EOF'
import { useState, FormEvent } from 'react'
import Modal from '@/components/ui/Modal'
import { supabase } from '@/lib/supabase'
import { Loader2, Plus, Info } from 'lucide-react'

interface NewAppModalProps {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

export default function NewAppModal({ open, onClose, onCreated }: NewAppModalProps) {
  const [name, setName] = useState('')
  const [packageName, setPackageName] = useState('')
  const [description, setDescription] = useState('')
  const [admobAppId, setAdmobAppId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const reset = () => {
    setName('')
    setPackageName('')
    setDescription('')
    setAdmobAppId('')
    setError('')
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Nama app wajib diisi')
      return
    }

    const pkg = packageName.trim().toLowerCase()
    if (!pkg) {
      setError('Package name wajib diisi')
      return
    }
    if (!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*){1,}$/.test(pkg)) {
      setError('Format package name salah. Contoh: com.irkop.appb')
      return
    }

    // Validasi AdMob App ID (kalau diisi)
    const trimmedAdmob = admobAppId.trim()
    if (trimmedAdmob && !/^ca-app-pub-\d+~\d+$/.test(trimmedAdmob)) {
      setError('Format AdMob App ID salah. Harus: ca-app-pub-XXXX~XXXX (pakai tilde ~)')
      return
    }

    setLoading(true)
    // RPC add_app_with_slots tidak punya param admob_app_id,
    // jadi create dulu via RPC, lalu update admob_app_id
    const { data: appId, error: rpcError } = await supabase.rpc('add_app_with_slots', {
      p_name: name.trim(),
      p_package_name: pkg,
      p_description: description.trim() || null,
    })

    if (rpcError) {
      let msg = rpcError.message
      if (msg.includes('duplicate key')) {
        msg = 'Package name sudah dipakai app lain.'
      } else if (msg.includes('Permission denied')) {
        msg = 'Anda tidak punya akses. Hanya admin yang boleh create app.'
      }
      setError(msg)
    } else if (appId && trimmedAdmob) {
      // Update admob_app_id setelah create
      const { error: updateErr } = await supabase
        .from('apps')
        .update({ admob_app_id: trimmedAdmob })
        .eq('id', appId)
      if (updateErr) {
        setError('App dibuat tapi gagala simpan AdMob App ID: ' + updateErr.message)
      } else {
        reset()
        onCreated()
      }
    } else {
      reset()
      onCreated()
    }
    setLoading(false)
  }

  return (
    <Modal open={open} onClose={handleClose} title="Buat App Baru">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Nama App *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
            placeholder="Irkop App B"
            required
            autoFocus
            maxLength={100}
          />
        </div>
        <div>
          <label className="label">Package Name *</label>
          <input
            type="text"
            value={packageName}
            onChange={(e) => setPackageName(e.target.value.toLowerCase())}
            className="input font-mono"
            placeholder="com.irkop.appb"
            required
          />
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Format: com.irkop.namaapp (huruf kecil, dipisah titik)
          </p>
        </div>
        <div>
          <label className="label">AdMob App ID (opsional)</label>
          <input
            type="text"
            value={admobAppId}
            onChange={(e) => setAdmobAppId(e.target.value)}
            className="input font-mono text-xs"
            placeholder="ca-app-pub-XXXXXXXX~XXXXXXXX"
          />
          <div className="mt-1 flex items-start gap-1 text-xs text-slate-500 dark:text-slate-400">
            <Info className="w-3 h-3 flex-shrink-0 mt-0.5" />
            <span>Format tilde (~). Dari AdMob → Apps → App settings.</span>
          </div>
        </div>
        <div>
          <label className="label">Deskripsi (opsional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input"
            placeholder="Deskripsi singkat app…"
            rows={3}
            maxLength={500}
          />
        </div>
        {error && (
          <div className="text-sm text-danger bg-danger/10 border border-danger/20 rounded-md p-3">
            {error}
          </div>
        )}
        <div className="flex gap-2 justify-end pt-2">
          <button type="button" onClick={handleClose} className="btn-secondary">
            Batal
          </button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            Buat App
          </button>
        </div>
      </form>
    </Modal>
  )
}
EOF

# === 4. Update AdsConfig.tsx — validasi Ad Unit ID format ===
print_step "Update AdsConfig.tsx (validasi Ad Unit ID)..."
# Patch: tambah validasi sebelum save
cat > src/pages/AdsConfig.tsx << 'EOF'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Loader2, Save } from 'lucide-react'
import { cn } from '@/utils/cn'

interface AdSlot {
  id: string
  slot_key: string
  ad_type: 'banner' | 'interstitial' | 'rewarded'
  ad_unit_id: string | null
  is_enabled: boolean
  updated_at: string
}

interface AdsConfigProps {
  appId: string
  appAdsEnabled: boolean
  onAppAdsToggle: (next: boolean) => Promise<void>
}

export default function AdsConfig({
  appId,
  appAdsEnabled,
  onAppAdsToggle,
}: AdsConfigProps) {
  const [slots, setSlots] = useState<AdSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [toggling, setToggling] = useState(false)
  const [slotErrors, setSlotErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    const fetchSlots = async () => {
      const { data, error } = await supabase
        .from('ads_slots')
        .select('*')
        .eq('app_id', appId)
        .order('slot_key')
      if (!error && data) setSlots(data as AdSlot[])
      setLoading(false)
    }
    fetchSlots()
  }, [appId])

  const validateAdUnitId = (value: string): string | null => {
    const v = value.trim()
    if (!v) return null // kosong = OK
    if (!/^ca-app-pub-\d+\/\d+$/.test(v)) {
      return 'Format salah! Ad Unit ID pakai slash (/): ca-app-pub-XXXX/XXXX'
    }
    return null
  }

  const updateSlot = async (id: string, patch: Partial<AdSlot>) => {
    // Validasi kalau patch berisi ad_unit_id
    if (patch.ad_unit_id !== undefined) {
      const err = validateAdUnitId(patch.ad_unit_id || '')
      if (err) {
        setSlotErrors((prev) => ({ ...prev, [id]: err }))
        return
      }
      setSlotErrors((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
    }

    setSaving(id)
    const { error } = await supabase
      .from('ads_slots')
      .update(patch)
      .eq('id', id)
    if (!error) {
      setSlots((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...patch } : s))
      )
    }
    setSaving(null)
  }

  const toggleAppAds = async () => {
    setToggling(true)
    await onAppAdsToggle(!appAdsEnabled)
    setToggling(false)
  }

  if (loading) {
    return (
      <div className="card">
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Ads Configuration
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Level 2 (per-app) & Level 3 (per-slot) kontrol
          </p>
        </div>
        <button
          onClick={toggleAppAds}
          disabled={toggling}
          className={cn(
            'px-3 py-1.5 rounded-md text-sm font-medium',
            appAdsEnabled
              ? 'bg-success/20 text-success'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400'
          )}
        >
          App Ads: {appAdsEnabled ? 'ON' : 'OFF'}
        </button>
      </div>

      <div className="space-y-3">
        {slots.map((slot) => (
          <div
            key={slot.id}
            className="border border-slate-200 dark:border-slate-800 rounded-md p-3"
          >
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="font-mono text-sm text-slate-900 dark:text-slate-200">
                  {slot.slot_key}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-500 capitalize">
                  {slot.ad_type}
                </div>
              </div>
              <button
                onClick={() =>
                  updateSlot(slot.id, { is_enabled: !slot.is_enabled })
                }
                disabled={saving === slot.id}
                className={cn(
                  'px-3 py-1 rounded text-xs font-medium',
                  slot.is_enabled
                    ? 'bg-success/20 text-success'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400'
                )}
              >
                {saving === slot.id ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : slot.is_enabled ? (
                  'ON'
                ) : (
                  'OFF'
                )}
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={slot.ad_unit_id || ''}
                onChange={(e) =>
                  setSlots((prev) =>
                    prev.map((s) =>
                      s.id === slot.id
                        ? { ...s, ad_unit_id: e.target.value }
                        : s
                    )
                  )
                }
                placeholder={
                  slot.ad_type === 'banner'
                    ? 'ca-app-pub-XXXX/XXXX (banner unit)'
                    : slot.ad_type === 'interstitial'
                    ? 'ca-app-pub-XXXX/XXXX (interstitial unit)'
                    : 'ca-app-pub-XXXX/XXXX (rewarded unit)'
                }
                className="input font-mono text-xs"
              />
              <button
                onClick={() =>
                  updateSlot(slot.id, { ad_unit_id: slot.ad_unit_id })
                }
                disabled={saving === slot.id}
                className="btn-primary text-xs whitespace-nowrap"
              >
                <Save className="w-3 h-3" /> Save
              </button>
            </div>
            {slotErrors[slot.id] && (
              <p className="mt-1 text-xs text-danger">{slotErrors[slot.id]}</p>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 rounded-md bg-info/5 dark:bg-info/10 border border-info/20 text-xs text-slate-600 dark:text-slate-400">
        <strong className="text-info">Tips:</strong> Ad Unit ID formatnya pakai
        slash (/) — contoh: ca-app-pub-123456/789012. Berbeda dengan AdMob App
        ID yang pakai tilde (~). Ambil dari AdMob → Apps → Ad units.
      </div>
    </div>
  )
}
EOF

# === 5. Commit & push ===
print_step "Commit & push..."
git add -A
git commit -m "feat: add AdMob App ID field per app

- apps.admob_app_id column (for tracking/documentation)
- AppDetail: display AdMob App ID with copy button
- EditAppModal: edit AdMob App ID with format validation (~)
- NewAppModal: optional AdMob App ID field
- AdsConfig: Ad Unit ID format validation (/)"

git push

print_ok "Panel update ter-push!"
echo ""
echo "→ Cloudflare Pages akan auto-deploy dalam 1-3 menit"
echo "→ Refresh panel.irkop.eu.org setelah deploy selesai"