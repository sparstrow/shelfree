import { getRouteApi, useRouter } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { TopBar } from '@/app/shell/TopBar'
import { useUi } from '@/app/stores/ui'
import { type ListAction, type ListEditor, type ListShortcut, ListPage } from '@/components/list-page/ListPage'
import { useCollectionDelete } from '@/components/list-page/use-collection-delete'
import { useList, useUpsert } from '@/data/queries'
import type { Item, Vendor } from '@/data/schemas'
import { activeBomFor } from '@/domain/production'
import {
  type PriceEditableKey,
  type PriceRow,
  blankPrice,
  commitPriceCell,
  duplicatePrice,
  normalizePrice,
  priceOnChange,
  priceStatus,
  priceVsCostText,
  pricesToSave,
  startPriceChange,
  startPriceForItem,
  startPriceTier,
  toPurchasePrice,
  unpricedItems,
  validatePrice,
} from '@/domain/purchase-prices'
import { EM_DASH, fmtDate, int, money, todayLocal } from '@/lib/format'
import { useLatestCallback } from '@/lib/use-latest-callback'
import { cn } from '@/lib/utils'
import { dataset as buildDataset } from './dataset'
import { PRICE_CHANGE_SHORTCUT, PRICE_TIER_SHORTCUT } from './shortcuts'

const route = getRouteApi('/purchasing/purchase-prices/')

type Tab = 'prices' | 'unpriced'

const tabButton = (on: boolean) =>
  cn(
    'inline-flex h-[26px] items-center rounded-[7px] border-0 px-3 text-xs font-semibold whitespace-nowrap transition-[background-color,color,box-shadow] duration-[140ms]',
    on
      ? 'bg-card text-foreground shadow-base'
      : 'bg-transparent text-muted-foreground hover:bg-[color-mix(in_oklab,var(--foreground)_6%,transparent)] hover:text-foreground',
  )

function PriceTabs({ tab, unpriced, onTab }: { tab: Tab; unpriced: number | undefined; onTab: (t: Tab) => void }) {
  return (
    <div role="tablist" aria-label="Purchase prices" className="mr-1 flex flex-none gap-[3px] rounded-[10px] bg-muted p-[3px]">
      <button type="button" role="tab" aria-selected={tab === 'prices'} onClick={() => onTab('prices')} className={tabButton(tab === 'prices')}>
        Prices
      </button>
      <button type="button" role="tab" aria-selected={tab === 'unpriced'} onClick={() => onTab('unpriced')} className={tabButton(tab === 'unpriced')}>
        Items with no vendor price{unpriced === undefined ? '' : ` · ${unpriced}`}
      </button>
    </div>
  )
}

