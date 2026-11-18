/**
 * Carriers — couriers, transporters (GTA) and our own vehicle.
 * Pure rules; the backend must apply the same validation.
 * See docs/carriers/README.md and docs/carrier-types/README.md.
 */
import type { Carrier, Contact } from '@/data/schemas'
import { EM_DASH } from '@/lib/format'

export type CarrierBehavior = 'courier' | 'gta' | 'own'

export interface CarrierBehaviorInfo {
  id: CarrierBehavior
  label: string
  desc: string
}

export interface CarrierType {
  code: string
  name: string
  behavior: CarrierBehavior
  refLabel: string
  desc: string
  active: boolean
  system: boolean
}

export const CARRIER_BEHAVIORS: readonly CarrierBehaviorInfo[] = [
  {
    id: 'courier',
    label: 'Forward-charge carrier',
    desc: 'Bills freight with GST on its own invoice. GSTIN optional; tracking link supported.',
  },
  {
    id: 'gta',
    label: 'Goods transport agency (GTA)',
    desc: 'Road transporter that issues a lorry receipt (LR). Reverse charge by default — we pay the GST on its freight.',
  },
  {
    id: 'own',
    label: 'Own vehicle',
    desc: 'Our own van or bike. No freight bill, GSTIN, GST or tracking link.',
  },
]

export function carrierBehaviorLabel(id: CarrierBehavior): string {
  return CARRIER_BEHAVIORS.find((b) => b.id === id)?.label ?? EM_DASH
}

/**
 * Default built-in carrier types. Settings ▸ Carrier types is deferred, so
 * carriers resolve types from here until workspace carrierTypes lands.
 */
export const CARRIER_TYPE_DEFAULTS: readonly CarrierType[] = [
  {
    code: 'COURIER',
    name: 'Courier',
    behavior: 'courier',
    refLabel: 'AWB',
    desc: 'Parcel and express couriers — ST Courier, DTDC and similar.',
    active: true,
    system: true,
  },
  {
    code: 'GTA',
    name: 'Transporter (GTA)',
    behavior: 'gta',
    refLabel: 'LR no.',
    desc: 'Lorry transporters (goods transport agencies) that issue a consignment note.',
    active: true,
    system: true,
  },
  {
    code: 'OWN',
    name: 'Own vehicle',
    behavior: 'own',
    refLabel: '',
    desc: 'Our own vehicle for local pickups.',
    active: true,
    system: true,
  },
]

export function carrTypeDefaults(): CarrierType[] {
  return CARRIER_TYPE_DEFAULTS.map((t) => ({ ...t }))
}

export function carrierTypeOf(v: string, types: readonly CarrierType[] = CARRIER_TYPE_DEFAULTS): CarrierType | null {
  return types.find((t) => t.code === v) ?? types.find((t) => t.name === v) ?? null
}

export function carrierBehavior(v: string, types: readonly CarrierType[] = CARRIER_TYPE_DEFAULTS): CarrierBehavior {
  return carrierTypeOf(v, types)?.behavior ?? 'courier'
}

export function carrierTypeName(v: string, types: readonly CarrierType[] = CARRIER_TYPE_DEFAULTS): string {
  return carrierTypeOf(v, types)?.name ?? (v || '')
}

export function carrierTypeCode(v: string, types: readonly CarrierType[] = CARRIER_TYPE_DEFAULTS): string {
  return carrierTypeOf(v, types)?.code ?? (v || '')
}

export function carrierGstTreatment(
  c: Pick<Carrier, 'type' | 'rcm'>,
  types: readonly CarrierType[] = CARRIER_TYPE_DEFAULTS,
): 'Not applicable' | 'Reverse charge' | 'Forward charge' {
  const beh = carrierBehavior(c.type, types)
  if (beh === 'own') return 'Not applicable'
  if (beh === 'gta' && c.rcm) return 'Reverse charge'
  return 'Forward charge'
}

export function carrierTrackingRef(type: string, types: readonly CarrierType[] = CARRIER_TYPE_DEFAULTS): string {
  if (carrierBehavior(type, types) === 'own') return EM_DASH
  return carrierTypeOf(type, types)?.refLabel || 'Tracking no.'
}

