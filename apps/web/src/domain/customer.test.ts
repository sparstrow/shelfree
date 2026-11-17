import { customerDeleteBlockedReason, customerLocation, customerStatus } from './customer'

describe('customerStatus', () => {
  it('returns the customer status or derives from creditHold when absent', () => {
    expect(customerStatus({ status: 'Active' })).toBe('Active')
    expect(customerStatus({ status: 'On hold' })).toBe('On hold')
    expect(customerStatus({ status: 'Prospect' })).toBe('Prospect')
    expect(customerStatus({ creditHold: true })).toBe('On hold')
    expect(customerStatus({ creditHold: false })).toBe('Active')
    expect(customerStatus(null)).toBe('Active')
  })
})

describe('customerLocation', () => {
  it('formats City, State or whichever side is present', () => {
    expect(customerLocation({ city: 'Tiruvannamalai', state: 'Tamil Nadu' })).toBe('Tiruvannamalai, Tamil Nadu')
    expect(customerLocation({ city: 'Tiruvannamalai', state: '' })).toBe('Tiruvannamalai')
    expect(customerLocation({ city: '', state: 'Tamil Nadu' })).toBe('Tamil Nadu')
    expect(customerLocation({ city: '', state: '' })).toBe('')
    expect(customerLocation(null)).toBe('')
  })
})

describe('customerDeleteBlockedReason', () => {
  it('blocks deletion when openOrders > 0 or balance is non-zero', () => {
    const msg = 'This customer has open orders or a balance — put it on hold instead'
    expect(customerDeleteBlockedReason({ openOrders: 1, balance: 0 })).toBe(msg)
    expect(customerDeleteBlockedReason({ openOrders: 0, balance: 500 })).toBe(msg)
    expect(customerDeleteBlockedReason({ openOrders: 0, balance: -100 })).toBe(msg)
    expect(customerDeleteBlockedReason({ openOrders: 0, balance: 0 })).toBeNull()
    expect(customerDeleteBlockedReason({})).toBeNull()
    expect(customerDeleteBlockedReason(null)).toBeNull()
  })
})
