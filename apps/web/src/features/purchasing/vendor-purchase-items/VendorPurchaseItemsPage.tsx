import { useNavigate } from '@tanstack/react-router'
import { Check, ChevronLeft, FileText, Plus, Trash2, X } from 'lucide-react'
import { type KeyboardEvent, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { TopBar } from '@/app/shell/TopBar'
import { StatusPill } from '@/components/StatusPill'
import { DocumentSkeleton, Notice, primaryButton, secondaryButton } from '@/components/document/parts'
import { useList, useRemove, useUpsert } from '@/data/queries'
import type { Item, PurchasePrice } from '@/data/schemas'
import {
  blankPrice,
  normalizePrice,
  priceStatus,
  toPurchasePrice,
  validatePrice,
  vendorPriceRows,
} from '@/domain/purchase-prices'
import { EM_DASH, fmtDate, int, money, todayLocal } from '@/lib/format'
import { cn } from '@/lib/utils'

export interface VendorPurchaseItemsPageProps {
  vendorNo: string
}

const inputClass =
  'h-8 w-full rounded-md border border-input bg-background px-[9px] text-[13px] text-foreground outline-none transition-[border-color] duration-[140ms] focus:border-ring'

/** Purchasing ▸ Vendors ▸ Purchase items — one vendor's price rows with inline add and remove. */
export function VendorPurchaseItemsPage({ vendorNo }: VendorPurchaseItemsPageProps) {
  const navigate = useNavigate()
  const vendors = useList('vendors')
  const items = useList('items')
  const prices = useList('purchasePrices')
  const savePrice = useUpsert('purchasePrices')
  const removePrice = useRemove('purchasePrices')

  const today = useMemo(() => todayLocal(), [])
  const vendor = useMemo(() => (vendors.data ?? []).find((v) => v.no === vendorNo) ?? null, [vendors.data, vendorNo])
  const allPrices = useMemo(() => prices.data ?? [], [prices.data])
  const itemList = useMemo(() => items.data ?? [], [items.data])
  const vendorList = useMemo(() => vendors.data ?? [], [vendors.data])

  const itemByNo = useMemo(() => new Map(itemList.map((i) => [i.no, i])), [itemList])
  const refs = useMemo(
    () => ({
      vendors: new Set(vendorList.map((v) => v.no)),
      items: new Set(itemList.map((i) => i.no)),
    }),
    [vendorList, itemList],
  )
  const rows = useMemo(() => vendorPriceRows(allPrices, vendorNo), [allPrices, vendorNo])

  const [addOpen, setAddOpen] = useState(false)
  const [itemQuery, setItemQuery] = useState('')
  const [pickedItemNo, setPickedItemNo] = useState<string | null>(null)
  const [pickerIdx, setPickerIdx] = useState(0)
  const [qtyInput, setQtyInput] = useState('1')
  const [priceInput, setPriceInput] = useState('')
  const [fromInput, setFromInput] = useState(today)
  const [toInput, setToInput] = useState('')
  const [addErr, setAddErr] = useState('')
  const [saving, setSaving] = useState(false)

  const priceInputRef = useRef<HTMLInputElement>(null)

  const itemOptions = useMemo(() => {
    const q = itemQuery.trim().toLowerCase()
    if (!q) return []
    return itemList.filter((i) => `${i.no} ${i.desc}`.toLowerCase().includes(q)).slice(0, 8)
  }, [itemList, itemQuery])

  const pickedItem = useMemo(
    () => (pickedItemNo ? (itemByNo.get(pickedItemNo) ?? null) : null),
    [pickedItemNo, itemByNo],
  )

  const loading = vendors.isPending || items.isPending || prices.isPending
  const error = vendors.error ?? items.error ?? prices.error

  const backToVendor = () => void navigate({ to: '/purchasing/vendors/$no', params: { no: vendorNo } })
  const openInPurchasePrices = () =>
    void navigate({ to: '/purchasing/purchase-prices', search: { vendor: vendorNo } })

  const openAdd = () => {
    setAddOpen(true)
    setItemQuery('')
    setPickedItemNo(null)
    setPickerIdx(0)
    setQtyInput('1')
    setPriceInput('')
    setFromInput(today)
    setToInput('')
    setAddErr('')
  }

  const closeAdd = () => {
    setAddOpen(false)
    setAddErr('')
  }

  const pickItem = (it: Item) => {
    setPickedItemNo(it.no)
    setItemQuery('')
    setPickerIdx(0)
    setAddErr('')
    window.setTimeout(() => priceInputRef.current?.focus(), 0)
  }

  const confirmAdd = async () => {
    if (saving) return
    if (!pickedItem) {
      setAddErr('Choose an item first.')
      return
    }
    const draft = normalizePrice({
      ...blankPrice(allPrices, today),
      vendor: vendorNo,
      item: pickedItem.no,
      minQty: qtyInput === '' ? 1 : qtyInput,
      price: priceInput,
      effFrom: fromInput || today,
      effTo: toInput || '',
      leadDays: pickedItem.lead ?? null,
    })
    const errors = validatePrice(draft, allPrices, refs, fmtDate)
    const msg = Object.values(errors)[0]
    if (msg) {
      setAddErr(msg)
      return
    }
    const now = new Date().toISOString()
    const record: PurchasePrice = {
      ...toPurchasePrice(draft),
      createdAt: now,
      updatedAt: now,
    }
    setSaving(true)
    try {
      await savePrice.mutateAsync(record)
      setAddOpen(false)
      setAddErr('')
      toast('Price added', { description: `${pickedItem.no} · ${money(record.price)}` })
    } catch {
      setAddErr('Could not save the price. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async (row: PurchasePrice) => {
    try {
      await removePrice.mutateAsync(row.no)
      toast('Price removed', {
        description: `${row.item} · ${money(row.price)}`,
        action: {
          label: 'Undo',
          onClick: () => {
            void savePrice.mutateAsync(row)
          },
        },
      })
    } catch {
      toast('Could not remove the price', { description: 'Check your connection and try again.' })
    }
  }

  const onRowKeyDown = (e: KeyboardEvent<HTMLTableRowElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      closeAdd()
    } else if (e.key === 'Enter' && !(e.target instanceof HTMLButtonElement)) {
      e.preventDefault()
      void confirmAdd()
    }
  }

  const onItemSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const showDropdown = !pickedItem && itemOptions.length > 0
    if (e.key === 'ArrowDown' && showDropdown) {
      e.preventDefault()
      e.stopPropagation()
      setPickerIdx((i) => Math.min(i + 1, itemOptions.length - 1))
    } else if (e.key === 'ArrowUp' && showDropdown) {
      e.preventDefault()
      e.stopPropagation()
      setPickerIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && showDropdown) {
      e.preventDefault()
      e.stopPropagation()
      const choice = itemOptions[Math.min(pickerIdx, itemOptions.length - 1)]
      if (choice) pickItem(choice)
    }
  }

  if (loading || error || !vendor) {
    return (
      <>
        <TopBar pageLabel="Purchase prices" />
        <section
          data-screen-label="Vendor Purchase Items"
          className="flex min-h-0 min-w-0 flex-1 animate-sf-fade flex-col overflow-hidden"
        >
          <div className="flex flex-none items-center gap-3 border-b border-border px-5 py-4">
            <button
              type="button"
              onClick={backToVendor}
              title="Back to vendor"
              aria-label="Back to vendor"
              className="hover-lift inline-flex size-8 flex-none items-center justify-center rounded-lg border border-border bg-card text-foreground hover:bg-tint-12"
            >
              <ChevronLeft className="size-[15px]" strokeWidth={2} />
            </button>
            <h1 className="m-0 text-base font-bold tracking-[-0.01em]">Purchase prices</h1>
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-[18px] overflow-auto p-5">
            {loading && <DocumentSkeleton />}
            {!loading && error && (
              <Notice tone="bad">
                Could not load vendor purchase items.{' '}
                <button
                  type="button"
                  className="underline"
                  onClick={() => void Promise.all([vendors.refetch(), items.refetch(), prices.refetch()])}
                >
                  Try again
                </button>
              </Notice>
            )}
            {!loading && !error && !vendor && (
              <Notice tone="bad">
                Vendor {vendorNo} was not found.{' '}
                <button
                  type="button"
                  className="underline"
                  onClick={() => void navigate({ to: '/purchasing/vendors' })}
                >
                  Back to vendors
                </button>
              </Notice>
            )}
          </div>
        </section>
      </>
    )
  }

  const showTable = rows.length > 0 || addOpen
  const showPicker = !pickedItem && itemOptions.length > 0

  return (
    <>
      <TopBar pageLabel="Purchase prices" />
      <section
        data-screen-label="Vendor Purchase Items"
        className="flex min-h-0 min-w-0 flex-1 animate-sf-fade flex-col overflow-hidden"
      >
        <div className="flex flex-none items-center gap-3 border-b border-border px-5 py-4">
          <button
            type="button"
            onClick={backToVendor}
            title="Back to vendor"
            aria-label="Back to vendor"
            className="hover-lift inline-flex size-8 flex-none items-center justify-center rounded-lg border-0 bg-transparent text-muted-foreground hover:bg-tint-16 hover:text-foreground"
          >
            <ChevronLeft className="size-[18px]" strokeWidth={2} />
          </button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="m-0 text-[17px] font-bold tracking-[-0.01em]">Purchase prices — {vendor.name}</h1>
              <span className="flex-none rounded-full bg-muted px-2.5 py-[3px] font-mono text-[11.5px] font-medium text-muted-foreground">
                {vendor.no}
              </span>
            </div>
            <div className="tnum mt-[3px] text-[12.5px] text-muted-foreground">
              {int(rows.length)} {rows.length === 1 ? 'price' : 'prices'}
            </div>
          </div>
          <div className="flex-1" />
          <button type="button" onClick={openInPurchasePrices} className={secondaryButton}>
            Open in Purchase prices
          </button>
          <button type="button" onClick={openAdd} className={primaryButton}>
            <Plus className="size-[15px]" strokeWidth={2.5} />
            Add price
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto px-5 pb-5">
          {showTable && (
            <table className="mt-4 w-full border-collapse">
              <thead>
                <tr className="border-b border-border text-[11px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">
                  <th className="px-2.5 pb-2 text-left whitespace-nowrap">Item no.</th>
                  <th className="px-2.5 pb-2 text-left whitespace-nowrap">Description</th>
                  <th className="px-2.5 pb-2 text-left whitespace-nowrap">UoM</th>
                  <th className="px-2.5 pb-2 text-right whitespace-nowrap">From qty</th>
                  <th className="px-2.5 pb-2 text-right whitespace-nowrap">Price ₹</th>
                  <th className="px-2.5 pb-2 text-left whitespace-nowrap">Starts</th>
                  <th className="px-2.5 pb-2 text-left whitespace-nowrap">Ends</th>
                  <th className="px-2.5 pb-2 text-left whitespace-nowrap">Status</th>
                  <th className="w-16 pb-2" />
                </tr>
              </thead>
              <tbody>
                {addOpen && (
                  <>
                    <tr
                      onKeyDown={onRowKeyDown}
                      className="animate-sf-fade border-b border-border bg-[color-mix(in_oklab,var(--primary)_6%,transparent)]"
                    >
                      <td className="px-2.5 py-2 align-top font-mono text-[13px] leading-8 whitespace-nowrap text-muted-foreground">
                        {pickedItem ? pickedItem.no : EM_DASH}
                      </td>
                      <td className="relative min-w-[220px] px-2.5 py-2 align-top">
                        <input
                          type="text"
                          autoFocus
                          value={itemQuery}
                          onChange={(e) => {
                            setItemQuery(e.target.value)
                            setPickedItemNo(null)
                            setPickerIdx(0)
                            setAddErr('')
                          }}
                          onKeyDown={onItemSearchKeyDown}
                          placeholder="Search items by no. or description"
                          aria-label="Search items by no. or description"
                          className={inputClass}
                        />
                        {pickedItem && (
                          <div className="mt-1 truncate text-xs text-muted-foreground">{pickedItem.desc}</div>
                        )}
                        {showPicker && (
                          <div
                            role="listbox"
                            aria-label="Matching items"
                            className="absolute top-[42px] left-2.5 z-20 max-h-[220px] min-w-[340px] animate-sf-fade overflow-auto rounded-lg border border-border bg-card shadow-pop"
                          >
                            {itemOptions.map((o, idx) => (
                              <button
                                key={o.no}
                                type="button"
                                role="option"
                                aria-selected={idx === pickerIdx}
                                onMouseEnter={() => setPickerIdx(idx)}
                                onClick={() => pickItem(o)}
                                className={cn(
                                  'flex w-full items-center gap-2 border-0 border-b border-border px-2.5 py-2 text-left text-[12.5px] text-foreground transition-colors duration-[120ms] last:border-b-0 hover:bg-muted focus:bg-muted focus:outline-none',
                                  idx === pickerIdx ? 'bg-muted' : 'bg-transparent',
                                )}
                              >
                                <span className="flex-none font-mono whitespace-nowrap text-muted-foreground">
                                  {o.no}
                                </span>
                                <span className="truncate">{o.desc}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-2.5 py-2 align-top font-mono text-[13px] leading-8 whitespace-nowrap text-muted-foreground">
                        {pickedItem ? pickedItem.uom : EM_DASH}
                      </td>
                      <td className="w-24 px-2.5 py-2 align-top">
                        <input
                          type="number"
                          min={1}
                          step={1}
                          value={qtyInput}
                          onChange={(e) => setQtyInput(e.target.value)}
                          aria-label="From qty"
                          className={cn(inputClass, 'tnum text-right')}
                        />
                      </td>
                      <td className="w-[120px] px-2.5 py-2 align-top">
                        <input
                          ref={priceInputRef}
                          type="number"
                          min={0}
                          step="0.01"
                          placeholder="0.00"
                          value={priceInput}
                          onChange={(e) => setPriceInput(e.target.value)}
                          aria-label="Price"
                          className={cn(inputClass, 'tnum text-right')}
                        />
                      </td>
                      <td className="w-[150px] px-2.5 py-2 align-top">
                        <input
                          type="date"
                          value={fromInput}
                          onChange={(e) => setFromInput(e.target.value)}
                          aria-label="Starts"
                          className={inputClass}
                        />
                      </td>
                      <td className="w-[150px] px-2.5 py-2 align-top">
                        <input
                          type="date"
                          value={toInput}
                          onChange={(e) => setToInput(e.target.value)}
                          aria-label="Ends"
                          className={inputClass}
                        />
                      </td>
                      <td className="px-2.5 py-2 align-top text-[12.5px] leading-8 text-muted-foreground">New</td>
                      <td className="px-2.5 py-2 text-center align-top whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => void confirmAdd()}
                          disabled={saving}
                          title="Save (Enter)"
                          aria-label="Save price"
                          className="hover-lift inline-flex size-7 items-center justify-center rounded-md border-0 bg-transparent text-muted-foreground hover:bg-ok-bg hover:text-ok-fg disabled:opacity-50"
                        >
                          <Check className="size-4" strokeWidth={2.2} />
                        </button>
                        <button
                          type="button"
                          onClick={closeAdd}
                          title="Cancel (Esc)"
                          aria-label="Cancel add price"
                          className="hover-lift inline-flex size-7 items-center justify-center rounded-md border-0 bg-transparent text-muted-foreground hover:bg-bad-bg hover:text-bad-fg"
                        >
                          <X className="size-[15px]" strokeWidth={2} />
                        </button>
                      </td>
                    </tr>
                    {addErr && (
                      <tr>
                        <td colSpan={9} role="alert" className="px-2.5 pt-1 pb-2 text-xs text-bad-fg">
                          {addErr}
                        </td>
                      </tr>
                    )}
                  </>
                )}

                {rows.map((r) => {
                  const item = itemByNo.get(r.item)
                  return (
                    <tr
                      key={r.no}
                      className="border-b border-border transition-colors duration-[120ms] hover:bg-muted"
                    >
                      <td className="px-2.5 py-[11px] font-mono text-[12.5px] font-semibold whitespace-nowrap">
                        {r.item}
                      </td>
                      <td className="px-2.5 py-[11px] text-[13px]">{item?.desc ?? EM_DASH}</td>
                      <td className="px-2.5 py-[11px] font-mono text-[12.5px] text-muted-foreground">
                        {item?.uom ?? EM_DASH}
                      </td>
                      <td className="tnum px-2.5 py-[11px] text-right text-[13px] text-muted-foreground">
                        {int(r.minQty)}
                      </td>
                      <td className="tnum px-2.5 py-[11px] text-right text-[13px] font-semibold">
                        {money(r.price)}
                      </td>
                      <td className="tnum px-2.5 py-[11px] text-[12.5px] whitespace-nowrap text-muted-foreground">
                        {r.effFrom ? fmtDate(r.effFrom) : 'Always'}
                      </td>
                      <td className="tnum px-2.5 py-[11px] text-[12.5px] whitespace-nowrap text-muted-foreground">
                        {r.effTo ? fmtDate(r.effTo) : 'Open-ended'}
                      </td>
                      <td className="px-2.5 py-[11px]">
                        <StatusPill label={priceStatus(r, today)} />
                      </td>
                      <td className="px-2.5 py-[11px] text-center">
                        <button
                          type="button"
                          onClick={() => void handleRemove(r)}
                          title="Remove this price"
                          aria-label="Remove this price"
                          className="hover-lift inline-flex size-[26px] items-center justify-center rounded-md border-0 bg-transparent text-muted-foreground hover:bg-bad-bg hover:text-bad-fg"
                        >
                          <Trash2 className="size-[15px]" strokeWidth={1.8} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}

          {!showTable && (
            <div role="status" className="flex flex-col items-center justify-center gap-3 px-5 py-20 text-center">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <FileText className="size-[26px]" strokeWidth={1.8} />
              </div>
              <div className="text-[15px] font-semibold">No purchase items yet</div>
              <div className="max-w-[320px] text-[13px] text-pretty text-muted-foreground">
                Add the items you buy from {vendor.name} and record the price you&apos;re purchasing them at.
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  )
}
