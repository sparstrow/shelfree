import { applyTheme, useSystemDark } from '@/app/use-theme'
import { SettingsSection } from '@/components/settings/SettingsSection'
import type { SettingsGroup } from '@/components/settings/rows'
import type { Me } from '@/data/api/session'
import {
  DENSITY_LABELS,
  DENSITY_OPTIONS,
  THEME_LABELS,
  THEME_OPTIONS,
  resolveTheme,
} from '@/domain/personal-preferences'
import { APPEARANCE_HELP } from './help'
import { useMeBlock } from './use-me-block'

const KEYS = ['theme', 'defDensity'] as const
type Block = Pick<Me, (typeof KEYS)[number]>

const GROUPS: readonly SettingsGroup<Block>[] = [
  {
    id: 'look',
    title: 'Look',
    rows: [
      {
        key: 'theme',
        label: 'Theme',
        control: { type: 'select', options: THEME_OPTIONS.map((value) => ({ value, label: THEME_LABELS[value] })) },
        default: 'dark',
      },
      {
        key: 'defDensity',
        label: 'Default grid density',
        control: { type: 'select', options: DENSITY_OPTIONS.map((value) => ({ value, label: DENSITY_LABELS[value] })) },
        default: 'compact',
      },
    ],
  },
]

/**
 * Settings ▸ Personal ▸ Appearance (`/settings/me-appearance`). The theme is previewed live as it is picked and
 * kept per user on Save; it replaces the temporary theme switch (the account menu now saves this same setting).
 */
export function AppearanceSection() {
  const block = useMeBlock(KEYS)
  const systemDark = useSystemDark()
  return (
    <SettingsSection<Block>
      id="me-appearance"
      title="Appearance"
      help={APPEARANCE_HELP}
      saved={block.saved}
      isLoading={block.isLoading}
      error={block.error}
      onRetry={block.onRetry}
      onSave={(next) => block.onSave(next)}
      groups={GROUPS}
      preview={(values) => applyTheme(resolveTheme(values.theme, systemDark))}
    />
  )
}
