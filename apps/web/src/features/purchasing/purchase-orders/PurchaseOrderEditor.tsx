import { useNavigate } from '@tanstack/react-router'
import { Check, ChevronLeft, CircleAlert, Download, Lock, LockOpen, TriangleAlert } from 'lucide-react'
import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { TopBar } from '@/app/shell/TopBar'
import { StatusPill } from '@/components/StatusPill'
import { NotesBlock } from '@/components/notes/NotesBlock'
import type { Settings } from '@/data/api/settings'
import type {
  Employee,
  Item,
  PurchaseOrder,
  PurchasePrice,
  PurchaseReceipt,
  Vendor,
  Warehouse,
} from '@/data/schemas'
import { useList, useUpsert } from '@/data/queries'
import { useSettings } from '@/data/queries/settings'
import { vendorGstTag, vendorGstType, vendorGstTypeInfo } from '@/domain/gst'
import {
  poEditable,
  poLockState,
  poNextNo,
  poOutstandingQty,
  poReceivable,
  poSubtotal,
} from '@/domain/purchase-order'
import {
  canIssue,
  compositionInterState,
  gstSnapshot,
  lockedBannerText,
  newPurchaseOrder,
  priceGuardMessage,
  repriceOrder,
  stampTax,
  taxNote,
} from '@/domain/purchase-order-editing'
import { fmtDate, int, money, todayLocal } from '@/lib/format'
import { cn } from '@/lib/utils'
import { PurchaseOrderLines } from './PurchaseOrderLines'
import { draftStash } from './draft-stash'

const fieldClass =
  'h-[34px] w-full rounded-lg border border-input bg-transparent px-[10px] text-[13px] text-foreground outline-none transition-colors duration-[140ms] focus:border-ring disabled:cursor-not-allowed disabled:opacity-60'
const secondaryButton =
  'hover-lift inline-flex h-[34px] items-center gap-[7px] rounded-lg border border-border bg-card px-4 text-[12.5px] text-foreground hover:bg-tint-12'
const primaryButton =
  'hover-lift inline-flex h-[34px] items-center gap-[7px] rounded-lg border-0 bg-primary px-[18px] text-[12.5px] font-semibold text-primary-foreground hover:bg-primary-hover'

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-[5px] block text-xs font-medium text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  )
}

interface Loaded {
  orders: PurchaseOrder[]
  vendors: Vendor[]
  employees: Employee[]
  items: Item[]
  warehouses: Warehouse[]
  prices: PurchasePrice[]
  receipts: PurchaseReceipt[]
  settings: Settings
}

/** Purchasing ▸ Purchase Orders ▸ document. `routeNo` is an order number or `new`. */
export function PurchaseOrderEditor({ routeNo }: { routeNo: string }) {
  const orders = useList('purchaseOrders')
  const vendors = useList('vendors')
  const employees = useList('employees')
  const items = useList('items')
  const warehouses = useList('warehouses')
  const prices = useList('purchasePrices')
  const receipts = useList('purchaseReceipts')
  const settings = useSettings()

  const queries = [orders, vendors, employees, items, warehouses, prices, receipts, settings]
  const failed = queries.some((q) => q.isError)
  const ready = queries.every((q) => q.data !== undefined)

  if (failed) {
    return (
      <Shell title="Purchase order">
        <Notice tone="bad">
          Could not load this purchase order.{' '}
          <button type="button" className="underline" onClick={() => queries.forEach((q) => q.refetch())}>
            Try again
          </button>
        </Notice>
      </Shell>
    )
  }
  if (!ready) {
    return (
      <Shell title="Purchase order">
        <div className="flex flex-col gap-[18px]" aria-busy="true">
          {[120, 220, 160].map((h) => (
            <div
              key={h}
              style={{ height: h }}
              className="animate-sf-shimmer rounded-xl bg-[linear-gradient(90deg,var(--muted)_25%,var(--border)_37%,var(--muted)_63%)] bg-[length:400%_100%]"
            />
          ))}
        </div>
      </Shell>
    )
  }

  const data: Loaded = {
    orders: orders.data ?? [],
    vendors: vendors.data ?? [],
    employees: employees.data ?? [],
    items: items.data ?? [],
    warehouses: warehouses.data ?? [],
    prices: prices.data ?? [],
    receipts: receipts.data ?? [],
    settings: settings.data as Settings,
  }
  const isNew = routeNo === 'new'
  if (!isNew && !data.orders.some((po) => po.no === routeNo)) {
    return (
      <Shell title="Purchase order">
        <Notice tone="bad">Purchase order {routeNo} was not found. It may have been deleted.</Notice>
      </Shell>
    )
  }
  // Keyed so a different order always starts from a fresh draft.
  return <Editor key={routeNo} routeNo={routeNo} data={data} />
}

