import { useMemo, useRef } from 'react'
import { type ListDelete, type ListEditor, ListPage } from '@/components/list-page/ListPage'
import { SettingsPage } from '@/components/settings/SettingsPage'
import { useList } from '@/data/queries'
import {
  useDeleteItemCategory,
  useItemCategories,
  useRestoreItemCategory,
  useSaveItemCategory,
} from '@/data/queries/warehouse-settings'
import type { ItemCategory } from '@/data/schemas'
import {
  CATEGORY_COLORS,
  categoryById,
  categoryDeleteBlockReason,
  categoryDirectItemCount,
  categoryItemCount,
  categoryParentChoices,
  categoryPath,
  categoryRoot,
  categoryTreeOrder,
  nextCategoryId,
  normalizeCategoryCode,
  validateCategory,
} from '@/domain/item-categories'
import { EM_DASH, int } from '@/lib/format'
import { type CategoryRow, itemCategoriesDataset } from './dataset'
import { ITEM_CATEGORIES_HELP } from './help'

const COLOR_OPTIONS = CATEGORY_COLORS.map((c) => ({ value: c.hex, label: c.name }))
const TOP_LEVEL = 'Top-level category'

/** A dot, code and name as it appears in pickers and lists — a live preview while editing. */
function CategoryChip({ color, code, name }: { color: string; code: string; name: string }) {
  return (
    <p aria-live="polite" className="m-0 mt-3 flex items-center gap-2 text-[12px] text-muted-foreground">
      Shown as
      <span className="inline-flex items-center gap-2 rounded-md border border-border bg-panel px-2 py-1 text-[12.5px] text-foreground">
        <span aria-hidden className="size-[11px] flex-none rounded-[4px]" style={{ background: color }} />
        {code && <span className="font-mono text-[11px] font-semibold">{code}</span>}
        <span className="font-semibold">{name || 'Untitled category'}</span>
      </span>
    </p>
  )
}

