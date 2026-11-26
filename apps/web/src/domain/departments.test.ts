import { MODULES } from '@/app/nav'
import {
  BUILT_REACT_PAGES,
  buildDepartmentBlocks,
  clampDepartmentFocus,
  flattenDepartmentBlocks,
  stepDepartmentFocus,
} from './departments'

describe('buildDepartmentBlocks', () => {
  it('derives all blocks from MODULES and separates setup pages after work pages', () => {
    const blocks = buildDepartmentBlocks(MODULES, '')
    expect(blocks.map((b) => b.id)).toEqual([
      'home',
      'finance',
      'sales',
      'purchasing',
      'warehouse',
      'production',
      'people',
      'notes',
    ])

    const purchasing = blocks.find((b) => b.id === 'purchasing')
    expect(purchasing?.work.map((p) => p.label)).toEqual([
      'Purchase Orders',
      'Purchase Lines',
      'Purchase Receipts',
      'Vendors',
      'Purchase Invoices',
    ])
    expect(purchasing?.setup.map((p) => p.label)).toEqual([
      'Purchase Prices',
      'Charges',
      'Carriers',
    ])
    expect(purchasing?.all.map((p) => p.label)).toEqual([
      'Purchase Orders',
      'Purchase Lines',
      'Purchase Receipts',
      'Vendors',
      'Purchase Invoices',
      'Purchase Prices',
      'Charges',
      'Carriers',
    ])
  })

  it('marks React-ported pages as built and unported pages as coming soon', () => {
    const blocks = buildDepartmentBlocks(MODULES, '', BUILT_REACT_PAGES)
    const flat = flattenDepartmentBlocks(blocks)
    expect(flat.find((p) => p.key === 'purchasing/purchase-orders')?.built).toBe(true)
    expect(flat.find((p) => p.key === 'notes/notes')?.built).toBe(true)
    expect(flat.find((p) => p.key === 'home/dashboard')?.built).toBe(false)
    expect(flat.find((p) => p.key === 'purchasing/purchase-invoices')?.built).toBe(false)
  })

  it('filters by page label or department name case-insensitively and drops empty blocks', () => {
    const byPage = buildDepartmentBlocks(MODULES, '  vendor ')
    expect(byPage).toHaveLength(1)
    expect(byPage[0].id).toBe('purchasing')
    expect(byPage[0].all.map((p) => p.label)).toEqual(['Vendors'])

    const byModule = buildDepartmentBlocks(MODULES, 'production')
    expect(byModule).toHaveLength(1)
    expect(byModule[0].all.map((p) => p.label)).toEqual([
      'Bills of Materials',
      'Assembly Orders',
      'Production Orders',
    ])

    expect(buildDepartmentBlocks(MODULES, 'no-such-page-xyz')).toEqual([])
  })
})

describe('keyboard focus navigation', () => {
  const blocks = buildDepartmentBlocks(MODULES, '')
  const flat = flattenDepartmentBlocks(blocks)

  it('clamps focus index safely', () => {
    expect(clampDepartmentFocus(0, 0)).toBe(-1)
    expect(clampDepartmentFocus(-3, 5)).toBe(0)
    expect(clampDepartmentFocus(99, 5)).toBe(4)
  })

  it('moves up and down with wrap-around', () => {
    expect(stepDepartmentFocus(flat, 0, 'ArrowDown')).toBe(1)
    expect(stepDepartmentFocus(flat, flat.length - 1, 'ArrowDown')).toBe(0)
    expect(stepDepartmentFocus(flat, 0, 'ArrowUp')).toBe(flat.length - 1)
    expect(stepDepartmentFocus(flat, 2, 'ArrowUp')).toBe(1)
    expect(stepDepartmentFocus([], 0, 'ArrowDown')).toBe(-1)
  })

  it('jumps between department blocks with Left/Right and wraps', () => {
    // Right jumps to the first page of the next block (Finance).
    const toFinance = stepDepartmentFocus(flat, 0, 'ArrowRight')
    expect(flat[toFinance]?.moduleId).toBe('finance')
    expect(toFinance).toBe(flat.findIndex((e) => e.moduleId === 'finance'))

    // Left from Home jumps to the last block (Notes).
    const toNotes = stepDepartmentFocus(flat, 1, 'ArrowLeft')
    expect(flat[toNotes]?.moduleId).toBe('notes')

    // Right from Notes wraps back to Home.
    expect(stepDepartmentFocus(flat, flat.length - 1, 'ArrowRight')).toBe(0)
  })
})

describe('pages that are not built yet (Settings ▸ Navigation)', () => {
  it('leaves them out when the option is off, and keeps them tagged when it is on', () => {
    const on = flattenDepartmentBlocks(buildDepartmentBlocks(MODULES, ''))
    const off = flattenDepartmentBlocks(buildDepartmentBlocks(MODULES, '', undefined, false))
    expect(on.some((p) => !p.built)).toBe(true)
    expect(off.length).toBeLessThan(on.length)
    expect(off.every((p) => p.built)).toBe(true)
  })
})
