import { getRouteApi } from '@tanstack/react-router'
import { useMemo, useRef } from 'react'
import type { Dataset } from '@/components/data-grid/model'
import { type ListEditor, ListPage } from '@/components/list-page/ListPage'
import { useCollectionDelete } from '@/components/list-page/use-collection-delete'
import type { Account } from '@/data/schemas'
import { useList, useUpsert } from '@/data/queries'
import {
  ACCOUNT_GROUPS,
  ACCOUNT_TYPES,
  ALL_ACCOUNT_GROUPS,
  accountDeleteBlocked,
  accountLead,
  accountNormalBalance,
  accountOnChange,
  accountPosting,
  accountRangeHint,
  accountSource,
  accountStatus,
  blankAccount,
  chargesUsingAccount,
  duplicateAccount,
  normalizeAccount,
  validateAccount,
} from '@/domain/chart-of-accounts'
import { EM_DASH, fmtDate } from '@/lib/format'

const route = getRouteApi('/finance/chart-of-accounts/')

function chartOfAccountsDataset(): Dataset<Account> {
  const raw = (a: Account, key: string): string => {
    switch (key) {
      case 'normal':
        return accountNormalBalance(a.type)
      case 'source':
        return accountSource(a)
      case 'status':
        return accountStatus(a)
      case 'directPosting':
        return accountPosting(a)
      default: {
        const v = a[key as keyof Account]
        return v == null ? '' : String(v)
      }
    }
  }
  const col = (key: string, label: string, width: number, extra: Partial<Dataset<Account>['columns'][number]> = {}) => ({
    key,
    label,
    width,
    min: Math.min(width, 80),
    visible: true,
    align: 'left' as const,
    type: 'text' as const,
    sortable: true,
    ...extra,
  })
  return {
    id: 'coa',
    noun: 'account',
    nounPlural: 'accounts',
    idOf: (a) => a.no,
    columns: [
      col('no', 'Code', 92, { frozen: 'left', type: 'mono', min: 72 }),
      col('name', 'Account name', 250, { min: 150 }),
      col('type', 'Type', 108),
      col('group', 'Group', 168),
      col('normal', 'Normal balance', 132),
      col('directPosting', 'Posting', 140),
      col('source', 'Source', 100, { type: 'pill' }),
      col('status', 'Status', 100, { type: 'pill' }),
      col('desc', 'Description', 320, { visible: false }),
    ],
    raw,
    text: (a, key) => raw(a, key) || EM_DASH,
    searchBlob: (a) =>
      [
        a.no,
        a.name,
        a.type,
        a.group,
        accountNormalBalance(a.type),
        accountSource(a),
        accountStatus(a),
        accountPosting(a),
        a.desc,
      ]
        .join(' \u0001 ')
        .toLowerCase(),
    views: [
      { id: 'all', name: 'All accounts', system: true, filters: [] },
      { id: 'assets', name: 'Assets', filters: [{ key: 'type', op: 'isAny', value: ['Asset'] }] },
      { id: 'liabilities', name: 'Liabilities', filters: [{ key: 'type', op: 'isAny', value: ['Liability'] }] },
      { id: 'expenses', name: 'Expenses', filters: [{ key: 'type', op: 'isAny', value: ['Expense'] }] },
      { id: 'custom', name: 'Custom accounts', filters: [{ key: 'source', op: 'isAny', value: ['Custom'] }] },
      { id: 'inactive', name: 'Inactive', filters: [{ key: 'status', op: 'isAny', value: ['Inactive'] }] },
    ],
    filterColumns: [
      { key: 'no', label: 'Code', type: 'text' },
      { key: 'name', label: 'Account name', type: 'text' },
      { key: 'type', label: 'Type', type: 'enum', options: [...ACCOUNT_TYPES] },
      { key: 'group', label: 'Group', type: 'enum', options: [...ALL_ACCOUNT_GROUPS] },
      { key: 'normal', label: 'Normal balance', type: 'enum', options: ['Debit', 'Credit'] },
      { key: 'directPosting', label: 'Posting', type: 'enum', options: ['Allowed', 'Documents only'] },
      { key: 'source', label: 'Source', type: 'enum', options: ['System', 'Custom'] },
      { key: 'status', label: 'Status', type: 'enum', options: ['Active', 'Inactive'] },
      { key: 'desc', label: 'Description', type: 'text' },
    ],
    defaultSort: { key: 'no', dir: 'asc' },
  }
}

