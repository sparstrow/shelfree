import { getRouteApi, useLocation, useNavigate, useRouter } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { TopBar } from '@/app/shell/TopBar'
import { useUi } from '@/app/stores/ui'
import { StatusPill } from '@/components/StatusPill'
import type { GridFilter } from '@/components/data-grid/model'
import {
  type ListAction,
  type ListDelete,
  type ListEditor,
  type ListPreview,
  type ListShortcut,
  ListPage,
} from '@/components/list-page/ListPage'
import { RecordCard } from '@/components/record-page/RecordPage'
import { useList, useRemove, useUpsert } from '@/data/queries'
import type { Customer, CustomerPrice, Item } from '@/data/schemas'
import {
  type CustomerPriceEditableKey,
  type CustomerPriceRow,
  DEFAULT_SALES_PRICING_SETTINGS,
  type ListPriceRow,
  blankCustomerPrice,
  buildListPriceRows,
  commitCustomerPriceCell,
  commitListPrice,
  customerPriceStatus,
  eligibleCustomers,
  isCustomerPricingEligible,
  normalizeCustomerPrice,
  priceDeltaVsListText,
  pricingFallbackNote,
  pricingModeLabel,
  pricingModeNote,
  resolveCustomerPrice,
  sellableItems,
  startCustomerPriceTier,
  toCustomerPrice,
  validCustomerPrices,
  validateCustomerPrice,
} from '@/domain/sales-prices'
import { EM_DASH, fmtDate, int, money, todayLocal } from '@/lib/format'
import { isTypingTarget } from '@/lib/keyboard'
import { useLatestCallback } from '@/lib/use-latest-callback'
import { cn } from '@/lib/utils'
import { customerPriceDataset, listPriceDataset } from './dataset'

const route = getRouteApi('/sales/sales-prices/')

type Tab = 'list' | 'customer' | 'check'

const tabButton = (on: boolean) =>
  cn(
    'inline-flex h-[26px] items-center rounded-[7px] border-0 px-3 text-xs font-semibold whitespace-nowrap transition-[background-color,color,box-shadow] duration-[140ms]',
    on
      ? 'bg-card text-foreground shadow-base'
      : 'bg-transparent text-muted-foreground hover:bg-[color-mix(in_oklab,var(--foreground)_6%,transparent)] hover:text-foreground',
  )

function SalesPriceTabs({
  tab,
  customerCount,
  onTab,
}: {
  tab: Tab
  customerCount: number | undefined
  onTab: (next: Tab) => void
}) {
  return (
    <div role="tablist" aria-label="Sales prices" className="mr-1 flex flex-none gap-[3px] rounded-[10px] bg-muted p-[3px]">
      <button type="button" role="tab" aria-selected={tab === 'list'} onClick={() => onTab('list')} className={tabButton(tab === 'list')}>
        List prices
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={tab === 'customer'}
        onClick={() => onTab('customer')}
        className={tabButton(tab === 'customer')}
      >
        Customer prices{customerCount === undefined ? '' : ` · ${int(customerCount)}`}
      </button>
      <button type="button" role="tab" aria-selected={tab === 'check'} onClick={() => onTab('check')} className={tabButton(tab === 'check')}>
        Price check
      </button>
    </div>
  )
}

