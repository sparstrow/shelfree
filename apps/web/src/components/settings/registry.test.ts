import type { HelpMap } from '@/components/help/types'
import {
  SETTINGS_AREAS,
  SETTINGS_MODULE_IDS,
  SHARED_LIST_IDS,
  areasForModules,
  findCentralSection,
  findSection,
  firstSection,
  isSettingsModule,
  legacyRedirect,
  moduleSettingsFromPath,
  searchSettings,
  sectionPath,
} from './registry'

/** All 30 section ids from the original flat Settings navigation. */
const PROTOTYPE_SECTION_IDS = [
  'ws-profile',
  'ws-gst',
  'ws-plan',
  'ws-modules',
  'ws-regional',
  'ws-team',
  'shortcuts',
  'uom',
  'categories',
  'locations',
  'assembly',
  'carrier-types',
  'cfg-nav',
  'cfg-favorites',
  'cfg-pricing',
  'cfg-terms',
  'cfg-tax',
  'cfg-taxset',
  'cfg-states',
  'cfg-statuses',
  'cfg-sequences',
  'cfg-fields',
  'terminology',
  'me-profile',
  'me-appearance',
  'me-notifications',
  'me-language',
  'me-defaults',
  'me-favorites',
  'me-security',
] as const

describe('settings registry', () => {
  it('accounts for every prototype section id exactly once (as canonical id or legacy id)', () => {
    for (const protoId of PROTOTYPE_SECTION_IDS) {
      let count = 0
      for (const area of SETTINGS_AREAS) {
        for (const section of area.sections) {
          if (!section.shared && section.id === protoId) count++
          if (section.legacyIds?.includes(protoId)) count++
        }
      }
      expect(count, `expected "${protoId}" to appear once, found ${count}`).toBe(1)
    }
  })

  it('places every shared list in at least one module and in the shared area', () => {
    const sharedArea = SETTINGS_AREAS.find((a) => a.id === 'shared')
    expect(sharedArea).toBeDefined()

    for (const listId of SHARED_LIST_IDS) {
      expect(sharedArea?.sections.some((s) => s.id === listId && s.shared === listId)).toBe(true)
      const moduleCount = SETTINGS_AREAS.filter(
        (a) => a.kind === 'module' && a.sections.some((s) => s.id === listId && s.shared === listId),
      ).length
      expect(moduleCount, `shared list "${listId}" must appear in >= 1 module`).toBeGreaterThanOrEqual(1)
    }
  })

  it('produces unique canonical paths across all areas and sections', () => {
    const seen = new Set<string>()
    for (const area of SETTINGS_AREAS) {
      for (const section of area.sections) {
        const path = sectionPath(area, section)
        expect(seen.has(path), `duplicate path: ${path}`).toBe(false)
        seen.add(path)
      }
    }
  })

  it('formats paths by area kind', () => {
    expect(sectionPath('workspace', 'ws-profile')).toBe('/settings/ws-profile')
    expect(sectionPath('personal', 'me-profile')).toBe('/settings/me-profile')
    expect(sectionPath('purchasing', 'sequences')).toBe('/purchasing/settings/sequences')
    expect(sectionPath('warehouse', 'uom')).toBe('/warehouse/settings/uom')
    expect(sectionPath('shared', 'sequences')).toBe('/settings/shared/sequences')
  })

  it('resolves legacy ids to their new URLs and leaves canonical central ids alone', () => {
    expect(legacyRedirect('uom')).toBe('/warehouse/settings/uom')
    expect(legacyRedirect('categories')).toBe('/warehouse/settings/categories')
    expect(legacyRedirect('locations')).toBe('/warehouse/settings/locations')
    expect(legacyRedirect('assembly')).toBe('/production/settings/assembly')
    expect(legacyRedirect('carrier-types')).toBe('/purchasing/settings/carrier-types')
    expect(legacyRedirect('cfg-pricing')).toBe('/sales/settings/cfg-pricing')
    expect(legacyRedirect('cfg-taxset')).toBe('/finance/settings/cfg-taxset')
    expect(legacyRedirect('cfg-sequences')).toBe('/settings/shared/sequences')
    expect(legacyRedirect('cfg-statuses')).toBe('/settings/shared/statuses')
    expect(legacyRedirect('cfg-fields')).toBe('/settings/shared/fields')
    expect(legacyRedirect('cfg-terms')).toBe('/settings/shared/terms')
    expect(legacyRedirect('cfg-tax')).toBe('/settings/shared/tax-codes')

    expect(legacyRedirect('ws-profile')).toBeNull()
    expect(legacyRedirect('me-profile')).toBeNull()
    expect(legacyRedirect('shortcuts')).toBeNull()
    expect(legacyRedirect('unknown-id')).toBeNull()
  })

  it('finds sections by area and central sections directly', () => {
    expect(findSection('warehouse', 'uom')?.section.label).toBe('Units of measure')
    expect(findSection('purchasing', 'uom')).toBeNull()
    expect(findSection('shared', 'sequences')?.section.label).toBe('Number sequences')
    expect(findCentralSection('ws-profile')?.area.id).toBe('workspace')
    expect(findCentralSection('shortcuts')?.area.id).toBe('personal')
    expect(findCentralSection('uom')).toBeNull()
    expect(firstSection('workspace').id).toBe('ws-profile')
    expect(firstSection('personal').id).toBe('me-profile')
    expect(firstSection('purchasing').id).toBe('carrier-types')
  })

  it('filters areas by enabled modules and identifies module settings paths', () => {
    const filtered = areasForModules(['purchasing', 'warehouse'])
    expect(filtered.map((a) => a.id)).toEqual(['workspace', 'purchasing', 'warehouse', 'shared', 'personal'])
    expect(areasForModules().filter((a) => a.kind === 'module').map((a) => a.id)).toEqual(SETTINGS_MODULE_IDS)

    expect(isSettingsModule('purchasing')).toBe(true)
    expect(isSettingsModule('home')).toBe(false)
    expect(isSettingsModule('notes')).toBe(false)

    expect(moduleSettingsFromPath('/purchasing/settings')).toBe('purchasing')
    expect(moduleSettingsFromPath('/purchasing/settings/sequences')).toBe('purchasing')
    expect(moduleSettingsFromPath('/purchasing/purchase-orders')).toBeNull()
    expect(moduleSettingsFromPath('/home/settings')).toBeNull()
    expect(moduleSettingsFromPath('/settings/ws-profile')).toBeNull()
  })
})

