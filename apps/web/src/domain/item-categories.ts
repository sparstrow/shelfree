/**
 * Item categories (Settings ▸ Item categories): the category tree, its rules and
 * the numbers shown beside it. Pure functions only.
 *
 * Items store the category *name* (their most specific category); the path is
 * derived from the tree. See docs/item-categories/README.md.
 */
import type { Item, ItemCategory } from '@/data/schemas'

/** A tree can nest this many levels (root = level 1). */
export const CATEGORY_MAX_DEPTH = 5

export const CATEGORY_COLORS = [
  { name: 'Amber', hex: '#c98a1a' },
  { name: 'Indigo', hex: '#4f46e5' },
  { name: 'Emerald', hex: '#0f9d6e' },
  { name: 'Rose', hex: '#e11d63' },
  { name: 'Sky', hex: '#0ea5e9' },
  { name: 'Violet', hex: '#8b5cf6' },
  { name: 'Slate', hex: '#64748b' },
] as const

export const CATEGORY_FALLBACK_COLOR = '#64748b'

export const categoryColorName = (hex: string): string =>
  CATEGORY_COLORS.find((c) => c.hex === hex)?.name ?? hex

export const categoryById = (cats: readonly ItemCategory[], id: string): ItemCategory | null =>
  cats.find((c) => c.id === id) ?? null

export const categoryChildren = (cats: readonly ItemCategory[], id: string): ItemCategory[] =>
  cats.filter((c) => c.parent === id)

/** Ancestors, top-first (root … immediate parent). Cycle-safe. */
export function categoryAncestors(cats: readonly ItemCategory[], id: string): ItemCategory[] {
  const out: ItemCategory[] = []
  const seen = new Set<string>()
  let cur = categoryById(cats, id)
  while (cur?.parent && !seen.has(cur.parent)) {
    seen.add(cur.parent)
    const parent = categoryById(cats, cur.parent)
    if (!parent) break
    out.unshift(parent)
    cur = parent
  }
  return out
}

/** Root = 0. */
export const categoryDepth = (cats: readonly ItemCategory[], id: string): number =>
  categoryAncestors(cats, id).length

export function categoryDescendants(cats: readonly ItemCategory[], id: string): ItemCategory[] {
  const out: ItemCategory[] = []
  const seen = new Set<string>([id])
  const walk = (pid: string) => {
    for (const c of categoryChildren(cats, pid)) {
      if (seen.has(c.id)) continue
      seen.add(c.id)
      out.push(c)
      walk(c.id)
    }
  }
  walk(id)
  return out
}

/** 0 for a leaf, 1 when it only has leaf children, … */
export function categorySubtreeHeight(cats: readonly ItemCategory[], id: string): number {
  const kids = categoryChildren(cats, id)
  return kids.length ? 1 + Math.max(...kids.map((k) => categorySubtreeHeight(cats, k.id))) : 0
}

/** Path names, root-first, for a category id. */
export function categoryPath(cats: readonly ItemCategory[], id: string): string[] {
  const node = categoryById(cats, id)
  return node ? [...categoryAncestors(cats, id), node].map((c) => c.name) : []
}

/** A node plus its depth, in tree order (each parent followed by its children). */
export interface CategoryNode {
  cat: ItemCategory
  depth: number
}

/** Depth-first order from the roots, keeping each level in stored order. Orphans surface as roots. */
export function categoryTreeOrder(cats: readonly ItemCategory[]): CategoryNode[] {
  const ids = new Set(cats.map((c) => c.id))
  const out: CategoryNode[] = []
  const seen = new Set<string>()
  const walk = (nodes: readonly ItemCategory[], depth: number) => {
    for (const cat of nodes) {
      if (seen.has(cat.id)) continue
      seen.add(cat.id)
      out.push({ cat, depth })
      walk(categoryChildren(cats, cat.id), depth + 1)
    }
  }
  walk(
    cats.filter((c) => !c.parent || !ids.has(c.parent)),
    0,
  )
  return out
}

export const categoryRoot = (cats: readonly ItemCategory[], id: string): ItemCategory | null =>
  categoryAncestors(cats, id)[0] ?? categoryById(cats, id)

/** Items that carry exactly this category's name. */
export const categoryDirectItemCount = (cat: Pick<ItemCategory, 'name'>, items: readonly Pick<Item, 'category'>[]): number =>
  items.filter((i) => i.category === cat.name).length

/** Items in this category and everything beneath it. */
export function categoryItemCount(
  cat: ItemCategory,
  cats: readonly ItemCategory[],
  items: readonly Pick<Item, 'category'>[],
): number {
  const names = new Set([cat.name, ...categoryDescendants(cats, cat.id).map((d) => d.name)])
  return items.filter((i) => names.has(i.category)).length
}

/** Leaf-name → parent-name map in the shape the item helpers (`itemCategoryPathNames` …) take. */
export function categoryParentNames(cats: readonly ItemCategory[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const c of cats) {
    const parent = c.parent ? categoryById(cats, c.parent) : null
    if (parent) out[c.name] = parent.name
  }
  return out
}

export interface CategoryDraft {
  code: string
  name: string
  parent: string
  color: string
  desc: string
  active: boolean
}

export const normalizeCategoryCode = (code: string): string => code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')

/**
 * Field errors for a category being saved (empty when valid). `editId` is the
 * category being edited (null for a new one). Messages match the prototype.
 */