/** Sales ▸ Sales Prices — list prices, customer-specific agreed prices, and price resolution check. */
export function SalesPricesPage() {
  const { sel, customer: customerFilter, item: itemFilter, tab: searchTab, new: startNewParam } = route.useSearch()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const router = useRouter()
  const openTab = useUi((s) => s.openTab)

  const prices = useList('customerPrices')
  const customers = useList('customers')
  const items = useList('items')

  const savePrice = useUpsert('customerPrices')
  const removePrice = useRemove('customerPrices')
  const saveItem = useUpsert('items')

  const today = useMemo(() => todayLocal(), [])

  const [draft, setDraft] = useState<CustomerPriceRow | undefined>(undefined)

  const activeTab: Tab = searchTab ?? (sel || customerFilter || itemFilter || startNewParam === '1' ? 'customer' : 'list')

  const priceList = useMemo(() => prices.data ?? [], [prices.data])
  const customerList = useMemo(() => customers.data ?? [], [customers.data])
  const itemList = useMemo(() => items.data ?? [], [items.data])

  const validPrices = useMemo(
    () => validCustomerPrices(priceList, customerList, itemList),
    [priceList, customerList, itemList],
  )
  const listRows = useMemo(
    () => buildListPriceRows(itemList, validPrices, customerList),
    [itemList, validPrices, customerList],
  )
  const selectableItems = useMemo(() => sellableItems(itemList), [itemList])
  const refs = useMemo(
    () => ({
      customers: new Set(customerList.map((c) => c.no)),
      items: new Set(itemList.map((i) => i.no)),
    }),
    [customerList, itemList],
  )

  const customerOf = (no: string) => customerList.find((c) => c.no === no)
  const customerName = (no: string) => customerOf(no)?.name ?? no
  const itemOf = (no: string) => itemList.find((i) => i.no === no)
  const descOf = (r: CustomerPriceRow) => itemOf(r.item)?.desc ?? ''
  const uomOf = (r: CustomerPriceRow) => itemOf(r.item)?.uom ?? ''
  const label = (r: CustomerPriceRow) =>
    `${customerName(r.customer) || 'No customer'} · ${r.item || 'No item'}${(Number(r.minQty) || 1) > 1 ? ` · from ${r.minQty}` : ''}`

  const ready = !prices.isPending && !customers.isPending && !items.isPending

  const goTab = useLatestCallback((next: Tab) => {
    setDraft(undefined)
    void navigate({
      to: pathname,
      search: (() => {
        if (next === 'list') return {}
        if (next === 'check') return { tab: 'check' }
        return {
          tab: 'customer',
          ...(customerFilter ? { customer: customerFilter } : {}),
          ...(itemFilter ? { item: itemFilter } : {}),
        }
      }) as never,
      replace: true,
    })
  })

  const startNewCustomerPrice = useLatestCallback((defaults?: { customer?: string; item?: string }) => {
    setDraft(
      blankCustomerPrice(priceList, today, {
        customer: defaults?.customer ?? customerFilter,
        item: defaults?.item ?? itemFilter,
      }),
    )
    void navigate({
      to: pathname,
      search: (() => ({
        tab: 'customer',
        ...(customerFilter ? { customer: customerFilter } : {}),
        ...(itemFilter ? { item: itemFilter } : {}),
      })) as never,
      replace: true,
    })
  })

  const commitListCell = useLatestCallback(async (row: ListPriceRow, value: string) => {
    const it = itemOf(row.no)
    if (!it) return 'This item no longer exists.'
    const res = commitListPrice(it, value)
    if (res.kind === 'error') return res.message
    if (res.kind === 'saved') {
      await saveItem.mutateAsync(res.item)
      toast('List price saved', { description: `${it.no} · ${money(res.item.price)}` })
    }
  })

  const commitCustomerCell = useLatestCallback(
    async (row: CustomerPriceRow, key: CustomerPriceEditableKey, value: string) => {
      const res = commitCustomerPriceCell(
        toCustomerPrice(row),
        key,
        value,
        priceList.filter((r) => r.id !== row.id),
        refs,
      )
      if (res.kind === 'error') return res.message
      if (res.kind === 'saved') {
        await savePrice.mutateAsync(res.row)
        toast('Customer price saved', { description: label(res.row) })
      }
    },
  )

  const listDs = useMemo(
    () => listPriceDataset({ items: itemList, commit: commitListCell }),
    [itemList, commitListCell],
  )
  const customerDs = useMemo(
    () =>
      customerPriceDataset({
        customers: customerList,
        items: itemList,
        today,
        settings: DEFAULT_SALES_PRICING_SETTINGS,
        commit: commitCustomerCell,
      }),
    [customerList, itemList, today, commitCustomerCell],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target) || e.metaKey || e.ctrlKey || e.altKey) return
      if (document.querySelector('[role="dialog"], [role="menu"], [role="listbox"], [role="complementary"]')) return
      const key = e.key.toLowerCase()
      if (key === '1') {
        e.preventDefault()
        goTab('list')
      } else if (key === '2') {
        e.preventDefault()
        goTab('customer')
      } else if (key === '3') {
        e.preventDefault()
        goTab('check')
      } else if (key === 'n' && activeTab !== 'customer') {
        e.preventDefault()
        startNewCustomerPrice()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeTab, goTab, startNewCustomerPrice])

  const openIn = (path: string) => {
    openTab(path)
    router.history.push(path)
  }

  const remove: ListDelete<CustomerPriceRow> = {
    describe: label,
    run: (r) => removePrice.mutateAsync(r.id),
    undo: (r) => {
      savePrice.mutate(toCustomerPrice(r))
    },
  }

  const editor: ListEditor<CustomerPriceRow> = {
    fields: (d) => {
      const uom = uomOf(d)
      const itemPool =
        !d.item || selectableItems.some((i) => i.no === d.item)
          ? selectableItems
          : [...selectableItems, ...itemList.filter((i) => i.no === d.item)]
      return [
        {
          key: 'customer',
          label: 'Customer',
          type: 'select',
          options: [
            { value: '', label: 'Pick a customer…' },
            ...customerList.map((c) => ({ value: c.no, label: c.name })),
          ],
          display: (r) => (r.customer ? customerName(r.customer) : ''),
          hint: 'Who gets this agreed price.',
        },
        {
          key: 'item',
          label: 'Item',
          type: 'select',
          options: [
            { value: '', label: 'Pick an item…' },
            ...itemPool.map((i) => ({ value: i.no, label: `${i.no} · ${i.desc}` })),
          ],
          display: (r) => (r.item ? `${r.item}${descOf(r) ? ` · ${descOf(r)}` : ''}` : ''),
          hint: 'Sellable item this agreed price applies to.',
        },
        {
          key: 'minQty',
          label: 'From qty',
          type: 'number',
          step: '1',
          display: (r) => `${int(Number(r.minQty) || 1)}${uomOf(r) ? ` ${uomOf(r)}` : ''}`,
          hint: 'The price applies from this quantity. 1 = base price; add a higher quantity for a bulk tier.',
        },
        {
          key: 'price',
          label: `Price ₹ per ${uom || 'unit'}`,
          type: 'number',
          step: '0.01',
          placeholder: '0.00',
          display: (r) => (r.price === '' ? '' : money(Number(r.price)) + (uomOf(r) ? ` / ${uomOf(r)}` : '')),
          hint: 'Agreed unit price before tax. Replaces the item’s list price for this customer.',
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
        { key: 'note', label: 'Note', type: 'area', placeholder: 'Agreement, festival season, bulk tier…' },
      ]
    },
    view: (r) => {
      const cust = customerOf(r.customer)
      const listPrice = itemOf(r.item)?.price ?? 0
      const eligible = cust ? isCustomerPricingEligible(cust, DEFAULT_SALES_PRICING_SETTINGS) : false
      return {
        no: r.id,
        status: customerPriceStatus(r, today),
        title: customerName(r.customer) || 'No customer',
        subtitle: `${r.item || 'No item'}${descOf(r) ? ` · ${descOf(r)}` : ''}`,
        notice:
          cust && !eligible
            ? `Ignored for now — ${cust.name} is not eligible under the current pricing rule.`
            : undefined,
        facts: [
          { k: 'List price', v: listPrice > 0 ? money(listPrice) : EM_DASH },
          { k: 'vs list', v: priceDeltaVsListText(r.price, listPrice) },
        ],
      }
    },
    blank: (list) => blankCustomerPrice(list, today, { customer: customerFilter, item: itemFilter }),
    duplicate: (r, list) => startCustomerPriceTier(r, list),
    normalize: normalizeCustomerPrice,
    validate: (d, others) => validateCustomerPrice(d, others.map(toCustomerPrice), refs),
    save: async (d) => {
      await savePrice.mutateAsync(toCustomerPrice(d))
    },
    label,
  }

  const customerActions: ListAction<CustomerPriceRow>[] = [
    {
      label: 'Add quantity tier',
      run: (row, list) => list.startNew(startCustomerPriceTier(row, priceList)),
    },
    { label: 'Open customer', run: (r) => openIn(`/sales/customers/${r.customer}`) },
    { label: 'Open item', run: (r) => openIn(`/warehouse/items/${r.item}`) },
  ]
  const customerShortcuts: ListShortcut<CustomerPriceRow>[] = [
    {
      key: 't',
      shift: false,
      description: 'Add a quantity tier for the active customer price',
      run: (row, list) => list.startNew(startCustomerPriceTier(row, priceList)),
    },
  ]

  const listActions: ListAction<ListPriceRow>[] = [
    {
      label: 'View customer prices',
      inDrawer: true,
      run: (r) => {
        setDraft(undefined)
        void navigate({
          to: pathname,
          search: (() => ({ tab: 'customer', item: r.no })) as never,
          replace: true,
        })
      },
    },
    {
      label: 'New customer price',
      inDrawer: true,
      run: (r) => startNewCustomerPrice({ item: r.no }),
    },
  ]

  const listPreview = (r: ListPriceRow): ListPreview => ({
    ariaLabel: `List price ${r.no}`,
    no: r.no,
    status: r.priceState,
    title: r.desc,
    subtitle: r.category || EM_DASH,
    stats: [
      { value: money(r.price), label: 'List price' },
      { value: money(r.cost), label: 'Unit cost' },
      { value: r.margin == null ? EM_DASH : `${r.margin}%`, label: 'Margin' },
    ],
    facts: [
      { k: 'UoM', v: r.uom || EM_DASH },
      { k: 'Markup %', v: r.markup == null ? EM_DASH : `${r.markup}%` },
      { k: 'Customer prices', v: r.custCount ? int(r.custCount) : 'None' },
    ],
  })

  const initialFilters = useMemo(() => {
    const f: Omit<GridFilter, 'id'>[] = []
    if (customerFilter) f.push({ key: 'customer', op: 'equals', value: customerFilter })
    if (itemFilter) f.push({ key: 'item', op: 'equals', value: itemFilter })
    return f.length ? f : undefined
  }, [customerFilter, itemFilter])

  const tabs = <SalesPriceTabs tab={activeTab} customerCount={ready ? validPrices.length : undefined} onTab={goTab} />

  if (activeTab === 'check') {
    return (
      <>
        <TopBar newLabel="New customer price" onNew={() => startNewCustomerPrice()}>
          {tabs}
        </TopBar>
        <PriceCheckPanel
          customers={customerList}
          items={selectableItems}
          prices={validPrices}
          today={today}
          ready={ready}
          error={prices.error ?? customers.error ?? items.error}
        />
      </>
    )
  }

  if (activeTab === 'list') {
    return (
      <ListPage
        key="list"
        dataset={listDs}
        rows={items.data ? listRows : undefined}
        isLoading={items.isPending || prices.isPending}
        error={items.error ?? prices.error}
        onRefresh={() => Promise.all([items.refetch(), prices.refetch(), customers.refetch()])}
        recordPath={(r) => `/warehouse/items/${r.no}`}
        openLabel="Open item"
        create={{ label: 'New customer price', run: () => startNewCustomerPrice() }}
        actions={listActions}
        preview={listPreview}
        topBarExtra={tabs}
        emptyText="No items yet."
      />
    )
  }

  const effectiveDraft =
    draft ??
    (startNewParam === '1' && prices.data
      ? blankCustomerPrice(prices.data, today, { customer: customerFilter, item: itemFilter })
      : undefined)

  const customerRowsForGrid: CustomerPriceRow[] | undefined = prices.data ? validPrices : undefined
  const customerGridKey = [
    customerFilter ?? '',
    itemFilter ?? '',
    effectiveDraft ? `${effectiveDraft.id}:${effectiveDraft.customer}:${effectiveDraft.item}` : 'list',
  ].join('|')

  return (
    <ListPage
      key={customerGridKey}
      dataset={customerDs}
      rows={customerRowsForGrid}
      isLoading={prices.isPending || customers.isPending || items.isPending}
      error={prices.error ?? customers.error ?? items.error}
      onRefresh={() => Promise.all([prices.refetch(), customers.refetch(), items.refetch()])}
      remove={remove}
      editor={editor}
      actions={customerActions}
      shortcuts={customerShortcuts}
      initialDraft={effectiveDraft}
      topBarExtra={tabs}
      initialActiveId={sel ?? null}
      initialFilters={initialFilters}
      gridKey={customerFilter || itemFilter ? `${customerFilter ?? ''}|${itemFilter ?? ''}` : undefined}
      emptyText="No customer prices yet. Use New customer price to agree a price for an account."
    />
  )
}

