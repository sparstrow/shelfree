import { createFileRoute } from '@tanstack/react-router'
import { EmployeesPage } from '@/features/people/employees/EmployeesPage'

export const Route = createFileRoute('/people/employees/')({
  validateSearch: (search: Record<string, unknown>): { sel?: string } =>
    typeof search.sel === 'string' && search.sel ? { sel: search.sel } : {},
  component: EmployeesPage,
})
