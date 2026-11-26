import { Minus, Plus } from 'lucide-react'
import { HelpTarget } from '@/components/help/HelpTarget'
import type { Floor } from '@/data/schemas'
import { FLOOR_CODE_MAX, floorRemoveBlockReason, newFloor } from '@/domain/location-layouts'
import { cn } from '@/lib/utils'
import { LOCATIONS_HELP } from './help'

const ROW = 'grid grid-cols-[64px_1fr_72px_32px] items-center gap-2'
const BOX = 'flex h-8 min-w-0 items-center rounded-lg border px-[10px] text-[13px] transition-colors duration-[140ms]'

/**
 * The floors of a site in the drawer. Edit in place: the same rows in view and edit, a value swaps for an
 * input in its own box. A floor with areas can't be removed (the areas are placed when the site is set up);
 * the Areas column is read-only text in both modes.
 */
export function FloorsEditor({
  floors,
  areaCounts,
  editing,
  error,
  onChange,
}: {
  floors: readonly Floor[]
  /** Areas per floor id. */
  areaCounts: Readonly<Record<string, number>>
  editing: boolean
  error?: string
  onChange?: (floors: Floor[]) => void
}) {
  const set = (i: number, patch: Partial<Floor>) => onChange?.(floors.map((f, j) => (j === i ? { ...f, ...patch } : f)))
  return (
    <section aria-label="Floors" className="mt-4">
      <div className="mb-1 flex items-center">
        <HelpTarget help={LOCATIONS_HELP.floors} reveal="always" noInline>
          <span className="text-[10px] font-semibold tracking-[0.07em] text-muted-foreground uppercase">Floors</span>
        </HelpTarget>
      </div>
      <div className={cn(ROW, 'pb-1 text-[10px] font-semibold tracking-[0.07em] text-muted-foreground uppercase')}>
        <span>Code</span>
        <span>Name</span>
        <span className="text-right">Areas</span>
        <span />
      </div>
      {floors.map((f, i) => {
        const areas = areaCounts[f.id] ?? 0
        const blocked = floorRemoveBlockReason(f, areas)
        return (
          <div key={f.id} data-floor={f.code} className={cn(ROW, 'border-b border-dashed border-border py-1')}>
            {editing ? (
              <input
                aria-label={`Floor ${i + 1} code`}
                aria-invalid={error ? true : undefined}
                value={f.code}
                maxLength={FLOOR_CODE_MAX}
                onChange={(e) => set(i, { code: e.target.value.toUpperCase() })}
                className={cn(BOX, 'w-full border-input bg-transparent font-mono outline-none focus:border-ring', error && 'border-bad-fg')}
              />
            ) : (
              <span className={cn(BOX, 'border-transparent font-mono')}>{f.code}</span>
            )}
            {editing ? (
              <input
                aria-label={`Floor ${i + 1} name`}
                value={f.name}
                onChange={(e) => set(i, { name: e.target.value })}
                className={cn(BOX, 'w-full border-input bg-transparent outline-none focus:border-ring')}
              />
            ) : (
              <span className={cn(BOX, 'border-transparent')}>{f.name}</span>
            )}
            <span className="text-right text-[13px] text-muted-foreground tabular-nums">{areas}</span>
            {editing && floors.length > 1 ? (
              <button
                type="button"
                aria-label={`Remove floor ${i + 1}`}
                title={blocked ?? 'Remove floor'}
                disabled={!!blocked}
                onClick={() => onChange?.(floors.filter((_, j) => j !== i))}
                className="hover-lift inline-flex size-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:bg-tint-12 hover:text-foreground disabled:opacity-40"
              >
                <Minus className="size-[14px]" strokeWidth={2} />
              </button>
            ) : (
              <span />
            )}
          </div>
        )
      })}
      {editing && error && (
        <p role="alert" className="m-0 mt-1.5 text-[12px] text-bad-fg">
          {error}
        </p>
      )}
      {editing && (
        <button
          type="button"
          onClick={() => onChange?.([...floors, newFloor(floors)])}
          className="hover-lift mt-2 inline-flex h-8 items-center gap-1.5 rounded-lg border border-dashed border-border bg-transparent px-3 text-[12.5px] font-medium text-muted-foreground hover:bg-tint-12 hover:text-foreground"
        >
          <Plus className="size-[14px]" strokeWidth={2.2} />
          Add floor
        </button>
      )}
    </section>
  )
}
