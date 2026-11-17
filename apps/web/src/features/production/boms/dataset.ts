import type { Dataset, GridColumn, RawValue } from '@/components/data-grid/model'
import type { Bom, Item, Note } from '@/data/schemas'
import { latestNoteText, notesBlob } from '@/domain/notes'
import { type BomRollup, bomKindLabel, bomRollup, bomStatusLabel } from '@/domain/production'
import { EM_DASH, fmtDate, int, money, todayLocal } from '@/lib/format'

export interface BomDatasetInput {
  boms: readonly Bom[]
  items: readonly Item[]
  notes: readonly Note[]
  /** YYYY-MM-DD reference date for multi-level active BOM resolution; defaults to todayLocal(). */
  today?: string
  /** Show the Kind column and filter (gated by the `production` axis; off by default). */
  showKind?: boolean
}

export function bomDataset({
  boms,
  items,
  notes,
  today = todayLocal(),
  showKind = false,
}: BomDatasetInput): Dataset<Bom> {
  const rollupByNo = new Map<string, BomRollup>()
  for (const bom of boms) {
    rollupByNo.set(bom.no, bomRollup(bom, boms, items, today))
  }

  const unitCostOf = (bomNo: string): number => rollupByNo.get(bomNo)?.unit ?? 0

  const raw = (bom: Bom, key: string): RawValue => {
    switch (key) {
      case 'no':
        return bom.no
      case 'parentItem':
        return bom.parentItem
      case 'parentDesc':
        return bom.parentDesc || ''
      case 'kind':
        return bomKindLabel(bom.kind)
      case 'version':
        return bom.version || ''
      case 'status':
      case '_status':
        return bomStatusLabel(bom.status)
      case 'lineCount':
        return bom.lines.length
      case 'rollup':
        return unitCostOf(bom.no)
      case 'effectiveFrom':
        return bom.effectiveFrom || ''
      case 'updatedAt':
        return bom.updatedAt || ''
      case 'notes':
        return latestNoteText(notes, 'bom', bom.no)
      default:
        return ''
    }
  }

  const text = (bom: Bom, key: string): string => {
    switch (key) {
      case 'rollup':
        return money(unitCostOf(bom.no))
      case 'lineCount':
        return int(bom.lines.length)
      case 'effectiveFrom':
        return bom.effectiveFrom ? fmtDate(bom.effectiveFrom) : EM_DASH
      case 'updatedAt':
        return bom.updatedAt ? fmtDate(bom.updatedAt.slice(0, 10)) : EM_DASH
      case 'parentDesc':
        return bom.parentDesc || EM_DASH
      case 'notes':
        return latestNoteText(notes, 'bom', bom.no) || EM_DASH
      default:
        return String(raw(bom, key) || EM_DASH)
    }
  }

  const columns: GridColumn[] = [
    { key: 'no', label: 'BOM no.', width: 130, min: 96, frozen: 'left', visible: true, align: 'left', type: 'mono', sortable: true },
    { key: 'parentItem', label: 'Parent item', width: 132, min: 96, visible: true, align: 'left', type: 'mono', sortable: true },
    { key: 'parentDesc', label: 'Description', width: 300, min: 160, visible: true, align: 'left', type: 'text', sortable: true },
    { key: 'kind', label: 'Kind', width: 116, min: 88, visible: showKind, align: 'left', type: 'pill', sortable: true },
    { key: 'version', label: 'Version', width: 88, min: 68, visible: true, align: 'left', type: 'text', sortable: true },
    { key: 'status', label: 'Status', width: 116, min: 92, visible: true, align: 'left', type: 'pill', sortable: true },
    { key: 'lineCount', label: 'Components', width: 116, min: 84, visible: true, align: 'right', type: 'num', sortable: true, agg: 'sum', aggFmt: 'int' },
    { key: 'rollup', label: 'Rolled-up cost', width: 140, min: 108, visible: true, align: 'right', type: 'num', sortable: true },
    { key: 'effectiveFrom', label: 'Effective from', width: 130, min: 100, visible: false, align: 'left', type: 'text', sortable: true },
    { key: 'notes', label: 'Latest note', width: 240, min: 120, visible: false, align: 'left', type: 'text', sortable: false },
  ]

  const filterColumns: Dataset<Bom>['filterColumns'] = [
    { key: 'no', label: 'BOM no.', type: 'text' },
    { key: 'parentItem', label: 'Parent item', type: 'text' },
    { key: 'status', label: 'Status', type: 'enum', options: ['Draft', 'Active', 'Archived'] },
    ...(showKind
      ? [{ key: 'kind', label: 'Kind', type: 'enum' as const, options: ['Assembly', 'Production'] }]
      : []),
    { key: 'version', label: 'Version', type: 'text' },
    { key: 'lineCount', label: 'Components', type: 'num' },
    { key: 'rollup', label: 'Rolled-up cost', type: 'num' },
  ]

  return {
    id: 'boms',
    noun: 'bill of materials',
    nounPlural: 'bills of materials',
    idOf: (bom) => bom.no,
    columns,
    raw,
    text,
    searchBlob: (bom) =>
      [
        bom.no,
        bom.parentItem,
        bom.parentDesc,
        bom.version,
        bomStatusLabel(bom.status),
        bomKindLabel(bom.kind),
        notesBlob(notes, 'bom', bom.no),
        ...bom.lines.map((line) => `${line.item} ${line.desc}`),
      ]
        .join(' \u0001 ')
        .toLowerCase(),
    views: [
      { id: 'all', name: 'All', system: true, filters: [] },
      { id: 'active', name: 'Active', filters: [{ key: 'status', op: 'isAny', value: ['Active'] }] },
      { id: 'draft', name: 'Drafts', filters: [{ key: 'status', op: 'isAny', value: ['Draft'] }] },
      { id: 'archived', name: 'Archived', filters: [{ key: 'status', op: 'isAny', value: ['Archived'] }] },
    ],
    filterColumns,
    defaultSort: { key: 'no', dir: 'asc' },
  }
}
