import type { HelpMap } from '@/components/help/types'
import type { SettingsGroup } from './rows'
import { SettingsPage } from './SettingsPage'
import { SettingsRows } from './SettingsRows'
import { useSettingsForm } from './use-settings-form'

type Json = Record<string, unknown>

export interface SettingsSectionProps<V extends Json> {
  /** Section id — also the prefix of the input ids. */
  id: string
  title: string
  /** The page's help map (pure data). The page title uses key `page`; rows use their key; groups their id. */
  help: HelpMap
  /** Saved value; undefined while loading. */
  saved: V | undefined
  isLoading?: boolean
  error?: unknown
  onRetry?: () => void
  /** Persist the whole document (a `useUpdate…` mutation). */
  onSave: (next: V) => Promise<unknown>
  groups: readonly SettingsGroup<V>[]
  /** Cross-field validation, run before the per-row validators' result is returned. */
  validate?: (values: V) => Record<string, string>
}

/**
 * A section made of label | control rows. Describe the groups and rows; the
 * template draws them and owns dirty tracking, validation, Save / Discard.
 */
export function SettingsSection<V extends Json>({
  id,
  title,
  help,
  saved,
  isLoading,
  error,
  onRetry,
  onSave,
  groups,
  validate,
}: SettingsSectionProps<V>) {
  const form = useSettingsForm<V>({
    saved,
    onSave,
    validate: (values) => {
      const errors: Record<string, string> = { ...validate?.(values) }
      for (const g of groups) {
        for (const r of g.rows) {
          if (r.hidden?.(values) || errors[r.key]) continue
          const message = r.validate?.(values[r.key], values)
          if (message) errors[r.key] = message
        }
      }
      return errors
    },
  })
  return (
    <SettingsPage title={title} help={help.page} isLoading={isLoading} error={error} onRetry={onRetry} form={form}>
      <SettingsRows idPrefix={id} groups={groups} help={help} form={form} />
    </SettingsPage>
  )
}
