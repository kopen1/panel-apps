import { LucideIcon } from 'lucide-react'
import { cn } from '@/utils/cn'

interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'info'
}

const colorMap = {
  primary: 'text-primary bg-primary/10',
  success: 'text-success bg-success/10',
  warning: 'text-warning bg-warning/10',
  danger: 'text-danger bg-danger/10',
  info: 'text-info bg-info/10',
}

export default function StatCard({
  label,
  value,
  icon: Icon,
  color = 'primary',
}: StatCardProps) {
  return (
    <div className="card flex items-center gap-4">
      <div className={cn('p-3 rounded-lg', colorMap[color])}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <div className="text-2xl font-bold text-slate-900 dark:text-white">{value}</div>
        <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</div>
      </div>
    </div>
  )
}
