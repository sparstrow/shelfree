import { useMemo } from 'react'
import { type ListDelete, type ListEditor, ListPage } from '@/components/list-page/ListPage'
import { SettingsPage } from '@/components/settings/SettingsPage'
import { useList, useRemove, useUpsert } from '@/data/queries'
import {
  UOM_CATEGORIES,
  UQC_CODES,
  type UomCategoryId,
  allUnits,
  baseUnitFor,
  blankDraft,
  codeLocked,
  conversionText,
  countByUnit,
  deleteBlockReason,
  factorFromConv,
  normalizeCode,
  suggestUqc,
  unitFromDraft,
  uqcLabel,
  validateDraft,
} from '@/domain/units-of-measure'
import { EM_DASH } from '@/lib/format'
import { type UomRow, uomDataset } from './dataset'
import { UOM_HELP } from './help'

const CATEGORY_OPTIONS = UOM_CATEGORIES.map((c) => ({ value: c.id, label: c.name }))
const UQC_OPTIONS = UQC_CODES.map((code) => ({ value: code, label: uqcLabel(code) }))

/** Warehouse ▸ Settings ▸ Units of measure (`/warehouse/settings/uom`). */
export function UnitsOfMeasureSection({ readOnly = false }: { readOnly?: boolean } = {}) {
  const custom = useList('unitsOfMeasure')
  const items = useList('items')
  const unitSets = useList('itemUnits')
  const upsert = useUpsert('unitsOfMeasure')
  const removeUnit = useRemove('unitsOfMeasure')

  const all = useMemo(() => allUnits(custom.data ?? []), [custom.data])
  const used = useMemo(() => countByUnit(items.data ?? [], unitSets.data ?? []), [items.data, unitSets.data])
  const rows = useMemo<UomRow[] | undefined>(() => {
    if (custom.data === undefined) return undefined
    return all.map((u) => ({
      ...u,
      factor: factorFromConv(u.conv),
    }))
  }, [custom.data, all])

  const dataset = useMemo(() => uomDataset(), [])

  const remove: ListDelete<UomRow> = {
    blockedReason: (u) => deleteBlockReason(u, used.get(u.code) ?? 0),
    describe: (u) => `${u.code} · ${u.name}`,
    note: 'No item uses it.',
    run: (u) => removeUnit.mutateAsync(u.code),
    undo: (u) =>
      void upsert.mutateAsync({
        code: u.code,
        name: u.name,
        cat: u.cat,
        uqc: u.uqc,
        conv: u.conv,
        sym: u.sym,
        custom: true,
      }),
  }

  const editor: ListEditor<UomRow> = {
    editBlockedReason: (u) => (u.custom ? null : 'Default units are locked so GST reporting stays correct.'),
    fields: (d, mode) => {
      const lockedDefault = !d.custom
      const itemsUsing = used.get(d.code) ?? 0
      const codeFixed = lockedDefault || (mode === 'edit' && codeLocked(itemsUsing))
      return [
        {
          key: 'code',
          label: 'Code',
          type: 'text',
          mono: true,
          maxLength: 8,
          locked: codeFixed,
          placeholder: 'e.g. PNL',
          hint:
            mode === 'edit' && codeLocked(itemsUsing)
              ? `${itemsUsing} ${itemsUsing === 1 ? 'item uses' : 'items use'} this unit, so its code is fixed.`
              : UOM_HELP.code.body,
        },
        {
          key: 'name',
          label: 'Name',
          type: 'text',
          locked: lockedDefault,
          placeholder: 'e.g. Panel',
          hint: UOM_HELP.name.body,
        },
        {
          key: 'cat',
          label: 'Category',
          type: 'select',
          options: CATEGORY_OPTIONS,
          locked: lockedDefault,
          hint: UOM_HELP.fCat.body,
        },
        {
          key: 'uqc',
          label: 'GST UQC code',
          type: 'select',
          options: UQC_OPTIONS,
          locked: lockedDefault,
          display: (u) => uqcLabel(u.uqc),
          hint: UOM_HELP.fUqc.body,
        },
        {
          key: 'factor',
          label: 'Conversion factor',
          type: 'text',
          locked: lockedDefault,
          placeholder: 'Standalone',
          display: (u) => (u.factor ? `${u.factor} ${baseUnitFor(u.cat)}` : u.conv || 'Standalone'),
          hint: UOM_HELP.factor.body,
        },
        {
          key: 'sym',
          label: 'Symbol',
          type: 'text',
          maxLength: 6,
          locked: lockedDefault,
          placeholder: 'e.g. kg',
          display: (u) => (u.sym && u.sym !== EM_DASH ? u.sym : EM_DASH),
          hint: UOM_HELP.sym.body,
        },
      ]
    },
    view: (u) => {
      const itemsUsing = used.get(u.code) ?? 0
      return {
        no: u.code || EM_DASH,
        status: u.custom ? 'Custom' : 'Default',
        title: u.name || 'Untitled unit',
        subtitle: u.conv,
        notice: !u.custom
          ? 'Default units are locked so GST reporting stays correct.'
          : itemsUsing > 0
            ? `Used by ${itemsUsing} ${itemsUsing === 1 ? 'item' : 'items'} — code is fixed and the unit cannot be deleted.`
            : undefined,
        facts: [
          { k: 'Stored conversion', v: u.conv || EM_DASH },
          { k: 'Items using', v: String(itemsUsing) },
        ],
      }
    },
    blank: () => {
      const b = blankDraft()
      return {
        ...b,
        conv: EM_DASH,
        custom: true,
      }
    },
    onChange: (draft, key) => {
      if (key === 'code') return { ...draft, code: draft.code.toUpperCase() }
      if (key === 'cat') return { ...draft, uqc: suggestUqc(draft.cat as UomCategoryId) }
      return draft
    },
    normalize: (draft) => {
      const built = unitFromDraft(draft)
      return {
        ...built,
        factor: draft.factor.trim(),
      }
    },
    validate: (draft, others) => validateDraft(draft, others, null),
    save: async (record, mode, origId) => {
      if (mode === 'edit' && origId && origId !== record.code) {
        await removeUnit.mutateAsync(origId)
      }
      await upsert.mutateAsync({
        code: record.code,
        name: record.name,
        cat: record.cat,
        uqc: record.uqc,
        conv: record.conv,
        sym: record.sym,
        custom: true,
      })
    },
    label: (u) => `${u.code} · ${u.name}`,
    extraEdit: (draft) => {
      const factor = draft.factor.trim() === '' ? null : Number(draft.factor)
      const code = normalizeCode(draft.code)
      const previewable = factor !== null && Number.isFinite(factor) && factor > 0 && code !== ''
      return (
        <p aria-live="polite" className="m-0 mt-3 text-[12px] text-muted-foreground">
          {previewable ? (
            <>
              Stored conversion:{' '}
              <span className="font-mono text-foreground">{conversionText(code, factor, draft.cat)}</span>
            </>
          ) : (
            `Standalone unit — base for ${UOM_CATEGORIES.find((c) => c.id === draft.cat)?.name ?? draft.cat} is ${baseUnitFor(draft.cat)}.`
          )}
        </p>
      )
    },
  }

  return (
    <SettingsPage
      title="Units of measure"
      help={UOM_HELP.page}
      count={rows?.length}
      flush
      readOnly={readOnly}
    >
      <ListPage<UomRow>
        embedded
        readOnly={readOnly}
        dataset={dataset}
        rows={rows}
        isLoading={custom.isLoading || items.isLoading}
        error={custom.error ?? items.error}
        onRefresh={() => Promise.all([custom.refetch(), items.refetch(), unitSets.refetch()])}
        remove={remove}
        editor={editor}
        emptyText="No units match."
      />
    </SettingsPage>
  )
}
