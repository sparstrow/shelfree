import { useMemo } from 'react'
import { type ListDelete, type ListEditor, ListPage } from '@/components/list-page/ListPage'
import type { SettingsModuleId } from '@/components/settings/registry'
import { SettingsPage } from '@/components/settings/SettingsPage'
import { useList, useRemove, useUpsert } from '@/data/queries'
import { TAX_CODE_APPLIES, type TaxCode } from '@/data/schemas'
import {
  blankTaxCode,
  newRateRow,
  rateSummary,
  taxCodeDeleteBlock,
  taxCodeUsage,
  toTaxCode,
  validateTaxCode,
} from '@/domain/tax-codes'
import { EM_DASH, fmtDate, todayLocal } from '@/lib/format'
import { type TaxCodeRow, ratesOf, taxCodesDataset, toTaxCodeRow } from './dataset'
import { TAX_CODES_HELP as HELP } from './help'
import { RateHistory } from './RateHistory'

const APPLIES = TAX_CODE_APPLIES.map((a) => ({ value: a, label: a }))

/** The stored code behind a row (no edit-only fields). */
function toRecord(r: TaxCodeRow, stamps: Pick<TaxCode, 'createdAt' | 'updatedAt'>): TaxCode {
  return toTaxCode(r, stamps)
}

/**
 * Settings ▸ Finance ▸ Tax codes (`/finance/settings/tax-codes`) and Shared lists ▸ Tax codes
 * (`/settings/shared/tax-codes`).
 *
 * One module decision (G-011): a tax code is a Finance record — rates are national and used by
 * charges, items and documents in every module — so it carries no `module` and the shared list and
 * the Finance slice are the same rows (no Module column).
 */
export function TaxCodesSection({
  readOnly = false,
}: {
  module?: SettingsModuleId
  readOnly?: boolean
} = {}) {
  const codes = useList('taxCodes')
  const charges = useList('charges')
  const upsert = useUpsert('taxCodes')
  const removeCode = useRemove('taxCodes')
  const today = todayLocal()

  const rows = useMemo<TaxCodeRow[] | undefined>(() => {
    if (!codes.data) return undefined
    return codes.data
      .map((t) => toTaxCodeRow(t, taxCodeUsage(t.code, charges.data ?? []), today))
      .sort((a, b) => Number(!a.active) - Number(!b.active))
  }, [codes.data, charges.data, today])
  const dataset = useMemo(() => taxCodesDataset(), [])
  const activeCount = rows?.filter((r) => r.active).length

  const remove: ListDelete<TaxCodeRow> = {
    blockedReason: (t) => taxCodeDeleteBlock(t, t.usage),
    describe: (t) => `${t.code} · ${t.name}`,
    note: 'No charge uses it.',
    run: (t) => removeCode.mutateAsync(t.code),
    undo: (t) => void upsert.mutateAsync(toRecord(t, t)),
  }

  const editor: ListEditor<TaxCodeRow> = {
    fields: (_d, mode) => [
      {
        key: 'code',
        label: 'Code',
        type: 'text',
        mono: true,
        maxLength: 12,
        locked: mode === 'edit',
        placeholder: 'e.g. GST9',
        hint: HELP.code.body,
      },
      { key: 'name', label: 'Name', type: 'text', placeholder: 'e.g. GST 9%', hint: HELP.name.body },
      { key: 'appliesTo', label: 'Applies to', type: 'select', options: APPLIES, hint: HELP.appliesTo.body },
      { key: 'desc', label: 'Description', type: 'area', maxLength: 240, hint: HELP.desc.body },
      {
        key: 'active',
        label: 'Status',
        type: 'toggle',
        onText: 'Active',
        offText: 'Inactive',
        hint: HELP.active.body,
      },
    ],
    view: (t) => ({
      no: t.code || EM_DASH,
      status: t.active ? 'Active' : 'Inactive',
      tags: t.system ? ['Built-in'] : undefined,
      title: t.name || 'Untitled tax code',
      subtitle: rateSummary({ kind: t.kind, rates: ratesOf(t) }, t.today, fmtDate),
      notice: t.usage.charges
        ? `Used by ${t.usage.charges} ${t.usage.charges === 1 ? 'charge' : 'charges'} — it can’t be deleted${t.usage.activeCharges ? ' or made inactive' : ''} while they use it.`
        : undefined,
      facts: [{ k: 'Charges', v: String(t.usage.charges) }],
    }),
    blank: () => ({ ...blankTaxCode(today), createdAt: '', updatedAt: '', usage: { charges: 0, activeCharges: 0 }, today }),
    normalize: (d) => ({ ...d, code: d.code.trim().toUpperCase(), name: d.name.trim().replace(/\s+/g, ' '), desc: d.desc.trim() }),
    validate: (draft, others) => {
      // A new draft has no createdAt yet (see `blank`); a saved code always does.
      const mode = draft.createdAt ? 'edit' : 'new'
      const original = mode === 'edit' ? (codes.data?.find((t) => t.code === draft.code) ?? null) : null
      return validateTaxCode(draft, others, {
        mode,
        today,
        original,
        usage: draft.usage,
        fmt: fmtDate,
      })
    },
    save: async (record, mode) => {
      const now = new Date().toISOString()
      const original = codes.data?.find((t) => t.code === record.code)
      await upsert.mutateAsync(toRecord(record, { createdAt: mode === 'edit' && original ? original.createdAt : now, updatedAt: now }))
    },
    label: (t) => `${t.code} · ${t.name}`,
    extra: (t) =>
      t.kind === 'goods' ? (
        <p className="m-0 mt-3 text-[12.5px] text-muted-foreground">
          The goods rate has no rate of its own — the line takes the GST rate of the goods on the same document.
        </p>
      ) : (
        <RateHistory rows={t.rates} today={t.today} existing />
      ),
    extraEdit: (draft, mode, onChange, errors) =>
      draft.kind === 'goods' ? (
        <p className="m-0 mt-3 text-[12.5px] text-muted-foreground">
          The goods rate has no rate of its own — the line takes the GST rate of the goods on the same document.
        </p>
      ) : (
        <RateHistory
          rows={draft.rates}
          today={today}
          existing={mode === 'edit'}
          errors={errors}
          onChange={(next) => onChange('rates', next)}
          onAdd={() => onChange('rates', [...draft.rates, newRateRow(draft.rates, today)])}
        />
      ),
  }

  return (
    <SettingsPage title="Tax codes" help={HELP.page} count={activeCount} flush readOnly={readOnly}>
      <ListPage<TaxCodeRow>
        embedded
        readOnly={readOnly}
        dataset={dataset}
        rows={rows}
        isLoading={codes.isLoading || charges.isLoading}
        error={codes.error ?? charges.error}
        onRefresh={() => Promise.all([codes.refetch(), charges.refetch()])}
        remove={remove}
        editor={editor}
        emptyText="No tax codes match."
      />
    </SettingsPage>
  )
}
