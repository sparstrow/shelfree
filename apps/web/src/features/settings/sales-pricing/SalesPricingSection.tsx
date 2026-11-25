import { SettingsSection } from '@/components/settings/SettingsSection'
import type { SettingsGroup } from '@/components/settings/rows'
import type { SalesPricingConfig } from '@/data/api/settings'
import { useUpdateSalesPricing } from '@/data/queries/sales-production-settings'
import { useSettings } from '@/data/queries/settings'
import {
  CUSTOMER_PRICING_MODES,
  applyPricingSettingsChange,
  pricingBlockUnusedNote,
  pricingModeLabel,
} from '@/domain/sales-prices'
import { fmtDate, todayLocal } from '@/lib/format'
import { EligibleCustomers } from './EligibleCustomers'
import { SALES_PRICING_HELP } from './help'
import { PricesOnFile } from './PricesOnFile'

const GROUPS: readonly SettingsGroup<SalesPricingConfig>[] = [
  {
    id: 'who',
    title: 'Customer pricing',
    footer: (draft) => (draft.mode === 'selected' ? <EligibleCustomers /> : null),
    rows: [
      {
        key: 'mode',
        label: 'Who can have their own price',
        control: { type: 'select', options: CUSTOMER_PRICING_MODES.map((value) => ({ value, label: pricingModeLabel(value) })) },
        default: 'off',
      },
      {
        key: 'newCutoff',
        label: 'New-customer cut-off',
        control: { type: 'readonly', format: (v) => (v ? fmtDate(String(v)) : 'Set when you save') },
        hidden: (d) => d.mode !== 'newOnly',
      },
    ],
  },
  {
    id: 'missing',
    title: 'When a customer has no agreed price',
    footer: () => <PricesOnFile />,
    rows: [
      {
        key: 'fallbackToList',
        label: 'Fall back to the list price',
        control: { type: 'switch' },
        default: false,
      },
      {
        key: 'blockUnpriced',
        label: 'Block the item instead',
        control: { type: 'switch' },
        default: false,
        // Not used while the fallback is on: shown as text with the reason.
        locked: (d) => d.fallbackToList,
        warn: (_v, d) => pricingBlockUnusedNote(d),
      },
    ],
  },
]

/** Settings ▸ Sales ▸ Sales pricing (`/sales/settings/cfg-pricing`). */
export function SalesPricingSection({ readOnly }: { readOnly?: boolean } = {}) {
  const settings = useSettings()
  const update = useUpdateSalesPricing()
  return (
    <SettingsSection<SalesPricingConfig>
      id="cfg-pricing"
      title="Sales pricing"
      help={SALES_PRICING_HELP}
      saved={settings.data?.salesPricing}
      isLoading={settings.isLoading}
      error={settings.error}
      onRetry={() => void settings.refetch()}
      onSave={(next) => update.mutateAsync(applyPricingSettingsChange(settings.data?.salesPricing ?? next, next, todayLocal()))}
      groups={GROUPS}
      readOnly={readOnly}
    />
  )
}
