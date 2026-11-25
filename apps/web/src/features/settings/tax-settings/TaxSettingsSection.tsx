import { useMemo } from 'react'
import { SettingsSection } from '@/components/settings/SettingsSection'
import type { SettingsGroup } from '@/components/settings/rows'
import { useList } from '@/data/queries'
import { useSettings, useUpdateTaxSettings } from '@/data/queries/settings'
import {
  BRANCH_VALUE_OPTIONS,
  COMP_INTER_STATE_OPTIONS,
  ITC_BOOKING_OPTIONS,
  PAPER_TRANSFER_OPTIONS,
  TAX_CALC_OPTIONS,
  TAX_SETTINGS_DEFAULTS as D,
  type TaxOption,
  type TaxSettings,
  branchPctError,
  normalizeTaxSettings,
  roundOffError,
  roundOffOptions,
} from '@/domain/tax-settings'
import { TAX_SETTINGS_HELP } from './help'

const choices = (list: readonly TaxOption[]) => list.map((o) => ({ value: o.value, label: o.label }))

/**
 * Settings ▸ Finance ▸ Tax settings (`/finance/settings/cfg-taxset`) — a form section.
 *
 * Parity note: the prototype also had a live mixed-rate preview, a review dialog with per-change
 * impact and a change history; the template's Save / Discard bar replaces the review step and the
 * other two are not ported (gap G-022).
 */
export function TaxSettingsSection({ readOnly = false }: { readOnly?: boolean } = {}) {
  const settings = useSettings()
  const update = useUpdateTaxSettings()
  const accounts = useList('accounts')
  const saved = settings.data?.tax
  const accountList = useMemo(() => accounts.data ?? [], [accounts.data])
  const savedAccount = saved?.roundOffAcct ?? D.roundOffAcct

  const groups = useMemo<readonly SettingsGroup<TaxSettings>[]>(
    () => [
      {
        id: 'calc',
        title: 'Tax calculation',
        rows: [
          { key: 'taxCalc', label: 'Calculate tax', control: { type: 'select', options: choices(TAX_CALC_OPTIONS) }, default: D.taxCalc },
        ],
      },
      {
        id: 'rounding',
        title: 'Rounding',
        rows: [
          {
            key: 'roundTotal',
            label: 'Round totals to the rupee',
            control: { type: 'switch', onText: 'On', offText: 'Off' },
            default: D.roundTotal,
          },
          {
            key: 'roundOffAcct',
            label: 'Round-off account',
            control: { type: 'select', options: roundOffOptions(accountList, savedAccount) },
            default: D.roundOffAcct,
            defaultText: '6190 · Round off',
            // Used only while rounding is on — shown as text, not hidden, so the row never moves.
            locked: (d) => !d.roundTotal,
            validate: (v, d) => roundOffError(String(v), accountList, d.roundTotal),
          },
        ],
      },
      {
        id: 'checks',
        title: 'Document checks',
        rows: [
          {
            key: 'compInterState',
            label: 'Composition vendor in another state',
            control: { type: 'select', options: choices(COMP_INTER_STATE_OPTIONS) },
            default: D.compInterState,
          },
          {
            key: 'lineOverride',
            label: 'Tax override on a line',
            control: { type: 'switch', onText: 'Allowed', offText: 'Not allowed' },
            default: D.lineOverride,
          },
          {
            key: 'mismatchWarn',
            label: 'GSTIN state mismatch warning',
            control: { type: 'switch', onText: 'On', offText: 'Off' },
            default: D.mismatchWarn,
          },
          {
            key: 'paperTransfer',
            label: 'Bill-to and ship-to in different states',
            control: { type: 'select', options: choices(PAPER_TRANSFER_OPTIONS) },
            default: D.paperTransfer,
          },
        ],
      },
      {
        id: 'itc',
        title: 'Input tax credit',
        rows: [
          {
            key: 'itcBooking',
            label: 'Book input tax credit',
            control: { type: 'select', options: choices(ITC_BOOKING_OPTIONS) },
            default: D.itcBooking,
          },
        ],
      },
      {
        id: 'branch',
        title: 'Branch transfers',
        rows: [
          {
            key: 'branchValue',
            label: 'Transfer value',
            control: { type: 'select', options: choices(BRANCH_VALUE_OPTIONS) },
            default: D.branchValue,
          },
          {
            key: 'branchPct',
            label: 'Share of selling price (%)',
            control: { type: 'number', step: '0.01', min: 1 },
            default: D.branchPct,
            hidden: (d) => d.branchValue !== 'pctSell',
            validate: (v, d) => branchPctError(Number(v), d.branchValue),
          },
        ],
      },
    ],
    [accountList, savedAccount],
  )

  return (
    <SettingsSection<TaxSettings>
      id="cfg-taxset"
      title="Tax settings"
      help={TAX_SETTINGS_HELP}
      saved={saved}
      isLoading={settings.isLoading || accounts.isLoading}
      error={settings.error ?? accounts.error}
      onRetry={() => void Promise.all([settings.refetch(), accounts.refetch()])}
      onSave={(next) => {
        return update.mutateAsync(normalizeTaxSettings(next))
      }}
      groups={groups}
      readOnly={readOnly}
    />
  )
}
