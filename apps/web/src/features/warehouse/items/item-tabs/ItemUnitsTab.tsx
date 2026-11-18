import { Lock, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { StatusPill } from '@/components/StatusPill'
import { primaryButton, secondaryButton } from '@/components/document/parts'
import {
  type ItemUomState,
  addItemUom,
  buildItemUomSummary,
  defaultItemUomState,
  removeItemUom,
  setItemUomBase,
  setItemUomQty,
  uomCatName,
} from '@/domain/item-profile'
import { int } from '@/lib/format'
import { cn } from '@/lib/utils'

export interface ItemUnitsTabProps {
  baseUom: string
}

export function ItemUnitsTab({ baseUom }: ItemUnitsTabProps) {
  const [uomState, setUomState] = useState<ItemUomState>(() => defaultItemUomState(baseUom))
  const [pickerOpen, setPickerOpen] = useState(false)
  const [query, setQuery] = useState('')

  const summary = useMemo(() => buildItemUomSummary(uomState), [uomState])
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

  return (
    <div className="flex animate-sf-fade flex-col gap-4">
      <section aria-label="Base and master pack" className="rounded-xl border border-border bg-card px-[18px] py-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="item-uom-base" className="mb-[5px] block text-xs font-medium text-muted-foreground">
              Base unit of measure
            </label>
            <select
              id="item-uom-base"
              value={summary.base}
              disabled={baseChoices.length === 0}
              onChange={(e) => setUomState((prev) => setItemUomBase(prev, e.target.value))}
              className="h-[34px] w-full rounded-lg border border-input bg-card px-[10px] text-[13px] text-foreground outline-none focus:border-ring disabled:cursor-not-allowed disabled:opacity-60"
            >
              {baseChoices.map((o) => (
                <option key={o.code} value={o.code}>
                  {o.label}
                </option>
              ))}
            </select>
            <div className="mt-[5px] text-[11px] leading-snug text-muted-foreground">
              Stock, costs and prices are held in this unit.
            </div>
          </div>

          <div>
            <div className="mb-[5px] text-xs font-medium text-muted-foreground">Master pack unit of measure</div>
            <div
              title="Chosen automatically — the largest unit added to this item"
              className="flex h-[34px] items-center gap-2 rounded-lg border border-input bg-tint-7/40 px-[10px]"
            >
              {summary.pack ? (
                <>
                  <span className="inline-flex h-[17px] flex-none items-center gap-1 rounded-full bg-info-bg px-1.5 text-[9.5px] font-bold tracking-[0.04em] text-info-fg uppercase">
                    <Lock className="size-[9px]" strokeWidth={2.5} />
                    Auto
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{summary.packLabel}</span>
                  {summary.packSize != null && (
                    <span className="tnum flex-none font-mono text-[11.5px] font-semibold text-muted-foreground">
                      = {summary.packSize} {summary.base}
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
            <div className="mt-[5px] text-[11px] leading-snug text-muted-foreground">
              {summary.pack
                ? 'Chosen automatically — the largest non-base unit on this item.'
                : 'Add a larger pack unit with a conversion to set a master pack automatically.'}
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Item units" className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-[18px] py-[13px]">
          <div>
            <h2 className="m-0 text-[13px] font-semibold">Item units</h2>
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
                    onClick={() => {
                      setUomState((prev) => addItemUom(prev, u.code))
                      setPickerOpen(false)
                      setQuery('')
                    }}
                    className="hover-lift inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-xs hover:border-ring hover:bg-muted"
                  >
                    <span className="font-mono font-semibold">{u.code}</span>
                    <span className="text-muted-foreground">{u.name}</span>
                    <span className="text-[11px] text-muted-foreground">({uomCatName(u.cat)})</span>
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
                  <th className="px-3.5 py-2 text-left">Conversion</th>
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
                          title="Fixed conversion"
                          className="tnum inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-muted-foreground"
                        >
                          <Lock className="size-2.5 opacity-65" strokeWidth={2.4} />
                          = {r.qtyInBase} {r.base}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5">
                          <span className="text-[12.5px] text-muted-foreground">=</span>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            aria-label={`Conversion for ${r.code}`}
                            placeholder="Qty"
                            value={r.qtyInBase ?? ''}
                            onChange={(e) => {
                              const raw = e.target.value
                              const next = raw === '' ? null : Number(raw)
                              setUomState((prev) => setItemUomQty(prev, r.code, next))
                            }}
                            className="tnum h-7 w-20 rounded-md border border-input bg-transparent px-2 text-right text-xs outline-none focus:border-ring"
                          />
                          <span className="font-mono text-xs font-semibold text-muted-foreground">{r.base}</span>
                        </span>
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
                        onClick={() => setUomState((prev) => removeItemUom(prev, r.code))}
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
          <div className="px-6 py-10 text-center">
            <div className="text-[13px] font-semibold">No units yet</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Add a unit from the list to define how this item is stocked and packed.
            </div>
          </div>
        )}

        <div className="border-t border-border px-[18px] py-3 text-[11.5px] leading-relaxed text-muted-foreground">
          For pack units like Box or Carton, enter how many base units each holds in the Conversion column. Units with
          a fixed factor (e.g. Dozen) convert automatically. The master pack is chosen automatically as the unit holding
          the most base units.
        </div>
      </section>
    </div>
  )
}
