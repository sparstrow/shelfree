import { useRouter } from '@tanstack/react-router'
import { CopyPlus, ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react'
import { type KeyboardEvent, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { StatusPill } from '@/components/StatusPill'
import { CellEditor } from '@/components/data-grid/CellEditor'
import { Notice, fieldClass, primaryButton, secondaryButton } from '@/components/document/parts'
import { useList, useRemove, useUpsert } from '@/data/queries'
import { useSalesPricingSettings } from '@/data/queries/sales-production-settings'
import type { Customer, CustomerPrice } from '@/data/schemas'
import {
  type CustomerPriceEditableKey,
  type CustomerPriceRow,
  blankCustomerPrice,
  commitCustomerPriceCell,
  customerPriceStatus,
  isCustomerPricingEligible,
  normalizeCustomerPrice,
  priceDeltaVsListText,
  sellableItems,
  startCustomerPriceTier,
  toCustomerPrice,
  validCustomerPrices,
  validateCustomerPrice,
} from '@/domain/sales-prices'
import { EM_DASH, fmtDate, int, money, todayLocal } from '@/lib/format'
import { cn } from '@/lib/utils'

export interface CustomerPricesTabProps {
  customer: Customer
}

const EDIT_KEYS: readonly CustomerPriceEditableKey[] = ['minQty', 'price', 'effFrom', 'effTo']

const EDIT_META: Record<
  'minQty' | 'price' | 'effFrom' | 'effTo',
  { kind: 'number' | 'date'; label: string; align: 'left' | 'right'; step?: string; min?: string }
> = {
  minQty: { kind: 'number', label: 'From qty', align: 'right', step: '1', min: '1' },
  price: { kind: 'number', label: 'Price ₹', align: 'right', step: '0.01', min: '0' },
  effFrom: { kind: 'date', label: 'Starts', align: 'left' },
  effTo: { kind: 'date', label: 'Ends', align: 'left' },
}

/** Sales ▸ Customers ▸ profile ▸ Sales prices tab. */
export function CustomerPricesTab({ customer }: CustomerPricesTabProps) {
  const router = useRouter()
  const pricesQuery = useList('customerPrices')
  const itemsQuery = useList('items')
  const customersQuery = useList('customers')
  const savePrice = useUpsert('customerPrices')
  const removePrice = useRemove('customerPrices')
  const saveCustomer = useUpsert('customers')
  const pricingSettings = useSalesPricingSettings()

  const today = useMemo(() => todayLocal(), [])
  const [draft, setDraft] = useState<CustomerPriceRow | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [cell, setCell] = useState<{ id: string; key: CustomerPriceEditableKey } | null>(null)

  const itemList = useMemo(() => itemsQuery.data ?? [], [itemsQuery.data])
  const customerList = useMemo(() => customersQuery.data ?? [], [customersQuery.data])
  const rawPrices = useMemo(() => pricesQuery.data ?? [], [pricesQuery.data])

  const allPrices = useMemo(
    () => validCustomerPrices(rawPrices, customerList, itemList),
    [rawPrices, customerList, itemList],
  )
  const customerPrices = useMemo(
    () =>
      allPrices
        .filter((r) => r.customer === customer.no)
        .sort(
          (a, b) =>
            a.item.localeCompare(b.item) || (Number(a.minQty) || 1) - (Number(b.minQty) || 1),
        ),
    [allPrices, customer.no],
  )

  const selectableItems = useMemo(() => sellableItems(itemList), [itemList])
  const itemByNo = useMemo(() => new Map(itemList.map((i) => [i.no, i])), [itemList])
  const refs = useMemo(
    () => ({
      customers: new Set(customerList.map((c) => c.no)),
      items: new Set(itemList.map((i) => i.no)),
    }),
    [customerList, itemList],
  )

  const eligible = isCustomerPricingEligible(customer, pricingSettings)

  // Esc closes the inline price draft before RecordPage treats it as "back to list".
  useEffect(() => {
    if (!draft) return
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        setDraft(null)
        setErrors({})
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [draft])

  const startNew = () => {
    setCell(null)
    setDraft(blankCustomerPrice(rawPrices, today, { customer: customer.no }))
    setErrors({})
  }

  const startTier = (row: CustomerPrice) => {
    setCell(null)
    setDraft(startCustomerPriceTier(row, rawPrices))
    setErrors({})
  }

  const cancelDraft = () => {
    setDraft(null)
    setErrors({})
  }

  const saveDraft = async () => {
    if (!draft || saving) return
    const normalized = normalizeCustomerPrice(draft)
    const problems = validateCustomerPrice(normalized, rawPrices, refs)
    if (Object.keys(problems).length) {
      setDraft(normalized)
      setErrors(problems)
      return
    }
    const saved = toCustomerPrice(normalized)
    setSaving(true)
    try {
      await savePrice.mutateAsync(saved)
      toast('Customer price added', {
        description: `${saved.item} · ${money(saved.price)}`,
      })
      setDraft(null)
      setErrors({})
    } catch {
      toast('Could not save price', { description: 'Check your connection and try again.' })
    } finally {
      setSaving(false)
    }
  }

  const onDraftKeyDown = (e: KeyboardEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
      void saveDraft()
    }
  }

  const finishCell = async (
    row: CustomerPrice,
    key: CustomerPriceEditableKey,
    value: string | null,
    move: 1 | -1 | 0,
  ) => {
    if (move !== 0) {
      const idx = EDIT_KEYS.indexOf(key)
      const nextKey = EDIT_KEYS[idx + move]
      setCell(nextKey ? { id: row.id, key: nextKey } : null)
    } else {
      setCell(null)
    }
    if (value === null) return

    const res = commitCustomerPriceCell(
      row,
      key,
      value,
      rawPrices.filter((p) => p.id !== row.id),
      refs,
    )
    if (res.kind === 'error') {
      toast('Not saved', { description: res.message })
      return
    }
    if (res.kind === 'saved') {
      try {
        await savePrice.mutateAsync(res.row)
        toast('Customer price saved', {
          description: `${res.row.item} · ${money(res.row.price)}`,
        })
      } catch {
        toast('Not saved', { description: 'Check your connection and try again.' })
      }
    }
  }

  const removeRow = async (row: CustomerPrice) => {
    if (saving) return
    setSaving(true)
    try {
      await removePrice.mutateAsync(row.id)
      toast('Customer price removed', {
        description: `${row.item} · ${money(row.price)}`,
        action: {
          label: 'Undo',
          onClick: () => {
            savePrice.mutate(row)
          },
        },
      })
    } catch {
      toast('Could not remove price', { description: 'Check your connection and try again.' })
    } finally {
      setSaving(false)
    }
  }

  const toggleEligible = async () => {
    if (saveCustomer.isPending) return
    try {
      const next = await saveCustomer.mutateAsync({
        ...customer,
        pricingEligible: !customer.pricingEligible,
      })
      toast(next.pricingEligible ? 'Customer pricing turned on' : 'Customer pricing turned off', {
        description: `${next.no} · ${next.name}`,
      })
    } catch {
      toast('Could not update pricing eligibility', { description: 'Check your connection and try again.' })
    }
  }

  const openInSalesPrices = () => {
    router.history.push(`/sales/sales-prices?customer=${encodeURIComponent(customer.no)}`)
  }

  const draftItemPool =
    draft?.item && !selectableItems.some((i) => i.no === draft.item)
      ? [...selectableItems, ...itemList.filter((i) => i.no === draft.item)]
      : selectableItems
  const draftListPrice = draft?.item ? (itemByNo.get(draft.item)?.price ?? 0) : 0

  return (
    <div className="animate-sf-fade">
      <div className="mb-[11px] flex flex-wrap items-center gap-2.5">
        <span className="text-[13px] font-semibold">Agreed prices</span>
        <span className="tnum text-xs text-muted-foreground">
          {customerPrices.length
            ? `${int(customerPrices.length)} ${customerPrices.length === 1 ? 'agreed price' : 'agreed prices'}`
            : 'No agreed prices yet'}
        </span>
        <StatusPill label={eligible ? 'On customer pricing' : 'List price'} tone={eligible ? 'ok' : 'neutral'} />
        <div className="min-w-3 flex-1" />
        {pricingSettings.mode === 'selected' && (
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-medium">
            <span>Own agreed prices</span>
            <button
              type="button"
              role="switch"
              aria-checked={!!customer.pricingEligible}
              aria-label="Own agreed prices"
              disabled={saveCustomer.isPending}
              onClick={() => void toggleEligible()}
              className={cn(
                'relative inline-flex h-[18px] w-8 flex-none items-center rounded-full border-0 p-0 transition-colors duration-[160ms] disabled:opacity-50',
                customer.pricingEligible ? 'bg-primary' : 'bg-input',
              )}
            >
              <span
                className={cn(
                  'absolute size-[14px] rounded-full bg-background shadow-base transition-transform duration-[160ms]',
                  customer.pricingEligible ? 'translate-x-[16px]' : 'translate-x-[2px]',
                )}
              />
            </button>
          </label>
        )}
        <button
          type="button"
          onClick={startNew}
          className={cn(primaryButton, 'h-[30px] px-[13px]')}
        >
          <Plus className="size-3.5" strokeWidth={2.2} />
          New price
        </button>
        <button
          type="button"
          onClick={openInSalesPrices}
          className={cn(secondaryButton, 'h-[30px] px-3')}
        >
          <ExternalLink className="size-[13px]" strokeWidth={2} />
          Open in Sales prices
        </button>
      </div>

      {!eligible && (
        <div className="mb-3">
          <Notice tone="muted">
            This customer is currently billed each item’s list price. Turn on Own agreed prices above to apply rows listed here.
          </Notice>
        </div>
      )}

      {draft && (
        <div className="mb-3 animate-sf-fade rounded-xl border border-primary bg-card px-4 py-[15px]">
          <div className="mb-[11px] flex items-center justify-between gap-2">
            <span className="text-[12.5px] font-semibold">New agreed price</span>
            {draft.item && (
              <span className="tnum text-xs text-muted-foreground">
                List {money(draftListPrice)}
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-6">
            <div className="sm:col-span-2">
              <label htmlFor="cp-tab-item" className="mb-[5px] block text-xs text-muted-foreground">
                Item
              </label>
              <select
                id="cp-tab-item"
                autoFocus
                value={draft.item}
                onChange={(e) => {
                  const v = e.target.value
                  setDraft((d) => (d ? { ...d, item: v } : d))
                  setErrors((prev) => ({ ...prev, item: '' }))
                }}
                onKeyDown={onDraftKeyDown}
                aria-invalid={!!errors.item}
                className={cn(fieldClass, 'h-8', errors.item && 'border-bad-fg')}
              >
                <option value="">Select an item…</option>
                {draftItemPool.map((it) => (
                  <option key={it.no} value={it.no}>
                    {it.no} — {it.desc}
                  </option>
                ))}
              </select>
              {errors.item && (
                <div role="alert" className="mt-1 animate-sf-slide text-[11.5px] font-medium text-bad-fg">
                  {errors.item}
                </div>
              )}
            </div>

            <div>
              <label htmlFor="cp-tab-minQty" className="mb-[5px] block text-xs text-muted-foreground">
                From qty
              </label>
              <input
                id="cp-tab-minQty"
                type="number"
                min="1"
                step="1"
                value={String(draft.minQty)}
                onChange={(e) => {
                  const v = e.target.value
                  setDraft((d) => (d ? { ...d, minQty: v } : d))
                  setErrors((prev) => ({ ...prev, minQty: '' }))
                }}
                onKeyDown={onDraftKeyDown}
                aria-invalid={!!errors.minQty}
                className={cn(fieldClass, 'tnum h-8 text-right', errors.minQty && 'border-bad-fg')}
              />
              {errors.minQty && (
                <div role="alert" className="mt-1 animate-sf-slide text-[11.5px] font-medium text-bad-fg">
                  {errors.minQty}
                </div>
              )}
            </div>

            <div>
              <label htmlFor="cp-tab-price" className="mb-[5px] block text-xs text-muted-foreground">
                Price ₹
              </label>
              <input
                id="cp-tab-price"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={String(draft.price)}
                onChange={(e) => {
                  const v = e.target.value
                  setDraft((d) => (d ? { ...d, price: v } : d))
                  setErrors((prev) => ({ ...prev, price: '' }))
                }}
                onKeyDown={onDraftKeyDown}
                aria-invalid={!!errors.price}
                className={cn(fieldClass, 'tnum h-8 text-right', errors.price && 'border-bad-fg')}
              />
              {errors.price && (
                <div role="alert" className="mt-1 animate-sf-slide text-[11.5px] font-medium text-bad-fg">
                  {errors.price}
                </div>
              )}
            </div>

            <div>
              <label htmlFor="cp-tab-effFrom" className="mb-[5px] block text-xs text-muted-foreground">
                Starts
              </label>
              <input
                id="cp-tab-effFrom"
                type="date"
                value={draft.effFrom}
                onChange={(e) => {
                  const v = e.target.value
                  setDraft((d) => (d ? { ...d, effFrom: v } : d))
                  setErrors((prev) => ({ ...prev, effFrom: '' }))
                }}
                onKeyDown={onDraftKeyDown}
                aria-invalid={!!errors.effFrom}
                className={cn(fieldClass, 'h-8', errors.effFrom && 'border-bad-fg')}
              />
              {errors.effFrom && (
                <div role="alert" className="mt-1 animate-sf-slide text-[11.5px] font-medium text-bad-fg">
                  {errors.effFrom}
                </div>
              )}
            </div>

            <div>
              <label htmlFor="cp-tab-effTo" className="mb-[5px] block text-xs text-muted-foreground">
                Ends
              </label>
              <input
                id="cp-tab-effTo"
                type="date"
                value={draft.effTo}
                onChange={(e) => {
                  const v = e.target.value
                  setDraft((d) => (d ? { ...d, effTo: v } : d))
                  setErrors((prev) => ({ ...prev, effTo: '' }))
                }}
                onKeyDown={onDraftKeyDown}
                aria-invalid={!!errors.effTo}
                className={cn(fieldClass, 'h-8', errors.effTo && 'border-bad-fg')}
              />
              {errors.effTo && (
                <div role="alert" className="mt-1 animate-sf-slide text-[11.5px] font-medium text-bad-fg">
                  {errors.effTo}
                </div>
              )}
            </div>

            <div className="sm:col-span-6">
              <label htmlFor="cp-tab-note" className="mb-[5px] block text-xs text-muted-foreground">
                Note
              </label>
              <input
                id="cp-tab-note"
                type="text"
                value={draft.note}
                onChange={(e) => {
                  const v = e.target.value
                  setDraft((d) => (d ? { ...d, note: v } : d))
                }}
                onKeyDown={onDraftKeyDown}
                placeholder="Agreement, festival season, bulk tier…"
                className={cn(fieldClass, 'h-8')}
              />
            </div>
          </div>

          <div className="mt-[13px] flex justify-end gap-2">
            <button type="button" onClick={cancelDraft} className={cn(secondaryButton, 'h-[30px] px-3')}>
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveDraft()}
              className="hover-lift inline-flex h-[30px] items-center rounded-lg border-0 bg-primary px-3.5 text-[12.5px] font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[920px] border-collapse">
          <thead>
            <tr className="h-[38px] border-b border-border bg-tint-7 text-left text-[11px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">
              <th className="w-[120px] px-4 font-semibold">Item no.</th>
              <th className="px-2.5 font-semibold">Description</th>
              <th className="w-[96px] px-2.5 text-right font-semibold">From qty</th>
              <th className="w-[116px] px-2.5 text-right font-semibold">Price ₹</th>
              <th className="w-[88px] px-2.5 text-right font-semibold">vs list</th>
              <th className="w-[136px] px-2.5 font-semibold">Starts</th>
              <th className="w-[136px] px-2.5 font-semibold">Ends</th>
              <th className="w-[106px] px-2.5 font-semibold">Status</th>
              <th className="w-[84px] px-4 text-right font-semibold">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {customerPrices.map((r) => {
              const it = itemByNo.get(r.item)
              const listPrice = it?.price ?? 0
              const status = customerPriceStatus(r, today)
              const renderCell = (key: 'minQty' | 'price' | 'effFrom' | 'effTo', display: string) => {
                const meta = EDIT_META[key]
                const editing = cell?.id === r.id && cell.key === key
                if (editing) {
                  return (
                    <CellEditor
                      kind={meta.kind}
                      step={meta.step}
                      min={meta.min}
                      initial={String(r[key] ?? '')}
                      label={`${r.item} ${meta.label}`}
                      align={meta.align}
                      onFinish={(val, move) => void finishCell(r, key, val, move)}
                    />
                  )
                }
                return (
                  <button
                    type="button"
                    data-col-key={key}
                    onClick={() => setCell({ id: r.id, key })}
                    title="Click to edit"
                    className={cn(
                      'group/edit inline-flex h-7 w-full items-center gap-1.5 rounded-md border border-transparent px-1.5 text-[12.5px] transition-colors duration-[140ms] hover:border-input hover:bg-tint-7',
                      meta.align === 'right' ? 'tnum justify-end text-right' : 'justify-start text-left',
                      (key === 'effFrom' && !r.effFrom) || (key === 'effTo' && !r.effTo)
                        ? 'text-muted-foreground'
                        : 'text-foreground',
                    )}
                  >
                    <span className="truncate">{display}</span>
                    <Pencil
                      aria-hidden
                      className="size-[10px] flex-none text-muted-foreground opacity-0 transition-opacity duration-[140ms] group-hover/edit:opacity-70"
                      strokeWidth={2}
                    />
                  </button>
                )
              }

              return (
                <tr
                  key={r.id}
                  className="h-12 border-b border-border text-[12.5px] transition-colors duration-[140ms] last:border-b-0 hover:bg-tint-7"
                >
                  <td className="px-4 font-mono text-[11.5px] font-semibold">{r.item}</td>
                  <td className="max-w-[260px] truncate px-2.5" title={it?.desc || r.item}>
                    {it?.desc || EM_DASH}
                  </td>
                  <td className="px-1.5">{renderCell('minQty', int(r.minQty || 1))}</td>
                  <td className="px-1.5 font-semibold">{renderCell('price', money(r.price))}</td>
                  <td className="tnum px-2.5 text-right text-muted-foreground">
                    {priceDeltaVsListText(r.price, listPrice)}
                  </td>
                  <td className="px-1.5">{renderCell('effFrom', r.effFrom ? fmtDate(r.effFrom) : 'Always')}</td>
                  <td className="px-1.5">{renderCell('effTo', r.effTo ? fmtDate(r.effTo) : 'Open-ended')}</td>
                  <td className="px-2.5">
                    <StatusPill label={status} />
                  </td>
                  <td className="px-4">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        aria-label={`Add quantity tier for ${r.item}`}
                        title="Add a quantity tier"
                        onClick={() => startTier(r)}
                        className="hover-lift flex size-[26px] items-center justify-center rounded-[7px] border border-input bg-transparent text-muted-foreground hover:bg-tint-10 hover:text-foreground"
                      >
                        <CopyPlus className="size-3" strokeWidth={2} />
                      </button>
                      <button
                        type="button"
                        aria-label={`Remove ${r.id}`}
                        title="Remove this price"
                        disabled={saving}
                        onClick={() => void removeRow(r)}
                        className="hover-lift flex size-[26px] items-center justify-center rounded-[7px] border border-input bg-transparent text-muted-foreground hover:border-bad-fg hover:bg-bad-bg hover:text-bad-fg disabled:opacity-50"
                      >
                        <Trash2 className="size-3" strokeWidth={2} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {customerPrices.length === 0 && !draft && (
          <div className="px-6 py-10 text-center">
            <div className="text-sm font-semibold">No agreed prices for this customer</div>
            <div className="mx-auto mt-1.5 max-w-[400px] text-[12.5px] text-pretty text-muted-foreground">
              They pay the item’s list price until a row is added here.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
