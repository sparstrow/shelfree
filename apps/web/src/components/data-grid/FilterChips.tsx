import { Check, ChevronDown, X } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { FilterValueEditor } from './FilterValueEditor'
import { type FilterColumn, type GridFilter, OPS_BY_KIND, opLabel } from './model'

const menuItem =
  'flex w-full items-center gap-2 rounded-[7px] border-0 bg-transparent px-[9px] py-[6px] text-left text-[12.5px] text-foreground transition-colors duration-[140ms] hover:bg-tint-10'
const chipButton =
  'inline-flex h-5 items-center gap-[3px] rounded-[5px] border-0 bg-transparent px-1.5 text-xs whitespace-nowrap transition-colors duration-[140ms] hover:bg-[color-mix(in_oklab,var(--primary)_20%,transparent)]'

function valueLabel(filter: GridFilter): string {
  if (Array.isArray(filter.value)) {
    if (filter.value.length === 0) return 'choose…'
    return filter.value.length <= 2 ? filter.value.join(', ') : `${filter.value.length} selected`
  }
  if (filter.op === 'between') return `${filter.value || '…'} – ${filter.value2 || '…'}`
  return filter.value ? String(filter.value) : 'enter value…'
}

export interface FilterChipsProps {
  filters: GridFilter[]
  columns: FilterColumn[]
  onChange: (filters: GridFilter[]) => void
}

/** The active-filter row: one editable chip per filter (column · condition · value). */
export function FilterChips({ filters, columns, onChange }: FilterChipsProps) {
  if (filters.length === 0) return null
  const patch = (id: string, next: Partial<GridFilter>) =>
    onChange(filters.map((f) => (f.id === id ? { ...f, ...next } : f)))

  return (
    <div className="flex flex-wrap items-center gap-[7px] px-5 pb-[11px]">
      <span className="text-[11px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">Filters</span>
      {filters.map((filter) => {
        const column = columns.find((c) => c.key === filter.key)
        if (!column) return null
        return (
          <span
            key={filter.id}
            className="inline-flex h-[26px] animate-sf-fade items-center rounded-[7px] border border-border bg-muted pr-1"
          >
            <span className="pr-0.5 pl-[7px] text-xs whitespace-nowrap text-muted-foreground">{column.label}</span>
            <span className="mx-px my-[3px] w-px flex-none self-stretch bg-border" />
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" title="Change condition" className={cn(chipButton, 'text-muted-foreground hover:text-foreground')}>
                  {opLabel(column.type, filter.op)}
                  <ChevronDown className="size-[9px] opacity-50" strokeWidth={2.6} />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto min-w-[150px] rounded-[10px] p-1.5">
                <div className="px-[9px] py-[5px] text-[10px] font-semibold tracking-[0.05em] text-muted-foreground">
                  CONDITION
                </div>
                {OPS_BY_KIND[column.type].map((o) => (
                  <button key={o.op} type="button" className={menuItem} onClick={() => patch(filter.id, { op: o.op })}>
                    <span className="flex-1 whitespace-nowrap">{o.label}</span>
                    {filter.op === o.op && <Check className="size-[13px] text-primary" strokeWidth={2.6} />}
                  </button>
                ))}
              </PopoverContent>
            </Popover>
            {filter.op !== 'isEmpty' && (
              <>
                <span className="mx-px my-[3px] w-px flex-none self-stretch bg-border" />
                <Popover>
                  <PopoverTrigger asChild>
                    <button type="button" title="Edit value" className={cn(chipButton, 'font-semibold text-foreground')}>
                      {valueLabel(filter)}
                      <ChevronDown className="size-[9px] opacity-50" strokeWidth={2.6} />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-auto min-w-[190px] rounded-[10px] p-1.5">
                    <FilterValueEditor
                      column={column}
                      op={filter.op}
                      value={filter.value}
                      value2={filter.value2}
                      idPrefix={`chip-${filter.id}`}
                      autoFocus
                      variant="popover"
                      onChangeValue={(value) => patch(filter.id, { value })}
                      onChangeValue2={(value2) => patch(filter.id, { value2 })}
                    />
                  </PopoverContent>
                </Popover>
              </>
            )}
            <button
              type="button"
              title="Remove filter"
              aria-label={`Remove ${column.label} filter`}
              onClick={() => onChange(filters.filter((f) => f.id !== filter.id))}
              className="ml-px flex size-[18px] flex-none items-center justify-center rounded-[5px] border-0 bg-transparent text-muted-foreground transition-colors duration-[140ms] hover:bg-tint-14 hover:text-foreground"
            >
              <X className="size-[11px]" strokeWidth={2.4} />
            </button>
          </span>
        )
      })}
      <button
        type="button"
        onClick={() => onChange([])}
        className="h-[26px] rounded-[7px] border-0 bg-transparent px-[9px] text-xs font-medium text-muted-foreground transition-colors duration-[140ms] hover:bg-tint-16 hover:text-foreground"
      >
        Clear all
      </button>
    </div>
  )
}
