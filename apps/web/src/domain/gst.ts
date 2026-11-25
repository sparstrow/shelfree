/**
 * GST reference data and vendor-registration rules (India).
 * See docs/gst-registrations, docs/states, docs/tax-settings.
 */
import type { TaxCalc, Vendor, VendorGstRegType } from '@/data/schemas'

/** `ut-leg` = UT with a legislature (CGST + SGST), `ut` / `other` = CGST + UTGST, `foreign` = IGST only. */
export type GstStateType = 'state' | 'ut-leg' | 'ut' | 'other' | 'foreign'

export interface GstState {
  /** Two-digit GST state code, e.g. `33`. */
  code: string
  name: string
  abbr: string
  type: GstStateType
  /** Union territory without a legislature: same-state tax is CGST + UTGST. */
  ut: boolean
  /** Retired codes stay resolvable but are not offered for new records. */
  legacy: boolean
  /** Why a code is retired; '' for current codes. */
  note: string
}

const S = (code: string, name: string, abbr: string, type: GstStateType, note = ''): GstState => ({
  code,
  name,
  abbr,
  type,
  ut: type === 'ut' || type === 'other',
  legacy: !!note,
  note,
})

export const GST_STATES: readonly GstState[] = [
  S('01', 'Jammu and Kashmir', 'JK', 'ut-leg'), S('02', 'Himachal Pradesh', 'HP', 'state'), S('03', 'Punjab', 'PB', 'state'),
  S('04', 'Chandigarh', 'CH', 'ut'), S('05', 'Uttarakhand', 'UK', 'state'), S('06', 'Haryana', 'HR', 'state'),
  S('07', 'Delhi', 'DL', 'ut-leg'), S('08', 'Rajasthan', 'RJ', 'state'), S('09', 'Uttar Pradesh', 'UP', 'state'),
  S('10', 'Bihar', 'BR', 'state'), S('11', 'Sikkim', 'SK', 'state'), S('12', 'Arunachal Pradesh', 'AR', 'state'),
  S('13', 'Nagaland', 'NL', 'state'), S('14', 'Manipur', 'MN', 'state'), S('15', 'Mizoram', 'MZ', 'state'),
  S('16', 'Tripura', 'TR', 'state'), S('17', 'Meghalaya', 'ML', 'state'), S('18', 'Assam', 'AS', 'state'),
  S('19', 'West Bengal', 'WB', 'state'), S('20', 'Jharkhand', 'JH', 'state'), S('21', 'Odisha', 'OD', 'state'),
  S('22', 'Chhattisgarh', 'CG', 'state'), S('23', 'Madhya Pradesh', 'MP', 'state'), S('24', 'Gujarat', 'GJ', 'state'),
  S('25', 'Daman and Diu', 'DD', 'ut', 'Retired — merged into 26 on 26 Jan 2020'),
  S('26', 'Dadra and Nagar Haveli and Daman and Diu', 'DN', 'ut'), S('27', 'Maharashtra', 'MH', 'state'),
  S('28', 'Andhra Pradesh (old)', 'AP', 'state', 'Retired — Andhra Pradesh registrations use 37'),
  S('29', 'Karnataka', 'KA', 'state'), S('30', 'Goa', 'GA', 'state'), S('31', 'Lakshadweep', 'LD', 'ut'),
  S('32', 'Kerala', 'KL', 'state'), S('33', 'Tamil Nadu', 'TN', 'state'), S('34', 'Puducherry', 'PY', 'ut-leg'),
  S('35', 'Andaman and Nicobar Islands', 'AN', 'ut'), S('36', 'Telangana', 'TS', 'state'), S('37', 'Andhra Pradesh', 'AD', 'state'),
  S('38', 'Ladakh', 'LA', 'ut'), S('97', 'Other territory', 'OT', 'other'), S('96', 'Foreign country', 'FC', 'foreign'),
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
