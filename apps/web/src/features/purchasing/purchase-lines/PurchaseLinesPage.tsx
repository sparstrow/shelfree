import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { Eye } from 'lucide-react'
import { useMemo } from 'react'
import { toast } from 'sonner'
import type { Dataset } from '@/components/data-grid/model'
import { type ListBulkEdit, ListPage } from '@/components/list-page/ListPage'
import { useBulkEditPurchaseLines, useBulkUpsert, useList } from '@/data/queries'
import { type Employee, PO_STATUSES, type Vendor } from '@/data/schemas'
import { pluralNoun } from '@/domain/bulk-actions'
import { type PurchaseLineRow, driftText, purchaseLineRows } from '@/domain/purchase-lines'
import { EM_DASH, fmtDate, int, money, todayLocal } from '@/lib/format'

const route = getRouteApi('/purchasing/purchase-lines/')

function purchaseLineDataset(vendors: readonly Vendor[], employees: readonly Employee[], rows: readonly PurchaseLineRow[]): Dataset<PurchaseLineRow> {
  const vendorName = (r: PurchaseLineRow) => vendors.find((v) => v.no === r.vendor)?.name ?? (r.vendor || EM_DASH)
  const buyerName = (r: PurchaseLineRow) => employees.find((e) => e.id === r.buyer)?.name ?? ''
  const buyers = [...new Set(rows.map(buyerName).filter(Boolean))].sort()
  return {
    id: 'purchase-lines',
    noun: 'purchase line',
    nounPlural: 'purchase lines',
    idOf: (r) => r.id,
    columns: [
      { key: 'item', label: 'Item', width: 128, min: 100, frozen: 'left', visible: true, align: 'left', type: 'mono', sortable: true },
      { key: 'desc', label: 'Description', width: 200, min: 140, visible: true, align: 'left', type: 'text', sortable: true },
      { key: 'po', label: 'PO No.', width: 116, min: 92, visible: true, align: 'left', type: 'mono', sortable: true },
      { key: 'vendor', label: 'Vendor', width: 188, min: 140, visible: true, align: 'left', type: 'text', sortable: true, muted: true },
      { key: 'poStatus', label: 'Status', width: 140, min: 110, visible: true, align: 'left', type: 'pill', sortable: true },
      { key: 'lock', label: 'Lock', width: 92, min: 76, visible: true, align: 'left', type: 'text', sortable: true },
      { key: 'qty', label: 'Qty ordered', width: 106, min: 88, visible: true, align: 'right', type: 'num', sortable: true, agg: 'sum', aggFmt: 'int' },
      { key: 'qtyReceived', label: 'Qty received', width: 106, min: 88, visible: true, align: 'right', type: 'num', sortable: true, agg: 'sum', aggFmt: 'int' },
      { key: 'qtyOutstanding', label: 'Qty outstanding', width: 118, min: 96, visible: true, align: 'right', type: 'num', sortable: true, agg: 'sum', aggFmt: 'int' },
      { key: 'unitCost', label: 'Unit cost', width: 106, min: 88, visible: true, align: 'right', type: 'num', sortable: true },
      { key: 'lineTotal', label: 'Line total', width: 126, min: 100, visible: true, align: 'right', type: 'num', sortable: true, agg: 'sum', aggFmt: 'money' },
      { key: 'currentPrice', label: 'Current price', width: 128, min: 96, visible: true, align: 'right', type: 'num', sortable: true },
      { key: 'drift', label: 'vs current price', width: 128, min: 96, visible: true, align: 'right', type: 'num', sortable: true },
      { key: 'orderDate', label: 'Order date', width: 116, min: 96, visible: true, align: 'left', type: 'text', sortable: true },
      { key: 'uom', label: 'UOM', width: 80, min: 64, visible: false, align: 'left', type: 'text', sortable: true },
      { key: 'expectedDate', label: 'Expected date', width: 116, min: 96, visible: false, align: 'left', type: 'text', sortable: true },
      { key: 'buyer', label: 'Buyer', width: 140, min: 110, visible: false, align: 'left', type: 'text', sortable: true },
    ],
    raw: (r, key) => {
      switch (key) {
        case 'vendor':
          return vendorName(r)
        case 'buyer':
          return buyerName(r)
        case 'currentPrice':
          return r.currentPrice ?? ''
        case 'drift':
          return r.drift ?? ''
        default: {
          const value = r[key as keyof PurchaseLineRow]
          return typeof value === 'number' ? value : String(value ?? '')
        }
      }
    },
    text: (r, key) => {
      switch (key) {
        case 'vendor':
          return vendorName(r)
        case 'buyer':
          return buyerName(r) || 'Unassigned'
        case 'desc':
          return r.desc || EM_DASH
        case 'qty':
        case 'qtyReceived':
        case 'qtyOutstanding':
          return int(r[key])
        case 'unitCost':
        case 'lineTotal':
          return money(r[key])
        case 'currentPrice':
          return r.currentPrice === null ? 'No current price' : money(r.currentPrice)
        case 'drift':
          return driftText(r.drift)
        case 'orderDate':
          return fmtDate(r.orderDate)
        case 'expectedDate':
          return r.expectedDate ? fmtDate(r.expectedDate) : EM_DASH
        case 'uom':
          return r.uom || EM_DASH
        default:
          return String(r[key as keyof PurchaseLineRow] ?? '')
      }
    },
    searchBlob: (r) => [r.item, r.desc, r.po, vendorName(r), r.poStatus, buyerName(r), r.orderDate].join(' \u0001 ').toLowerCase(),
    views: [
      { id: 'all', name: 'All lines', system: true, filters: [] },
      { id: 'open', name: 'Open lines', filters: [{ key: 'qtyOutstanding', op: '>', value: '0' }] },
    ],
    filterColumns: [
      { key: 'item', label: 'Item', type: 'text' },
      { key: 'po', label: 'PO No.', type: 'text' },
      { key: 'vendor', label: 'Vendor', type: 'text' },
      { key: 'poStatus', label: 'Status', type: 'enum', options: [...PO_STATUSES] },
      { key: 'lock', label: 'Lock', type: 'enum', options: ['Open', 'Locked', 'Final'] },
      { key: 'buyer', label: 'Buyer', type: 'enum', options: buyers },
      { key: 'qty', label: 'Qty ordered', type: 'num' },
      { key: 'qtyReceived', label: 'Qty received', type: 'num' },
      { key: 'qtyOutstanding', label: 'Qty outstanding', type: 'num' },
      { key: 'lineTotal', label: 'Line total', type: 'num' },
      { key: 'currentPrice', label: 'Current price', type: 'num' },
      { key: 'drift', label: 'Current price vs cost %', type: 'num' },
      { key: 'orderDate', label: 'Order date', type: 'text' },
    ],
    defaultSort: { key: 'po', dir: 'asc' },
  }
}

