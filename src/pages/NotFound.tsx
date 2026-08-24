import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-surface-dark text-center p-4">
      <div>
        <div className="text-6xl font-bold text-primary mb-4">404</div>
        <p className="text-slate-500 dark:text-slate-400 mb-6">Halaman tidak ditemukan.</p>
        <Link to="/" className="btn-primary">
          Kembali ke Dashboard
        </Link>
      </div>
    </div>
  )
}
