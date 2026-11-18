import { describe, expect, it } from 'vitest'
import { api } from '@/data/api'
import { itemSchema } from '@/data/schemas'
import {
  ALL_TRACKING_AXES,
  COSTING_METHODS,
  ITEM_TYPES,
  blankItemCard,
  buildItemCardSave,
  itemCardCategoryGroups,
  itemCardMarginInfo,
  itemCardReorderHint,
  itemCardUomOptions,
  itemCardVendorOptions,
  itemNextNo,
  itemToCardDraft,
  normalizeItemCard,
  validateItemCard,
} from './item-card'

const items = await api.items.list()
const vendors = await api.vendors.list()

describe('itemNextNo & blankItemCard', () => {
  it('computes ITM01001 when empty and increments the highest numeric portion otherwise', () => {
    expect(itemNextNo([])).toBe('ITM01001')
    expect(itemNextNo([{ no: 'ASH-PWH-18' }, { no: 'SBC-CONE-50' }])).toBe('ITM00051')
    expect(itemNextNo([{ no: 'ITM00099' }, { no: 'ITM00105' }])).toBe('ITM00106')
  })

  it('computes the next item number on seeded items and populates prototype defaults', () => {
    const next = itemNextNo(items)
    expect(next).toMatch(/^ITM\d{5}$/)

    const draft = blankItemCard(items)
    expect(draft).toEqual({
      no: next,
      desc: '',
      category: '',
      type: 'Inventory',
      uom: 'NOS',
      vendor: '',
      costing: 'FIFO',
      price: '',
      cost: '',
      lead: '',
      rp: '',
      rq: '',
      ss: '',
      sellable: false,
      blocked: false,
      tracksLot: false,
      tracksExpiry: false,
      tracksSerial: false,
      barcode: '',
    })
  })

  it('converts an existing item cleanly via itemToCardDraft', () => {
    const existing = items[0]
    expect(existing).toBeDefined()
    if (!existing) return

    const draft = itemToCardDraft(existing)
    expect(draft.no).toBe(existing.no)
    expect(draft.desc).toBe(existing.desc)
    expect(draft.category).toBe(existing.category)
    expect(draft.price).toBe(String(existing.price))
    expect(draft.cost).toBe(String(existing.cost))
    expect(draft.sellable).toBe(existing.sellable)
    expect(draft.blocked).toBe(existing.blocked)
  })
})

describe('normalizeItemCard & validateItemCard', () => {
  it('normalizes case for item no. on create while preserving locked no. on edit', () => {
    const draft = {
      ...blankItemCard([]),
      no: '  itm-custom-7 ',
      desc: '  Handmade Bowl  ',
      category: ' Sambrani Holder ',
      type: '',
      uom: '',
      costing: '',
      barcode: '  890123  ',
    }
    const normNew = normalizeItemCard(draft, 'new')
    expect(normNew.no).toBe('ITM-CUSTOM-7')
    expect(normNew.desc).toBe('Handmade Bowl')
    expect(normNew.category).toBe('Sambrani Holder')
    expect(normNew.type).toBe('Inventory')
    expect(normNew.uom).toBe('NOS')
    expect(normNew.costing).toBe('FIFO')
    expect(normNew.barcode).toBe('890123')

    const normEdit = normalizeItemCard({ ...draft, no: 'changed-no' }, 'edit', 'ASH-PWH-18')
    expect(normEdit.no).toBe('ASH-PWH-18')
  })

  it('enforces prototype validation messages for required fields, duplicates, and negative numbers', () => {
    const base = {
      ...blankItemCard(items),
      desc: 'Terracotta Plate',
      category: 'Sambrani Holder',
    }

    expect(validateItemCard({ ...base, no: '   ' }, items, 'new')).toBe(
      'An item no. is required — it is the record key.',
    )
    expect(validateItemCard({ ...base, desc: '  ' }, items, 'new')).toBe(
      'A description is required.',
    )
    expect(validateItemCard({ ...base, category: '' }, items, 'new')).toBe(
      'Choose a category for this item.',
    )
    expect(validateItemCard({ ...base, no: 'ash-pwh-18' }, items, 'new')).toBe(
      'Item no. “ASH-PWH-18” already exists. Pick another.',
    )
    // Editing the same item is allowed even though its `no` already exists
    expect(validateItemCard({ ...base, no: 'ASH-PWH-18' }, items, 'edit', 'ASH-PWH-18')).toBeNull()

    expect(validateItemCard({ ...base, price: '-1' }, items, 'new')).toBe(
      'Unit price cannot be negative.',
    )
    expect(validateItemCard({ ...base, cost: '-0.5' }, items, 'new')).toBe(
      'Unit cost cannot be negative.',
    )
    expect(validateItemCard({ ...base, lead: '-2' }, items, 'new')).toBe(
      'Lead time cannot be negative.',
    )
    expect(validateItemCard({ ...base, rp: '-1' }, items, 'new')).toBe(
      'Reorder point cannot be negative.',
    )
    expect(validateItemCard({ ...base, rq: '-1' }, items, 'new')).toBe(
      'Reorder qty cannot be negative.',
    )
    expect(validateItemCard({ ...base, ss: '-1' }, items, 'new')).toBe(
      'Safety stock cannot be negative.',
    )
    expect(validateItemCard({ ...base, price: 'abc' }, items, 'new')).toBe(
      'Unit price must be a valid number.',
    )
    expect(validateItemCard(base, items, 'new')).toBeNull()
  })
})

