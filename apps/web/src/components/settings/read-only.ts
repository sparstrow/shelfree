import { createContext, useContext } from 'react'

/** True while the surrounding settings section is view-only for the current user. */
export const SettingsReadOnlyContext = createContext(false)

/** Whether the surrounding settings section is view-only for the current user. */
export function useSettingsReadOnly(): boolean {
  return useContext(SettingsReadOnlyContext)
}
