import type { TFunction } from 'i18next';

import type { PillTone } from '@/ui';

import type { AppCard } from './api';
import { clock, dayMonth, dowDayMonth } from './kit';

/** The status tag on an admissions card (and in its dialog): text and pill tone. */
export function tagText(t: TFunction, c: AppCard): { text: string; tone: PillTone } | null {
  const tag = c.tag;
  switch (tag.kind) {
    case 'call_back':
      return tag.date && tag.date <= new Date().toISOString().slice(0, 10)
        ? { text: t('console.people.adm.tag.callToday'), tone: 'warn' }
        : { text: t('console.people.adm.tag.callOn', { date: tag.date ? dowDayMonth(tag.date) : '' }), tone: 'warn' };
    case 'tour':
      return { text: t('console.people.adm.tag.tour', { date: tag.date ? dowDayMonth(tag.date) : '' }), tone: 'info' };
    case 'prospectus':
      return { text: t('console.people.adm.tag.prospectus'), tone: 'neutral' };
    case 'new':
      return { text: t('console.people.adm.tag.new'), tone: 'neutral' };
    case 'document_due':
      return { text: t('console.people.adm.tag.due', { what: tag.what }), tone: 'warn' };
    case 'form_fee_paid':
      return { text: t('console.people.adm.tag.formFee'), tone: 'ok' };
    case 'book_assessment':
      return { text: t('console.people.adm.tag.book'), tone: 'info' };
    case 'book_slot':
      return { text: t('console.people.adm.tag.bookSlot'), tone: 'warn' };
    case 'scored':
      return { text: t('console.people.adm.tag.scored', { score: tag.score, of: tag.out_of }), tone: 'info' };
    case 'slot':
      return { text: t('console.people.adm.tag.slot', { time: clock(tag.at) }), tone: 'info' };
    case 'verified':
      return { text: t('console.people.adm.tag.verified'), tone: 'ok' };
    case 'document_pending':
      return { text: t('console.people.adm.tag.pending', { what: tag.what }), tone: 'warn' };
    case 'reply_by':
      return { text: t('console.people.adm.tag.reply', { date: tag.date ? dayMonth(tag.date) : '' }), tone: 'warn' };
    case 'fee_due':
      return { text: t('console.people.adm.tag.feeDue', { date: tag.date ? dayMonth(tag.date) : '' }), tone: 'info' };
    case 'fee_paid':
      return { text: t('console.people.adm.tag.feePaid'), tone: 'ok' };
    default:
      return null;
  }
}
