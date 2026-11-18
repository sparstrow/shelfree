import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { NotesPage } from '@/features/notes/NotesPage'

const notesSearch = z.object({
  sel: z.string().optional(),
  type: z.string().optional(),
  entity: z.string().optional(),
  status: z.string().optional(),
})

export const Route = createFileRoute('/notes/notes')({
  validateSearch: notesSearch,
  component: NotesModuleRoute,
})

function NotesModuleRoute() {
  const { sel, type, entity, status } = Route.useSearch()
  return <NotesPage sel={sel} type={type} entity={entity} status={status} />
}
