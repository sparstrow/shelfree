import { createFileRoute } from '@tanstack/react-router'
import { PlaceholderPage } from '@/app/shell/PlaceholderPage'

/** Vendor profile placeholder — the full profile is a later task. */
export const Route = createFileRoute('/purchasing/vendors/$no')({
  component: VendorProfilePlaceholder,
})

function VendorProfilePlaceholder() {
  const { no } = Route.useParams()
  return <PlaceholderPage title={`Vendor ${no}`} kind="pending" />
}