/** Finance ▸ Chart of Accounts — a reference list edited in the drawer. */
export function ChartOfAccountsPage() {
  const { sel } = route.useSearch()
  const accounts = useList('accounts')
  const charges = useList('charges')
  const save = useUpsert('accounts')
  const accts = useMemo(() => accounts.data ?? [], [accounts.data])
  const chgs = useMemo(() => charges.data ?? [], [charges.data])
  const dataset = useMemo(() => chartOfAccountsDataset(), [])
  const autoCodeRef = useRef(true)
  const label = (a: Account) => `${a.no || EM_DASH} · ${a.name || 'Untitled account'}`

  const remove = useCollectionDelete<Account>('accounts', {
    blockedReason: (a) => accountDeleteBlocked(a, chgs),
    describe: label,
  })

  const editor: ListEditor<Account> = {
    fields: (d) => {
      const locked = d.system
      return [
        {
          key: 'no',
          label: 'Code',
          type: 'text',
          mono: true,
          locked,
          placeholder: `${accountLead(d.type, d.group)}010`,
          hint: locked ? 'Locked — system account.' : `${d.type} codes use ${accountRangeHint(d.type)}.`,
        },
        { key: 'type', label: 'Type', type: 'select', options: ACCOUNT_TYPES, locked },
        { key: 'name', label: 'Account name', type: 'text', placeholder: 'e.g. Office stationery' },
        {
          key: 'group',
          label: 'Group',
          type: 'select',
          options: ACCOUNT_GROUPS[d.type] ?? [],
          locked,
          hint: 'Where it sits on the balance sheet or P&L.',
        },
        {
          key: 'desc',
          label: 'Description',
          type: 'area',
          placeholder: 'What gets posted here — helps the next person pick the right account.',
        },
        {
          key: 'directPosting',
          label: 'Posting',
          type: 'toggle',
          locked,
          onText: 'Manual posting allowed',
          offText: 'Documents only',
          hint: 'Documents only = control account: receipts and bills post here, never a manual G/L line.',
        },
        {
          key: 'active',
          label: 'Status',
          type: 'toggle',
          locked,
          onText: 'Active',
          offText: 'Inactive',
          hint: locked
            ? 'System accounts are always active.'
            : 'Inactive accounts keep their history but can’t be picked on new documents.',
        },
      ]
    },
    view: (a) => ({
      no: a.no || EM_DASH,
      status: accountStatus(a),
      tags: [accountSource(a)],
      title: a.name || 'Untitled account',
      subtitle: `${a.type} · ${a.group}`,
      notice: a.system
        ? 'System account — Shelfree posts here automatically. Code, type, group and posting are locked; you can rename it or edit the description.'
        : undefined,
      facts: [
        { k: 'Normal balance', v: accountNormalBalance(a.type) },
        { k: 'Source', v: accountSource(a) },
        { k: 'Used by charges', v: chargesUsingAccount(a.no, chgs).map((c) => c.no).join(', ') || EM_DASH },
        { k: 'Last changed', v: a.updatedAt ? fmtDate(a.updatedAt.slice(0, 10)) : EM_DASH },
      ],
    }),
    blank: (rows) => {
      autoCodeRef.current = true
      return blankAccount(rows)
    },
    duplicate: (a, rows) => {
      autoCodeRef.current = true
      return duplicateAccount(a, rows)
    },
    onChange: (d, key, mode) => {
      if (key === 'no') autoCodeRef.current = false
      return accountOnChange(d, key, {
        mode,
        accounts: accts,
        autoCode: autoCodeRef.current,
      })
    },
    normalize: normalizeAccount,
    validate: (d, others) => validateAccount(d, others, chgs),
    save: (a, mode) => {
      const now = new Date().toISOString()
      return save.mutateAsync({ ...a, createdAt: mode === 'new' || !a.createdAt ? now : a.createdAt, updatedAt: now })
    },
    label,
  }

  return (
    <ListPage
      dataset={dataset}
      rows={accounts.data}
      isLoading={accounts.isPending}
      error={accounts.error}
      onRefresh={() => Promise.all([accounts.refetch(), charges.refetch()])}
      remove={remove}
      editor={editor}
      initialActiveId={sel ?? null}
      emptyText="No accounts yet. Use New account to add one."
    />
  )
}
