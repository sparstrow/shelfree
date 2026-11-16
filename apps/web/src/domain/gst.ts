/**
 * GST reference data and vendor-registration rules (India).
 * See docs/gst-registrations, docs/states, docs/tax-settings.
 */
import type { TaxCalc, Vendor, VendorGstRegType } from '@/data/schemas'

export interface GstState {
  /** Two-digit GST state code, e.g. `33`. */
  code: string
  name: string
  abbr: string
  /** Retired codes stay resolvable but are not offered for new records. */
  legacy: boolean
}

const S = (code: string, name: string, abbr: string, legacy = false): GstState => ({ code, name, abbr, legacy })

export const GST_STATES: readonly GstState[] = [
  S('01', 'Jammu and Kashmir', 'JK'), S('02', 'Himachal Pradesh', 'HP'), S('03', 'Punjab', 'PB'),
  S('04', 'Chandigarh', 'CH'), S('05', 'Uttarakhand', 'UK'), S('06', 'Haryana', 'HR'),
  S('07', 'Delhi', 'DL'), S('08', 'Rajasthan', 'RJ'), S('09', 'Uttar Pradesh', 'UP'),
  S('10', 'Bihar', 'BR'), S('11', 'Sikkim', 'SK'), S('12', 'Arunachal Pradesh', 'AR'),
  S('13', 'Nagaland', 'NL'), S('14', 'Manipur', 'MN'), S('15', 'Mizoram', 'MZ'),
  S('16', 'Tripura', 'TR'), S('17', 'Meghalaya', 'ML'), S('18', 'Assam', 'AS'),
  S('19', 'West Bengal', 'WB'), S('20', 'Jharkhand', 'JH'), S('21', 'Odisha', 'OD'),
  S('22', 'Chhattisgarh', 'CG'), S('23', 'Madhya Pradesh', 'MP'), S('24', 'Gujarat', 'GJ'),
  S('25', 'Daman and Diu', 'DD', true),
  S('26', 'Dadra and Nagar Haveli and Daman and Diu', 'DN'), S('27', 'Maharashtra', 'MH'),
  S('28', 'Andhra Pradesh (old)', 'AP', true),
  S('29', 'Karnataka', 'KA'), S('30', 'Goa', 'GA'), S('31', 'Lakshadweep', 'LD'),
  S('32', 'Kerala', 'KL'), S('33', 'Tamil Nadu', 'TN'), S('34', 'Puducherry', 'PY'),
  S('35', 'Andaman and Nicobar Islands', 'AN'), S('36', 'Telangana', 'TS'), S('37', 'Andhra Pradesh', 'AD'),
  S('38', 'Ladakh', 'LA'), S('97', 'Other territory', 'OT'), S('96', 'Foreign country', 'FC'),
]

export function gstStateByCode(code: string | number | null | undefined): GstState | null {
  const key = String(code ?? '').trim().padStart(2, '0')
  return GST_STATES.find((s) => s.code === key) ?? null
}

export function gstStateByName(name: string | null | undefined): GstState | null {
  const key = String(name ?? '').trim().toLowerCase()
  if (!key) return null
  return GST_STATES.find((s) => !s.legacy && (s.name.toLowerCase() === key || s.abbr.toLowerCase() === key)) ?? null
}

export interface VendorGstTypeInfo {
  value: VendorGstRegType
  label: string
  short: string
  /** Has a GSTIN. */
  gstin: boolean
  /** Charges GST on its invoices (so tax is calculated and credit claimed). */
  charges: boolean
  desc: string
}

export const VENDOR_GST_TYPES: readonly VendorGstTypeInfo[] = [
  { value: 'regular', label: 'Registered — regular', short: 'Regular', gstin: true, charges: true, desc: 'A normal GST-registered business. Their invoice carries GST and we claim it back as input tax credit.' },
  { value: 'composition', label: 'Registered — composition', short: 'Composition', gstin: true, charges: false, desc: 'A small business on the composition scheme. It has a GSTIN but can’t add GST to its bill, so there’s no credit. It can’t supply to another state.' },
  { value: 'unregistered', label: 'Unregistered', short: 'Unregistered', gstin: false, charges: false, desc: 'Below the GST turnover limit, so no GSTIN. No GST on their bill and no credit.' },
  { value: 'sez', label: 'SEZ unit', short: 'SEZ', gstin: true, charges: false, desc: 'Inside a Special Economic Zone, so it counts as an import. IGST is paid on the bill of entry, not on their invoice, and is claimed back.' },
  { value: 'overseas', label: 'Overseas', short: 'Overseas', gstin: false, charges: false, desc: 'Outside India. Goods: IGST is paid at customs. Services: we pay IGST under reverse charge. Both are claimed back.' },
]

export function vendorGstTypeInfo(type: VendorGstRegType): VendorGstTypeInfo {
  return VENDOR_GST_TYPES.find((t) => t.value === type) ?? VENDOR_GST_TYPES[0]
}

type VendorGstFields = Pick<Vendor, 'gstRegType' | 'gstin' | 'state'>

/** A vendor's effective registration type (falls back on whether it has a GSTIN). */
export function vendorGstType(vendor: Partial<VendorGstFields> | null | undefined): VendorGstRegType {
  if (!vendor) return 'regular'
  if (vendor.gstRegType && VENDOR_GST_TYPES.some((t) => t.value === vendor.gstRegType)) return vendor.gstRegType
  return vendor.gstin ? 'regular' : 'unregistered'
}

/** Short tag shown beside a non-regular vendor; '' for regular vendors. */
export function vendorGstTag(vendor: Partial<VendorGstFields> | null | undefined): string {
  const type = vendorGstType(vendor)
  if (type === 'regular') return ''
  if (type === 'composition') return 'Composition · no GST'
  if (type === 'unregistered') return 'Unregistered · no GST'
  return 'Import · tax at customs'
}

/** The vendor's tax state: from the GSTIN prefix, else the address state. */
export function vendorTaxState(vendor: Partial<VendorGstFields> | null | undefined): GstState | null {
  const gstin = String(vendor?.gstin ?? '')
  if (/^[0-9]{2}/.test(gstin)) {
    const hit = gstStateByCode(gstin.slice(0, 2))
    if (hit) return hit
  }
  return vendor?.state ? gstStateByName(vendor.state) : null
}

export interface TaxCalcMethod {
  taxCalc: TaxCalc
  roundTotal: boolean
  src: 'workspace' | 'vendor'
}

/** How tax is calculated for a vendor: its own override, else the workspace setting. */
export function vendorTaxCalc(
  vendor: Pick<Vendor, 'taxCalcOverride' | 'taxCalc' | 'roundTotal'> | null | undefined,
  workspace: { taxCalc: TaxCalc; roundTotal: boolean },
): TaxCalcMethod {
  if (vendor?.taxCalcOverride) {
    return {
      taxCalc: vendor.taxCalc === 'rate' ? 'rate' : 'line',
      roundTotal: vendor.roundTotal != null ? !!vendor.roundTotal : !!workspace.roundTotal,
      src: 'vendor',
    }
  }
  return { taxCalc: workspace.taxCalc === 'rate' ? 'rate' : 'line', roundTotal: !!workspace.roundTotal, src: 'workspace' }
}

export function taxCalcText(method: TaxCalcMethod): string {
  return (
    'Tax ' +
    (method.taxCalc === 'rate' ? 'on each tax-rate total' : 'on each line') +
    ' · ' +
    (method.roundTotal ? 'total rounded to the rupee' : 'total not rounded') +
    ' · ' +
    (method.src === 'vendor' ? 'vendor setting' : 'workspace setting')
  )
}
