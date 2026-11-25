import { afterEach, describe, expect, it } from 'vitest'
import { api } from '@/data/api'
import { CommandError } from '@/data/api/commands'
import { deleteWarehouse, loadLocationUsage, saveWarehouse } from '@/data/api/warehouse-settings'
import type { Warehouse } from '@/data/schemas'
import {
  applyPrincipal,
  locationAddress,
  locationDeleteBlockReason,
  locationUsage,
  nextLocationId,
  normalizeLocation,
  normalizeLocationCode,
  principalDisplaced,
  selectableLocations,
  validateLocation,
} from './locations'

const W = (over: Partial<Warehouse>): Warehouse => ({
  id: 'WH-X',
  name: 'Site X',
  code: 'X',
  type: 'dc',
  addr: '',
  city: 'Chennai',
  state: '33',
  zip: '',
  country: 'IN',
  area: 0,
  status: 'active',
  pobStatus: 'undeclared',
  managerEmpId: '',
  operatorVendorId: '',
  ...over,
})

const main = W({ id: 'WH-TVM', code: 'TVM-MAIN', name: 'Main', pobStatus: 'principal' })
const assy = W({ id: 'WH-ASSY', code: 'TVM-ASSY', name: 'Assembly', pobStatus: 'additional' })
const none = { stock: 0, openDocs: 0, docs: 0 }

describe('locationUsage', () => {
  it('counts stock by id and documents by code (assembly orders by id)', () => {
    const usage = locationUsage([main, assy], {
      items: [{ locs: { 'WH-TVM': 10, 'WH-ASSY': 4 } }, { locs: { 'WH-TVM': 5 } }],
      purchaseOrders: [
        { location: 'TVM-MAIN', status: 'Issued' },
        { location: 'TVM-MAIN', status: 'Closed' },
      ],
      purchaseReceipts: [{ location: 'TVM-ASSY', status: 'Draft' }],
      assemblyOrders: [{ location: 'WH-ASSY', status: 'inProgress' }],
      salesOrders: [{ location: 'TVM-MAIN', status: 'Shipped' }],
    })
    expect(usage.get('WH-TVM')).toEqual({ stock: 15, openDocs: 1, docs: 3 })
    expect(usage.get('WH-ASSY')).toEqual({ stock: 4, openDocs: 2, docs: 2 })
  })
})

describe('validateLocation', () => {
  const others = [main, assy]
  const ok = W({ id: 'WH-NEW', code: 'NEW', name: 'New site' })
  const check = (draft: Warehouse, original: Warehouse | null = null, usage = none, o = others) =>
    validateLocation(draft, o, original, usage, new Set(['V00006']))

  it('accepts a clean site', () => expect(check(ok)).toEqual({}))

  it('requires a name and a code and a unique code', () => {
    expect(check({ ...ok, name: ' ' }).name).toBe('Enter a warehouse name.')
    expect(check({ ...ok, code: '' }).code).toBe('Enter a short code (e.g. MAIN).')
    expect(check({ ...ok, code: 'tvm-main' }).code).toBe('Code “TVM-MAIN” is already used by another warehouse.')
  })

  it('requires a state for an Indian site only', () => {
    expect(check({ ...ok, state: '' }).state).toMatch(/Choose the state/)
    expect(check({ ...ok, country: 'AE', state: '' })).toEqual({})
  })

  it('blocks a state change while open documents use the site', () => {
    const orig = W({ id: 'WH-NEW', code: 'NEW' })
    const moved = { ...orig, state: '29' }
    expect(check(moved, orig, { stock: 0, openDocs: 2, docs: 2 }).state).toBe(
      '2 open documents use this site. Close them before moving it to another state.',
    )
    expect(check(moved, orig, { stock: 0, openDocs: 1, docs: 1 }).state).toMatch(/^1 open document uses/)
    expect(check(moved, orig, { stock: 9, openDocs: 0, docs: 0 })).toEqual({})
  })

  it('locks the code once any document refers to it', () => {
    const orig = W({ id: 'WH-NEW', code: 'NEW' })
    expect(check({ ...orig, code: 'RENAMED' }, orig, { stock: 0, openDocs: 0, docs: 1 }).code).toMatch(/can’t change/)
    expect(check({ ...orig, code: 'RENAMED' }, orig, none)).toEqual({})
  })

  it('checks the 3PL operator exists', () => {
    expect(check({ ...ok, type: '3pl', operatorVendorId: 'V9' }).operatorVendorId).toMatch(/no longer exists/)
    expect(check({ ...ok, type: '3pl', operatorVendorId: 'V00006' })).toEqual({})
  })

  it('keeps at least one active location', () => {
    const only = W({ id: 'WH-ONLY', code: 'ONLY', status: 'active' })
    expect(check({ ...only, status: 'inactive' }, only, none, [W({ id: 'B', code: 'B', status: 'setup' })]).status).toMatch(
      /one active location/,
    )
    expect(check({ ...only, status: 'inactive' }, only, none, [W({ id: 'B', code: 'B', status: 'active' })])).toEqual({})
  })
})

