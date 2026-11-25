import { useMemo } from 'react'
import { type ListDelete, type ListEditor, ListPage } from '@/components/list-page/ListPage'
import type { SettingsModuleId } from '@/components/settings/registry'
import { SettingsPage } from '@/components/settings/SettingsPage'
import { useList, useRemove, useUpsert } from '@/data/queries'
import {
  normalizeTerm,
  termCodeLocked,
  termDeleteBlock,
  termSummary,
  termUsage,
  termsForModule,
  usageText,
  validateTerm,
} from '@/domain/payment-terms'
import { EM_DASH } from '@/lib/format'
import { type PaymentTermRow, paymentTermsDataset, toPaymentTerm, withSwitches } from './dataset'
import { PAYMENT_TERMS_HELP as HELP } from './help'

/**
 * Settings ▸ Payment terms — shared list (`/settings/shared/terms`) and module
 * slices (`/<module>/settings/terms`). A term can serve several modules
 * (`modules[]`), so a slice filters by inclusion.
 */
export function PaymentTermsSection({
  module,
  readOnly = false,
}: {
  module?: SettingsModuleId
  readOnly?: boolean
} = {}) {
  const terms = useList('paymentTerms')
  const vendors = useList('vendors')
  const customers = useList('customers')
  const upsert = useUpsert('paymentTerms')
  const removeTerm = useRemove('paymentTerms')

  const all = useMemo(() => terms.data ?? [], [terms.data])
  const usageOf = useMemo(
    () => new Map(all.map((t) => [t.code, termUsage(t, vendors.data ?? [], customers.data ?? [])])),
    [all, vendors.data, customers.data],
  )
  const rows = useMemo<PaymentTermRow[] | undefined>(() => {
    if (terms.data === undefined) return undefined
    return termsForModule(all, module).map((t) => withSwitches(t, usageOf.get(t.code) ?? { vendors: 0, customers: 0 }))
  }, [terms.data, all, module, usageOf])
  const dataset = useMemo(() => paymentTermsDataset(module), [module])
  // A module that can't offer terms (Production, Finance, People) has nothing to edit.
  const offersTerms = !module || module === 'purchasing' || module === 'sales'

  const remove: ListDelete<PaymentTermRow> = {
    blockedReason: (t) => termDeleteBlock(t.usage),
    describe: (t) => `${t.code} · ${t.name}`,
    note: 'No vendor or customer uses it.',
    run: (t) => removeTerm.mutateAsync(t.code),
    undo: (t) => void upsert.mutateAsync(toPaymentTerm(t)),
  }

  const editor: ListEditor<PaymentTermRow> = {
    fields: (d, mode) => [
      {
        key: 'code',
        label: 'Code',
        type: 'text',
        mono: true,
        maxLength: 12,
        locked: mode === 'edit' && termCodeLocked(d.usage),
        placeholder: 'e.g. NET45',
        hint:
          mode === 'edit' && termCodeLocked(d.usage)
            ? `Used by ${usageText(d.usage)}, so its code is fixed.`
            : HELP.code.body,
      },
      { key: 'name', label: 'Name', type: 'text', placeholder: 'e.g. Net 45 days', hint: HELP.name.body },
      {
        key: 'days',
        label: 'Net days',
        type: 'number',
        step: '1',
        placeholder: 'No fixed days',
        display: (t) => termSummary(toPaymentTerm(t)),
        hint: HELP.days.body,
      },
      {
        key: 'forPurchasing',
        label: 'Purchasing',
        type: 'toggle',
        onText: 'Offered to vendors',
        offText: 'Not offered',
        hint: HELP.forPurchasing.body,
      },
      {
        key: 'forSales',
        label: 'Sales',
        type: 'toggle',
        onText: 'Offered to customers',
        offText: 'Not offered',
        hint: HELP.forSales.body,
      },
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
      title: t.name || 'Untitled term',
      subtitle: termSummary(toPaymentTerm(t)),
      notice: termCodeLocked(t.usage)
        ? `Used by ${usageText(t.usage)} — the code is fixed and the term can’t be deleted.`
        : undefined,
      facts: [{ k: 'Used by', v: usageText(t.usage) || 'Nobody yet' }],
    }),
    blank: () => ({
      code: '',
      name: '',
      days: 30,
      modules: module ? [module] : ['purchasing', 'sales'],
      forPurchasing: module ? module === 'purchasing' : true,
      forSales: module ? module === 'sales' : true,
      active: true,
      usage: { vendors: 0, customers: 0 },
    }),
    normalize: (draft) => ({ ...draft, ...normalizeTerm(toPaymentTerm(draft)), days: draft.days }),
    validate: (draft, others) => {
      const original = all.find((t) => t.code === draft.code)
      const { modules: moduleError, ...errors } = validateTerm(toPaymentTerm(draft), others.map(toPaymentTerm), draft.usage, original)
      // `modules` is edited as two switches; show the error beside the one it is about.
      if (moduleError) errors[moduleError.includes('Sales') && draft.forPurchasing ? 'forSales' : 'forPurchasing'] = moduleError
      return errors
    },
    save: async (record, mode, origId) => {
      if (mode === 'edit' && origId && origId !== record.code) await removeTerm.mutateAsync(origId)
      await upsert.mutateAsync(toPaymentTerm(record))
    },
    label: (t) => `${t.code} · ${t.name}`,
  }

  return (
    <SettingsPage title="Payment terms" help={HELP.page} count={rows?.length} flush readOnly={readOnly}>
      <ListPage<PaymentTermRow>
        embedded
        readOnly={readOnly || !offersTerms}
        dataset={dataset}
        rows={rows}
        isLoading={terms.isLoading || vendors.isLoading || customers.isLoading}
        error={terms.error ?? vendors.error ?? customers.error}
        onRefresh={() => Promise.all([terms.refetch(), vendors.refetch(), customers.refetch()])}
        remove={remove}
        editor={editor}
        emptyText="No payment terms match."
      />
    </SettingsPage>
  )
}
