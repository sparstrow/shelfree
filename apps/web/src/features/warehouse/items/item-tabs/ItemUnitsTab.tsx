import { Lock, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { StatusPill } from '@/components/StatusPill'
import { Notice, primaryButton, secondaryButton } from '@/components/document/parts'
import { HelpTarget } from '@/components/help/HelpTarget'
import type { HelpMap } from '@/components/help/types'
import { Skeleton } from '@/components/ui/skeleton'
import { useList, useRecord, useRestoreItemUnits, useUpdateItemUnits } from '@/data/queries'
import type { ItemUnitSet } from '@/data/schemas'
import {
  allUnits,
  buildItemUnitSummary,
  categoryName,
  formatFactor,
  itemUomDefault,
  itemUomNormalize,
} from '@/domain/units-of-measure'
import { int } from '@/lib/format'
import { cn } from '@/lib/utils'

const ITEM_UOM_HELP: HelpMap = {
  base: {
    title: 'Base unit of measure',
    body: 'Stock, costs and prices are held in this unit. Choose from the units added to this item.',
  },
  masterPack: {
    title: 'Master pack unit of measure',
    body: 'Chosen automatically as the largest non-base unit on this item. Add a pack unit with a conversion above 1 base unit to set it.',
  },
  itemUnits: {
    title: 'Item units',
    body: 'Units this item can buy, pack or sell in. The master pack is chosen automatically as the unit holding the most base units.',
  },
  conversion: {
    title: 'Conversion',
    body: 'For pack units like Box or Carton, enter how many base units each holds. Units with a fixed factor (e.g. Dozen) convert automatically.',
  },
  empty: {
    title: 'No units yet',
    body: 'Add a unit from the list to define how this item is stocked and packed.',
  },
}

interface ConversionQtyInputProps {
  code: string
  base: string
  storedQty: number | null
  onCommit: (qty: number | null) => Promise<void>
}

function ConversionQtyInput({ code, base, storedQty, onCommit }: ConversionQtyInputProps) {
  const [draft, setDraft] = useState<string | null>(null)
  const [error, setError] = useState('')
  const value = draft !== null ? draft : storedQty != null ? String(storedQty) : ''

  return (
    <div className="inline-flex flex-col">
      <span className="inline-flex items-center gap-1.5">
        <span className="text-[12.5px] text-muted-foreground">=</span>
        <input
          type="number"
          min="0"
          step="any"
          aria-label={`Conversion for ${code}`}
          aria-invalid={!!error}
          placeholder="Qty"
          value={value}
          onFocus={() => setDraft(storedQty != null ? String(storedQty) : '')}
          onChange={(e) => {
            if (e.currentTarget.validity.badInput) return
            const raw = e.target.value
            setDraft(raw)
            if (raw.trim() === '') {
              setError('')
              void onCommit(null)
              return
            }
            const num = Number(raw)
            if (!Number.isFinite(num) || num <= 0) {
              setError('Enter a number above zero.')
              return
            }
            setError('')
            void onCommit(num)
          }}
          onBlur={() => {
            if (!error) setDraft(null)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation()
              setDraft(null)
              setError('')
              e.currentTarget.blur()
            } else if (e.key === 'Enter') {
              e.currentTarget.blur()
            }
          }}
          className={cn(
            'tnum h-7 w-20 rounded-md border bg-transparent px-2 text-right text-xs outline-none focus:border-ring',
            error ? 'border-bad-fg' : 'border-input',
          )}
        />
        <span className="font-mono text-xs font-semibold text-muted-foreground">{base}</span>
      </span>
      {error && (
        <span role="alert" className="mt-0.5 text-[11px] font-medium text-bad-fg">
          {error}
        </span>
      )}
    </div>
  )
}

export interface ItemUnitsTabProps {
  itemNo: string
  baseUom: string
}

