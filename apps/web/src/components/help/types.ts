/**
 * Quiet help — the data a page hands to the shared ⓘ component. A page keeps
 * one pure `HelpMap` (key → entry); labels, section titles and the page title
 * look their entry up by key. Nothing here knows about React.
 */

export interface HelpOption {
  /** Matches the control's value, so the current option can be marked. */
  value: string
  label: string
  desc: string
}

export interface HelpEntry {
  /** Name of the thing described — the popover heading. */
  title: string
  /** What it does. Also the text shown inline when `?` is on. */
  body?: string
  /** What each choice means; the current one is marked, the default tagged. */
  options?: readonly HelpOption[]
  /** Compliance note (GST, audit…), set apart in the popover. */
  note?: string
}

export type HelpMap = Readonly<Record<string, HelpEntry>>
