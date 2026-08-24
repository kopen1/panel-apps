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
