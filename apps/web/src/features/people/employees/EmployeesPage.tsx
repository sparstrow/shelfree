import { getRouteApi } from '@tanstack/react-router'
import { CheckCircle2, PauseCircle, RotateCcw, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { type ListAction, type ListBulkAction, ListPage } from '@/components/list-page/ListPage'
import type { EditorField } from '@/components/record-fields/model'
import { useList, useRemove, useUpsert } from '@/data/queries'
import { useMe } from '@/data/queries/session'
import type { Employee } from '@/data/schemas'
import {
  EMPLOYEE_DEPTS,
  EMPLOYEE_STATUSES,
  EMPLOYEE_TYPES,
  type EmployeeDeleteRefs,
  type EmployeeStatus,
  blankEmployee,
  employeeDeleteBlocked,
  formatTenure,
  normalizeEmployee,
  validateEmployee,
} from '@/domain/people'
import { fmtDate } from '@/lib/format'
import { makeEmployeesDataset } from './dataset'

const route = getRouteApi('/people/employees/')

function DirectReportsSection({ reports }: { reports: Employee[] }) {
  if (reports.length === 0) return null
  return (
    <div className="mt-4">
      <div className="mb-1.5 text-[11px] font-semibold tracking-[0.05em] text-muted-foreground">DIRECT REPORTS</div>
      <div className="flex flex-col">
        {reports.map((r) => (
          <div key={r.id} className="flex items-center justify-between gap-2 border-b border-dashed border-border py-[5px] text-[12.5px]">
            <span className="min-w-0 truncate font-medium">{r.name}</span>
            <span className="flex-none text-xs text-muted-foreground">{r.title}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function EmployeesPage({ initialActiveId = null }: { initialActiveId?: string | null }) {
  const { sel } = route.useSearch()
  const employees = useList('employees')
  const users = useList('users')
  const vendors = useList('vendors')
  const customers = useList('customers')
  const purchaseOrders = useList('purchaseOrders')
  const purchaseReceipts = useList('purchaseReceipts')
  const assemblyOrders = useList('assemblyOrders')
  const warehouses = useList('warehouses')
  const me = useMe()
  const save = useUpsert('employees')
  const del = useRemove('employees')
  const [bulkDeleting, setBulkDeleting] = useState<{ rows: Employee[]; clearSelection: () => void } | null>(null)

  const empNames = useMemo(() => new Map((employees.data ?? []).map((e) => [e.id, e.name])), [employees.data])
  const dataset = useMemo(() => makeEmployeesDataset(empNames), [empNames])

  const locationOptions = useMemo(() => {
    const set = new Set<string>()
    for (const w of warehouses.data ?? []) set.add(w.code)
    for (const e of employees.data ?? []) {
      if (e.location) set.add(e.location)
    }
    set.add('Field')
    set.add('Remote')
    return [...set]
  }, [warehouses.data, employees.data])

  const defaultLocation = me.data?.defLocation || (warehouses.data ?? [])[0]?.code || 'TVM-Main'

  const deleteRefs: EmployeeDeleteRefs = useMemo(
    () => ({
      employees: employees.data ?? [],
      users: users.data ?? [],
      vendors: vendors.data ?? [],
      customers: customers.data ?? [],
      purchaseOrders: purchaseOrders.data ?? [],
      purchaseReceipts: purchaseReceipts.data ?? [],
      assemblyOrders: assemblyOrders.data ?? [],
      warehouses: warehouses.data ?? [],
    }),
    [employees.data, users.data, vendors.data, customers.data, purchaseOrders.data, purchaseReceipts.data, assemblyOrders.data, warehouses.data],
  )

  const fields = (draft: Employee): EditorField<Employee>[] => {
    const statusOptions =
      draft.status && !EMPLOYEE_STATUSES.includes(draft.status as EmployeeStatus)
        ? [draft.status, ...EMPLOYEE_STATUSES]
        : [...EMPLOYEE_STATUSES]
    const managerOptions = [
      { value: '', label: 'None' },
      ...(employees.data ?? [])
        .filter((e) => e.id !== draft.id)
        .map((e) => ({ value: e.id, label: `${e.name} (${e.dept})` })),
    ]
    return [
      { key: 'id', label: 'Employee ID', type: 'text', mono: true, locked: true },
      { key: 'name', label: 'Full name', type: 'text', placeholder: 'e.g. Ananya Krishnan' },
      { key: 'title', label: 'Job title', type: 'text', placeholder: 'e.g. Quality Lead' },
      { key: 'dept', label: 'Department', type: 'select', options: EMPLOYEE_DEPTS },
      { key: 'type', label: 'Employment type', type: 'select', options: EMPLOYEE_TYPES },
      { key: 'status', label: 'Status', type: 'select', options: statusOptions },
      {
        key: 'managerId',
        label: 'Reports to',
        type: 'select',
        options: managerOptions,
        display: (e) => (e.managerId ? (empNames.get(e.managerId) ?? e.managerId) : 'None'),
        muted: (e) => !e.managerId,
      },
      {
        key: 'email',
        label: 'Email',
        type: 'text',
        placeholder: 'name@kanalora.example',
        copyable: true,
        hint: 'Work email. Masked in the grid and exports, shown in full here.',
      },
      {
        key: 'phone',
        label: 'Phone',
        type: 'text',
        mono: true,
        placeholder: '+91 90031 00000',
        copyable: true,
        hint: 'Direct work number. Masked in the grid and exports, shown in full here.',
      },
      {
        key: 'location',
        label: 'Location',
        type: 'select',
        options: draft.location && !locationOptions.includes(draft.location) ? [draft.location, ...locationOptions] : locationOptions,
      },
      {
        key: 'joinDate',
        label: 'Joined',
        type: 'date',
        mono: true,
        display: (e) => fmtDate(e.joinDate),
      },
    ]
  }

  const setStatus = async (emp: Employee, nextStatus: EmployeeStatus, okTitle: string) => {
    const prev = emp
    try {
      await save.mutateAsync({ ...emp, status: nextStatus })
    } catch {
      toast.error('Could not update employee', { description: 'Check your connection and try again.' })
      return
    }
    toast(okTitle, {
      description: `${emp.id} · ${emp.name}`,
      action: { label: 'Undo', onClick: () => void save.mutateAsync(prev) },
    })
  }

  const actions: ListAction<Employee>[] = [
    {
      label: 'Set on leave',
      icon: PauseCircle,
      inDrawer: true,
      when: (e) => e.status === 'Active',
      run: (e) => void setStatus(e, 'On leave', 'Employee set on leave'),
    },
    {
      label: 'Mark active',
      icon: CheckCircle2,
      inDrawer: true,
      when: (e) => e.status === 'On leave',
      run: (e) => void setStatus(e, 'Active', 'Employee marked active'),
    },
    {
      label: 'Reinstate',
      icon: RotateCcw,
      inDrawer: true,
      when: (e) => e.status === 'Terminated',
      run: (e) => void setStatus(e, 'Active', 'Employee reinstated'),
    },
  ]

  const runBulkStatus = async (selectedRows: Employee[], nextStatus: EmployeeStatus, clearSelection: () => void) => {
    const eligible = selectedRows.filter((r) => r.status !== nextStatus)
    if (eligible.length === 0) {
      toast(`Selected employees are already ${nextStatus.toLowerCase()}.`)
      return
    }
    try {
      await Promise.all(eligible.map((row) => save.mutateAsync({ ...row, status: nextStatus })))
    } catch {
      toast.error('Could not update selected employees', { description: 'Check your connection and try again.' })
      return
    }
    clearSelection()
    toast(`${eligible.length} ${eligible.length === 1 ? 'employee' : 'employees'} set to ${nextStatus}`, {
      action: {
        label: 'Undo',
        onClick: () => void Promise.all(eligible.map((prev) => save.mutateAsync(prev))),
      },
    })
  }

  const bulkActions: ListBulkAction<Employee>[] = [
    {
      label: 'Activate',
      icon: CheckCircle2,
      when: (rows) => rows.some((r) => r.status !== 'Active'),
      run: (rows, { clearSelection }) => runBulkStatus(rows, 'Active', clearSelection),
    },
    {
      label: 'Set on leave',
      icon: PauseCircle,
      when: (rows) => rows.some((r) => r.status !== 'On leave'),
      run: (rows, { clearSelection }) => runBulkStatus(rows, 'On leave', clearSelection),
    },
    {
      label: 'Delete',
      icon: Trash2,
      danger: true,
      run: (rows, { clearSelection }) => setBulkDeleting({ rows, clearSelection }),
    },
  ]

  const confirmBulkDelete = async () => {
    if (!bulkDeleting) return
    const { rows: selectedRows, clearSelection } = bulkDeleting
    setBulkDeleting(null)
    const deletable: Employee[] = []
    const reasons: string[] = []
    for (const row of selectedRows) {
      const reason = employeeDeleteBlocked(row, deleteRefs)
      if (reason) reasons.push(reason)
      else deletable.push(row)
    }
    if (deletable.length === 0) {
      toast.error('Delete refused', { description: reasons[0] ?? 'Selected employees are referenced by active records.' })
      return
    }
    try {
      await Promise.all(deletable.map((row) => del.mutateAsync(row.id)))
    } catch {
      toast.error('Could not delete selected employees', { description: 'Check your connection and try again.' })
      return
    }
    clearSelection()
    toast(`${deletable.length} ${deletable.length === 1 ? 'employee' : 'employees'} deleted`, {
      description: reasons.length > 0 ? `${reasons.length} referenced employee${reasons.length === 1 ? '' : 's'} skipped.` : undefined,
      action: {
        label: 'Undo',
        onClick: () => void Promise.all(deletable.map((prev) => save.mutateAsync(prev))),
      },
    })
  }

  return (
    <>
      <ListPage<Employee>
        dataset={dataset}
        rows={employees.data}
        isLoading={employees.isLoading}
        error={employees.error}
        onRefresh={() => employees.refetch()}
        initialActiveId={initialActiveId ?? sel ?? null}
        actions={actions}
        bulkActions={bulkActions}
        remove={{
          blockedReason: (e) => employeeDeleteBlocked(e, deleteRefs),
          describe: (e) => `${e.id} · ${e.name}`,
          note: 'This removes the employee directory entry.',
          run: (e) => del.mutateAsync(e.id),
          undo: (e) => void save.mutateAsync(e),
        }}
        editor={{
          blank: (rows) => blankEmployee(rows, defaultLocation),
          normalize: normalizeEmployee,
          validate: (draft, others) => {
            const existing = (employees.data ?? []).find((e) => e.id === draft.id) ?? null
            return validateEmployee(draft, others, { existing })
          },
          save: (record) => save.mutateAsync(record),
          label: (e) => `${e.id} · ${e.name}`,
          fields: (draft) => fields(draft),
          view: (e) => {
            const linkedUser = (users.data ?? []).find((u) => u.empId === e.id)
            return {
              no: e.id,
              status: e.status,
              tags: e.type === 'Contractor' && e.status !== 'Contractor' ? ['Contractor'] : [],
              title: e.name,
              subtitle: `${e.title} · ${e.location}`,
              stats: [
                { value: e.dept, label: 'Department' },
                { value: formatTenure(e.joinDate), label: 'Tenure' },
                { value: e.type, label: 'Type' },
              ],
              notice:
                e.status === 'Terminated'
                  ? 'Terminated employee — kept for historical audit.'
                  : e.status === 'On leave'
                    ? 'Currently on leave.'
                    : undefined,
              facts: [
                { k: 'Tenure', v: formatTenure(e.joinDate) },
                { k: 'App account', v: linkedUser ? `${linkedUser.id} · ${linkedUser.role} (${linkedUser.status})` : 'No app account' },
              ],
            }
          },
          extra: (e) => {
            const reports = (employees.data ?? []).filter((r) => r.managerId === e.id)
            return <DirectReportsSection reports={reports} />
          },
        }}
      />
      <ConfirmDialog
        open={!!bulkDeleting}
        danger
        title={`Delete ${bulkDeleting?.rows.length ?? 0} selected employees?`}
        description="Unreferenced employees will be removed from the directory. Employees still linked to orders, warehouses, reports, or user accounts will be skipped. You can undo right after deleting."
        confirmLabel="Delete selected"
        onConfirm={confirmBulkDelete}
        onCancel={() => setBulkDeleting(null)}
      />
    </>
  )
}
