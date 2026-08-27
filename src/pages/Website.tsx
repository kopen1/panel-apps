import { useEffect, useMemo, useState } from 'react'
import { Globe2, Eye, Save, Image, Link2, ToggleLeft, ToggleRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Settings = {
  id: string
  site_name: string
  tagline: string | null
  description: string | null
  logo_url: string | null
  favicon_url: string | null
  seo_title: string | null
  seo_description: string | null
  is_published: boolean
}

type Section = {
  id: string
  section_key: string
  title: string | null
  subtitle: string | null
  content: string | null
  image_url: string | null
  button_text: string | null
  button_url: string | null
  is_enabled: boolean
  sort_order: number
}

const labels: Record<string,string> = {
  hero: 'Hero',
  apps: 'Aplikasi',
  about: 'Tentang',
  download: 'Download',
}

export default function Website() {
  const [settings,setSettings] = useState<Settings|null>(null)
  const [sections,setSections] = useState<Section[]>([])
  const [apps,setApps] = useState<any[]>([])
  const [loading,setLoading] = useState(true)
  const [saving,setSaving] = useState(false)
  const [preview,setPreview] = useState(false)
  const [error,setError] = useState('')
  const [message,setMessage] = useState('')

  const ordered = useMemo(() => [...sections].sort((a,b)=>a.sort_order-b.sort_order),[sections])

  useEffect(()=>{ void load() },[])

  async function load() {
    setLoading(true); setError('')
    const [a,b,c] = await Promise.all([
      supabase.from('website_settings').select('*').limit(1).maybeSingle(),
      supabase.from('website_sections').select('*').order('sort_order'),
      supabase.from('apps').select('id,name,package_name,description,is_active').eq('is_active',true).order('name'),
    ])
    if(a.error){setError(a.error.message);setLoading(false);return}
    if(b.error){setError(b.error.message);setLoading(false);return}
    if(c.error){setError(c.error.message);setLoading(false);return}
    setSettings(a.data as Settings); setSections((b.data??[]) as Section[]); setApps(c.data??[])
    setLoading(false)
  }

  const setting = <K extends keyof Settings>(key:K,value:Settings[K]) =>
    setSettings(s=>s ? {...s,[key]:value}:s)

  const section = (id:string, patch:Partial<Section>) =>
    setSections(xs=>xs.map(x=>x.id===id?{...x,...patch}:x))

  async function save() {
    if(!settings)return
    setSaving(true);setError('');setMessage('')
    const s = await supabase.from('website_settings').update({
      site_name:settings.site_name, tagline:settings.tagline, description:settings.description,
      logo_url:settings.logo_url, favicon_url:settings.favicon_url,
      seo_title:settings.seo_title, seo_description:settings.seo_description,
      is_published:settings.is_published, updated_at:new Date().toISOString()
    }).eq('id',settings.id)
    if(s.error){setError(s.error.message);setSaving(false);return}
    for(const x of sections){
      const r=await supabase.from('website_sections').update({
        title:x.title,subtitle:x.subtitle,content:x.content,image_url:x.image_url,
        button_text:x.button_text,button_url:x.button_url,is_enabled:x.is_enabled,
        sort_order:x.sort_order,updated_at:new Date().toISOString()
      }).eq('id',x.id)
      if(r.error){setError(`${x.section_key}: ${r.error.message}`);setSaving(false);return}
    }
    setSaving(false);setMessage('Website berhasil disimpan.');await load()
  }

  if(loading)return <div className="p-6 text-slate-500">Memuat Website CMS...</div>
  if(!settings)return <div className="p-6 text-red-500">website_settings belum tersedia. Jalankan SQL CMS terlebih dahulu.</div>

  if(preview)return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/90 p-4 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <b>Website Preview</b>
          <button onClick={()=>setPreview(false)} className="rounded-lg border border-white/15 px-4 py-2 text-sm">Kembali</button>
        </div>
      </div>
      {ordered.filter(x=>x.is_enabled).map(x=>(
        <section key={x.id} className="border-b border-white/10 px-6 py-20">
          <div className="mx-auto max-w-6xl">
            <div className="text-xs font-bold uppercase tracking-widest text-primary">{labels[x.section_key]??x.section_key}</div>
            <h1 className="mt-3 text-4xl font-black md:text-6xl">{x.title}</h1>
            {x.subtitle&&<p className="mt-5 text-xl text-slate-300">{x.subtitle}</p>}
            {x.content&&<p className="mt-5 max-w-3xl whitespace-pre-line leading-8 text-slate-400">{x.content}</p>}
            {x.button_text&&x.button_url&&<a href={x.button_url} className="mt-8 inline-block rounded-xl bg-primary px-5 py-3 font-semibold">{x.button_text}</a>}
            {x.image_url&&<img src={x.image_url} alt="" className="mt-8 max-h-72 rounded-2xl object-cover"/>}
            {x.section_key==='apps'&&<div className="mt-10 grid gap-5 md:grid-cols-3">{apps.map(a=><div key={a.id} className="rounded-2xl border border-white/10 bg-white/[.04] p-6"><b>{a.name}</b><p className="mt-2 text-sm text-slate-400">{a.description||a.package_name}</p></div>)}</div>}
          </div>
        </section>
      ))}
    </div>
  )

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div><div className="flex items-center gap-2"><Globe2 className="h-6 w-6 text-primary"/><h1 className="text-2xl font-bold">Website</h1></div><p className="mt-1 text-sm text-slate-500">Kelola landing page Irkop Central Hub.</p></div>
        <div className="flex gap-2">
          <button onClick={()=>setPreview(true)} className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm"><Eye className="h-4 w-4"/>Preview</button>
          <button onClick={()=>void save()} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><Save className="h-4 w-4"/>{saving?'Menyimpan...':'Simpan Semua'}</button>
        </div>
      </div>
      {message&&<div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div>}
      {error&&<div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <Card title="Site Settings">
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Nama Website" value={settings.site_name} onChange={v=>setting('site_name',v)}/>
          <Field label="Tagline" value={settings.tagline??''} onChange={v=>setting('tagline',v)}/>
          <Field label="Logo URL" value={settings.logo_url??''} onChange={v=>setting('logo_url',v)} icon={<Image className="h-4 w-4"/>}/>
          <Field label="Favicon URL" value={settings.favicon_url??''} onChange={v=>setting('favicon_url',v)} icon={<Image className="h-4 w-4"/>}/>
          <Field label="SEO Title" value={settings.seo_title??''} onChange={v=>setting('seo_title',v)}/>
          <Field label="SEO Description" value={settings.seo_description??''} onChange={v=>setting('seo_description',v)}/>
          <div className="md:col-span-2"><Area label="Deskripsi" value={settings.description??''} onChange={v=>setting('description',v)}/></div>
          <Toggle label="Website Published" enabled={settings.is_published} onClick={()=>setting('is_published',!settings.is_published)}/>
        </div>
      </Card>

      <div><h2 className="text-lg font-bold">Landing Page Sections</h2><p className="text-sm text-slate-500">Edit konten section dan urutannya.</p></div>
      {ordered.map(x=><Card key={x.id} title={labels[x.section_key]??x.section_key} right={<Toggle label="Aktif" enabled={x.is_enabled} onClick={()=>section(x.id,{is_enabled:!x.is_enabled})}/>}>
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Title" value={x.title??''} onChange={v=>section(x.id,{title:v})}/>
          <Field label="Subtitle" value={x.subtitle??''} onChange={v=>section(x.id,{subtitle:v})}/>
          <div className="md:col-span-2"><Area label="Content" value={x.content??''} onChange={v=>section(x.id,{content:v})}/></div>
          <Field label="Image URL" value={x.image_url??''} onChange={v=>section(x.id,{image_url:v})}/>
          <Field label="Button Text" value={x.button_text??''} onChange={v=>section(x.id,{button_text:v})}/>
          <Field label="Button URL" value={x.button_url??''} onChange={v=>section(x.id,{button_url:v})} icon={<Link2 className="h-4 w-4"/>}/>
          <Field label="Urutan" value={String(x.sort_order)} onChange={v=>section(x.id,{sort_order:Number(v)||0})}/>
        </div>
      </Card>)}

      <Card title="Aplikasi Aktif">
        <p className="text-sm text-slate-500">{apps.length} aplikasi aktif dibaca langsung dari tabel <b>apps</b>. Tidak ada duplikasi data.</p>
      </Card>
    </div>
  )
}

