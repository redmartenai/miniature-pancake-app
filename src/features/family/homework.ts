import type { TFunction } from 'i18next';

import type { Homework } from '@/api/types';
import { formatDate, isoDate } from '@/lib/format';
import type { Tone } from '@/theme/tokens';

export function dueText(item: Homework, t: TFunction): { text: string; tone: Tone } {
  if (item.submission) {
    if (item.submission.status === 'reviewed') return { text: t('homework.reviewed'), tone: 'success' };
    if (item.submission.status === 'redo') return { text: t('homework.redo'), tone: 'warning' };
    return { text: t('homework.submitted'), tone: 'info' };
  }
  const today = isoDate(new Date());
  const tomorrow = isoDate(new Date(Date.now() + 86_400_000));
  if (item.due_date < today) return { text: t('homework.overdue'), tone: 'danger' };
  if (item.due_date === today) return { text: t('homework.dueToday'), tone: 'warning' };
  if (item.due_date === tomorrow) return { text: t('homework.dueTomorrow'), tone: 'accent' };
  return { text: t('homework.due', { date: formatDate(item.due_date, { weekday: true }) }), tone: 'neutral' };
}
