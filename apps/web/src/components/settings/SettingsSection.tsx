import { useEffect } from 'react'
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
  /** View-only mode: values render as text in the same row box, no Save bar, Ctrl+S inert. */
  readOnly?: boolean
  /**
   * Show a draft live before it is saved (e.g. Appearance switches the theme as you pick it). Called with the
   * draft whenever it changes, and with the saved value when the draft is discarded, saved over or the section
   * closes, so an unsaved preview never outlives the section. Optional; no section needs it by default.
   */
  preview?: (values: V) => void
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
  readOnly = false,
  preview,
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
  const draft = form.values
  useEffect(() => {
    if (!preview || !draft || readOnly) return
    preview(draft)
    return () => {
      if (saved) preview(saved)
    }
    // `preview` is expected to be stable or cheap; re-running on it would re-apply the same draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, saved, readOnly])
  return (
    <SettingsPage
      title={title}
      help={help.page}
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
      form={readOnly ? undefined : form}
      readOnly={readOnly}
    >
      <SettingsRows idPrefix={id} groups={groups} help={help} form={form} readOnly={readOnly} />
    </SettingsPage>
  )
}
