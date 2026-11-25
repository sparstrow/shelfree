/** Proves the demo seed matches the entity schemas (the store relies on it). */
import { api } from '@/data/api'
import { NUMBER_SEQUENCE_DOC_TYPES, numberSequenceSchema } from '@/data/schemas'
import { validateSeries } from '@/domain/number-sequences'

/** Per-user collections start empty: nothing to seed. */
const startsEmpty = new Set<string>(['savedViews', 'favorites'])

describe('seed data matches the schemas', () => {
  for (const name of Object.keys(api) as (keyof typeof api)[]) {
    it(name, async () => {
      const rows = await api[name].list()
      if (startsEmpty.has(name)) return expect(rows).toEqual([])
      expect(rows.length).toBeGreaterThan(0)
    })
  }
})

describe('seeded number sequences match existing documents', () => {
  it('seeds one valid active default per docType with next past every existing number', async () => {
    const [sequences, pos, prs, sos, invs, items, boms, aos, emps] = await Promise.all([
      api.numberSequences.list(),
      api.purchaseOrders.list(),
      api.purchaseReceipts.list(),
      api.salesOrders.list(),
      api.salesInvoices.list(),
      api.items.list(),
      api.boms.list(),
      api.assemblyOrders.list(),
      api.employees.list(),
    ])

    expect(sequences).toHaveLength(NUMBER_SEQUENCE_DOC_TYPES.length)
    for (const s of sequences) {
      expect(() => numberSequenceSchema.parse(s)).not.toThrow()
      expect(s.active).toBe(true)
      expect(s.isDefault).toBe(true)
      expect(validateSeries(s, sequences)).toEqual({})
    }

    const docsByType: Record<string, string[]> = {
      'purchase-order': pos.map((d) => d.no),
      'purchase-receipt': prs.map((d) => d.no),
      'sales-order': sos.map((d) => d.no),
      'sales-invoice': invs.map((d) => d.no),
      item: items.map((d) => d.no),
      bom: boms.map((d) => d.no),
      'assembly-order': aos.map((d) => d.no),
      employee: emps.map((d) => d.id),
    }

    for (const docType of NUMBER_SEQUENCE_DOC_TYPES) {
      const matches = sequences.filter((s) => s.docType === docType)
      expect(matches).toHaveLength(1)
      const seq = matches[0]
      const re = new RegExp(`^${seq.prefix}(\\d+)$`)
      const existingNums = docsByType[docType]
        .map((no) => re.exec(no)?.[1])
        .filter((v): v is string => !!v)
        .map((v) => Number.parseInt(v, 10))
      expect(seq.issued).toBe(existingNums.length)
      for (const n of existingNums) {
        expect(seq.next).toBeGreaterThan(n)
      }
      expect(seq.next).toBeGreaterThanOrEqual(seq.issued + 1)
    }
  })
})
