import { ChevronDown, Funnel, Search, X } from 'lucide-react'
import { type KeyboardEvent, useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import {
  activeFilterCountForColumn,
  clearColumnFilter,
  filterPanelSubtitle,
  matchesFilterColumnSearch,
  upsertColumnFilter,
} from '@/domain/grid-filters'
import { cn } from '@/lib/utils'
import { FilterValueEditor } from './FilterValueEditor'
import { type FilterColumn, type FilterOp, type GridFilter, OPS_BY_KIND, defaultFilter } from './model'

export interface FilterPanelProps {
  columns: FilterColumn[]
  filters: GridFilter[]
  /** Section keys currently expanded inside the panel. */
  openSections: ReadonlySet<string>
  /** Pre-computed counts of enum option occurrences keyed by column key -> option -> count. */
  enumCounts: Record<string, Record<string, number>>
  columnQuery: string
  /** True when 320 px fits beside the grid; false presents the panel in a right-side Sheet. */
  inline: boolean
  onColumnQueryChange: (query: string) => void
  onToggleSection: (key: string) => void
  onChangeFilters: (next: GridFilter[]) => void
  onClose: () => void
  onReturnFocus?: () => void
  nextId: () => string
}

const hasOpenFloatingLayer = (): boolean =>
  typeof document !== 'undefined' &&
  Boolean(
    document.querySelector(
      '[data-slot="select-content"], [data-slot="popover-content"], [data-slot="dropdown-menu-content"], [role="alertdialog"]',
    ),
  )

/** Side panel (or narrow-screen Sheet) listing searchable, collapsible filter editors per column. */
export function FilterPanel({
  columns,
  filters,
  openSections,
  enumCounts,
  columnQuery,
  inline,
  onColumnQueryChange,
  onToggleSection,
  onChangeFilters,
  onClose,
  onReturnFocus,
  nextId,
}: FilterPanelProps) {
  const baseId = useId()
  const [draftOps, setDraftOps] = useState<Record<string, FilterOp>>({})

  const subtitle = filterPanelSubtitle(filters.length)
  const visibleColumns = columns.filter((col) => matchesFilterColumnSearch(col, columnQuery))

  const handleClose = () => {
    onClose()
    onReturnFocus?.()
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (
      e.key === 'Escape' &&
      !e.defaultPrevented &&
      !(e.target instanceof Element && e.target.closest('[data-slot="select-content"]')) &&
      !hasOpenFloatingLayer()
    ) {
      e.preventDefault()
      e.stopPropagation()
      handleClose()
    }
  }

  const handleOpChange = (col: FilterColumn, nextOp: FilterOp) => {
    setDraftOps((prev) => ({ ...prev, [col.key]: nextOp }))
    const existing = filters.find((f) => f.key === col.key)
    if (nextOp === 'isEmpty') {
      onChangeFilters(upsertColumnFilter(filters, { key: col.key, op: 'isEmpty', value: '' }, nextId))
      return
    }
    if (!existing) return
    const nextValue =
      existing.op === 'isEmpty'
        ? col.type === 'enum'
          ? []
          : ''
        : col.type === 'enum'
          ? Array.isArray(existing.value)
            ? existing.value
            : []
          : (existing.value ?? '')
    const nextValue2 = nextOp === 'between' ? existing.value2 : undefined
    onChangeFilters(
      upsertColumnFilter(
        filters,
        { key: col.key, op: nextOp, value: nextValue, value2: nextValue2 },
        nextId,
      ),
    )
  }

  const handleClearColumn = (key: string) => {
    setDraftOps((prev) => {
      if (!(key in prev)) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
    onChangeFilters(clearColumnFilter(filters, key))
  }

  const handleClearAll = () => {
    setDraftOps({})
    onChangeFilters([])
  }

  const body = (
    <>
      <div className="flex items-start justify-between gap-2.5 border-b border-border px-3.5 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-7 flex-none items-center justify-center rounded-lg bg-[color-mix(in_oklab,var(--primary)_14%,transparent)] text-primary">
            <Funnel className="size-[14px]" strokeWidth={2} />
          </span>
          <div className="min-w-0">
            {/* In the Sheet the visible heading is the dialog's title, so it isn't announced twice. */}
            {inline ? (
              <h2 className="text-[13.5px] font-semibold leading-tight text-foreground">Filters</h2>
            ) : (
              <SheetTitle className="text-[13.5px] font-semibold leading-tight text-foreground">Filters</SheetTitle>
            )}
            {inline ? (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>
            ) : (
              <SheetDescription className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</SheetDescription>
            )}
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          title="Close (Esc)"
          aria-label="Close filters"
          onClick={handleClose}
          className="hover-lift flex-none text-muted-foreground hover:text-foreground"
        >
          <X className="size-[14px]" strokeWidth={2} />
        </Button>
      </div>

      <div className="sticky top-0 z-10 border-b border-border bg-card px-3 py-2.5">
        <div className="relative flex items-center">
          <Search className="pointer-events-none absolute left-2.5 size-[13px] text-muted-foreground" strokeWidth={2} />
          <Input
            value={columnQuery}
            onChange={(e) => onColumnQueryChange(e.target.value)}
            placeholder="Search filters"
            aria-label="Search filters"
            className={cn('h-8 rounded-lg pl-7 text-[12.5px] shadow-none', columnQuery && 'pr-7')}
          />
          {columnQuery && (
            <button
              type="button"
              aria-label="Clear filter search"
              onClick={() => onColumnQueryChange('')}
              className="absolute right-1.5 flex size-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-tint-10 hover:text-foreground"
            >
              <X className="size-3" strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {columns.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">No filters on this list.</p>
        ) : visibleColumns.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">
            No filters match “{columnQuery.trim()}”.
          </p>
        ) : (
          <div className="flex flex-col gap-0.5">
            {visibleColumns.map((col) => {
              const existing = filters.find((f) => f.key === col.key)
              const isOpen = openSections.has(col.key)
              const activeCount = activeFilterCountForColumn(filters, col.key)
              const op = existing?.op ?? draftOps[col.key] ?? defaultFilter(col, '').op
              const bodyId = `${baseId}-sec-${col.key}`
              const resolvedEnumCounts = col.type === 'enum' ? enumCounts[col.key] : undefined

              return (
                <section
                  key={col.key}
                  aria-label={col.label}
                  className="border-b border-border/60 py-1 last:border-b-0"
                >
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={bodyId}
                      onClick={() => onToggleSection(col.key)}
                      className="flex min-w-0 flex-1 items-center gap-2 rounded-[7px] px-2 py-1.5 text-left text-[12.5px] font-medium text-foreground transition-colors duration-[140ms] hover:bg-tint-7 focus-visible:outline-2 focus-visible:outline-ring"
                    >
                      <ChevronDown
                        className={cn(
                          'size-[13px] flex-none text-muted-foreground transition-transform duration-150',
                          !isOpen && '-rotate-90',
                        )}
                        strokeWidth={2}
                      />
                      <span className="min-w-0 flex-1 truncate">{col.label}</span>
                      {activeCount > 0 && (
                        <span className="tnum inline-flex h-[17px] min-w-[17px] flex-none items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--primary)_14%,transparent)] px-[5px] text-[10.5px] font-semibold text-primary">
                          {activeCount}
                        </span>
                      )}
                    </button>
                    {activeCount > 0 && (
                      <button
                        type="button"
                        title={`Clear ${col.label}`}
                        onClick={() => handleClearColumn(col.key)}
                        className="flex-none rounded-md px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-tint-10 hover:text-foreground"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {isOpen && (
                    <div id={bodyId} className="flex flex-col gap-2 px-2 pt-1 pb-2.5">
                      <Select value={op} onValueChange={(nextOp) => handleOpChange(col, nextOp as FilterOp)}>
                        <SelectTrigger size="sm" aria-label={`${col.label} condition`} className="w-full text-xs shadow-none">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent position="popper">
                          {OPS_BY_KIND[col.type].map((o) => (
                            <SelectItem key={o.op} value={o.op} className="text-xs">
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <FilterValueEditor
                        column={col}
                        op={op}
                        value={existing?.value ?? (col.type === 'enum' ? [] : '')}
                        value2={existing?.value2 ?? ''}
                        enumCounts={resolvedEnumCounts}
                        idPrefix={`${baseId}-${col.key}`}
                        variant="panel"
                        onChangeValue={(nextVal) =>
                          onChangeFilters(
                            upsertColumnFilter(
                              filters,
                              {
                                key: col.key,
                                op,
                                value: nextVal,
                                value2: op === 'between' ? (existing?.value2 ?? '') : undefined,
                              },
                              nextId,
                            ),
                          )
                        }
                        onChangeValue2={(nextVal2) =>
                          onChangeFilters(
                            upsertColumnFilter(
                              filters,
                              {
                                key: col.key,
                                op,
                                value: existing?.value ?? '',
                                value2: nextVal2,
                              },
                              nextId,
                            ),
                          )
                        }
                      />
                    </div>
                  )}
                </section>
              )
            })}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border bg-panel px-3 py-2.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={filters.length === 0}
          onClick={handleClearAll}
          className="hover-lift"
        >
          Clear all
        </Button>
        <Button type="button" size="sm" onClick={handleClose} className="hover-lift">
          Done
        </Button>
      </div>
    </>
  )

  if (inline) {
    return (
      <aside
        aria-label="Filters"
        onKeyDown={handleKeyDown}
        className="flex w-[320px] flex-none animate-sf-fade flex-col overflow-hidden rounded-[10px] border border-border bg-card"
      >
        {body}
      </aside>
    )
  }

  return (
    <Sheet
      open
      onOpenChange={(next) => {
        if (!next) handleClose()
      }}
    >
      <SheetContent
        side="right"
        showCloseButton={false}
        onCloseAutoFocus={(e) => {
          e.preventDefault()
          onReturnFocus?.()
        }}
        className="flex w-[320px] max-w-[calc(100vw-2rem)] flex-col gap-0 p-0 sm:max-w-[320px]"
      >
        {body}
      </SheetContent>
    </Sheet>
  )
}