export function carrierTrackingLinkStatus(
  c: Pick<Carrier, 'type' | 'trackUrl'>,
  types: readonly CarrierType[] = CARRIER_TYPE_DEFAULTS,
): 'Not applicable' | 'Set' | 'Not set' {
  if (carrierBehavior(c.type, types) === 'own') return 'Not applicable'
  return c.trackUrl ? 'Set' : 'Not set'
}

export function carrierStatus(c: Pick<Carrier, 'active'>): 'Active' | 'Inactive' {
  return c.active === false ? 'Inactive' : 'Active'
}

const SAMPLE_TRACKING = '1234567890'

export function carrierSampleTrackUrl(
  c: Pick<Carrier, 'type' | 'trackUrl'>,
  types: readonly CarrierType[] = CARRIER_TYPE_DEFAULTS,
): string {
  if (carrierBehavior(c.type, types) === 'own') return ''
  if (!c.trackUrl || !/^https:\/\//.test(c.trackUrl)) return ''
  return c.trackUrl.split('{tracking}').join(SAMPLE_TRACKING)
}

/** Attention dot reason for the grid row, or null. */
export function carrierRowFlag(
  c: Pick<Carrier, 'type' | 'trackUrl' | 'active'>,
  types: readonly CarrierType[] = CARRIER_TYPE_DEFAULTS,
): string | null {
  if (c.active === false) return 'Inactive carrier'
  if (carrierBehavior(c.type, types) === 'courier' && !c.trackUrl) return 'No tracking link set'
  return null
}

/** View-mode drawer notices explaining RCM or missing courier tracking links. */
export function carrierNotices(
  c: Pick<Carrier, 'type' | 'rcm' | 'trackUrl'>,
  types: readonly CarrierType[] = CARRIER_TYPE_DEFAULTS,
): string[] {
  const notes: string[] = []
  const beh = carrierBehavior(c.type, types)
  if (beh === 'gta' && c.rcm) {
    notes.push('Reverse charge — this transporter’s freight bills carry no GST; we pay it and claim it back as input tax credit.')
  }
  if (beh === 'courier' && !c.trackUrl) {
    notes.push(
      `No tracking link — ${carrierTrackingRef(c.type, types)} numbers on shipments won’t be clickable until you add one.`,
    )
  }
  return notes
}

export function carrierTypeOptions(currentType: string, types: readonly CarrierType[] = CARRIER_TYPE_DEFAULTS) {
  const currentCode = carrierTypeCode(currentType, types)
  return types
    .filter((t) => t.active !== false || t.code === currentCode)
    .map((t) => ({ value: t.code, label: t.name + (t.active === false ? ' (inactive)' : '') }))
}

export function blankCarrier(types: readonly CarrierType[] = CARRIER_TYPE_DEFAULTS): Carrier {
  const defaultType =
    types.find((t) => t.active !== false && t.behavior === 'courier') ??
    types.find((t) => t.active !== false)
  return {
    no: '',
    name: '',
    type: defaultType?.code ?? 'COURIER',
    gstin: '',
    rcm: false,
    trackUrl: '',
    service: '',
    contactId: '',
    desc: '',
    active: true,
    createdAt: '',
    updatedAt: '',
  }
}

/** Next free `CODE-n` for duplicating a carrier. */
export function nextCarrierCode(base: string, carriers: readonly Pick<Carrier, 'no'>[]): string {
  const used = new Set(carriers.map((c) => c.no))
  const b = String(base || 'CAR').slice(0, 9)
  for (let n = 2; n < 100; n++) {
    const code = `${b}-${n}`
    if (!used.has(code)) return code
  }
  return ''
}

export function duplicateCarrier(c: Carrier, carriers: readonly Carrier[]): Carrier {
  return {
    ...c,
    no: nextCarrierCode(c.no, carriers),
    name: `${c.name} (copy)`,
    active: true,
    createdAt: '',
    updatedAt: '',
  }
}

/** Keep dependent fields in sync while editing a carrier. */
export function carrierOnChange(
  d: Carrier,
  key: string,
  types: readonly CarrierType[] = CARRIER_TYPE_DEFAULTS,
): Carrier {
  const n = { ...d }
  if (key === 'no') n.no = String(n.no || '').toUpperCase()
  if (key === 'gstin') n.gstin = String(n.gstin || '').toUpperCase()
  if (key === 'type') n.rcm = carrierBehavior(n.type, types) === 'gta'
  return n
}

export function normalizeCarrier(
  d: Carrier,
  types: readonly CarrierType[] = CARRIER_TYPE_DEFAULTS,
): Carrier {
  const code = carrierTypeCode(d.type, types)
  const beh = carrierBehavior(code, types)
  const n: Carrier = {
    ...d,
    type: code,
    no: String(d.no || '').trim().toUpperCase(),
    name: String(d.name || '').trim(),
    gstin: String(d.gstin || '').replace(/\s+/g, '').toUpperCase(),
    trackUrl: String(d.trackUrl || '').trim(),
    service: String(d.service || '').trim(),
    contactId: String(d.contactId || ''),
    desc: String(d.desc || '').trim(),
  }
  if (beh !== 'gta') n.rcm = false
  if (beh === 'own') {
    n.gstin = ''
    n.trackUrl = ''
  }
  return n
}

const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/

export function validateCarrier(
  d: Carrier,
  others: readonly Carrier[],
  contacts: readonly Contact[],
  mode: 'edit' | 'new' = d.createdAt ? 'edit' : 'new',
  types: readonly CarrierType[] = CARRIER_TYPE_DEFAULTS,
): Record<string, string> {
  const fe: Record<string, string> = {}
  if (!/^[A-Z0-9][A-Z0-9-]{1,11}$/.test(d.no)) {
    fe.no = 'Use 2–12 letters, digits or hyphens.'
  } else {
    const hit = others.find((r) => r.no === d.no)
    if (hit) fe.no = `Already used by ${hit.name}.`
  }

  if (!d.name) {
    fe.name = 'Enter the carrier’s name.'
  } else if (others.some((r) => r.name.toLowerCase() === d.name.toLowerCase())) {
    fe.name = 'Another carrier already has this name.'
  }

  const tt = carrierTypeOf(d.type, types)
  if (!tt) {
    fe.type = 'Pick a type.'
  } else if (tt.active === false && mode === 'new') {
    fe.type = 'This type is inactive — pick another, or reactivate it in Settings › Carrier types.'
  }

  const beh = tt?.behavior ?? 'courier'
  if (beh !== 'own') {
    if (d.gstin && !GSTIN_PATTERN.test(d.gstin)) {
      fe.gstin = 'A GSTIN is 15 characters — state code, PAN, entity no., Z, check character.'
    } else if (d.gstin && others.some((r) => r.gstin === d.gstin)) {
      fe.gstin = 'Another carrier already has this GSTIN.'
    } else if (beh === 'gta' && !d.rcm && !d.gstin) {
      fe.gstin =
        'A forward-charge GTA bills GST, so it must be registered — enter its GSTIN or switch to reverse charge.'
    }

    if (d.trackUrl && !/^https:\/\/[^\s]+$/.test(d.trackUrl)) {
      fe.trackUrl = 'Use a full https:// address with no spaces.'
    } else if (d.trackUrl && !d.trackUrl.includes('{tracking}')) {
      fe.trackUrl = `Add {tracking} where the ${carrierTrackingRef(d.type, types)} goes.`
    }
  }

  if (d.contactId) {
    const c = contacts.find((x) => x.no === d.contactId)
    if (!c) fe.contactId = 'That contact no longer exists — pick another.'
    else if (c.active === false && mode === 'new') {
      fe.contactId = `${c.name} is inactive — pick another, or reactivate them in People › Contacts.`
    }
  }

  return fe
}

/** Carriers are not referenced by persisted records yet, so deletion is allowed. */
export function carrierDeleteBlocked(): string | null {
  return null
}
