import type { HelpMap } from '@/components/help/types'

/** Settings ▸ Assembly & production — quiet-help text. Keys: `page`, group ids, row keys. */
export const ASSEMBLY_PRODUCTION_HELP: HelpMap = {
  page: {
    title: 'Assembly & production',
    body: 'How bills of materials behave and what happens to stock when an assembly order is finished.',
  },
  defaults: {
    title: 'Defaults',
    body: 'Applied to every new bill of materials and assembly order.',
  },
  behaviour: {
    title: 'Behaviour',
    body: 'The permissive options are on by default so a small shop is never blocked. Switch them off for tighter control.',
  },
  outputLoc: {
    title: 'Finished goods arrive at',
    body: 'The site a new assembly order delivers its finished goods to, and where components are taken from when released.',
  },
  defaultScrap: {
    title: 'Default scrap allowance %',
    body: 'The scrap percentage a new bill of materials line starts with, from 0 to 100. Each line can still be changed.',
  },
  wipLoc: {
    title: 'Work-in-progress location',
    body: 'Where stock sits while it is being assembled.',
  },
  manualConsumption: {
    title: 'Correct component quantities when finishing',
    body: 'Off means components are backflushed automatically from the bill of materials. On adds an editable consumption step to every finish.',
    options: [
      { value: 'false', label: 'Off', desc: 'Components are backflushed automatically from the bill of materials.' },
      { value: 'true', label: 'On', desc: 'Every finish asks you to confirm or correct the component quantities used.' },
    ],
  },
  allowShortRelease: {
    title: 'Allow release with shortages',
    body: 'Lets an order be released before every component is in stock — useful when a part arrives the same day.',
    options: [
      { value: 'true', label: 'On', desc: 'An order can be released while a component is short.' },
      { value: 'false', label: 'Off', desc: 'Release is blocked until every component is in stock.' },
    ],
  },
  allowOverConsume: {
    title: 'Allow consuming more than planned',
    body: 'Permits a finish that uses more of a component than the bill of materials called for, instead of blocking it.',
    options: [
      { value: 'true', label: 'On', desc: 'A finish may use more of a component than planned.' },
      { value: 'false', label: 'Off', desc: 'A finish that uses more than planned is blocked.' },
    ],
  },
}
