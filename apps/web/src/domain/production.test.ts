import { describe, expect, it } from 'vitest'
import { api } from '@/data/api'
import {
  activeBomFor,
  aoBuildable,
  aoDeleteBlockedReason,
  aoOpen,
  aoShortageSummary,
  aoShortages,
  aoSiteName,
  aoStatusLabel,
  availAt,
  bomBuildable,
  bomDeleteBlockedReason,
  bomKindLabel,
  bomReqQty,
  bomRollup,
  bomStatusLabel,
  mainLocationId,
} from './production'

const items = await api.items.list()
const boms = await api.boms.list()
const orders = await api.assemblyOrders.list()
const warehouses = await api.warehouses.list()
const mainLoc = mainLocationId(warehouses)

describe('production status and label helpers', () => {
  it('maps BOM and AO statuses and kinds to display pills', () => {
    expect(bomStatusLabel('draft')).toBe('Draft')
    expect(bomStatusLabel('active')).toBe('Active')
    expect(bomStatusLabel('archived')).toBe('Archived')
    expect(bomKindLabel('assembly')).toBe('Assembly')
    expect(bomKindLabel('production')).toBe('Production')
    expect(aoStatusLabel('planned')).toBe('Planned')
    expect(aoStatusLabel('inProgress')).toBe('In progress')
    expect(aoStatusLabel('finished')).toBe('Finished')
  })

  it('classifies open vs closed assembly orders', () => {
    expect(aoOpen('planned')).toBe(true)
    expect(aoOpen('draft')).toBe(true)
    expect(aoOpen('released')).toBe(true)
    expect(aoOpen('inProgress')).toBe(true)
    expect(aoOpen('finished')).toBe(false)
    expect(aoOpen('cancelled')).toBe(false)
  })

  it('resolves the principal warehouse and short site labels', () => {
    expect(mainLoc).toBe('WH-TVM')
    expect(aoSiteName('WH-TVM', warehouses)).not.toContain('—')
    expect(aoSiteName('UNKNOWN-WH', warehouses)).toBe('UNKNOWN-WH')
  })
})

describe('BOM quantities and multi-level cost rollup', () => {
  it('computes component required qty with scrap allowance and batch outputQty', () => {
    expect(bomReqQty({ qtyPer: 1, scrapPct: 3 }, 60, 1)).toBe(61.8)
    expect(bomReqQty({ qtyPer: 0.02, scrapPct: 0 }, 50, 1)).toBe(1)
    expect(bomReqQty({ qtyPer: 1, scrapPct: 0 }, 10, 4)).toBe(2.5)
  })

  it('resolves date-effective active BOM versions', () => {
    expect(activeBomFor(boms, 'ASH-PWH-18', '2026-08-01')?.no).toBe('BOM00001')
    expect(activeBomFor(boms, 'ASH-PWH-18', '2025-12-01')).toBeUndefined()
  })

  it('rolls up single-level and multi-level BOM costs through sub-assembly BOMs', () => {
    const holderBom = boms.find((b) => b.no === 'BOM00001')!
    const holderRollup = bomRollup(holderBom, boms, items, '2026-08-01')
    const comboBom = boms.find((b) => b.no === 'BOM00004')!
    const comboRollup = bomRollup(comboBom, boms, items, '2026-08-01')
    const coneBom = boms.find((b) => b.no === 'BOM00009')!
    const coneRollup = bomRollup(coneBom, boms, items, '2026-08-01')

    expect(holderRollup.labour).toBe(18)
    expect(holderRollup.overhead).toBeCloseTo((holderRollup.materials + 18) * 0.05, 6)
    expect(holderRollup.unit).toBeGreaterThan(holderRollup.materials)

    // Multi-level: CMB-PWH-12 uses BOM00001 (1 * 1.01) + BOM00009 (1 * 1.00) + PKG-BOX-PREM
    const boxItem = items.find((i) => i.no === 'PKG-BOX-PREM')!
    const expectedComboMaterials =
      holderRollup.unit * 1.01 + coneRollup.unit * 1 + boxItem.cost * 1.01
    expect(comboRollup.materials).toBeCloseTo(expectedComboMaterials, 6)
    expect(comboRollup.unit).toBeCloseTo(
      (expectedComboMaterials + 12) * 1.05,
      6,
    )
  })
})

describe('availability, buildable quantity, and shortages', () => {
  it('nets committed sales stock only on the principal warehouse', () => {
    const holder = items.find((i) => i.no === 'ASH-PWH-18')!
    const expectedPrincipal = Math.max(0, (holder.locs[mainLoc] ?? 0) - holder.qtySO)
    expect(availAt('ASH-PWH-18', mainLoc, items, mainLoc)).toBe(expectedPrincipal)
    expect(availAt('ASH-PWH-18', 'WH-ASSY', items, mainLoc)).toBe(holder.locs['WH-ASSY'] ?? 0)
    expect(availAt('NO-SUCH-ITEM', mainLoc, items, mainLoc)).toBe(0)
  })

  it('computes buildable count and component shortages on seed BOMs and orders', () => {
    const bom = boms.find((b) => b.no === 'BOM00001')!
    expect(bomBuildable(bom, items, mainLoc, mainLoc)).toBeGreaterThanOrEqual(0)
    expect(bomBuildable({ lines: [], outputQty: 1 }, items, mainLoc, mainLoc)).toBe(0)

    const releasedOrder = orders.find((o) => o.no === 'AO00005')!
    const shortages = aoShortages(releasedOrder, items, mainLoc)
    expect(shortages.length).toBeGreaterThan(0)
    expect(aoShortageSummary(shortages)).toMatch(/^Short [\d.]+ × /)
    expect(aoShortageSummary([])).toBeNull()
    expect(aoBuildable(releasedOrder, items, mainLoc)).toBe(0)
  })
})

describe('delete guards', () => {
  it('blocks deleting active or referenced BOMs and allows unused drafts/archived BOMs', () => {
    const activeBom = boms.find((b) => b.no === 'BOM00001')!
    const archivedUnused = boms.find((b) => b.no === 'BOM00007')!
    const draftUnused = boms.find((b) => b.no === 'BOM00008')!

    expect(bomDeleteBlockedReason(activeBom, orders)).not.toBeNull()
    expect(bomDeleteBlockedReason({ no: 'BOM00001', status: 'archived' }, orders)).toMatch(/AO00002/)
    expect(bomDeleteBlockedReason(archivedUnused, orders)).toBeNull()
    expect(bomDeleteBlockedReason(draftUnused, orders)).toBeNull()
  })

  it('allows deleting only draft or planned assembly orders', () => {
    expect(aoDeleteBlockedReason({ status: 'planned' })).toBeNull()
    expect(aoDeleteBlockedReason({ status: 'draft' })).toBeNull()
    expect(aoDeleteBlockedReason({ status: 'released' })).not.toBeNull()
    expect(aoDeleteBlockedReason({ status: 'inProgress' })).not.toBeNull()
    expect(aoDeleteBlockedReason({ status: 'finished' })).not.toBeNull()
    expect(aoDeleteBlockedReason({ status: 'cancelled' })).not.toBeNull()
  })
})
