import { SettingsSection } from '@/components/settings/SettingsSection'
import type { SettingsGroup } from '@/components/settings/rows'
import { useSettings } from '@/data/queries/settings'
import { useUpdateRegionalSettings } from '@/data/queries/regional-terminology'
import {
  CURRENCY_OPTIONS,
  DATE_FORMAT_OPTIONS,
  FISCAL_START_OPTIONS,
  NUMBER_FORMAT_OPTIONS,
  REGIONAL_DEFAULTS as D,
  type RegionalSettings,
  TIMEZONE_OPTIONS,
  WEEK_START_OPTIONS,
  normalizeRegional,
} from '@/domain/regional'
import { REGIONAL_HELP } from './help'

const options = (list: readonly string[]) => list.map((value) => ({ value, label: value }))

const GROUPS: readonly SettingsGroup<RegionalSettings>[] = [
  {
    id: 'money',
    title: 'Currency & numbers',
    rows: [
      { key: 'currency', label: 'Base currency', control: { type: 'select', options: options(CURRENCY_OPTIONS) }, default: D.currency },
      { key: 'numFmt', label: 'Number format', control: { type: 'select', options: options(NUMBER_FORMAT_OPTIONS) }, default: D.numFmt },
    ],
  },
  {
    id: 'dates',
    title: 'Dates & time',
    rows: [
      { key: 'timezone', label: 'Time zone', control: { type: 'select', options: options(TIMEZONE_OPTIONS) }, default: D.timezone },
      { key: 'dateFmt', label: 'Date format', control: { type: 'select', options: options(DATE_FORMAT_OPTIONS) }, default: D.dateFmt },
      { key: 'weekStart', label: 'Week starts on', control: { type: 'select', options: options(WEEK_START_OPTIONS) }, default: D.weekStart },
    ],
  },
  {
    id: 'fiscal',
    title: 'Financial year',
    rows: [
      { key: 'fiscalStart', label: 'Fiscal year starts', control: { type: 'select', options: options(FISCAL_START_OPTIONS) }, default: D.fiscalStart },
    ],
  },
]

/**
 * Settings ▸ Workspace ▸ Regional & format (`/settings/ws-regional`) — a form section.
 *
 * Parity note: the prototype's Multi-currency row (a locked upgrade prompt) is not shown — tiers are
 * parked, and the capability belongs to Modules & capabilities. The display helpers in `lib/format.ts`
 * don't read these values yet (gap G-029).
 */
export function RegionalSection({ readOnly = false }: { readOnly?: boolean } = {}) {
  const settings = useSettings()
  const update = useUpdateRegionalSettings()
  return (
    <SettingsSection<RegionalSettings>
      id="ws-regional"
      title="Regional & format"
      help={REGIONAL_HELP}
      saved={settings.data?.regional}
      isLoading={settings.isLoading}
      error={settings.error}
      onRetry={() => void settings.refetch()}
      onSave={(next) => update.mutateAsync(normalizeRegional(next))}
      groups={GROUPS}
      readOnly={readOnly}
    />
  )
}
