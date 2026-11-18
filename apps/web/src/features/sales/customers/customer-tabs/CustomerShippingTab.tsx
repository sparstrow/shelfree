import { Pencil, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { fieldClass, secondaryButton } from '@/components/document/parts'
import type { Customer, CustomerShipTo } from '@/data/schemas'
import {
  type CustomerShipToDraft,
  deleteCustomerShipTo,
  setDefaultCustomerShipTo,
  upsertCustomerShipTo,
  validateCustomerShipTo,
} from '@/domain/customer'
import { EM_DASH } from '@/lib/format'
import { cn } from '@/lib/utils'

export interface CustomerShippingTabProps {
  customer: Customer
  onSaveShipTo: (next: CustomerShipTo[]) => Promise<void>
}

export function CustomerShippingTab({ customer, onSaveShipTo }: CustomerShippingTabProps) {
  const [draft, setDraft] = useState<CustomerShipToDraft | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  // Esc closes the inline ship-to draft before RecordPage treats it as "back to list".
  useEffect(() => {
    if (!draft) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        setDraft(null)
        setErrors({})
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [draft])

  const startNew = () => {
    setDraft({ id: '', label: '', address: '' })
    setErrors({})
  }

  const startEdit = (row: CustomerShipTo) => {
    setDraft({ id: row.id, label: row.label, address: row.address })
    setErrors({})
  }

  const saveDraft = async () => {
    if (!draft || saving) return
    const problems = validateCustomerShipTo(draft)
    if (Object.keys(problems).length) {
      setErrors(problems)
      return
    }
    const next = upsertCustomerShipTo(customer.shipTo ?? [], draft, `${customer.no}-S${Date.now()}`)
    setSaving(true)
    try {
      await onSaveShipTo(next)
      toast(draft.id ? 'Shipping address updated' : 'Shipping address added')
      setDraft(null)
      setErrors({})
    } catch {
      toast('Could not save shipping address', { description: 'Check your connection and try again.' })
    } finally {
      setSaving(false)
    }
  }

  const remove = async (row: CustomerShipTo) => {
    if (saving) return
    const next = deleteCustomerShipTo(customer.shipTo ?? [], row.id)
    setSaving(true)
    try {
      await onSaveShipTo(next)
      if (draft?.id === row.id) {
        setDraft(null)
        setErrors({})
      }
      toast('Shipping address removed', { description: row.label })
    } catch {
      toast('Could not remove shipping address', { description: 'Check your connection and try again.' })
    } finally {
      setSaving(false)
    }
  }

  const makeDefault = async (row: CustomerShipTo) => {
    if (row.isDefault || saving) return
    const next = setDefaultCustomerShipTo(customer.shipTo ?? [], row.id)
    setSaving(true)
    try {
      await onSaveShipTo(next)
      toast('Default shipping address updated', { description: row.label })
    } catch {
      toast('Could not update default address', { description: 'Check your connection and try again.' })
    } finally {
      setSaving(false)
    }
  }

  const rows = customer.shipTo ?? []

  return (
    <div className="max-w-[720px] animate-sf-fade">
      <div className="mb-[11px] flex items-center gap-2.5">
        <span className="text-[13px] font-semibold">Ship-to addresses</span>
        <div className="flex-1" />
        <button
          type="button"
          onClick={startNew}
          className="hover-lift inline-flex h-[30px] items-center rounded-lg border-0 bg-primary px-[13px] text-[12.5px] font-semibold text-primary-foreground hover:bg-primary-hover"
        >
          Add address
        </button>
      </div>

      {draft && (
        <div className="mb-3 animate-sf-fade rounded-xl border border-primary bg-card px-4 py-[15px]">
          <div className="mb-[11px] text-[12.5px] font-semibold">
            {draft.id ? 'Edit address' : 'New ship-to address'}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_2fr]">
            <div>
              <label htmlFor="ship-label" className="mb-[5px] block text-xs text-muted-foreground">
                Label
              </label>
              <input
                id="ship-label"
                autoFocus
                value={draft.label}
                onChange={(e) => {
                  setDraft({ ...draft, label: e.target.value })
                  if (errors.label) setErrors({})
                }}
                placeholder="Girivalam stall"
                aria-invalid={!!errors.label}
                className={cn(fieldClass, 'h-8', errors.label && 'border-bad-fg')}
              />
              {errors.label && (
                <div role="alert" className="mt-1 animate-sf-slide text-[11.5px] font-medium text-bad-fg">
                  {errors.label}
                </div>
              )}
            </div>
            <div>
              <label htmlFor="ship-address" className="mb-[5px] block text-xs text-muted-foreground">
                Address
              </label>
              <input
                id="ship-address"
                value={draft.address}
                onChange={(e) => setDraft({ ...draft, address: e.target.value })}
                placeholder="Street, area, town"
                className={cn(fieldClass, 'h-8')}
              />
            </div>
          </div>
          <div className="mt-[13px] flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setDraft(null)
                setErrors({})
              }}
              className={cn(secondaryButton, 'h-[30px] px-3')}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveDraft()}
              className="hover-lift inline-flex h-[30px] items-center rounded-lg border-0 bg-primary px-3.5 text-[12.5px] font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {rows.map((a) => (
          <div
            key={a.id}
            className="flex items-center gap-[13px] border-b border-border px-4 py-[13px] transition-colors duration-[140ms] last:border-b-0 hover:bg-tint-7/50"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-[13px] font-semibold">
                <span className="truncate">{a.label}</span>
                {a.isDefault && (
                  <span className="rounded-full bg-primary-tint px-[7px] py-px text-[10px] font-bold tracking-[0.03em] text-primary uppercase">
                    Default
                  </span>
                )}
              </div>
              <div className="mt-0.5 text-[11.5px] text-muted-foreground">{a.address || EM_DASH}</div>
            </div>
            <button
              type="button"
              disabled={a.isDefault || saving}
              onClick={() => void makeDefault(a)}
              className="h-[26px] rounded-[7px] border border-input bg-transparent px-2.5 text-[11.5px] font-semibold text-muted-foreground transition-colors duration-[140ms] hover:bg-tint-10 hover:text-foreground disabled:cursor-default disabled:opacity-60 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
            >
              {a.isDefault ? 'Default' : 'Make default'}
            </button>
            <button
              type="button"
              onClick={() => startEdit(a)}
              aria-label={`Edit ${a.label}`}
              title="Edit"
              className="hover-lift inline-flex size-[26px] items-center justify-center rounded-[7px] border border-input bg-transparent text-muted-foreground hover:bg-tint-10 hover:text-foreground"
            >
              <Pencil className="size-3" strokeWidth={2} />
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void remove(a)}
              aria-label={`Remove ${a.label}`}
              title="Remove"
              className="hover-lift inline-flex size-[26px] items-center justify-center rounded-[7px] border border-input bg-transparent text-muted-foreground hover:border-bad-fg hover:bg-bad-bg hover:text-bad-fg disabled:opacity-50"
            >
              <Trash2 className="size-3" strokeWidth={2} />
            </button>
          </div>
        ))}

        {rows.length === 0 && (
          <div className="px-6 py-9 text-center text-[13px] text-muted-foreground">
            No ship-to addresses yet — goods go to the billing address.
          </div>
        )}
      </div>
    </div>
  )
}
