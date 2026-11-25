/**
 * Custom fields — the definitions of extra fields a business adds to its records
 * (Settings ▸ Custom fields, module slices and Shared lists). Pure rules; the backend
 * enforces the same. See docs/custom-fields/README.md.
 *
 * A field is defined for one entity (item, vendor, …) and an entity belongs to exactly one
 * module, so a definition carries one `module` (decided from the entity). Showing the
 * fields on records is not built yet (docs/gaps.md).
 */
import type { CustomField } from '@/data/schemas'

export type CustomFieldEntity = CustomField['entity']
export type CustomFieldType = CustomField['type']
export type CustomFieldModuleId = 'purchasing' | 'sales' | 'warehouse' | 'production' | 'people'

const ENTITY_INFO: Readonly<Record<CustomFieldEntity, { label: string; module: CustomFieldModuleId }>> = {
  item: { label: 'Item', module: 'warehouse' },
  vendor: { label: 'Vendor', module: 'purchasing' },
  'purchase-order': { label: 'Purchase order', module: 'purchasing' },
  customer: { label: 'Customer', module: 'sales' },
  'sales-order': { label: 'Sales order', module: 'sales' },
  bom: { label: 'Bill of materials', module: 'production' },
  'assembly-order': { label: 'Assembly order', module: 'production' },
  employee: { label: 'Employee', module: 'people' },
}

export const CUSTOM_FIELD_ENTITY_IDS = Object.keys(ENTITY_INFO) as CustomFieldEntity[]

export const FIELD_TYPE_LABELS: Readonly<Record<CustomFieldType, string>> = {
  text: 'Text',
  number: 'Number',
  date: 'Date',
  list: 'List',
  yesno: 'Yes / No',
}

export const FIELD_MODULE_LABELS: Readonly<Record<CustomFieldModuleId, string>> = {
  purchasing: 'Purchasing',
  sales: 'Sales',
  warehouse: 'Warehouse',
  production: 'Production',
  people: 'People',
}

export function entityLabel(entity: CustomFieldEntity): string {
  return ENTITY_INFO[entity]?.label ?? entity
}

export function moduleOfEntity(entity: CustomFieldEntity): CustomFieldModuleId {
  return ENTITY_INFO[entity].module
}

export function entitiesForModule(moduleId: string): CustomFieldEntity[] {
  return CUSTOM_FIELD_ENTITY_IDS.filter((e) => ENTITY_INFO[e].module === moduleId)
}

export function moduleLabel(moduleId: string): string {
  return FIELD_MODULE_LABELS[moduleId as CustomFieldModuleId] ?? moduleId
}

export const LABEL_MAX = 40

/** `Low, Medium, High` or one per line → clean, de-duplicated choices (case-insensitive), in order. */
export function parseOptions(text: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const part of text.split(/[\n,]/)) {
    const v = part.trim().replace(/\s+/g, ' ')
    const k = v.toLowerCase()
    if (v && !seen.has(k)) {
      seen.add(k)
      out.push(v)
    }
  }
  return out
}

export function optionsText(options: readonly string[]): string {
  return options.join(', ')
}

export function normalizeField(d: CustomField): CustomField {
  return {
    ...d,
    module: moduleOfEntity(d.entity),
    label: d.label.trim().replace(/\s+/g, ' '),
    options: d.type === 'list' ? d.options.map((o) => o.trim()).filter(Boolean) : [],
  }
}

export function validateField(d: CustomField, others: readonly CustomField[]): Record<string, string> {
  const fe: Record<string, string> = {}
  if (!ENTITY_INFO[d.entity]) fe.entity = 'Pick what the field is added to.'
  if (!d.label) fe.label = 'Enter a label.'
  else if (d.label.length < 2 || d.label.length > LABEL_MAX) fe.label = `Use 2–${LABEL_MAX} characters.`
  else if (others.some((o) => o.entity === d.entity && o.label.toLowerCase() === d.label.toLowerCase())) {
    fe.label = `${entityLabel(d.entity)} already has a field with this label.`
  }
  if (d.type === 'list' && d.options.length < 2) fe.optionsText = 'Add at least two choices, separated by commas.'
  return fe
}

/** Custom fields hold no values yet (not shown on records), so nothing blocks a delete. */
export function fieldDeleteBlock(): string | null {
  return null
}

export function nextFieldId(all: readonly Pick<CustomField, 'id'>[]): string {
  let max = 0
  for (const f of all) {
    const m = /^CF(\d+)$/.exec(f.id)
    if (m) max = Math.max(max, Number.parseInt(m[1], 10))
  }
  return `CF${String(max + 1).padStart(4, '0')}`
}
