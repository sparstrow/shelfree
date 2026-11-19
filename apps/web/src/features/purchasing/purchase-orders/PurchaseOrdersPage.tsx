import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { Download } from 'lucide-react'
import { useMemo } from 'react'
import { toast } from 'sonner'
import {
  type ListBulkEdit,
  type ListBulkOp,
  type ListPreview,
  ListPage,
} from '@/components/list-page/ListPage'
import { useCollectionDelete } from '@/components/list-page/use-collection-delete'
import type { PoBulkEditFieldKey, PoBulkLockAction, PoBulkStatusAction } from '@/data/api/commands'
import { DEFAULT_SETTINGS } from '@/data/api/settings'
import {
  useBulkEditPurchaseOrders,
  useBulkPurchaseOrderLock,
  useBulkPurchaseOrderStatus,
  useBulkRemove,
  useBulkUpsert,
  useDuplicatePurchaseOrders,
  useList,
} from '@/data/queries'
import { useSettings } from '@/data/queries/settings'
import type { PurchaseOrder } from '@/data/schemas'
import { pluralNoun } from '@/domain/bulk-actions'
import {
  poCanCancel,
  poCanClose,
  poCanLock,
  poCanReopen,
  poLineCount,
  poLineTotal,
  poLockState,
  poReceivable,
  poSubtotal,
} from '@/domain/purchase-order'
import { poCanBulkIssue } from '@/domain/purchase-order-editing'
import { EM_DASH, fmtDate, int, money, todayLocal } from '@/lib/format'
import { purchaseOrderDataset } from './dataset'
import { PO_RECEIVE_SHORTCUT } from './shortcuts'

const route = getRouteApi('/purchasing/purchase-orders/')

const STATUS_WHY = {
  issue: 'Only drafts with a vendor and at least one line can be issued.',
  cancel: 'Only drafts and issued orders with no goods receipts can be cancelled.',
  close: 'Only received or partly received orders can be closed.',
} as const

const LOCK_WHY = {
  reopen: 'Only locked issued orders can be reopened. Received, closed and cancelled orders stay locked.',
  lock: 'Only reopened issued orders can be locked. Drafts lock when issued.',
} as const

