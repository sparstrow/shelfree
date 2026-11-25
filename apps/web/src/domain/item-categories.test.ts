import { afterEach, describe, expect, it } from 'vitest'
import { api } from '@/data/api'
import { CommandError } from '@/data/api/commands'
import { deleteItemCategory, restoreItemCategory, saveItemCategory } from '@/data/api/warehouse-settings'
import type { ItemCategory } from '@/data/schemas'
import {
  CATEGORY_MAX_DEPTH,
  categoriesWithout,
  categoryAncestors,
  categoryDeleteBlockReason,
  categoryDescendants,
  categoryItemCount,
  categoryParentChoices,
  categoryParentNames,
  categoryPickerGroups,
  categoryRoot,
  categorySubtreeHeight,
  categoryTreeOrder,
  nextCategoryId,
  normalizeCategoryCode,
  validateCategory,
} from './item-categories'

const C = (id: string, code: string, name: string, parent = '', active = true): ItemCategory => ({
  id,
  code,
  name,
  parent,
  color: '#c98a1a',
  desc: '',
  active,
})

const tree: ItemCategory[] = [
  C('fg', 'FG', 'Finished Goods'),
  C('holder', 'SBH', 'Sambrani Holder', 'fg'),
  C('combo', 'CMB', 'Combo Pack', 'fg'),
  C('pkg', 'PKG', 'Packaging'),
]

const draft = (over: Partial<Parameters<typeof validateCategory>[0]> = {}) => ({
  code: 'NEW',
  name: 'New category',
  parent: '',
  color: '#c98a1a',
  desc: '',
  active: true,
  ...over,
})

describe('category tree helpers', () => {
  it('orders depth-first and keeps each parent before its children', () => {
    const shuffled = [tree[3], tree[1], tree[0], tree[2]]
    expect(categoryTreeOrder(shuffled).map((n) => [n.cat.id, n.depth])).toEqual([
      ['pkg', 0],
      ['fg', 0],
      ['holder', 1],
      ['combo', 1],
    ])
  })

  it('finds ancestors, descendants, root and subtree height', () => {
    expect(categoryAncestors(tree, 'holder').map((c) => c.id)).toEqual(['fg'])
    expect(categoryDescendants(tree, 'fg').map((c) => c.id)).toEqual(['holder', 'combo'])
    expect(categoryRoot(tree, 'holder')?.id).toBe('fg')
    expect(categorySubtreeHeight(tree, 'fg')).toBe(1)
    expect(categorySubtreeHeight(tree, 'pkg')).toBe(0)
  })

  it('survives a cycle in stored data', () => {
    const cyclic = [C('a', 'A', 'A', 'b'), C('b', 'B', 'B', 'a')]
    expect(categoryAncestors(cyclic, 'a').length).toBeLessThan(3)
    expect(categoryDescendants(cyclic, 'a').length).toBeLessThan(3)
  })

  it('maps leaf names to parent names for the item helpers', () => {
    expect(categoryParentNames(tree)).toEqual({ 'Sambrani Holder': 'Finished Goods', 'Combo Pack': 'Finished Goods' })
  })

  it('counts items under a category and its sub-categories', () => {
    const items = [{ category: 'Sambrani Holder' }, { category: 'Combo Pack' }, { category: 'Packaging' }]
    expect(categoryItemCount(tree[0], tree, items)).toBe(2)
    expect(categoryItemCount(tree[3], tree, items)).toBe(1)
  })

  it('numbers ids that are taken', () => {
    expect(nextCategoryId(tree, 'Display Stands')).toBe('cat-display-stands')
    expect(nextCategoryId([...tree, C('cat-packaging', 'X', 'X')], 'Packaging')).toBe('cat-packaging-2')
  })
})

describe('validateCategory', () => {
  it('accepts a clean new category', () => {
    expect(validateCategory(draft(), tree, null)).toEqual({})
  })

  it('requires a code and a name, with the prototype wording', () => {
    expect(validateCategory(draft({ code: ' ' }), tree, null).code).toBe('Enter a short code (e.g. SBH).')
    expect(validateCategory(draft({ name: ' ' }), tree, null).name).toBe('Enter a name for the category.')
  })

  it('refuses a duplicate code or name (case-insensitive) but not the category itself', () => {
    expect(validateCategory(draft({ code: 'sbh' }), tree, null).code).toBe('Code “SBH” is already used by “Sambrani Holder”.')
    expect(validateCategory(draft({ name: 'packaging' }), tree, null).name).toBe('A category named “Packaging” already exists.')
    expect(validateCategory(draft({ code: 'PKG', name: 'Packaging' }), tree, 'pkg')).toEqual({})
  })

  it('refuses nesting under itself or its own sub-category', () => {
    expect(validateCategory(draft({ code: 'FG', name: 'Finished Goods', parent: 'fg' }), tree, 'fg').parent).toBe(
      'A category can’t be its own parent.',
    )
    expect(validateCategory(draft({ code: 'FG', name: 'Finished Goods', parent: 'holder' }), tree, 'fg').parent).toBe(
      'You can’t move a category beneath one of its own sub-categories.',
    )
  })

  it('refuses nesting deeper than five levels', () => {
    const deep = Array.from({ length: CATEGORY_MAX_DEPTH }, (_, i) => C(`l${i}`, `L${i}`, `Level ${i}`, i ? `l${i - 1}` : ''))
    expect(validateCategory(draft({ parent: 'l4' }), deep, null).parent).toMatch(/deeper than 5 levels/)
    expect(validateCategory(draft({ parent: 'l3' }), deep, null).parent).toBe(undefined)
  })

  it('offers only parents that keep the tree within depth and out of its own sub-tree', () => {
    expect(categoryParentChoices(tree, 'fg').map((c) => c.id)).toEqual(['pkg'])
    expect(categoryParentChoices(tree, null).map((c) => c.id)).toEqual(['fg', 'holder', 'combo', 'pkg'])
  })
})