/** Purchasing ▸ Purchase Prices — vendor price list, edited in the drawer and in the grid. */
export function PurchasePricesPage() {
  const { sel, vendor: vendorFilter } = route.useSearch()
  const router = useRouter()
  const openTab = useUi((s) => s.openTab)
  const prices = useList('purchasePrices')
  const vendors = useList('vendors')
  const items = useList('items')
  const boms = useList('boms')
  const save = useUpsert('purchasePrices')
  const [tab, setTab] = useState<Tab>('prices')
  const [draft, setDraft] = useState<PriceRow | undefined>(undefined)
  const today = useMemo(() => todayLocal(), [])

  const rows = useMemo(() => prices.data ?? [], [prices.data])
  const vendorList = useMemo(() => vendors.data ?? [], [vendors.data])
  const itemList = useMemo(() => items.data ?? [], [items.data])
  const bomList = useMemo(() => boms.data ?? [], [boms.data])
  const refs = useMemo(
    () => ({ vendors: new Set(vendorList.map((v) => v.no)), items: new Set(itemList.map((i) => i.no)) }),
    [vendorList, itemList],
  )
  const vendorName = (no: string) => vendorList.find((v) => v.no === no)?.name ?? no
  const itemOf = (no: string) => itemList.find((i) => i.no === no)

  const unpriced = useMemo(
    () => unpricedItems(itemList, rows, (no) => !!activeBomFor(bomList, no, today), today),
    [itemList, rows, bomList, today],
  )
  const ready = !prices.isPending && !items.isPending && !vendors.isPending && !boms.isPending

  const label = (r: PriceRow) =>
    `${vendorName(r.vendor) || 'No vendor'} · ${r.item || 'No item'}${(Number(r.minQty) || 1) > 1 ? ` · from ${r.minQty}` : ''}`

  /** Save one cell edited in the grid. Always the latest closure, so the dataset stays stable. */
  const commitCell = async (row: PriceRow, key: PriceEditableKey, value: string) => {
    const result = commitPriceCell(
      toPurchasePrice(row),
      key,
      value,
      rows.filter((r) => r.no !== row.no),
      refs,
      new Date().toISOString(),
      fmtDate,
    )
    if (result.kind === 'error') return result.message
    if (result.kind === 'saved') {
      await save.mutateAsync(result.row)
      toast('Price saved', { description: label(result.row) })
    }
  }
  const commitStable = useLatestCallback(commitCell)
  const dataset = useMemo(
    () => buildDataset({ vendors: vendorList, items: itemList, today, commit: commitStable }),
    [vendorList, itemList, today, commitStable],
  )

  const remove = useCollectionDelete<PriceRow>('purchasePrices', { describe: label })

  const itemLead = (no: string) => itemOf(no)?.lead ?? null
  const uomOf = (r: PriceRow) => itemOf(r.item)?.uom ?? ''
  const descOf = (r: PriceRow) => itemOf(r.item)?.desc ?? ''

  const editor: ListEditor<PriceRow> = {
    fields: (d) => {
      const replacing = !!d._replaces
      const uom = uomOf(d)
      return [
        {
          key: 'vendor',
          label: 'Vendor',
          type: 'select',
          options: [{ value: '', label: 'Pick a vendor…' }, ...vendorList.map((v) => ({ value: v.no, label: v.name }))],
          locked: replacing,
          display: (r) => (r.vendor ? vendorName(r.vendor) : ''),
          hint: replacing ? 'Locked — a changed price stays with the same vendor and item.' : 'Who charges this price.',
        },
        {
          key: 'item',
          label: 'Item',
          type: 'select',
          options: [{ value: '', label: 'Pick an item…' }, ...itemList.map((i) => ({ value: i.no, label: `${i.no} · ${i.desc}` }))],
          locked: replacing,
          display: (r) => (r.item ? `${r.item}${descOf(r) ? ` · ${descOf(r)}` : ''}` : ''),
          hint: replacing ? 'Locked — a changed price stays with the same vendor and item.' : 'What the vendor supplies.',
        },
        { key: 'vendorItemNo', label: 'Vendor item code', type: 'text', mono: true, placeholder: 'Optional', hint: 'The vendor’s own code for this item, as on their quotes.' },
        {
          key: 'minQty',
          label: 'From qty',
          type: 'number',
          display: (r) => `${int(Number(r.minQty) || 1)}${uomOf(r) ? ` ${uomOf(r)}` : ''}`,
          hint: 'The price applies from this quantity. 1 = the base price; add a higher quantity for a volume tier.',
        },
        {
          key: 'price',
          label: `Price ₹ per ${uom || 'unit'}`,
          type: 'number',
          step: '0.01',
          placeholder: '0.00',
          display: (r) => (r.price === '' ? '' : money(Number(r.price)) + (uomOf(r) ? ` / ${uomOf(r)}` : '')),
          hint: 'What the vendor charges per unit, before tax.',
        },
        {
          key: 'leadDays',
          label: 'Lead time (days)',
          type: 'number',
          display: (r) => (r.leadDays == null || r.leadDays === '' ? '' : `${r.leadDays} days`),
          hint: 'Days from order to delivery. Filled from the item when you pick it.',
        },
        {
          key: 'effFrom',
          label: 'Starts',
          type: 'date',
          display: (r) => (r.effFrom ? fmtDate(r.effFrom) : 'Always'),
          hint: 'First day this price applies. Leave empty for always.',
        },
        {
          key: 'effTo',
          label: 'Ends',
          type: 'date',
          display: (r) => (r.effTo ? fmtDate(r.effTo) : 'Open-ended'),
          hint: 'Last day this price applies. Leave empty for open-ended.',
        },
        { key: 'note', label: 'Note', type: 'area', placeholder: 'Quote reference, terms…' },
      ]
    },
    view: (r) => {
      const vs = priceVsCostText(r.price, itemOf(r.item)?.cost ?? 0)
      return {
        no: r.no,
        status: priceStatus(r, today),
        title: vendorName(r.vendor) || 'No vendor',
        subtitle: `${r.item || 'No item'}${descOf(r) ? ` · ${descOf(r)}` : ''}`,
        notice: r._replaces ? `Replaces ${r._replaces} — it ends the day before this price starts.` : undefined,
        facts: [
          { k: 'vs item cost', v: vs },
          { k: 'Last changed', v: r.updatedAt ? fmtDate(r.updatedAt.slice(0, 10)) : EM_DASH },
        ],
      }
    },
    blank: (list) => blankPrice(list, today),
    duplicate: (r, list) => duplicatePrice(r, list),
    onChange: (d, key) => priceOnChange(d, key, itemLead),
    normalize: normalizePrice,
    validate: (d, others) => validatePrice(d, others.map(toPurchasePrice), refs, fmtDate),
    save: async (d, mode) => {
      const now = new Date().toISOString()
      const { saved, ended } = pricesToSave(d, rows, now)
      await save.mutateAsync({ ...saved, createdAt: mode === 'new' || !saved.createdAt ? now : saved.createdAt, updatedAt: now })
      if (ended) {
        await save.mutateAsync(ended)
        toast('Previous price ends ' + fmtDate(ended.effTo), { description: ended.no })
      }
    },
    label,
  }

  const openIn = (path: string) => {
    openTab(path)
    router.history.push(path)
  }

  const changePrice: ListAction<PriceRow>['run'] = (row, list) => {
    const start = startPriceChange(toPurchasePrice(row), rows, today, fmtDate)
    if (start.kind === 'draft') return list.startNew(start.draft)
    toast(start.title, { description: start.reason })
    if (start.kind === 'scheduled') list.startEdit(row)
  }
  const addTier: ListAction<PriceRow>['run'] = (row, list) => list.startNew(startPriceTier(toPurchasePrice(row), rows))

  const actions: ListAction<PriceRow>[] = [
    { label: 'Change price…', run: changePrice },
    { label: 'Add quantity tier', run: addTier },
    { label: 'Open vendor', run: (r) => openIn(`/purchasing/vendors/${r.vendor}`) },
    { label: 'Open item', run: (r) => openIn(`/warehouse/items/${r.item}`) },
  ]
  const shortcuts: ListShortcut<PriceRow>[] = [
    { ...PRICE_CHANGE_SHORTCUT, run: changePrice },
    { ...PRICE_TIER_SHORTCUT, run: addTier },
  ]

  const goTab = (next: Tab) => {
    setDraft(undefined)
    setTab(next)
  }
  const addPriceFor = (item: Item) => {
    const preferred = vendorList.find((v: Vendor) => v.name === item.vendor)
    setDraft(startPriceForItem(item, preferred?.no ?? '', rows, today))
    setTab('prices')
  }

  const tabs = <PriceTabs tab={tab} unpriced={ready ? unpriced.length : undefined} onTab={goTab} />

  if (tab === 'unpriced') {
    return (
      <>
        <TopBar>{tabs}</TopBar>
        <UnpricedPanel
          rows={unpriced}
          loading={!ready}
          error={prices.error ?? items.error ?? vendors.error ?? boms.error}
          onOpen={(item) => openIn(`/warehouse/items/${item.no}`)}
          onAdd={addPriceFor}
        />
      </>
    )
  }

  return (
    <ListPage
      key={draft ? draft.no + draft.item : 'list'}
      dataset={dataset}
      rows={prices.data}
      isLoading={prices.isPending}
      error={prices.error}
      onRefresh={() => Promise.all([prices.refetch(), vendors.refetch(), items.refetch(), boms.refetch()])}
      remove={remove}
      editor={editor}
      actions={actions}
      shortcuts={shortcuts}
      initialDraft={draft}
      topBarExtra={tabs}
      initialActiveId={sel ?? null}
      initialFilters={vendorFilter ? [{ key: 'vendor', op: 'equals', value: vendorFilter }] : undefined}
      gridKey={vendorFilter ?? undefined}
      emptyText="No purchase prices yet. Use New purchase price to record what a vendor charges."
    />
  )
}

