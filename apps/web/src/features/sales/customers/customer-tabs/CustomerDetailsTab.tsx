import { FieldRows } from '@/components/record-fields/FieldRows'
import type { EditorField } from '@/components/record-fields/model'
import { RecordCard, type RecordTabContext } from '@/components/record-page/RecordPage'
import type { Customer } from '@/data/schemas'
import { GST_STATES } from '@/domain/gst'
import type { CustomerDraft } from '../CustomerProfilePage'

const ACTIVE_STATES = GST_STATES.filter((s) => !s.legacy)
  .map((s) => s.name)
  .sort((a, b) => a.localeCompare(b))

export function CustomerDetailsTab({ ctx }: { ctx: RecordTabContext<Customer, CustomerDraft> }) {
  const { draft, editing, errors, onChange } = ctx

  const stateNames =
    draft.state && !ACTIVE_STATES.includes(draft.state) ? [draft.state, ...ACTIVE_STATES] : ACTIVE_STATES
  const stateOptions = [{ value: '', label: 'Not set' }, ...stateNames.map((name) => ({ value: name, label: name }))]

  const billingFields: EditorField<CustomerDraft>[] = [
    { key: 'city', label: 'City', type: 'text' },
    {
      key: 'state',
      label: 'State',
      type: 'select',
      options: stateOptions,
    },
    {
      key: 'gstin',
      label: 'GSTIN',
      type: 'text',
      mono: true,
      maxLength: 15,
      placeholder: '33AABCS1001K1Z1',
      display: (d) => d.gstin || 'Not added',
      muted: (d) => !d.gstin,
      copyable: true,
    },
    { key: 'terms', label: 'Payment terms', type: 'text' },
    {
      key: 'currency',
      label: 'Currency',
      type: 'text',
      locked: true,
      hint: 'Follows the workspace currency until multi-currency is enabled.',
    },
  ]

  return (
    <div className="max-w-[620px] animate-sf-fade">
      <RecordCard
        title="Billing & address"
        hint="Billing city, state, GSTIN and default payment terms. Contacts are managed on the Contacts tab."
      >
        <FieldRows
          fields={billingFields}
          values={draft}
          editing={editing}
          errors={errors}
          onChange={onChange}
          idPrefix="cp-billing"
          layout="wide"
        />
      </RecordCard>
    </div>
  )
}
