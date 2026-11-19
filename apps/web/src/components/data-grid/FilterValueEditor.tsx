import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { enumOptionsForColumn } from '@/domain/grid-filters'
import { cn } from '@/lib/utils'
import type { FilterColumn, FilterOp } from './model'

export interface FilterValueEditorProps {
  column: FilterColumn
  op: FilterOp
  value: string | string[] | undefined
  value2?: string
  /** Optional per-option counts computed over the current dataset rows. */
  enumCounts?: Record<string, number>
  /** Unique ID prefix so Checkbox labels remain scoped per host (chip vs panel). */
  idPrefix: string
  autoFocus?: boolean
  variant?: 'popover' | 'panel'
  onChangeValue: (next: string | string[]) => void
  onChangeValue2?: (next: string) => void
}

const compactInput = 'h-[30px] rounded-[7px] px-2 text-[12.5px] shadow-none'

/** Shared filter value editor used inside FilterChips popovers and FilterPanel sections. */
export function FilterValueEditor({
  column,
  op,
  value,
  value2 = '',
  enumCounts,
  idPrefix,
  autoFocus = false,
  variant = 'panel',
  onChangeValue,
  onChangeValue2,
}: FilterValueEditorProps) {
  if (op === 'isEmpty') {
    return (
      <p className="px-1 py-1 text-xs text-muted-foreground">
        Matches rows where {column.label.toLowerCase()} is empty.
      </p>
    )
  }

  if (column.type === 'enum') {
    const selected = Array.isArray(value) ? value : []
    const options = enumOptionsForColumn(column, enumCounts)
    return (
      <div className="flex flex-col gap-0.5">
        {variant === 'popover' && (
          <div className="px-[9px] py-[5px] text-[10px] font-semibold tracking-[0.05em] text-muted-foreground">
            VALUES
          </div>
        )}
        {options.length === 0 ? (
          <p className="px-2 py-1.5 text-xs text-muted-foreground">No values available.</p>
        ) : (
          options.map((option, index) => {
            const on = selected.includes(option)
            const checkId = `${idPrefix}-${index}`
            const count = enumCounts?.[option]
            return (
              <div
                key={option}
                className={cn(
                  'flex items-center gap-2 rounded-[7px] px-[9px] py-[5px] text-[12.5px] text-foreground transition-colors duration-[140ms] hover:bg-tint-10',
                  on && 'bg-tint-7 font-medium',
                )}
              >
                <Checkbox
                  id={checkId}
                  checked={on}
                  onCheckedChange={() =>
                    onChangeValue(on ? selected.filter((v) => v !== option) : [...selected, option])
                  }
                />
                <label htmlFor={checkId} className="min-w-0 flex-1 cursor-pointer truncate select-none">
                  {option}
                </label>
                {count !== undefined && (
                  <span className="tnum flex-none text-[11px] text-muted-foreground">{count}</span>
                )}
              </div>
            )
          })
        )}
      </div>
    )
  }

  if (op === 'between') {
    const isDate = column.type === 'date'
    const isPopover = variant === 'popover'
    return (
      <div className={cn('flex items-center gap-1.5', isPopover && 'p-[5px]')}>
        <Input
          autoFocus={autoFocus}
          type={isDate ? 'date' : 'text'}
          inputMode={isDate ? undefined : 'decimal'}
          placeholder={isPopover ? 'Min' : 'From'}
          aria-label={isPopover ? 'Minimum' : `${column.label} from`}
          className={compactInput}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChangeValue(e.target.value)}
        />
        <span className="flex-none text-xs text-muted-foreground">{isPopover ? '–' : 'to'}</span>
        <Input
          type={isDate ? 'date' : 'text'}
          inputMode={isDate ? undefined : 'decimal'}
          placeholder={isPopover ? 'Max' : 'To'}
          aria-label={isPopover ? 'Maximum' : `${column.label} to`}
          className={compactInput}
          value={value2}
          onChange={(e) => onChangeValue2?.(e.target.value)}
        />
      </div>
    )
  }

  const isDate = column.type === 'date'
  const isNum = column.type === 'num'
  return (
    <div className={cn(variant === 'popover' && 'p-[5px]')}>
      <Input
        autoFocus={autoFocus}
        type={isDate ? 'date' : 'text'}
        inputMode={isNum ? 'decimal' : undefined}
        placeholder={isDate ? undefined : 'Enter value…'}
        aria-label={`${column.label} value`}
        className={compactInput}
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => onChangeValue(e.target.value)}
      />
    </div>
  )
}
