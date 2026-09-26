import { formatInr } from '@/lib/format';

/** Indian short money: ₹1.86 Cr, ₹31.2 L, ₹42,500 (under a lakh stays exact). */
export function inrShort(value: string | number, digits?: number): string {
  const n = Number(value) || 0;
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(digits ?? 2)} Cr`;
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(digits ?? 1)} L`;
  return formatInr(n);
}

/** 1248 → "1,248" (Indian grouping). */
export function num(value: number): string {
  return value.toLocaleString('en-IN');
}

/** "Dr. Anita Rao" → "Dr. Rao"; "Anita Rao" → "Anita". */
export function salutation(name: string): string {
  const title = /^(Dr|Mr|Ms|Mrs|Prof)\.?\s+/i.exec(name);
  const parts = name.replace(/^(Dr|Mr|Ms|Mrs|Prof)\.?\s+/i, '').split(' ');
  return title ? `${title[1]}. ${parts[parts.length - 1]}` : parts[0];
}
