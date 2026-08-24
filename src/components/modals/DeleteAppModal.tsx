import { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import { supabase } from '@/lib/supabase'
import { Loader2, Trash2, AlertTriangle } from 'lucide-react'
import { cn } from '@/utils/cn'

interface App {
  id: string
  name: string
  package_name: string
}

interface DeleteAppModalProps {
  open: boolean
  onClose: () => void
  app: App | null
  onDeleted: () => void
}

export default function DeleteAppModal({ open, onClose, app, onDeleted }: DeleteAppModalProps) {
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setConfirmText('')
      setError('')
    }
  }, [open])

  const isMatch = app && confirmText.trim().toLowerCase() === app.package_name.toLowerCase()

  const handleDelete = async () => {
    if (!app || !isMatch) return
    setLoading(true)
    setError('')

    const { error: delError } = await supabase
      .from('apps')
      .delete()
      .eq('id', app.id)

    if (delError) {
      setError(delError.message)
    } else {
      onDeleted()
    }
    setLoading(false)
  }

  return (
    <Modal open={open} onClose={onClose} title="Hapus App">
      {app && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-md bg-danger/10 border border-danger/20">
            <AlertTriangle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-danger mb-1">PERINGATAN!</p>
              <p className="text-slate-700 dark:text-slate-300">
                Anda akan menghapus <strong>{app.name}</strong> ({app.package_name}).
                Semua data berikut akan ikut terhapus permanen:
              </p>
              <ul className="mt-2 ml-4 list-disc text-slate-700 dark:text-slate-300">
                <li>Konfigurasi ads slots (3 slot)</li>
                <li>Semua user yang terdaftar di app ini</li>
                <li>Statistik iklan (impressions, clicks, revenue)</li>
                <li>Riwayat versi APK</li>
              </ul>
            </div>
          </div>

          <div>
            <label className="label">
              Ketik <code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-primary">{app.package_name}</code> untuk konfirmasi
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="input font-mono"
              placeholder={app.package_name}
              autoFocus
            />
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
            <button
              onClick={handleDelete}
              disabled={!isMatch || loading}
              className={cn(
                'btn',
                isMatch
                  ? 'bg-danger text-white hover:bg-danger/90'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
              )}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              Hapus Permanen
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
