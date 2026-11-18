import { useNavigate } from '@tanstack/react-router'
import { Trash2 } from 'lucide-react'
import { type ReactNode, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { RecordPage, type RecordPageState, type RecordTab } from '@/components/record-page/RecordPage'
import { useList, useRemove } from '@/data/queries'
import type { Item } from '@/data/schemas'
import { itemCategoryPath, itemDeleteBlockedReason } from '@/domain/item'
import {
  itemBomSummary,
  itemProfileStatus,
  itemPurchaseOrders,
  itemSiteStockBars,
  itemTrackingCards,
  itemValuation,
  vendorByName,
} from '@/domain/item-profile'
import { int, todayLocal } from '@/lib/format'
import { cn } from '@/lib/utils'
import { ItemBomTab } from './item-tabs/ItemBomTab'
import { ItemNotesTab } from './item-tabs/ItemNotesTab'
import { ItemOverviewTab } from './item-tabs/ItemOverviewTab'
import { ItemPurchasingTab } from './item-tabs/ItemPurchasingTab'
import { ItemStockTab } from './item-tabs/ItemStockTab'
import { ItemUnitsTab } from './item-tabs/ItemUnitsTab'

const BACK_TO = '/warehouse/items'

/** The six tabs of the item profile, in prototype order. */
const TABS: readonly RecordTab[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'stock', label: 'Stock & locations' },
  { id: 'purchasing', label: 'Purchasing' },
  { id: 'bom', label: 'Bill of materials' },
  { id: 'units', label: 'Units of measure' },
  { id: 'notes', label: 'Notes' },
]

const NOOP_VALIDATE = () => ({})
const NOOP_SAVE = async () => {}