/** Warehouse ▸ Settings ▸ Item categories (`/warehouse/settings/categories`). */
export function ItemCategoriesSection({ readOnly = false }: { readOnly?: boolean } = {}) {
  const categories = useItemCategories()
  const items = useList('items')
  const save = useSaveItemCategory()
  const remove = useDeleteItemCategory()
  const restore = useRestoreItemCategory()
  /** Children lifted by the last delete, so Undo can put them back under it. */
  const lifted = useRef<Record<string, string[]>>({})

  const cats = useMemo(() => categories.data ?? [], [categories.data])
  const itemList = useMemo(() => items.data ?? [], [items.data])

  const rows = useMemo<CategoryRow[] | undefined>(() => {
    if (categories.data === undefined || items.data === undefined) return undefined
    return categoryTreeOrder(cats).map(({ cat, depth }) => {
      const parent = cat.parent ? categoryById(cats, cat.parent) : null
      return {
        ...cat,
        depth,
        parentName: parent?.name ?? '',
        group: categoryRoot(cats, cat.id)?.name ?? cat.name,
        path: categoryPath(cats, cat.id).join(' › '),
        itemCount: categoryItemCount(cat, cats, itemList),
        subCount: cats.filter((c) => c.parent === cat.id).length,
      }
    })
  }, [categories.data, items.data, cats, itemList])

  const groups = useMemo(() => cats.filter((c) => !c.parent).map((c) => c.name), [cats])
  const dataset = useMemo(() => itemCategoriesDataset(groups), [groups])

  const toCategory = (r: CategoryRow): ItemCategory => ({
    id: r.id,
    code: r.code,
    name: r.name,
    parent: r.parent,
    color: r.color,
    desc: r.desc,
    active: r.active,
  })

  const del: ListDelete<CategoryRow> = {
    blockedReason: (c) => categoryDeleteBlockReason(categoryDirectItemCount(c, itemList)),
    describe: (c) => `${c.code} · ${c.name}`,
    note: 'Its sub-categories move up one level. No item uses it.',
    run: async (c) => {
      lifted.current[c.id] = await remove.mutateAsync(c.id)
    },
    undo: (c) => void restore.mutateAsync({ cat: toCategory(c), lifted: lifted.current[c.id] ?? [] }),
  }

  const editor: ListEditor<CategoryRow> = {
    fields: (d, mode) => {
      const choices = categoryParentChoices(cats, mode === 'edit' ? d.id : null)
      return [
        {
          key: 'code',
          label: 'Code',
          type: 'text',
          mono: true,
          maxLength: 8,
          placeholder: 'e.g. SBH',
          hint: ITEM_CATEGORIES_HELP.code.body,
        },
        {
          key: 'name',
          label: 'Category name',
          type: 'text',
          placeholder: 'e.g. Sambrani Holder',
          hint: ITEM_CATEGORIES_HELP.name.body,
        },
        {
          key: 'parent',
          label: 'Parent category',
          type: 'select',
          options: [{ value: '', label: TOP_LEVEL }, ...choices.map((c) => ({ value: c.id, label: c.label }))],
          display: (c) => (c.parent ? (categoryById(cats, c.parent)?.name ?? EM_DASH) : TOP_LEVEL),
          hint: ITEM_CATEGORIES_HELP.fParent.body,
        },
        {
          key: 'color',
          label: 'Accent colour',
          type: 'select',
          options: COLOR_OPTIONS,
          hint: ITEM_CATEGORIES_HELP.fColor.body,
        },
        {
          key: 'desc',
          label: 'Description',
          type: 'area',
          placeholder: 'What belongs in this category?',
          hint: ITEM_CATEGORIES_HELP.desc.body,
        },
        {
          key: 'active',
          label: 'Active',
          type: 'toggle',
          onText: 'Active',
          offText: 'Inactive',
          hint: ITEM_CATEGORIES_HELP.fActive.body,
        },
      ]
    },
    view: (c) => {
      const direct = categoryDirectItemCount(c, itemList)
      return {
        no: c.code || EM_DASH,
        status: c.active ? 'Active' : 'Inactive',
        title: c.name || 'Untitled category',
        subtitle: c.path || undefined,
        notice:
          direct > 0
            ? `${direct} ${direct === 1 ? 'item uses' : 'items use'} this category — it can’t be deleted until ${direct === 1 ? 'it moves' : 'they move'}.`
            : undefined,
        facts: [
          { k: 'Items (with sub-categories)', v: int(c.itemCount) },
          { k: 'Sub-categories', v: int(c.subCount) },
        ],
      }
    },
    blank: () => ({
      id: '',
      code: '',
      name: '',
      parent: '',
      color: CATEGORY_COLORS[0].hex,
      desc: '',
      active: true,
      depth: 0,
      parentName: '',
      group: '',
      path: '',
      itemCount: 0,
      subCount: 0,
    }),
    onChange: (draft, key) => (key === 'code' ? { ...draft, code: draft.code.toUpperCase() } : draft),
    normalize: (draft) => ({
      ...draft,
      id: draft.id || nextCategoryId(cats, draft.name),
      code: normalizeCategoryCode(draft.code),
      name: draft.name.trim(),
      desc: draft.desc.trim(),
    }),
    validate: (draft) =>
      validateCategory(draft, cats, categoryById(cats, draft.id) ? draft.id : null),
    save: async (record) => {
      await save.mutateAsync(toCategory(record))
    },
    label: (c) => `${c.code} · ${c.name}`,
    extraEdit: (draft) => <CategoryChip color={draft.color} code={normalizeCategoryCode(draft.code)} name={draft.name.trim()} />,
    extra: (c) => <CategoryChip color={c.color} code={c.code} name={c.name} />,
  }

  return (
    <SettingsPage
      title="Item categories"
      help={ITEM_CATEGORIES_HELP.page}
      count={rows?.length}
      flush
      readOnly={readOnly}
    >
      <ListPage<CategoryRow>
        embedded
        readOnly={readOnly}
        dataset={dataset}
        rows={rows}
        isLoading={categories.isLoading || items.isLoading}
        error={categories.error ?? items.error}
        onRefresh={() => Promise.all([categories.refetch(), items.refetch()])}
        remove={del}
        editor={editor}
        emptyText="No categories match."
      />
    </SettingsPage>
  )
}
