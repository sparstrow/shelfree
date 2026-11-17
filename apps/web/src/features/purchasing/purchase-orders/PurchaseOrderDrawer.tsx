import { Download, ExternalLink, Trash2 } from 'lucide-react'
import {
  RecordDrawer,
  drawerDangerIconButton,
  drawerPrimaryButton,
  drawerSecondaryButton,
} from '@/components/record-drawer/RecordDrawer'
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
  return (
    <RecordDrawer
      ariaLabel={`Purchase order ${po.no}`}
      no={po.no}
      status={po.status}
      title={vendorName}
      subtitle={`Ordered ${fmtDate(po.orderDate)} · ${po.location || EM_DASH}`}
      stats={[
        { value: money(poSubtotal(po)), label: 'Total' },
        { value: int(poLineCount(po)), label: 'Lines' },
        { value: expected, label: 'Expected' },
      ]}
      linesHeading="LINES"
      linesEmptyText="No lines yet."
      lines={po.lines.map((line, i) => ({
        key: line.item + i,
        left: (
          <>
            <span className="font-mono text-[11.5px] text-muted-foreground">{line.item}</span> · {line.desc}{' '}
            <span className="text-muted-foreground">×{int(line.qty)}</span>
          </>
        ),
        right: money(poLineTotal(line)),
      }))}
      facts={[
        { k: 'Order date', v: fmtDate(po.orderDate) },
        { k: 'Expected date', v: expected },
        { k: 'Receiving location', v: po.location || EM_DASH },
        { k: 'Buyer', v: buyerName || 'Unassigned' },
        { k: 'Lines', v: int(poLineCount(po)) },
        { k: 'Total', v: money(poSubtotal(po)) },
      ]}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onOpen} className={drawerPrimaryButton}>
            <ExternalLink className="size-[13px]" strokeWidth={2} />
            Open purchase order
          </button>
          {poReceivable(po) && (
            <button
              type="button"
              onClick={onReceive}
              title="Record a goods-in receipt against this order (R)"
              className={drawerSecondaryButton}
            >
              <Download className="size-[13px]" strokeWidth={2} />
              Receive
            </button>
          )}
          <button
            type="button"
            onClick={onDelete}
            disabled={!canDelete}
            title={canDelete ? 'Delete purchase order' : 'Only draft orders can be deleted'}
            aria-label="Delete purchase order"
            className={drawerDangerIconButton}
          >
            <Trash2 className="size-[14px]" strokeWidth={2} />
          </button>
        </>
      }
    />
  )
}
