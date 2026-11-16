import {
  type Dataset,
  applyPipeline,
  matchFilter,
  paginate,
  sumColumn,
  toCsv,
  toggleSort,
} from './model'

interface Row {
  no: string
  name: string
  status: string
  total: number
}

const rows: Row[] = [
  { no: 'PO00003', name: 'Kailash Ceramics Works', status: 'Issued', total: 500 },
  { no: 'PO00001', name: 'Malaimayil Dhoop', status: 'Draft', total: 1200 },
  { no: 'PO00002', name: 'Sri Annamalai Packaging', status: 'Issued', total: 80 },
]

const dataset: Dataset<Row> = {
  id: 'test',
  noun: 'order',
  nounPlural: 'orders',
  idOf: (r) => r.no,
  columns: [
    { key: 'no', label: 'No.', width: 100, min: 80, visible: true, align: 'left', type: 'mono', sortable: true },
    { key: 'name', label: 'Vendor, name', width: 100, min: 80, visible: true, align: 'left', type: 'text', sortable: true },
    { key: 'total', label: 'Total', width: 100, min: 80, visible: true, align: 'right', type: 'num', sortable: true, agg: 'sum' },
  ],
  raw: (r, key) => r[key as keyof Row],
  text: (r, key) => String(r[key as keyof Row]),
  searchBlob: (r) => (r.no + ' ' + r.name + ' ' + r.status).toLowerCase(),
  views: [],
  filterColumns: [],
}

const run = (over: Partial<Parameters<typeof applyPipeline<Row>>[0]> = {}) =>
  applyPipeline({ rows, dataset, search: '', filters: [], sorts: [], ...over }).map((r) => r.no)

describe('grid pipeline', () => {
  it('sorts by number ascending by default and does not mutate the input', () => {
    expect(run()).toEqual(['PO00001', 'PO00002', 'PO00003'])
    expect(rows[0].no).toBe('PO00003')
  })

  it('searches the blob case-insensitively', () => {
    expect(run({ search: 'KAILASH' })).toEqual(['PO00003'])
  })

  it('combines filters with AND', () => {
    expect(
      run({
        filters: [
          { key: 'status', op: 'isAny', value: ['Issued'] },
          { key: 'total', op: '>', value: '100' },
        ],
      }),
    ).toEqual(['PO00003'])
  })

  it('sorts numerically, then by later keys on ties', () => {
    expect(run({ sorts: [{ key: 'total', dir: 'desc' }] })).toEqual(['PO00001', 'PO00003', 'PO00002'])
    expect(
      run({
        sorts: [
          { key: 'status', dir: 'desc' },
          { key: 'no', dir: 'desc' },
        ],
      }),
    ).toEqual(['PO00003', 'PO00002', 'PO00001'])
  })
})

describe('filters', () => {
  it('treats a filter with no value yet as matching everything', () => {
    expect(matchFilter('Draft', { key: 'status', op: 'isAny', value: [] })).toBe(true)
    expect(matchFilter('abc', { key: 'name', op: 'contains', value: '' })).toBe(true)
  })
  it('supports the text, enum and number operators', () => {
    expect(matchFilter('Kailash', { key: 'name', op: 'startsWith', value: 'kai' })).toBe(true)
    expect(matchFilter('Draft', { key: 'status', op: 'isNot', value: ['Draft'] })).toBe(false)
    expect(matchFilter(50, { key: 'total', op: 'between', value: '100', value2: '10' })).toBe(true)
    expect(matchFilter('', { key: 'name', op: 'isEmpty' })).toBe(true)
  })
})

describe('sort toggling', () => {
  it('cycles asc → desc → default on plain clicks', () => {
    expect(toggleSort([], 'total', false)).toEqual([{ key: 'total', dir: 'asc' }])
    expect(toggleSort([{ key: 'total', dir: 'asc' }], 'total', false)).toEqual([{ key: 'total', dir: 'desc' }])
    expect(toggleSort([{ key: 'total', dir: 'desc' }], 'total', false)).toEqual([])
  })
  it('adds and cycles columns with shift', () => {
    const two = toggleSort([{ key: 'no', dir: 'asc' }], 'total', true)
    expect(two).toEqual([
      { key: 'no', dir: 'asc' },
      { key: 'total', dir: 'asc' },
    ])
    expect(toggleSort(toggleSort(two, 'total', true), 'total', true)).toEqual([{ key: 'no', dir: 'asc' }])
  })
})

describe('paging, totals, export', () => {
  it('clamps the page and reports the count', () => {
    expect(paginate(rows, 9, 2)).toMatchObject({ page: 1, pageCount: 2, total: 3 })
    expect(paginate([], 0, 20)).toMatchObject({ page: 0, pageCount: 1, total: 0 })
  })
  it('sums a numeric column', () => {
    expect(sumColumn(rows, dataset, 'total')).toBe(1780)
  })
  it('quotes CSV cells that need it', () => {
    const csv = toCsv(rows.slice(0, 1), dataset, dataset.columns)
    expect(csv).toBe('No.,"Vendor, name",Total\r\nPO00003,Kailash Ceramics Works,500')
  })
})
