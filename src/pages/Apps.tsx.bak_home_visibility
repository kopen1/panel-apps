import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Smartphone, Plus, Search, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/utils/formatters'
import NewAppModal from '@/components/modals/NewAppModal'

interface App {
  id: string
  name: string
  package_name: string
  description: string | null
  ads_enabled: boolean
  is_active: boolean
  created_at: string
}

export default function Apps() {
  const [apps, setApps] = useState<App[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)

  const fetchApps = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('apps')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error && data) setApps(data as App[])
    setLoading(false)
  }

  useEffect(() => {
    fetchApps()
  }, [])

  const filtered = apps.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.package_name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Apps</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Kelola semua aplikasi Android Irkop
          </p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> New App
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Cari app berdasarkan nama atau package…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input pl-10"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12 text-slate-500 dark:text-slate-400">
          <Smartphone className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
          Tidak ada app yang cocok.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((app) => (
            <Link
              key={app.id}
              to={`/apps/${app.id}`}
              className="card hover:border-primary transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">{app.name}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                      {app.package_name}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-1 items-end">
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      app.is_active
                        ? 'bg-success/10 text-success'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {app.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      app.ads_enabled
                        ? 'bg-warning/10 text-warning'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    Ads: {app.ads_enabled ? 'ON' : 'OFF'}
                  </span>
                </div>
              </div>
              {app.description && (
                <p className="mt-3 text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
                  {app.description}
                </p>
              )}
              <div className="mt-3 text-xs text-slate-400 dark:text-slate-500">
                Dibuat {formatDate(app.created_at)}
              </div>
            </Link>
          ))}
        </div>
      )}

      <NewAppModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={() => {
          setModalOpen(false)
          fetchApps()
        }}
      />
    </div>
  )
}
