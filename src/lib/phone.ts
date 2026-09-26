/** "9845034521" → "98450 34521" (Indian mobile numbers). */
export function formatMobile(digits: string): string {
  const d = digits.replace(/\D/g, '').slice(-10);
  return d.length > 5 ? `${d.slice(0, 5)} ${d.slice(5)}` : d;
}
