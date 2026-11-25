import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { useMemo } from 'react'
import { toast } from 'sonner'
import { type ListPreview, ListPage } from '@/components/list-page/ListPage'
import { useCollectionDelete } from '@/components/list-page/use-collection-delete'
import { NotesBlock } from '@/components/notes/NotesBlock'
import { useBulkRemove, useBulkUpsert, useDuplicateCustomers, useList } from '@/data/queries'
import type { Customer } from '@/data/schemas'
import { pluralNoun } from '@/domain/bulk-actions'
import { customerDeleteBlockedReason, customerLocation, customerStatus } from '@/domain/customer'
import { EM_DASH, fmtDate, int, money } from '@/lib/format'
import { customerDataset } from './dataset'

const route = getRouteApi('/sales/customers/')

/** Sales ▸ Customers. */
export function CustomersPage() {
  const navigate = useNavigate()
  const { sel } = route.useSearch()
  const customers = useList('customers')
  const employees = useList('employees')
  const { mutateAsync: runDuplicate } = useDuplicateCustomers()
  const { mutateAsync: runBulkRemove } = useBulkRemove('customers')
  const { mutateAsync: runBulkUpsert } = useBulkUpsert('customers')

  const dataset = useMemo(
    () =>
      customerDataset({
        customers: customers.data ?? [],
        employees: employees.data ?? [],
      }),
    [customers.data, employees.data],
  )

  const empName = (id: string) => (employees.data ?? []).find((e) => e.id === id)?.name ?? ''

  const remove = useCollectionDelete<Customer>('customers', {
    blockedReason: customerDeleteBlockedReason,
    describe: (c) => `${c.no} · ${c.name}`,
  })

  const duplicate = async (selected: Customer[]): Promise<string[]> => {
    const res = await runDuplicate(selected.map((c) => c.no))
    const made = res.created.map((c) => c.no)
    if (made.length === 0) return []
    toast(`${pluralNoun(made.length, 'customer', 'customers')} duplicated`, {
      description: made.join(', '),
      action: { label: 'Undo', onClick: () => void runBulkRemove(made) },
    })
    return made
  }

  const preview = (c: Customer): ListPreview => {
    const overdue = c.overdue || 0

    return {
      ariaLabel: `Customer ${c.no}`,
      no: c.no,
      status: customerStatus(c),
      title: c.name,
      subtitle: customerLocation(c) || EM_DASH,
      stats: [
        { value: money(c.balance || 0), label: 'Balance' },
        { value: money(c.creditLimit || 0), label: 'Credit limit' },
        { value: money(overdue), label: 'Overdue', tone: overdue > 0 ? 'bad' : undefined },
      ],
      sections: [
        {
          heading: 'CONTACT',
          rows: [
            { k: 'Contact', v: c.contact || EM_DASH },
            { k: 'Phone', v: c.phone || EM_DASH },
            { k: 'Email', v: c.email || EM_DASH },
          ],
        },
      ],
      facts: [
        { k: 'Payment terms', v: c.terms || EM_DASH },
        { k: 'Credit limit', v: money(c.creditLimit || 0) },
        { k: 'Sales rep', v: empName(c.salesRep) || EM_DASH },
        { k: 'Last order', v: c.lastOrder || EM_DASH },
        { k: 'Open orders', v: int(c.openOrders || 0) },
        { k: 'Customer since', v: c.createdAt ? fmtDate(c.createdAt) : EM_DASH },
      ],
      // The customer's notes thread, as in the prototype's preview.
      children: (
        <div className="border-t border-border px-[14px] pt-3 pb-[14px]">
          <NotesBlock
            entityType="customer"
            entityNo={c.no}
            listMaxHeight={220}
            placeholder="Add a note about this customer… payment promises, festival rush, delivery notes."
          />
        </div>
      ),
    }
  }

  return (
    <ListPage
      dataset={dataset}
      rows={customers.data}
      isLoading={customers.isPending}
      error={customers.error}
      onRefresh={() => Promise.all([customers.refetch(), employees.refetch()])}
      recordPath={(c) => `/sales/customers/${c.no}`}
      openLabel="Open full profile"
      create={{
        label: 'New customer',
        run: () => void navigate({ to: '/sales/customers/$no', params: { no: 'new' } }),
      }}
      remove={remove}
      duplicate={duplicate}
      openInTabs
      bulkDelete={{
        run: (list) => runBulkRemove(list.map((c) => c.no)),
        undo: (list) => runBulkUpsert(list),
      }}
      preview={preview}
      initialActiveId={sel ?? null}
      emptyText="No customers yet. Use New customer to add the first one."
    />
  )
}
