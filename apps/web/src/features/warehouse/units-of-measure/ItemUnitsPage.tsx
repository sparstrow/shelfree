import { Trash2 } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { type ListBulkAction, type ListDelete, type ListPreview, ListPage } from '@/components/list-page/ListPage'
import { useBulkRemoveItemUnits, useList, useRestoreItemUnits, useUpdateItemUnits } from '@/data/queries'
import type { ItemUnitSet } from '@/data/schemas'
import {
  type ItemUnitRow,
  allUnits,
  buildItemUnitRows,
  formatFactor,
  itemUomDefault,
} from '@/domain/units-of-measure'
import { EM_DASH } from '@/lib/format'
import { itemUnitDataset } from './dataset'

export interface ItemUnitsPageProps {
  /** Item-unit key (`<itemNo> · <code>`) whose drawer opens on arrival. */
  sel?: string
}

/**
 * Warehouse ▸ Units of Measure — register of every unit registered on an item.
 * Exceptions to the list template: derived from `itemUnits` + `items` + global
 * units, so no New button here (units are defined in Settings ▸ Units of measure
 * and attached on the item profile's Units of measure tab); opening a row goes
 * directly to that tab.
 */
export function ItemUnitsPage({ sel }: ItemUnitsPageProps = {}) {
  const items = useList('items')
  const itemUnits = useList('itemUnits')
  const customUnits = useList('unitsOfMeasure')
  const updateItemUnits = useUpdateItemUnits()
  const bulkRemoveUnits = useBulkRemoveItemUnits()
  const restoreItemUnits = useRestoreItemUnits()
  const [bulkDeleting, setBulkDeleting] = useState<{ rows: ItemUnitRow[]; clearSelection: () => void } | null>(null)
  const lastRemovedRef = useRef(new Map<string, ItemUnitSet>())

  const itemList = useMemo(() => items.data ?? [], [items.data])
  const units = useMemo(() => allUnits(customUnits.data ?? []), [customUnits.data])

  const itemUnitsMap = useMemo(() => {
    const map: Record<string, ItemUnitSet> = {}
    for (const entry of itemUnits.data ?? []) map[entry.itemNo] = entry
    return map
  }, [itemUnits.data])

  const rows = useMemo(
    () =>
      items.data && itemUnits.data && customUnits.data
        ? buildItemUnitRows(items.data, units, itemUnitsMap)
        : undefined,
    [items.data, itemUnits.data, customUnits.data, units, itemUnitsMap],
  )
  const dataset = useMemo(() => itemUnitDataset(rows ?? []), [rows])

  const remove: ListDelete<ItemUnitRow> = {
    describe: (r) => `${r.code} · ${r.name} on ${r.itemNo}`,
    run: async (row) => {
      const item = itemList.find((it) => it.no === row.itemNo)
      const prev = itemUnitsMap[row.itemNo] ?? itemUomDefault(row.itemNo, item?.uom ?? '')
      lastRemovedRef.current.set(row.no, structuredClone(prev))
      try {
        await updateItemUnits.mutateAsync({ itemNo: row.itemNo, action: { type: 'remove', code: row.code } })
      } catch (err) {
        lastRemovedRef.current.delete(row.no)
        throw err
      }
    },
    undo: (row) => {
      const prev = lastRemovedRef.current.get(row.no)
      if (!prev) return
      lastRemovedRef.current.delete(row.no)
      void restoreItemUnits.mutateAsync([prev]).catch(() => {
        toast.error('Could not restore item unit', {
          description: 'Check your connection and try again.',
        })
      })
    },
  }

  const bulkActions: ListBulkAction<ItemUnitRow>[] = [
    {
      label: 'Remove',
      icon: Trash2,
      danger: true,
      run: (selected, { clearSelection }) => setBulkDeleting({ rows: selected, clearSelection }),
    },
  ]

  const confirmBulkDelete = async () => {
    if (!bulkDeleting) return
    const { rows: selectedRows, clearSelection } = bulkDeleting
    setBulkDeleting(null)
    if (selectedRows.length === 0) return

    let previousSets: ItemUnitSet[]
    try {
      const res = await bulkRemoveUnits.mutateAsync(
        selectedRows.map((row) => ({ itemNo: row.itemNo, code: row.code })),
      )
      previousSets = res.previousSets
    } catch {
      toast.error('Could not remove selected item units', {
        description: 'Check your connection and try again.',
      })
      return
    }
    clearSelection()
    toast(`${selectedRows.length} ${selectedRows.length === 1 ? 'item unit' : 'item units'} removed`, {
      action: {
        label: 'Undo',
        onClick: () => {
          void restoreItemUnits.mutateAsync(previousSets).catch(() => {
            toast.error('Could not restore item units', {
              description: 'Check your connection and try again.',
            })
          })
        },
      },
    })
  }

  const preview = (r: ItemUnitRow): ListPreview => ({
    ariaLabel: `Item unit ${r.no}`,
    no: r.code,
    status: r.role,
    title: `${r.itemNo} · ${r.itemDesc}`,
    sections: [
      {
        heading: 'UNIT DETAILS',
        rows: [
          { k: 'Unit', v: `${r.code} · ${r.name}` },
          { k: 'Measurement', v: r.catName },
          { k: 'GST UQC', v: r.uqc },
          { k: 'Base unit', v: r.base || EM_DASH },
          {
            k: 'Qty in base',
            v: r.qtyInBase == null ? 'Not set' : `${formatFactor(r.qtyInBase)}${r.base ? ` ${r.base}` : ''}`,
          },
          {
            k: 'Conversion',
            v: r.role === 'Base' ? 'Base unit' : r.fixed ? 'Fixed in Settings' : 'Set on the item',
          },
          { k: 'Source', v: r.source },
          { k: 'Item category', v: r.category || EM_DASH },
        ],
      },
    ],
    children: (
      <div className="px-[14px] pt-1 pb-[14px] text-[11.5px] leading-relaxed text-muted-foreground">
        Conversions, the base unit and the master pack are edited on the item’s Units of measure tab. Unit definitions
        themselves live in Settings · Units of measure.
      </div>
    ),
  })

  return (
    <>
      <ListPage
        dataset={dataset}
        rows={rows}
        isLoading={items.isPending || itemUnits.isPending || customUnits.isPending}
        error={items.error ?? itemUnits.error ?? customUnits.error}
        onRefresh={() => Promise.all([items.refetch(), itemUnits.refetch(), customUnits.refetch()])}
        recordPath={(r) => `/warehouse/items/${r.itemNo}?tab=units`}
        openLabel="Open on item"
        remove={remove}
        bulkActions={bulkActions}
        preview={preview}
        initialActiveId={sel ?? null}
        emptyText="No item units yet. Add units from an item’s Units of measure tab."
      />
      <ConfirmDialog
        open={!!bulkDeleting}
        danger
        title={`Remove ${bulkDeleting?.rows.length ?? 0} selected ${bulkDeleting?.rows.length === 1 ? 'item unit' : 'item units'}?`}
        description="The selected units will be removed from their items. You can undo this right after removing."
        confirmLabel="Remove selected"
        onConfirm={() => void confirmBulkDelete()}
        onCancel={() => setBulkDeleting(null)}
      />
    </>
  )
}
