import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Loader2 } from 'lucide-react'

export default function ProtectedRoute() {
  const { profile, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-surface-dark">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!profile) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (!profile.is_active) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-surface-dark text-slate-700 dark:text-slate-300">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Akun Dinonaktifkan</h1>
          <p className="text-slate-500 dark:text-slate-400">Hubungi super admin untuk info lebih lanjut.</p>
        </div>
      </div>
    )
  }

  return <Outlet />
}
