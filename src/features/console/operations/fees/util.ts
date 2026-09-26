import type { TFunction } from 'i18next';

/** "Term 1" / "Full year" in the viewer's language (falls back to the school's own term name). */
export function periodName(t: TFunction, p: { key: string; name: string }) {
  return ['term1', 'term2', 'year'].includes(p.key) ? t(`console.operations.fees.period.${p.key as 'term1'}`) : p.name;
}
