import type { HelpMap } from '@/components/help/types'
import type { SettingsSectionComponent } from '@/components/settings/SettingsFrame'
import { BusinessProfileSection } from './business-profile/BusinessProfileSection'
import { BUSINESS_PROFILE_HELP } from './business-profile/help'
import { CarrierTypesSection } from './carrier-types/CarrierTypesSection'
import { CARRIER_TYPES_HELP } from './carrier-types/help'
import { CustomFieldsSection } from './custom-fields/CustomFieldsSection'
import { CUSTOM_FIELDS_HELP } from './custom-fields/help'
import { PaymentTermsSection } from './payment-terms/PaymentTermsSection'
import { PAYMENT_TERMS_HELP } from './payment-terms/help'
import { StatusesSection } from './statuses/StatusesSection'
import { STATUSES_HELP } from './statuses/help'
import { ItemCategoriesSection } from './item-categories/ItemCategoriesSection'
import { ITEM_CATEGORIES_HELP } from './item-categories/help'
import { LocationsSection } from './locations/LocationsSection'
import { LOCATIONS_HELP } from './locations/help'
import { NumberSequencesSection } from './number-sequences/NumberSequencesSection'
import { NUMBER_SEQUENCES_HELP } from './number-sequences/help'
import { AssemblyProductionSection } from './assembly-production/AssemblyProductionSection'
import { ASSEMBLY_PRODUCTION_HELP } from './assembly-production/help'
import { SalesPricingSection } from './sales-pricing/SalesPricingSection'
import { SALES_PRICING_HELP } from './sales-pricing/help'
import { ShortcutsSection } from './shortcuts/ShortcutsSection'
import { StatesSection } from './states/StatesSection'
import { STATES_HELP } from './states/help'
import { TaxCodesSection } from './tax-codes/TaxCodesSection'
import { TAX_CODES_HELP } from './tax-codes/help'
import { TaxSettingsSection } from './tax-settings/TaxSettingsSection'
import { TAX_SETTINGS_HELP } from './tax-settings/help'
// Run 2.5b — Workspace (part B)
import { FavoritesViewsSection } from './favorites-views/FavoritesViewsSection'
import { FAVORITES_VIEWS_HELP } from './favorites-views/help'
import { MODULES_HELP } from './modules/help'
import { ModulesCapabilitiesSection } from './modules/ModulesCapabilitiesSection'
import { NAVIGATION_HELP } from './navigation/help'
import { NavigationSection } from './navigation/NavigationSection'
import { PLAN_HELP } from './plan/help'
import { PlanBillingSection } from './plan/PlanBillingSection'
import { TEAM_ROLES_HELP } from './team-roles/help'
import { TeamRolesSection } from './team-roles/TeamRolesSection'
import { UnitsOfMeasureSection } from './units-of-measure/UnitsOfMeasureSection'
import { UOM_HELP } from './units-of-measure/help'
// Run 2.5a — Workspace (part A): GST registrations, Regional & format, Terminology.
import { GstRegistrationsSection } from './gst-registrations/GstRegistrationsSection'
import { GST_REGISTRATIONS_HELP } from './gst-registrations/help'
import { RegionalSection } from './regional/RegionalSection'
import { REGIONAL_HELP } from './regional/help'
import { TerminologySection } from './terminology/TerminologySection'
import { TERMINOLOGY_HELP } from './terminology/help'

/**
 * Sections already moved to the React app, by id (see `components/settings/registry.ts`
 * for the ids and areas). Port a section: build it from `SettingsSection` / `SettingsPage`
 * and add one line here. Anything missing shows "not moved yet" in the frame.
 */
export const SETTINGS_SECTIONS: Readonly<Record<string, SettingsSectionComponent>> = {
  'ws-profile': BusinessProfileSection,
  sequences: NumberSequencesSection,
  shortcuts: ShortcutsSection,
  uom: UnitsOfMeasureSection,
  'carrier-types': CarrierTypesSection,
  statuses: StatusesSection,
  fields: CustomFieldsSection,
  terms: PaymentTermsSection,
  categories: ItemCategoriesSection,
  locations: LocationsSection,
  'cfg-taxset': TaxSettingsSection,
  'tax-codes': TaxCodesSection,
  'cfg-states': StatesSection,
  'cfg-pricing': SalesPricingSection,
  assembly: AssemblyProductionSection,
  'ws-gst': GstRegistrationsSection,
  'ws-regional': RegionalSection,
  terminology: TerminologySection,
  // Run 2.5b — Workspace (part B)
  'ws-modules': ModulesCapabilitiesSection,
  'ws-plan': PlanBillingSection,
  'ws-team': TeamRolesSection,
  'cfg-nav': NavigationSection,
  'cfg-favorites': FavoritesViewsSection,
}

/** Quiet-help maps keyed by section id, used by central Settings "Find a setting". */
export const SETTINGS_HELP_MAPS: Readonly<Record<string, HelpMap>> = {
  'ws-profile': BUSINESS_PROFILE_HELP,
  sequences: NUMBER_SEQUENCES_HELP,
  uom: UOM_HELP,
  'carrier-types': CARRIER_TYPES_HELP,
  statuses: STATUSES_HELP,
  fields: CUSTOM_FIELDS_HELP,
  terms: PAYMENT_TERMS_HELP,
  categories: ITEM_CATEGORIES_HELP,
  locations: LOCATIONS_HELP,
  'cfg-taxset': TAX_SETTINGS_HELP,
  'tax-codes': TAX_CODES_HELP,
  'cfg-states': STATES_HELP,
  'cfg-pricing': SALES_PRICING_HELP,
  assembly: ASSEMBLY_PRODUCTION_HELP,
  'ws-gst': GST_REGISTRATIONS_HELP,
  'ws-regional': REGIONAL_HELP,
  terminology: TERMINOLOGY_HELP,
  // Run 2.5b — Workspace (part B)
  'ws-modules': MODULES_HELP,
  'ws-plan': PLAN_HELP,
  'ws-team': TEAM_ROLES_HELP,
  'cfg-nav': NAVIGATION_HELP,
  'cfg-favorites': FAVORITES_VIEWS_HELP,
}
