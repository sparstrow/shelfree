import { useCallback, useEffect, useRef } from 'react'

/** A ref that always holds the value of the latest render (read it from event handlers). */
export function useLatest<T>(value: T) {
  const ref = useRef(value)
  useEffect(() => {
    ref.current = value
  })
  return ref
}

/**
 * A function with a stable identity that always calls the latest `fn` — for
 * handlers handed to memoised data (e.g. a grid dataset) that must not be
 * rebuilt on every render.
 */
export function useLatestCallback<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
  const latest = useRef(fn)
  useEffect(() => {
    latest.current = fn
  })
  return useCallback((...args: A) => latest.current(...args), [])
}
