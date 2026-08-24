export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return '0'
  return new Intl.NumberFormat('id-ID').format(n)
}

export function formatCurrency(n: number | null | undefined): string {
  if (n === null || n === undefined) return '$0'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(n)
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '-'
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

export function timeAgo(date: string | Date | null | undefined): string {
  if (!date) return '-'
  const d = typeof date === 'string' ? new Date(date) : date
  const diff = Date.now() - d.getTime()
  const sec = Math.floor(diff / 1000)
  const min = Math.floor(sec / 60)
  const hr = Math.floor(min / 60)
  const day = Math.floor(hr / 24)
  if (day > 0) return `${day} hari lalu`
  if (hr > 0) return `${hr} jam lalu`
  if (min > 0) return `${min} menit lalu`
  return 'baru saja'
}
