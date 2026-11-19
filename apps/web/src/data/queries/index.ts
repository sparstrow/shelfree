/**
 * TanStack Query hooks over `data/api`. Screens use these — never `api`,
 * the store or the seed directly.
 */
import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type Api, type CollectionName, api } from '@/data/api'
import {
  type BulkEditPurchaseLinesInput,
  type BulkEditPurchaseOrdersInput,
  type FinishAssemblyOrderInput,
  type ItemUnitAction,
  type PoBulkLockAction,
  type PoBulkStatusAction,
  bulkDeleteCollection,
  bulkEditPurchaseLines,
  bulkEditPurchaseOrders,
  bulkPurchaseOrderLock,
  bulkPurchaseOrderStatus,
  bulkRemoveItemUnits,
  bulkUpsertCollection,
  duplicateCustomers,
  duplicateItems,
  duplicatePurchaseOrders,
  removeDuplicatedItems,
  duplicateVendors,
  finishAssemblyOrder,
  postPurchaseReceipt,
  restoreItemUnits,
  saveItemWithUnits,
  updateItemUnits,
} from '@/data/api/commands'

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

/** Finish (full or partial) an assembly order and refresh orders and stock. */
export function useFinishAssemblyOrder() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ no, ...input }: { no: string } & FinishAssemblyOrderInput) =>
      finishAssemblyOrder(no, input),
    onSuccess: () =>
      Promise.all(
        (['assemblyOrders', 'items'] as const).map((name) =>
          client.invalidateQueries({ queryKey: [name] }),
        ),
      ),
  })
}

/** Update an item's unit set and keep `item.uom` in step (`itemUnits` + `items`). */
export function useUpdateItemUnits() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ itemNo, action }: { itemNo: string; action: ItemUnitAction }) =>
      updateItemUnits(itemNo, action),
    onSuccess: (result) => {
      client.setQueryData(queryKeys.detail('itemUnits', result.unitSet.itemNo), result.unitSet)
      client.setQueryData(queryKeys.detail('items', result.item.no), result.item)
      return Promise.all(
        (['itemUnits', 'items'] as const).map((name) =>
          client.invalidateQueries({ queryKey: [name] }),
        ),
      )
    },
  })
}

/** Bulk-remove item-unit pairs and keep affected items' `uom` in step. */
export function useBulkRemoveItemUnits() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: bulkRemoveItemUnits,
    onSuccess: (result) => {
      for (const entry of result.updated) {
        client.setQueryData(queryKeys.detail('itemUnits', entry.unitSet.itemNo), entry.unitSet)
        client.setQueryData(queryKeys.detail('items', entry.item.no), entry.item)
      }
      return Promise.all(
        (['itemUnits', 'items'] as const).map((name) =>
          client.invalidateQueries({ queryKey: [name] }),
        ),
      )
    },
  })
}

/** Restore item unit sets (Undo) and keep each item's `uom` in step. */
export function useRestoreItemUnits() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: restoreItemUnits,
    onSuccess: (results) => {
      for (const entry of results) {
        client.setQueryData(queryKeys.detail('itemUnits', entry.unitSet.itemNo), entry.unitSet)
        client.setQueryData(queryKeys.detail('items', entry.item.no), entry.item)
      }
      return Promise.all(
        (['itemUnits', 'items'] as const).map((name) =>
          client.invalidateQueries({ queryKey: [name] }),
        ),
      )
    },
  })
}

/** Create or update an item and keep its unit set aligned with `item.uom`. */
export function useSaveItemWithUnits() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: saveItemWithUnits,
    onSuccess: (result) => {
      client.setQueryData(queryKeys.detail('itemUnits', result.unitSet.itemNo), result.unitSet)
      client.setQueryData(queryKeys.detail('items', result.item.no), result.item)
      return Promise.all(
        (['itemUnits', 'items'] as const).map((name) =>
          client.invalidateQueries({ queryKey: [name] }),
        ),
      )
    },
  })
}

/** Upsert several records in one collection (used for bulk restores / Undo). */
export function useBulkUpsert<K extends CollectionName>(name: K) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (records: readonly RecordOf<K>[]) => bulkUpsertCollection(name, records),
    onSuccess: () => client.invalidateQueries({ queryKey: [name] }),
  })
}

/** Remove several records in one collection. */
export function useBulkRemove<K extends CollectionName>(name: K) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (ids: readonly string[]) => bulkDeleteCollection(name, ids),
    onSuccess: () => client.invalidateQueries({ queryKey: [name] }),
  })
}

/** Apply Issue / Cancel / Close across selected purchase orders. */
export function useBulkPurchaseOrderStatus() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ nos, action }: { nos: readonly string[]; action: PoBulkStatusAction }) =>
      bulkPurchaseOrderStatus(nos, action),
    onSuccess: () => client.invalidateQueries({ queryKey: ['purchaseOrders'] }),
  })
}

/** Reopen or lock selected purchase orders. */
export function useBulkPurchaseOrderLock() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ nos, action }: { nos: readonly string[]; action: PoBulkLockAction }) =>
      bulkPurchaseOrderLock(nos, action),
    onSuccess: () => client.invalidateQueries({ queryKey: ['purchaseOrders'] }),
  })
}

/** Bulk-edit one header column across selected purchase orders. */
export function useBulkEditPurchaseOrders() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: BulkEditPurchaseOrdersInput) => bulkEditPurchaseOrders(input),
    onSuccess: () => client.invalidateQueries({ queryKey: ['purchaseOrders'] }),
  })
}

/** Bulk-edit ordered quantity across selected purchase lines (updates their parent orders). */
export function useBulkEditPurchaseLines() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: BulkEditPurchaseLinesInput) => bulkEditPurchaseLines(input),
    onSuccess: () => client.invalidateQueries({ queryKey: ['purchaseOrders'] }),
  })
}

/** Duplicate selected purchase orders as Drafts. */
export function useDuplicatePurchaseOrders() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ nos, today }: { nos: readonly string[]; today: string }) =>
      duplicatePurchaseOrders(nos, today),
    onSuccess: () => client.invalidateQueries({ queryKey: ['purchaseOrders'] }),
  })
}

/** Duplicate selected items with `-COPY` numbers. */
export function useDuplicateItems() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (nos: readonly string[]) => duplicateItems(nos),
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: ['items'] }),
        client.invalidateQueries({ queryKey: ['itemUnits'] }),
      ]),
  })
}

/** Undo a duplicate: remove the copied items and their unit sets. */
export function useRemoveDuplicatedItems() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (nos: readonly string[]) => removeDuplicatedItems(nos),
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: ['items'] }),
        client.invalidateQueries({ queryKey: ['itemUnits'] }),
      ]),
  })
}

/** Duplicate selected customers with `-COPY` numbers. */
export function useDuplicateCustomers() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (nos: readonly string[]) => duplicateCustomers(nos),
    onSuccess: () => client.invalidateQueries({ queryKey: ['customers'] }),
  })
}

/** Duplicate selected vendors with `-COPY` numbers. */
export function useDuplicateVendors() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (nos: readonly string[]) => duplicateVendors(nos),
    onSuccess: () => client.invalidateQueries({ queryKey: ['vendors'] }),
  })
}
