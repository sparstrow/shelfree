import type { HelpMap } from '@/components/help/types'

/** Settings ▸ Number sequences — quiet-help map (central Shared lists and module slices). */
export const NUMBER_SEQUENCES_HELP: HelpMap = {
  page: {
    title: 'Number sequences',
    body: 'Controls the automatic numbers issued to new documents. Each document type has one default active series; add another series for a separate financial year, branch or GSTIN.',
    note: 'Once a series has issued a number it cannot be deleted — make it inactive instead so audit history stays intact.',
  },
  docType: {
    title: 'Document type',
    body: 'The kind of document this series numbers (purchase orders, goods receipts, invoices…). Locked once the series has issued a number.',
  },
  name: {
    title: 'Name',
    body: 'A short label to tell series apart, e.g. Purchase orders or Chennai POs.',
  },
  prefix: {
    title: 'Prefix',
    body: 'Fixed characters placed before the running number, e.g. PO or KPO-.',
  },
  digits: {
    title: 'Digits',
    body: 'Minimum width of the zero-padded running number (1 to 10). Numbers past the width keep growing without truncating.',
  },
  suffix: {
    title: 'Suffix',
    body: 'Optional characters placed after the running number, e.g. /26-27 for a financial year.',
  },
  next: {
    title: 'Next number',
    body: 'The counter value used for the next new document. Can only move upward so previously issued numbers are never reused.',
  },
  resets: {
    title: 'Resets',
    body: 'Whether the counter continues forever or resets each financial or calendar year.',
    options: [
      { value: 'never', label: 'Never', desc: 'Continuous running sequence with no yearly reset.' },
      { value: 'yearly-apr', label: 'Yearly (April)', desc: 'Resets on 1 April for the Indian financial year.' },
      { value: 'yearly-jan', label: 'Yearly (January)', desc: 'Resets on 1 January for the calendar year.' },
    ],
  },
  active: {
    title: 'Active',
    body: 'Inactive series stay for audit history and cannot issue new numbers. The default series must remain active.',
  },
  isDefault: {
    title: 'Default',
    body: 'The series used automatically when creating new documents of this type. Use Set as default to switch between active series.',
  },
}
