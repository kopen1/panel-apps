import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Loader2, Plus, Trash2, Star, ExternalLink } from 'lucide-react'
import { cn } from '@/utils/cn'

interface Release {
  id: string
  version: string
  version_code: number
  download_url: string | null
  changelog: string | null
  is_latest: boolean
  created_at: string
}

export default function AppReleases({ appId }: { appId: string }) {
  const [releases, setReleases] = useState<Release[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [version, setVersion] = useState('')
  const [versionCode, setVersionCode] = useState('')
  const [downloadUrl, setDownloadUrl] = useState('')
  const [changelog, setChangelog] = useState('')
  const [showForm, setShowForm] = useState(false)

  const fetchReleases = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('app_releases')
      .select('*')
      .eq('app_id', appId)
      .order('version_code', { ascending: false })
    if (!error && data) setReleases(data as Release[])
    setLoading(false)
  }

  useEffect(() => {
    fetchReleases()
  }, [appId])

  const addRelease = async () => {
    setError('')
    const v = version.trim()
    const vc = parseInt(versionCode)

    if (!v) { setError('Versi wajib (contoh: 0.12.3)'); return }
    if (isNaN(vc) || vc < 1) { setError('Version code wajib angka >= 1'); return }

    setSaving(true)

    // 1. Set semua is_latest = false (hanya 1 latest per app)
    await supabase
      .from('app_releases')
      .update({ is_latest: false })
      .eq('app_id', appId)

    // 2. Insert release baru sebagai latest
    const { error: insertErr } = await supabase
      .from('app_releases')
      .insert({
        app_id: appId,
        version: v,
        version_code: vc,
        download_url: downloadUrl.trim() || null,
        changelog: changelog.trim() || null,
        is_latest: true,
      })

    if (insertErr) {
      let msg = insertErr.message
      if (msg.includes('duplicate key')) {
        msg = `Version code ${vc} sudah dipakai! Gunakan angka lebih besar dari ${
          releases[0]?.version_code ?? 0
        }.`
      }
      setError(msg)
    } else {
      setVersion(''); setVersionCode(''); setDownloadUrl(''); setChangelog('')
      setShowForm(false)
      await fetchReleases()
    }
    setSaving(false)
  }

  const setLatest = async (id: string) => {
    setSaving(true)
    await supabase.from('app_releases').update({ is_latest: false }).eq('app_id', appId)
    await supabase.from('app_releases').update({ is_latest: true }).eq('id', id)
    await fetchReleases()
    setSaving(false)
  }

  const deleteRelease = async (id: string, version: string) => {
    const ok = await confirm(`Hapus rilis v${version}?`)
    if (!ok) return
    setSaving(true)
    await supabase.from('app_releases').delete().eq('id', id)
    await fetchReleases()
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Rilis / Update</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Kelola versi app — user otomatis dapat notif update
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary text-xs"
        >
          <Plus className="w-3 h-3" /> Rilis Baru
        </button>
      </div>

      {/* Form Add */}
      {showForm && (
        <div className="mb-4 p-3 border border-slate-200 dark:border-slate-800 rounded-lg space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Versi *</label>
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                className="input"
                placeholder="0.12.3"
              />
            </div>
            <div>
              <label className="label">Version Code *</label>
              <input
                type="number"
                value={versionCode}
                onChange={(e) => setVersionCode(e.target.value)}
                className="input"
                placeholder={String((releases[0]?.version_code ?? 0) + 1)}
              />
              <p className="text-xs text-slate-500 mt-1">
                Harus unik &gt; {releases[0]?.version_code ?? 0}
              </p>
            </div>
          </div>
          <div>
            <label className="label">Link Download APK</label>
            <input
              type="url"
              value={downloadUrl}
              onChange={(e) => setDownloadUrl(e.target.value)}
              className="input"
              placeholder="https://github.com/kopen1/irkop-efbswitcher/releases/latest/download/efb-switcher-latest.apk"
            />
            <p className="text-xs text-slate-500 mt-1">
              Kosongkan untuk pakai link default (Releases GitHub)
            </p>
          </div>
          <div>
            <label className="label">Changelog</label>
            <textarea
              value={changelog}
              onChange={(e) => setChangelog(e.target.value)}
              className="input"
              rows={3}
              placeholder={'- Fix bug\n- Fitur baru'}
            />
          </div>
          {error && (
            <div className="text-sm text-danger bg-danger/10 border border-danger/20 rounded-md p-3">
              {error}
            </div>
          )}
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="btn-secondary text-xs">
              Batal
            </button>
            <button onClick={addRelease} disabled={saving} className="btn-primary text-xs">
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Publikasikan'}
            </button>
          </div>
        </div>
      )}

      {/* List Releases */}
      {releases.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">
          Belum ada rilis — user tidak akan dapat notif update
        </p>
      ) : (
        <div className="space-y-2">
          {releases.map((r) => (
            <div
              key={r.id}
              className={cn(
                'border rounded-lg p-3 flex items-center justify-between gap-3',
                r.is_latest
                  ? 'border-success/40 bg-success/5'
                  : 'border-slate-200 dark:border-slate-800'
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    v{r.version}
                  </span>
                  <span className="text-xs text-slate-400">#{r.version_code}</span>
                  {r.is_latest && (
                    <span className="text-xs px-2 py-0.5 rounded bg-success/15 text-success font-medium flex items-center gap-1">
                      <Star className="w-3 h-3" /> LATEST
                    </span>
                  )}
                </div>
                {r.changelog && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 whitespace-pre-line">
                    {r.changelog}
                  </p>
                )}
                {r.download_url && (
                  <a
                    href={r.download_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary flex items-center gap-1 mt-1 hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" /> Download link
                  </a>
                )}
              </div>
              <div className="flex flex-col gap-1">
                {!r.is_latest && (
                  <button
                    onClick={() => setLatest(r.id)}
                    disabled={saving}
                    className="text-xs px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-primary/10 hover:text-primary"
                    title="Jadikan versi terbaru"
                  >
                    Set Latest
                  </button>
                )}
                <button
                  onClick={() => deleteRelease(r.id, r.version)}
                  disabled={saving}
                  className="text-xs px-2 py-1 rounded bg-danger/10 text-danger hover:bg-danger hover:text-white"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 p-3 rounded-md bg-info/5 dark:bg-info/10 border border-info/20 text-xs text-slate-600 dark:text-slate-400">
        <strong className="text-info">Cara pakai:</strong> Setiap kali publish APK baru di
        GitHub Releases, tambahkan rilis baru di sini dengan version code yang lebih besar.
        Semua user akan lihat banner update di app.
      </div>
    </div>
  )
}
