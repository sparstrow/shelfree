import { useSyncExternalStore } from 'react'

/** Live `matchMedia` result. False on the server and where matchMedia is missing. */
export function useMedia(query: string): boolean {
  return useSyncExternalStore(
    (notify) => {
      const mq = window.matchMedia(query)
      mq.addEventListener('change', notify)
      return () => mq.removeEventListener('change', notify)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** Touch devices: no hover, coarse pointer. */
export const TOUCH_QUERY = '(hover: none), (pointer: coarse)'

export const useTouch = () => useMedia(TOUCH_QUERY)
