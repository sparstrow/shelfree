import { FieldRows } from '@/components/record-fields/FieldRows'
import type { EditorField } from '@/components/record-fields/model'
import { RecordCard, type RecordTabContext } from '@/components/record-page/RecordPage'
import type { Vendor } from '@/data/schemas'
import { VENDOR_PAYMENT_METHODS, vendorStateOptions } from '@/domain/vendor'
import { EM_DASH } from '@/lib/format'
import type { VendorDraft } from '../VendorOverview'

type VendorDetailsDraft = VendorDraft & { currency: string }

export interface VendorDetailsTabProps {
  ctx: RecordTabContext<Vendor, VendorDraft>
}

/** Vendor profile — Address & payment tab (in-place editable using the page's draft). */
export function VendorDetailsTab({ ctx }: VendorDetailsTabProps) {
  const { draft, editing, errors, onChange } = ctx

  const methods: string[] = [...VENDOR_PAYMENT_METHODS]
  if (draft.paymentMethod && !methods.includes(draft.paymentMethod)) methods.unshift(draft.paymentMethod)

  const fields: EditorField<VendorDetailsDraft>[] = [
    { key: 'addr1', label: 'Address line 1', type: 'text' },
    { key: 'addr2', label: 'Address line 2', type: 'text' },
    { key: 'city', label: 'City', type: 'text' },
    {
      key: 'state',
      label: 'State',
      type: 'select',
      options: vendorStateOptions(editing ? draft.state : ''),
      display: (d) => d.state || EM_DASH,
    },
    { key: 'zip', label: 'PIN code', type: 'text' },
    { key: 'country', label: 'Country', type: 'text' },
    { key: 'paymentTerms', label: 'Payment terms', type: 'text' },
    {
      key: 'paymentMethod',
      label: 'Payment method',
      type: 'select',
      options: [{ value: '', label: 'Not set' }, ...methods.map((m) => ({ value: m, label: m }))],
      display: (d) => d.paymentMethod,
    },
    { key: 'currency', label: 'Currency', type: 'text', locked: true },
    { key: 'vendorSince', label: 'Vendor since', type: 'text', locked: true },
  ]

  // Multi-currency axis is not ported yet, so Currency reads Workspace default as in the prototype.
  const values: VendorDetailsDraft = { ...draft, currency: 'Workspace default' }

  return (
    <div className="animate-sf-fade">
      <RecordCard title="Address & payment" className="max-w-[620px]">
        <FieldRows
          fields={fields}
          values={values}
          editing={editing}
          errors={errors}
          onChange={(key, value) => {
            if (key !== 'currency') onChange(key, value)
          }}
          idPrefix="vp-addr"
          layout="wide"
        />
      </RecordCard>
    </div>
  )
}
