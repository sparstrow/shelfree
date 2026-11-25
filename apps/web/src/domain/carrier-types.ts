/**
 * Carrier types — the user-maintained list behind Purchasing ▸ Carriers ▸ Type
 * (Settings ▸ Purchasing ▸ Carrier types). Pure rules; the backend enforces the same.
 * See docs/carrier-types/README.md.
 */
import type { Carrier, CarrierTypeRecord } from '@/data/schemas'
import { CARRIER_BEHAVIORS, type CarrierBehavior } from '@/domain/carriers'

export const CODE_PATTERN = /^[A-Z0-9][A-Z0-9-]{1,11}$/

/** Tracking reference label each behaviour suggests (courier AWB, GTA LR no., own none). */
export function suggestRefLabel(behavior: CarrierBehavior): string {
  return behavior === 'courier' ? 'AWB' : behavior === 'gta' ? 'LR no.' : ''
}

/** A carrier uses a type when it stores the type's code (legacy rows may hold the name). */
export function carriersUsingType(type: Pick<CarrierTypeRecord, 'code' | 'name'>, carriers: readonly Pick<Carrier, 'type'>[]): number {
  return carriers.filter((c) => c.type === type.code || c.type === type.name).length
}

export function countByType(
  types: readonly Pick<CarrierTypeRecord, 'code' | 'name'>[],
  carriers: readonly Pick<Carrier, 'type'>[],
): Map<string, number> {
  return new Map(types.map((t) => [t.code, carriersUsingType(t, carriers)]))
}

/** Why the behaviour can't change, or null. Changing it would flip existing carriers' GST treatment. */
export function behaviorLockReason(type: Pick<CarrierTypeRecord, 'system'>, used: number): string | null {
  if (type.system) return 'Built-in types keep their behaviour so GST treatment stays correct.'
  if (used > 0) {
    return `${used} ${used === 1 ? 'carrier uses' : 'carriers use'} this type, so its behaviour is fixed. Create a new type instead.`
  }
  return null
}

export function codeLocked(used: number): boolean {
  return used > 0
}

/** Why a type can't be deleted, or null. */
export function carrierTypeDeleteBlock(type: Pick<CarrierTypeRecord, 'system'>, used: number): string | null {
  if (type.system) return 'Built-in types can’t be deleted — make them inactive instead.'
  if (used > 0) {
    return `${used} ${used === 1 ? 'carrier uses' : 'carriers use'} this type — move ${used === 1 ? 'it' : 'them'} to another type first.`
  }
  return null
}

export function blankCarrierType(): CarrierTypeRecord {
  return { code: '', name: '', behavior: 'courier', refLabel: 'AWB', desc: '', active: true, system: false }
}

const STOCK_REF_LABELS: readonly string[] = ['AWB', 'LR no.', '']

/** Keep dependent fields in step while editing: upper-case code; a stock ref. label follows the behaviour (a typed one stays). */
export function carrierTypeOnChange(d: CarrierTypeRecord, key: string): CarrierTypeRecord {
  const n = { ...d }
  if (key === 'code') n.code = n.code.toUpperCase()
  if (key === 'behavior' && STOCK_REF_LABELS.includes(n.refLabel.trim())) n.refLabel = suggestRefLabel(n.behavior)
  return n
}

export function normalizeCarrierType(d: CarrierTypeRecord): CarrierTypeRecord {
  return {
    ...d,
    code: d.code.trim().toUpperCase(),
    name: d.name.trim(),
    refLabel: d.behavior === 'own' ? '' : d.refLabel.trim(),
    desc: d.desc.trim(),
  }
}

export function validateCarrierType(
  d: CarrierTypeRecord,
  others: readonly CarrierTypeRecord[],
): Record<string, string> {
  const fe: Record<string, string> = {}
  if (!CODE_PATTERN.test(d.code)) fe.code = 'Use 2–12 letters, digits or hyphens.'
  else if (others.some((t) => t.code === d.code)) fe.code = 'This code is already used.'

  if (!d.name) fe.name = 'Enter a name.'
  else if (others.some((t) => t.name.toLowerCase() === d.name.toLowerCase())) fe.name = 'Another type already has this name.'

  if (!CARRIER_BEHAVIORS.some((b) => b.id === d.behavior)) fe.behavior = 'Pick how this type behaves.'
  if (d.refLabel.length > 16) fe.refLabel = 'Keep it to 16 characters.'

  if (!d.active && !others.some((t) => t.active)) {
    fe.active = 'At least one carrier type must stay active.'
  }
  return fe
}
