import { useEffect, useState } from 'react'
import { Loader2, ToggleLeft, Info } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/context/ThemeContext'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/utils/cn'

export default function Settings() {
  const { theme, setTheme } = useTheme()
  const { profile } = useAuth()
  const [adsGlobal, setAdsGlobal] = useState(false)
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    const fetchConfig = async () => {
      const { data } = await supabase
        .from('global_config')
        .select('key, value')
        .in('key', ['ads_enabled', 'maintenance_mode'])
      const map: Record<string, string> = {}
      data?.forEach((r: { key: string; value: string }) => (map[r.key] = r.value))
      setAdsGlobal(map.ads_enabled === 'true')
      setMaintenanceMode(map.maintenance_mode === 'true')
      setLoading(false)
    }
    fetchConfig()
  }, [])

  const updateConfig = async (key: string, value: boolean) => {
    setSaving(key)
    const { error } = await supabase
      .from('global_config')
      .update({ value: String(value) })
      .eq('key', key)
    if (!error) {
      if (key === 'ads_enabled') setAdsGlobal(value)
      if (key === 'maintenance_mode') setMaintenanceMode(value)
    }
    setSaving(null)
  }

  const themes: Array<{ value: 'dark' | 'light' | 'auto'; label: string }> = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'auto', label: 'Auto' },
  ]

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Konfigurasi global & preferensi</p>
      </div>

      {/* Global Ads */}
      <div className="card">
        <h2 className="font-semibold text-slate-900 dark:text-white mb-2">Global Ads Control</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Level 1: Toggle iklan untuk SEMUA app sekaligus (emergency switch).
        </p>
        <button
          onClick={() => updateConfig('ads_enabled', !adsGlobal)}
          disabled={saving === 'ads_enabled'}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-md font-medium',
            adsGlobal
              ? 'bg-success/20 text-success'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
          )}
        >
          {saving === 'ads_enabled' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ToggleLeft className="w-5 h-5" />
          )}
          Global Ads: {adsGlobal ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* Maintenance Mode */}
      <div className="card">
        <div className="flex items-start justify-between mb-2">
          <h2 className="font-semibold text-slate-900 dark:text-white">Maintenance Mode</h2>
        </div>
        <div className="flex items-start gap-2 mb-4">
          <Info className="w-4 h-4 text-info mt-0.5 flex-shrink-0" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Saat ON, Flutter app akan tampilkan layar "Sedang Maintenance" ke user.
            Pakai saat: bug critical, update besar, atau migrasi database. Saat ini belum
            berfungsi karena Flutter app belum dibuat (Fase 3).
          </p>
        </div>
        <button
          onClick={() => updateConfig('maintenance_mode', !maintenanceMode)}
          disabled={saving === 'maintenance_mode'}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-md font-medium',
            maintenanceMode
              ? 'bg-warning/20 text-warning'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
          )}
        >
          {saving === 'maintenance_mode' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ToggleLeft className="w-5 h-5" />
          )}
          Maintenance: {maintenanceMode ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* Theme */}
      <div className="card">
        <h2 className="font-semibold text-slate-900 dark:text-white mb-4">Tema</h2>
        <div className="flex gap-2">
          {themes.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={cn(
                'px-4 py-2 rounded-md text-sm font-medium',
                theme === value
                  ? 'bg-primary text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Account */}
      <div className="card">
        <h2 className="font-semibold text-slate-900 dark:text-white mb-4">Akun</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between border-b border-slate-200 dark:border-slate-800 py-2">
            <span className="text-slate-500 dark:text-slate-400">Email</span>
            <span className="text-slate-900 dark:text-slate-200">{profile?.email}</span>
          </div>
          <div className="flex justify-between border-b border-slate-200 dark:border-slate-800 py-2">
            <span className="text-slate-500 dark:text-slate-400">Role</span>
            <span className="text-slate-900 dark:text-slate-200">{profile?.role}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-slate-500 dark:text-slate-400">Status</span>
            <span className={profile?.is_active ? 'text-success' : 'text-danger'}>
              {profile?.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