/**
 * Purchasing ▸ Purchase Lines — a read-only report of every order line.
 * Exceptions to the list template: no New, no delete, no preview; a line opens
 * its purchase order.
 */
export function PurchaseLinesPage() {
  const navigate = useNavigate()
  const { item } = route.useSearch()
  const orders = useList('purchaseOrders')
  const receipts = useList('purchaseReceipts')
  const prices = useList('purchasePrices')
  const vendors = useList('vendors')
  const employees = useList('employees')
  const { mutateAsync: runBulkEditLines } = useBulkEditPurchaseLines()
  const { mutateAsync: runBulkUpsertOrders } = useBulkUpsert('purchaseOrders')

  const loaded = orders.data && receipts.data && prices.data
  const rows = useMemo(
    () => (loaded ? purchaseLineRows(orders.data ?? [], receipts.data ?? [], prices.data ?? [], todayLocal()) : undefined),
    [loaded, orders.data, receipts.data, prices.data],
  )
  const dataset = useMemo(
    () => purchaseLineDataset(vendors.data ?? [], employees.data ?? [], rows ?? []),
    [vendors.data, employees.data, rows],
  )

  const bulkEdit = useMemo<ListBulkEdit<PurchaseLineRow>>(
    () => ({
      fields: [{ key: 'qty', label: 'Qty ordered', kind: 'num', min: 1, step: 1 }],
      lockState: (r) => (r.lock === 'Open' ? 'open' : r.lock === 'Locked' ? 'locked' : 'final'),
      lockGroup: (r) => r.po,
      lockedText: (t) =>
        `${pluralNoun(t.locked.length, 'line', 'lines')} on ${pluralNoun(t.lockedGroups, 'locked order', 'locked orders')} — reopen to edit`,
      finalText: (t) => `${int(t.final.length)} can’t be edited — their orders are received, closed or cancelled`,
      reopenLabel: (t) =>
        `Reopen ${pluralNoun(t.lockedGroups, 'order', 'orders')} & apply to ${int(t.open.length + t.locked.length)}`,
      apply: async (selected, field, value, { reopen }) => {
        const res = await runBulkEditLines({
          lineIds: selected.map((r) => r.id),
          qty: Number(value),
          reopen,
        })
        if (res.edited === 0) {
          return res.short
            ? 'Nothing changed — the new quantity is below what’s already received.'
            : 'Nothing to change.'
        }
        const desc = [
          res.reopened ? `${pluralNoun(res.reopened, 'order', 'orders')} reopened` : '',
          res.skipped ? `${int(res.skipped)} skipped` : '',
        ]
          .filter(Boolean)
          .join(' · ')
        toast(`${field.label} updated on ${pluralNoun(res.edited, 'line', 'lines')}`, {
          description: desc || res.updated.map((p) => p.no).join(', '),
          action: {
            label: 'Undo',
            onClick: () => void runBulkUpsertOrders(res.previous),
          },
        })
      },
    }),
    [runBulkEditLines, runBulkUpsertOrders],
  )

  return (
    <ListPage
      // Re-mount when opened for a specific item so the filter starts fresh.
      gridKey={item ?? 'all'}
      dataset={dataset}
      rows={rows}
      isLoading={!rows && !orders.error}
      error={orders.error ?? receipts.error ?? prices.error}
      onRefresh={() => Promise.all([orders.refetch(), receipts.refetch(), prices.refetch()])}
      recordPath={(r) => `/purchasing/purchase-orders/${r.po}`}
      openLabel="Open purchase order"
      bulkEdit={bulkEdit}
      actions={[
        { label: 'View order in list', icon: Eye, run: (r) => void navigate({ to: '/purchasing/purchase-orders', search: { sel: r.po } }) },
      ]}
      initialFilters={item ? [{ key: 'item', op: 'equals', value: item }] : undefined}
      emptyText="No purchase order lines yet."
    />
  )
}
