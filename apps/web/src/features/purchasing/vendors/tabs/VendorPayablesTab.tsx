import { useMemo } from 'react'
import { toast } from 'sonner'
import { RecordCard } from '@/components/record-page/RecordPage'
import { useList, useUpsert } from '@/data/queries'
import type { Vendor } from '@/data/schemas'
import {
  VENDOR_BLOCK_OPTIONS,
  type VendorBlocked,
  applyVendorBlocked,
  vendorBlockToast,
  vendorBlocked,
  vendorPayables,
} from '@/domain/vendor'
import { EM_DASH, money } from '@/lib/format'
import { cn } from '@/lib/utils'

export interface VendorPayablesTabProps {
  vendor: Vendor
}

/** Vendor profile — Payables & blocking tab (derived balances, blocking radio, purchase budget). */
export function VendorPayablesTab({ vendor }: VendorPayablesTabProps) {
  const orders = useList('purchaseOrders')
  const receipts = useList('purchaseReceipts')
  const upsert = useUpsert('vendors')

  const payables = useMemo(
    () => vendorPayables(vendor, orders.data ?? [], receipts.data ?? []),
    [vendor, orders.data, receipts.data],
  )
  const blocked = vendorBlocked(vendor)

  const aging = [
    { label: 'Not yet due', value: payables.notYetDue, barClass: 'bg-primary' },
    { label: 'Due now', value: payables.dueNow, barClass: 'bg-warn-fg' },
    { label: 'Overdue', value: payables.overdue, barClass: 'bg-bad-fg' },
  ]
  const agMax = Math.max(1, ...aging.map((a) => a.value))

  const payFacts = [
    { k: 'Balance', v: money(payables.balance) },
    { k: 'Received, not yet billed', v: money(payables.grni) },
    { k: 'Payment terms', v: vendor.paymentTerms || EM_DASH },
    { k: 'Payment method', v: vendor.paymentMethod || EM_DASH },
    { k: 'Currency', v: vendor.currency || 'INR' },
  ]

  const budgetBarClass =
    payables.budgetPct > 100 ? 'bg-bad-fg' : payables.budgetPct > 85 ? 'bg-warn-fg' : 'bg-primary'

  const pickBlocked = async (val: VendorBlocked) => {
    if (blocked === val || upsert.isPending) return
    try {
      await upsert.mutateAsync(applyVendorBlocked(vendor, val))
      const msg = vendorBlockToast(vendor.no, val)
      toast(msg.title, { description: msg.description })
    } catch {
      toast('Could not update vendor', { description: 'Check your connection and try again.' })
    }
  }

  return (
    <div className="grid animate-sf-fade grid-cols-[repeat(auto-fit,minmax(320px,1fr))] items-start gap-4">
      <RecordCard title="Payables">
        {aging.map((b) => (
          <div key={b.label} className="mb-3 flex items-center gap-3">
            <span className="w-24 flex-none text-[12.5px] text-muted-foreground">{b.label}</span>
            <span className="h-2 flex-1 overflow-hidden rounded bg-muted">
              <span
                className={cn('block h-full rounded transition-[width] duration-300', b.barClass)}
                style={{ width: `${Math.round((b.value / agMax) * 100)}%` }}
              />
            </span>
            <span className="tnum w-[104px] flex-none text-right text-[12.5px] font-semibold">{money(b.value)}</span>
          </div>
        ))}
        <div className="mt-1">
          {payFacts.map((f) => (
            <div key={f.k} className="flex justify-between gap-3 border-b border-dashed border-border py-[9px] text-[13px]">
              <span className="text-muted-foreground">{f.k}</span>
              <span className="tnum min-w-0 truncate text-right font-semibold">{f.v}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 text-[11.5px] leading-normal text-pretty text-muted-foreground">
          Balances are the vendor record’s running figures. Real payables — vendor bills, payments, debit notes, bill-level aging — arrive with purchase finance.
        </div>
      </RecordCard>

      <div className="flex flex-col gap-4">
        <RecordCard title="Blocking">
          <div role="radiogroup" aria-label="Blocking" className="flex flex-col gap-2">
            {VENDOR_BLOCK_OPTIONS.map((opt) => {
              const sel = blocked === opt.value
              const danger = opt.value !== ''
              return (
                <button
                  key={opt.value || 'none'}
                  type="button"
                  role="radio"
                  aria-checked={sel}
                  disabled={upsert.isPending}
                  onClick={() => void pickBlocked(opt.value)}
                  className={cn(
                    'flex w-full items-start gap-[11px] rounded-[9px] border px-3 py-[11px] text-left text-foreground transition-[background-color,border-color,transform] duration-[140ms] hover:-translate-y-px',
                    sel
                      ? danger
                        ? 'border-bad-fg bg-bad-bg'
                        : 'border-primary bg-[color-mix(in_oklab,var(--primary)_8%,transparent)]'
                      : 'border-border bg-transparent hover:bg-tint-7',
                  )}
                >
                  <span
                    className={cn(
                      'mt-0.5 size-[14px] flex-none rounded-full transition-[border] duration-[140ms]',
                      sel ? (danger ? 'border-4 border-bad-fg' : 'border-4 border-primary') : 'border-[1.5px] border-input',
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold">{opt.label}</span>
                    <span className="mt-0.5 block text-[11.5px] text-pretty text-muted-foreground">{opt.desc}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </RecordCard>

        <RecordCard title="Purchase budget">
          <div className="flex items-baseline justify-between gap-2.5 text-[12.5px]">
            <span className="text-muted-foreground">
              {payables.budget
                ? `${money(payables.committed)} committed of ${money(payables.budget)}`
                : 'No purchase budget set — add one while editing.'}
            </span>
            <span className="tnum font-bold">{payables.budget ? `${payables.budgetPct}%` : ''}</span>
          </div>
          <div className="mt-[9px] h-2 overflow-hidden rounded bg-muted">
            <span
              className={cn('block h-full rounded transition-[width] duration-300', budgetBarClass)}
              style={{ width: `${Math.min(100, payables.budgetPct)}%` }}
            />
          </div>
          <div className="mt-2.5 text-[11.5px] leading-normal text-pretty text-muted-foreground">
            Committed = issued, received and closed orders. Drafts and cancelled orders don’t count.
          </div>
        </RecordCard>
      </div>
    </div>
  )
}
