import type { HelpMap } from '@/components/help/types'

/** Settings ▸ Favorites & views (workspace) — quiet-help text (prototype `q.cfgfav.*`). Keys: `page`, group id, row keys. */
export const FAVORITES_VIEWS_HELP: HelpMap = {
  page: {
    title: 'Favorites & views',
    body: 'Workspace-wide setup for pinned pages and saved views. Each person still manages their own pins under My settings.',
  },
  pins: {
    title: 'Pinned pages',
    body: 'Whether the workspace uses pins, and how many show before “Show all”.',
  },
  enabled: {
    title: 'Pinned sidebar section',
    body: 'Turn off to remove the Favorites section and the star buttons for everyone. Nobody’s pins are deleted — they come back when you turn it on.',
  },
  cap: {
    title: 'Pins shown before “Show all”',
    body: 'Extra pins stay one click away rather than being refused. A whole number from 3 to 30.',
  },
  views: {
    title: 'Saved views',
    body: 'Rules for views that more than one person can use.',
  },
  shareRole: {
    title: 'Who can share a view with the team',
    body: 'Shared views are not live yet — today every saved view is private to the person who made it. This is the rule that will apply when sharing ships.',
    options: [
      { value: 'admin', label: 'Owner & admins', desc: 'The owner and admins can publish a view for the whole team.' },
      { value: 'owner', label: 'Owner only', desc: 'Only the owner can publish a view for the whole team.' },
      { value: 'any', label: 'Anyone on the team', desc: 'Every team member can publish their own views.' },
    ],
  },
}
