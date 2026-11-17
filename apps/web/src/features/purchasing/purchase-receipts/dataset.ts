import type { Dataset } from '@/components/data-grid/model'
import { type Employee, type Note, PR_STATUSES, type PurchaseReceipt, type Vendor, type Warehouse } from '@/data/schemas'
import { latestNoteText, notesBlob } from '@/domain/notes'
import { prQtyReceived, prQtyRejected, prValue } from '@/domain/purchase-receipt'
import { EM_DASH, fmtDate, int, money } from '@/lib/format'

export interface PurchaseReceiptLookups {
  receipts: readonly PurchaseReceipt[]
  vendors: readonly Vendor[]
  employees: readonly Employee[]
  warehouses: readonly Warehouse[]
  notes: readonly Note[]
}

/** The Purchase Receipts grid definition. */
export function purchaseReceiptDataset({
  receipts,
  vendors,
  employees,
  warehouses,
  notes,
}: PurchaseReceiptLookups): Dataset<PurchaseReceipt> {
  const vendorName = (r: PurchaseReceipt) => vendors.find((v) => v.no === r.vendor)?.name ?? (r.vendor || EM_DASH)
  const siteName = (r: PurchaseReceipt) => warehouses.find((w) => w.code === r.location)?.name ?? (r.location || EM_DASH)
  const receiver = (r: PurchaseReceipt) => employees.find((e) => e.id === r.receivedBy)?.name ?? ''
  const receivers = [...new Set(receipts.map(receiver).filter(Boolean))].sort()

  return {
    id: 'purchase-receipts',
    noun: 'purchase receipt',
    nounPlural: 'purchase receipts',
    idOf: (r) => r.no,
    columns: [
      { key: 'no', label: 'No.', width: 128, min: 92, frozen: 'left', visible: true, align: 'left', type: 'mono', sortable: true },
      { key: 'po', label: 'Purchase order', width: 134, min: 100, visible: true, align: 'left', type: 'mono', sortable: true },
      { key: 'vendor', label: 'Vendor', width: 196, min: 140, visible: true, align: 'left', type: 'text', sortable: true, muted: true },
      { key: 'receiptDate', label: 'Received on', width: 128, min: 100, visible: true, align: 'left', type: 'text', sortable: true },
      { key: 'status', label: 'Status', width: 112, min: 90, visible: true, align: 'left', type: 'pill', sortable: true },
      { key: 'qtyReceived', label: 'Qty received', width: 124, min: 96, visible: true, align: 'right', type: 'num', sortable: true, agg: 'sum', aggFmt: 'int' },
      { key: 'qtyRejected', label: 'Rejected', width: 104, min: 84, visible: true, align: 'right', type: 'num', sortable: true, agg: 'sum', aggFmt: 'int' },
      { key: 'value', label: 'Value', width: 132, min: 100, visible: true, align: 'right', type: 'num', sortable: true, agg: 'sum', aggFmt: 'money' },
      { key: 'location', label: 'Received into', width: 176, min: 120, visible: true, align: 'left', type: 'text', sortable: true },
      { key: 'receivedBy', label: 'Received by', width: 150, min: 110, visible: false, align: 'left', type: 'text', sortable: true },
      { key: 'vendorDocNo', label: 'Vendor challan', width: 140, min: 104, visible: false, align: 'left', type: 'mono', sortable: true },
      { key: 'notes', label: 'Latest note', width: 220, min: 120, visible: false, align: 'left', type: 'text', sortable: false },
    ],
    raw: (r, key) => {
      switch (key) {
        case 'no':
          return r.no
        case 'po':
          return r.po || ''
        case 'vendor':
          return vendorName(r)
        case 'receiptDate':
          return r.receiptDate || ''
        case 'status':
          return r.status
        case 'location':
          return siteName(r)
        case 'receivedBy':
          return receiver(r)
        case 'vendorDocNo':
          return r.vendorDocNo || ''
        case 'qtyReceived':
          return prQtyReceived(r)
        case 'qtyRejected':
          return prQtyRejected(r)
        case 'value':
          return prValue(r)
        case 'notes':
          return latestNoteText(notes, 'purchaseReceipt', r.no)
        default:
          return ''
      }
    },
    text: (r, key) => {
      switch (key) {
        case 'no':
          return r.no
        case 'po':
          return r.po || EM_DASH
        case 'vendor':
          return vendorName(r)
        case 'receiptDate':
          return fmtDate(r.receiptDate)
        case 'status':
          return r.status
        case 'location':
          return siteName(r)
        case 'receivedBy':
          return receiver(r) || 'Unassigned'
        case 'vendorDocNo':
          return r.vendorDocNo || EM_DASH
        case 'qtyReceived':
          return int(prQtyReceived(r))
        case 'qtyRejected': {
          const n = prQtyRejected(r)
          return n ? int(n) : EM_DASH
        }
        case 'value':
          return money(prValue(r))
        case 'notes':
          return latestNoteText(notes, 'purchaseReceipt', r.no) || EM_DASH
        default:
          return ''
      }
    },
    searchBlob: (r) =>
      [
        r.no,
        r.po,
        vendorName(r),
        r.status,
        r.receiptDate,
        siteName(r),
        receiver(r),
        r.vendorDocNo,
        notesBlob(notes, 'purchaseReceipt', r.no),
        ...(r.lines || []).map((l) => l.item + ' ' + l.desc),
      ]
        .join(' \u0001 ')
        .toLowerCase(),
    views: [
      { id: 'all', name: 'All receipts', system: true, filters: [] },
      { id: 'draft', name: 'Not posted', filters: [{ key: 'status', op: 'isAny', value: ['Draft'] }] },
      { id: 'posted', name: 'Posted', filters: [{ key: 'status', op: 'isAny', value: ['Posted'] }] },
    ],
    filterColumns: [
      { key: 'no', label: 'No.', type: 'text' },
      { key: 'po', label: 'Purchase order', type: 'text' },
      { key: 'vendor', label: 'Vendor', type: 'text' },
      { key: 'status', label: 'Status', type: 'enum', options: [...PR_STATUSES] },
      { key: 'receiptDate', label: 'Received on', type: 'text' },
      { key: 'location', label: 'Received into', type: 'enum', options: warehouses.map((w) => w.name) },
      { key: 'receivedBy', label: 'Received by', type: 'enum', options: receivers },
      { key: 'vendorDocNo', label: 'Vendor challan', type: 'text' },
      { key: 'qtyReceived', label: 'Qty received', type: 'num' },
      { key: 'qtyRejected', label: 'Rejected', type: 'num' },
      { key: 'value', label: 'Value', type: 'num' },
    ],
    defaultSort: { key: 'no', dir: 'asc' },
  }
}
