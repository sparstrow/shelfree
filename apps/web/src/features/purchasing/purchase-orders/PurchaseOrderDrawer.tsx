import { ExternalLink, PackageCheck, Trash2, X } from 'lucide-react'
import { StatusPill } from '@/components/StatusPill'
import type { PurchaseOrder } from '@/data/schemas'
import { poLineCount, poLineTotal, poReceivable, poSubtotal } from '@/domain/purchase-order'
import { EM_DASH, fmtDate, int, money } from '@/lib/format'

export interface PurchaseOrderDrawerProps {
  po: PurchaseOrder
  vendorName: string
  buyerName: string
  canDelete: boolean
  onClose: () => void
  onOpen: () => void
  onReceive: () => void
  onDelete: () => void
}

function Stat({ value, label, divider }: { value: string; label: string; divider?: boolean }) {
  return (
    <div className={divider ? 'flex-1 border-l border-border text-center' : 'flex-1 text-center'}>
      <div className="tnum text-base font-bold">{value}</div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{label}</div>
    </div>
  )
}

/** Read-only preview of the selected purchase order, beside the grid. */
export function PurchaseOrderDrawer({
  po,
  vendorName,
  buyerName,
  canDelete,
  onClose,
  onOpen,
  onReceive,
  onDelete,
}: PurchaseOrderDrawerProps) {
  const expected = po.expectedDate ? fmtDate(po.expectedDate) : EM_DASH
  const facts = [
    { k: 'Order date', v: fmtDate(po.orderDate) },
    { k: 'Expected date', v: expected },
    { k: 'Receiving location', v: po.location || EM_DASH },
    { k: 'Buyer', v: buyerName || 'Unassigned' },
    { k: 'Lines', v: int(poLineCount(po)) },
    { k: 'Total', v: money(poSubtotal(po)) },
  ]

  return (
    <aside
      aria-label={`Purchase order ${po.no}`}
      className="flex w-[336px] flex-none animate-sf-fade flex-col overflow-hidden rounded-[10px] border border-border bg-card"
    >
      <div className="flex items-start gap-2 border-b border-border px-[14px] pt-[13px] pb-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[13px] font-semibold">{po.no}</span>
            <StatusPill label={po.status} />
          </div>
          <div className="mt-1 text-sm leading-[1.3] font-semibold">{vendorName}</div>
          <div className="mt-0.5 text-[12.5px] text-muted-foreground">
            Ordered {fmtDate(po.orderDate)} · {po.location || EM_DASH}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          title="Close (Esc)"
          aria-label="Close preview"
          className="hover-lift flex size-[26px] flex-none items-center justify-center rounded-[7px] border-0 bg-transparent text-muted-foreground hover:bg-tint-16 hover:text-foreground"
        >
          <X className="size-[14px]" strokeWidth={2} />
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="flex gap-2 border-b border-border px-[14px] py-3">
          <Stat value={money(poSubtotal(po))} label="Total" />
          <Stat value={int(poLineCount(po))} label="Lines" divider />
          <Stat value={expected} label="Expected" divider />
        </div>

        <div className="px-[14px] pt-[14px] pb-1">
          <div className="mb-[9px] text-[11px] font-semibold tracking-[0.05em] text-muted-foreground">LINES</div>
          <div className="flex flex-col gap-2">
            {po.lines.length === 0 && <div className="text-[12.5px] text-muted-foreground">No lines yet.</div>}
            {po.lines.map((line, i) => (
              <div
                key={line.item + i}
                className="flex justify-between gap-[10px] border-b border-dashed border-border py-[5px] text-[12.5px]"
              >
                <span className="min-w-0">
                  <span className="font-mono text-[11.5px] text-muted-foreground">{line.item}</span> · {line.desc}{' '}
                  <span className="text-muted-foreground">×{int(line.qty)}</span>
                </span>
                <span className="tnum flex-none text-right font-medium">{money(poLineTotal(line))}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="px-[14px] pt-2 pb-[14px]">
          <div className="my-1.5 text-[11px] font-semibold tracking-[0.05em] text-muted-foreground">DETAILS</div>
          {facts.map((fact) => (
            <div
              key={fact.k}
              className="flex justify-between gap-[10px] border-b border-dashed border-border py-[5px] text-[12.5px]"
            >
              <span className="text-muted-foreground">{fact.k}</span>
              <span className="tnum text-right font-medium">{fact.v}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-border px-3 py-[10px]">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onOpen}
            className="hover-lift inline-flex h-[30px] flex-1 items-center justify-center gap-1.5 rounded-lg border-0 bg-primary text-[12.5px] font-semibold text-primary-foreground hover:bg-primary-hover"
          >
            <ExternalLink className="size-[13px]" strokeWidth={2} />
            Open purchase order
          </button>
          {poReceivable(po) && (
            <button
              type="button"
              onClick={onReceive}
              title="Record a goods-in receipt against this order"
              className="hover-lift inline-flex h-[30px] flex-none items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3 text-[12.5px] font-semibold text-foreground hover:bg-tint-12"
            >
              <PackageCheck className="size-[13px]" strokeWidth={2} />
              Receive
            </button>
          )}
          <button
            type="button"
            onClick={onDelete}
            disabled={!canDelete}
            title={canDelete ? 'Delete purchase order' : 'Only draft orders can be deleted'}
            aria-label="Delete purchase order"
            className="hover-lift inline-flex h-[30px] w-[34px] flex-none items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:border-bad-fg hover:bg-bad-bg hover:text-bad-fg disabled:pointer-events-none disabled:opacity-40"
          >
            <Trash2 className="size-[14px]" strokeWidth={2} />
          </button>
        </div>
      </div>
    </aside>
  )
}
