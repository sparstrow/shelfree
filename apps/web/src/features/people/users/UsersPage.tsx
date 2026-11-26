import { Link, getRouteApi } from '@tanstack/react-router'
import { Ban, CheckCircle2, Mail, ShieldCheck, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { type ListAction, type ListBulkAction, ListPage } from '@/components/list-page/ListPage'
import type { EditorField } from '@/components/record-fields/model'
import { useList, useRemove, useUpsert } from '@/data/queries'
import { useMe } from '@/data/queries/session'
import type { RoleDef, User } from '@/data/schemas'
import {
  USER_ROLES,
  USER_STATUSES,
  type UserStatus,
  accessSummary,
  blankUser,
  formatLastActive,
  normalizeUser,
  roleDefaultPerms,
  roleDefaultSettings,
  userDeleteBlocked,
  userStatusTransitionError,
  validateUser,
} from '@/domain/people'
import { makeUsersDataset } from './dataset'
import { PermissionsEditor } from './PermissionsEditor'

const route = getRouteApi('/people/users/')

/** A person's module permissions — the shared editor, with "Apply <role> defaults" from the role definitions. */
function UserPermissionsSection({
  user,
  editing,
  roleDefs,
  onChange,
}: {
  user: User
  editing: boolean
  roleDefs: readonly RoleDef[]
  onChange?: (key: keyof User & string, value: unknown) => void
}) {
  return (
    <PermissionsEditor
      perms={user.perms}
      settings={user.settings}
      editing={editing}
      onChange={onChange}
      applyDefaults={{
        label: `Apply ${user.role} defaults`,
        run: () => {
          const nextPerms = roleDefaultPerms(user.role, roleDefs)
          onChange?.('perms', nextPerms)
          onChange?.('settings', roleDefaultSettings(user.role, nextPerms, roleDefs))
        },
      }}
    />
  )
}

export function UsersPage({ initialActiveId = null }: { initialActiveId?: string | null }) {
  const { sel } = route.useSearch()
  const users = useList('users')
  const employees = useList('employees')
  // Role definitions (Settings ▸ Team & roles) give a role's default module access.
  const roleDefsQuery = useList('roleDefs')
  const roleDefs = useMemo(() => roleDefsQuery.data ?? [], [roleDefsQuery.data])
  const me = useMe()
  const save = useUpsert('users')
  const del = useRemove('users')
  const [bulkDeleting, setBulkDeleting] = useState<{ rows: User[]; clearSelection: () => void } | null>(null)

  const currentUserEmail = me.data?.email
  const empById = useMemo(() => new Map((employees.data ?? []).map((e) => [e.id, e])), [employees.data])
  const empNames = useMemo(() => new Map((employees.data ?? []).map((e) => [e.id, e.name])), [employees.data])
  const dataset = useMemo(() => makeUsersDataset(empNames), [empNames])

  const empOptions = useMemo(
    () => [
      { value: '', label: 'None' },
      ...(employees.data ?? []).map((e) => ({ value: e.id, label: `${e.name} (${e.dept})` })),
    ],
    [employees.data],
  )

  const fields = (mode: 'edit' | 'new'): EditorField<User>[] => [
    { key: 'id', label: 'User ID', type: 'text', mono: true, locked: true },
    { key: 'name', label: 'Full name', type: 'text', placeholder: 'e.g. Meera Devi' },
    {
      key: 'email',
      label: 'Email',
      type: 'text',
      placeholder: 'name@kanalora.example',
      copyable: true,
      hint: 'Sign-in address. Masked in the grid and exports, shown in full here.',
    },
    {
      key: 'role',
      label: 'Role',
      type: 'select',
      options: USER_ROLES,
      hint: mode === 'new' ? 'Sets default module permissions when creating a user.' : 'Role determines access expectations across modules.',
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: USER_STATUSES,
      locked: mode === 'new',
      hint: mode === 'new' ? 'New invites start Pending until the user signs in.' : undefined,
    },
    {
      key: 'twoFA',
      label: 'Two-factor auth',
      type: 'toggle',
      onText: 'Enabled',
      offText: 'Off',
      locked: mode === 'new',
      muted: (u) => !u.twoFA,
    },
    {
      key: 'empId',
      label: 'Linked employee',
      type: 'select',
      options: empOptions,
      display: (u) => (u.empId ? (empNames.get(u.empId) ?? u.empId) : 'None'),
      muted: (u) => !u.empId,
    },
  ]

  const setStatus = async (user: User, nextStatus: UserStatus, okTitle: string) => {
    const blocked = userStatusTransitionError(user, nextStatus, users.data ?? [], currentUserEmail)
    if (blocked) {
      toast.error('Action not allowed', { description: blocked })
      return
    }
    const prev = user
    const next = { ...user, status: nextStatus }
    try {
      await save.mutateAsync(next)
    } catch {
      toast.error('Could not update user', { description: 'Check your connection and try again.' })
      return
    }
    toast(okTitle, {
      description: `${user.id} · ${user.name}`,
      action: { label: 'Undo', onClick: () => void save.mutateAsync(prev) },
    })
  }

  const actions: ListAction<User>[] = [
    {
      label: 'Suspend user',
      icon: Ban,
      inDrawer: true,
      when: (u) => u.status === 'Active',
      run: (u) => void setStatus(u, 'Suspended', 'User suspended'),
    },
    {
      label: 'Reactivate',
      icon: ShieldCheck,
      inDrawer: true,
      when: (u) => u.status === 'Suspended',
      run: (u) => void setStatus(u, 'Active', 'User reactivated'),
    },
    {
      label: 'Resend invite',
      icon: Mail,
      inDrawer: true,
      when: (u) => u.status === 'Pending',
      run: (u) => toast('Invite resent', { description: `${u.name} · ${u.email}` }),
    },
  ]

  const runBulkStatus = async (selectedRows: User[], nextStatus: UserStatus, clearSelection: () => void) => {
    const all = users.data ?? []
    const eligible: User[] = []
    let skipped = 0
    for (const row of selectedRows) {
      if (row.status === nextStatus) continue
      if (userStatusTransitionError(row, nextStatus, all, currentUserEmail)) {
        skipped += 1
        continue
      }
      eligible.push(row)
    }
    if (eligible.length === 0) {
      toast.error('No users updated', {
        description: skipped > 0 ? 'Protected users (signed-in user or last active Admin) cannot be suspended.' : `Selected users are already ${nextStatus.toLowerCase()}.`,
      })
      return
    }
    try {
      await Promise.all(eligible.map((row) => save.mutateAsync({ ...row, status: nextStatus })))
    } catch {
      toast.error('Could not update selected users', { description: 'Check your connection and try again.' })
      return
    }
    clearSelection()
    toast(`${eligible.length} ${eligible.length === 1 ? 'user' : 'users'} set to ${nextStatus}`, {
      description: skipped > 0 ? `${skipped} protected user${skipped === 1 ? '' : 's'} skipped.` : undefined,
      action: {
        label: 'Undo',
        onClick: () => void Promise.all(eligible.map((prev) => save.mutateAsync(prev))),
      },
    })
  }

  const bulkActions: ListBulkAction<User>[] = [
    {
      label: 'Activate',
      icon: CheckCircle2,
      when: (rows) => rows.some((r) => r.status !== 'Active'),
      run: (rows, { clearSelection }) => runBulkStatus(rows, 'Active', clearSelection),
    },
    {
      label: 'Suspend',
      icon: Ban,
      when: (rows) => rows.some((r) => r.status !== 'Suspended'),
      run: (rows, { clearSelection }) => runBulkStatus(rows, 'Suspended', clearSelection),
    },
    {
      label: 'Delete',
      icon: Trash2,
      danger: true,
      run: (rows, { clearSelection }) => setBulkDeleting({ rows, clearSelection }),
    },
  ]

  const confirmBulkDelete = async () => {
    if (!bulkDeleting) return
    const { rows: selectedRows, clearSelection } = bulkDeleting
    setBulkDeleting(null)
    const all = users.data ?? []
    const deletable: User[] = []
    const reasons: string[] = []
    for (const row of selectedRows) {
      const reason = userDeleteBlocked(row, all, currentUserEmail)
      if (reason) reasons.push(reason)
      else deletable.push(row)
    }
    if (deletable.length === 0) {
      toast.error('Delete refused', { description: reasons[0] ?? 'Selected users cannot be deleted.' })
      return
    }
    try {
      await Promise.all(deletable.map((row) => del.mutateAsync(row.id)))
    } catch {
      toast.error('Could not delete selected users', { description: 'Check your connection and try again.' })
      return
    }
    clearSelection()
    toast(`${deletable.length} ${deletable.length === 1 ? 'user' : 'users'} deleted`, {
      description: reasons.length > 0 ? `${reasons.length} protected user${reasons.length === 1 ? '' : 's'} skipped.` : undefined,
      action: {
        label: 'Undo',
        onClick: () => void Promise.all(deletable.map((prev) => save.mutateAsync(prev))),
      },
    })
  }

  return (
    <>
      <ListPage<User>
        dataset={dataset}
        rows={users.data}
        isLoading={users.isLoading}
        error={users.error}
        onRefresh={() => users.refetch()}
        initialActiveId={initialActiveId ?? sel ?? null}
        topBarExtra={
          <Link
            to="/settings/$section"
            params={{ section: 'ws-team' }}
            className="hover-lift inline-flex h-[30px] flex-none items-center rounded-lg border border-border bg-transparent px-2.5 text-xs font-medium whitespace-nowrap text-muted-foreground no-underline transition-colors duration-[140ms] hover:bg-tint-12 hover:text-foreground"
          >
            Manage roles
          </Link>
        }
        actions={actions}
        bulkActions={bulkActions}
        remove={{
          blockedReason: (u) => userDeleteBlocked(u, users.data ?? [], currentUserEmail),
          describe: (u) => `${u.id} · ${u.name}`,
          note: 'Module permissions and sign-in access will be revoked.',
          run: (u) => del.mutateAsync(u.id),
          undo: (u) => void save.mutateAsync(u),
        }}
        editor={{
          blank: (rows) => blankUser(rows, undefined, roleDefs),
          onChange: (draft, key, mode) => {
            if (key === 'role' && mode === 'new') {
              const perms = roleDefaultPerms(draft.role, roleDefs)
              return { ...draft, perms, settings: roleDefaultSettings(draft.role, perms, roleDefs) }
            }
            return draft
          },
          normalize: normalizeUser,
          validate: (draft, others) => {
            const existing = (users.data ?? []).find((u) => u.id === draft.id) ?? null
            return validateUser(draft, others, { currentUserEmail, existing })
          },
          save: (record) => save.mutateAsync(record),
          label: (u) => `${u.id} · ${u.name}`,
          fields: (_draft, mode) => fields(mode),
          view: (u) => {
            const emp = u.empId ? empById.get(u.empId) : undefined
            return {
              no: u.id,
              status: u.status,
              title: u.name,
              subtitle: u.email,
              stats: [
                { value: u.role, label: 'Role' },
                { value: u.twoFA ? 'On' : 'Off', label: '2FA' },
                { value: formatLastActive(u.lastActive), label: 'Last active' },
              ],
              notice:
                u.status === 'Suspended'
                  ? 'Suspended user — sign-in is blocked until reactivated.'
                  : u.status === 'Pending'
                    ? 'Invite pending — user has not signed in yet.'
                    : undefined,
              facts: [
                { k: 'Department', v: emp ? emp.dept : 'External' },
                { k: 'Last active', v: formatLastActive(u.lastActive) },
                { k: 'Module access', v: accessSummary(u.perms) },
              ],
            }
          },
          extra: (u) => <UserPermissionsSection user={u} editing={false} roleDefs={roleDefs} />,
          extraEdit: (draft, _mode, onChange) => <UserPermissionsSection user={draft} editing={true} roleDefs={roleDefs} onChange={onChange} />,
        }}
      />
      <ConfirmDialog
        open={!!bulkDeleting}
        danger
        title={`Delete ${bulkDeleting?.rows.length ?? 0} selected users?`}
        description="Selected non-protected users will have their sign-in access and module permissions removed. You can undo this right after deleting."
        confirmLabel="Delete selected"
        onConfirm={confirmBulkDelete}
        onCancel={() => setBulkDeleting(null)}
      />
    </>
  )
}
