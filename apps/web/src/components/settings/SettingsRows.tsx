import { Link } from '@tanstack/react-router'
import { HelpTarget } from '@/components/help/HelpTarget'
import type { HelpMap } from '@/components/help/types'
import { fieldBoxClass } from '@/components/record-fields/model'
import { Switch } from '@/components/ui/switch'
import { EM_DASH } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { RowControl, SettingsGroup, SettingsRow } from './rows'
import type { SettingsForm } from './use-settings-form'

type Json = Record<string, unknown>

export interface SettingsRowsProps<V extends Json> {
  /** Prefix for input ids: `${idPrefix}-${key}`. */
  idPrefix: string
  groups: readonly SettingsGroup<V>[]
  help: HelpMap
  form: SettingsForm<V>
  /** View-only mode: every row renders its view text in the same 32 px box so nothing moves. */
  readOnly?: boolean
}

const inputClass = (error: boolean) =>
  cn(
    fieldBoxClass,
    'h-8 bg-transparent text-foreground outline-none placeholder:text-muted-foreground focus:border-ring',
    error ? 'border-bad-fg' : 'border-input hover:border-ring/60',
  )

function optionLabel(c: RowControl, value: unknown): string {
  if (c.type === 'select') return c.options.find((o) => o.value === value)?.label ?? String(value ?? '')
  if (c.type === 'switch') return value ? (c.onText ?? 'On') : (c.offText ?? 'Off')
  return value == null || value === '' ? EM_DASH : String(value)
}

