/**
 * The mock "database": one browser-localStorage-backed collection per entity,
 * seeded from the demo data on first use.
 *
 * Nothing outside `src/data` may import this file. Screens go through
 * `data/queries` → `data/api`; when a real backend exists, `data/api` swaps
 * these calls for HTTP and this file is deleted.
 */
import type { z } from 'zod'

const PREFIX = 'shelfree.v2.'

/** Simulated network latency so loading states are exercised. Zero under test. */
const LATENCY_MS = import.meta.env.MODE === 'test' ? 0 : 90

function delay<T>(value: T): Promise<T> {
  if (LATENCY_MS === 0) return Promise.resolve(value)
  return new Promise((resolve) => setTimeout(() => resolve(value), LATENCY_MS))
}

function readStorage(key: string): unknown {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeStorage(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // Storage full or unavailable (private mode): keep working from memory.
  }
}

export interface Collection<T> {
  /** Every record, in stored order. */
  list(): Promise<T[]>
  /** One record by id, or null. */
  get(id: string): Promise<T | null>
  /** Insert or replace by id. Returns the stored record. */
  upsert(record: T): Promise<T>
  /** Insert or replace several records in one write. */
  upsertMany(records: T[]): Promise<T[]>
  remove(id: string): Promise<void>
  /** Drop local changes and return to the seed data. */
  reset(): Promise<void>
}

export interface CollectionOptions<S extends z.ZodType> {
  /** Storage key suffix, e.g. `purchaseOrders`. */
  key: string
  schema: S
  /** Demo rows used until the user changes something. */
  seed: () => unknown[]
  idOf: (record: z.infer<S>) => string
}

export function createCollection<S extends z.ZodType>(
  options: CollectionOptions<S>,
): Collection<z.infer<S>> {
  type T = z.infer<S>
  const { key, schema, seed, idOf } = options
  let cache: T[] | null = null

  const parseAll = (rows: unknown[]): T[] => rows.map((row) => schema.parse(row) as T)

  const load = (): T[] => {
    if (cache) return cache
    const stored = readStorage(key)
    if (Array.isArray(stored)) {
      try {
        cache = parseAll(stored)
        return cache
      } catch {
        // Stored data no longer matches the schema (shape changed between
        // builds): fall back to the seed rather than crash the app.
      }
    }
    cache = parseAll(seed())
    return cache
  }

  const commit = (next: T[]): void => {
    cache = next
    writeStorage(key, next)
  }

  // Records are returned as copies so callers can't mutate the store by accident.
  const copy = <V>(value: V): V => structuredClone(value)

  return {
    list: () => delay(copy(load())),
    get: (id) => delay(copy(load().find((r) => idOf(r) === id) ?? null)),
    upsert: (record) => {
      const parsed = schema.parse(record) as T
      const rows = load()
      const index = rows.findIndex((r) => idOf(r) === idOf(parsed))
      commit(index >= 0 ? rows.map((r, i) => (i === index ? parsed : r)) : [parsed, ...rows])
      return delay(copy(parsed))
    },
    upsertMany: (records) => {
      const parsed = records.map((r) => schema.parse(r) as T)
      const byId = new Map(parsed.map((r) => [idOf(r), r]))
      const rows = load()
      const replaced = rows.map((r) => byId.get(idOf(r)) ?? r)
      const existing = new Set(rows.map(idOf))
      const added = parsed.filter((r) => !existing.has(idOf(r)))
      commit([...added, ...replaced])
      return delay(copy(parsed))
    },
    remove: (id) => {
      commit(load().filter((r) => idOf(r) !== id))
      return delay(undefined)
    },
    reset: () => {
      cache = null
      try {
        localStorage.removeItem(PREFIX + key)
      } catch {
        // ignore
      }
      return delay(undefined)
    },
  }
}
