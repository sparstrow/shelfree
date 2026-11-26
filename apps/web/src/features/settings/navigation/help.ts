import type { HelpMap } from '@/components/help/types'

/** Settings ▸ Navigation — quiet-help text (prototype `q.nav.*`). Keys: `page`, group id, row keys. */
export const NAVIGATION_HELP: HelpMap = {
  page: {
    title: 'Navigation',
    body: 'The sidebar is the fast path to the pages someone uses every day. The Departments page is the complete one — every page in the workspace on a single screen, for finding what you have never opened.',
  },
  pages: {
    title: 'Departments page',
    body: 'How people find pages they have not opened before.',
  },
  departments: {
    title: 'Departments page',
    body: 'Every page, grouped by department. Turning it off removes the sidebar entry and sends its address to the landing page.',
  },
  jumpBackIn: {
    title: '“Jump back in” row',
    body: 'Each person’s own last five pages, above the directory. Also needs their personal recents preference on.',
  },
  showUnbuilt: {
    title: 'List pages that aren’t built yet',
    body: 'Unbuilt screens stay on the map, greyed out and tagged Coming soon, and still open their placeholder. Turn off to leave them out of the directory.',
  },
}
