/**
 * TanStack Query hooks over `data/api`. Screens use these — never `api`,
 * the store or the seed directly.
 */
import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type Api, type CollectionName, api } from '@/data/api'
import { postPurchaseReceipt } from '@/data/api/commands'

type RecordOf<K extends CollectionName> = Awaited<ReturnType<Api[K]['list']>>[number]

export const queryKeys = {
  list: (name: CollectionName) => [name, 'list'] as const,
  detail: (name: CollectionName, id: string) => [name, 'detail', id] as const,
}

/** Query options for a whole collection — usable in route loaders too. */
export function listOptions<K extends CollectionName>(name: K) {
  return queryOptions({
    queryKey: queryKeys.list(name),
    queryFn: () => api[name].list() as Promise<RecordOf<K>[]>,
  })
}

/** Every record of a collection. */
export function useList<K extends CollectionName>(name: K) {
  return useQuery(listOptions(name))
}

/** One record by id (null when it does not exist). */
export function useRecord<K extends CollectionName>(name: K, id: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.detail(name, id ?? ''),
    queryFn: () => api[name].get(id as string) as Promise<RecordOf<K> | null>,
    enabled: !!id,
  })
}

/** Create or update a record, then refresh everything read from that collection. */
export function useUpsert<K extends CollectionName>(name: K) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (record: RecordOf<K>) =>
      (api[name].upsert as (r: RecordOf<K>) => Promise<RecordOf<K>>)(record),
    onSuccess: () => client.invalidateQueries({ queryKey: [name] }),
  })
}

export function useRemove<K extends CollectionName>(name: K) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api[name].remove(id),
    onSuccess: () => client.invalidateQueries({ queryKey: [name] }),
  })
}

/** Post a goods-in receipt (moves stock and updates the purchase order). */
export function usePostPurchaseReceipt() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: postPurchaseReceipt,
    onSuccess: () =>
      Promise.all(
        (['purchaseReceipts', 'purchaseOrders', 'items'] as const).map((name) =>
          client.invalidateQueries({ queryKey: [name] }),
        ),
      ),
  })
}