export function validateCategory(
  draft: CategoryDraft,
  cats: readonly ItemCategory[],
  editId: string | null,
): Record<string, string> {
  const errors: Record<string, string> = {}
  const code = normalizeCategoryCode(draft.code)
  const name = draft.name.trim()
  const others = cats.filter((c) => c.id !== editId)
  if (!code) errors.code = 'Enter a short code (e.g. SBH).'
  else {
    const clash = others.find((c) => c.code.toUpperCase() === code)
    if (clash) errors.code = `Code “${code}” is already used by “${clash.name}”.`
  }
  if (!name) errors.name = 'Enter a name for the category.'
  else {
    const clash = others.find((c) => c.name.toLowerCase() === name.toLowerCase())
    if (clash) errors.name = `A category named “${clash.name}” already exists.`
  }
  if (draft.parent) {
    if (editId && draft.parent === editId) errors.parent = 'A category can’t be its own parent.'
    else if (editId && categoryDescendants(cats, editId).some((d) => d.id === draft.parent)) {
      errors.parent = 'You can’t move a category beneath one of its own sub-categories.'
    } else {
      const height = editId ? categorySubtreeHeight(cats, editId) : 0
      const deepest = categoryDepth(cats, draft.parent) + 2 + height
      if (deepest > CATEGORY_MAX_DEPTH) {
        errors.parent = `That would nest deeper than ${CATEGORY_MAX_DEPTH} levels. Choose a higher-level parent.`
      }
    }
  }
  return errors
}

/** Parents a category may sit under: not itself, not its own sub-tree, and not so deep the tree overflows. */
export function categoryParentChoices(
  cats: readonly ItemCategory[],
  editId: string | null,
): { id: string; label: string; depth: number }[] {
  const blocked = new Set<string>(editId ? [editId, ...categoryDescendants(cats, editId).map((d) => d.id)] : [])
  const height = editId ? categorySubtreeHeight(cats, editId) : 0
  return categoryTreeOrder(cats)
    .filter(({ cat, depth }) => !blocked.has(cat.id) && depth + 2 + height <= CATEGORY_MAX_DEPTH)
    .map(({ cat, depth }) => ({ id: cat.id, label: `${'— '.repeat(depth)}${cat.name}`, depth }))
}

/** Why a category can't be deleted, or null. Only items carrying this exact name block it. */
export function categoryDeleteBlockReason(directItems: number): string | null {
  if (directItems === 0) return null
  return `${directItems} ${directItems === 1 ? 'item uses' : 'items use'} this category — move ${directItems === 1 ? 'it' : 'them'} to another category first.`
}

/** Next free id for a category created from `name` (`cat-<slug>`, numbered when taken). */
export function nextCategoryId(cats: readonly ItemCategory[], name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'category'
  const taken = new Set(cats.map((c) => c.id))
  let id = `cat-${slug}`
  for (let n = 2; taken.has(id); n++) id = `cat-${slug}-${n}`
  return id
}

/**
 * The tree after deleting `id`: its children move up to its own parent
 * (prototype `catConfirmDel`). Returns the new list and the lifted children's ids.
 */
export function categoriesWithout(
  cats: readonly ItemCategory[],
  id: string,
): { list: ItemCategory[]; lifted: string[] } {
  const gone = categoryById(cats, id)
  const lifted = categoryChildren(cats, id).map((c) => c.id)
  const list = cats
    .filter((c) => c.id !== id)
    .map((c) => (c.parent === id ? { ...c, parent: gone?.parent ?? '' } : c))
  return { list, lifted }
}

/** Items renamed from one category name to another (rename cascade). */
export function reassignItemCategory<T extends Pick<Item, 'category'>>(items: readonly T[], from: string, to: string): T[] {
  return items.filter((i) => i.category === from).map((i) => ({ ...i, category: to }))
}

export interface CategoryOptionGroup {
  group: string | null
  categories: string[]
}

/**
 * Category choices for the item card: active categories that have no active
 * sub-category, grouped under their top-level category (top-level categories
 * without children stand alone). The item's current category is always offered,
 * even if it is inactive or no longer in the tree.
 */
export function categoryPickerGroups(cats: readonly ItemCategory[], current = ''): CategoryOptionGroup[] {
  const active = cats.filter((c) => c.active)
  const isLeaf = (c: ItemCategory) => !active.some((k) => k.parent === c.id)
  const groups = new Map<string | null, string[]>()
  const put = (group: string | null, name: string) => {
    const list = groups.get(group) ?? []
    if (!list.includes(name)) list.push(name)
    groups.set(group, list)
  }
  const placed = new Set<string>()
  for (const { cat } of categoryTreeOrder(active)) {
    if (!isLeaf(cat)) continue
    const root = categoryRoot(cats, cat.id)
    put(root && root.id !== cat.id ? root.name : null, cat.name)
    placed.add(cat.name)
  }
  const cur = current.trim()
  if (cur && !placed.has(cur)) {
    const node = cats.find((c) => c.name === cur)
    const root = node ? categoryRoot(cats, node.id) : null
    put(root && node && root.id !== node.id ? root.name : null, cur)
  }
  const ordered = [...groups.entries()].map(([group, categories]) => ({ group, categories }))
  // Groups first in tree order, then the stand-alone categories.
  return [...ordered.filter((g) => g.group !== null), ...ordered.filter((g) => g.group === null)]
}
