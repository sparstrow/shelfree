/**
 * The editable preview drawer — the List page template's option for lists whose
 * records are edited right in the drawer (charges, carriers, chart of accounts,
 * contacts…). A page describes its fields; the drawer owns view ↔ edit.
 *
 * Follows CLAUDE.md "Edit in place": the same rows, in the same order and
 * position, in view and edit. Editing only swaps each value for its control in
 * the same 32 px box; locked fields stay text. Field help lives in a tooltip on
 * the label ("Quiet pages") — no descriptive text under the controls.
 */
import { CircleAlert, X } from 'lucide-react'
import { type ReactNode, useEffect, useRef } from 'react'
import { StatusPill } from '@/components/StatusPill'
import { FieldRows } from '@/components/record-fields/FieldRows'
import { type EditorField, fieldBoxClass } from '@/components/record-fields/model'
import { cn } from '@/lib/utils'
import type { DrawerFact, DrawerStat } from './RecordDrawer'

export type { EditorField, EditorFieldType, EditorOption } from '@/components/record-fields/model'

export interface EditableDrawerProps<T> {
  ariaLabel: string
  mode: 'view' | 'edit' | 'new'
  record: T
  /** Header in view mode. */
  no: string
  status?: string
  tags?: string[]
  title: string
  subtitle?: string
  /** KPI strip rendered below the header in view mode. */
  stats?: DrawerStat[]
  /** Header in edit / new mode, e.g. "Edit charge" / "New charge". */
  editHeading: string
  editSubheading?: string
  /** A warning shown in view mode (system record, broken link…). */
  notice?: string
  fields: EditorField<T>[]
  /** Read-only facts after the fields, in both modes (Source, Last changed). */
  facts?: DrawerFact[]
  errors: Record<string, string>
  formError?: string
  onChange: (key: keyof T & string, value: unknown) => void
  onClose: () => void
  footer?: ReactNode
  children?: ReactNode
  /** Extra content shown below fields and facts while editing or creating. */
  editChildren?: ReactNode
}

export function EditableDrawer<T>({
  ariaLabel,
  mode,
  record,
  no,
  status,
  tags = [],
  title,
  subtitle,
  stats,
  editHeading,
  editSubheading,
  notice,
  fields,
  facts,
  errors,
  formError,
  onChange,
  onClose,
  footer,
  children,
  editChildren,
}: EditableDrawerProps<T>) {
  const editing = mode !== 'view'
  const bodyRef = useRef<HTMLDivElement>(null)

  // Entering edit focuses the first control that can be edited.
  useEffect(() => {
    if (!editing) return
    bodyRef.current?.querySelector<HTMLElement>('input:not(:disabled), select:not(:disabled), textarea:not(:disabled), button[role=switch]:not(:disabled)')?.focus()
  }, [editing])

  return (
    <aside
      aria-label={ariaLabel}
      className="flex w-[360px] flex-none animate-sf-fade flex-col overflow-hidden rounded-[10px] border border-border bg-card"
    >
      {/* Header: one box for both modes so its height never changes. */}
      <div className="flex h-[88px] items-start gap-2 overflow-hidden border-b border-border px-[14px] pt-[13px] pb-3">
        <div className="min-w-0 flex-1">
          {editing ? (
            <>
              <div className="text-sm leading-[1.3] font-semibold">{editHeading}</div>
              {editSubheading && <div className="mt-0.5 truncate text-[12.5px] text-muted-foreground">{editSubheading}</div>}
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[13px] font-semibold">{no}</span>
                {status && <StatusPill label={status} />}
                {tags.map((t) => (
                  <StatusPill key={t} label={t} />
                ))}
              </div>
              <div className="mt-1 text-sm leading-[1.3] font-semibold">{title}</div>
              {subtitle && <div className="mt-0.5 text-[12.5px] text-muted-foreground">{subtitle}</div>}
            </>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          title="Close (Esc)"
          aria-label="Close"
          className="hover-lift flex size-[26px] flex-none items-center justify-center rounded-[7px] border-0 bg-transparent text-muted-foreground hover:bg-tint-16 hover:text-foreground"
        >
          <X className="size-[14px]" strokeWidth={2} />
        </button>
      </div>

      <div ref={bodyRef} className="flex-1 overflow-auto px-[14px] pt-3 pb-[14px]">
        {!editing && stats && stats.length > 0 && (
          <div className="-mx-[14px] -mt-3 mb-3 flex gap-2 border-b border-border px-[14px] py-3">
            {stats.map((stat, i) => (
              <div key={stat.label} className={cn('flex-1 text-center', i > 0 && 'border-l border-border')}>
                <div className={cn('tnum text-base font-bold', stat.tone === 'bad' && 'text-bad-fg')}>{stat.value}</div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        )}
        {!editing && notice && (
          <div role="status" className="mb-3 flex items-start gap-2 rounded-lg bg-warn-bg px-[10px] py-2 text-xs leading-normal text-warn-fg">
            <CircleAlert className="mt-px size-[13px] flex-none" strokeWidth={2} />
            <span>{notice}</span>
          </div>
        )}

        <div className="mb-1.5 text-[11px] font-semibold tracking-[0.05em] text-muted-foreground">DETAILS</div>
        <div className="flex flex-col">
          <FieldRows fields={fields} values={record} editing={editing} errors={errors} onChange={onChange} />
          {facts?.map((fact) => (
            <div key={fact.k} className="grid grid-cols-[124px_1fr] items-center gap-x-2 border-b border-dashed border-border py-1">
              <span className="flex min-h-8 items-center text-[12.5px] text-muted-foreground">{fact.k}</span>
              <div className={cn(fieldBoxClass, 'tnum border-transparent font-medium', editing && 'text-muted-foreground')}>{fact.v}</div>
            </div>
          ))}
        </div>
        {formError && (
          <div role="alert" className="mt-3 flex items-center gap-2 rounded-lg bg-bad-bg px-[10px] py-2 text-xs font-medium text-bad-fg">
            <CircleAlert className="size-[13px] flex-none" strokeWidth={2} />
            {formError}
          </div>
        )}
        {editing ? editChildren : children}
      </div>

      {footer && (
        <div className="border-t border-border px-3 py-[10px]">
          <div className="flex gap-2">{footer}</div>
        </div>
      )}
    </aside>
  )
}
