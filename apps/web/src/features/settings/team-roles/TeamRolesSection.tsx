import { Link } from '@tanstack/react-router'
import { useMemo } from 'react'
import { type ListEditor, ListPage } from '@/components/list-page/ListPage'
import { SettingsPage } from '@/components/settings/SettingsPage'
import { useList, useUpsert } from '@/data/queries'
import { accessSummary } from '@/domain/people'
import { ROLE_DESC_MAX, normalizeRoleDef, peopleLabel, roleEditBlock, roleHolders, validateRoleDef } from '@/domain/roles'
import { EM_DASH, fmtDate } from '@/lib/format'
import { PermissionsEditor } from '@/features/people/users/PermissionsEditor'
import { type RoleRow, teamRolesDataset, toRoleDef } from './dataset'
import { TEAM_ROLES_HELP as HELP } from './help'

const linkClass = 'text-primary hover:underline'

/** Who holds the role, each linking to the person in People ▸ Users. */
function Members({ role }: { role: RoleRow }) {
  return (
    <div className="mt-4">
      <div className="mb-1.5 text-[11px] font-semibold tracking-[0.05em] text-muted-foreground">MEMBERS</div>
      {role.members.length === 0 ? (
        <div className="text-[12.5px] text-muted-foreground">No one has this role yet.</div>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-1 p-0 text-[12.5px]">
          {role.members.map((m) => (
            <li key={m.id}>
              <Link to="/people/users" search={{ sel: m.id }} className={linkClass}>
                {m.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * Settings ▸ Workspace ▸ Team & roles (`/settings/ws-team`). The roles People ▸ Users offers, who holds
 * each, and the module access each starts a person with. Reads the same users and role definitions as
 * People ▸ Users — nothing is copied.
 */
export function TeamRolesSection({ readOnly = false }: { readOnly?: boolean } = {}) {
  const defs = useList('roleDefs')
  const users = useList('users')
  const upsert = useUpsert('roleDefs')

  const rows = useMemo<RoleRow[] | undefined>(() => {
    if (!defs.data || !users.data) return undefined
    const holders = roleHolders(users.data)
    const byRole = new Map<string, { id: string; name: string }[]>()
    for (const u of users.data) byRole.set(u.role, [...(byRole.get(u.role) ?? []), { id: u.id, name: u.name }])
    return defs.data.map((d) => ({
      ...d,
      people: holders.get(d.id)?.count ?? 0,
      members: byRole.get(d.id) ?? [],
    }))
  }, [defs.data, users.data])
  const dataset = useMemo(() => teamRolesDataset(), [])

  const editor: ListEditor<RoleRow> = {
    fields: () => [
      { key: 'id', label: 'Role', type: 'text', locked: true, hint: HELP.id.body },
      {
        key: 'desc',
        label: 'Description',
        type: 'area',
        maxLength: ROLE_DESC_MAX,
        placeholder: 'What this role is for.',
        hint: HELP.desc.body,
      },
    ],
    view: (r) => ({
      no: r.id,
      title: r.id,
      subtitle: r.desc || undefined,
      stats: [
        { value: String(r.people), label: 'People' },
        { value: accessSummary(r.perms), label: 'Module access' },
      ],
      notice: roleEditBlock(r) ?? undefined,
      facts: [
        { k: 'Holds the role', v: r.people === 0 ? 'No one yet' : peopleLabel(r.people) },
        { k: 'Last changed', v: r.updatedAt ? fmtDate(r.updatedAt.slice(0, 10)) : EM_DASH },
      ],
    }),
    blank: () => ({ id: '', desc: '', perms: {}, settings: {}, people: 0, members: [] }),
    editBlockedReason: (r) => roleEditBlock(r),
    normalize: (draft) => ({ ...draft, ...normalizeRoleDef(toRoleDef(draft)) }),
    validate: (draft) => validateRoleDef(toRoleDef(draft)),
    save: (record) => upsert.mutateAsync({ ...toRoleDef(record), updatedAt: new Date().toISOString() }),
    label: (r) => r.id,
    extra: (r) => (
      <>
        <PermissionsEditor
          perms={r.perms}
          settings={r.settings}
          editing={false}
          title="PERMISSIONS BY MODULE"
        />
        <Members role={r} />
      </>
    ),
    extraEdit: (draft, _mode, onChange, errors) => (
      <>
        <PermissionsEditor
          perms={draft.perms}
          settings={draft.settings}
          editing
          onChange={onChange}
          title="PERMISSIONS BY MODULE"
        />
        {errors.perms && (
          <p role="alert" className="m-0 mt-2 text-[12px] text-bad-fg">
            {errors.perms}
          </p>
        )}
        <Members role={draft} />
      </>
    ),
  }

  return (
    <SettingsPage title="Team & roles" help={HELP.page} count={rows?.length} flush readOnly={readOnly}>
      <ListPage<RoleRow>
        embedded
        readOnly={readOnly}
        dataset={dataset}
        rows={rows}
        isLoading={defs.isLoading || users.isLoading}
        error={defs.error ?? users.error}
        onRefresh={() => Promise.all([defs.refetch(), users.refetch()])}
        editor={editor}
        noCreate
        emptyText="No roles."
      />
    </SettingsPage>
  )
}
