import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { useMemo } from 'react'
import { type ListPreview, ListPage } from '@/components/list-page/ListPage'
import { useCollectionDelete } from '@/components/list-page/use-collection-delete'
import { NotesBlock } from '@/components/notes/NotesBlock'
import { useList } from '@/data/queries'
import type { Bom } from '@/data/schemas'
import {
  bomBuildable,
  bomDeleteBlockedReason,
  bomRollup,
  bomStatusLabel,
  bomUnitCostOf,
  mainLocationId,
} from '@/domain/production'
import { EM_DASH, fmtDate, int, money, todayLocal } from '@/lib/format'
import { bomDataset } from './dataset'

const route = getRouteApi('/production/bills-of-materials/')

/** Production ▸ Bills of Materials (list). */
export function BomsPage() {
  const navigate = useNavigate()
  const { sel } = route.useSearch()
  const boms = useList('boms')
  const items = useList('items')
  const orders = useList('assemblyOrders')
  const warehouses = useList('warehouses')
  const notes = useList('notes')

  const today = useMemo(() => todayLocal(), [])
  const allBoms = useMemo(() => boms.data ?? [], [boms.data])
  const allItems = useMemo(() => items.data ?? [], [items.data])
  const allOrders = orders.data ?? []
  const mainLocId = useMemo(() => mainLocationId(warehouses.data ?? []), [warehouses.data])

  const dataset = useMemo(
    () =>
      bomDataset({
        boms: allBoms,
        items: allItems,
        notes: notes.data ?? [],
        today,
      }),
    [allBoms, allItems, notes.data, today],
  )

  const remove = useCollectionDelete<Bom>('boms', {
    blockedReason: (bom) => bomDeleteBlockedReason(bom, allOrders),
    describe: (bom) => `${bom.no} · ${bom.parentDesc || bom.parentItem}`,
  })

  const preview = (bom: Bom): ListPreview => {
    const rollup = bomRollup(bom, allBoms, allItems, today)
    const buildable = bomBuildable(bom, allItems, mainLocId, mainLocId)

    return {
      ariaLabel: `Bill of materials ${bom.no}`,
      no: bom.no,
      status: bomStatusLabel(bom.status),
      title: bom.parentDesc || bom.parentItem,
      subtitle: `${bom.parentItem} · ${bom.version}`,
      stats: [
        { value: money(rollup.unit), label: 'Rolled-up cost' },
        { value: int(bom.lines.length), label: 'Components' },
        { value: int(buildable), label: 'Can build' },
      ],
      linesHeading: 'COMPONENTS',
      linesEmptyText: 'No components yet.',
      lines: bom.lines.map((line, i) => ({
        key: `${line.lineNo}-${line.item}-${i}`,
        left: (
          <>
            <span className="font-mono text-[11.5px] text-muted-foreground">{line.item}</span> · {line.desc}{' '}
            <span className="text-muted-foreground">
              ×{line.qtyPer} {line.uom}
            </span>
          </>
        ),
        right: money(bomUnitCostOf(line.item, allBoms, allItems, today) * (Number(line.qtyPer) || 0)),
      })),
      facts: [
        { k: 'Output', v: `${bom.outputQty} ${bom.uom}` },
        { k: 'Materials', v: money(rollup.materials) },
        { k: 'Labour', v: money(rollup.labour) },
        { k: 'Overhead', v: money(rollup.overhead) },
        { k: 'Effective from', v: bom.effectiveFrom ? fmtDate(bom.effectiveFrom) : EM_DASH },
        { k: 'Effective to', v: bom.effectiveTo ? fmtDate(bom.effectiveTo) : 'Open-ended' },
      ],
      children: (
        <div className="border-t border-border px-[14px] pt-3 pb-[14px]">
          <NotesBlock
            entityType="bom"
            entityNo={bom.no}
            listMaxHeight={220}
            placeholder="Assembly instructions, QC checks, handling notes…"
          />
        </div>
      ),
    }
  }

  return (
    <ListPage
      dataset={dataset}
      rows={boms.data}
      isLoading={boms.isPending}
      error={boms.error}
      onRefresh={() =>
        Promise.all([boms.refetch(), items.refetch(), orders.refetch(), warehouses.refetch(), notes.refetch()])
      }
      recordPath={(bom) => `/production/bills-of-materials/${bom.no}`}
      openLabel="Open BOM"
      create={{
        label: 'New BOM',
        run: () => void navigate({ to: '/production/bills-of-materials/$no', params: { no: 'new' } }),
      }}
      remove={remove}
      preview={preview}
      initialActiveId={sel ?? null}
      emptyText="No bills of materials yet. Use New BOM to create the first one."
    />
  )
}
