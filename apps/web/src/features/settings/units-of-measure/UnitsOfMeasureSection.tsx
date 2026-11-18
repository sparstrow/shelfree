import { Lock, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { HelpTarget } from '@/components/help/HelpTarget'
import { SettingsPage } from '@/components/settings/SettingsPage'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu'
import { StatusPill } from '@/components/StatusPill'
import { useList, useRemove, useUpsert } from '@/data/queries'
import { isTypingTarget } from '@/lib/keyboard'
import {
  UOM_CATEGORIES,
  type Uom,
  allUnits,
  categoryName,
  countByUnit,
  deleteBlockReason,
  filterUnits,
  uqcLabel,
} from '@/domain/units-of-measure'
import { cn } from '@/lib/utils'
import { UOM_HELP } from './help'
import { UnitDialog } from './UnitDialog'

const OPEN_LAYER = '[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"], [data-slot="popover-content"]'

type Dialogs = { kind: 'form'; unit: Uom | null } | { kind: 'delete'; unit: Uom } | null

const chipClass =
  'hover-lift inline-flex h-7 items-center rounded-full border border-border bg-card px-3 text-[12.5px] font-medium text-muted-foreground hover:bg-tint-12 hover:text-foreground aria-pressed:border-transparent aria-pressed:bg-primary aria-pressed:text-new-btn-fg'

function Th({ children, help }: { children: string; help?: string }) {
  return (
    <th scope="col" className="group/row sticky top-0 z-10 h-9 border-b border-border bg-card px-3 text-left text-[11.5px] font-semibold text-muted-foreground">
      {help ? (
        <HelpTarget help={UOM_HELP[help]} label={children}>
          {children}
        </HelpTarget>
      ) : (
        children
      )}
    </th>
  )
}

/** Settings ▸ Configuration ▸ Units of measure (`/settings/uom`). */
export function UnitsOfMeasureSection() {
  const custom = useList('unitsOfMeasure')
  const items = useList('items')
  const upsert = useUpsert('unitsOfMeasure')
  const remove = useRemove('unitsOfMeasure')
  const [cat, setCat] = useState('all')
  const [query, setQuery] = useState('')
  const [active, setActive] = useState<string | null>(null)
  const [dialog, setDialog] = useState<Dialogs>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const all = useMemo(() => allUnits(custom.data ?? []), [custom.data])
  const used = useMemo(() => countByUnit(items.data ?? []), [items.data])
  const rows = useMemo(() => filterUnits(all, { cat, query }), [all, cat, query])
  const activeUnit = rows.find((u) => u.code === active)
  const loading = custom.isLoading || items.isLoading

  const blockedReason = (u: Uom) => deleteBlockReason(u, used.get(u.code) ?? 0)
  const askDelete = (u: Uom) => {
    const reason = blockedReason(u)
    if (reason) return void toast.error(`${u.code} can’t be deleted`, { description: reason })
    setDialog({ kind: 'delete', unit: u })
  }
  const openEdit = (u: Uom) => {
    if (!u.custom) return void toast(`${u.code} is a default unit`, { description: 'Default units are locked so GST reporting stays correct.' })
    setDialog({ kind: 'form', unit: u })
  }

  const save = async (unit: Uom, previousCode: string | null) => {
    const editing = dialog?.kind === 'form' && dialog.unit !== null
    if (previousCode) await remove.mutateAsync(previousCode)
    await upsert.mutateAsync({ ...unit, custom: true })
    setActive(unit.code)
    setDialog(null)
    toast.success(editing ? 'Unit updated' : 'Unit added', { description: `${unit.code} · ${unit.name}` })
  }

  const confirmDelete = async (u: Uom) => {
    setDialog(null)
    await remove.mutateAsync(u.code)
    setActive(null)
    toast('Unit deleted', {
      description: `${u.code} removed`,
      action: { label: 'Undo', onClick: () => void upsert.mutateAsync({ ...u, custom: true }) },
    })
  }

  // N new · / search · E, Enter edit · Delete delete · ↑ / ↓ move.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target) || document.querySelector(OPEN_LAYER)) return
      const key = e.key.toLowerCase()
      const index = rows.findIndex((u) => u.code === active)
      if (key === 'n') {
        e.preventDefault()
        setDialog({ kind: 'form', unit: null })
      } else if (e.key === '/') {
        e.preventDefault()
        searchRef.current?.focus()
      } else if ((key === 'e' || e.key === 'Enter') && activeUnit) {
        e.preventDefault()
        openEdit(activeUnit)
      } else if (e.key === 'Delete' && activeUnit) {
        e.preventDefault()
        askDelete(activeUnit)
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        const next = rows[Math.max(0, Math.min(rows.length - 1, index + (e.key === 'ArrowDown' ? 1 : -1)))]
        if (next) {
          setActive(next.code)
          document.querySelector(`[data-unit="${next.code}"]`)?.scrollIntoView({ block: 'nearest' })
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <SettingsPage
      title="Units of measure"
      help={UOM_HELP.page}
      count={all.length}
      width="wide"
      isLoading={loading}
      error={custom.error ?? items.error}
      onRetry={() => void custom.refetch()}
      actions={
        <button
          type="button"
          onClick={() => setDialog({ kind: 'form', unit: null })}
          title="New unit (N)"
          className="hover-lift inline-flex h-[34px] items-center gap-[7px] rounded-lg border-0 bg-primary px-[14px] text-[13px] font-semibold text-new-btn-fg shadow-base hover:bg-primary-hover"
        >
          <Plus className="size-[15px]" strokeWidth={2.4} />
          New unit
        </button>
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Category" className="flex flex-wrap gap-1.5">
          <button type="button" aria-pressed={cat === 'all'} onClick={() => setCat('all')} className={chipClass}>
            All
          </button>
          {UOM_CATEGORIES.map((c) => (
            <button key={c.id} type="button" aria-pressed={cat === c.id} onClick={() => setCat(c.id)} className={chipClass}>
              {c.name}
            </button>
          ))}
        </div>
        <label className="relative ml-auto flex h-8 w-full items-center sm:w-[220px]">
          <Search className="pointer-events-none absolute left-2.5 size-[14px] text-muted-foreground" strokeWidth={2} />
          <input
            ref={searchRef}
            type="search"
            aria-label="Search units"
            placeholder="Search units"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape' && query) {
                e.preventDefault()
                setQuery('')
              }
            }}
            className="h-8 w-full rounded-lg border border-input bg-transparent pr-2.5 pl-8 text-[13px] text-foreground outline-none transition-colors duration-[140ms] placeholder:text-muted-foreground hover:border-ring/60 focus:border-ring"
          />
        </label>
      </div>

      <div className="max-h-[calc(100vh-290px)] min-h-[200px] overflow-auto rounded-xl border border-border bg-card">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              <Th>Code</Th>
              <Th>Name</Th>
              <Th help="cat">Category</Th>
              <Th help="uqc">GST UQC</Th>
              <Th help="conv">Conversion</Th>
              <Th>Symbol</Th>
              <Th help="src">Source</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <ContextMenu key={u.code}>
                <ContextMenuTrigger asChild>
                  <tr
                    data-unit={u.code}
                    aria-selected={u.code === active}
                    onClick={() => setActive(u.code)}
                    onDoubleClick={() => openEdit(u)}
                    onContextMenu={() => setActive(u.code)}
                    className={cn(
                      'cursor-default border-b border-border transition-colors duration-[120ms] last:border-b-0 hover:bg-row-hover',
                      u.code === active && 'bg-row-sel hover:bg-row-sel',
                    )}
                  >
                    <td className="h-9 px-3 font-mono text-xs font-semibold">{u.code}</td>
                    <td className="px-3">{u.name}</td>
                    <td className="px-3 text-muted-foreground">{categoryName(u.cat)}</td>
                    <td className="px-3 font-mono text-xs">{uqcLabel(u.uqc)}</td>
                    <td className="tnum px-3 text-muted-foreground">{u.conv}</td>
                    <td className="px-3 text-muted-foreground">{u.sym || '—'}</td>
                    <td className="px-3">
                      {u.custom ? (
                        <StatusPill label="Custom" tone="info" />
                      ) : (
                        <StatusPill label="Default" tone="neutral" icon={<Lock className="size-3" strokeWidth={2.2} />} />
                      )}
                    </td>
                  </tr>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-[190px]">
                  <ContextMenuItem onSelect={() => openEdit(u)} disabled={!u.custom}>
                    <Pencil className="size-3.5" strokeWidth={2} />
                    Edit
                  </ContextMenuItem>
                  <ContextMenuItem variant="destructive" onSelect={() => askDelete(u)} disabled={!!blockedReason(u)} title={blockedReason(u) ?? undefined}>
                    <Trash2 className="size-3.5" strokeWidth={2} />
                    Delete
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="h-24 text-center text-muted-foreground">
                  No units match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {dialog?.kind === 'form' && (
        <UnitDialog
          unit={dialog.unit}
          all={all}
          itemsUsing={dialog.unit ? (used.get(dialog.unit.code) ?? 0) : 0}
          onClose={() => setDialog(null)}
          onSave={save}
        />
      )}
      <ConfirmDialog
        open={dialog?.kind === 'delete'}
        title={dialog?.kind === 'delete' ? `Delete ${dialog.unit.code}?` : 'Delete unit?'}
        description={dialog?.kind === 'delete' ? `${dialog.unit.code} · ${dialog.unit.name} will be removed. No item uses it.` : ''}
        confirmLabel="Delete"
        danger
        onConfirm={() => dialog?.kind === 'delete' && void confirmDelete(dialog.unit)}
        onCancel={() => setDialog(null)}
      />
    </SettingsPage>
  )
}
