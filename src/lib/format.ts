/*
 * Dates, times and numbers. All "now" values come from the device clock in local time.
 * Local ISO strings look like "YYYY-MM-DDTHH:MM:SS"; API timestamps carry a zone ("…Z") and are converted.
 */

const pad = (n: number) => String(n).padStart(2, '0')

/** Local date as YYYY-MM-DD. */
export function isoDate(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Current local time as "YYYY-MM-DDTHH:MM:SS". */
export function nowIso(d: Date = new Date()): string {
  return `${isoDate(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

const hasZone = (s: string) => /(Z|[+-]\d{2}:?\d{2})$/.test(s)

export const toDate = (s: string) => new Date(s.length === 10 ? `${s}T00:00:00` : s)

/** Normalise an API timestamp (with zone) or a local ISO string to local "YYYY-MM-DDTHH:MM:SS". */
export function localIso(s: string): string {
  return hasZone(s) ? nowIso(new Date(s)) : s
}

export function hoursBetween(a: string, b: string) {
  return (toDate(b).getTime() - toDate(a).getTime()) / 3600e3
}

export function daysBetween(a: string, b: string) {
  return Math.round((toDate(localIso(b).slice(0, 10)).getTime() - toDate(localIso(a).slice(0, 10)).getTime()) / 864e5)
}

export function addDays(iso: string, n: number) {
  const d = toDate(iso.slice(0, 10))
  d.setDate(d.getDate() + n)
  return isoDate(d)
}

/** Monday of the week containing `iso`. */
export function startOfWeek(iso: string) {
  const d = toDate(iso.slice(0, 10))
  return addDays(iso, -((d.getDay() + 6) % 7))
}

/* ───────── formatting ───────── */

export const pct = (n: number, digits = 0) => `${(n * 100).toFixed(digits)}%`

/** "HH:MM" of a timestamp, in local time. Accepts "HH:MM[:SS]" times of day as-is. */
export function time(s: string) {
  if (/^\d{2}:\d{2}/.test(s)) return s.slice(0, 5)
  return localIso(s).slice(11, 16)
}

export function dateLabel(s: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) {
  return toDate(localIso(s)).toLocaleDateString('en-IN', opts)
}
export const weekday = (s: string) => toDate(localIso(s)).toLocaleDateString('en-IN', { weekday: 'long' })

/** "now", "12 min ago", "3 h ago", "Yesterday", "4 Oct" */
export function ago(s: string, now = nowIso()) {
  const at = localIso(s)
  const mins = Math.round(hoursBetween(at, now) * 60)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins} min ago`
  if (mins < 60 * 24 && at.slice(0, 10) === now.slice(0, 10)) return `${Math.round(mins / 60)} h ago`
  const d = daysBetween(at, now)
  if (d === 1) return 'Yesterday'
  if (d < 7) return `${d} days ago`
  return dateLabel(at)
}

export const initials = (name: string) =>
  name.replace(/^(Mr|Ms|Mrs|Dr)\.\s*/, '').split(/\s+/).filter(Boolean).map(p => p[0]).slice(0, 2).join('').toUpperCase() || '?'

export const firstName = (name: string) => name.replace(/^(Mr|Ms|Mrs|Dr)\.\s*/, '').split(' ')[0]

export const greeting = (now = nowIso()) => {
  const h = Number(now.slice(11, 13))
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

export const monthLabel = (ym: string) => toDate(`${ym}-01`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/** "HH:MM" → minutes after midnight. */
export const toMin = (hm: string) => Number(hm.slice(0, 2)) * 60 + Number(hm.slice(3, 5))

export const minsUntil = (from: string, to: string) => {
  const m = toMin(to) - toMin(from)
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m} min`
}

/** Title-case an API enum value: "half_day" → "Half day". */
export const humanize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ') : s)
