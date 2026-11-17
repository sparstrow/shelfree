import type { Dataset } from '@/components/data-grid/model'
import { CUSTOMER_STATUSES, type Customer, type Employee } from '@/data/schemas'
import { customerLocation, customerStatus } from '@/domain/customer'
import { EM_DASH, int, money } from '@/lib/format'
import { maskPhone } from '@/lib/privacy'

export interface CustomerLookups {
  customers: readonly Customer[]
  employees: readonly Employee[]
}

/** The Customers grid definition (columns, views, filters, search). */
export function customerDataset({ customers, employees }: CustomerLookups): Dataset<Customer> {
  const empName = (id: string) => employees.find((e) => e.id === id)?.name ?? ''
  const salesReps = [...new Set(customers.map((c) => empName(c.salesRep)).filter(Boolean))].sort()

  return {
    id: 'customers',
    noun: 'customer',
    nounPlural: 'customers',
    idOf: (c) => c.no,
    columns: [
      { key: 'no', label: 'No.', width: 128, min: 90, frozen: 'left', visible: true, align: 'left', type: 'mono', sortable: true },
      { key: 'name', label: 'Name', width: 210, min: 140, visible: true, align: 'left', type: 'text', sortable: true },
      { key: 'location', label: 'Location', width: 150, min: 100, visible: true, align: 'left', type: 'text', sortable: true },
      { key: 'phone', label: 'Phone', width: 132, min: 100, visible: true, align: 'left', type: 'text', sortable: true },
      { key: 'terms', label: 'Terms', width: 96, min: 76, visible: true, align: 'left', type: 'text', sortable: true },
      { key: 'status', label: 'Status', width: 106, min: 86, visible: true, align: 'left', type: 'pill', sortable: true },
      { key: 'balance', label: 'Balance', width: 112, min: 84, visible: true, align: 'right', type: 'num', sortable: true, agg: 'sum', aggFmt: 'money' },
      { key: 'overdue', label: 'Overdue', width: 112, min: 84, visible: true, align: 'right', type: 'num', sortable: true, agg: 'sum', aggFmt: 'money' },
      { key: 'creditLimit', label: 'Credit limit', width: 116, min: 88, visible: false, align: 'right', type: 'num', sortable: true },
      { key: 'salesRep', label: 'Sales rep', width: 130, min: 96, visible: false, align: 'left', type: 'text', sortable: true },
      { key: 'openOrders', label: 'Open orders', width: 110, min: 84, visible: false, align: 'right', type: 'num', sortable: true, agg: 'sum', aggFmt: 'int' },
      { key: 'lastOrder', label: 'Last order', width: 110, min: 88, visible: false, align: 'left', type: 'text', sortable: true },
    ],
    raw: (c, key) => {
      switch (key) {
        case 'no':
          return c.no
        case 'name':
          return c.name
        case 'city':
          return c.city || ''
        case 'state':
          return c.state || ''
        case 'location':
          return customerLocation(c)
        case 'phone':
          return maskPhone(c.phone)
        case 'terms':
          return c.terms || ''
        case 'salesRep':
          return empName(c.salesRep)
        case 'balance':
          return c.balance || 0
        case 'creditLimit':
          return c.creditLimit || 0
        case 'overdue':
          return c.overdue || 0
        case 'openOrders':
          return c.openOrders || 0
        case 'lastOrder':
          return c.lastOrder || ''
        case 'status':
          return customerStatus(c)
        default:
          return ''
      }
    },
    text: (c, key) => {
      switch (key) {
        case 'no':
          return c.no
        case 'name':
          return c.name
        case 'city':
          return c.city || EM_DASH
        case 'state':
          return c.state || EM_DASH
        case 'location':
          return customerLocation(c) || EM_DASH
        case 'phone':
          return maskPhone(c.phone) || EM_DASH
        case 'terms':
          return c.terms || EM_DASH
        case 'salesRep':
          return empName(c.salesRep) || EM_DASH
        case 'balance':
          return money(c.balance || 0)
        case 'creditLimit':
          return money(c.creditLimit || 0)
        case 'overdue':
          return (c.overdue || 0) > 0 ? money(c.overdue) : EM_DASH
        case 'openOrders':
          return int(c.openOrders || 0)
        case 'lastOrder':
          return c.lastOrder || EM_DASH
        case 'status':
          return customerStatus(c)
        default:
          return ''
      }
    },
    searchBlob: (c) =>
      [
        c.no,
        c.name,
        c.contact,
        c.city,
        c.state,
        c.phone,
        c.email,
        c.terms,
        empName(c.salesRep),
        c.balance,
        c.creditLimit,
        c.overdue,
        customerStatus(c),
        c.lastOrder,
      ]
        .join(' \u0001 ')
        .toLowerCase(),
    views: [
      { id: 'all', name: 'All customers', system: true, filters: [] },
      { id: 'onhold', name: 'On hold', filters: [{ key: 'status', op: 'isAny', value: ['On hold'] }] },
    ],
    filterColumns: [
      { key: 'no', label: 'No.', type: 'text' },
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'city', label: 'City', type: 'text' },
      { key: 'state', label: 'State', type: 'text' },
      { key: 'status', label: 'Status', type: 'enum', options: [...CUSTOMER_STATUSES] },
      { key: 'terms', label: 'Terms', type: 'text' },
      { key: 'salesRep', label: 'Sales rep', type: 'enum', options: salesReps },
      { key: 'balance', label: 'Balance', type: 'num' },
      { key: 'creditLimit', label: 'Credit limit', type: 'num' },
      { key: 'overdue', label: 'Overdue', type: 'num' },
      { key: 'openOrders', label: 'Open orders', type: 'num' },
    ],
    defaultSort: { key: 'no', dir: 'asc' },
  }
}
