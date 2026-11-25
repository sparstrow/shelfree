/**
 * How a settings section describes its rows. Pure data: the template renders
 * them (label | control grid, quiet help, dirty marker, errors) and the form
 * hook tracks and saves them.
 */
import type { ReactNode } from 'react'

export type RowControl =
  | { type: 'text'; mono?: boolean; maxLength?: number; placeholder?: string; inputMode?: 'text' | 'numeric' | 'email' | 'tel' }
  | { type: 'select'; options: readonly { value: string; label: string }[] }
  | { type: 'switch'; onText?: string; offText?: string }
  | { type: 'number'; step?: string; min?: number }
  | { type: 'area'; maxLength?: number }
  /** Shown as text in the same row (derived or managed elsewhere). */
  | { type: 'readonly'; mono?: boolean; format?: (value: unknown) => string; link?: { label: string; section: string } }

export interface SettingsRow<V> {
  key: keyof V & string
  label: string
  control: RowControl
  /** Key in the section's help map. Default: the row key. */
  help?: string
  /** Default value — enables "Use default" in the help popover while it differs. */
  default?: V[keyof V & string]
  /** How the default reads in the popover. Default: option label, On / Off, or the value. */
  defaultText?: string
  /** Blocking error for the value, or null. Runs on Save. */
  validate?: (value: V[keyof V & string], draft: V) => string | null
  /** Non-blocking warning shown while the value is as it is (state, not help). */
  warn?: (value: V[keyof V & string], draft: V) => string | null
  /** Hide the row for the current draft. */
  hidden?: (draft: V) => boolean
  /** Show as locked text. */
  locked?: (draft: V) => boolean
}

export interface SettingsGroup<V> {
  id: string
  title: string
  /** Key in the help map for the section title. Default: the group id. */
  help?: string
  rows: readonly SettingsRow<V>[]
  /**
   * Optional content under the group's rows, for the current draft (e.g. a customer list that
   * only applies in one mode). It manages its own saving; it is not part of the form.
   */
  footer?: (draft: V) => ReactNode
}