/** Purchasing ▸ Purchase Orders. */
export function PurchaseOrdersPage() {
  const navigate = useNavigate()
  const { sel } = route.useSearch()
  const orders = useList('purchaseOrders')
  const vendors = useList('vendors')
  const employees = useList('employees')
  const receipts = useList('purchaseReceipts')
  const warehouses = useList('warehouses')
  const notes = useList('notes')
  const settings = useSettings()

  const { mutateAsync: runBulkStatus } = useBulkPurchaseOrderStatus()
  const { mutateAsync: runBulkLock } = useBulkPurchaseOrderLock()
  const { mutateAsync: runBulkEdit } = useBulkEditPurchaseOrders()
  const { mutateAsync: runDuplicate } = useDuplicatePurchaseOrders()
  const { mutateAsync: runBulkUpsert } = useBulkUpsert('purchaseOrders')
  const { mutateAsync: runBulkRemove } = useBulkRemove('purchaseOrders')

  const vendorByNo = useMemo(() => new Map((vendors.data ?? []).map((v) => [v.no, v])), [vendors.data])
  const warehouseList = useMemo(() => warehouses.data ?? [], [warehouses.data])
  const receiptList = useMemo(() => receipts.data ?? [], [receipts.data])
  const settingsData = settings.data ?? DEFAULT_SETTINGS

  const dataset = useMemo(
    () =>
      purchaseOrderDataset({
        orders: orders.data ?? [],
        vendors: vendors.data ?? [],
        employees: employees.data ?? [],
        notes: notes.data ?? [],
      }),
    [orders.data, vendors.data, employees.data, notes.data],
  )
  const vendorName = (po: PurchaseOrder) => vendorByNo.get(po.vendor)?.name ?? po.vendor
  const buyerName = (po: PurchaseOrder) => (employees.data ?? []).find((e) => e.id === po.buyer)?.name ?? ''

  const locationOptions = useMemo(
    () =>
      warehouseList
        .filter((w) => w.status !== 'inactive' && w.code)
        .map((w) => ({ value: w.code, label: `${w.code} · ${w.name}` })),
    [warehouseList],
  )

  const buyerOptions = useMemo(
    () => [
      { value: '', label: 'Unassigned' },
      ...(employees.data ?? [])
        .filter((e) => e.dept === 'Purchasing' && e.status !== 'Terminated')
        .map((e) => ({ value: e.id, label: e.name }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    ],
    [employees.data],
  )

  const receive = (po: PurchaseOrder) =>
    void navigate({ to: '/purchasing/purchase-receipts/$no', params: { no: 'new' }, search: { po: po.no } })

  const remove = useCollectionDelete<PurchaseOrder>('purchaseOrders', {
    // Issued orders are cancelled, never deleted.
    blockedReason: (po) => (po.status === 'Draft' ? null : 'Only draft purchase orders can be deleted'),
    describe: (po) => `${po.no} · ${vendorName(po)}`,
  })

  const bulkEdit = useMemo<ListBulkEdit<PurchaseOrder>>(
    () => ({
      fields: [
        { key: 'expectedDate', label: 'Expected date', kind: 'date' },
        { key: 'orderDate', label: 'Order date', kind: 'date' },
        {
          key: 'location',
          label: 'Receiving location',
          kind: 'select',
          placeholder: 'Choose a location…',
          options: locationOptions,
        },
        {
          key: 'buyer',
          label: 'Buyer',
          kind: 'select',
          placeholder: 'Choose a buyer…',
          options: buyerOptions,
        },
      ],
      lockState: poLockState,
      apply: async (selected, field, value, { reopen }) => {
        const res = await runBulkEdit({
          nos: selected.map((p) => p.no),
          field: field.key as PoBulkEditFieldKey,
          value: String(value),
          reopen,
        })
        if (res.edited === 0) return 'Nothing to change.'
        const desc = [
          res.reopened ? `${pluralNoun(res.reopened, 'order', 'orders')} reopened` : '',
          res.skipped ? `${int(res.skipped)} skipped` : '',
        ]
          .filter(Boolean)
          .join(' · ')
        toast(`${field.label} updated on ${pluralNoun(res.edited, 'purchase order', 'purchase orders')}`, {
          description: desc || res.updated.map((p) => p.no).join(', '),
          action: {
            label: 'Undo',
            onClick: () => void runBulkUpsert(res.previous),
          },
        })
      },
    }),
    [locationOptions, buyerOptions, runBulkEdit, runBulkUpsert],
  )

  const statusOps = useMemo<ListBulkOp<PurchaseOrder>[]>(() => {
    const applyStatus = async (action: PoBulkStatusAction, label: string, to: string, why: string, allSelected: PurchaseOrder[]) => {
      try {
        const res = await runBulkStatus({ nos: allSelected.map((p) => p.no), action })
        if (res.updated.length === 0) {
          toast(`Can’t ${label.toLowerCase()} these orders`, { description: why })
          return
        }
        toast(`${pluralNoun(res.updated.length, 'purchase order', 'purchase orders')} ${to.toLowerCase()}`, {
          description: res.skipped ? `${int(res.skipped)} skipped — ${why}` : res.updated.map((p) => p.no).join(', '),
          action: {
            label: 'Undo',
            onClick: () => void runBulkUpsert(res.previous),
          },
        })
      } catch {
        toast(`Could not ${label.toLowerCase()} the selected orders`, {
          description: 'Check your connection and try again.',
        })
      }
    }
    return [
      {
        key: 'issue',
        label: 'Issue',
        to: 'Issued',
        dot: 'info',
        why: STATUS_WHY.issue,
        can: (po) => poCanBulkIssue(po, vendorByNo.get(po.vendor), warehouseList, settingsData),
        run: (_eligible, all) => applyStatus('issue', 'Issue', 'Issued', STATUS_WHY.issue, all),
      },
      {
        key: 'cancel',
        label: 'Cancel',
        to: 'Cancelled',
        dot: 'bad',
        why: STATUS_WHY.cancel,
        can: (po) => poCanCancel(po, receiptList),
        run: (_eligible, all) => applyStatus('cancel', 'Cancel', 'Cancelled', STATUS_WHY.cancel, all),
      },
      {
        key: 'close',
        label: 'Close',
        to: 'Closed',
        dot: 'ok',
        why: STATUS_WHY.close,
        can: poCanClose,
        run: (_eligible, all) => applyStatus('close', 'Close', 'Closed', STATUS_WHY.close, all),
      },
    ]
  }, [vendorByNo, warehouseList, settingsData, receiptList, runBulkStatus, runBulkUpsert])

  const lockOps = useMemo<ListBulkOp<PurchaseOrder>[]>(() => {
    const applyLock = async (action: PoBulkLockAction, label: string, past: string, why: string, allSelected: PurchaseOrder[]) => {
      try {
        const res = await runBulkLock({ nos: allSelected.map((p) => p.no), action })
        if (res.updated.length === 0) {
          toast(`Can’t ${label.toLowerCase()} these orders`, { description: why })
          return
        }
        toast(`${pluralNoun(res.updated.length, 'purchase order', 'purchase orders')} ${past}`, {
          description: res.skipped ? `${int(res.skipped)} skipped — ${why}` : res.updated.map((p) => p.no).join(', '),
          action: {
            label: 'Undo',
            onClick: () => void runBulkUpsert(res.previous),
          },
        })
      } catch {
        toast(`Could not ${label.toLowerCase()} the selected orders`, {
          description: 'Check your connection and try again.',
        })
      }
    }
    return [
      {
        key: 'reopen',
        label: 'Reopen',
        past: 'reopened',
        dot: 'warn',
        why: LOCK_WHY.reopen,
        can: poCanReopen,
        run: (_eligible, all) => applyLock('reopen', 'Reopen', 'reopened', LOCK_WHY.reopen, all),
      },
      {
        key: 'lock',
        label: 'Lock',
        past: 'locked',
        dot: 'muted',
        why: LOCK_WHY.lock,
        can: poCanLock,
        run: (_eligible, all) => applyLock('lock', 'Lock', 'locked', LOCK_WHY.lock, all),
      },
    ]
  }, [runBulkLock, runBulkUpsert])

  const duplicate = async (selected: PurchaseOrder[]): Promise<string[]> => {
    const res = await runDuplicate({ nos: selected.map((p) => p.no), today: todayLocal() })
    const made = res.created.map((p) => p.no)
    if (made.length === 0) return []
    toast(made.length === 1 ? 'Purchase order duplicated' : `${int(made.length)} purchase orders duplicated`, {
      description: `${made.join(', ')} · saved as draft${made.length === 1 ? '' : 's'}`,
      action: {
        label: 'Undo',
        onClick: () => void runBulkRemove(made),
      },
    })
    return made
  }

  const preview = (po: PurchaseOrder): ListPreview => {
    const expected = po.expectedDate ? fmtDate(po.expectedDate) : EM_DASH
    return {
      ariaLabel: `Purchase order ${po.no}`,
      no: po.no,
      status: po.status,
      title: vendorName(po),
      subtitle: `Ordered ${fmtDate(po.orderDate)} · ${po.location || EM_DASH}`,
      stats: [
        { value: money(poSubtotal(po)), label: 'Total' },
        { value: int(poLineCount(po)), label: 'Lines' },
        { value: expected, label: 'Expected' },
      ],
      linesHeading: 'LINES',
      linesEmptyText: 'No lines yet.',
      lines: po.lines.map((line, i) => ({
        key: line.item + i,
        left: (
          <>
            <span className="font-mono text-[11.5px] text-muted-foreground">{line.item}</span> · {line.desc}{' '}
            <span className="text-muted-foreground">×{int(line.qty)}</span>
          </>
        ),
        right: money(poLineTotal(line)),
      })),
      facts: [
        { k: 'Order date', v: fmtDate(po.orderDate) },
        { k: 'Expected date', v: expected },
        { k: 'Receiving location', v: po.location || EM_DASH },
        { k: 'Buyer', v: buyerName(po) || 'Unassigned' },
        { k: 'Lines', v: int(poLineCount(po)) },
        { k: 'Total', v: money(poSubtotal(po)) },
      ],
    }
  }

  return (
    <ListPage
      dataset={dataset}
      rows={orders.data}
      isLoading={orders.isPending}
      error={orders.error}
      onRefresh={() =>
        Promise.all([
          orders.refetch(),
          vendors.refetch(),
          employees.refetch(),
          receipts.refetch(),
          warehouses.refetch(),
          notes.refetch(),
        ])
      }
      recordPath={(po) => `/purchasing/purchase-orders/${po.no}`}
      create={{
        label: 'New purchase order',
        run: () => void navigate({ to: '/purchasing/purchase-orders/$no', params: { no: 'new' } }),
      }}
      remove={remove}
      bulkEdit={bulkEdit}
      duplicate={duplicate}
      statusOps={statusOps}
      lockOps={lockOps}
      canDelete={(po) => (po.status === 'Draft' ? true : 'Only draft purchase orders can be deleted')}
      bulkDelete={{
        run: (drafts) => runBulkRemove(drafts.map((p) => p.no)),
        undo: (drafts) => runBulkUpsert(drafts),
      }}
      actions={[
        {
          label: 'Receive',
          icon: Download,
          when: poReceivable,
          run: receive,
          inDrawer: true,
          title: 'Record a goods-in receipt against this order (R)',
        },
      ]}
      shortcuts={[
        { ...PO_RECEIVE_SHORTCUT, when: poReceivable, run: receive },
      ]}
      preview={preview}
      initialActiveId={sel ?? null}
      emptyText="No purchase orders yet. Use New purchase order to raise the first one."
    />
  )
}
