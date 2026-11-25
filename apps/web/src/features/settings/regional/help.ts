import type { HelpMap } from '@/components/help/types'

/**
 * Settings ▸ Regional & format — quiet-help map. The prototype page carried ⓘ text for the page
 * and the Multi-currency row only (`q_reg_*`); the rest is written from `docs/regional/README.md`.
 */
export const REGIONAL_HELP: HelpMap = {
  page: {
    title: 'Regional & format',
    body: 'How money, numbers, dates and the financial year are shown and counted across the workspace. These are workspace-wide; each person’s own language and locale are in My preferences.',
  },
  money: {
    title: 'Currency & numbers',
    body: 'The currency your books are kept in and how large numbers are grouped.',
  },
  dates: {
    title: 'Dates & time',
    body: 'The time zone documents are stamped in, how dates read and which day a week starts on.',
  },
  fiscal: {
    title: 'Financial year',
    body: 'The month your financial year begins. It names the year in invoice numbers and is what the closing reports will total over.',
    note: 'In India the financial year runs April to March.',
  },
  currency: {
    title: 'Base currency',
    body: 'The currency your books are kept in. Every amount in Shelfree is shown in it.',
    note: 'Changing it does not convert existing amounts — change it only before you enter documents.',
  },
  numFmt: {
    title: 'Number format',
    body: 'How thousands and decimals are written. The Indian format groups lakhs and crores — 12,34,567.89.',
  },
  timezone: {
    title: 'Time zone',
    body: 'The zone used for “today”, due dates and the time shown on documents.',
  },
  dateFmt: {
    title: 'Date format',
    body: 'How dates are written on screens and printed documents.',
  },
  weekStart: {
    title: 'Week starts on',
    body: 'The first day of the week in calendars and weekly reports.',
  },
  fiscalStart: {
    title: 'Fiscal year starts',
    body: 'The first month of your financial year. April gives years like 2026-27, which appear in GST invoice numbers when the prefix contains {FY}.',
    note: 'Changing it moves the financial year label on new invoice numbers; numbers already issued keep theirs.',
  },
}
