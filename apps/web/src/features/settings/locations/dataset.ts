import type { Dataset, GridColumn } from '@/components/data-grid/model'
import type { Floor, Warehouse } from '@/data/schemas'
import {
  LOCATION_POB,
  LOCATION_STATUSES,
  LOCATION_TYPES,
  locationPobLabel,
  locationStateLabel,
  locationStatusLabel,
  locationTypeLabel,
} from '@/domain/locations'
import { EM_DASH } from '@/lib/format'

/** A site with the figures and names the grid shows beside it. */
export interface LocationRow extends Warehouse {
  /** The building's floors, ground first (a site saved before floors existed reads as one ground floor). */
  floors: Floor[]
  /** Areas on each floor, by floor id. */
  areaCounts: Record<string, number>
  /** Areas on all floors. */
  areaTotal: number
  stock: number
  openDocs: number
  managerName: string
  operatorName: string
  /** GSTIN of the registration the site files under (its state's active Normal registration); '' when none. */
  registration: string
}

const col = (key: string, label: string, width: number, extra: Partial<GridColumn> = {}): GridColumn => ({
  key,
  label,
  width,
  min: Math.min(width, 72),
  visible: true,
  align: 'left',
  type: 'text',
  sortable: true,
  ...extra,
})

/** `term` is the workspace's name for a location (Settings ▸ Terminology), e.g. `{ singular: 'Store', plural: 'Stores' }`. */
export function locationsDataset(term: { singular: string; plural: string } = { singular: 'Location', plural: 'Locations' }): Dataset<LocationRow> {
  const raw = (w: LocationRow, key: string): string | number => {
    switch (key) {
      case 'code':
        return w.code
      case 'name':
        return w.name
      case 'type':
        return locationTypeLabel(w.type)
      case 'status':
        return locationStatusLabel(w.status)
      case 'city':
        return w.city
      case 'state':
        return locationStateLabel(w)
      case 'manager':
        return w.managerName
      case 'pob':
        return locationPobLabel(w.pobStatus)
      case 'registration':
        return w.registration
      case 'area':
        return w.area
      case 'floors':
        return w.floors.length
      case 'areas':
        return w.areaTotal
      case 'stock':
        return w.stock
      case 'openDocs':
        return w.openDocs
      default:
        return ''
    }
  }
  const statuses = LOCATION_STATUSES.map((s) => s.label)
  const types = LOCATION_TYPES.map((t) => t.label)
  return {
    id: 'settings-locations',
    noun: term.singular.toLowerCase(),
    nounPlural: term.plural.toLowerCase(),
    idOf: (w) => w.id,
    labelOf: (w) => w.code,
    columns: [
      col('code', 'Code', 112, { frozen: 'left', type: 'mono', hideable: false }),
      col('name', 'Name', 220, { min: 140 }),
      col('type', 'Type', 150),
      col('status', 'Status', 112, { type: 'pill' }),
      col('city', 'City', 140),
      col('state', 'State', 130),
      col('manager', 'Manager', 160),
      col('registration', 'GST registration', 160, { type: 'mono', visible: false }),
      col('pob', 'GST certificate', 150, { visible: false }),
      col('area', 'Area (sq ft)', 112, { type: 'num', align: 'right', visible: false }),
      col('floors', 'Floors', 88, { type: 'num', align: 'right' }),
      col('areas', 'Areas', 88, { type: 'num', align: 'right', agg: 'sum', aggFmt: 'int' }),
      col('stock', 'Units in stock', 120, { type: 'num', align: 'right', agg: 'sum', aggFmt: 'int' }),
      col('openDocs', 'Open documents', 130, { type: 'num', align: 'right', agg: 'sum', aggFmt: 'int' }),
    ],
    raw,
    text: (w, key) => String(raw(w, key) === '' ? EM_DASH : raw(w, key)),
    searchBlob: (w) =>
      [w.code, w.name, locationTypeLabel(w.type), w.city, locationStateLabel(w), w.managerName, w.addr]
        .join(' \u0001 ')
        .toLowerCase(),
    views: [
      { id: 'all', name: `All ${term.plural.toLowerCase()}`, system: true, filters: [] },
      { id: 'active', name: 'Active', filters: [{ key: 'status', op: 'isAny', value: ['Active'] }] },
      ...LOCATION_TYPES.map((t) => ({
        id: `type:${t.value}`,
        name: t.label,
        filters: [{ key: 'type', op: 'isAny' as const, value: [t.label] }],
      })),
    ],
    filterColumns: [
      { key: 'code', label: 'Code', type: 'text' },
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'type', label: 'Type', type: 'enum', options: types },
      { key: 'status', label: 'Status', type: 'enum', options: statuses },
      { key: 'city', label: 'City', type: 'text' },
      { key: 'pob', label: 'GST certificate', type: 'enum', options: LOCATION_POB.map((p) => locationPobLabel(p.value)) },
    ],
  }
}
