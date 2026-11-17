import { createFileRoute } from '@tanstack/react-router'
import { ContactsPage } from '@/features/people/contacts/ContactsPage'

export const Route = createFileRoute('/people/contacts/')({
  validateSearch: (search: Record<string, unknown>): { sel?: string } =>
    typeof search.sel === 'string' && search.sel ? { sel: search.sel } : {},
  component: ContactsPage,
})