describe('normalizeLocation and ids', () => {
  it('trims, upper-cases the code and clears fields that do not apply', () => {
    const n = normalizeLocation(
      W({ code: ' tvm_x-1 ', name: ' A ', type: 'dc', operatorVendorId: 'V1', country: 'AE', pobStatus: 'principal', area: 12.4 }),
    )
    expect(n).toMatchObject({ code: 'TVMX-1', name: 'A', operatorVendorId: '', pobStatus: 'undeclared', area: 12 })
    expect(normalizeLocationCode('tvm-main')).toBe('TVM-MAIN')
  })

  it('numbers an id that is taken', () => {
    expect(nextLocationId([main], 'chn-dc')).toBe('WH-CHN-DC')
    expect(nextLocationId([W({ id: 'WH-CHN-DC' })], 'chn-dc')).toBe('WH-CHN-DC-2')
  })

  it('writes an address with the state name', () => {
    expect(locationAddress(W({ addr: '12 Street', city: 'Tiruvannamalai', zip: '606601' }))).toBe(
      '12 Street, Tiruvannamalai, Tamil Nadu, 606601',
    )
  })
})

describe('principal place of business', () => {
  it('moves the state’s previous principal to Additional', () => {
    const next = W({ id: 'WH-N', code: 'N', pobStatus: 'principal' })
    const { list, moved } = applyPrincipal([main, assy, next], 'WH-N')
    expect(moved?.id).toBe('WH-TVM')
    expect(list.find((w) => w.id === 'WH-TVM')?.pobStatus).toBe('additional')
    expect(list.find((w) => w.id === 'WH-N')?.pobStatus).toBe('principal')
  })

  it('leaves other states alone and says who would be displaced', () => {
    const karnataka = W({ id: 'WH-K', code: 'K', state: '29', pobStatus: 'principal' })
    expect(applyPrincipal([main, karnataka], 'WH-K').moved).toBeNull()
    expect(principalDisplaced(W({ id: 'WH-N', pobStatus: 'principal' }), [main])?.id).toBe('WH-TVM')
    expect(principalDisplaced(W({ id: 'WH-TVM', pobStatus: 'principal' }), [main])).toBeNull()
  })
})

describe('locationDeleteBlockReason', () => {
  const all = [main, assy]
  it('blocks while the site holds stock or has open documents', () => {
    expect(locationDeleteBlockReason(assy, all, { stock: 1200, openDocs: 1, docs: 1 })).toBe(
      '1,200 units in stock and 1 open document — set it to Inactive instead.',
    )
    expect(locationDeleteBlockReason(assy, all, { stock: 0, openDocs: 3, docs: 3 })).toBe(
      '3 open documents — set it to Inactive instead.',
    )
  })

  it('blocks the principal place while other sites exist, and the last active or last location', () => {
    expect(locationDeleteBlockReason(main, all, none)).toMatch(/principal place of business/)
    expect(locationDeleteBlockReason(assy, [assy, W({ id: 'B', code: 'B', status: 'setup' })], none)).toMatch(
      /one active location/,
    )
    expect(locationDeleteBlockReason(assy, [assy], none)).toMatch(/last location|one active location/)
    expect(locationDeleteBlockReason(assy, all, none)).toBeNull()
  })
})

describe('selectableLocations', () => {
  it('drops inactive sites unless they still hold stock', () => {
    const off = W({ id: 'WH-OFF', code: 'OFF', status: 'inactive' })
    const usage = new Map([['WH-OFF', { stock: 3, openDocs: 0, docs: 0 }]])
    expect(selectableLocations([main, off])).toEqual([main])
    expect(selectableLocations([main, off], usage)).toEqual([main, off])
  })
})

describe('location commands', () => {
  afterEach(async () => {
    await Promise.all([api.warehouses.reset(), api.items.reset()])
  })

  it('reads usage from the seeded stock and documents', async () => {
    const usage = await loadLocationUsage()
    expect(usage.get('WH-TVM')?.stock).toBeGreaterThan(0)
    expect(usage.get('WH-TVM')?.docs).toBeGreaterThan(0)
  })

  it('creates a site, stamps dates and moves the principal when asked', async () => {
    const { saved, moved } = await saveWarehouse(W({ id: 'WH-NEW', code: 'new', name: 'Salem outlet', pobStatus: 'principal' }))
    expect(saved.code).toBe('NEW')
    expect(saved.createdAt).toBeDefined()
    expect(moved?.id).toBe('WH-TVM')
    expect((await api.warehouses.get('WH-TVM'))?.pobStatus).toBe('additional')
  })

  it('refuses an invalid save and a delete of a site with stock', async () => {
    await expect(saveWarehouse(W({ id: 'WH-NEW', code: 'TVM-MAIN' }))).rejects.toBeInstanceOf(CommandError)
    await expect(deleteWarehouse('WH-TVM')).rejects.toThrow(/in stock|principal/)
  })

  it('deletes an unused site', async () => {
    await saveWarehouse(W({ id: 'WH-NEW', code: 'NEW', name: 'Scratch' }))
    await deleteWarehouse('WH-NEW')
    expect(await api.warehouses.get('WH-NEW')).toBeNull()
  })

  it('will not deactivate the only active location', async () => {
    const all = await api.warehouses.list()
    for (const w of all.filter((x) => x.id !== 'WH-TVM')) await api.warehouses.upsert({ ...w, status: 'setup' })
    const main = (await api.warehouses.get('WH-TVM')) as Warehouse
    await expect(saveWarehouse({ ...main, status: 'inactive' })).rejects.toThrow(/one active location/)
  })
})
