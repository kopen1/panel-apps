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
