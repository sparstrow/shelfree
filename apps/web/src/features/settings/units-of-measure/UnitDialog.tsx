import { type FormEvent, type ReactNode, useState } from 'react'
import { HelpTarget } from '@/components/help/HelpTarget'
import { fieldBoxClass } from '@/components/record-fields/model'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  UOM_CATEGORIES,
  UQC_CODES,
  type Uom,
  type UomCategoryId,
  type UomDraft,
  baseUnitFor,
  blankDraft,
  conversionText,
  draftFromUnit,
  normalizeCode,
  suggestUqc,
  unitFromDraft,
  uqcLabel,
  validateDraft,
} from '@/domain/units-of-measure'
import { cn } from '@/lib/utils'
import { UOM_HELP } from './help'

export interface UnitDialogProps {
  /** The unit being edited; null for a new one. */
  unit: Uom | null
  /** Every unit (defaults and custom) — for the duplicate-code check. */
  all: readonly Uom[]
  /** Items that use the unit being edited — the code is fixed while there are any. */
  itemsUsing: number
  onClose: () => void
  /** Persist; `previousCode` is set when an edit changed the code. */
  onSave: (unit: Uom, previousCode: string | null) => Promise<void>
}

const inputClass = (error: boolean) =>
  cn(fieldBoxClass, 'h-8 bg-transparent text-foreground outline-none focus:border-ring disabled:opacity-60', error ? 'border-bad-fg' : 'border-input hover:border-ring/60')

function Field({ id, label, help, error, children }: { id: string; label: string; help: string; error?: string; children: ReactNode }) {
  return (
    <div className="group/row flex flex-col gap-1">
      <HelpTarget help={UOM_HELP[help]} label={label} className="text-[12.5px] text-muted-foreground">
        <label htmlFor={id}>{label}</label>
      </HelpTarget>
      {children}
      {error && (
        <div role="alert" className="text-[11.5px] text-bad-fg">
          {error}
        </div>
      )}
    </div>
  )
}

/** New / Edit unit. Mounted only while open, so its draft starts fresh each time. */
export function UnitDialog({ unit, all, itemsUsing, onClose, onSave }: UnitDialogProps) {
  const [draft, setDraft] = useState<UomDraft>(() => (unit ? draftFromUnit(unit) : blankDraft()))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const editing = unit !== null
  const codeFixed = editing && itemsUsing > 0
  const base = baseUnitFor(draft.cat)
  const factor = draft.factor.trim() === '' ? null : Number(draft.factor)
  const previewable = factor !== null && Number.isFinite(factor) && factor > 0 && normalizeCode(draft.code) !== ''

  const patch = (next: Partial<UomDraft>) => {
    setDraft((d) => ({ ...d, ...next }))
    setErrors((e) => {
      const rest = { ...e }
      for (const k of Object.keys(next)) delete rest[k]
      return rest
    })
  }

  const submit = async (e?: FormEvent) => {
    e?.preventDefault()
    if (saving) return
    const found = validateDraft(draft, all, unit?.code ?? null)
    if (Object.keys(found).length) return setErrors(found)
    setSaving(true)
    try {
      await onSave(unitFromDraft(draft), unit && unit.code !== normalizeCode(draft.code) ? unit.code : null)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        className="max-w-[460px]"
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && (e.key === 'Enter' || e.key.toLowerCase() === 's')) {
            e.preventDefault()
            void submit()
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>{editing ? `Edit ${unit.code}` : 'New unit'}</DialogTitle>
          <DialogDescription className="sr-only">
            {editing ? 'Change this custom unit of measure.' : 'Add a custom unit of measure.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => void submit(e)} noValidate className="flex flex-col gap-3">
          <div className="grid grid-cols-[120px_1fr] gap-3">
            <Field id="uom-code" label="Code" help="code" error={errors.code}>
              <input
                id="uom-code"
                autoFocus={!editing}
                value={draft.code}
                disabled={codeFixed}
                maxLength={8}
                onChange={(e) => patch({ code: e.target.value.toUpperCase() })}
                aria-invalid={!!errors.code}
                title={codeFixed ? `${itemsUsing} ${itemsUsing === 1 ? 'item uses' : 'items use'} this unit, so its code is fixed.` : undefined}
                className={cn(inputClass(!!errors.code), 'font-mono text-xs')}
              />
            </Field>
            <Field id="uom-name" label="Name" help="name" error={errors.name}>
              <input
                id="uom-name"
                autoFocus={editing}
                value={draft.name}
                onChange={(e) => patch({ name: e.target.value })}
                aria-invalid={!!errors.name}
                className={inputClass(!!errors.name)}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field id="uom-cat" label="Category" help="fCat">
              <select
                id="uom-cat"
                value={draft.cat}
                onChange={(e) => patch({ cat: e.target.value as UomCategoryId, uqc: suggestUqc(e.target.value) })}
                className={inputClass(false)}
              >
                {UOM_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="uom-uqc" label="GST UQC code" help="fUqc">
              <select id="uom-uqc" value={draft.uqc} onChange={(e) => patch({ uqc: e.target.value })} className={inputClass(false)}>
                {UQC_CODES.map((code) => (
                  <option key={code} value={code}>
                    {uqcLabel(code)}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-[1fr_120px] gap-3">
            <Field id="uom-factor" label="Conversion factor" help="factor" error={errors.factor}>
              <div className="flex items-center gap-2">
                <input
                  id="uom-factor"
                  inputMode="decimal"
                  value={draft.factor}
                  placeholder="Standalone"
                  onChange={(e) => patch({ factor: e.target.value })}
                  aria-invalid={!!errors.factor}
                  className={cn(inputClass(!!errors.factor), 'tnum')}
                />
                <span className="flex-none font-mono text-xs text-muted-foreground">{base}</span>
              </div>
            </Field>
            <Field id="uom-sym" label="Symbol" help="sym" error={errors.sym}>
              <input
                id="uom-sym"
                value={draft.sym}
                maxLength={6}
                onChange={(e) => patch({ sym: e.target.value })}
                aria-invalid={!!errors.sym}
                className={inputClass(!!errors.sym)}
              />
            </Field>
          </div>
          <p aria-live="polite" className="m-0 text-[12px] text-muted-foreground">
            {previewable ? (
              <>
                Stored conversion: <span className="font-mono text-foreground">{conversionText(normalizeCode(draft.code), factor, draft.cat)}</span>
              </>
            ) : (
              'Standalone unit — no fixed conversion.'
            )}
          </p>
          <DialogFooter>
            <button
              type="button"
              onClick={onClose}
              className="hover-lift inline-flex h-[34px] items-center rounded-lg border border-border bg-card px-[14px] text-[13px] font-medium text-foreground hover:bg-tint-12"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="hover-lift inline-flex h-[34px] items-center rounded-lg border-0 bg-primary px-[14px] text-[13px] font-semibold text-new-btn-fg hover:bg-primary-hover disabled:opacity-60"
            >
              {editing ? 'Save unit' : 'Add unit'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
