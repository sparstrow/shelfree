import type { HelpMap } from '@/components/help/types'

/** Settings ▸ Custom fields — quiet-help text (central Shared lists and module slices). */
export const CUSTOM_FIELDS_HELP: HelpMap = {
  page: {
    title: 'Custom fields',
    body: 'Extra fields your business wants on its records — a country of origin on items, a loyalty tier on customers, a licence date on vendors. Define the field here; each entity belongs to one module, so the module follows from it.',
    note: 'Fields are defined here ahead of being shown on records.',
  },
  entity: {
    title: 'Added to',
    body: 'The kind of record the field is added to. Fixed once created, so existing values keep their meaning.',
  },
  label: {
    title: 'Field',
    body: 'The label shown beside the value. Unique for the record type; 2–40 characters.',
  },
  type: {
    title: 'Type',
    body: 'What the field holds.',
    options: [
      { value: 'text', label: 'Text', desc: 'Free text up to a line or two.' },
      { value: 'number', label: 'Number', desc: 'A figure you can sort and total.' },
      { value: 'date', label: 'Date', desc: 'A calendar date.' },
      { value: 'list', label: 'List', desc: 'One choice from options you define.' },
      { value: 'yesno', label: 'Yes / No', desc: 'A simple switch.' },
    ],
  },
  optionsText: {
    title: 'Choices',
    body: 'The options a List field offers, separated by commas, in the order shown. At least two; duplicates are dropped.',
  },
  required: {
    title: 'Required',
    body: 'When on, a record can’t be saved without a value for this field.',
  },
  active: {
    title: 'Status',
    body: 'Inactive fields stay defined, with their values, but are hidden from new entry.',
  },
}
