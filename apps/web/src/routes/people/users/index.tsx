import { createFileRoute } from '@tanstack/react-router'
import { UsersPage } from '@/features/people/users/UsersPage'

export const Route = createFileRoute('/people/users/')({
  validateSearch: (search: Record<string, unknown>): { sel?: string } =>
    typeof search.sel === 'string' && search.sel ? { sel: search.sel } : {},
  component: UsersPage,
})