function Shell({ title, children }: { title: string; children: ReactNode }) {
  const navigate = useNavigate()
  return (
    <>
    <TopBar pageLabel="Purchase Order" />
    <section data-screen-label="Purchase order" className="flex min-h-0 min-w-0 flex-1 animate-sf-fade flex-col overflow-hidden">
      <div className="flex flex-none items-center gap-3 border-b border-border px-5 py-4">
        <button
          type="button"
          onClick={() => navigate({ to: '/purchasing/purchase-orders' })}
          title="Back to purchase orders"
          aria-label="Back to purchase orders"
          className="hover-lift inline-flex size-8 flex-none items-center justify-center rounded-lg border border-border bg-card text-foreground hover:bg-tint-12"
        >
          <ChevronLeft className="size-[15px]" strokeWidth={2} />
        </button>
        <h1 className="m-0 text-base font-bold tracking-[-0.01em]">{title}</h1>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-5">{children}</div>
    </section>
    </>
  )
}

function Notice({ tone, icon, children }: { tone: 'bad' | 'warn' | 'muted'; icon?: ReactNode; children: ReactNode }) {
  return (
    <div
      role={tone === 'bad' ? 'alert' : 'status'}
      className={cn(
        'flex items-center gap-2 rounded-lg px-[14px] py-[10px] text-[12.5px] font-medium',
        tone === 'bad' && 'bg-bad-bg text-bad-fg',
        tone === 'warn' && 'bg-warn-bg text-warn-fg',
        tone === 'muted' && 'bg-muted text-foreground',
      )}
    >
      {icon ?? (tone === 'bad' ? <CircleAlert className="size-[15px] flex-none" strokeWidth={2} /> : null)}
      <span>{children}</span>
    </div>
  )
}

