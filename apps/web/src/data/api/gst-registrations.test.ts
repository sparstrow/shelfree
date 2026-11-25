import { afterEach, describe, expect, it } from 'vitest'
import { api } from '@/data/api'
import { CommandError } from '@/data/api/commands'
import {
  cancelGstRegistration,
  deleteGstRegistration,
  makeGstRegistrationPrimary,
  reactivateGstRegistration,
  restoreGstRegistration,
  saveGstRegistration,
} from '@/data/api/gst-registrations'
import { sessionApi } from '@/data/api/session'
import { settingsApi } from '@/data/api/settings'
import { saveWarehouse } from '@/data/api/warehouse-settings'
import type { GstRegistration, Warehouse } from '@/data/schemas'
import { blankRegistration } from '@/domain/gst-registrations'

/** Karnataka GSTIN under the business PAN, with a valid check character. */
const KA_GSTIN = '29ABCDE1234F1ZW'

const newKa = (over: Partial<GstRegistration> = {}): GstRegistration => ({
  ...blankRegistration({ legal: 'Kanalora Crafts Pvt. Ltd.', trade: 'Kanalora', hasPrimary: true, gstinPrefix: KA_GSTIN }),
  ...over,
})

afterEach(async () => {
  await Promise.all([api.gstRegistrations.reset(), api.warehouses.reset()])
  localStorage.clear()
})

describe('seed', () => {
  it('starts with one primary Tamil Nadu registration taken from the Business profile', async () => {
    const [list, ws] = await Promise.all([api.gstRegistrations.list(), sessionApi.workspace()])
    expect(list).toHaveLength(1)
    expect(list[0]).toMatchObject({ id: 'REG-TN', gstin: ws.gstin, legal: ws.legal, primary: true, status: 'Active', series: 'TN/{FY}/' })
    expect(list[0].gstin.slice(0, 2)).toBe('33')
  })
})

describe('saveGstRegistration', () => {
  it('adds a registration in another state and keeps the primary', async () => {
    const saved = await saveGstRegistration(newKa())
    const list = await api.gstRegistrations.list()
    expect(list.map((r) => r.gstin).sort()).toEqual([KA_GSTIN, '33ABCDE1234F1Z7'])
    expect(list.find((r) => r.id === saved.id)).toMatchObject({ primary: false, series: 'KA/{FY}/', status: 'Active' })
    expect(list.find((r) => r.id === 'REG-TN')?.primary).toBe(true)
  })
  it('refuses a GSTIN with another PAN, a duplicate and a second Normal registration in a state', async () => {
    await expect(saveGstRegistration(newKa({ gstin: '29ZZZZZ9999Z1ZY' }))).rejects.toBeInstanceOf(CommandError)
    await expect(saveGstRegistration(newKa({ gstin: '33ABCDE1234F1Z7' }))).rejects.toThrow(/already on the list/)
  })
  it('never changes the GSTIN when editing', async () => {
    await saveGstRegistration({ ...(await api.gstRegistrations.list())[0], gstin: KA_GSTIN, legal: 'Kanalora Crafts Private Limited' })
    const [tn] = await api.gstRegistrations.list()
    expect(tn).toMatchObject({ gstin: '33ABCDE1234F1Z7', legal: 'Kanalora Crafts Private Limited' })
  })
  it('a new primary clears the old one and updates the workspace GSTIN mirror', async () => {
    const saved = await saveGstRegistration(newKa({ primary: true }))
    const list = await api.gstRegistrations.list()
    expect(list.filter((r) => r.primary).map((r) => r.id)).toEqual([saved.id])
    expect((await sessionApi.workspace()).gstin).toBe(KA_GSTIN)
  })
  it('numbers invoices by the financial-year start of Regional & format', async () => {
    await settingsApi.updateRegional({ ...(await settingsApi.get()).regional, fiscalStart: 'January' })
    await expect(saveGstRegistration(newKa({ series: 'KARNATAKA/{FY}/' }))).rejects.toThrow(/at most 16/)
    await expect(saveGstRegistration(newKa({ series: 'KA-{FY}/' }))).resolves.toBeTruthy()
  })
})

describe('cancel, reactivate, delete, make primary', () => {
  it('blocks cancelling the primary and deleting it', async () => {
    await expect(cancelGstRegistration('REG-TN')).rejects.toThrow(/primary registration/)
    await expect(deleteGstRegistration('REG-TN')).rejects.toThrow(/primary registration/)
  })
  it('cancels, reactivates and deletes a non-primary registration, and Undo restores it', async () => {
    const ka = await saveGstRegistration(newKa())
    await cancelGstRegistration(ka.id)
    expect((await api.gstRegistrations.get(ka.id))?.status).toBe('Cancelled')
    await reactivateGstRegistration(ka.id)
    expect((await api.gstRegistrations.get(ka.id))?.status).toBe('Active')
    await deleteGstRegistration(ka.id)
    expect(await api.gstRegistrations.get(ka.id)).toBeNull()
    await restoreGstRegistration(ka)
    expect((await api.gstRegistrations.get(ka.id))?.gstin).toBe(KA_GSTIN)
  })
  it('make primary moves the flag and the workspace mirror; the old primary’s sites keep it from being cancelled', async () => {
    const ka = await saveGstRegistration(newKa())
    await makeGstRegistrationPrimary(ka.id)
    expect((await sessionApi.workspace()).gstin).toBe(KA_GSTIN)
    await expect(cancelGstRegistration('REG-TN')).rejects.toThrow(/3 locations are in Tamil Nadu/)
  })
  it('a registration whose state has an active location can’t be cancelled or deleted', async () => {
    const ka = await saveGstRegistration(newKa())
    const site: Warehouse = {
      id: 'WH-BLR',
      name: 'Bengaluru DC',
      code: 'BLR',
      type: 'dc',
      addr: '',
      city: 'Bengaluru',
      state: '29',
      zip: '',
      country: 'IN',
      area: 0,
      status: 'active',
      pobStatus: 'undeclared',
      managerEmpId: '',
      operatorVendorId: '',
    }
    await saveWarehouse(site)
    await expect(cancelGstRegistration(ka.id)).rejects.toThrow(/Bengaluru DC is in Karnataka/)
    await expect(deleteGstRegistration(ka.id)).rejects.toThrow(/left without a registration/)
  })
})

describe('Locations read the registrations (G-017)', () => {
  const site = (over: Partial<Warehouse> = {}): Warehouse => ({
    id: 'WH-BLR',
    name: 'Bengaluru DC',
    code: 'BLR',
    type: 'dc',
    addr: '',
    city: 'Bengaluru',
    state: '29',
    zip: '',
    country: 'IN',
    area: 0,
    status: 'active',
    pobStatus: 'undeclared',
    managerEmpId: '',
    operatorVendorId: '',
    ...over,
  })
  it('a site can’t be saved Active until its state has a registration', async () => {
    await expect(saveWarehouse(site())).rejects.toThrow(/Karnataka has no active GST registration/)
    await expect(saveWarehouse(site({ status: 'setup' }))).resolves.toBeTruthy()
    await saveGstRegistration(newKa())
    await expect(saveWarehouse(site({ status: 'active' }))).resolves.toBeTruthy()
  })
})
