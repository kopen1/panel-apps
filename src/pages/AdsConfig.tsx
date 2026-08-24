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