function Editor({ routeNo, data }: { routeNo: string; data: Loaded }) {
  const navigate = useNavigate()
  const save = useUpsert('purchaseOrders')
  const isNew = routeNo === 'new'
  const today = todayLocal()
  const pricing = useMemo(() => ({ prices: data.prices, settings: data.settings }), [data.prices, data.settings])

  // The starting draft: a stashed one (returning from Purchase Prices), a blank
  // one, or a copy of the saved order. Drafts are re-priced on open.
  const [initial] = useState(() => {
    const stashed = draftStash.peek(routeNo)
    const saved = data.orders.find((po) => po.no === routeNo)
    const base = stashed ?? (isNew ? newPurchaseOrder(poNextNo(data.orders), today) : structuredClone(saved as PurchaseOrder))
    const priced = repriceOrder(base, pricing)
    const repriced = stashed ? 0 : priced.lines.filter((l, i) => Number(l.unitCost) !== Number(base.lines[i].unitCost)).length
    return { draft: priced, repriced }
  })
  const [draft, setDraft] = useState<PurchaseOrder>(initial.draft)
  const [error, setError] = useState('')

  useEffect(() => {
    draftStash.clear(routeNo)
    if (initial.repriced) {
      toast(initial.repriced + (initial.repriced === 1 ? ' line cost' : ' line costs') + ' updated to current prices', {
        description: initial.draft.no + ' · save to keep them',
      })
    }
  }, [initial, routeNo])

  const vendor = data.vendors.find((v) => v.no === draft.vendor)
  const vendorName = vendor?.name ?? draft.vendor
  const editable = poEditable(draft)
  const interState = compositionInterState(draft, vendor, data.warehouses, data.settings)
  const tax = taxNote(draft, vendor, data.settings)
  const gstTag = vendor ? vendorGstTag(vendor) : ''
  const orderReceipts = data.receipts.filter((r) => r.po === draft.no)

  const vendorOptions = data.vendors
    .filter((v) => v.supplies !== 'services' || v.no === draft.vendor)
    .map((v) => ({
      value: v.no,
      label: v.name + (vendorGstType(v) !== 'regular' ? ' · ' + vendorGstTypeInfo(vendorGstType(v)).short : ''),
    }))
  const locationOptions = [
    ...new Set([...data.warehouses.filter((w) => w.status !== 'inactive').map((w) => w.code), draft.location].filter(Boolean)),
  ].map((code) => {
    const site = data.warehouses.find((w) => w.code === code)
    return { value: code, label: site ? `${site.code} · ${site.name}` : code }
  })
  const buyerOptions = data.employees
    .filter((e) => (e.dept === 'Purchasing' && e.status !== 'Terminated') || e.id === draft.buyer)
    .map((e) => ({ value: e.id, label: e.name }))
    .sort((a, b) => a.label.localeCompare(b.label))

  /** Header edits. Changing vendor or order date re-prices every line. */
  const setField = <K extends 'vendor' | 'orderDate' | 'expectedDate' | 'location'>(field: K, value: string) => {
    setError('')
    setDraft((d) => {
      let next: PurchaseOrder = { ...d, [field]: value }
      if (field === 'vendor' || field === 'orderDate') next = repriceOrder(next, pricing)
      if (field === 'vendor') next = stampTax(next, data.vendors.find((v) => v.no === value), data.settings)
      return next
    })
  }

  const back = () => navigate({ to: '/purchasing/purchase-orders' })

  const commit = async (next: PurchaseOrder, title: string) => {
    let order = next
    const v = data.vendors.find((x) => x.no === order.vendor)
    if (order.vendor && !order.taxCalc) order = stampTax(order, v, data.settings)
    if (v) order = { ...order, ...gstSnapshot(v) }
    try {
      await save.mutateAsync(order)
    } catch {
      setError('Could not save the purchase order. Check your connection and try again.')
      return
    }
    toast(title, { description: `${order.no} · ${v?.name ?? order.vendor}` })
    void navigate({ to: '/purchasing/purchase-orders', search: { sel: order.no } })
  }

  const guardPrices = (): boolean => {
    const message = priceGuardMessage(draft, vendorName, pricing)
    if (message) setError(message)
    return !!message
  }

  const saveDraft = () => {
    if (!draft.vendor) return setError('Choose a vendor before saving.')
    if (guardPrices()) return
    void commit(repriceOrder(draft, pricing), 'Purchase order saved')
  }
  const issue = () => {
    if (interState?.block) {
      return setError(
        'A composition vendor can’t supply to another state. Change the ship-to location or the vendor’s registration, or save as a draft.',
      )
    }
    if (!canIssue(draft, interState)) return setError('A vendor and at least one line are required to issue.')
    if (guardPrices()) return
    void commit({ ...repriceOrder(draft, pricing), status: 'Issued', locked: true, reopened: false }, 'Purchase order issued')
  }
  const reopen = () => {
    if (poLockState(draft) !== 'locked') return
    setDraft((d) => ({ ...d, locked: false, reopened: true }))
    toast('Reopened for editing', { description: draft.no + ' · stays open until you lock it' })
  }
  const lockOrder = () => {
    if (draft.status !== 'Issued') return
    if (!draft.vendor || !draft.lines.length) return setError('A vendor and at least one line are required.')
    void commit({ ...draft, locked: true, reopened: false }, 'Purchase order locked')
  }
  const cancelOrder = () => void commit({ ...draft, status: 'Cancelled' }, 'Purchase order cancelled')

  /** Leave for Purchase Prices, keeping this unsaved draft one click away. */
  const openPrices = () => {
    draftStash.put(routeNo, draft)
    void navigate({ to: '/$module/$page', params: { module: 'purchasing', page: 'purchase-prices' } })
    window.setTimeout(
      () =>
        toast('Purchase order kept open', {
          description: draft.no + ' · not saved yet',
          duration: 10_000,
          action: {
            label: 'Back to order',
            onClick: () => navigate({ to: '/purchasing/purchase-orders/$no', params: { no: routeNo } }),
          },
        }),
      0,
    )
  }

  const receive = () => navigate({ to: '/purchasing/purchase-receipts/$no', params: { no: 'new' }, search: { po: draft.no } })

  const showCancel = !isNew && (draft.status === 'Draft' || draft.status === 'Issued' || draft.status === 'Partially received')

  return (
    <>
    <TopBar pageLabel="Purchase Order" />
    <section data-screen-label="Purchase order" className="flex min-h-0 min-w-0 flex-1 animate-sf-fade flex-col overflow-hidden">
      {/* header */}
      <div className="flex flex-none items-center gap-3 border-b border-border px-5 py-4">
        <button
          type="button"
          onClick={back}
          title="Back to purchase orders"
          aria-label="Back to purchase orders"
          className="hover-lift inline-flex size-8 flex-none items-center justify-center rounded-lg border border-border bg-card text-foreground hover:bg-tint-12"
        >
          <ChevronLeft className="size-[15px]" strokeWidth={2} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-[10px]">
            <h1 className="m-0 text-base font-bold tracking-[-0.01em]">{isNew ? 'New purchase order' : 'Edit purchase order'}</h1>
            <span className="flex-none rounded-full bg-muted px-[10px] py-[3px] font-mono text-[12.5px] font-medium whitespace-nowrap text-muted-foreground">
              {draft.no}
            </span>
            <StatusPill label={draft.status} />
          </div>
          <div className="mt-[3px] text-[12.5px] text-muted-foreground">
            Goods-in document · receiving is recorded separately in Purchase Receipts.
          </div>
        </div>
        {poReceivable(draft) && (
          <button type="button" onClick={receive} className={cn(secondaryButton, 'h-8 flex-none px-[14px] font-semibold')}>
            <Download className="size-[14px]" strokeWidth={2} />
            Receive goods
          </button>
        )}
      </div>

      {/* body */}
      <div className="flex min-h-0 flex-1 flex-col gap-[18px] overflow-auto p-5">
        {!editable && (
          <Notice tone="muted" icon={<Lock className="size-[14px] flex-none" strokeWidth={2} />}>
            {lockedBannerText(draft)}
          </Notice>
        )}
        {draft.reopened && editable && (
          <Notice tone="warn" icon={<TriangleAlert className="size-[14px] flex-none" strokeWidth={2} />}>
            Reopened — this order was issued to the vendor. It stays open until you lock it.
          </Notice>
        )}

        <div className="flex-shrink-0 rounded-xl border border-border bg-card px-[18px] py-4">
          <div className="grid grid-cols-1 gap-x-[18px] gap-y-[14px] md:grid-cols-3">
            <div>
              <Field label="Vendor" htmlFor="po-vendor">
                <select
                  id="po-vendor"
                  value={draft.vendor}
                  disabled={!editable}
                  onChange={(e) => setField('vendor', e.target.value)}
                  className={fieldClass}
                >
                  <option value="">Select a vendor…</option>
                  {vendorOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
              {gstTag && vendor && (
                <div className="mt-1.5 flex animate-sf-fade items-center gap-1.5">
                  <span
                    title={vendorGstTypeInfo(vendorGstType(vendor)).desc}
                    className="inline-flex h-5 items-center rounded-full border border-border bg-muted px-2 text-[11px] font-semibold whitespace-nowrap text-muted-foreground"
                  >
                    {gstTag}
                  </span>
                </div>
              )}
              {interState && (
                <div
                  role="status"
                  className={cn(
                    'mt-2 flex animate-sf-slide items-start gap-[7px] rounded-lg px-[10px] py-2 text-xs leading-normal text-pretty',
                    interState.block ? 'bg-bad-bg text-bad-fg' : 'bg-warn-bg text-warn-fg',
                  )}
                >
                  <TriangleAlert className="mt-0.5 size-[13px] flex-none" strokeWidth={2} />
                  <span>
                    Composition dealers can’t make inter-state supplies. This vendor is in {interState.vendorState} and{' '}
                    {interState.location} is in {interState.shipState} — check the vendor’s registration
                    {interState.block ? '. The order can’t be issued until this is fixed.' : '.'}
                  </span>
                </div>
              )}
            </div>
            <Field label="Buyer" htmlFor="po-buyer">
              <select
                id="po-buyer"
                value={draft.buyer ?? ''}
                disabled={!editable}
                onChange={(e) => setDraft((d) => ({ ...d, buyer: e.target.value || null }))}
                className={fieldClass}
              >
                <option value="">Unassigned</option>
                {buyerOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Receiving location" htmlFor="po-location">
              <select
                id="po-location"
                value={draft.location}
                disabled={!editable}
                onChange={(e) => setField('location', e.target.value)}
                className={fieldClass}
              >
                {locationOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Order date" htmlFor="po-order-date">
              <input
                id="po-order-date"
                type="date"
                value={draft.orderDate}
                disabled={!editable}
                onChange={(e) => setField('orderDate', e.target.value)}
                className={fieldClass}
              />
            </Field>
            <Field label="Expected date" htmlFor="po-expected-date">
              <input
                id="po-expected-date"
                type="date"
                value={draft.expectedDate || ''}
                disabled={!editable}
                onChange={(e) => setField('expectedDate', e.target.value)}
                className={fieldClass}
              />
            </Field>
          </div>
        </div>

        <PurchaseOrderLines
          draft={draft}
          vendorName={vendorName}
          items={data.items}
          pricing={pricing}
          today={today}
          onLinesChange={(lines) => {
            setError('')
            setDraft((d) => ({ ...d, lines }))
          }}
          onOpenPrices={openPrices}
        />

        <div className="grid flex-shrink-0 grid-cols-1 items-start gap-[18px] lg:grid-cols-[1fr_300px]">
          <div className="rounded-xl border border-border bg-card px-4 py-[14px]">
            <NotesBlock
              entityType="purchaseOrder"
              entityNo={draft.no}
              placeholder="Add a note to this order — delays, vendor calls, anything the next person needs."
            />
          </div>
          <div className="rounded-xl border border-border bg-card px-4 py-[14px]">
            <div className="flex items-center justify-between py-[5px] text-[13px] text-muted-foreground">
              <span>Subtotal</span>
              <span className="tnum text-foreground">{money(poSubtotal(draft))}</span>
            </div>
            <div className="mt-1.5 flex items-center justify-between border-t border-border pt-[10px] pb-1 text-[15px] font-bold">
              <span>Total</span>
              <span className="tnum">{money(poSubtotal(draft))}</span>
            </div>
            <div className="mt-[10px] border-t border-dashed border-border pt-[9px] text-[11.5px] leading-normal text-pretty text-muted-foreground">
              {tax.text}
            </div>
            {tax.stale && (
              <div role="status" className="mt-2 animate-sf-slide rounded-lg bg-warn-bg px-[10px] py-[9px] text-xs leading-normal text-pretty text-warn-fg">
                <div>{tax.staleText}</div>
                <button
                  type="button"
                  onClick={() => {
                    setDraft((d) => stampTax(d, vendor, data.settings))
                    toast('Tax calculation updated', { description: 'This draft now uses the current method.' })
                  }}
                  className="mt-[7px] h-[26px] rounded-[7px] border border-current bg-transparent px-[10px] text-xs font-semibold text-inherit transition-transform duration-[140ms] hover:-translate-y-px"
                >
                  Use the new method
                </button>
              </div>
            )}
          </div>
        </div>

        {orderReceipts.length > 0 && (
          <div className="flex-shrink-0 overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-[13px]">
              <div className="text-[13px] font-semibold">Receipts against this order</div>
              <div className="tnum text-xs text-muted-foreground">{int(poOutstandingQty(draft, data.receipts))} still to come</div>
            </div>
            <div className="flex flex-col">
              {orderReceipts.map((r, i) => {
                const received = r.lines.reduce((n, l) => n + (Number(l.qtyReceived) || 0), 0)
                const rejected = r.lines.reduce((n, l) => n + (Number(l.qtyRejected) || 0), 0)
                return (
                  <button
                    key={r.no}
                    type="button"
                    onClick={() => navigate({ to: '/purchasing/purchase-receipts/$no', params: { no: r.no } })}
                    className={cn(
                      'flex w-full items-center gap-3 border-0 bg-transparent px-4 py-[11px] text-left text-foreground transition-colors duration-[140ms] hover:bg-tint-7',
                      i > 0 && 'border-t border-border',
                    )}
                  >
                    <span className="w-28 flex-none font-mono text-xs font-medium">{r.no}</span>
                    <StatusPill label={r.status} />
                    <span className="tnum min-w-0 flex-1 text-[12.5px] text-muted-foreground">
                      {int(received)} received{rejected ? ` · ${int(rejected)} rejected` : ''}
                    </span>
                    <span className="flex-none text-[12.5px] text-muted-foreground">{fmtDate(r.receiptDate)}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {error && <Notice tone="bad">{error}</Notice>}
      </div>

      {/* footer */}
      <div className="flex flex-none items-center justify-between gap-3 border-t border-border bg-panel px-5 py-3">
        {showCancel && (
          <button type="button" onClick={cancelOrder} className={cn(secondaryButton, 'px-[14px] font-medium text-muted-foreground')}>
            Cancel order
          </button>
        )}
        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={back} className={cn(secondaryButton, 'font-medium')}>
            Discard
          </button>
          {editable && (
            <button type="button" onClick={saveDraft} disabled={save.isPending} className={cn(secondaryButton, 'font-semibold')}>
              {draft.status === 'Issued' ? 'Save, keep open' : 'Save draft'}
            </button>
          )}
          {draft.status === 'Draft' && (
            <button type="button" onClick={issue} disabled={save.isPending} className={primaryButton}>
              <Check className="size-[14px]" strokeWidth={2.4} />
              Issue purchase order
            </button>
          )}
          {draft.status === 'Issued' && editable && (
            <button type="button" onClick={lockOrder} disabled={save.isPending} className={primaryButton}>
              <Lock className="size-[14px]" strokeWidth={2} />
              Save &amp; lock
            </button>
          )}
          {poLockState(draft) === 'locked' && (
            <button type="button" onClick={reopen} className={cn(secondaryButton, 'px-[18px] font-semibold')}>
              <LockOpen className="size-[14px]" strokeWidth={2} />
              Reopen for editing
            </button>
          )}
        </div>
      </div>
    </section>
    </>
  )
}
