import { afterEach, describe, expect, it } from 'vitest'
import { api } from '@/data/api'
import { CommandError } from '@/data/api/commands'
import { deleteWarehouse, restoreWarehouse, saveWarehouse } from '@/data/api/warehouse-settings'
import type { Floor, LocationLayout, Warehouse } from '@/data/schemas'
import {
  AREA_TEMPLATES,
  AREA_TYPES,
  FLOOR_CODE_ERROR,
  applyAreaTemplate,
  areaCode,
  areaTypeById,
  buildLayouts,
  emptyLayout,
  floorAreaCounts,
  floorRemoveBlockReason,
  floorWord,
  floorsOf,
  floorsRemovedWithAreas,
  newFloor,
  normalizeFloors,
  placeAreas,
  seedRows,
  setMultiLevel,
  siteAreaCount,
  stepAreaPick,
  suggestLocationCode,
  toggleAreaPick,
  totalAreas,
  validateFloors,
} from './location-layouts'
import { normalizeLocation, validateLocation } from './locations'

const F = (id: string, code: string, level: number, name = `Floor ${code}`): Floor => ({ id, code, name, level })

describe('area-type catalogue', () => {
  it('has the 12 Kanalora area types', () => {
    expect(AREA_TYPES).toHaveLength(12)
    expect(AREA_TYPES.map((t) => t.id)).toEqual([
      'receiving',
      'bulk',
      'pick',
      'fragile',
      'qc',
      'components',
      'assembly',
      'finished',
      'shipping',
      'staging',
      'returns',
      'office',
    ])
    expect(AREA_TYPES.filter((t) => t.storage === 'racked').map((t) => t.id)).toEqual(['bulk', 'pick', 'fragile', 'components', 'finished'])
    expect(areaTypeById('office').storage).toBe('none')
  })
  it('falls back to general storage for an unknown type', () => {
    expect(areaTypeById('nope').name).toBe('Storage')
  })
})

describe('area picks', () => {
  it('toggles a type in with a count of 1 and out again', () => {
    const added = toggleAreaPick([], 'bulk')
    expect(added).toEqual([{ id: 'bulk', count: 1 }])
    expect(toggleAreaPick(added, 'bulk')).toEqual([])
  })
  it('keeps a count between 1 and 6', () => {
    let picks = toggleAreaPick([], 'pick')
    for (let i = 0; i < 9; i++) picks = stepAreaPick(picks, 'pick', 1)
    expect(picks[0].count).toBe(6)
    for (let i = 0; i < 9; i++) picks = stepAreaPick(picks, 'pick', -1)
    expect(picks[0].count).toBe(1)
    expect(totalAreas([{ id: 'a', count: 2 }, { id: 'b', count: 3 }])).toBe(5)
  })
})

describe('areaCode', () => {
  it('uses three letters of the name and numbers repeats', () => {
    const used = new Set<string>()
    expect(areaCode(used, 'Bulk storage')).toBe('BUL')
    used.add('BUL')
    expect(areaCode(used, 'Bulk storage')).toBe('BUL2')
    used.add('BUL2')
    expect(areaCode(used, 'Bulk storage')).toBe('BUL3')
    expect(areaCode(used, '123')).toBe('ARE')
  })
})

