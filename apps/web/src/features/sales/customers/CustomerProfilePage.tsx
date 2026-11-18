import { useMemo } from 'react'
import { toast } from 'sonner'
import { RecordPage, type RecordPageState, type RecordTab, RecordTabPending } from '@/components/record-page/RecordPage'
import { useList, useUpsert } from '@/data/queries'
import type { Customer, CustomerShipTo } from '@/data/schemas'
import {
  type CustomerForm,
  applyCustomerForm,
  customerActivity,
  customerAging,
  customerDocuments,
  customerStatus,
  customerToForm,
  normalizeCustomerForm,
  toggleCustomerCreditHold,
  validateCustomerForm,
} from '@/domain/customer'
import { fmtDate, int, todayLocal } from '@/lib/format'
import { CustomerCreditTab } from './customer-tabs/CustomerCreditTab'
import { CustomerDetailsTab } from './customer-tabs/CustomerDetailsTab'
import { CustomerDocumentsTab } from './customer-tabs/CustomerDocumentsTab'
import { CustomerNotesTab } from './customer-tabs/CustomerNotesTab'
import { CustomerOrdersTab } from './customer-tabs/CustomerOrdersTab'
import { CustomerOverviewTab } from './customer-tabs/CustomerOverviewTab'
import { CustomerShippingTab } from './customer-tabs/CustomerShippingTab'
import { CustomerStatementTab } from './customer-tabs/CustomerStatementTab'

const BACK_TO = '/sales/customers'

/** Read-only facts shown alongside editable fields so view ↔ edit never shifts rows. */
export interface CustomerFacts {
  lastOrder: string
  openOrders: string
  customerSince: string
  currency: string
}

/** The page's form values: Overview + Billing & address fields plus read-only facts. */
export type CustomerDraft = CustomerForm & CustomerFacts

/** The ten tabs of the customer profile, in prototype order. */
const TABS: readonly RecordTab[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'details', label: 'Billing & address' },
  { id: 'prices', label: 'Sales prices' },
  { id: 'orders', label: 'Order history' },
  { id: 'statement', label: 'Statement & aging' },
  { id: 'shipping', label: 'Shipping addresses' },
  { id: 'notes', label: 'Notes & activity' },
  { id: 'docs', label: 'Documents' },
  { id: 'contacts', label: 'Contacts' },
  { id: 'credit', label: 'Credit & risk' },
]

const DETAILS_FIELDS = new Set(['city', 'state', 'gstin'])
const OVERVIEW_FIELDS = new Set(['terms', 'creditLimit', 'salesRep'])

const tabOfField = (key: string): string | undefined => {
  if (DETAILS_FIELDS.has(key)) return 'details'
  if (OVERVIEW_FIELDS.has(key)) return 'overview'
  return undefined
}

/** Sales ▸ Customers ▸ profile page. */
export function CustomerProfilePage({ no }: { no: string }) {
  const customers = useList('customers')
  const employees = useList('employees')
  const orders = useList('salesOrders')
  const invoices = useList('salesInvoices')
  const items = useList('items')
  const upsert = useUpsert('customers')
  const queries = [customers, employees, orders, invoices, items]

  const today = todayLocal()
  const record = customers.data?.find((c) => c.no === no) ?? null

  const activity = useMemo(
    () => (record ? customerActivity(record, orders.data ?? []) : []),
    [record, orders.data],
  )
  const documents = useMemo(
    () => (record ? customerDocuments(record, orders.data ?? [], invoices.data ?? [], items.data ?? []) : []),
    [record, orders.data, invoices.data, items.data],
  )
  const aging = useMemo(
    () => (record ? customerAging(record, invoices.data ?? [], today) : null),
    [record, invoices.data, today],
  )

  let state: RecordPageState = { kind: 'ready' }
  if (queries.some((q) => q.isError)) {
    state = {
      kind: 'error',
      message: 'Could not load this customer.',
      retry: () => queries.forEach((q) => void q.refetch()),
    }
  } else if (!queries.every((q) => q.data !== undefined)) {
    state = { kind: 'loading' }
  }

  const toDraft = (c: Customer): CustomerDraft => ({
    ...customerToForm(c),
    lastOrder: fmtDate(c.lastOrder),
    openOrders: int(c.openOrders || 0),
    customerSince: fmtDate(c.createdAt),
    currency: 'Workspace default',
  })

  const salesRepOptions = [
    { value: '', label: 'Unassigned' },
    ...(employees.data ?? [])
      .filter((e) => (e.dept === 'Sales' && e.status !== 'Terminated') || e.id === record?.salesRep)
      .map((e) => ({ value: e.id, label: e.name }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  ]

  const saveShipTo = async (c: Customer, shipTo: CustomerShipTo[]) => {
    await upsert.mutateAsync({ ...c, shipTo })
  }

  const toggleHold = async (c: Customer) => {
    const next = toggleCustomerCreditHold(c)
    try {
      await upsert.mutateAsync(next)
      toast(next.creditHold ? 'Credit hold turned on' : 'Credit hold removed', {
        description: `${c.no} · ${c.name}`,
      })
    } catch {
      toast('Could not update credit hold', { description: 'Check your connection and try again.' })
    }
  }

  return (
    <RecordPage<Customer, CustomerDraft>
      key={no}
      pageLabel="Customer"
      backTo={BACK_TO}
      backLabel="Back to customers"
      recordNo={no}
      state={state}
      record={record}
      notFoundText={`Customer ${no} was not found. It may have been deleted.`}
      header={(c, d) => ({
        title: d.name,
        no: c.no,
        status: customerStatus(c),
        tags: c.creditHold ? [{ label: 'Credit hold', tone: 'bad' as const }] : [],
        subtitle: [c.contact, c.city, c.terms].filter(Boolean).join('  ·  '),
      })}
      titleField="name"
      titleLabel="Customer name"
      tabs={TABS}
      toDraft={toDraft}
      normalize={normalizeCustomerForm}
      validate={(d) => validateCustomerForm(d)}
      tabOfField={tabOfField}
      save={async (d, c) => {
        const next = applyCustomerForm(c, d)
        await upsert.mutateAsync(next)
        return { title: 'Customer updated', description: `${next.no} · ${next.name}` }
      }}
    >
      {(ctx, tab) => {
        switch (tab.id) {
          case 'overview':
            return <CustomerOverviewTab ctx={ctx} activity={activity} salesRepOptions={salesRepOptions} />
          case 'details':
            return <CustomerDetailsTab ctx={ctx} />
          case 'orders':
            return <CustomerOrdersTab documents={documents} />
          case 'statement':
            return aging ? <CustomerStatementTab aging={aging} /> : null
          case 'shipping':
            return (
              <CustomerShippingTab
                customer={ctx.record}
                onSaveShipTo={(next) => saveShipTo(ctx.record, next)}
              />
            )
          case 'notes':
            return <CustomerNotesTab customerNo={ctx.record.no} activity={activity} />
          case 'docs':
            return <CustomerDocumentsTab />
          case 'credit':
            return (
              <CustomerCreditTab
                customer={ctx.record}
                onToggleHold={() => toggleHold(ctx.record)}
                toggling={upsert.isPending}
              />
            )
          default:
            return <RecordTabPending label={tab.label} />
        }
      }}
    </RecordPage>
  )
}