describe('delete and rename rules', () => {
  it('blocks delete while an item uses the category', () => {
    expect(categoryDeleteBlockReason(0)).toBeNull()
    expect(categoryDeleteBlockReason(1)).toBe('1 item uses this category — move it to another category first.')
    expect(categoryDeleteBlockReason(3)).toBe('3 items use this category — move them to another category first.')
  })

  it('lifts the children of a deleted category to its parent', () => {
    const { list, lifted } = categoriesWithout(tree, 'fg')
    expect(lifted).toEqual(['holder', 'combo'])
    expect(list.find((c) => c.id === 'holder')?.parent).toBe('')
    expect(list.some((c) => c.id === 'fg')).toBe(false)
  })
})

describe('item picker groups', () => {
  it('groups active leaves under their top-level category and keeps stand-alone roots last', () => {
    expect(categoryPickerGroups(tree)).toEqual([
      { group: 'Finished Goods', categories: ['Sambrani Holder', 'Combo Pack'] },
      { group: null, categories: ['Packaging'] },
    ])
  })

  it('hides inactive categories but keeps the current one of the item', () => {
    const t = [C('fg', 'FG', 'Finished Goods'), C('h', 'SBH', 'Sambrani Holder', 'fg', false), C('c', 'CMB', 'Combo Pack', 'fg')]
    expect(categoryPickerGroups(t)[0].categories).toEqual(['Combo Pack'])
    expect(categoryPickerGroups(t, 'Sambrani Holder')[0].categories).toEqual(['Combo Pack', 'Sambrani Holder'])
  })

  it('offers a name that is no longer in the tree', () => {
    expect(categoryPickerGroups(tree, 'Old name').at(-1)).toEqual({ group: null, categories: ['Packaging', 'Old name'] })
  })
})

describe('normalizeCategoryCode', () => {
  it('upper-cases and strips everything but letters and digits', () => {
    expect(normalizeCategoryCode(' sb-h 1 ')).toBe('SBH1')
  })
})

describe('category commands', () => {
  afterEach(async () => {
    await Promise.all([api.itemCategories.reset(), api.items.reset()])
  })

  it('seeds a tree that covers every category an item uses', async () => {
    const [cats, items] = await Promise.all([api.itemCategories.list(), api.items.list()])
    const names = new Set(cats.map((c) => c.name))
    for (const it of items) expect(names.has(it.category)).toBe(true)
    expect(cats.find((c) => c.name === 'Sambrani Holder')?.parent).toBe('grp-fg')
  })

  it('renaming a category renames it on every item that carries it', async () => {
    const holder = (await api.itemCategories.list()).find((c) => c.name === 'Sambrani Holder')
    expect(holder).toBeDefined()
    const before = (await api.items.list()).filter((i) => i.category === 'Sambrani Holder').length
    expect(before).toBeGreaterThan(0)
    await saveItemCategory({ ...(holder as ItemCategory), name: 'Mountain Holder' })
    const items = await api.items.list()
    expect(items.filter((i) => i.category === 'Mountain Holder')).toHaveLength(before)
    expect(items.some((i) => i.category === 'Sambrani Holder')).toBe(false)
  })

  it('refuses to save an invalid category and to delete one that items use', async () => {
    await expect(saveItemCategory(C('x', 'SBH', 'Dup code'))).rejects.toBeInstanceOf(CommandError)
    await expect(deleteItemCategory('cat-holder')).rejects.toThrow(/items? use/)
  })

  it('deletes an unused group, lifts its children, and Undo puts them back', async () => {
    await saveItemCategory(C('cat-new', 'NEW', 'Spare parts', 'grp-comp'))
    await saveItemCategory(C('cat-gaskets', 'GSK', 'Gaskets', 'cat-new'))
    const lifted = await deleteItemCategory('cat-new')
    expect(lifted).toEqual(['cat-gaskets'])
    expect((await api.itemCategories.get('cat-gaskets'))?.parent).toBe('grp-comp')
    await restoreItemCategory(C('cat-new', 'NEW', 'Spare parts', 'grp-comp'), lifted)
    expect((await api.itemCategories.get('cat-gaskets'))?.parent).toBe('cat-new')
    expect(await api.itemCategories.get('cat-new')).not.toBeNull()
  })
})