describe('placeAreas', () => {
  it('places nothing for no picks', () => {
    const p = placeAreas([])
    expect(p.zones).toEqual([])
    expect(p.aisles).toEqual([])
    expect(p.floorW).toBe(224)
  })

  it('lays areas out left to right with an 8 ft margin and gap', () => {
    const p = placeAreas([{ id: 'receiving', count: 1 }, { id: 'qc', count: 1 }])
    expect(p.zones.map((z) => [z.code, z.x, z.y, z.w, z.h])).toEqual([
      ['REC', 8, 8, 30, 15],
      ['QCI', 46, 8, 24, 15],
    ])
    expect(p.zones[0]).toMatchObject({ id: 'z-0-receiving', type: 'receiving', status: 'available', name: 'Receiving' })
    expect(p.zones[0].color).toBe(areaTypeById('receiving').color)
  })

  it('wraps to a new row when an area would pass the right edge', () => {
    const p = placeAreas([{ id: 'bulk', count: 6 }])
    expect(new Set(p.zones.map((z) => z.y)).size).toBeGreaterThan(1)
    const second = p.zones.find((z) => z.y > 8)
    expect(second?.x).toBe(8)
    for (const z of p.zones) expect(z.x + z.w).toBeLessThanOrEqual(p.floorW - 8)
  })

  it('never overlaps two areas and grows the floor when a row runs off the bottom', () => {
    const p = placeAreas(AREA_TYPES.map((t) => ({ id: t.id, count: 3 })))
    for (const a of p.zones) {
      expect(a.y + a.h).toBeLessThanOrEqual(p.floorH - 8)
      for (const b of p.zones) {
        if (a === b) continue
        const apart = a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y
        expect(apart).toBe(true)
      }
    }
    expect(p.floorH).toBeGreaterThan(152)
  })

  it('numbers repeated areas in their codes', () => {
    const p = placeAreas([{ id: 'bulk', count: 3 }])
    expect(p.zones.map((z) => z.code)).toEqual(['BUL', 'BUL2', 'BUL3'])
  })

  it('is deterministic', () => {
    const picks = [{ id: 'fragile', count: 2 }, { id: 'components', count: 1 }]
    expect(placeAreas(picks)).toEqual(placeAreas(picks))
  })

  it('seeds shelving in racked areas only: two runs when 28 ft wide, else one', () => {
    const p = placeAreas([{ id: 'receiving', count: 1 }, { id: 'fragile', count: 1 }, { id: 'office', count: 1 }])
    expect(p.aisles).toHaveLength(2)
    const [a1, a2] = p.aisles
    expect(a1).toMatchObject({ zoneId: 'z-1-fragile', code: 'F021', dir: 'v', levels: 3, binsPerBay: 1, sides: 2, aisleWidth: 6 })
    expect(a2.code).toBe('F022')
    const frg = p.zones[1]
    expect(a1.x).toBe(frg.x + 8)
    expect(a2.x).toBe(frg.x + 22)
    expect(a1.y).toBe(frg.y + 4)
    expect(a1.bays).toBe(Math.max(4, Math.min(10, Math.round((frg.h - 8) / 4))))
  })

  it('gives component bins 3 bins per bay and a narrow racked area one run', () => {
    const comp = placeAreas([{ id: 'components', count: 1 }]).aisles
    expect(comp.map((a) => a.binsPerBay)).toEqual([3, 3])
    expect(comp.every((a) => a.levels === 4)).toBe(true)
    const zone = { id: 'z', code: 'Z', name: 'Z', type: 'pick', color: '', status: 'available' as const, x: 0, y: 0, w: 20, h: 40 }
    expect(seedRows(zone, areaTypeById('pick'), 0)).toHaveLength(1)
    expect(seedRows(zone, areaTypeById('qc'), 0)).toEqual([])
  })

  it('keeps aisle ids and codes unique across a layout', () => {
    const p = placeAreas([{ id: 'bulk', count: 2 }, { id: 'pick', count: 2 }, { id: 'finished', count: 2 }])
    expect(new Set(p.aisles.map((a) => a.id)).size).toBe(p.aisles.length)
    expect(new Set(p.aisles.map((a) => a.code)).size).toBe(p.aisles.length)
  })
})

