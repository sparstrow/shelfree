import type { CollectionName } from '@/data/api'
import { useRemove, useUpsert } from '@/data/queries'
import type { ListDelete } from './ListPage'

/**
 * The standard delete for a list backed by one collection: remove by number,
 * undo by putting the same record back. Pages add when a row can't be deleted.
 */
export function useCollectionDelete<T extends { no: string }>(
  collection: CollectionName,
  options: Omit<ListDelete<T>, 'run' | 'undo'>,
): ListDelete<T> {
  const remove = useRemove(collection)
  const restore = useUpsert(collection)
  return {
    ...options,
    run: (row) => remove.mutateAsync(row.no),
    undo: (row) => restore.mutate(row as never),
  }
}
