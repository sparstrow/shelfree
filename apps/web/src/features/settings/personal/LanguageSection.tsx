import { useMemo } from 'react'
import { SettingsSection } from '@/components/settings/SettingsSection'
import type { SettingsGroup } from '@/components/settings/rows'
import type { Me } from '@/data/api/session'
import { useSettings } from '@/data/queries/settings'
import {
  LANGUAGE_OPTIONS,
  LOCALE_OPTIONS,
  USE_WORKSPACE,
  resolveRegional,
} from '@/domain/personal-preferences'
import { DATE_FORMAT_OPTIONS, NUMBER_FORMAT_OPTIONS, REGIONAL_DEFAULTS } from '@/domain/regional'
import { LANGUAGE_HELP } from './help'
import { useMeBlock } from './use-me-block'

const KEYS = ['language', 'locale', 'dateFmt', 'numFmt'] as const
type Block = Pick<Me, (typeof KEYS)[number]>

const options = (list: readonly string[]) => list.map((value) => ({ value, label: value }))

/**
 * Settings ▸ Personal ▸ Language & region (`/settings/me-language`). Language and locale are the prototype's two
 * rows. Date and number format are an addition: a personal choice, or the workspace's (`resolveRegional`).
 */
export function LanguageSection() {
  const block = useMeBlock(KEYS)
  const settings = useSettings()
  const workspace = settings.data?.regional ?? REGIONAL_DEFAULTS

  const groups = useMemo<readonly SettingsGroup<Block>[]>(() => {
    // What "Workspace default" resolves to right now, named in the option itself.
    const effective = resolveRegional(workspace, undefined)
    const withWorkspace = (list: readonly string[], current: string) => [
      { value: USE_WORKSPACE, label: `Workspace default (${current})` },
      ...options(list),
    ]
    return [
      {
        id: 'language',
        title: 'Language',
        rows: [
          { key: 'language', label: 'Language', control: { type: 'select', options: options(LANGUAGE_OPTIONS) }, default: 'English (India)' },
          { key: 'locale', label: 'Locale', control: { type: 'select', options: options(LOCALE_OPTIONS) }, default: 'en-IN' },
        ],
      },
      {
        id: 'formats',
        title: 'Formats',
        rows: [
          {
            key: 'dateFmt',
            label: 'Date format',
            control: { type: 'select', options: withWorkspace(DATE_FORMAT_OPTIONS, effective.dateFmt) },
            default: USE_WORKSPACE,
            defaultText: `Workspace default (${effective.dateFmt})`,
          },
          {
            key: 'numFmt',
            label: 'Number format',
            control: { type: 'select', options: withWorkspace(NUMBER_FORMAT_OPTIONS, effective.numFmt) },
            default: USE_WORKSPACE,
            defaultText: `Workspace default (${effective.numFmt})`,
          },
        ],
      },
    ]
  }, [workspace])

  return (
    <SettingsSection<Block>
      id="me-language"
      title="Language & region"
      help={LANGUAGE_HELP}
      saved={block.saved}
      isLoading={block.isLoading || settings.isLoading}
      error={block.error ?? settings.error}
      onRetry={block.onRetry}
      onSave={(next) => block.onSave(next)}
      groups={groups}
    />
  )
}
