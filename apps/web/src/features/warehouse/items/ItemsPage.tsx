import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { AlertTriangle } from 'lucide-react'
import { useMemo } from 'react'
import { toast } from 'sonner'
import { type ListPreview, ListPage } from '@/components/list-page/ListPage'
import { useCollectionDelete } from '@/components/list-page/use-collection-delete'
import { NotesBlock } from '@/components/notes/NotesBlock'
import { useBulkRemove, useBulkUpsert, useDuplicateItems, useList, useRemoveDuplicatedItems } from '@/data/queries'
import type { Item } from '@/data/schemas'
import { pluralNoun } from '@/domain/bulk-actions'
import {
  isItemLowStock,
  itemAvailable,
  itemCategoryPath,
  itemCommitted,
  itemDeleteBlockedReason,
  itemMargin,
  itemOnHand,
  itemSiteRows,
  itemStockStatus,
} from '@/domain/item'
import { EM_DASH, int, money, pct } from '@/lib/format'
import { itemDataset } from './dataset'

const route = getRouteApi('/warehouse/items/')

/** Warehouse ▸ Items list page. */
export function ItemsPage() {
  const navigate = useNavigate()
  const { sel } = route.useSearch()
  const items = useList('items')
  const unitSets = useList('itemUnits')
  const warehouses = useList('warehouses')
  const orders = useList('purchaseOrders')
  const receipts = useList('purchaseReceipts')
  const notes = useList('notes')
  const { mutateAsync: runDuplicate } = useDuplicateItems()
  const { mutateAsync: undoDuplicate } = useRemoveDuplicatedItems()
  const { mutateAsync: runBulkRemove } = useBulkRemove('items')
  const { mutateAsync: runBulkUpsert } = useBulkUpsert('items')

  const warehouseList = useMemo(() => warehouses.data ?? [], [warehouses.data])

  const dataset = useMemo(
    () => {
      const packs = new Map((unitSets.data ?? []).map((s) => [s.itemNo, s.pack]))
      return itemDataset({ items: items.data ?? [], warehouses: warehouseList, masterPackOf: (no) => packs.get(no) ?? '' })
    },
    [items.data, warehouseList, unitSets.data],
  )

  const remove = useCollectionDelete<Item>('items', {
    blockedReason: (it) => itemDeleteBlockedReason(it, orders.data ?? [], receipts.data ?? []),
    describe: (it) => `${it.no} · ${it.desc}`,
  })

  const duplicate = async (selected: Item[]): Promise<string[]> => {
    const res = await runDuplicate(selected.map((it) => it.no))
    const made = res.created.map((it) => it.no)
    if (made.length === 0) return []
    toast(`${pluralNoun(made.length, 'item', 'items')} duplicated`, {
      description: made.join(', '),
      action: { label: 'Undo', onClick: () => void undoDuplicate(made) },
    })
    return made
  }

  const preview = (it: Item): ListPreview => {
    const onHand = itemOnHand(it)
    const committed = itemCommitted(it)
    const available = itemAvailable(it)
    const low = isItemLowStock(it)
    const margin = itemMargin(it)
    const siteRows = itemSiteRows(it, warehouseList)
    const maxQty = Math.max(1, ...siteRows.map((r) => r.qty))

    return {
      ariaLabel: `Item ${it.no}`,
      no: it.no,
      status: itemStockStatus(it),
      title: it.desc,
      subtitle: itemCategoryPath(it.category),
      stats: [
        { value: int(onHand), label: 'On hand' },
        { value: int(committed), label: 'Committed' },
        { value: int(available), label: 'Available', ...(available <= 0 ? { tone: 'bad' as const } : {}) },
      ],
      beforeFacts: (
        <>
          {low && (
            <div className="mx-[14px] mt-[10px] flex items-center gap-2 rounded-lg bg-warn-bg px-[10px] py-2 text-xs font-medium text-warn-fg">
              <AlertTriangle className="size-[14px] flex-none" strokeWidth={2} />
              <span>Below reorder point ({int(it.rp)})</span>
            </div>
          )}
          <div className="px-[14px] pt-[14px] pb-1">
            <div className="mb-[9px] text-[11px] font-semibold tracking-[0.05em] text-muted-foreground">
              STOCK BY LOCATION
            </div>
            {siteRows.length === 0 ? (
              <div className="mb-2 text-[12.5px] text-muted-foreground">No active locations.</div>
            ) : (
              siteRows.map((row) => (
                <div key={row.id} className="mb-[9px] flex items-center gap-[10px]">
                  <span className="w-[84px] flex-none text-xs text-muted-foreground" title={row.name}>
                    {row.short}
                  </span>
                  <span
                    className="h-[7px] flex-1 overflow-hidden rounded-[4px] bg-muted"
                    role="progressbar"
                    aria-label={`${row.short} stock`}
                    aria-valuenow={row.qty}
                    aria-valuemin={0}
                    aria-valuemax={maxQty}
                  >
                    <span
                      className="block h-full rounded-[4px] bg-primary"
                      style={{ width: `${Math.round((row.qty / maxQty) * 100)}%` }}
                    />
                  </span>
                  <span className="tnum w-[38px] flex-none text-right text-xs">{int(row.qty)}</span>
                </div>
              ))
            )}
          </div>
        </>
      ),
      facts: [
        { k: 'Unit price', v: money(it.price) },
        { k: 'Unit cost', v: money(it.cost) },
        { k: 'Margin', v: margin == null ? EM_DASH : pct(margin) },
        { k: 'Unit of measure', v: it.uom || EM_DASH },
        { k: 'Vendor', v: it.vendor || EM_DASH },
        { k: 'Lead time', v: `${it.lead} days` },
        { k: 'Reorder point', v: int(it.rp) },
        { k: 'Safety stock', v: int(it.ss) },
      ],
      children: (
        <div className="border-t border-border px-[14px] pt-3 pb-[14px]">
          <NotesBlock
            entityType="item"
            entityNo={it.no}
            listMaxHeight={220}
            placeholder="Add a note about this item… spec, quality, packaging."
          />
        </div>
      ),
    }
  }

  return (
    <ListPage
      dataset={dataset}
      rows={items.data}
      isLoading={items.isPending}
      error={items.error}
      onRefresh={() =>
        Promise.all([items.refetch(), warehouses.refetch(), orders.refetch(), receipts.refetch(), notes.refetch()])
      }
      recordPath={(it) => `/warehouse/items/${it.no}`}
      openLabel="Open item"
      create={{
        label: 'New item',
        run: () => void navigate({ to: '/warehouse/items/$no', params: { no: 'new' } }),
      }}
      remove={remove}
      duplicate={duplicate}
      openInTabs
      bulkDelete={{
        run: (list) => runBulkRemove(list.map((it) => it.no)),
        undo: (list) => runBulkUpsert(list),
      }}
      preview={preview}
      initialActiveId={sel ?? null}
      emptyText="No items yet. Use New item to add the first one."
    />
  )
}
