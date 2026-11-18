import { createFileRoute } from '@tanstack/react-router'
import { DepartmentsPage } from '@/features/departments/DepartmentsPage'

export const Route = createFileRoute('/departments/')({
  component: DepartmentsPage,
})
