import type { HelpMap } from '@/components/help/types'

/** Settings ▸ Statuses & stages — quiet-help text (central Shared lists and module slices). */
export const STATUSES_HELP: HelpMap = {
  page: {
    title: 'Statuses & stages',
    body: 'The statuses each document moves through — purchase orders, goods receipts, sales orders and invoices, bills of materials and assembly orders. System statuses are the ones Shelfree’s own rules use and are locked; add custom stages of your own, such as Packed or Awaiting QC.',
    note: 'Documents still use the system statuses today; custom stages are listed here ahead of being offered on documents.',
  },
  flow: {
    title: 'Document',
    body: 'The document this status belongs to. Each document type belongs to one module, so the module follows from it.',
  },
  name: {
    title: 'Status',
    body: 'The name shown on the document and in grids. Unique within its document; 2–24 characters.',
  },
  category: {
    title: 'Type',
    body: 'Whether a document in this status is still being worked (Open) or finished (Closed). Reports count Open documents as pending.',
    options: [
      { value: 'open', label: 'Open', desc: 'Still being worked — counts as pending.' },
      { value: 'closed', label: 'Closed', desc: 'Finished — nothing more to do on the document.' },
    ],
  },
  tone: {
    title: 'Colour',
    body: 'The colour of the status pill. Status always shows colour with text, never colour alone.',
    options: [
      { value: 'neutral', label: 'Grey', desc: 'Not started or archived.' },
      { value: 'info', label: 'Blue', desc: 'Moving along as expected.' },
      { value: 'warn', label: 'Amber', desc: 'Partly done or needs attention.' },
      { value: 'ok', label: 'Green', desc: 'Done well.' },
      { value: 'bad', label: 'Red', desc: 'Cancelled, overdue or blocked.' },
    ],
  },
  order: {
    title: 'Order',
    body: 'Where the status sits in its document’s flow — 1 is first. Statuses are listed in this order.',
  },
  source: {
    title: 'Source',
    body: 'System statuses ship with Shelfree and are locked so its rules keep working. Custom statuses are yours to edit or delete.',
  },
}