describe('buildItemCardSave', () => {
  it('builds a schema-valid new item with empty locs and rounded whole replenishment numbers', () => {
    const draft = {
      ...blankItemCard(items),
      no: ' itm-test-01 ',
      desc: ' Brass Burner ',
      category: 'Sambrani Holder',
      price: '399.5',
      cost: '150',
      lead: '7.6',
      rp: '12.2',
      rq: '24',
      ss: '6',
      sellable: true,
      tracksLot: true,
      tracksExpiry: true,
      barcode: ' 8904210000123 ',
    }

    const created = buildItemCardSave(draft, { mode: 'new' })
    expect(itemSchema.parse(created)).toEqual({
      no: 'ITM-TEST-01',
      desc: 'Brass Burner',
      category: 'Sambrani Holder',
      type: 'Inventory',
      uom: 'NOS',
      vendor: '',
      costing: 'FIFO',
      price: 399.5,
      cost: 150,
      lead: 8,
      rp: 12,
      rq: 24,
      ss: 6,
      sellable: true,
      blocked: false,
      tracksLot: true,
      tracksExpiry: true,
      tracksSerial: false,
      barcode: '8904210000123',
      locs: {},
      qtySO: 0,
      qtySupply: 0,
      attrs: {},
    })
  })

  it('preserves stock locs, demand/supply, attrs, and hidden tracking axes on edit', () => {
    const target = items.find((item) => item.no === 'ASH-PWH-18') ?? items[0]
    expect(target).toBeDefined()
    if (!target) return

    const draft = {
      ...itemToCardDraft(target),
      no: 'HACKED-NO',
      price: '699',
      tracksLot: !target.tracksLot,
      tracksSerial: !target.tracksSerial,
      barcode: 'CHANGED-BARCODE',
    }

    const updated = buildItemCardSave(draft, {
      mode: 'edit',
      existing: target,
      axes: { ...ALL_TRACKING_AXES, lot: false, barcode: false },
    })

    expect(updated.no).toBe(target.no)
    expect(updated.price).toBe(699)
    expect(updated.locs).toEqual(target.locs)
    expect(updated.locs).not.toBe(target.locs)
    expect(updated.qtySO).toBe(target.qtySO)
    expect(updated.qtySupply).toBe(target.qtySupply)
    expect(updated.attrs).toEqual(target.attrs)
    expect(updated.tracksLot).toBe(target.tracksLot)
    expect(updated.tracksSerial).toBe(!target.tracksSerial)
    expect(updated.barcode).toBe(target.barcode)
  })
})

describe('select options & computed card helpers', () => {
  it('exposes prototype item types, costing methods, UoMs, grouped categories, and sorted vendors', () => {
    expect(ITEM_TYPES).toEqual(['Inventory', 'Non-inventory', 'Service'])
    expect(COSTING_METHODS).toEqual(['FIFO', 'LIFO', 'Average', 'Standard'])

    const groups = itemCardCategoryGroups(items, 'Custom Seasonal')
    expect(groups.some((g) => g.group === 'Finished Goods' && g.categories.includes('Sambrani Holder'))).toBe(true)
    expect(groups.some((g) => g.group === null && g.categories.includes('Accessory'))).toBe(true)
    expect(groups.some((g) => g.group === null && g.categories.includes('Custom Seasonal'))).toBe(true)

    const uoms = itemCardUomOptions('CUSTOM')
    expect(uoms[0]).toEqual({ value: 'NOS', label: 'NOS · Numbers' })
    expect(uoms.at(-1)).toEqual({ value: 'CUSTOM', label: 'CUSTOM' })

    const vendorOpts = itemCardVendorOptions(vendors, 'Legacy Vendor Co')
    expect(vendorOpts[0]).toEqual({ value: '', label: 'No preferred vendor' })
    expect(vendorOpts.some((v) => v.value === 'Legacy Vendor Co')).toBe(true)
  })

  it('computes margin ratio and unit margin plus reorder hint copy', () => {
    expect(itemCardMarginInfo('200', '120')).toEqual({ ratio: 0.4, unitMargin: 80 })
    expect(itemCardMarginInfo('', '50')).toEqual({ ratio: null, unitMargin: -50 })

    expect(itemCardReorderHint('0', 'NOS')).toBe(
      'Leave the reorder point at 0 to keep this item out of replenishment suggestions.',
    )
    expect(itemCardReorderHint('25', 'BOX')).toBe(
      'Replenishment is suggested once available stock falls to 25 BOX.',
    )
  })
})
