/**
 * Thin compatibility re-exports from `./registry`.
 * New callers should import from `@/components/settings/registry` directly.
 */
export {
  SETTINGS_AREAS,
  SETTINGS_MODULE_IDS,
  SHARED_LIST_IDS,
  areasForModules,
  findArea,
  findCentralSection,
  findSection,
  firstSection,
  isSettingsModule,
  legacyRedirect,
  legacyTarget,
  moduleSettingsFromPath,
  searchSettings,
  sectionPath,
  type FoundSection,
  type SectionDef,
  type SectionType,
  type SettingsArea,
  type SettingsAreaId,
  type SettingsAreaKind,
  type SettingsModuleId,
  type SettingsSearchMatch,
  type SharedListId,
} from './registry'