describe('buildLayouts', () => {
  const floors = [F('l1', 'L1', 1), F('f2', 'L2', 2)]
  it('puts the areas on the ground floor and leaves the others empty', () => {
    const layouts = buildLayouts('WH-NEW', floors, [{ id: 'receiving', count: 2 }])
    expect(layouts.map((l) => l.id)).toEqual(['WH-NEW::l1', 'WH-NEW::f2'])
    expect(layouts[0].zones).toHaveLength(2)
    expect(layouts[0].warehouseId).toBe('WH-NEW')
    expect(layouts[1]).toEqual(emptyLayout('WH-NEW', 'f2'))
  })
  it('makes empty layouts when no areas were picked', () => {
    const layouts = buildLayouts('WH-NEW', floors, [])
    expect(layouts.every((l) => l.zones.length === 0 && l.floorW === 80 && l.floorH === 56)).toBe(true)
  })
  it('counts areas per floor and per site', () => {
    const layouts = [...buildLayouts('A', floors, [{ id: 'qc', count: 3 }]), ...buildLayouts('B', floors, [{ id: 'qc', count: 1 }])]
    expect(floorAreaCounts(layouts, 'A')).toEqual({ l1: 3, f2: 0 })
    expect(siteAreaCount(layouts, 'A')).toBe(3)
    expect(siteAreaCount(layouts, 'B')).toBe(1)
    expect(siteAreaCount(layouts, 'C')).toBe(0)
  })
})

describe('floors', () => {
  it('reads a site without floors as one ground floor, and sorts by level', () => {
    expect(floorsOf({})).toEqual([{ id: 'l1', name: 'Ground floor', code: 'L1', level: 1 }])
    expect(floorsOf({ floors: [F('b', 'MZ', 2), F('a', 'L1', 1)] }).map((f) => f.id)).toEqual(['a', 'b'])
  })

  it('normalises: levels follow the order, blank names and codes get defaults, codes are cleaned', () => {
    const out = normalizeFloors([
      { id: 'l1', name: '  Ground  ', code: ' g-1 ', level: 9 },
      { id: 'f2', name: '', code: '', level: 9 },
      { id: '', name: 'Loft', code: 'mezzanine', level: 9 },
    ])
    expect(out.map((f) => [f.name, f.code, f.level])).toEqual([
      ['Ground', 'G1', 1],
      ['Level 2', 'L2', 2],
      ['Loft', 'MEZZ', 3],
    ])
    expect(out[2].id).toBeTruthy()
    expect(new Set(out.map((f) => f.id)).size).toBe(3)
  })

  it('refuses two floors with the same code (after cleaning)', () => {
    expect(validateFloors([F('a', 'L1', 1), F('b', 'l1', 2)])).toBe(FLOOR_CODE_ERROR)
    expect(validateFloors([F('a', 'L1', 1), F('b', 'MZ', 2)])).toBeNull()
    expect(validateFloors([F('a', '', 1), F('b', 'L1', 2)])).toBe(FLOOR_CODE_ERROR)
    expect(validateFloors([])).toBeNull()
  })

  it('adds the next level with a free code', () => {
    const next = newFloor([F('l1', 'L1', 1), F('mz', 'MZ', 2)])
    expect(next).toMatchObject({ name: 'Level 3', code: 'L3', level: 3 })
    expect(next.id).not.toBe('mz')
    // L2 is taken by a floor renamed in place, so the new one skips it.
    expect(newFloor([F('l1', 'L1', 1), F('x', 'L2', 2)]).code).toBe('L3')
  })

  it('switches between single level and multi-level', () => {
    const single = [F('l1', 'L1', 1, 'Ground floor')]
    const multi = setMultiLevel(single, true)
    expect(multi).toHaveLength(2)
    expect(multi[1]).toMatchObject({ name: 'Level 2', code: 'L2', level: 2 })
    expect(setMultiLevel(multi, true)).toEqual(multi)
    expect(setMultiLevel([...multi, F('f3', 'L3', 3)], false)).toEqual(single)
    expect(floorWord(single)).toBe('Single floor')
    expect(floorWord(multi)).toBe('2 floors')
  })

  it('blocks removing a floor that still has areas', () => {
    expect(floorRemoveBlockReason({ name: 'Carton loft' }, 0)).toBeNull()
    expect(floorRemoveBlockReason({ name: 'Carton loft' }, 1)).toBe('Carton loft has 1 area — remove it first.')
    expect(floorRemoveBlockReason({ name: 'Ground floor' }, 3)).toBe('Ground floor has 3 areas — remove them first.')
    const before = [F('l1', 'L1', 1), F('mz', 'MZ', 2), F('f3', 'L3', 3)]
    const after = [F('l1', 'L1', 1)]
    expect(floorsRemovedWithAreas(before, after, { mz: 2, f3: 0 }).map((f) => f.id)).toEqual(['mz'])
    expect(floorsRemovedWithAreas(before, before, { mz: 2 })).toEqual([])
  })
})