/** The label | control grid for a section described by `groups`. */
export function SettingsRows<V extends Json>({ idPrefix, groups, help, form, readOnly = false }: SettingsRowsProps<V>) {
  const values = form.values
  if (!values) return null

  const renderControl = (row: SettingsRow<V>, id: string) => {
    const value = values[row.key]
    const error = form.errors[row.key]
    const c = row.control
    const rowLocked = !!row.locked?.(values)
    if (readOnly || rowLocked || c.type === 'readonly') {
      const text = c.type === 'readonly' && c.format ? c.format(value) : optionLabel(row.control, value)
      const isMono = (c.type === 'readonly' || c.type === 'text') && !!c.mono
      return (
        <div
          className={cn(
            fieldBoxClass,
            'gap-2 border-transparent font-medium',
            c.type === 'area' && 'items-start py-[7px] whitespace-pre-wrap',
            isMono && 'font-mono text-xs',
            c.type === 'number' && 'tnum',
            rowLocked && 'text-muted-foreground',
          )}
        >
          <span className={cn('min-w-0', c.type !== 'area' && 'truncate')} id={id}>
            {text}
          </span>
          {c.type === 'readonly' && c.link && (
            <Link
              to="/settings/$section"
              params={{ section: c.link.section }}
              className="hover-lift ml-auto inline-flex h-7 flex-none items-center rounded-md border border-border bg-card px-2.5 text-xs font-medium text-foreground hover:bg-tint-12"
            >
              {c.link.label}
            </Link>
          )}
        </div>
      )
    }
    switch (c.type) {
      case 'select':
        return (
          <select
            id={id}
            value={value == null ? '' : String(value)}
            onChange={(e) => form.set(row.key, e.target.value as V[keyof V & string])}
            aria-invalid={!!error}
            className={inputClass(!!error)}
          >
            {c.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        )
      case 'switch':
        return (
          <div className={cn(fieldBoxClass, 'gap-2.5 border-transparent px-0')}>
            <Switch id={id} checked={!!value} onCheckedChange={(next) => form.set(row.key, next as V[keyof V & string])} />
            {/* The state text toggles too (a bigger target); the switch itself carries the state for screen readers. */}
            <span
              aria-hidden
              onClick={() => form.set(row.key, !value as V[keyof V & string])}
              className="cursor-pointer text-[13px] font-medium select-none"
            >
              {value ? (c.onText ?? 'On') : (c.offText ?? 'Off')}
            </span>
          </div>
        )
      case 'area':
        return (
          <textarea
            id={id}
            value={value == null ? '' : String(value)}
            maxLength={c.maxLength}
            onChange={(e) => form.set(row.key, e.target.value as V[keyof V & string])}
            aria-invalid={!!error}
            className={cn(inputClass(!!error), 'min-h-[68px] resize-y py-[7px] leading-[1.45]')}
          />
        )
      case 'number':
        return (
          <input
            id={id}
            type="number"
            step={c.step}
            min={c.min}
            value={value == null ? '' : String(value)}
            onChange={(e) => form.set(row.key, (e.target.value === '' ? 0 : Number(e.target.value)) as V[keyof V & string])}
            aria-invalid={!!error}
            className={cn(inputClass(!!error), 'tnum')}
          />
        )
      default:
        return (
          <input
            id={id}
            type="text"
            inputMode={c.inputMode}
            maxLength={c.maxLength}
            placeholder={c.placeholder}
            value={value == null ? '' : String(value)}
            onChange={(e) => form.set(row.key, e.target.value as V[keyof V & string])}
            aria-invalid={!!error}
            className={cn(inputClass(!!error), c.mono && 'font-mono text-xs')}
          />
        )
    }
  }

  return (
    <>
      {groups.map((group) => {
        const rows = group.rows.filter((r) => !r.hidden?.(values))
        const groupHelp = help[group.help ?? group.id]
        const heading = <h2 className="m-0 text-[13px] font-bold">{group.title}</h2>
        return (
          <section
            key={group.id}
            data-setting-row={group.id}
            aria-label={group.title}
            className="rounded-xl border border-border bg-card px-5 pt-4 pb-3"
          >
            <div className="group/row mb-2 flex items-center">
              {groupHelp ? (
                <HelpTarget help={groupHelp} label={group.title}>
                  {heading}
                </HelpTarget>
              ) : (
                heading
              )}
            </div>
            {rows.map((row) => {
              const id = `${idPrefix}-${row.key}`
              const entry = help[row.help ?? row.key]
              const value = values[row.key]
              const error = form.errors[row.key]
              const warning = !error ? row.warn?.(value, values) : null
              const changed = !readOnly && form.dirtyKeys.includes(row.key)
              const hasDefault = row.default !== undefined
              const interactive = !readOnly && !row.locked?.(values) && row.control.type !== 'readonly'
              return (
                <div
                  key={row.key}
                  data-row={row.key}
                  data-setting-row={row.key}
                  className="group/row grid grid-cols-1 items-start gap-x-3 border-b border-dashed border-border py-1 last:border-b-0 sm:grid-cols-[minmax(140px,2fr)_minmax(0,3fr)]"
                >
                  <span className="flex min-h-8 items-center gap-1.5 text-[12.5px] text-muted-foreground">
                    {entry ? (
                      <HelpTarget
                        help={entry}
                        label={row.label}
                        current={String(value)}
                        defaultValue={hasDefault ? String(row.default) : undefined}
                        defaultText={hasDefault ? (row.defaultText ?? optionLabel(row.control, row.default)) : undefined}
                        onReset={hasDefault && interactive ? () => form.set(row.key, row.default as V[keyof V & string]) : undefined}
                      >
                        <label htmlFor={interactive ? id : undefined}>{row.label}</label>
                      </HelpTarget>
                    ) : (
                      <label htmlFor={interactive ? id : undefined}>{row.label}</label>
                    )}
                    {changed && (
                      <span title="Unsaved change" className="size-1.5 flex-none rounded-full bg-primary">
                        <span className="sr-only">Changed</span>
                      </span>
                    )}
                  </span>
                  <div className="min-w-0">
                    {renderControl(row, id)}
                    {error && (
                      <div role="alert" className="mt-1 text-[11.5px] text-bad-fg">
                        {error}
                      </div>
                    )}
                    {warning && <div className="mt-1 text-[11.5px] text-warn-fg">{warning}</div>}
                  </div>
                </div>
              )
            })}
          </section>
        )
      })}
    </>
  )
}
