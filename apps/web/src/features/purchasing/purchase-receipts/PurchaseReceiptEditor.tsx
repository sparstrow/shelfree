import { useNavigate } from '@tanstack/react-router'
import { Check, Download, FileText } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { StatusPill } from '@/components/StatusPill'
import { DocumentCard, DocumentPage, type DocumentState, TotalsCard } from '@/components/document/DocumentPage'
import { type LineColumn, LineGrid } from '@/components/document/LineGrid'
import { Field, Notice, fieldClass, numberInputClass, primaryButton, secondaryButton } from '@/components/document/parts'
import { NotesBlock } from '@/components/notes/NotesBlock'
import { CommandError } from '@/data/api/commands'
import type { Employee, PurchaseOrder, PurchaseReceipt, PurchaseReceiptLine, Vendor, Warehouse } from '@/data/schemas'
import { useList, usePostPurchaseReceipt, useUpsert } from '@/data/queries'
import {
  lineOverReceives,
  outstandingByItem,
  postReceiptError,
  prQtyReceived,
  prQtyRejected,
  prValue,
  receiptDraftFromOrder,
  siteShortName,
} from '@/domain/purchase-receipt'
import { EM_DASH, fmtDate, int, money, todayLocal } from '@/lib/format'
import { isTypingTarget } from '@/lib/keyboard'
import { cn } from '@/lib/utils'

const BACK_TO = '/purchasing/purchase-receipts'
const BACK_LABEL = 'Back to purchase receipts'

interface Loaded {
  receipts: PurchaseReceipt[]
  orders: PurchaseOrder[]
  vendors: Vendor[]
  employees: Employee[]
  warehouses: Warehouse[]
}

/** Purchasing ▸ Purchase Receipts ▸ document. `routeNo` is a receipt number, or `new` with `orderNo`. */
export function PurchaseReceiptEditor({ routeNo, orderNo }: { routeNo: string; orderNo?: string }) {
  const receipts = useList('purchaseReceipts')
  const orders = useList('purchaseOrders')
  const vendors = useList('vendors')
  const employees = useList('employees')
  const warehouses = useList('warehouses')
  const queries = [receipts, orders, vendors, employees, warehouses]

  const isNew = routeNo === 'new'
  const saved = (receipts.data ?? []).find((r) => r.no === routeNo)
  const order = (orders.data ?? []).find((po) => po.no === (isNew ? orderNo : saved?.po))

  let state: DocumentState | null = null
  if (queries.some((q) => q.isError)) {
    state = { kind: 'error', message: 'Could not load this receipt.', retry: () => queries.forEach((q) => q.refetch()) }
  } else if (!queries.every((q) => q.data !== undefined)) {
    state = { kind: 'loading' }
  } else if (isNew && !order) {
    state = { kind: 'error', message: 'A receipt has to be against a purchase order. Go back and pick the order that arrived.' }
  } else if (!isNew && !saved) {
    state = { kind: 'error', message: `Purchase receipt ${routeNo} was not found. It may have been deleted.` }
  }
  if (state) {
    return (
      <DocumentPage pageLabel="Purchase Receipt" backTo={BACK_TO} header={{ title: 'Purchase receipt', backLabel: BACK_LABEL }} state={state} />
    )
  }

  const data: Loaded = {
    receipts: receipts.data ?? [],
    orders: orders.data ?? [],
    vendors: vendors.data ?? [],
    employees: employees.data ?? [],
    warehouses: warehouses.data ?? [],
  }
  const initial = saved ? structuredClone(saved) : receiptDraftFromOrder(order as PurchaseOrder, data.receipts, todayLocal())
  // Keyed on status too, so the document reloads as read-only right after posting.
  return <Editor key={routeNo + ':' + (saved?.status ?? 'new')} isNew={isNew} initial={initial} order={order} data={data} />
}

