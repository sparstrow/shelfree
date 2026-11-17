import { createFileRoute } from '@tanstack/react-router'
import { PlaceholderPage } from '@/app/shell/PlaceholderPage'

/** Assembly order document placeholder — the full document is a later task. */
export const Route = createFileRoute('/production/assembly-orders/$no')({
  component: AssemblyOrderDocumentPlaceholder,
})

function AssemblyOrderDocumentPlaceholder() {
  const { no } = Route.useParams()
  return <PlaceholderPage title={`Assembly order ${no}`} kind="pending" />
}
