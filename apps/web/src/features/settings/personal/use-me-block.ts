import { useMemo } from 'react'
import type { Me } from '@/data/api/session'
import { useMe, useUpdateMe } from '@/data/queries/session'

/**
 * One section of Settings ▸ Personal as a block of the signed-in user's record: the saved values of just those
 * keys, and a save that writes just those keys (the record is merged at save time, so another section's
 * changes are never overwritten). Personal sections are editable by every user — the caller never passes `readOnly`.
 */
export function useMeBlock<K extends keyof Me>(keys: readonly K[]) {
  const me = useMe()
  const update = useUpdateMe()
  const saved = useMemo(() => {
    if (!me.data) return undefined
    const block = {} as Pick<Me, K>
    for (const key of keys) block[key] = me.data[key]
    return block
    // `keys` is a module-level constant in every section.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me.data])
  return {
    saved,
    isLoading: me.isLoading,
    error: me.error,
    onRetry: () => void me.refetch(),
    onSave: (next: Pick<Me, K>) => update.mutateAsync(next as Partial<Me>),
  }
}