const GRID = 'grid-cols-[120px_minmax(220px,2fr)_minmax(140px,1fr)_64px_110px_minmax(170px,1fr)_104px]'

function UnpricedPanel({
  rows,
  loading,
  error,
  onOpen,
  onAdd,
}: {
  rows: Item[]
  loading: boolean
  error: unknown
  onOpen: (item: Item) => void
  onAdd: (item: Item) => void
}) {
  return (
    <section data-screen-label="Items with no vendor price" className="min-h-0 flex-1 animate-sf-fade overflow-auto px-[22px] pt-[18px] pb-6">
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <div className="min-w-[900px]">
          <div
            className={cn(
              'grid h-[38px] items-center gap-2.5 border-b border-border bg-[color-mix(in_oklab,var(--foreground)_3%,transparent)] px-4 text-[11px] font-semibold tracking-[0.04em] text-muted-foreground uppercase',
              GRID,
            )}
          >
            <span>Item no.</span>
            <span>Description</span>
            <span>Category</span>
            <span>UoM</span>
            <span className="text-right">Item cost</span>
            <span>Preferred vendor</span>
            <span />
          </div>
          {rows.map((item) => (
            <div
              key={item.no}
              onClick={() => onOpen(item)}
              title="Open item"
              className={cn(
                'grid h-[46px] cursor-pointer items-center gap-2.5 border-b border-border px-4 text-[12.5px] transition-colors duration-[140ms] hover:bg-row-hover',
                GRID,
              )}
            >
              <span className="truncate font-mono text-[11.5px] font-semibold">{item.no}</span>
              <span className="truncate" title={item.desc}>
                {item.desc}
              </span>
              <span className="truncate text-muted-foreground">{item.category || EM_DASH}</span>
              <span className="font-mono text-[11.5px] text-muted-foreground">{item.uom || EM_DASH}</span>
              <span className="tnum text-right">{money(item.cost || 0)}</span>
              <span className="truncate text-muted-foreground">{item.vendor || EM_DASH}</span>
              <button
                type="button"
                aria-label={`Add price for ${item.no}`}
                onClick={(e) => {
                  e.stopPropagation()
                  onAdd(item)
                }}
                className="hover-lift inline-flex h-7 items-center gap-1.5 justify-self-end rounded-[7px] border border-input bg-transparent px-[11px] text-xs font-semibold whitespace-nowrap text-foreground hover:bg-[color-mix(in_oklab,var(--primary)_14%,transparent)]"
              >
                <Plus className="size-3" strokeWidth={2.4} />
                Add price
              </button>
            </div>
          ))}
          {loading && <div className="px-6 py-11 text-center text-[13px] text-muted-foreground">Loading…</div>}
          {!loading && !!error && (
            <div role="alert" className="px-6 py-11 text-center text-[13px] text-bad-fg">
              Could not load items. Check your connection and try again.
            </div>
          )}
          {!loading && !error && rows.length === 0 && (
            <div className="px-6 py-11 text-center text-sm font-semibold">Every purchased item has a vendor price</div>
          )}
        </div>
      </div>
    </section>
  )
}

