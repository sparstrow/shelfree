import type { Dataset } from '@/components/data-grid/model'
import type { Employee, Vendor } from '@/data/schemas'
import { VENDOR_GST_TYPES, vendorGstType, vendorGstTypeInfo } from '@/domain/gst'
import { vendorLocation, vendorStatus, vendorSuppliesLabel } from '@/domain/vendor'
import { EM_DASH, money } from '@/lib/format'
import { maskPhone } from '@/lib/privacy'

export interface VendorLookups {
  vendors: readonly Vendor[]
  employees: readonly Employee[]
}

/** The Vendors grid definition (columns, views, filters, search). */
export function vendorDataset({ vendors, employees }: VendorLookups): Dataset<Vendor> {
  const empName = (id: string) => employees.find((e) => e.id === id)?.name ?? ''
  const categories = [...new Set(vendors.map((v) => v.category).filter(Boolean))].sort()
  const purchasePersons = [...new Set(vendors.map((v) => empName(v.purchasePerson)).filter(Boolean))].sort()
  const gstShort = (v: Vendor) => vendorGstTypeInfo(vendorGstType(v)).short

  return {
    id: 'vendors',
    noun: 'vendor',
    nounPlural: 'vendors',
    idOf: (v) => v.no,
    columns: [
      { key: 'no', label: 'No.', width: 128, min: 90, frozen: 'left', visible: true, align: 'left', type: 'mono', sortable: true },
      { key: 'name', label: 'Name', width: 210, min: 150, visible: true, align: 'left', type: 'text', sortable: true },
      { key: 'category', label: 'Category', width: 128, min: 96, visible: true, align: 'left', type: 'text', sortable: true, muted: true },
      { key: 'supplies', label: 'Supplies', width: 128, min: 96, visible: true, align: 'left', type: 'text', sortable: true },
      { key: 'gstReg', label: 'GST registration', width: 140, min: 104, visible: true, align: 'left', type: 'text', sortable: true },
      { key: 'gstin', label: 'GSTIN', width: 160, min: 130, visible: false, align: 'left', type: 'mono', sortable: true },
      { key: 'location', label: 'Location', width: 158, min: 110, visible: true, align: 'left', type: 'text', sortable: true },
      { key: 'phone', label: 'Phone', width: 138, min: 110, visible: true, align: 'left', type: 'text', sortable: true },
      { key: 'paymentTerms', label: 'Payment terms', width: 116, min: 88, visible: true, align: 'left', type: 'text', sortable: true },
      { key: 'status', label: 'Status', width: 104, min: 84, visible: true, align: 'left', type: 'pill', sortable: true },
      { key: 'balance', label: 'Balance', width: 116, min: 88, visible: true, align: 'right', type: 'num', sortable: true, agg: 'sum', aggFmt: 'money' },
      { key: 'overdue', label: 'Overdue', width: 112, min: 84, visible: true, align: 'right', type: 'num', sortable: true, agg: 'sum', aggFmt: 'money' },
      { key: 'balanceDue', label: 'Balance due', width: 116, min: 90, visible: false, align: 'right', type: 'num', sortable: true, agg: 'sum', aggFmt: 'money', muted: true },
      { key: 'outstandingOrders', label: 'Outstanding orders', width: 140, min: 110, visible: false, align: 'right', type: 'num', sortable: true, agg: 'sum', aggFmt: 'money', muted: true },
      { key: 'paymentMethod', label: 'Payment method', width: 128, min: 96, visible: false, align: 'left', type: 'text', sortable: true },
      { key: 'purchasePerson', label: 'Purchase person', width: 140, min: 100, visible: true, align: 'left', type: 'text', sortable: true },
      { key: 'vendorSince', label: 'Vendor since', width: 116, min: 92, visible: false, align: 'left', type: 'text', sortable: true },
    ],
    raw: (v, key) => {
      switch (key) {
        case 'no':
          return v.no
        case 'name':
          return v.name
        case 'category':
          return v.category || ''
        case 'supplies':
          return vendorSuppliesLabel(v)
        case 'gstReg':
          return gstShort(v)
        case 'gstin':
          return v.gstin || ''
        case 'city':
          return v.city || ''
        case 'state':
          return v.state || ''
        case 'location':
          return vendorLocation(v)
        case 'phone':
          return maskPhone(v.phone)
        case 'paymentTerms':
          return v.paymentTerms || ''
        case 'paymentMethod':
          return v.paymentMethod || ''
        case 'balance':
          return v.balance || 0
        case 'balanceDue':
          return v.balanceDue || 0
        case 'overdue':
          return v.overdue || 0
        case 'outstandingOrders':
          return v.outstandingOrders || 0
        case 'vendorSince':
          return v.vendorSince || ''
        case 'purchasePerson':
          return empName(v.purchasePerson)
        case 'status':
          return vendorStatus(v)
        default:
          return ''
      }
    },
    text: (v, key) => {
      switch (key) {
        case 'no':
          return v.no
        case 'name':
          return v.name
        case 'category':
          return v.category || EM_DASH
        case 'supplies':
          return vendorSuppliesLabel(v)
        case 'gstReg':
          return gstShort(v)
        case 'gstin':
          return v.gstin || ''
        case 'city':
          return v.city || EM_DASH
        case 'state':
          return v.state || EM_DASH
        case 'location':
          return vendorLocation(v) || EM_DASH
        case 'phone':
          return maskPhone(v.phone) || EM_DASH
        case 'paymentTerms':
          return v.paymentTerms || EM_DASH
        case 'paymentMethod':
          return v.paymentMethod || EM_DASH
        case 'balance':
          return money(v.balance || 0)
        case 'balanceDue':
          return money(v.balanceDue || 0)
        case 'overdue':
          return (v.overdue || 0) > 0 ? money(v.overdue) : EM_DASH
        case 'outstandingOrders':
          return money(v.outstandingOrders || 0)
        case 'vendorSince':
          return v.vendorSince || EM_DASH
        case 'purchasePerson':
          return empName(v.purchasePerson) || EM_DASH
        case 'status':
          return vendorStatus(v)
        default:
          return ''
      }
    },
    searchBlob: (v) =>
      [
        v.no,
        v.name,
        v.name2,
        v.category,
        vendorSuppliesLabel(v),
        gstShort(v),
        v.gstin,
        v.contact,
        v.email,
        v.phone,
        v.city,
        v.state,
        v.country,
        v.paymentTerms,
        v.paymentMethod,
        v.balance,
        v.balanceDue,
        v.overdue,
        v.outstandingOrders,
        vendorStatus(v),
        v.vendorSince,
        empName(v.purchasePerson),
      ]
        .join(' \u0001 ')
        .toLowerCase(),
    views: [
      { id: 'all', name: 'All vendors', system: true, filters: [] },
      { id: 'suppliers', name: 'Suppliers', filters: [{ key: 'supplies', op: 'isAny', value: ['Goods', 'Goods + services'] }] },
      { id: 'services', name: 'Service providers', filters: [{ key: 'supplies', op: 'isAny', value: ['Services', 'Goods + services'] }] },
      { id: 'overdue', name: 'Overdue balance', filters: [{ key: 'overdue', op: '>', value: '0' }] },
      { id: 'subcontract', name: 'Subcontractors', filters: [{ key: 'category', op: 'isAny', value: ['Subcontract'] }] },
    ],
    filterColumns: [
      { key: 'no', label: 'No.', type: 'text' },
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'category', label: 'Category', type: 'enum', options: categories },
      { key: 'supplies', label: 'Supplies', type: 'enum', options: ['Goods', 'Services', 'Goods + services'] },
      { key: 'gstReg', label: 'GST registration', type: 'enum', options: VENDOR_GST_TYPES.map((t) => t.short) },
      { key: 'gstin', label: 'GSTIN', type: 'text' },
      { key: 'city', label: 'City', type: 'text' },
      { key: 'state', label: 'State/Prov.', type: 'text' },
      { key: 'status', label: 'Status', type: 'enum', options: ['Active', 'Blocked'] },
      { key: 'paymentTerms', label: 'Payment terms', type: 'text' },
      { key: 'paymentMethod', label: 'Payment method', type: 'text' },
      { key: 'purchasePerson', label: 'Purchase person', type: 'enum', options: purchasePersons },
      { key: 'balance', label: 'Balance', type: 'num' },
      { key: 'balanceDue', label: 'Balance due', type: 'num' },
      { key: 'overdue', label: 'Overdue', type: 'num' },
      { key: 'outstandingOrders', label: 'Outstanding orders', type: 'num' },
    ],
    defaultSort: { key: 'no', dir: 'asc' },
  }
}
