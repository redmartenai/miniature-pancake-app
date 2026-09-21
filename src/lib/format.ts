import i18n from '@/i18n';

/** Indian digit grouping: 1234567 -> 12,34,567. */
export function formatInr(value: string | number, withSymbol = true): string {
  const amount = Math.round(Number(value) || 0);
  const negative = amount < 0;
  const text = String(Math.abs(amount));
  let grouped = text;
  if (text.length > 3) {
    const head = text.slice(0, -3);
    const tail = text.slice(-3);
    grouped = `${head.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${tail}`;
  }
  return `${negative ? '-' : ''}${withSymbol ? '₹' : ''}${grouped}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function parseDate(value: string): Date {
  // "2026-09-30" is a calendar date: read it as local midnight, not UTC.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(value);
}

export function formatDate(value: string | Date, opts: { weekday?: boolean; year?: boolean } = {}): string {
  const date = typeof value === 'string' ? parseDate(value) : value;
  const parts = [`${date.getDate()} ${MONTHS[date.getMonth()]}`];
  if (opts.year) parts.push(String(date.getFullYear()));
  const text = parts.join(' ');
  return opts.weekday ? `${WEEKDAYS[date.getDay()]}, ${text}` : text;
}

export function formatTime(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const suffix = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${suffix}`;
}

/** "07:22" (24h, from the API) -> "7:22 AM". */
export function formatClock(hhmm: string | null | undefined): string {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${suffix}`;
}

export function isToday(date: Date): boolean {
  const now = new Date();
  return date.toDateString() === now.toDateString();
}

export function relativeTime(value: string): string {
  const date = new Date(value);
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 45) return i18n.t('time.justNow');
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return i18n.t('time.minutesAgo', { count: minutes });
  const hours = Math.round(minutes / 60);
  if (hours < 24 && isToday(date)) return i18n.t('time.hoursAgo', { count: hours });
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return i18n.t('time.yesterday');
  return formatDate(date);
}

/** ETA seconds -> "Arriving", "1 min", "12 min", "1 h 5 min". */
export function formatEta(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return '—';
  if (seconds < 45) return i18n.t('bus.arriving');
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return i18n.t('bus.minutes', { count: minutes });
  return i18n.t('bus.hoursMinutes', { hours: Math.floor(minutes / 60), minutes: minutes % 60 });
}

export function greetingKey(date = new Date()): 'greeting.morning' | 'greeting.afternoon' | 'greeting.evening' {
  const hour = date.getHours();
  if (hour < 12) return 'greeting.morning';
  if (hour < 17) return 'greeting.afternoon';
  return 'greeting.evening';
}

export function isoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function monthLabel(yearMonth: string): string {
  const [y, m] = yearMonth.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}
