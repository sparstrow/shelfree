import type { Dataset, GridColumn } from '@/components/data-grid/model'
import type { GstRegistration } from '@/data/schemas'
import { registrationState, seriesText } from '@/domain/gst-registrations'
import { EM_DASH, fmtDate } from '@/lib/format'

/** A registration with the names the grid shows beside it (derived, never stored). */
export interface GstRegistrationRow extends GstRegistration {
  /** `Tamil Nadu` for GSTIN prefix 33; '' when unknown. */
  stateName: string
  /** First invoice number this registration would issue this financial year. */
  invoicePreview: string
  /** Names of the non-inactive sites that file under it. */
  siteNames: string[]
  /** PAN inside the GSTIN differs from the Business profile PAN. */
  panMismatch: boolean
}

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

/** Primary / Active / Cancelled — what the Status column and filter say. */
export const registrationStatusText = (r: Pick<GstRegistration, 'status' | 'primary'>): string =>
  r.status === 'Cancelled' ? 'Cancelled' : r.primary ? 'Primary' : 'Active'

export const toRegistrationRow = (
  r: GstRegistration,
  extra: { siteNames: string[]; pan: string; fiscalLabel: string },
): GstRegistrationRow => ({
  ...r,
  stateName: registrationState(r)?.name ?? '',
  invoicePreview: seriesText(r.series, extra.fiscalLabel),
  siteNames: extra.siteNames,
  panMismatch: !!extra.pan && r.gstin.slice(2, 12) !== extra.pan,
})

export function gstRegistrationsDataset(): Dataset<GstRegistrationRow> {
  const raw = (r: GstRegistrationRow, key: string): string | number => {
    switch (key) {
      case 'gstin':
        return r.gstin
      case 'state':
        return r.stateName ? `${r.gstin.slice(0, 2)} · ${r.stateName}` : ''
      case 'legal':
        return r.legal
      case 'trade':
        return r.trade
      case 'scheme':
        return r.scheme
      case 'regType':
        return r.regType
      case 'status':
        return registrationStatusText(r)
      case 'filing':
        return r.filing
      case 'eInvoice':
        return r.eInvoice ? 'On' : 'Off'
      case 'ewayMin':
        return r.ewayMin
      case 'invoice':
        return r.invoicePreview
      case 'sites':
        return r.siteNames.length
      case 'registeredOn':
        return r.registeredOn
      default:
        return ''
    }
  }
  return {
    id: 'settings-gst-registrations',
    noun: 'registration',
    nounPlural: 'registrations',
    idOf: (r) => r.id,
    labelOf: (r) => r.gstin,
    columns: [
      col('gstin', 'GSTIN', 170, { frozen: 'left', type: 'mono', hideable: false }),
      col('state', 'State', 170),
      col('legal', 'Legal name', 220, { min: 140 }),
      col('status', 'Status', 104, { type: 'pill' }),
      col('scheme', 'Scheme', 112),
      col('regType', 'Type', 90),
      col('filing', 'Returns', 100),
      col('invoice', 'Invoice numbers', 160, { type: 'mono' }),
      col('sites', 'Locations', 100, { type: 'num', align: 'right' }),
      col('trade', 'Trade name', 150, { visible: false }),
      col('eInvoice', 'E-invoice', 96, { visible: false }),
      col('ewayMin', 'E-way bill from (₹)', 140, { type: 'num', align: 'right', visible: false }),
      col('registeredOn', 'Registered on', 120, { visible: false }),
    ],
    raw,
    text: (r, key) => {
      if (key === 'registeredOn') return r.registeredOn ? fmtDate(r.registeredOn) : EM_DASH
      const v = raw(r, key)
      return v === '' ? EM_DASH : String(v)
    },
    searchBlob: (r) =>
      [r.gstin, r.stateName, r.legal, r.trade, r.scheme, r.regType, registrationStatusText(r), r.series, r.siteNames.join(' ')].join(' \u0001 ').toLowerCase(),
    views: [
      { id: 'all', name: 'All registrations', system: true, filters: [] },
      { id: 'active', name: 'Active', filters: [{ key: 'status', op: 'isAny', value: ['Primary', 'Active'] }] },
      { id: 'cancelled', name: 'Cancelled', filters: [{ key: 'status', op: 'isAny', value: ['Cancelled'] }] },
    ],
    filterColumns: [
      { key: 'gstin', label: 'GSTIN', type: 'text' },
      { key: 'legal', label: 'Legal name', type: 'text' },
      { key: 'status', label: 'Status', type: 'enum', options: ['Primary', 'Active', 'Cancelled'] },
      { key: 'scheme', label: 'Scheme', type: 'enum', options: ['Regular', 'Composition'] },
      { key: 'regType', label: 'Type', type: 'enum', options: ['Normal', 'Casual'] },
    ],
  }
}
