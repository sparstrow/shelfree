import { createContext, useContext } from 'react'

/**
 * `true` while the user has turned descriptions on (`?`, per-user
 * `showSetHelp`): every help target then prints its text under the label.
 * The Settings frame provides it; outside it help stays in the popover.
 */
export const HelpInlineContext = createContext(false)

export const useHelpInline = () => useContext(HelpInlineContext)
