import type { Dataset, GridColumn, RawValue } from '@/components/data-grid/model'
import type { Employee } from '@/data/schemas'
import { EMPLOYEE_DEPTS, EMPLOYEE_STATUSES, EMPLOYEE_TYPES } from '@/domain/people'
import { EM_DASH, fmtDate } from '@/lib/format'
import { maskEmail, maskPhone } from '@/lib/privacy'

const COLS: GridColumn[] = [
  { key: 'id', label: 'Emp ID', width: 100, min: 90, frozen: 'left', visible: true, align: 'left', type: 'mono', sortable: true },
  { key: 'name', label: 'Name', width: 175, min: 135, visible: true, align: 'left', type: 'text', sortable: true },
  { key: 'title', label: 'Title', width: 200, min: 140, visible: true, align: 'left', type: 'text', sortable: true },
  { key: 'dept', label: 'Department', width: 125, min: 100, visible: true, align: 'left', type: 'text', sortable: true },
  { key: 'manager', label: 'Manager', width: 155, min: 115, visible: true, align: 'left', type: 'text', sortable: true },
  { key: 'type', label: 'Type', width: 110, min: 90, visible: true, align: 'left', type: 'pill', sortable: true },
  { key: 'status', label: 'Status', width: 112, min: 92, visible: true, align: 'left', type: 'pill', sortable: true },
  { key: 'location', label: 'Location', width: 108, min: 88, visible: true, align: 'left', type: 'mono', sortable: true },
  { key: 'email', label: 'Email', width: 185, min: 140, visible: true, align: 'left', type: 'text', sortable: true, muted: true },
  { key: 'phone', label: 'Phone', width: 112, min: 92, visible: true, align: 'left', type: 'mono', sortable: true, muted: true },
  { key: 'joinDate', label: 'Joined', width: 110, min: 92, visible: true, align: 'left', type: 'text', sortable: true, muted: true },
]

export function makeEmployeesDataset(empNames: Map<string, string>): Dataset<Employee> {
  const managerName = (e: Employee) => (e.managerId ? (empNames.get(e.managerId) ?? e.managerId) : '')
  const raw = (e: Employee, key: string): RawValue => {
    switch (key) {
      case 'id':
        return e.id
      case 'name':
        return e.name
      case 'title':
        return e.title
      case 'dept':
        return e.dept
      case 'manager':
        return managerName(e)
      case 'type':
        return e.type
      case 'status':
        return e.status
      case 'location':
        return e.location
      case 'email':
        return maskEmail(e.email)
      case 'phone':
        return maskPhone(e.phone)
      case 'joinDate':
        return e.joinDate
      default:
        return ''
    }
  }
  const text = (e: Employee, key: string): string => {
    if (key === 'manager') return managerName(e) || EM_DASH
    if (key === 'joinDate') return fmtDate(e.joinDate) || EM_DASH
    const v = raw(e, key)
    return v === '' ? EM_DASH : String(v)
  }
  return {
    id: 'people-employees',
    noun: 'employee',
    nounPlural: 'employees',
    idOf: (e) => e.id,
    columns: COLS,
    raw,
    text,
    searchBlob: (e) =>
      [e.id, e.name, e.title, e.dept, managerName(e), e.type, e.status, e.location, maskEmail(e.email), maskPhone(e.phone)]
        .join(' ')
        .toLowerCase(),
    defaultSort: { key: 'id', dir: 'asc' },
    views: [
      { id: 'all', name: 'All employees', system: true, filters: [] },
      { id: 'active', name: 'Active', system: true, filters: [{ key: 'status', op: 'isAny', value: ['Active'] }] },
      { id: 'on-leave', name: 'On leave', system: true, filters: [{ key: 'status', op: 'isAny', value: ['On leave'] }] },
      { id: 'terminated', name: 'Terminated', system: true, filters: [{ key: 'status', op: 'isAny', value: ['Terminated'] }] },
      { id: 'contractors', name: 'Contractors', system: true, filters: [{ key: 'type', op: 'isAny', value: ['Contractor'] }] },
    ],
    filterColumns: [
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'dept', label: 'Department', type: 'enum', options: [...EMPLOYEE_DEPTS] },
      { key: 'type', label: 'Type', type: 'enum', options: [...EMPLOYEE_TYPES] },
      { key: 'status', label: 'Status', type: 'enum', options: [...EMPLOYEE_STATUSES, 'Contractor'] },
      { key: 'location', label: 'Location', type: 'text' },
      { key: 'email', label: 'Email', type: 'text' },
      { key: 'phone', label: 'Phone', type: 'text' },
    ],
    rowFlag: (e) => (e.status === 'Terminated' ? 'Terminated employee' : e.status === 'On leave' ? 'On leave' : null),
  }
}
