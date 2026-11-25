import type { HelpMap } from '@/components/help/types'

/** Settings ▸ Terminology — quiet-help map (the prototype's `q_term_*` text, plus the editor fields). */
export const TERMINOLOGY_HELP: HelpMap = {
  page: {
    title: 'Terminology',
    body: 'Rename the words Shelfree uses so they match how your team talks — a Location can be a Store, a Vendor a Supplier. Renames show on sidebars, list titles, column headings and forms. Anything you leave alone keeps its original wording.',
    note: 'Renames are workspace-wide and only change labels, never the data behind them.',
  },
  groupName: {
    title: 'Group',
    body: 'Where the label is used: modules and navigation, the core records, favourites, or individual fields.',
  },
  origSingular: { title: 'Original', body: 'The wording Shelfree ships with. It stays here so you can always see what a label was.' },
  origPlural: { title: 'Original plural', body: 'The plural wording Shelfree ships with.' },
  singular: {
    title: 'Singular',
    body: 'Used on a single record, e.g. “Open location”. Leave it blank to keep the original.',
  },
  plural: {
    title: 'Plural',
    body: 'Used on list pages and titles, e.g. “Locations”. Leave it blank to keep the original.',
  },
  status: { title: 'Status', body: 'Renamed when you changed at least one wording of this label; Original otherwise.' },
}