describe('suggestLocationCode', () => {
  it('uses initials for two or more words and the first letters for one', () => {
    expect(suggestLocationCode('Salem retail outlet')).toBe('SRO')
    expect(suggestLocationCode('Tiruvannamalai — Main')).toBe('TM')
    expect(suggestLocationCode('Chennai DC extra big site')).toBe('CDEB')
    expect(suggestLocationCode('Warehouse')).toBe('WARE')
    expect(suggestLocationCode('')).toBe('WH')
    expect(suggestLocationCode('—')).toBe('WH')
  })
})

describe('quick starts', () => {
  it('has the three prototype templates', () => {
    expect(AREA_TEMPLATES.map((t) => [t.id, t.areas.reduce((n, a) => n + a.count, 0), t.multi])).toEqual([
      ['stockroom', 4, false],
      ['dc', 5, false],
      ['building', 6, true],
    ])
  })
  it('applies a template: site type, floors and areas', () => {
    const single = [F('l1', 'L1', 1, 'Ground floor')]
    const building = applyAreaTemplate('building', single)
    expect(building?.type).toBe('mixed')
    expect(building?.floors).toHaveLength(2)
    expect(building?.areas.map((a) => a.id)).toEqual(['receiving', 'qc', 'assembly', 'fragile', 'finished', 'office'])
    const dc = applyAreaTemplate('dc', building?.floors ?? single)
    expect(dc?.type).toBe('dc')
    expect(dc?.floors).toHaveLength(1)
    expect(dc?.areas).toEqual([
      { id: 'receiving', count: 1 },
      { id: 'bulk', count: 2 },
      { id: 'pick', count: 1 },
      { id: 'shipping', count: 1 },
    ])
    expect(applyAreaTemplate('nope', single)).toBeNull()
  })
})

const site = (over: Partial<Warehouse> = {}): Warehouse => ({
  id: 'WH-SLM',
  name: 'Salem',
  code: 'SLM',
  type: 'dc',
  addr: '',
  city: '',
  state: '33',
  zip: '',
  country: 'IN',
  area: 0,
  status: 'setup',
  pobStatus: 'undeclared',
  managerEmpId: '',
  operatorVendorId: '',
  ...over,
})

describe('floors in the location rules', () => {
  it('refuses duplicate floor codes when a site is validated, and cleans floors when normalised', () => {
    const dup = site({ floors: [F('l1', 'L1', 1), F('f2', 'l1', 2)] })
    expect(validateLocation(dup, [], null, undefined, new Set()).floors).toBe(FLOOR_CODE_ERROR)
    expect(validateLocation(site({ floors: [F('l1', 'L1', 1), F('f2', 'L2', 2)] }), [], null, undefined, new Set())).toEqual({})
    expect(validateLocation(site(), [], null, undefined, new Set())).toEqual({})
    expect(normalizeLocation(site({ floors: [{ id: 'l1', name: ' ', code: ' ', level: 4 }] })).floors).toEqual([
      { id: 'l1', name: 'Level 1', code: 'L1', level: 1 },
    ])
    expect(normalizeLocation(site()).floors).toBeUndefined()
  })
})

