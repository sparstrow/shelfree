/**
 * Modules & capabilities — which modules are on and which scale capabilities are enabled.
 * Pure rules (no React, no storage); the backend enforces the same. See docs/modules-capabilities/README.md.
 *
 * Tiers are parked (CLAUDE.md "CURRENT WORKING MODE"): nothing here is locked by plan.
 */

/** Modules the workspace can switch on or off, in sidebar order. `locked` modules are always on. */
export const WORKSPACE_MODULES = [
  { id: 'home', name: 'Home', locked: true },
  { id: 'finance', name: 'Finance', locked: false },
  { id: 'sales', name: 'Sales', locked: false },
  { id: 'purchasing', name: 'Purchasing', locked: false },
  { id: 'warehouse', name: 'Warehouse', locked: true },
  { id: 'production', name: 'Production', locked: false },
  { id: 'people', name: 'People', locked: false },
  { id: 'notes', name: 'Notes', locked: false },
] as const

export type WorkspaceModuleId = (typeof WORKSPACE_MODULES)[number]['id']

/** A module's on / off switches (missing = on). */
export type ModuleSwitches = Readonly<Record<string, boolean>>

export interface CapabilityDef {
  key: string
  label: string
  desc: string
  /** Default for a new workspace (the prototype's workspace defaults). */
  default: boolean
}

/**
 * The scale capabilities, in the prototype's order. `customerPricing` is the one capability that is
 * not stored with the others: its switch IS `settings.salesPricing.enabled`, so there is one source.
 */
export const CAPABILITIES: readonly CapabilityDef[] = [
  { key: 'multiWarehouse', label: 'Multiple warehouses', desc: 'Hold stock across more than one site.', default: true },
  { key: 'zones', label: 'Zones, aisles & bins', desc: 'Sub-locations within a warehouse.', default: true },
  { key: 'lotBatch', label: 'Lot / batch tracking', desc: 'Track goods by production lot.', default: false },
  { key: 'expiry', label: 'Expiry dates', desc: 'Shelf-life and FEFO picking.', default: true },
  { key: 'barcodes', label: 'Barcodes', desc: 'Scan to receive, pick and count.', default: true },
  {
    key: 'customerPricing',
    label: 'Customer-specific pricing',
    desc: 'Give chosen customers their own agreed price per item, with bulk tiers and dates.',
    default: true,
  },
  { key: 'advReporting', label: 'Advanced reporting', desc: 'Custom analytics & dashboards.', default: false },
  {
    key: 'production',
    label: 'Production orders & routing',
    desc: 'Routed manufacturing with operations, yield and WIP — beyond simple assembly.',
    default: false,
  },
  { key: 'serial', label: 'Serial numbers', desc: 'Unit-level serialised tracking.', default: false },
  { key: 'approvals', label: 'Purchase approvals', desc: 'Approval routing on purchase orders.', default: false },
  { key: 'multiCurrency', label: 'Multi-currency', desc: 'Transact in more than one currency.', default: false },
  { key: 'integrations', label: 'Integrations', desc: 'Accounting, e-commerce, EDI.', default: false },
]

export const CUSTOMER_PRICING_KEY = 'customerPricing'

/** Capabilities that have somewhere in the React app that reads them today (gap G-034 lists the rest). */
export const CAPABILITIES_IN_USE: ReadonlySet<string> = new Set([CUSTOMER_PRICING_KEY, 'production'])

export type CapabilitySwitches = Readonly<Record<string, boolean>>

/** Defaults for the stored capabilities (everything except customer pricing). */
export const DEFAULT_CAPABILITIES: CapabilitySwitches = Object.fromEntries(
  CAPABILITIES.filter((c) => c.key !== CUSTOMER_PRICING_KEY).map((c) => [c.key, c.default]),
)

export const DEFAULT_MODULES: ModuleSwitches = Object.fromEntries(WORKSPACE_MODULES.map((m) => [m.id, true]))

export function isModuleLocked(id: string): boolean {
  return WORKSPACE_MODULES.some((m) => m.id === id && m.locked)
}

/** On unless switched off; a locked module is always on. */
export function isModuleOn(modules: ModuleSwitches | undefined, id: string): boolean {
  if (isModuleLocked(id)) return true
  return modules?.[id] !== false
}

/** Ids of the modules that are on. */
export function enabledModuleIds(modules: ModuleSwitches | undefined): WorkspaceModuleId[] {
  return WORKSPACE_MODULES.filter((m) => isModuleOn(modules, m.id)).map((m) => m.id)
}

/** The stored modules with every module present and locked ones on. */
export function normalizeModules(modules: ModuleSwitches | undefined): Record<string, boolean> {
  return Object.fromEntries(WORKSPACE_MODULES.map((m) => [m.id, isModuleOn(modules, m.id)]))
}

export function isCapabilityOn(
  caps: CapabilitySwitches | undefined,
  key: string,
  customerPricing: boolean,
): boolean {
  if (key === CUSTOMER_PRICING_KEY) return customerPricing
  return caps?.[key] ?? DEFAULT_CAPABILITIES[key] ?? false
}

/** The form's draft: one flat record of `mod.<id>` and `cap.<key>` switches. */
export type ModulesCapabilitiesDraft = Record<string, boolean>

export function toDraft(
  modules: ModuleSwitches | undefined,
  caps: CapabilitySwitches | undefined,
  customerPricing: boolean,
): ModulesCapabilitiesDraft {
  const draft: ModulesCapabilitiesDraft = {}
  for (const m of WORKSPACE_MODULES) draft[`mod.${m.id}`] = isModuleOn(modules, m.id)
  for (const c of CAPABILITIES) draft[`cap.${c.key}`] = isCapabilityOn(caps, c.key, customerPricing)
  return draft
}

export interface ModulesCapabilitiesValue {
  modules: Record<string, boolean>
  capabilities: Record<string, boolean>
  customerPricing: boolean
}

export function fromDraft(draft: ModulesCapabilitiesDraft): ModulesCapabilitiesValue {
  const modules = normalizeModules(Object.fromEntries(WORKSPACE_MODULES.map((m) => [m.id, draft[`mod.${m.id}`]])))
  const capabilities: Record<string, boolean> = {}
  for (const c of CAPABILITIES) {
    if (c.key !== CUSTOMER_PRICING_KEY) capabilities[c.key] = draft[`cap.${c.key}`] === true
  }
  return { modules, capabilities, customerPricing: draft[`cap.${CUSTOMER_PRICING_KEY}`] === true }
}

/** Shown beside a module that is off (state, not help). */
export function moduleOffNote(id: string): string | null {
  return isModuleLocked(id) ? null : 'Off — its pages and settings are hidden from everyone.'
}