function Card({title,children,right}:{title:string;children:React.ReactNode;right?:React.ReactNode}) {
  return <section className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-surface"><div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-slate-800"><b>{title}</b>{right}</div><div className="p-5">{children}</div></section>
}
function Field({label,value,onChange,icon}:{label:string;value:string;onChange:(v:string)=>void;icon?:React.ReactNode}) {
  return <label className="block"><span className="mb-1.5 block text-sm font-medium">{label}</span><div className="relative">{icon&&<span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>}<input value={value} onChange={e=>onChange(e.target.value)} className={`w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-900 ${icon?'pl-9':''}`}/></div></label>
}
function Area({label,value,onChange}:{label:string;value:string;onChange:(v:string)=>void}) {
  return <label className="block"><span className="mb-1.5 block text-sm font-medium">{label}</span><textarea value={value} onChange={e=>onChange(e.target.value)} rows={4} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-900"/></label>
}
function Toggle({label,enabled,onClick}:{label:string;enabled:boolean;onClick:()=>void}) {
  return <button type="button" onClick={onClick} className="inline-flex items-center gap-2 text-sm font-medium">{enabled?<ToggleRight className="h-7 w-7 text-primary"/>:<ToggleLeft className="h-7 w-7 text-slate-400"/>}{label}</button>
}
