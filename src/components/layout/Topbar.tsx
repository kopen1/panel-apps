import { Menu, Moon, Sun, Monitor, LogOut } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/utils/cn'

export default function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { theme, setTheme } = useTheme()
  const { signOut, profile } = useAuth()

  const themes: Array<{
    value: 'dark' | 'light' | 'auto'
    icon: typeof Moon
    label: string
  }> = [
    { value: 'light', icon: Sun, label: 'Light' },
    { value: 'dark', icon: Moon, label: 'Dark' },
    { value: 'auto', icon: Monitor, label: 'Auto' },
  ]

  return (
    <header className="sticky top-0 z-20 h-16 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-surface-dark/80 backdrop-blur flex items-center justify-between px-4 sm:px-6">
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-md text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
        aria-label="Menu"
      >
        <Menu className="w-5 h-5" />
      </button>
      <div className="hidden sm:block text-sm text-slate-500 dark:text-slate-400">
        Selamat datang,{' '}
        <span className="text-slate-900 dark:text-slate-200 font-medium">
          {profile?.full_name || profile?.email}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-surface rounded-md p-1">
          {themes.map(({ value, icon: Icon, label }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              title={label}
              className={cn(
                'p-1.5 rounded transition-colors',
                theme === value
                  ? 'bg-primary text-white'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>
        <button
          onClick={signOut}
          className="p-2 rounded-md text-slate-700 dark:text-slate-300 hover:bg-danger hover:text-white transition-colors"
          title="Sign out"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  )
}