/** Warehouse ▸ Items ▸ item profile page. */
export function ItemProfilePage({ no }: { no: string }) {
  const navigate = useNavigate()
  const items = useList('items')
  const warehouses = useList('warehouses')
  const vendors = useList('vendors')
  const purchaseOrders = useList('purchaseOrders')
  const purchaseReceipts = useList('purchaseReceipts')
  const boms = useList('boms')
  const assemblyOrders = useList('assemblyOrders')
  const removeItem = useRemove('items')

  const [confirmDelete, setConfirmDelete] = useState(false)

  const queries = [items, warehouses, vendors, purchaseOrders, purchaseReceipts, boms, assemblyOrders]
  const today = todayLocal()
  const record = items.data?.find((i) => i.no === no) ?? null

  const valuation = useMemo(() => (record ? itemValuation(record) : null), [record])
  const siteBars = useMemo(
    () => (record ? itemSiteStockBars(record, warehouses.data ?? []) : []),
    [record, warehouses.data],
  )
  const trackingCards = useMemo(() => (record ? itemTrackingCards(record) : []), [record])
  const preferredVendor = useMemo(
    () => (record ? vendorByName(record.vendor, vendors.data ?? []) : undefined),
    [record, vendors.data],
  )
  const poRows = useMemo(
    () => (record ? itemPurchaseOrders(record.no, purchaseOrders.data ?? [], vendors.data ?? []) : []),
    [record, purchaseOrders.data, vendors.data],
  )
  const openPoCount = useMemo(() => poRows.filter((p) => p.open).length, [poRows])
  const bomSummary = useMemo(
    () =>
      record
        ? itemBomSummary(
            record,
            boms.data ?? [],
            items.data ?? [],
            assemblyOrders.data ?? [],
            warehouses.data ?? [],
            today,
          )
        : null,
    [record, boms.data, items.data, assemblyOrders.data, warehouses.data, today],
  )
  const deleteBlockedReason = useMemo(
    () => (record ? itemDeleteBlockedReason(record, purchaseOrders.data ?? [], purchaseReceipts.data ?? []) : null),
    [record, purchaseOrders.data, purchaseReceipts.data],
  )

  let state: RecordPageState = { kind: 'ready' }
  if (queries.some((q) => q.isError)) {
    state = {
      kind: 'error',
      message: 'Could not load this item.',
      retry: () => queries.forEach((q) => void q.refetch()),
    }
  } else if (!queries.every((q) => q.data !== undefined)) {
    state = { kind: 'loading' }
  }

  const openVendor = (vendorNo: string) => void navigate({ to: '/purchasing/vendors/$no', params: { no: vendorNo } })
  const openPo = (poNo: string) => void navigate({ to: '/purchasing/purchase-orders/$no', params: { no: poNo } })
  const openBom = (bomNo: string) =>
    void navigate({ to: '/production/bills-of-materials/$no', params: { no: bomNo } })
  const openAo = (aoNo: string) => void navigate({ to: '/production/assembly-orders/$no', params: { no: aoNo } })
  const openItem = (itemNo: string) => void navigate({ to: '/warehouse/items/$no', params: { no: itemNo } })

  const handleConfirmDelete = () => {
    if (!record || deleteBlockedReason) return
    void removeItem.mutateAsync(record.no).then(
      () => {
        setConfirmDelete(false)
        toast('Item deleted', { description: `${record.no} · ${record.desc}` })
        void navigate({ to: BACK_TO })
      },
      () => {
        setConfirmDelete(false)
        toast('Could not delete item', { description: 'Check your connection and try again.' })
      },
    )
  }

  return (
    <>
      <RecordPage<Item, Item>
        key={no}
        pageLabel="Item"
        backTo={BACK_TO}
        backLabel="Back to items"
        recordNo={no}
        state={state}
        record={record}
        notFoundText={`Item ${no} was not found. It may have been deleted.`}
        header={(item) => ({
          title: item.desc,
          no: item.no,
          status: itemProfileStatus(item),
          subtitle: [item.type || 'Inventory', itemCategoryPath(item.category), `UoM ${item.uom}`]
            .filter(Boolean)
            .join('  ·  '),
        })}
        tabs={TABS}
        actions={
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            disabled={!!deleteBlockedReason || removeItem.isPending}
            title={deleteBlockedReason ?? 'Delete item'}
            aria-label="Delete item"
            className="hover-lift inline-flex size-[34px] items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:border-bad-fg hover:bg-bad-bg hover:text-bad-fg disabled:pointer-events-none disabled:opacity-50"
          >
            <Trash2 className="size-[15px]" strokeWidth={2} />
          </button>
        }
        onEdit={() => void navigate({ to: '/warehouse/items/$no/edit', params: { no } })}
        toDraft={(r) => r}
        validate={NOOP_VALIDATE}
        save={NOOP_SAVE}
      >
        {(ctx, tab) => {
          if (!valuation || !bomSummary) return null
          const kpis = [
            { label: 'On hand', value: int(valuation.onHand), sub: ctx.record.uom, bad: false },
            {
              label: 'Available',
              value: int(valuation.available),
              sub: 'On hand − committed',
              bad: valuation.available <= 0,
            },
            { label: 'Committed', value: int(valuation.committed), sub: 'On sales orders', bad: false },
            { label: 'Incoming', value: int(valuation.incoming), sub: 'On purchase orders', bad: false },
          ]

          let body: ReactNode = null
          switch (tab.id) {
            case 'overview':
              body = (
                <ItemOverviewTab
                  item={ctx.record}
                  valuation={valuation}
                  preferredVendor={preferredVendor}
                  onOpenVendor={openVendor}
                />
              )
              break
            case 'stock':
              body = (
                <ItemStockTab
                  item={ctx.record}
                  valuation={valuation}
                  siteBars={siteBars}
                  trackingCards={trackingCards}
                />
              )
              break
            case 'purchasing':
              body = (
                <ItemPurchasingTab
                  item={ctx.record}
                  preferredVendor={preferredVendor}
                  purchaseOrders={poRows}
                  openPoCount={openPoCount}
                  onOpenVendor={openVendor}
                  onOpenPo={openPo}
                  onViewAllLines={() => void navigate({ to: '/purchasing/purchase-lines', search: { item: no } })}
                />
              )
              break
            case 'bom':
              body = (
                <ItemBomTab
                  item={ctx.record}
                  summary={bomSummary}
                  onOpenItem={openItem}
                  onOpenBom={openBom}
                  onNewBom={() => openBom('new')}
                  onOpenAo={openAo}
                  onNewAo={() => openAo('new')}
                />
              )
              break
            case 'units':
              body = <ItemUnitsTab key={ctx.record.no} itemNo={ctx.record.no} baseUom={ctx.record.uom} />
              break
            case 'notes':
              body = <ItemNotesTab itemNo={ctx.record.no} />
              break
          }

          return (
            <div>
              <div className="mb-5 grid grid-cols-[repeat(auto-fit,minmax(175px,1fr))] gap-3.5">
                {kpis.map((k) => (
                  <div key={k.label} className="rounded-xl border border-border bg-card px-4 py-[15px]">
                    <div className="text-[11px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">
                      {k.label}
                    </div>
                    <div className={cn('tnum mt-1.5 text-[24px] font-bold', k.bad && 'text-bad-fg')}>{k.value}</div>
                    <div className="mt-[3px] text-[11.5px] text-muted-foreground">{k.sub}</div>
                  </div>
                ))}
              </div>
              {body}
            </div>
          )
        }}
      </RecordPage>

      {record && (
        <ConfirmDialog
          open={confirmDelete}
          title={`Delete item ${record.no}?`}
          description={`Remove ${record.desc} from the catalogue. This cannot be undone.`}
          confirmLabel="Delete item"
          danger
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </>
  )
}