describe('searchSettings', () => {
  const sampleHelp: Readonly<Record<string, HelpMap>> = {
    'ws-profile': {
      page: { title: 'Business profile', body: 'Who your business is.' },
      gstin: {
        title: 'GSTIN',
        body: 'Your primary GST registration.',
        note: 'A 15-character number issued by the GST portal.',
      },
      pan: {
        title: 'PAN',
        body: 'Permanent Account Number: 5 letters, 4 digits, 1 letter.',
      },
      postal: {
        title: 'Postal code',
        body: 'Six-digit PIN code.',
      },
    },
  }

  it('returns nothing for empty or whitespace queries', () => {
    expect(searchSettings('', sampleHelp)).toEqual([])
    expect(searchSettings('   ', sampleHelp)).toEqual([])
  })

  it('ranks label prefix > word prefix > contains', () => {
    const profileMatches = searchSettings('profile')
    expect(profileMatches[0]?.section.id).toBe('me-profile')
    expect(profileMatches[0]?.rank).toBe(0)
    expect(profileMatches[1]?.section.id).toBe('ws-profile')
    expect(profileMatches[1]?.rank).toBe(1)

    // "ax" appears inside "Tax settings" / "Tax codes" (contains, rank 2),
    // while "tax" is a label prefix (rank 0).
    const taxPrefix = searchSettings('tax')
    expect(taxPrefix[0]?.rank).toBe(0)
    const axContains = searchSettings('ax')
    expect(axContains.length).toBeGreaterThan(0)
    expect(axContains.every((m) => m.rank >= 2)).toBe(true)
  })

  it('searches row labels and help text from helpMaps and attaches rowKey', () => {
    const gstin = searchSettings('gstin', sampleHelp)
    expect(gstin[0]).toMatchObject({
      path: '/settings/ws-profile',
      rowKey: 'gstin',
      label: 'GSTIN',
      rank: 0,
    })

    const pin = searchSettings('six-digit', sampleHelp)
    expect(pin.some((m) => m.rowKey === 'postal' && m.path === '/settings/ws-profile')).toBe(true)
  })

  it('respects a restricted areas list (e.g. Personal only for a member)', () => {
    const personalOnly = SETTINGS_AREAS.filter((a) => a.kind === 'personal')
    expect(searchSettings('business', sampleHelp, personalOnly)).toEqual([])
    const shortcuts = searchSettings('shortcuts', sampleHelp, personalOnly)
    expect(shortcuts[0]?.section.id).toBe('shortcuts')
  })
})
