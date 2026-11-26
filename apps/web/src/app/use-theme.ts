import { useEffect, useState } from 'react'
import { useMe } from '@/data/queries/session'
import { resolveTheme } from '@/domain/personal-preferences'

const QUERY = '(prefers-color-scheme: dark)'

/** Whether the device prefers dark. Follows changes while mounted. */
export function useSystemDark(): boolean {
  const [dark, setDark] = useState(() => (typeof window === 'undefined' ? true : window.matchMedia(QUERY).matches))
  useEffect(() => {
    const mq = window.matchMedia(QUERY)
    const on = () => setDark(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return dark
}

/** Put a theme on the root, where the tokens read it (`[data-theme]`). */
export function applyTheme(theme: 'dark' | 'light'): void {
  document.documentElement.dataset.theme = theme
}

/** The theme on screen for the signed-in user (their Appearance setting, `system` resolved). */
export function useShownTheme(): 'dark' | 'light' {
  const pref = useMe().data?.theme ?? 'dark'
  const systemDark = useSystemDark()
  return resolveTheme(pref, systemDark)
}
