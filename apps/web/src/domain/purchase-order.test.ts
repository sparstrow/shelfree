import type { PurchaseOrder, PurchaseReceipt } from '@/data/schemas'
import { nextNo } from './numbering'
import {
  duplicatePurchaseOrder,
  poCanCancel,
  poCanClose,
  poCanLock,
  poCanReopen,
  poLockLabel,
  poLockState,
  poNextNo,
  poOverdue,
  poReceiptProgress,
  poStatusAfterReceipts,
  poSubtotal,
} from './purchase-order'

const po = (over: Partial<PurchaseOrder> = {}): PurchaseOrder => ({
  no: 'PO00001',
  vendor: 'V00001',
  orderDate: '2026-07-12',
  expectedDate: '2026-08-02',
  location: 'TVM-MAIN',
  status: 'Issued',
  buyer: 'EMP00007',
  notes: '',
  lines: [
    { item: 'RM-LID-PWH', desc: 'Lid', qty: 200, uom: 'NOS', unitCost: 62 },
    { item: 'RM-BASE-STD', desc: 'Base', qty: 400, uom: 'NOS', unitCost: 41 },
  ],
  ...over,
})

const receipt = (over: Partial<PurchaseReceipt> = {}): PurchaseReceipt => ({
  no: 'GRN00001',
  po: 'PO00001',
  vendor: 'V00001',
  receiptDate: '2026-07-20',
  location: 'TVM-MAIN',
  status: 'Posted',
  receivedBy: 'EMP00007',
  vendorDocNo: '',
  notes: '',
  postedAt: '2026-07-20T10:30:00.000Z',
  lines: [
    {
      item: 'RM-LID-PWH',
      desc: 'Lid',
      uom: 'NOS',
      qtyOrdered: 200,
      qtyReceived: 120,
      qtyRejected: 0,
      rejectReason: '',
      unitCost: 62,
    },
  ],
  ...over,
})

describe('numbering', () => {
  it('pads to 5 digits and steps from the highest existing number', () => {
    expect(nextNo('PO', ['PO00003', 'PO00011', 'PO00007'])).toBe('PO00012')
    expect(nextNo('V', [])).toBe('V00001')
    expect(poNextNo([{ no: 'PO00010' }])).toBe('PO00011')
  })
})

describe('purchase order totals', () => {
  it('sums qty × unit cost across lines', () => {
    expect(poSubtotal(po())).toBe(200 * 62 + 400 * 41)
    expect(poSubtotal(po({ lines: [] }))).toBe(0)
  })
})

describe('purchase order lock', () => {
  it('drafts are open, issued orders locked unless reopened, the rest final', () => {
    expect(poLockState(po({ status: 'Draft' }))).toBe('open')
    expect(poLockState(po({ status: 'Issued' }))).toBe('locked')
    expect(poLockState(po({ status: 'Issued', locked: false }))).toBe('open')
    expect(poLockState(po({ status: 'Received' }))).toBe('final')
    expect(poLockLabel(po({ status: 'Cancelled' }))).toBe('Final')
  })
})

describe('purchase order overdue', () => {
  it('is overdue only while receivable and past the expected date', () => {
    expect(poOverdue(po(), '2026-08-03')).toBe(true)
    expect(poOverdue(po(), '2026-08-02')).toBe(false)
    expect(poOverdue(po({ status: 'Received' }), '2026-09-01')).toBe(false)
    expect(poOverdue(po({ status: 'Draft' }), '2026-09-01')).toBe(false)
  })
})

describe('receipt progress', () => {
  it('counts posted receipts only', () => {
    const draft = receipt({ no: 'GRN00002', status: 'Draft' })
    const progress = poReceiptProgress(po(), [receipt(), draft])
    expect(progress[0]).toMatchObject({ ordered: 200, received: 120, outstanding: 80 })
    expect(progress[1]).toMatchObject({ ordered: 400, received: 0, outstanding: 400 })
  })

  it('derives the order status from what has arrived', () => {
    expect(poStatusAfterReceipts(po(), [])).toBe('Issued')
    expect(poStatusAfterReceipts(po(), [receipt()])).toBe('Partially received')
    const rest = receipt({
      no: 'GRN00003',
      lines: [
        { ...receipt().lines[0], qtyReceived: 80 },
        { ...receipt().lines[0], item: 'RM-BASE-STD', qtyOrdered: 400, qtyReceived: 400 },
      ],
    })
    expect(poStatusAfterReceipts(po(), [receipt(), rest])).toBe('Received')
  })
})

describe('purchase order bulk transitions and duplication', () => {
  it('allows cancel only for Draft/Issued orders with no active receipts', () => {
    expect(poCanCancel(po({ status: 'Draft' }), [])).toBe(true)
    expect(poCanCancel(po({ status: 'Issued' }), [])).toBe(true)
    expect(poCanCancel(po({ status: 'Issued' }), [receipt({ status: 'Cancelled' })])).toBe(true)
    expect(poCanCancel(po({ status: 'Issued' }), [receipt({ status: 'Draft' })])).toBe(false)
    expect(poCanCancel(po({ status: 'Received' }), [])).toBe(false)
  })

  it('allows close only for Partially received or Received orders', () => {
    expect(poCanClose(po({ status: 'Partially received' }))).toBe(true)
    expect(poCanClose(po({ status: 'Received' }))).toBe(true)
    expect(poCanClose(po({ status: 'Issued' }))).toBe(false)
    expect(poCanClose(po({ status: 'Draft' }))).toBe(false)
  })

  it('allows reopen on locked Issued orders and lock on reopened Issued orders', () => {
    expect(poCanReopen(po({ status: 'Issued' }))).toBe(true)
    expect(poCanReopen(po({ status: 'Issued', locked: false }))).toBe(false)
    expect(poCanReopen(po({ status: 'Draft' }))).toBe(false)
    expect(poCanLock(po({ status: 'Issued', locked: false }))).toBe(true)
    expect(poCanLock(po({ status: 'Issued' }))).toBe(false)
    expect(poCanLock(po({ status: 'Draft' }))).toBe(false)
  })

  it('duplicates as a fresh Draft with today order date, blank expected date, copied lines and cleared tax stamp', () => {
    const src = po({
      status: 'Issued',
      locked: true,
      reopened: true,
      taxCalc: 'line',
      roundTotal: true,
      taxCalcSrc: 'workspace',
    })
    const copy = duplicatePurchaseOrder(src, 'PO00011', '2026-11-18')
    expect(copy.no).toBe('PO00011')
    expect(copy.status).toBe('Draft')
    expect(copy.orderDate).toBe('2026-11-18')
    expect(copy.expectedDate).toBe('')
    expect(copy.locked).toBeUndefined()
    expect(copy.reopened).toBeUndefined()
    expect(copy.taxCalc).toBeUndefined()
    expect(copy.lines).toEqual(src.lines)
    expect(copy.lines[0]).not.toBe(src.lines[0])
  })
})
