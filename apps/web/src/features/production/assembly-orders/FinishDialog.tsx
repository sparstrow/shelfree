import { Check } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Notice, numberInputClass, primaryButton, secondaryButton } from '@/components/document/parts'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { AssemblyOrder, Item, Warehouse } from '@/data/schemas'
import { aoPlannedConsumptionForQty, aoRemainingQty } from '@/domain/assembly-order'
import { aoSiteName } from '@/domain/production'
import { int } from '@/lib/format'
import { cn } from '@/lib/utils'

export interface FinishDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: AssemblyOrder
  items: readonly Item[]
  warehouses: readonly Warehouse[]
  mainLocId: string
  manualConsumption: boolean
  pending: boolean
  onSubmit: (input: { qtyFinished: number; consumed?: Record<string, number> }) => Promise<string | null>
}

interface FinishBodyProps {
  order: AssemblyOrder
  items: readonly Item[]
  warehouses: readonly Warehouse[]
  mainLocId: string
  manualConsumption: boolean
  pending: boolean
  onClose: () => void
  onSubmit: (input: { qtyFinished: number; consumed?: Record<string, number> }) => Promise<string | null>
}

function FinishDialogBody({
  order,
  items,
  warehouses,
  mainLocId,
  manualConsumption,
  pending,
  onClose,
  onSubmit,
}: FinishBodyProps) {
  const remaining = aoRemainingQty(order)
  const [qtyText, setQtyText] = useState(() => String(remaining))
  const [consumedOverrides, setConsumedOverrides] = useState<Record<string, number>>({})
  const [error, setError] = useState('')

  const qtyNum = Math.max(0, Number.parseFloat(qtyText) || 0)
  const siteId = order.location || mainLocId
  const siteName = aoSiteName(siteId, warehouses)

  const previews = useMemo(
    () =>
      aoPlannedConsumptionForQty(
        order,
        qtyNum,
        items,
        mainLocId,
        manualConsumption ? consumedOverrides : undefined,
      ),
    [order, qtyNum, items, mainLocId, manualConsumption, consumedOverrides],
  )

  const shortLines = useMemo(() => previews.filter((p) => p.short > 0), [previews])

  async function handleConfirm() {
    setError('')
    const consumedMap = manualConsumption
      ? Object.fromEntries(previews.map((p) => [p.item, p.consumed]))
      : undefined
    const problem = await onSubmit({ qtyFinished: qtyNum, consumed: consumedMap })
    if (problem) setError(problem)
  }

  return (
    <DialogContent className="flex max-h-[78vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[560px]">
      <DialogHeader className="border-b border-border px-[18px] pt-4 pb-[14px]">
        <DialogTitle className="text-[15px] font-bold">Finish assembly order</DialogTitle>
        <DialogDescription className="text-[12.5px] leading-normal text-muted-foreground">
          {manualConsumption
            ? 'Consumption is set to manual — correct these quantities to match what was actually used.'
            : `Components are backflushed automatically from ${siteName}.`}
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-wrap items-center gap-3 border-b border-border px-[18px] py-[14px]">
        <label htmlFor="ao-finish-qty" className="flex-none text-[12.5px] font-medium text-muted-foreground">
          Quantity finished
        </label>
        <input
          id="ao-finish-qty"
          type="number"
          min="0"
          max={remaining}
          step="1"
          value={qtyText}
          onChange={(e) => {
            setQtyText(e.target.value)
            setConsumedOverrides({})
            setError('')
          }}
          className={cn(numberInputClass, 'h-[34px] w-[120px]')}
        />
        <span className="tnum text-[12.5px] text-muted-foreground">
          of {int(order.qty)}
          {order.qtyFinished > 0 ? ` (${int(remaining)} remaining)` : ''}
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-[18px] pt-3 pb-4">
        <div className="mb-2 text-[11px] font-semibold tracking-[0.05em] text-muted-foreground">
          COMPONENTS CONSUMED
        </div>
        {previews.map((line) => (
          <div
            key={`${line.lineNo}-${line.item}`}
            className="flex items-center gap-[10px] border-b border-dashed border-border py-[7px] last:border-b-0"
          >
            <div className="min-w-0 flex-1 text-[12.5px]">
              <div className="truncate">
                <span className="font-mono text-[11.5px] text-muted-foreground">{line.item}</span> · {line.desc}
              </div>
              {line.short > 0 && (
                <div className="tnum mt-0.5 text-[11px] font-medium text-bad-fg">
                  Available {int(line.available)} {line.uom} · short {int(line.short)} {line.uom}
                </div>
              )}
            </div>
            {manualConsumption && (
              <input
                aria-label={`Consumed ${line.item}`}
                type="number"
                min="0"
                step="0.001"
                value={consumedOverrides[line.item] ?? line.planned}
                onChange={(e) => {
                  const val = Math.max(0, Number.parseFloat(e.target.value) || 0)
                  setConsumedOverrides((prev) => ({ ...prev, [line.item]: val }))
                  setError('')
                }}
                className={cn(numberInputClass, 'h-[30px] w-24 flex-none text-[12.5px]')}
              />
            )}
            <span className="tnum flex-none text-[12.5px] font-medium whitespace-nowrap">
              {int(line.consumed)} {line.uom}
            </span>
          </div>
        ))}

        {error && (
          <div className="mt-3">
            <Notice tone="bad">{error}</Notice>
          </div>
        )}
        {!error && shortLines.length > 0 && (
          <div className="mt-3">
            <Notice tone="warn">
              Short {int(shortLines[0].short)} × {shortLines[0].desc} at {siteName} — receive or transfer stock before posting.
            </Notice>
          </div>
        )}
      </div>

      <DialogFooter className="mx-0 mb-0 flex flex-row justify-end gap-2 border-t border-border bg-panel px-4 py-3 sm:justify-end">
        <button type="button" onClick={onClose} className={cn(secondaryButton, 'h-8 px-[14px]')}>
          Cancel
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => void handleConfirm()}
          className={cn(primaryButton, 'h-8 px-4')}
        >
          <Check className="size-[13px]" strokeWidth={2.4} />
          Post output
        </button>
      </DialogFooter>
    </DialogContent>
  )
}

/** Finish dialog: posts partial or full output and consumes components at the order location. */
export function FinishDialog({
  open,
  onOpenChange,
  order,
  items,
  warehouses,
  mainLocId,
  manualConsumption,
  pending,
  onSubmit,
}: FinishDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <FinishDialogBody
          order={order}
          items={items}
          warehouses={warehouses}
          mainLocId={mainLocId}
          manualConsumption={manualConsumption}
          pending={pending}
          onClose={() => onOpenChange(false)}
          onSubmit={onSubmit}
        />
      )}
    </Dialog>
  )
}
