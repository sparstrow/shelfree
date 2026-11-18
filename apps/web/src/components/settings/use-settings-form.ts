import { useBlocker } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { useLatest } from '@/lib/use-latest-callback'


type Json = Record<string, unknown>

export interface UseSettingsFormOptions<V extends Json> {
  /** The saved value; undefined while loading. */
  saved: V | undefined
  /** Persist the whole document. */
  onSave: (next: V) => Promise<unknown>
  /** Errors by key for the value about to be saved; empty when valid. */
  validate?: (values: V) => Record<string, string>
  /** Toast after a save. Default `Saved`. */
  savedMessage?: string
}

export interface SettingsForm<V extends Json = Json> {
  values: V | undefined
  /** Keys whose value differs from the saved one. */
  dirtyKeys: readonly string[]
  isDirty: boolean
  saving: boolean
  errors: Record<string, string>
  set: (key: keyof V & string, value: V[keyof V & string]) => void
  save: () => Promise<boolean>
  discard: () => void
  /** Leave-guard state, rendered by the frame. */
  blocker: { open: boolean; stay: () => void; leave: () => void; saveAndLeave: () => Promise<void> }
}

/** What the page frame needs from a form: the save bar and the keys. */
export type SettingsFormBar = Pick<SettingsForm, 'dirtyKeys' | 'isDirty' | 'saving' | 'save' | 'discard' | 'blocker'>

const same =(a: unknown, b: unknown) => a === b || JSON.stringify(a) === JSON.stringify(b)

/**
 * Draft, dirty tracking, validation, save and the leave guard for one Settings
 * section. The section keeps showing the saved value until Save; only changed
 * keys are held as the draft.
 */
export function useSettingsForm<V extends Json>({ saved, onSave, validate, savedMessage = 'Saved' }: UseSettingsFormOptions<V>): SettingsForm<V> {
  const [patch, setPatch] = useState<Partial<V>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const values = saved ? ({ ...saved, ...patch } as V) : undefined
  const dirtyKeys = saved ? Object.keys(patch).filter((k) => !same(patch[k], saved[k])) : []
  const isDirty = dirtyKeys.length > 0
  const latest = useLatest({ values, isDirty, validate, onSave, savedMessage })
  const busy = useRef(false)

  const set: SettingsForm<V>['set'] = (key, value) => {
    setPatch((p) => {
      const next = { ...p, [key]: value }
      if (saved && same(saved[key], value)) delete next[key]
      return next
    })
    setErrors((e) => {
      if (!(key in e)) return e
      const { [key]: _gone, ...rest } = e
      return rest
    })
  }

  const discard = () => {
    setPatch({})
    setErrors({})
  }

  const save = async (): Promise<boolean> => {
    const { values: current, isDirty: dirty, validate: check, onSave: persist, savedMessage: message } = latest.current
    if (!current || !dirty || busy.current) return false
    const found = check?.(current) ?? {}
    if (Object.keys(found).length) {
      setErrors(found)
      return false
    }
    busy.current = true
    setSaving(true)
    try {
      await persist(current)
      setPatch({})
      setErrors({})
      toast.success(message)
      return true
    } catch {
      toast.error('Could not save. Try again.')
      return false
    } finally {
      busy.current = false
      setSaving(false)
    }
  }

  // Leaving with unsaved changes asks first (in-app navigation and tab close).
  const resolver = useBlocker({
    shouldBlockFn: () => latest.current.isDirty,
    enableBeforeUnload: () => latest.current.isDirty,
    withResolver: true,
  })
  const blocker: SettingsForm<V>['blocker'] = {
    open: resolver.status === 'blocked',
    stay: () => resolver.status === 'blocked' && resolver.reset(),
    leave: () => {
      if (resolver.status !== 'blocked') return
      discard()
      resolver.proceed()
    },
    saveAndLeave: async () => {
      if (resolver.status !== 'blocked') return
      if (await save()) resolver.proceed()
      else resolver.reset()
    },
  }

  return { values, dirtyKeys, isDirty, saving, errors, set, save, discard, blocker } as SettingsForm<V>
}
