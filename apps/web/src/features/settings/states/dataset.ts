import type { Dataset, GridColumn } from '@/components/data-grid/model'
import type { GstState } from '@/domain/gst'
import { GST_STATE_TYPE_LABELS, type PartyCount, partiesText, stateSplitText, stateTypeLabel } from '@/domain/gst-states'
import { EM_DASH } from '@/lib/format'

/** A GST state / territory with the vendors and customers whose address is in it (derived, never stored). */
export type GstStateRow = GstState & { parties: PartyCount }

const col = (key: string, label: string, width: number, extra: Partial<GridColumn> = {}): GridColumn => ({
  key,
  label,
  width,
  min: Math.min(width, 80),
  visible: true,
  align: 'left',
  type: 'text',
  sortable: true,
  ...extra,
})

const TYPE_LABELS = Object.values(GST_STATE_TYPE_LABELS)
const UT_LABELS = [GST_STATE_TYPE_LABELS['ut-leg'], GST_STATE_TYPE_LABELS.ut]
const partiesTotal = (p: PartyCount) => p.vendors + p.customers

export function gstStatesDataset(): Dataset<GstStateRow> {
  const raw = (r: GstStateRow, key: string): string | number => {
    switch (key) {
      case 'code':
        return r.code
      case 'name':
        return r.name
      case 'abbr':
        return r.abbr
      case 'type':
        return stateTypeLabel(r)
      case 'split':
        return stateSplitText(r)
      case 'parties':
        return partiesTotal(r.parties)
      case 'status':
        return r.legacy ? 'Retired' : ''
      default:
        return ''
    }
  }
  return {
    id: 'settings-gst-states',
    noun: 'state',
    nounPlural: 'states',
    idOf: (r) => r.code,
    labelOf: (r) => r.name,
    columns: [
      col('code', 'Code', 80, { frozen: 'left', type: 'mono', hideable: false }),
      col('name', 'Name', 250, { min: 140 }),
      col('abbr', 'Short', 80, { type: 'mono' }),
      col('type', 'Type', 180),
      col('split', 'Same-state tax', 140),
      col('parties', 'Parties', 90, { type: 'num', align: 'right' }),
      col('status', 'Status', 100, { type: 'pill' }),
    ],
    raw,
    text: (r, key) => {
      if (key === 'status') return r.legacy ? 'Retired' : EM_DASH
      const v = raw(r, key)
      return v === '' ? EM_DASH : String(v)
    },
    searchBlob: (r) =>
      [r.code, r.name, r.abbr, stateTypeLabel(r), stateSplitText(r), partiesText(r.parties), r.legacy ? `retired ${r.note}` : '']
        .join(' \u0001 ')
        .toLowerCase(),
    views: [
      { id: 'all', name: 'All', system: true, filters: [] },
      { id: 'states', name: 'States', filters: [{ key: 'type', op: 'isAny', value: [GST_STATE_TYPE_LABELS.state] }] },
      { id: 'uts', name: 'Union territories', filters: [{ key: 'type', op: 'isAny', value: UT_LABELS }] },
    ],
    filterColumns: [
      { key: 'code', label: 'Code', type: 'text' },
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'type', label: 'Type', type: 'enum', options: TYPE_LABELS },
      { key: 'status', label: 'Status', type: 'enum', options: ['Retired'] },
    ],
    defaultSort: { key: 'code', dir: 'asc' },
  }
}
