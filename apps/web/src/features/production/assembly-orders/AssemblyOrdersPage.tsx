import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { useMemo } from 'react'
import { type ListPreview, ListPage } from '@/components/list-page/ListPage'
import { useCollectionDelete } from '@/components/list-page/use-collection-delete'
import { NotesBlock } from '@/components/notes/NotesBlock'
import { useList } from '@/data/queries'
import type { AssemblyOrder } from '@/data/schemas'
import {
  aoBuildable,
  aoDeleteBlockedReason,
  aoShortageSummary,
  aoShortages,
  aoSiteName,
  aoStatusLabel,
  availAt,
  mainLocationId,
} from '@/domain/production'
import { EM_DASH, fmtDate, int } from '@/lib/format'
import { assemblyOrderDataset } from './dataset'

const route = getRouteApi('/production/assembly-orders/')

/** Production ▸ Assembly Orders (list). */
export function AssemblyOrdersPage() {
  const navigate = useNavigate()
  const { sel } = route.useSearch()
  const orders = useList('assemblyOrders')
  const items = useList('items')
  const employees = useList('employees')
  const warehouses = useList('warehouses')
  const notes = useList('notes')

  const allItems = useMemo(() => items.data ?? [], [items.data])
  const allWarehouses = useMemo(() => warehouses.data ?? [], [warehouses.data])
  const mainLocId = useMemo(() => mainLocationId(allWarehouses), [allWarehouses])

  const dataset = useMemo(
    () =>
      assemblyOrderDataset({
        orders: orders.data ?? [],
        items: allItems,
        employees: employees.data ?? [],
        warehouses: allWarehouses,
        notes: notes.data ?? [],
      }),
    [orders.data, allItems, employees.data, allWarehouses, notes.data],
  )

  const remove = useCollectionDelete<AssemblyOrder>('assemblyOrders', {
    blockedReason: (order) => aoDeleteBlockedReason(order),
    describe: (order) => `${order.no} · ${order.desc || order.item}`,
  })

  const preview = (order: AssemblyOrder): ListPreview => {
    const shortages = aoShortages(order, allItems, mainLocId)
    const shortageBanner = aoShortageSummary(shortages)
    const siteName = aoSiteName(order.location, allWarehouses)

    return {
      ariaLabel: `Assembly order ${order.no}`,
      no: order.no,
      status: aoStatusLabel(order.status),
      title: order.desc || order.item,
      subtitle: `${order.item} · due ${order.dueDate ? fmtDate(order.dueDate) : EM_DASH}`,
      stats: [
        { value: int(order.qty), label: 'To build' },
        { value: `${int(order.qtyFinished || 0)} / ${int(order.qty)}`, label: 'Finished' },
        { value: siteName, label: 'Output' },
      ],
      notice: shortageBanner ?? undefined,
      linesHeading: 'COMPONENTS',
      linesEmptyText: 'No components on this order.',
      lines: order.lines.map((line, i) => ({
        key: `${line.lineNo}-${line.item}-${i}`,
        left: (
          <>
            <span className="font-mono text-[11.5px] text-muted-foreground">{line.item}</span> · {line.desc}{' '}
            <span className="text-muted-foreground">
              ×{line.qtyRequired} {line.uom}
            </span>
          </>
        ),
        right: `${int(availAt(line.item, order.location, allItems, mainLocId))} avail.`,
        rightTone: 'muted',
      })),
      facts: [
        { k: 'BOM', v: (order.bomId || EM_DASH) + (order.bomVersion ? ` · ${order.bomVersion}` : '') },
        { k: 'Ordered', v: order.orderDate ? fmtDate(order.orderDate) : EM_DASH },
        { k: 'Output location', v: siteName },
        { k: 'Buildable now', v: int(aoBuildable(order, allItems, mainLocId)) },
      ],
      children: (
        <div className="border-t border-border px-[14px] pt-3 pb-[14px]">
          <NotesBlock
            entityType="assemblyOrder"
            entityNo={order.no}
            listMaxHeight={220}
            placeholder="Batch notes, breakage, who is building it…"
          />
        </div>
      ),
    }
  }

  return (
    <ListPage
      dataset={dataset}
      rows={orders.data}
      isLoading={orders.isPending}
      error={orders.error}
      onRefresh={() =>
        Promise.all([orders.refetch(), items.refetch(), employees.refetch(), warehouses.refetch(), notes.refetch()])
      }
      recordPath={(order) => `/production/assembly-orders/${order.no}`}
      openLabel="Open order"
      create={{
        label: 'New assembly order',
        run: () => void navigate({ to: '/production/assembly-orders/$no', params: { no: 'new' } }),
      }}
      remove={remove}
      preview={preview}
      initialActiveId={sel ?? null}
      emptyText="No assembly orders yet. Use New assembly order to create the first one."
    />
  )
}
