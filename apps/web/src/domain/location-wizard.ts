/**
 * The New location setup wizard's draft and its per-step rules (Settings ▸ Locations & warehouses).
 * Pure functions only; the steps themselves live in `features/settings/locations/LocationWizard.tsx`.
 * Saving rules are the ones in `domain/locations` — a step only decides which of their errors it owns.
 */
import type { Floor, GstRegistration, Warehouse } from '@/data/schemas'
import { type AreaPick, DEFAULT_FLOOR, suggestLocationCode } from './location-layouts'
import { nextLocationId, normalizeLocation, normalizeLocationCode, validateLocation } from './locations'

export type LocationWizardStepId = 'basics' | 'building' | 'areas' | 'finish'

export const LOCATION_WIZARD_STEPS: readonly LocationWizardStepId[] = ['basics', 'building', 'areas', 'finish']

export interface LocationWizardDraft {
  name: string
  code: string
  type: string
  floors: Floor[]
  areas: AreaPick[]
  addr: string
  city: string
  state: string
  zip: string
  country: string
  /** Floor area as typed (sq ft). */
  area: string
  status: string
  pobStatus: string
  managerEmpId: string
  operatorVendorId: string
}

/** A new site as the wizard starts it: a Distribution site in India with one ground floor, Setting up. */
export function blankLocationDraft(): LocationWizardDraft {
  return {
    name: '',
    code: '',
    type: 'dc',
    floors: [{ ...DEFAULT_FLOOR }],
    areas: [],
    addr: '',
    city: '',
    state: '',
    zip: '',
    country: 'IN',
    area: '',
    status: 'setup',
    pobStatus: 'undeclared',
    managerEmpId: '',
    operatorVendorId: '',
  }
}

/** The code the site will get: what was typed, else one suggested from the name. */
export const effectiveCode = (d: Pick<LocationWizardDraft, 'name' | 'code'>): string =>
  normalizeLocationCode(d.code) || suggestLocationCode(d.name)

/** The site the draft describes (not yet saved — `normalizeLocation` runs again on save). */
export function draftToWarehouse(d: LocationWizardDraft, all: readonly Warehouse[]): Warehouse {
  const code = effectiveCode(d)
  const site = normalizeLocation({
    id: '',
    name: d.name,
    code,
    type: d.type,
    addr: d.addr,
    city: d.city,
    state: d.state,
    zip: d.zip,
    country: d.country,
    area: Number(d.area),
    status: d.status,
    pobStatus: d.pobStatus,
    managerEmpId: d.managerEmpId,
    operatorVendorId: d.operatorVendorId,
    floors: d.floors,
  })
  return { ...site, id: nextLocationId(all, site.code) }
}

/** Which of `validateLocation`'s error keys belong to which step. */
const STEP_KEYS: Record<LocationWizardStepId, readonly string[]> = {
  basics: ['name', 'code'],
  building: ['floors'],
  areas: [],
  finish: ['state', 'status', 'operatorVendorId'],
}

/** The step that owns an error key. */
export const stepOfError = (key: string): LocationWizardStepId =>
  LOCATION_WIZARD_STEPS.find((s) => STEP_KEYS[s].includes(key)) ?? 'finish'

/** Every error the finished draft has, by field key (empty = can be created). */
export function locationDraftErrors(
  d: LocationWizardDraft,
  all: readonly Warehouse[],
  vendorNos: ReadonlySet<string>,
  registrations: readonly GstRegistration[],
): Record<string, string> {
  const errors = validateLocation(draftToWarehouse(d, all), all, null, undefined, vendorNos, registrations)
  if (errors.name) errors.name = 'Give your warehouse a name to continue.'
  return errors
}

/** The errors one step shows and is blocked by. */
export function stepErrors(
  step: LocationWizardStepId,
  d: LocationWizardDraft,
  all: readonly Warehouse[],
  vendorNos: ReadonlySet<string>,
  registrations: readonly GstRegistration[],
): Record<string, string> {
  const errors = locationDraftErrors(d, all, vendorNos, registrations)
  return Object.fromEntries(Object.entries(errors).filter(([key]) => STEP_KEYS[step].includes(key)))
}
