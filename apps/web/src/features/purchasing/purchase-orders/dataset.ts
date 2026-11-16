import type { Dataset } from '@/components/data-grid/model'
import { type Employee, type Note, PO_STATUSES, type PurchaseOrder, type Vendor } from '@/data/schemas'
import { latestNoteText, notesBlob } from '@/domain/notes'
import { poLineCount, poLockLabel, poSubtotal } from '@/domain/purchase-order'
import { EM_DASH, fmtDate, int, money } from '@/lib/format'

export interface PurchaseOrderLookups {
  orders: readonly PurchaseOrder[]
  vendors: readonly Vendor[]
  employees: readonly Employee[]
  notes: readonly Note[]
}

/** The Purchase Orders grid definition (columns, views, filters, search). */
export function purchaseOrderDataset({ orders, vendors, employees, notes }: PurchaseOrderLookups): Dataset<PurchaseOrder> {
  const vendorName = (po: PurchaseOrder) => vendors.find((v) => v.no === po.vendor)?.name ?? (po.vendor || EM_DASH)
  const buyerName = (po: PurchaseOrder) => employees.find((e) => e.id === po.buyer)?.name ?? ''
  // Buyer filter options: everyone who is the buyer on at least one order.
  const buyers = [...new Set(orders.map(buyerName).filter(Boolean))].sort()

  return {
    id: 'purchase-orders',
    noun: 'purchase order',
    nounPlural: 'purchase orders',
    idOf: (po) => po.no,
    columns: [
      { key: 'no', label: 'No.', width: 128, min: 92, frozen: 'left', visible: true, align: 'left', type: 'mono', sortable: true },
      { key: 'vendor', label: 'Vendor', width: 200, min: 140, visible: true, align: 'left', type: 'text', sortable: true, muted: true },
      { key: 'orderDate', label: 'Order date', width: 128, min: 100, visible: true, align: 'left', type: 'text', sortable: true },
      { key: 'expectedDate', label: 'Expected date', width: 128, min: 100, visible: true, align: 'left', type: 'text', sortable: true },
      { key: 'status', label: 'Status', width: 150, min: 120, visible: true, align: 'left', type: 'pill', sortable: true },
      { key: 'lock', label: 'Lock', width: 96, min: 76, visible: true, align: 'left', type: 'text', sortable: true },
      { key: 'lineCount', label: 'Lines', width: 92, min: 70, visible: true, align: 'right', type: 'num', sortable: true, agg: 'sum', aggFmt: 'int', muted: true },
      { key: 'total', label: 'Total', width: 132, min: 100, visible: true, align: 'right', type: 'num', sortable: true, agg: 'sum', aggFmt: 'money' },
      { key: 'buyer', label: 'Buyer', width: 150, min: 110, visible: true, align: 'left', type: 'text', sortable: true },
      { key: 'location', label: 'Location', width: 110, min: 84, visible: false, align: 'left', type: 'text', sortable: true },
      { key: 'notes', label: 'Latest note', width: 220, min: 120, visible: false, align: 'left', type: 'text', sortable: false },
    ],
    raw: (po, key) => {
      switch (key) {
        case 'no':
          return po.no
        case 'vendor':
          return vendorName(po)
        case 'orderDate':
          return po.orderDate || ''
        case 'expectedDate':
          return po.expectedDate || ''
        case 'status':
          return po.status
        case 'lock':
          return poLockLabel(po)
        case 'buyer':
          return buyerName(po)
        case 'location':
          return po.location || ''
        case 'notes':
          return latestNoteText(notes, 'purchaseOrder', po.no)
        case 'lineCount':
          return poLineCount(po)
        case 'total':
          return poSubtotal(po)
        default:
          return ''
      }
    },
    text: (po, key) => {
      switch (key) {
        case 'no':
          return po.no
        case 'vendor':
          return vendorName(po)
        case 'orderDate':
          return fmtDate(po.orderDate)
        case 'expectedDate':
          return po.expectedDate ? fmtDate(po.expectedDate) : EM_DASH
        case 'status':
          return po.status
        case 'lock':
          return poLockLabel(po)
        case 'buyer':
          return buyerName(po) || 'Unassigned'
        case 'location':
          return po.location || EM_DASH
        case 'notes':
          return latestNoteText(notes, 'purchaseOrder', po.no) || EM_DASH
        case 'lineCount':
          return int(poLineCount(po))
        case 'total':
          return money(poSubtotal(po))
        default:
          return ''
      }
    },
    searchBlob: (po) =>
      [
        po.no,
        vendorName(po),
        po.status,
        po.orderDate,
        po.expectedDate,
        po.location,
        buyerName(po),
        notesBlob(notes, 'purchaseOrder', po.no),
        ...(po.lines || []).map((l) => l.item + ' ' + l.desc),
      ]
        .join(' \u0001 ')
        .toLowerCase(),
    views: [
      { id: 'all', name: 'All orders', system: true, filters: [] },
      { id: 'open', name: 'Open', filters: [{ key: 'status', op: 'isAny', value: ['Issued', 'Partially received'] }] },
      { id: 'draft', name: 'Drafts', filters: [{ key: 'status', op: 'isAny', value: ['Draft'] }] },
    ],
    filterColumns: [
      { key: 'no', label: 'No.', type: 'text' },
      { key: 'vendor', label: 'Vendor', type: 'text' },
      { key: 'status', label: 'Status', type: 'enum', options: [...PO_STATUSES] },
      { key: 'lock', label: 'Lock', type: 'enum', options: ['Open', 'Locked', 'Final'] },
      { key: 'buyer', label: 'Buyer', type: 'enum', options: buyers },
      { key: 'location', label: 'Location', type: 'text' },
      { key: 'orderDate', label: 'Order date', type: 'text' },
      { key: 'expectedDate', label: 'Expected date', type: 'text' },
      { key: 'total', label: 'Total', type: 'num' },
      { key: 'lineCount', label: 'Lines', type: 'num' },
    ],
    defaultSort: { key: 'no', dir: 'asc' },
  }
}
