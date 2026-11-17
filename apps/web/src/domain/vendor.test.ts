import { vendorLocation, vendorStatus, vendorSuppliesLabel } from './vendor'

describe('vendorStatus', () => {
  it('returns Active when blocked is empty or missing, and Blocked otherwise', () => {
    expect(vendorStatus({ blocked: '' })).toBe('Active')
    expect(vendorStatus({})).toBe('Active')
    expect(vendorStatus(null)).toBe('Active')
    expect(vendorStatus({ blocked: 'All' })).toBe('Blocked')
    expect(vendorStatus({ blocked: 'Payment' })).toBe('Blocked')
  })
})

describe('vendorSuppliesLabel', () => {
  it('maps goods, services and both to display labels', () => {
    expect(vendorSuppliesLabel({ supplies: 'goods' })).toBe('Goods')
    expect(vendorSuppliesLabel({ supplies: 'services' })).toBe('Services')
    expect(vendorSuppliesLabel({ supplies: 'both' })).toBe('Goods + services')
    expect(vendorSuppliesLabel(undefined)).toBe('Goods')
  })
})

describe('vendorLocation', () => {
  it('formats City, State or whichever side is present', () => {
    expect(vendorLocation({ city: 'Vellore', state: 'Tamil Nadu' })).toBe('Vellore, Tamil Nadu')
    expect(vendorLocation({ city: 'Vellore', state: '' })).toBe('Vellore')
    expect(vendorLocation({ city: '', state: 'Tamil Nadu' })).toBe('Tamil Nadu')
    expect(vendorLocation({ city: '', state: '' })).toBe('')
    expect(vendorLocation(null)).toBe('')
  })
})