function Editor({
  isNew,
  initial,
  order,
  data,
}: {
  isNew: boolean
  initial: PurchaseReceipt
  order: PurchaseOrder | undefined
  data: Loaded
}) {
  const navigate = useNavigate()
  const save = useUpsert('purchaseReceipts')
  const post = usePostPurchaseReceipt()
  const [draft, setDraft] = useState(initial)
  const [error, setError] = useState('')

  const posted = draft.status === 'Posted'
  const editable = draft.status === 'Draft'
  const busy = save.isPending || post.isPending
  const vendorName = data.vendors.find((v) => v.no === draft.vendor)?.name ?? (draft.vendor || EM_DASH)
  const progress = outstandingByItem(draft, order, data.receipts)
  const rejected = prQtyRejected(draft)

  const locationOptions = data.warehouses.map((w) => ({ value: w.code, label: w.name }))
  const receiverOptions = data.employees
    .filter((e) => (e.dept === 'Purchasing' && e.status !== 'Terminated') || e.id === draft.receivedBy)
    .map((e) => ({ value: e.id, label: e.name }))
    .sort((a, b) => a.label.localeCompare(b.label))

  const patch = (next: Partial<PurchaseReceipt>) => {
    setError('')
    setDraft((d) => ({ ...d, ...next }))
  }
  const setLine = (index: number, field: 'qtyReceived' | 'qtyRejected' | 'rejectReason', raw: string) => {
    const value = field === 'rejectReason' ? raw : Math.max(0, Number.parseFloat(raw) || 0)
    patch({ lines: draft.lines.map((l, i) => (i === index ? { ...l, [field]: value } : l)) })
  }
  const fillOutstanding = () =>
    patch({ lines: draft.lines.map((l) => ({ ...l, qtyReceived: progress.get(l.item)?.outstanding ?? 0 })) })
  const clearLines = () => patch({ lines: draft.lines.map((l) => ({ ...l, qtyReceived: 0, qtyRejected: 0, rejectReason: '' })) })

  const back = () => navigate({ to: BACK_TO })
  const openOrder = () => {
    if (draft.po) void navigate({ to: '/purchasing/purchase-orders/$no', params: { no: draft.po } })
  }

  const saveDraft = async () => {
    if (!draft.po) return setError('A receipt has to be against a purchase order.')
    try {
      await save.mutateAsync(draft)
    } catch {
      return setError('Could not save the receipt. Check your connection and try again.')
    }
    toast('Receipt saved', { description: `${draft.no} · ${vendorName}` })
    void navigate({ to: BACK_TO, search: { sel: draft.no } })
  }

  const postReceipt = async () => {
    const problem = postReceiptError(draft, order, data.receipts)
    if (problem) return setError(problem)
    try {
      const done = await post.mutateAsync(draft)
      const site = data.warehouses.find((w) => w.code === done.location)
      const rej = prQtyRejected(done)
      toast('Receipt posted', {
        description: `${int(prQtyReceived(done))} into ${site ? siteShortName(site.name) : done.location}${rej ? ` · ${int(rej)} rejected` : ''}`,
      })
      // Stay on the document; it reloads read-only under its own number.
      void navigate({ to: '/purchasing/purchase-receipts/$no', params: { no: done.no }, replace: true })
    } catch (e) {
      setError(e instanceof CommandError ? e.message : 'Could not post the receipt. Check your connection and try again.')
    }
  }

  const cancelReceipt = async () => {
    if (posted) return
    try {
      await save.mutateAsync({ ...draft, status: 'Cancelled' })
    } catch {
      return setError('Could not cancel the receipt. Check your connection and try again.')
    }
    toast('Receipt cancelled', { description: `${draft.no} · nothing was taken into stock` })
    back()
  }

  // F fill outstanding · O open the order · Ctrl/Cmd+Enter post · Esc leave.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        if (editable) {
          e.preventDefault()
          void postReceipt()
        }
        return
      }
      if (isTypingTarget(e.target) || e.metaKey || e.ctrlKey || e.altKey) return
      const key = e.key.toLowerCase()
      if (key === 'f' && editable) {
        e.preventDefault()
        fillOutstanding()
      } else if (key === 'o') {
        e.preventDefault()
        openOrder()
      } else if (e.key === 'Escape') {
        back()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const columns: LineColumn<PurchaseReceiptLine>[] = [
    {
      key: 'item',
      label: 'Item',
      align: 'left',
      width: 320,
      cell: (line, i) => {
        const over = lineOverReceives(line, progress.get(line.item))
        return (
          <>
            <div className="font-mono text-xs font-medium">{line.item}</div>
            <div className="mt-0.5 text-[12.5px] text-muted-foreground">{line.desc}</div>
            {(Number(line.qtyRejected) || 0) > 0 && (
              <input
                disabled={!editable}
                value={line.rejectReason}
                onChange={(e) => setLine(i, 'rejectReason', e.target.value)}
                placeholder="Why were these rejected? e.g. kiln cracks"
                aria-label={`Reason for rejecting ${line.item}`}
                className="mt-[7px] h-7 w-full max-w-[380px] animate-sf-slide rounded-[7px] border border-dashed border-bad-fg bg-transparent px-[9px] text-xs text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-70"
              />
            )}
            {over && (
              <div role="alert" className="mt-1.5 text-[11.5px] font-medium text-bad-fg">
                More than this line still has outstanding on the order.
              </div>
            )}
          </>
        )
      },
    },
    ...(['ordered', 'received', 'outstanding'] as const).map(
      (k): LineColumn<PurchaseReceiptLine> => ({
        key: k,
        label: k === 'ordered' ? 'Ordered' : k === 'received' ? 'Already in' : 'Outstanding',
        align: 'right',
        width: k === 'outstanding' ? 100 : 90,
        cellClassName: cn('tnum px-[10px] py-[9px] text-right text-[12.5px]', k === 'outstanding' ? 'font-semibold' : 'text-muted-foreground'),
        cell: (line) => {
          const p = progress.get(line.item)
          const fallback = { ordered: Number(line.qtyOrdered) || 0, received: 0, outstanding: Number(line.qtyOrdered) || 0 }
          return int((p ?? fallback)[k])
        },
      }),
    ),
    {
      key: 'qtyReceived',
      label: 'Receiving now',
      align: 'right',
      width: 118,
      cell: (line, i) => {
        const over = lineOverReceives(line, progress.get(line.item))
        return (
          <input
            type="number"
            min={0}
            data-col="qtyReceived"
            disabled={!editable}
            value={line.qtyReceived}
            onChange={(e) => setLine(i, 'qtyReceived', e.target.value)}
            aria-label={`Receiving now, ${line.item}`}
            aria-invalid={over}
            className={cn(numberInputClass, over && 'border-bad-fg')}
          />
        )
      },
    },
    {
      key: 'qtyRejected',
      label: 'Rejected',
      align: 'right',
      width: 104,
      cell: (line, i) => (
        <input
          type="number"
          min={0}
          data-col="qtyRejected"
          disabled={!editable}
          value={line.qtyRejected}
          onChange={(e) => setLine(i, 'qtyRejected', e.target.value)}
          aria-label={`Rejected, ${line.item}`}
          className={numberInputClass}
        />
      ),
    },
    {
      key: 'value',
      label: 'Value',
      align: 'right',
      width: 130,
      cellClassName: 'tnum px-4 py-[9px] text-right text-[13px] font-medium',
      cell: (line) => money((Number(line.qtyReceived) || 0) * (Number(line.unitCost) || 0)),
    },
  ]

  const summary = [
    {
      label: 'Against',
      value: (
        <span className="flex items-center gap-[9px]">
          <span className="font-mono text-[13.5px] font-semibold">{draft.po || EM_DASH}</span>
          <StatusPill label={order ? order.status : 'Draft'} />
        </span>
      ),
    },
    { label: 'Vendor', value: <span className="text-[13.5px] font-semibold">{vendorName}</span> },
    { label: 'Ordered', value: <span className="tnum text-[13.5px]">{order ? fmtDate(order.orderDate) : EM_DASH}</span> },
    { label: 'Expected', value: <span className="tnum text-[13.5px]">{order?.expectedDate ? fmtDate(order.expectedDate) : EM_DASH}</span> },
  ]

  return (
    <DocumentPage
      pageLabel="Purchase Receipt"
      backTo={BACK_TO}
      header={{
        title: posted ? 'Purchase receipt' : isNew ? 'New purchase receipt' : 'Edit purchase receipt',
        no: draft.no,
        status: draft.status,
        subtitle: posted
          ? 'Posted — stock has moved. Corrections go through a vendor return, never an edit.'
          : `What actually arrived against ${draft.po || 'the order'}. Nothing moves until you post it.`,
        backLabel: BACK_LABEL,
        actions: (
          <button type="button" onClick={openOrder} title="Open the purchase order (O)" className={cn(secondaryButton, 'h-8 flex-none px-[14px] font-semibold')}>
            <FileText className="size-[14px]" strokeWidth={2} />
            Purchase order
          </button>
        ),
      }}
      footerStart={
        editable &&
        !isNew && (
          <button type="button" onClick={cancelReceipt} disabled={busy} className={cn(secondaryButton, 'px-[14px] font-medium text-muted-foreground')}>
            Cancel receipt
          </button>
        )
      }
      footerEnd={
        <>
          <button type="button" onClick={back} className={cn(secondaryButton, 'font-medium')}>
            Back
          </button>
          {editable && (
            <>
              <button type="button" onClick={saveDraft} disabled={busy} className={cn(secondaryButton, 'font-semibold')}>
                Save draft
              </button>
              <button type="button" onClick={postReceipt} disabled={busy} title="Post receipt (Ctrl/Cmd + Enter)" className={primaryButton}>
                <Check className="size-[14px]" strokeWidth={2.4} />
                Post receipt
              </button>
            </>
          )}
        </>
      }
    >
      <div className="flex flex-shrink-0 flex-wrap items-center gap-[18px] rounded-xl border border-border bg-panel px-[18px] py-[13px]">
        {summary.map((s) => (
          <div key={s.label} className="min-w-0">
            <div className="text-[11px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">{s.label}</div>
            <div className="mt-1">{s.value}</div>
          </div>
        ))}
      </div>

      <DocumentCard>
        <div className="grid grid-cols-1 gap-x-[18px] gap-y-[14px] sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Received on" htmlFor="pr-date">
            <input id="pr-date" type="date" disabled={!editable} value={draft.receiptDate} onChange={(e) => patch({ receiptDate: e.target.value })} className={fieldClass} />
          </Field>
          <Field label="Received into" htmlFor="pr-location">
            <select id="pr-location" disabled={!editable} value={draft.location} onChange={(e) => patch({ location: e.target.value })} className={fieldClass}>
              {locationOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Received by" htmlFor="pr-receiver">
            <select
              id="pr-receiver"
              disabled={!editable}
              value={draft.receivedBy ?? ''}
              onChange={(e) => patch({ receivedBy: e.target.value || null })}
              className={fieldClass}
            >
              <option value="">Unassigned</option>
              {receiverOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Vendor challan no." htmlFor="pr-challan">
            <input
              id="pr-challan"
              disabled={!editable}
              value={draft.vendorDocNo}
              onChange={(e) => patch({ vendorDocNo: e.target.value })}
              placeholder="e.g. KCW-1204"
              className={cn(fieldClass, 'font-mono text-[12.5px]')}
            />
          </Field>
        </div>
      </DocumentCard>

      {/* Exception to the line grid: receipt lines come from the order, so no
          add / remove / reorder / select — only the quantities are entered. */}
      <LineGrid
        gridId="purchase-receipt-lines"
        title="What arrived"
        lines={draft.lines}
        columns={columns}
        minWidth={760}
        emptyText="This order has no lines left to receive."
        headerActions={
          editable && (
            <>
              <button
                type="button"
                onClick={clearLines}
                className="hover-lift h-[30px] rounded-lg border border-border bg-card px-3 text-xs font-medium text-muted-foreground hover:bg-tint-12 hover:text-foreground"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={fillOutstanding}
                title="Fill every line with what is still outstanding (F)"
                className="hover-lift inline-flex h-[30px] items-center gap-[7px] rounded-lg border-0 bg-primary px-[13px] text-xs font-semibold text-primary-foreground hover:bg-primary-hover"
              >
                <Download className="size-[13px]" strokeWidth={2} />
                Receive all outstanding
              </button>
            </>
          )
        }
      />

      <div className="grid flex-shrink-0 grid-cols-1 items-start gap-[18px] lg:grid-cols-[1fr_300px]">
        <DocumentCard className="px-4 py-[14px]">
          <NotesBlock entityType="purchaseReceipt" entityNo={draft.no} placeholder="Condition on arrival, who signed the challan, anything worth remembering…" />
        </DocumentCard>
        <TotalsCard
          rows={[
            { label: 'Units received', value: int(prQtyReceived(draft)) },
            ...(rejected > 0 ? [{ label: 'Rejected', value: int(rejected), tone: 'bad' as const }] : []),
          ]}
          total={{ label: 'Value received', value: money(prValue(draft)) }}
        />
      </div>

      {error && <Notice tone="bad">{error}</Notice>}
    </DocumentPage>
  )
}
