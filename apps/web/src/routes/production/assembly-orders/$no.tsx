import { createFileRoute } from '@tanstack/react-router'
import { AssemblyOrderEditor } from '@/features/production/assembly-orders/AssemblyOrderEditor'

export const Route = createFileRoute('/production/assembly-orders/$no')({
  component: AssemblyOrderDocumentRoute,
})

function AssemblyOrderDocumentRoute() {
  const { no } = Route.useParams()
  return <AssemblyOrderEditor routeNo={no} />
}
