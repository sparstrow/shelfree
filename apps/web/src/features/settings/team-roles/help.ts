import type { HelpMap } from '@/components/help/types'

/** Settings ▸ Team & roles — quiet-help text (prototype `q.team.*`). Keys: `page`, columns / fields. */
export const TEAM_ROLES_HELP: HelpMap = {
  page: {
    title: 'Team & roles',
    body: 'Roles define what each person can do. People are managed in People ▸ Users; this is where a role’s starting access is set.',
    note: 'Editing a role changes what it starts new people with. People who already have the role keep their own module access.',
  },
  id: {
    title: 'Role',
    body: 'The role name people carry in People ▸ Users. The built-in roles are fixed; their access and description can be changed.',
  },
  people: {
    title: 'People',
    body: 'How many users hold the role now (suspended users included).',
  },
  members: {
    title: 'Members',
    body: 'Who holds the role. Change a person’s role in People ▸ Users.',
  },
  desc: {
    title: 'Description',
    body: 'What the role is for, in a few words.',
  },
  perms: {
    title: 'Permissions by module',
    body: 'What the role can do in each module: none, read or write, and whether it manages that module’s settings. Applied when the role is chosen for a new person, or with “Apply role defaults” on a user.',
    note: 'Admin always has full access and can’t be reduced.',
  },
}
