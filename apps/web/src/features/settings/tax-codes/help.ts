import type { HelpMap } from '@/components/help/types'

/** Settings ▸ Tax codes — quiet-help text (ported from the prototype's `tcHelpText()`). */
export const TAX_CODES_HELP: HelpMap = {
  page: {
    title: 'Tax codes',
    body: 'GST rates used on items, charges and documents. Rates are national — the same in every state; the document decides whether it splits into CGST + SGST or IGST. Each code keeps dated rates, so a government rate change never rewrites older documents.',
    note: 'Cess is not modelled. Special rates such as 1.5% or 0.25% can be added as codes.',
  },
  rate: {
    title: 'Rate',
    body: 'The rate in effect today; a scheduled change shows beside it with its start date. When the government changes a rate, open the code and add a dated rate. Rates already in effect are locked — documents dated before the change keep the old rate.',
  },
  from: { title: 'Effective from', body: 'The date today’s rate started.' },
  appliesTo: {
    title: 'Applies to',
    body: 'Limits where the code is offered — items and goods lines, services and charges, or both.',
  },
  charges: {
    title: 'Charges',
    body: 'How many additional charges (freight, packing and similar) use this code. A code in use can’t be deleted.',
  },
  code: {
    title: 'Code',
    body: 'Permanent once created — items and charges store it. Up to 12 characters, e.g. GST18.',
  },
  name: { title: 'Name', body: 'What people see in pickers, e.g. GST 18%.' },
  rates: {
    title: 'Rate history',
    body: 'Each row is a rate and the date it starts. Rows that started before today are locked — documents already use them. New rows must start today or later and after the last locked row. A code entered new can carry its earlier history.',
    note: 'The GOODS code has no rate: the line takes the rate of the goods on the same document.',
  },
  desc: { title: 'Description', body: 'What the code is for — shown to people choosing it.' },
  active: {
    title: 'Status',
    body: 'An inactive code is not offered for new lines; documents that already carry it keep it.',
    note: 'A code an active charge uses can’t be made inactive.',
  },
}
