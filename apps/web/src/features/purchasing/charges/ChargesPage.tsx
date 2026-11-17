import { getRouteApi } from '@tanstack/react-router'
import { useMemo } from 'react'
import type { Dataset } from '@/components/data-grid/model'
import { type ListEditor, ListPage } from '@/components/list-page/ListPage'
import { useCollectionDelete } from '@/components/list-page/use-collection-delete'
import type { Account, Charge } from '@/data/schemas'
import { useList, useUpsert } from '@/data/queries'
import {
  CHARGE_DIRECTIONS,
  CHARGE_GST_RATES,
  accountOptions,
  accountText,
  blankCharge,
  chargeBroken,
  chargeBuys,
  chargeDeleteBlocked,
  chargeLanded,
  chargeOnChange,
  chargeSells,
  chargeSource,
  chargeStatus,
  duplicateCharge,
  normalizeCharge,
  validateCharge,
} from '@/domain/charges'
import { EM_DASH, fmtDate } from '@/lib/format'

const route = getRouteApi('/purchasing/charges/')

function chargeDataset(accounts: readonly Account[]): Dataset<Charge> {
  const raw = (c: Charge, key: string): string => {
    switch (key) {
      case 'purchaseAcct':
        return chargeBuys(c.direction) ? accountText(accounts, c.purchaseAcct) : ''
      case 'salesAcct':
        return chargeSells(c.direction) ? accountText(accounts, c.salesAcct) : ''
      case 'landed':
        return chargeLanded(c)
      case 'source':
        return chargeSource(c)
      case 'status':
        return chargeStatus(c)
      default: {
        const v = c[key as keyof Charge]
        return v == null ? '' : String(v)
      }
    }
  }
  const col = (key: string, label: string, width: number, extra: Partial<Dataset<Charge>['columns'][number]> = {}) => ({
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
    id: 'charges',
    noun: 'charge',
    nounPlural: 'charges',
    idOf: (c) => c.no,
    columns: [
      col('no', 'Code', 100, { frozen: 'left', type: 'mono', min: 72 }),
      col('name', 'Description', 220, { min: 140 }),
      col('direction', 'Direction', 104),
      col('purchaseAcct', 'Purchase account', 230),
      col('salesAcct', 'Sales account', 210, { visible: false }),
      col('gst', 'GST', 104),
      col('sac', 'HSN/SAC', 104, { type: 'mono' }),
      col('landed', 'Landed cost', 150),
      col('source', 'Source', 100, { type: 'pill' }),
      col('status', 'Status', 100, { type: 'pill' }),
      col('desc', 'Notes', 320, { visible: false }),
    ],
    raw,
    text: (c, key) => raw(c, key) || EM_DASH,
    searchBlob: (c) =>
      [c.no, c.name, c.direction, raw(c, 'purchaseAcct'), raw(c, 'salesAcct'), c.gst, c.sac, chargeLanded(c), chargeSource(c), chargeStatus(c), c.desc]
        .join(' \u0001 ')
        .toLowerCase(),
    views: [
      { id: 'all', name: 'All charges', system: true, filters: [] },
      { id: 'purchase', name: 'Purchase', filters: [{ key: 'direction', op: 'isAny', value: ['Purchase', 'Both'] }] },
      { id: 'sales', name: 'Sales', filters: [{ key: 'direction', op: 'isAny', value: ['Sales', 'Both'] }] },
      { id: 'landed', name: 'Landed cost', filters: [{ key: 'landed', op: 'isAny', value: ['Allocated to items'] }] },
      { id: 'custom', name: 'Custom charges', filters: [{ key: 'source', op: 'isAny', value: ['Custom'] }] },
      { id: 'inactive', name: 'Inactive', filters: [{ key: 'status', op: 'isAny', value: ['Inactive'] }] },
    ],
    filterColumns: [
      { key: 'no', label: 'Code', type: 'text' },
      { key: 'name', label: 'Description', type: 'text' },
      { key: 'direction', label: 'Direction', type: 'enum', options: [...CHARGE_DIRECTIONS] },
      { key: 'purchaseAcct', label: 'Purchase account', type: 'enum', options: accounts.filter((a) => a.type === 'Expense').map((a) => accountText(accounts, a.no)) },
      { key: 'salesAcct', label: 'Sales account', type: 'enum', options: accounts.filter((a) => a.type === 'Income').map((a) => accountText(accounts, a.no)) },
      { key: 'gst', label: 'GST', type: 'enum', options: [...CHARGE_GST_RATES] },
      { key: 'sac', label: 'HSN/SAC', type: 'text' },
      { key: 'landed', label: 'Landed cost', type: 'enum', options: ['Allocated to items', 'Expensed', 'Not applicable'] },
      { key: 'source', label: 'Source', type: 'enum', options: ['System', 'Custom'] },
      { key: 'status', label: 'Status', type: 'enum', options: ['Active', 'Inactive'] },
      { key: 'desc', label: 'Notes', type: 'text' },
    ],
    defaultSort: { key: 'no', dir: 'asc' },
  }
}

/** Purchasing ▸ Charges — a reference list edited in the drawer. */
export function ChargesPage() {
  const { sel } = route.useSearch()
  const charges = useList('charges')
  const accounts = useList('accounts')
  const save = useUpsert('charges')
  const accts = useMemo(() => accounts.data ?? [], [accounts.data])
  const dataset = useMemo(() => chargeDataset(accts), [accts])
  const label = (c: Charge) => `${c.no || EM_DASH} · ${c.name || 'Untitled charge'}`

  const remove = useCollectionDelete<Charge>('charges', { blockedReason: chargeDeleteBlocked, describe: label })

  const editor: ListEditor<Charge> = {
    fields: (d) => {
      const locked = d.system
      return [
        { key: 'no', label: 'Code', type: 'text', mono: true, locked, placeholder: 'e.g. CRATE', hint: locked ? 'Locked — system charge.' : 'Short code shown on document lines.' },
        { key: 'direction', label: 'Direction', type: 'select', options: CHARGE_DIRECTIONS, locked },
        { key: 'name', label: 'Description', type: 'text', placeholder: 'e.g. Wooden crate for kiln loads' },
        ...(chargeBuys(d.direction)
          ? [
              {
                key: 'purchaseAcct' as const,
                label: 'Purchase account',
                type: 'select' as const,
                options: accountOptions(accts, 'Expense', d.purchaseAcct),
                locked,
                display: (c: Charge) => accountText(accts, c.purchaseAcct),
                hint: locked ? 'Locked — freight policies post here.' : 'Expense account debited when this charge is on a purchase document.',
              },
            ]
          : []),
        ...(chargeSells(d.direction)
          ? [
              {
                key: 'salesAcct' as const,
                label: 'Sales account',
                type: 'select' as const,
                options: accountOptions(accts, 'Income', d.salesAcct),
                display: (c: Charge) => accountText(accts, c.salesAcct),
                hint: 'Income account credited when this charge is billed to a customer.',
              },
            ]
          : []),
        { key: 'gst', label: 'GST', type: 'select', options: CHARGE_GST_RATES, hint: 'Goods rate = taxed like the goods on the same document.' },
        { key: 'sac', label: 'HSN/SAC', type: 'text', mono: true, placeholder: '996511', hint: 'SAC for services, HSN for goods.' },
        ...(chargeBuys(d.direction)
          ? [
              {
                key: 'allocate' as const,
                label: 'Landed cost',
                type: 'toggle' as const,
                onText: 'Allocate to item lines',
                offText: 'Expense directly',
                hint: 'On = spread across the received item lines, so it lands in inventory value. Off = stays on the expense account.',
              },
            ]
          : []),
        { key: 'desc', label: 'Notes', type: 'area', placeholder: 'When to use this charge — helps the next person pick the right one.' },
        {
          key: 'active',
          label: 'Status',
          type: 'toggle',
          locked,
          onText: 'Active',
          offText: 'Inactive',
          hint: locked ? 'System charges are always active.' : 'Inactive charges keep their history but can’t be picked on new lines.',
        },
      ]
    },
    view: (c) => {
      const notices: string[] = []
      if (c.system) notices.push('System charge — freight lines generated from freight policies use it. Code, direction, account and status are locked.')
      if (chargeBroken(c, accts)) notices.push('Its posting account is missing or inactive — edit the charge and pick an active account before it’s used on a document.')
      return {
        no: c.no || EM_DASH,
        status: chargeStatus(c),
        tags: [chargeSource(c)],
        title: c.name || 'Untitled charge',
        subtitle: `${c.direction} · ${chargeLanded(c)}`,
        notice: notices.join(' ') || undefined,
        facts: [
          { k: 'Source', v: chargeSource(c) },
          { k: 'Last changed', v: c.updatedAt ? fmtDate(c.updatedAt.slice(0, 10)) : EM_DASH },
        ],
      }
    },
    blank: () => blankCharge(accts),
    duplicate: duplicateCharge,
    onChange: chargeOnChange,
    normalize: normalizeCharge,
    validate: (d, others) => validateCharge(d, others, accts),
    save: (c, mode) => {
      const now = new Date().toISOString()
      return save.mutateAsync({ ...c, createdAt: mode === 'new' || !c.createdAt ? now : c.createdAt, updatedAt: now })
    },
    label,
  }

  return (
    <ListPage
      dataset={dataset}
      rows={charges.data}
      isLoading={charges.isPending}
      error={charges.error}
      onRefresh={() => Promise.all([charges.refetch(), accounts.refetch()])}
      remove={remove}
      editor={editor}
      initialActiveId={sel ?? null}
      emptyText="No charges yet. Use New charge to add freight, packing or insurance."
    />
  )
}