export function ItemUnitsTab({ itemNo, baseUom }: ItemUnitsTabProps) {
  const itemUnitQuery = useRecord('itemUnits', itemNo)
  const customUnitsQuery = useList('unitsOfMeasure')
  const updateUnits = useUpdateItemUnits()
  const restoreUnits = useRestoreItemUnits()

  const [pickerOpen, setPickerOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [actionError, setActionError] = useState('')

  const customUnits = useMemo(() => customUnitsQuery.data ?? [], [customUnitsQuery.data])
  const units = useMemo(() => allUnits(customUnits), [customUnits])

  const currentSet = useMemo(
    () => itemUomNormalize(itemUnitQuery.data ?? itemUomDefault(itemNo, baseUom), units),
    [itemUnitQuery.data, itemNo, baseUom, units],
  )
  const summary = useMemo(() => buildItemUnitSummary(currentSet, units), [currentSet, units])

  const baseChoices = useMemo(
    () =>
      summary.rows.map((r) => ({
        code: r.code,
        label: r.name && r.name !== '—' ? `${r.code} — ${r.name}` : r.code,
      })),
    [summary.rows],
  )

  const filteredChoices = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return summary.availableToAdd
    return summary.availableToAdd.filter(
      (u) =>
        u.code.toLowerCase().includes(q) ||
        u.name.toLowerCase().includes(q) ||
        u.uqc.toLowerCase().includes(q),
    )
  }, [query, summary.availableToAdd])

  if (itemUnitQuery.isError || customUnitsQuery.isError) {
    return (
      <Notice tone="bad">
        Could not load item units.{' '}
        <button
          type="button"
          onClick={() => {
            void itemUnitQuery.refetch()
            void customUnitsQuery.refetch()
          }}
          className="underline"
        >
          Try again
        </button>
      </Notice>
    )
  }

  if (itemUnitQuery.data === undefined || customUnitsQuery.data === undefined) {
    return (
      <div aria-busy="true" aria-label="Loading item units" className="flex flex-col gap-4">
        <Skeleton className="h-[88px] w-full rounded-xl" />
        <Skeleton className="h-[220px] w-full rounded-xl" />
      </div>
    )
  }

  const handleAdd = async (code: string) => {
    setActionError('')
    setPickerOpen(false)
    setQuery('')
    try {
      await updateUnits.mutateAsync({ itemNo, action: { type: 'add', code } })
      toast.success('Unit added to item', { description: `${code} · ${itemNo}` })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not add unit.'
      setActionError(msg)
      toast.error('Could not add unit', { description: msg })
    }
  }

  const handleRemove = async (code: string) => {
    setActionError('')
    const prevSnapshot: ItemUnitSet = structuredClone(currentSet)
    try {
      await updateUnits.mutateAsync({ itemNo, action: { type: 'remove', code } })
      toast('Unit removed', {
        description: `${code} · ${itemNo}`,
        action: {
          label: 'Undo',
          onClick: () => {
            void restoreUnits.mutateAsync([prevSnapshot]).catch(() => {
              toast.error('Could not restore unit', { description: 'Check your connection and try again.' })
            })
          },
        },
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not remove unit.'
      setActionError(msg)
      toast.error('Could not remove unit', { description: msg })
    }
  }

  const handleSetBase = async (code: string) => {
    setActionError('')
    try {
      await updateUnits.mutateAsync({ itemNo, action: { type: 'setBase', code } })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not change base unit.'
      setActionError(msg)
      toast.error('Could not change base unit', { description: msg })
    }
  }

  const handleSetQty = async (code: string, qty: number | null) => {
    setActionError('')
    try {
      await updateUnits.mutateAsync({ itemNo, action: { type: 'setQty', code, qty } })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not update conversion.'
      setActionError(msg)
    }
  }

  return (
    <div className="flex animate-sf-fade flex-col gap-4">
      {actionError && <Notice tone="bad">{actionError}</Notice>}

      <section aria-label="Base and master pack" className="rounded-xl border border-border bg-card px-[18px] py-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="group/row">
            <div className="mb-[5px]">
              <HelpTarget help={ITEM_UOM_HELP.base} label="Base unit of measure">
                <label htmlFor="item-uom-base" className="text-xs font-medium text-muted-foreground">
                  Base unit of measure
                </label>
              </HelpTarget>
            </div>
            <select
              id="item-uom-base"
              value={summary.base}
              disabled={baseChoices.length === 0}
              onChange={(e) => void handleSetBase(e.target.value)}
              className="h-[34px] w-full rounded-lg border border-input bg-card px-[10px] text-[13px] text-foreground outline-none focus:border-ring disabled:cursor-not-allowed disabled:opacity-60"
            >
              {baseChoices.map((o) => (
                <option key={o.code} value={o.code}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="group/row">
            <div className="mb-[5px]">
              <HelpTarget help={ITEM_UOM_HELP.masterPack} label="Master pack unit of measure">
                <span className="text-xs font-medium text-muted-foreground">Master pack unit of measure</span>
              </HelpTarget>
            </div>
            <div className="flex h-[34px] items-center gap-2 rounded-lg border border-input bg-tint-7/40 px-[10px]">
              {summary.pack ? (
                <>
                  <span className="inline-flex h-[17px] flex-none items-center gap-1 rounded-full bg-info-bg px-1.5 text-[9.5px] font-bold tracking-[0.04em] text-info-fg uppercase">
                    <Lock className="size-[9px]" strokeWidth={2.5} />
                    Auto
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{summary.packLabel}</span>
                  {summary.packSize != null && (
                    <span className="tnum flex-none font-mono text-[11.5px] font-semibold text-muted-foreground">
                      = {formatFactor(summary.packSize)} {summary.base}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <Lock className="size-[13px] flex-none text-muted-foreground opacity-70" strokeWidth={2.2} />
                  <span className="min-w-0 flex-1 truncate text-[13px] text-muted-foreground">Not set yet</span>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Item units" className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="group/row flex flex-wrap items-center justify-between gap-3 border-b border-border px-[18px] py-[13px]">
          <div>
            <HelpTarget help={ITEM_UOM_HELP.itemUnits} label="Item units">
              <h2 className="m-0 text-[13px] font-semibold">Item units</h2>
            </HelpTarget>
            <div className="mt-0.5 text-[11.5px] text-muted-foreground">
              {int(summary.rows.length)} {summary.rows.length === 1 ? 'unit' : 'units'} on this item
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setPickerOpen((open) => !open)
              setQuery('')
            }}
            disabled={summary.availableToAdd.length === 0}
            className={cn(primaryButton, 'h-8 px-3')}
          >
            <Plus className="size-3.5" strokeWidth={2.5} />
            Add unit
          </button>
        </div>

        {pickerOpen && (
          <div className="border-b border-border bg-tint-7/40 px-[18px] py-3">
            <div className="mb-2 flex items-center gap-2">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    e.stopPropagation()
                    setPickerOpen(false)
                  }
                }}
                placeholder="Search units by code, name or UQC…"
                aria-label="Search units to add"
                autoFocus
                className="h-8 flex-1 rounded-lg border border-input bg-card px-2.5 text-[13px] outline-none focus:border-ring"
              />
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                className={cn(secondaryButton, 'h-8 px-3 text-xs')}
              >
                Cancel
              </button>
            </div>
            {filteredChoices.length > 0 ? (
              <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
                {filteredChoices.map((u) => (
                  <button
                    key={u.code}
                    type="button"
                    onClick={() => void handleAdd(u.code)}
                    className="hover-lift inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-xs hover:border-ring hover:bg-muted"
                  >
                    <span className="font-mono font-semibold">{u.code}</span>
                    <span className="text-muted-foreground">{u.name}</span>
                    <span className="text-[11px] text-muted-foreground">({categoryName(u.cat)})</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-1 text-xs text-muted-foreground">No matching units available to add.</div>
            )}
          </div>
        )}

        {summary.rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border bg-panel text-[11px] font-semibold tracking-[0.02em] text-muted-foreground">
                  <th className="px-[18px] py-2 text-left">Code</th>
                  <th className="px-3.5 py-2 text-left">Name</th>
                  <th className="px-3.5 py-2 text-left">Category</th>
                  <th className="px-3.5 py-2 text-left">UQC</th>
                  <th className="group/row px-3.5 py-2 text-left">
                    <HelpTarget help={ITEM_UOM_HELP.conversion} label="Conversion">
                      Conversion
                    </HelpTarget>
                  </th>
                  <th className="px-3.5 py-2 text-left">Role</th>
                  <th className="w-[52px] px-3.5 py-2 text-right">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {summary.rows.map((r) => (
                  <tr
                    key={r.code}
                    className="border-b border-border text-[12.5px] transition-colors duration-100 last:border-b-0 hover:bg-muted/40"
                  >
                    <td className="px-[18px] py-2.5 font-mono font-semibold">{r.code}</td>
                    <td className="px-3.5 py-2.5 font-medium">{r.name}</td>
                    <td className="px-3.5 py-2.5 text-muted-foreground">{r.catName}</td>
                    <td className="px-3.5 py-2.5">
                      <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                        {r.uqc}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5">
                      {r.isBase ? (
                        <span className="text-xs text-muted-foreground">Base unit</span>
                      ) : r.isFixed ? (
                        <span
                          title="Fixed in Settings · Units of measure"
                          className="tnum inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-muted-foreground"
                        >
                          <Lock className="size-2.5 opacity-65" strokeWidth={2.4} />= {formatFactor(r.qtyInBase ?? 1)}{' '}
                          {r.base}
                        </span>
                      ) : (
                        <ConversionQtyInput
                          key={`${itemNo}-${r.code}-${r.base}`}
                          code={r.code}
                          base={r.base}
                          storedQty={r.qtyInBase}
                          onCommit={(qty) => handleSetQty(r.code, qty)}
                        />
                      )}
                    </td>
                    <td className="px-3.5 py-2.5">
                      <StatusPill
                        label={r.role}
                        tone={r.role === 'Base' ? 'info' : r.role === 'Master pack' ? 'ok' : 'neutral'}
                      />
                    </td>
                    <td className="px-3.5 py-2.5 text-right">
                      <button
                        type="button"
                        aria-label={`Remove ${r.code}`}
                        title="Remove from item"
                        onClick={() => void handleRemove(r.code)}
                        className="inline-flex size-7 items-center justify-center rounded-md border-0 bg-transparent text-muted-foreground transition-colors duration-100 hover:bg-bad-bg hover:text-bad-fg"
                      >
                        <Trash2 className="size-3.5" strokeWidth={2} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="group/row flex justify-center px-6 py-10 text-center">
            <HelpTarget help={ITEM_UOM_HELP.empty} label="No units yet" reveal="always">
              <span className="text-[13px] font-semibold">No units yet</span>
            </HelpTarget>
          </div>
        )}
      </section>
    </div>
  )
}
