import type { Dataset, GridColumn, RawValue } from '@/components/data-grid/model'
import type { AssemblyOrder, Employee, Item, Note, Warehouse } from '@/data/schemas'
import { latestNoteText, notesBlob } from '@/domain/notes'
import { aoShortages, aoSiteName, aoStatusLabel, mainLocationId } from '@/domain/production'
import { EM_DASH, fmtDate, int } from '@/lib/format'

export interface AssemblyOrderDatasetInput {
  orders: readonly AssemblyOrder[]
  items: readonly Item[]
  employees: readonly Employee[]
  warehouses: readonly Warehouse[]
  notes: readonly Note[]
}

export function assemblyOrderDataset({
  orders,
  items,
  employees,
  warehouses,
  notes,
}: AssemblyOrderDatasetInput): Dataset<AssemblyOrder> {
  const empById = new Map(employees.map((emp) => [emp.id, emp.name]))
  const mainLocId = mainLocationId(warehouses)

  const empName = (id: string | null): string => (id ? (empById.get(id) ?? '') : '')

  const shortageCountByNo = new Map<string, number>()
  for (const order of orders) {
    shortageCountByNo.set(order.no, aoShortages(order, items, mainLocId).length)
  }

  const raw = (order: AssemblyOrder, key: string): RawValue => {
    switch (key) {
      case 'no':
        return order.no
      case 'item':
        return order.item
      case 'desc':
        return order.desc || ''
      case 'qty':
        return order.qty || 0
      case 'qtyFinished':
        return order.qtyFinished || 0
      case 'location':
        return aoSiteName(order.location, warehouses)
      case 'dueDate':
        return order.dueDate || ''
      case 'status':
      case '_status':
        return aoStatusLabel(order.status)
      case 'assignee':
        return empName(order.assignee)
      case 'bomVersion':
        return order.bomVersion || ''
      case 'shortCount':
        return shortageCountByNo.get(order.no) ?? 0
      case 'notes':
        return latestNoteText(notes, 'assemblyOrder', order.no)
      default:
        return ''
    }
  }

  const text = (order: AssemblyOrder, key: string): string => {
    switch (key) {
      case 'qty':
        return int(order.qty || 0)
      case 'qtyFinished':
        return `${int(order.qtyFinished || 0)} / ${int(order.qty || 0)}`
      case 'dueDate':
        return order.dueDate ? fmtDate(order.dueDate) : EM_DASH
      case 'assignee':
        return empName(order.assignee) || 'Unassigned'
      case 'shortCount': {
        const count = shortageCountByNo.get(order.no) ?? 0
        return count ? int(count) : EM_DASH
      }
      case 'notes':
        return latestNoteText(notes, 'assemblyOrder', order.no) || EM_DASH
      default:
        return String(raw(order, key) || EM_DASH)
    }
  }

  const assigneeOptions = Array.from(
    new Set(orders.map((order) => empName(order.assignee)).filter(Boolean)),
  ).sort()

  const columns: GridColumn[] = [
    { key: 'no', label: 'Order no.', width: 126, min: 96, frozen: 'left', visible: true, align: 'left', type: 'mono', sortable: true },
    { key: 'item', label: 'Item', width: 132, min: 96, visible: true, align: 'left', type: 'mono', sortable: true },
    { key: 'desc', label: 'Description', width: 280, min: 160, visible: true, align: 'left', type: 'text', sortable: true },
    { key: 'qty', label: 'Qty', width: 92, min: 70, visible: true, align: 'right', type: 'num', sortable: true, agg: 'sum', aggFmt: 'int' },
    { key: 'qtyFinished', label: 'Finished', width: 108, min: 84, visible: true, align: 'right', type: 'num', sortable: true },
    { key: 'status', label: 'Status', width: 128, min: 100, visible: true, align: 'left', type: 'pill', sortable: true },
    { key: 'dueDate', label: 'Due date', width: 128, min: 100, visible: true, align: 'left', type: 'text', sortable: true },
    { key: 'assignee', label: 'Assignee', width: 150, min: 110, visible: true, align: 'left', type: 'text', sortable: true },
    { key: 'location', label: 'Location', width: 112, min: 84, visible: false, align: 'left', type: 'text', sortable: true },
    { key: 'shortCount', label: 'Shortages', width: 108, min: 84, visible: false, align: 'right', type: 'num', sortable: true },
    { key: 'notes', label: 'Latest note', width: 220, min: 120, visible: false, align: 'left', type: 'text', sortable: false },
  ]

  return {
    id: 'assembly-orders',
    noun: 'assembly order',
    nounPlural: 'assembly orders',
    idOf: (order) => order.no,
    columns,
    raw,
    text,
    searchBlob: (order) =>
      [
        order.no,
        order.item,
        order.desc,
        aoStatusLabel(order.status),
        order.location,
        aoSiteName(order.location, warehouses),
        order.dueDate,
        empName(order.assignee),
        notesBlob(notes, 'assemblyOrder', order.no),
        ...order.lines.map((line) => `${line.item} ${line.desc}`),
      ]
        .join(' \u0001 ')
        .toLowerCase(),
    views: [
      { id: 'all', name: 'All orders', system: true, filters: [] },
      {
        id: 'open',
        name: 'Open',
        filters: [{ key: 'status', op: 'isAny', value: ['Draft', 'Released', 'In progress', 'Planned'] }],
      },
      { id: 'finished', name: 'Finished', filters: [{ key: 'status', op: 'isAny', value: ['Finished'] }] },
      { id: 'cancelled', name: 'Cancelled', filters: [{ key: 'status', op: 'isAny', value: ['Cancelled'] }] },
    ],
    filterColumns: [
      { key: 'no', label: 'Order no.', type: 'text' },
      { key: 'item', label: 'Item', type: 'text' },
      {
        key: 'status',
        label: 'Status',
        type: 'enum',
        options: ['Planned', 'Draft', 'Released', 'In progress', 'Finished', 'Cancelled'],
      },
      { key: 'assignee', label: 'Assignee', type: 'enum', options: assigneeOptions },
      { key: 'location', label: 'Location', type: 'text' },
      { key: 'dueDate', label: 'Due date', type: 'text' },
      { key: 'qty', label: 'Qty', type: 'num' },
    ],
    defaultSort: { key: 'no', dir: 'asc' },
  }
}