describe('floors and layouts through the data seam', () => {
  afterEach(async () => {
    await Promise.all([api.warehouses.reset(), api.locationLayouts.reset()])
  })

  const layoutsOf = async (id: string): Promise<LocationLayout[]> =>
    (await api.locationLayouts.list()).filter((l) => l.warehouseId === id)

  it('seeds floors and layouts for the Kanalora sites', async () => {
    const sites = await api.warehouses.list()
    expect(sites.find((w) => w.id === 'WH-TVM')?.floors?.map((f) => f.code)).toEqual(['L1', 'MZ'])
    expect(sites.find((w) => w.id === 'WH-ASSY')?.floors).toHaveLength(1)
    const layouts = await api.locationLayouts.list()
    expect(layouts.map((l) => l.id).sort()).toEqual(['WH-ASSY::l1', 'WH-CHN::l1', 'WH-TVM::l1', 'WH-TVM::mz'])
    const tvm = layouts.find((l) => l.id === 'WH-TVM::l1')
    expect(tvm?.zones).toHaveLength(10)
    expect(tvm?.aisles).toHaveLength(6)
    expect(tvm?.zones.every((z) => z.color.startsWith('oklch'))).toBe(true)
    expect(layouts.find((l) => l.id === 'WH-CHN::l1')?.zones).toEqual([])
    // Every aisle sits in a zone of its own floor.
    for (const l of layouts) for (const a of l.aisles) expect(l.zones.some((z) => z.id === a.zoneId)).toBe(true)
  })

  it('creates a multi-floor site with the picked areas on the ground floor', async () => {
    const floors = [F('l1', 'L1', 1, 'Ground floor'), F('f2', 'L2', 2, 'Level 2')]
    await saveWarehouse(site({ floors }), { areas: [{ id: 'fragile', count: 1 }, { id: 'receiving', count: 1 }] })
    const layouts = await layoutsOf('WH-SLM')
    expect(layouts.map((l) => [l.floorId, l.zones.length, l.aisles.length])).toEqual([
      ['l1', 2, 2],
      ['f2', 0, 0],
    ])
  })

  it('adds a layout for a new floor and drops the layout of a removed empty floor, but not one with areas', async () => {
    const floors = [F('l1', 'L1', 1, 'Ground floor'), F('f2', 'L2', 2, 'Level 2')]
    await saveWarehouse(site({ floors }), { areas: [{ id: 'qc', count: 1 }] })
    await saveWarehouse(site({ floors: [...floors, F('f3', 'L3', 3, 'Level 3')] }))
    expect((await layoutsOf('WH-SLM')).map((l) => l.floorId).sort()).toEqual(['f2', 'f3', 'l1'])
    await saveWarehouse(site({ floors: [floors[0], floors[1]] }))
    expect((await layoutsOf('WH-SLM')).map((l) => l.floorId).sort()).toEqual(['f2', 'l1'])
    await expect(saveWarehouse(site({ floors: [floors[1]] }))).rejects.toThrow(/Ground floor has 1 area/)
    await expect(saveWarehouse(site({ floors: [floors[1]] }))).rejects.toBeInstanceOf(CommandError)
  })

  it('refuses duplicate floor codes', async () => {
    await expect(saveWarehouse(site({ floors: [F('l1', 'L1', 1), F('f2', 'L1', 2)] }))).rejects.toThrow(FLOOR_CODE_ERROR)
    expect(await layoutsOf('WH-SLM')).toEqual([])
  })

  it('ignores the areas when an existing site is saved', async () => {
    await saveWarehouse(site({ floors: [F('l1', 'L1', 1)] }))
    await saveWarehouse(site({ name: 'Salem 2', floors: [F('l1', 'L1', 1)] }), { areas: [{ id: 'qc', count: 2 }] })
    expect((await layoutsOf('WH-SLM'))[0].zones).toEqual([])
  })

  it('deletes a site with its layouts, and Undo restores them', async () => {
    await saveWarehouse(site({ floors: [F('l1', 'L1', 1)] }), { areas: [{ id: 'bulk', count: 2 }] })
    const saved = (await api.warehouses.list()).find((w) => w.id === 'WH-SLM')
    expect(saved).toBeTruthy()
    const removed = await deleteWarehouse('WH-SLM')
    expect(removed).toHaveLength(1)
    expect(await layoutsOf('WH-SLM')).toEqual([])
    await restoreWarehouse(saved as Warehouse, removed)
    const back = await layoutsOf('WH-SLM')
    expect(back).toHaveLength(1)
    expect(back[0].zones).toHaveLength(2)
    expect(back[0].aisles.length).toBeGreaterThan(0)
  })
})
