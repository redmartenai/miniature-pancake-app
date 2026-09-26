import { formatInr } from '@/lib/format';

/** "₹1.86 Cr", "₹31.2 L", "₹42,500": Indian short money for headlines and chart labels. */
export function formatInrShort(value: string | number, digits = 1): string {
  const n = Number(value) || 0;
  const abs = Math.abs(n);
  if (abs >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `₹${(n / 1e5).toFixed(digits)} L`;
  return formatInr(n);
}

/** Lakh only ("₹186.0 L"), for sums compared side by side. */
export function formatLakh(value: string | number, digits = 1): string {
  return `₹${((Number(value) || 0) / 1e5).toFixed(digits)} L`;
}