function PriceCheckPanel({
  customers,
  items,
  prices,
  today,
  ready,
  error,
}: {
  customers: readonly Customer[]
  items: readonly Item[]
  prices: readonly CustomerPrice[]
  today: string
  ready: boolean
  error: unknown
}) {
  const [chkCustomer, setChkCustomer] = useState('')
  const [chkItem, setChkItem] = useState('')
  const [chkQty, setChkQty] = useState('1')
  const [chkDate, setChkDate] = useState(today)

  const eligible = useMemo(() => eligibleCustomers(customers, DEFAULT_SALES_PRICING_SETTINGS), [customers])
  const pricedCustomerCount = useMemo(() => new Set(prices.map((r) => r.customer)).size, [prices])

  const selectedCustomer = customers.find((c) => c.no === chkCustomer)
  const selectedItem = items.find((i) => i.no === chkItem)
  const res =
    selectedCustomer && selectedItem
      ? resolveCustomerPrice({
          customer: selectedCustomer,
          item: selectedItem,
          prices,
          qty: Math.max(1, Number.parseInt(chkQty, 10) || 1),
          date: chkDate || today,
          settings: DEFAULT_SALES_PRICING_SETTINGS,
        })
      : null

  return (
    <section data-screen-label="Price check" className="min-h-0 flex-1 animate-sf-fade overflow-auto px-[22px] pt-[18px] pb-6">
      {!ready && <div className="py-10 text-center text-[13px] text-muted-foreground">Loading…</div>}
      {ready && !!error && (
        <div role="alert" className="py-10 text-center text-[13px] text-bad-fg">
          Could not load pricing data. Check your connection and try again.
        </div>
      )}
      {ready && !error && (
        <div className="grid max-w-[1040px] grid-cols-[repeat(auto-fit,minmax(320px,1fr))] items-start gap-4">
          <RecordCard title="Who gets their own price">
            <div className="flex flex-wrap items-center gap-2.5">
              <StatusPill label={pricingModeLabel(DEFAULT_SALES_PRICING_SETTINGS.mode)} tone="neutral" />
              <span className="tnum text-xs text-muted-foreground">{int(eligible.length)} eligible</span>
            </div>
            <p className="mt-2.5 mb-0 text-[12.5px] leading-relaxed text-pretty text-muted-foreground">
              {pricingModeNote(DEFAULT_SALES_PRICING_SETTINGS, fmtDate)}
            </p>
            <p className="mt-1.5 mb-0 text-[12.5px] leading-relaxed text-pretty text-muted-foreground">
              {pricingFallbackNote(DEFAULT_SALES_PRICING_SETTINGS)}
            </p>
            <div className="tnum mt-3 border-t border-dashed border-border pt-2.5 text-xs text-muted-foreground">
              {int(prices.length)} {prices.length === 1 ? 'price row' : 'price rows'} · {int(pricedCustomerCount)} priced{' '}
              {pricedCustomerCount === 1 ? 'customer' : 'customers'}
            </div>
          </RecordCard>

          <RecordCard title="Price check" hint="What a sales order line picks up for a customer, item, quantity and date.">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_78px]">
              <select
                aria-label="Customer"
                value={chkCustomer}
                onChange={(e) => setChkCustomer(e.target.value)}
                className="h-8 min-w-0 rounded-lg border border-input bg-transparent px-2 text-xs text-foreground outline-none focus:border-ring"
              >
                <option value="">Select a customer…</option>
                {customers.map((c) => (
                  <option key={c.no} value={c.no}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select
                aria-label="Item"
                value={chkItem}
                onChange={(e) => setChkItem(e.target.value)}
                className="h-8 min-w-0 rounded-lg border border-input bg-transparent px-2 text-xs text-foreground outline-none focus:border-ring"
              >
                <option value="">Select an item…</option>
                {items.map((i) => (
                  <option key={i.no} value={i.no}>
                    {i.no} — {i.desc}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="1"
                step="1"
                aria-label="Quantity"
                value={chkQty}
                onChange={(e) => setChkQty(e.target.value)}
                className="tnum h-8 rounded-lg border border-input bg-transparent px-2 text-right text-xs text-foreground outline-none focus:border-ring"
              />
            </div>

            <div className="mt-2 flex items-center gap-2">
              <label htmlFor="sp-chk-date" className="text-xs text-muted-foreground">
                On date
              </label>
              <input
                id="sp-chk-date"
                type="date"
                value={chkDate}
                onChange={(e) => setChkDate(e.target.value)}
                className="h-7 rounded-lg border border-input bg-transparent px-2 text-xs text-foreground outline-none focus:border-ring"
              />
            </div>

            {res ? (
              <div className="mt-3 border-t border-dashed border-border pt-3">
                <div className="flex items-center gap-2.5">
                  <span className={cn('tnum text-[19px] font-bold tracking-[-0.02em]', res.price == null ? 'text-muted-foreground' : 'text-foreground')}>
                    {res.price == null ? 'No price' : money(res.price)}
                  </span>
                  <StatusPill label={res.label} tone={res.tone} />
                  <span className="tnum ml-auto text-[11.5px] text-muted-foreground">List {money(res.listPrice)}</span>
                </div>
                <div className="mt-2 text-xs leading-[1.45] text-pretty text-muted-foreground">{res.why}</div>
              </div>
            ) : (
              <div className="mt-3 border-t border-dashed border-border pt-3 text-xs text-muted-foreground">
                Pick a customer and an item to see the resolved price and its price type.
              </div>
            )}
          </RecordCard>
        </div>
      )}
    </section>
  )
}
