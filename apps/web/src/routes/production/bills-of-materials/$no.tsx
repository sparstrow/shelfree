import { createFileRoute } from '@tanstack/react-router'
import { PlaceholderPage } from '@/app/shell/PlaceholderPage'

/** BOM document placeholder — the full editor is a later task. */
export const Route = createFileRoute('/production/bills-of-materials/$no')({
  component: BomDocumentPlaceholder,
})

function BomDocumentPlaceholder() {
  const { no } = Route.useParams()
  return <PlaceholderPage title={`Bill of materials ${no}`} kind="pending" />
}
