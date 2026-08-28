import { useEffect, useMemo, useState } from 'react'
import {
  Globe,
  Save,
  RefreshCw,
  Eye,
  Smartphone,
  Download,
  FileText,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  GripVertical,
  ExternalLink,
  LayoutDashboard,
  Settings2,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Config = Record<string, string>

type App = {
  id: string
  name: string
  package_name: string
  description: string | null
  is_active: boolean
}

type WebsiteStats = {
  total_visitors: number
  total_page_views: number
  total_downloads: number
  visitors_today: number
  page_views_today: number
  downloads_today: number
}

type Release = {
  id: string
  app_id: string | null
  version: string
  version_code: number
  download_url: string | null
  changelog: string | null
  is_latest: boolean
}

type Section = {
  key: string
  title: string
  configEnabled: string
  configOrder: string
}

type Tab = {
  key: string
  label: string
  icon: typeof LayoutDashboard
}

const DEFAULT_CONFIG: Config = {
  website_hero_title: 'Irkop Central Hub',
  website_hero_description:
    'Pusat aplikasi dan layanan digital Irkop.',
  website_hero_button_text: 'Lihat Aplikasi',
  website_hero_button_url: '#apps',

  website_about_title: 'Tentang Irkop',
  website_about_description:
    'Irkop Central Hub adalah pusat informasi dan distribusi aplikasi Irkop.',

  website_download_title: 'Download Aplikasi',
  website_download_description:
    'Download aplikasi Irkop melalui halaman resmi.',

  website_section_hero_enabled: 'true',
  website_section_hero_order: '10',

  website_section_apps_enabled: 'true',
  website_section_apps_order: '20',

  website_section_about_enabled: 'true',
  website_section_about_order: '30',

  website_section_download_enabled: 'true',
  website_section_download_order: '40',
}

const SECTIONS: Section[] = [
  {
    key: 'hero',
    title: 'Hero',
    configEnabled: 'website_section_hero_enabled',
    configOrder: 'website_section_hero_order',
  },
  {
    key: 'apps',
    title: 'Aplikasi',
    configEnabled: 'website_section_apps_enabled',
    configOrder: 'website_section_apps_order',
  },
  {
    key: 'about',
    title: 'Tentang',
    configEnabled: 'website_section_about_enabled',
    configOrder: 'website_section_about_order',
  },
  {
    key: 'download',
    title: 'Download',
    configEnabled: 'website_section_download_enabled',
    configOrder: 'website_section_download_order',
  },
]

const TABS: Tab[] = [
  {
    key: 'overview',
    label: 'Overview',
    icon: LayoutDashboard,
  },
  {
    key: 'structure',
    label: 'Structure',
    icon: Settings2,
  },
  {
    key: 'hero',
    label: 'Hero',
    icon: Globe,
  },
  {
    key: 'apps',
    label: 'Apps',
    icon: Smartphone,
  },
  {
    key: 'about',
    label: 'About',
    icon: FileText,
  },
  {
    key: 'downloads',
    label: 'Downloads',
    icon: Download,
  },
]

export default function Website() {
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG)
  const [apps, setApps] = useState<App[]>([])
  const [releases, setReleases] = useState<Release[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [activeTab, setActiveTab] = useState('overview')

  const [stats, setStats] = useState<WebsiteStats>({
    total_visitors: 0,
    total_page_views: 0,
    total_downloads: 0,
    visitors_today: 0,
    page_views_today: 0,
    downloads_today: 0,
  })

  async function load() {
    setLoading(true)
    setMessage('')

    const [
      configResult,
      appsResult,
      releasesResult,
      statsResult,
    ] = await Promise.all([
      supabase
        .from('global_config')
        .select('key, value'),

      supabase
        .from('apps')
        .select(
          'id, name, package_name, description, is_active'
        )
        .eq('is_active', true)
        .order('name'),

      supabase
        .from('app_releases')
        .select(
          'id, app_id, version, version_code, download_url, changelog, is_latest'
        )
        .eq('is_latest', true)
        .order('created_at', {
          ascending: false,
        }),

      supabase
        .from('v_website_stats')
        .select(
          'total_visitors, total_page_views, total_downloads, visitors_today, page_views_today, downloads_today'
        )
        .maybeSingle(),
    ])

    const errors: string[] = []

    if (configResult.error) {
      errors.push(
        `config: ${configResult.error.message}`
      )
    } else {
      const next = { ...DEFAULT_CONFIG }

      for (const row of configResult.data ?? []) {
        if (row.key.startsWith('website_')) {
          next[row.key] = row.value
        }
      }

      setConfig(next)
    }

    if (appsResult.error) {
      errors.push(
        `apps: ${appsResult.error.message}`
      )
    } else {
      setApps(appsResult.data ?? [])
    }

    if (releasesResult.error) {
      errors.push(
        `releases: ${releasesResult.error.message}`
      )
    } else {
      setReleases(releasesResult.data ?? [])
    }

    if (statsResult.error) {
      errors.push(
        `stats: ${statsResult.error.message}`
      )
    } else if (statsResult.data) {
      setStats(statsResult.data)
    }

    if (errors.length > 0) {
      setMessage(`ERROR: ${errors.join(' | ')}`)
    }

    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  function updateConfig(
    key: string,
    value: string
  ) {
    setConfig((current) => ({
      ...current,
      [key]: value,
    }))
  }

  async function save() {
    setSaving(true)
    setMessage('')

    try {
      for (const [key, value] of Object.entries(config)) {
        const {
          data: existing,
          error: readError,
        } = await supabase
          .from('global_config')
          .select('key')
          .eq('key', key)
          .maybeSingle()

        if (readError) {
          throw readError
        }

        if (existing) {
          const { error } = await supabase
            .from('global_config')
            .update({ value })
            .eq('key', key)

          if (error) throw error
        } else {
          const { error } = await supabase
            .from('global_config')
            .insert({ key, value })

          if (error) throw error
        }
      }

      setMessage(
        'PASS: Semua konfigurasi Website berhasil disimpan.'
      )
    } catch (error) {
      const text =
        error instanceof Error
          ? error.message
          : 'Unknown error'

      setMessage(`ERROR: ${text}`)
    } finally {
      setSaving(false)
    }
  }

  function releaseForApp(appId: string) {
    return releases.find(
      (release) => release.app_id === appId
    )
  }

  const sortedSections = useMemo(
    () =>
      [...SECTIONS].sort(
        (a, b) =>
          Number(config[a.configOrder] || 0) -
          Number(config[b.configOrder] || 0)
      ),
    [config]
  )

  const statCards = [
    {
      label: 'Total Visitors',
      value: stats.total_visitors,
      icon: Eye,
    },
    {
      label: 'Total Page Views',
      value: stats.total_page_views,
      icon: BarChart3,
    },
    {
      label: 'Total Downloads',
      value: stats.total_downloads,
      icon: Download,
    },
    {
      label: 'Visitors Hari Ini',
      value: stats.visitors_today,
      icon: Eye,
    },
    {
      label: 'Page Views Hari Ini',
      value: stats.page_views_today,
      icon: BarChart3,
    },
    {
      label: 'Downloads Hari Ini',
      value: stats.downloads_today,
      icon: Download,
    },
  ]

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Globe className="h-6 w-6 text-primary" />

            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Website CMS
            </h1>
          </div>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Kelola landing page Irkop langsung dari Panel.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <a
            href="https://irkop.eu.org"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            <Eye className="h-4 w-4" />
            Lihat Website
            <ExternalLink className="h-3.5 w-3.5" />
          </a>

          <button
            onClick={load}
            disabled={loading || saving}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                loading ? 'animate-spin' : ''
              }`}
            />
            Refresh
          </button>

          <button
            onClick={save}
            disabled={saving || loading}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />

            {saving
              ? 'Menyimpan...'
              : 'Simpan Semua'}
          </button>
        </div>
      </div>

      {/* MESSAGE */}
      {message && (
        <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm dark:border-slate-800 dark:bg-surface">
          {message.startsWith('PASS') ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
          )}

          <span>{message}</span>
        </div>
      )}

      {/* TABS */}
      <div className="sticky top-0 z-20 -mx-1 rounded-xl border border-slate-200 bg-white/95 p-1.5 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-surface/95">
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const active = activeTab === tab.key

            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                  active
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* OVERVIEW */}
      {activeTab === 'overview' && (
        <section className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-surface">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>

                <div>
                  <h2 className="font-semibold text-slate-900 dark:text-white">
                    Statistik Website
                  </h2>

                  <p className="text-xs text-slate-500">
                    Statistik website dari database secara realtime.
                  </p>
                </div>
              </div>

              <button
                onClick={load}
                disabled={loading || saving}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${
                    loading ? 'animate-spin' : ''
                  }`}
                />
                Refresh
              </button>
            </div>

            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map(
                  (item) => (
                    <div
                      key={item}
                      className="h-24 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800"
                    />
                  )
                )}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {statCards.map((stat) => {
                  const Icon = stat.icon

                  return (
                    <div
                      key={stat.label}
                      className="rounded-lg border border-slate-200 p-4 dark:border-slate-800"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>

                        <div>
                          <div className="text-xs text-slate-500">
                            {stat.label}
                          </div>

                          <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                            {stat.value.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-surface">
              <div className="text-xs text-slate-500">
                Status CMS
              </div>

              <div className="mt-2 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="font-semibold">
                  Connected
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-surface">
              <div className="text-xs text-slate-500">
                Aplikasi Aktif
              </div>

              <div className="mt-2 text-2xl font-bold">
                {apps.length.toLocaleString()}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-surface">
              <div className="text-xs text-slate-500">
                Latest Releases
              </div>

              <div className="mt-2 text-2xl font-bold">
                {releases.length.toLocaleString()}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* STRUCTURE */}
      {activeTab === 'structure' && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-surface">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <GripVertical className="h-5 w-5 text-primary" />
            </div>

            <div>
              <h2 className="font-semibold text-slate-900 dark:text-white">
                Struktur Landing Page
              </h2>

              <p className="text-xs text-slate-500">
                Aktifkan section dan tentukan urutan tampilnya.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {sortedSections.map((section) => {
              const enabled =
                config[section.configEnabled] !==
                'false'

              return (
                <div
                  key={section.key}
                  className="flex flex-col gap-3 rounded-lg border border-slate-200 p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <GripVertical className="h-5 w-5 text-slate-400" />

                    <div>
                      <div className="font-medium">
                        {section.title}
                      </div>

                      <div className="text-xs text-slate-500">
                        Section: {section.key}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={(e) =>
                          updateConfig(
                            section.configEnabled,
                            String(e.target.checked)
                          )
                        }
                        className="h-4 w-4 rounded"
                      />
                      Aktif
                    </label>

                    <label className="flex items-center gap-2 text-sm">
                      Urutan

                      <input
                        type="number"
                        min="1"
                        value={
                          config[
                            section.configOrder
                          ] ?? ''
                        }
                        onChange={(e) =>
                          updateConfig(
                            section.configOrder,
                            e.target.value
                          )
                        }
                        className="w-20 rounded-lg border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700"
                      />
                    </label>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* HERO */}
      {activeTab === 'hero' && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-surface">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Globe className="h-5 w-5 text-primary" />
            </div>

            <div>
              <h2 className="font-semibold text-slate-900 dark:text-white">
                Hero
              </h2>

              <p className="text-xs text-slate-500">
                Konten utama halaman depan.
              </p>
            </div>
          </div>

          <div className="grid gap-4">
            <label className="block">
              <span className="text-sm font-medium">
                Judul
              </span>

              <input
                value={config.website_hero_title}
                onChange={(e) =>
                  updateConfig(
                    'website_hero_title',
                    e.target.value
                  )
                }
                className="mt-1 w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium">
                Deskripsi
              </span>

              <textarea
                rows={5}
                value={
                  config.website_hero_description
                }
                onChange={(e) =>
                  updateConfig(
                    'website_hero_description',
                    e.target.value
                  )
                }
                className="mt-1 w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700"
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium">
                  Teks Tombol
                </span>

                <input
                  value={
                    config.website_hero_button_text
                  }
                  onChange={(e) =>
                    updateConfig(
                      'website_hero_button_text',
                      e.target.value
                    )
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium">
                  URL Tombol
                </span>

                <input
                  value={
                    config.website_hero_button_url
                  }
                  onChange={(e) =>
                    updateConfig(
                      'website_hero_button_url',
                      e.target.value
                    )
                  }
                  placeholder="#apps atau https://..."
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700"
                />
              </label>
            </div>
          </div>
        </section>
      )}

      {/* APPS */}
      {activeTab === 'apps' && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-surface">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Smartphone className="h-5 w-5 text-primary" />
            </div>

            <div>
              <h2 className="font-semibold text-slate-900 dark:text-white">
                Aplikasi
              </h2>

              <p className="text-xs text-slate-500">
                Data aplikasi aktif dari database.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="text-sm text-slate-500">
              Memuat aplikasi...
            </div>
          ) : apps.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700">
              Belum ada aplikasi aktif.
            </div>
          ) : (
            <div className="grid gap-3">
              {apps.map((app) => {
                const release =
                  releaseForApp(app.id)

                return (
                  <div
                    key={app.id}
                    className="rounded-lg border border-slate-200 p-4 dark:border-slate-800"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                          <Smartphone className="h-5 w-5" />
                        </div>

                        <div>
                          <div className="font-semibold">
                            {app.name}
                          </div>

                          <div className="text-xs text-slate-500">
                            {app.package_name}
                          </div>
                        </div>
                      </div>

                      {release ? (
                        <span className="w-fit rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-300">
                          Latest v{release.version}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500">
                          Belum ada release
                        </span>
                      )}
                    </div>

                    {app.description && (
                      <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
                        {app.description}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}

      {/* ABOUT */}
      {activeTab === 'about' && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-surface">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>

            <div>
              <h2 className="font-semibold text-slate-900 dark:text-white">
                Tentang
              </h2>

              <p className="text-xs text-slate-500">
                Informasi mengenai Irkop.
              </p>
            </div>
          </div>

          <div className="grid gap-4">
            <label className="block">
              <span className="text-sm font-medium">
                Judul
              </span>

              <input
                value={config.website_about_title}
                onChange={(e) =>
                  updateConfig(
                    'website_about_title',
                    e.target.value
                  )
                }
                className="mt-1 w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium">
                Deskripsi
              </span>

              <textarea
                rows={8}
                value={
                  config.website_about_description
                }
                onChange={(e) =>
                  updateConfig(
                    'website_about_description',
                    e.target.value
                  )
                }
                className="mt-1 w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700"
              />
            </label>
          </div>
        </section>
      )}

      {/* DOWNLOADS */}
      {activeTab === 'downloads' && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-surface">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Download className="h-5 w-5 text-primary" />
            </div>

            <div>
              <h2 className="font-semibold text-slate-900 dark:text-white">
                Download
              </h2>

              <p className="text-xs text-slate-500">
                Release terbaru aplikasi.
              </p>
            </div>
          </div>

          <div className="mb-5 grid gap-4">
            <label className="block">
              <span className="text-sm font-medium">
                Judul
              </span>

              <input
                value={
                  config.website_download_title
                }
                onChange={(e) =>
                  updateConfig(
                    'website_download_title',
                    e.target.value
                  )
                }
                className="mt-1 w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium">
                Deskripsi
              </span>

              <textarea
                rows={4}
                value={
                  config.website_download_description
                }
                onChange={(e) =>
                  updateConfig(
                    'website_download_description',
                    e.target.value
                  )
                }
                className="mt-1 w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700"
              />
            </label>
          </div>

          {loading ? (
            <div className="text-sm text-slate-500">
              Memuat release...
            </div>
          ) : releases.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700">
              Belum ada release terbaru.
            </div>
          ) : (
            <div className="space-y-3">
              {releases.map((release) => {
                const app = apps.find(
                  (item) =>
                    item.id === release.app_id
                )

                return (
                  <div
                    key={release.id}
                    className="rounded-lg border border-slate-200 p-4 dark:border-slate-800"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="font-semibold">
                          {app?.name ?? 'Aplikasi'}
                        </div>

                        <div className="mt-1 text-xs text-slate-500">
                          Version {release.version} · Code{' '}
                          {release.version_code}
                        </div>
                      </div>

                      {release.download_url ? (
                        <a
                          href={
                            release.download_url
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex w-fit items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:opacity-90"
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </a>
                      ) : (
                        <span className="text-xs text-slate-500">
                          URL download belum tersedia
                        </span>
                      )}
                    </div>

                    {release.changelog && (
                      <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-900">
                        <div className="mb-1 font-medium">
                          Changelog
                        </div>

                        <div className="whitespace-pre-line text-slate-600 dark:text-slate-400">
                          {release.changelog}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}

      {/* FOOTER STATUS */}
      <section className="rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />

          <div>
            <div className="font-medium">
              CMS terhubung ke data panel
            </div>

            <div className="mt-1 text-xs text-slate-500">
              Konten website menggunakan global_config.
              Daftar aplikasi menggunakan apps dan release terbaru
              menggunakan app_releases.
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}