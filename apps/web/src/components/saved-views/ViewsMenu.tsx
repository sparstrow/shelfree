import { Bookmark, Check, ChevronDown, Copy, Pencil, Plus, Save, Star, X } from 'lucide-react'
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import type { GridView } from '@/components/data-grid/model'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { SavedView } from '@/data/schemas'
import { cn } from '@/lib/utils'

const triggerClass =
  'hover-lift inline-flex h-8 items-center gap-[7px] rounded-lg border border-input bg-transparent px-[11px] text-[13px] font-medium text-foreground hover:bg-[color-mix(in_oklab,var(--foreground)_8%,transparent)] data-[state=open]:border-[color-mix(in_oklab,var(--primary)_50%,transparent)]'

const rowItem =
  'min-w-0 flex-1 gap-2 rounded-[7px] px-[9px] py-[7px] text-[12.5px] text-foreground focus:bg-tint-10 focus:text-foreground'
const iconItem =
  'size-6 flex-none justify-center rounded-md p-0 text-muted-foreground transition-[background-color,color,opacity,scale] duration-[140ms] hover:scale-110 focus:bg-tint-12 focus:text-foreground'
/** Row buttons that only show on hover / focus, unless they are switched on. */
const quiet = 'opacity-0 group-focus-within/row:opacity-100 group-hover/row:opacity-100'
const footerItem =
  'gap-2 rounded-[7px] px-[9px] py-[7px] text-[12.5px] font-medium whitespace-nowrap text-foreground focus:bg-tint-16 focus:text-foreground'
const head = 'px-2 pt-1.5 pb-[5px] text-[10.5px] font-semibold tracking-[0.06em] text-muted-foreground'

export interface ViewsMenuProps {
  builtIn: GridView[]
  saved: SavedView[]
  /** Id of the view the grid is showing (built-in or saved). */
  activeId: string
  /** Name on the trigger button. */
  label: string
  /** The grid has moved away from the active view. */
  dirty: boolean
  /** Bump to open the menu straight on the "save as" box (the keyboard shortcut). */
  saveSignal: number
  isFavorite: (view: SavedView) => boolean
  onApplyBuiltIn: (id: string) => void
  onApplySaved: (view: SavedView) => void
  onSaveAs: (name: string) => Promise<unknown>
  onUpdate: (view: SavedView) => void
  onRename: (view: SavedView, name: string) => void
  onDuplicate: (view: SavedView) => void
  onToggleDefault: (view: SavedView) => void
  onToggleFavorite: (view: SavedView) => void
  onDelete: (view: SavedView) => void
  /** Pin a built-in view (makes a private copy that the favourite points at). */
  onPinBuiltIn: (view: GridView) => void
  /** Settings ▸ Favorites & views off: no pin / star actions (default on). */
  pinsEnabled?: boolean
  /** Optional controlled open state (used by DataGrid to coordinate popovers and side panels). */
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

/** A row button: a real menu item (reachable with the arrow keys) that keeps the menu open. */
function RowAction({
  label,
  title,
  className,
  onRun,
  children,
  pressed,
  danger,
}: {
  label: string
  title: string
  className?: string
  onRun: () => void
  children: ReactNode
  pressed?: boolean
  danger?: boolean
}) {
  return (
    <DropdownMenuItem
      asChild
      onSelect={(e) => {
        e.preventDefault()
        onRun()
      }}
    >
      <button
        type="button"
        title={title}
        aria-label={label}
        aria-pressed={pressed}
        className={cn(
          iconItem,
          'flex items-center border-0 bg-transparent',
          danger && 'focus:bg-bad-bg focus:text-bad-fg hover:text-bad-fg',
          className,
        )}
      >
        {children}
      </button>
    </DropdownMenuItem>
  )
}

/** A name box inside the menu. Keys stay in the box (the menu's type-ahead would steal focus). */
function NameBox({
  label,
  value,
  onChange,
  onEnter,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  onEnter: () => void
  placeholder?: string
}) {
  return (
    <input
      autoFocus
      aria-label={label}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Escape') return // the menu handles Esc (backs out of naming first)
        e.stopPropagation()
        if (e.key === 'Enter') {
          e.preventDefault()
          onEnter()
        }
      }}
      className="h-[30px] min-w-0 flex-1 rounded-[7px] border border-input bg-transparent px-[9px] text-[12.5px] text-foreground outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground focus:border-ring focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--primary)_20%,transparent)]"
    />
  )
}

/** The Views menu of the list toolbar: built-in views, the user's saved views, save / update. */
export function ViewsMenu(p: ViewsMenuProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newName, setNewName] = useState('')
  const [renaming, setRenaming] = useState<{ id: string; value: string } | null>(null)
  const activeSaved = p.saved.find((v) => v.id === p.activeId)

  const controlled = p.open !== undefined
  const open = p.open ?? internalOpen
  const onOpenChange = p.onOpenChange
  const setOpen = useCallback(
    (next: boolean) => {
      if (!controlled) setInternalOpen(next)
      onOpenChange?.(next)
    },
    [controlled, onOpenChange],
  )

  const reset = () => {
    setSaving(false)
    setNewName('')
    setRenaming(null)
  }

  // The "save as" shortcut opens the menu with the name box ready.
  // Opens "Save as" once per new save signal (Shift+save key); re-renders never reopen it.
  const lastSignal = useRef(p.saveSignal)
  useEffect(() => {
    if (p.saveSignal === lastSignal.current) return
    lastSignal.current = p.saveSignal
    setOpen(true)
    setRenaming(null)
    setSaving(true)
  }, [p.saveSignal, setOpen])

  const submitSave = async () => {
    const saved = await p.onSaveAs(newName)
    if (saved) {
      reset()
      setOpen(false)
    }
  }

  const commitRename = (view: SavedView) => {
    const value = renaming?.id === view.id ? renaming.value.trim() : ''
    setRenaming(null)
    if (value && value !== view.name) p.onRename(view, value)
  }

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) reset()
      }}
    >
      <DropdownMenuTrigger asChild>
        <button type="button" className={triggerClass} title="Saved views">
          <Bookmark className="size-[13px] text-muted-foreground" strokeWidth={2} />
          {p.label}
          {p.dirty && (
            <span
              role="img"
              aria-label="Unsaved changes"
              title="Changed since this view was applied"
              className="size-1.5 flex-none rounded-full bg-primary"
            />
          )}
          <ChevronDown className="size-[11px] opacity-70" strokeWidth={2} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        onEscapeKeyDown={(e) => {
          // Esc backs out of naming first, then closes the menu.
          if (saving || renaming) {
            e.preventDefault()
            reset()
          }
        }}
        className="w-[340px] rounded-[10px] bg-card p-1.5"
      >
        <DropdownMenuLabel className={head}>VIEWS</DropdownMenuLabel>
        {p.builtIn.map((view) => (
          <div key={view.id} role="group" aria-label={view.name} className="group/row flex items-center gap-0.5 rounded-[7px] hover:bg-tint-7">
            <DropdownMenuItem className={rowItem} onSelect={() => p.onApplyBuiltIn(view.id)}>
              <Bookmark className="size-[13px] flex-none opacity-70" strokeWidth={2} />
              <span className="min-w-0 flex-1 truncate">{view.name}</span>
              {view.id === p.activeId && <Check className="size-[13px] flex-none text-primary" strokeWidth={2.6} />}
            </DropdownMenuItem>
            {p.pinsEnabled !== false && (
              <RowAction
                label="Pin to favorites"
                title="Pin to favorites"
                className={quiet}
                onRun={() => p.onPinBuiltIn(view)}
              >
                <Star className="size-3" strokeWidth={2} />
              </RowAction>
            )}
          </div>
        ))}

        {p.saved.length > 0 && <DropdownMenuLabel className={cn(head, 'pt-2.5')}>MY VIEWS</DropdownMenuLabel>}
        {p.saved.map((view) => {
          const fav = p.isFavorite(view)
          if (renaming?.id === view.id) {
            return (
              <div key={view.id} className="flex p-1">
                <NameBox
                  label={`Rename ${view.name}`}
                  value={renaming.value}
                  onChange={(value) => setRenaming({ id: view.id, value })}
                  onEnter={() => commitRename(view)}
                />
              </div>
            )
          }
          return (
            <div key={view.id} role="group" aria-label={view.name} className="group/row flex items-center gap-0.5 rounded-[7px] hover:bg-tint-7">
              <DropdownMenuItem
                className={cn(rowItem, view.id === p.activeId && 'font-semibold')}
                onSelect={() => p.onApplySaved(view)}
              >
                <Bookmark className="size-[13px] flex-none opacity-70" strokeWidth={2} />
                <span className="min-w-0 flex-1 truncate">{view.name}</span>
                {view.id === p.activeId && <Check className="size-[13px] flex-none text-primary" strokeWidth={2.6} />}
              </DropdownMenuItem>
              <RowAction
                label={view.isDefaultFor ? 'Clear default' : 'Make default'}
                title={view.isDefaultFor ? 'Default view — click to clear' : 'Open this page with this view'}
                pressed={view.isDefaultFor}
                className={view.isDefaultFor ? 'text-primary opacity-100' : quiet}
                onRun={() => p.onToggleDefault(view)}
              >
                <Check className="size-3" strokeWidth={2.4} />
              </RowAction>
              {p.pinsEnabled !== false && (
              <RowAction
                label={fav ? 'Unpin from favorites' : 'Pin to favorites'}
                title={fav ? 'Unpin from favorites' : 'Pin to favorites'}
                pressed={fav}
                className={fav ? 'text-primary opacity-100' : quiet}
                onRun={() => p.onToggleFavorite(view)}
              >
                <Star className="size-3" strokeWidth={fav ? 1.4 : 2} fill={fav ? 'currentColor' : 'none'} />
              </RowAction>
              )}
              <RowAction
                label="Rename"
                title="Rename view"
                className={quiet}
                onRun={() => setRenaming({ id: view.id, value: view.name })}
              >
                <Pencil className="size-3" strokeWidth={2} />
              </RowAction>
              <RowAction label="Duplicate" title="Duplicate view" className={quiet} onRun={() => p.onDuplicate(view)}>
                <Copy className="size-3" strokeWidth={2} />
              </RowAction>
              {/* Closes the menu: an open menu blocks the Undo button of the toast that follows. */}
              <RowAction
                label="Delete"
                title="Delete view"
                danger
                className={quiet}
                onRun={() => {
                  setOpen(false)
                  p.onDelete(view)
                }}
              >
                <X className="size-3" strokeWidth={2} />
              </RowAction>
            </div>
          )
        })}

        <DropdownMenuSeparator className="mx-1 my-1.5" />
        {!saving ? (
          <>
            {activeSaved && (
              <DropdownMenuItem className={footerItem} onSelect={() => p.onUpdate(activeSaved)}>
                <Save className="size-[13px]" strokeWidth={2} />
                Save changes to this view
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              className={footerItem}
              onSelect={(e) => {
                e.preventDefault()
                setSaving(true)
              }}
            >
              <Plus className="size-[13px]" strokeWidth={2} />
              Save as new view
            </DropdownMenuItem>
          </>
        ) : (
          <div className="flex gap-1.5 p-1">
            <NameBox label="View name" placeholder="View name" value={newName} onChange={setNewName} onEnter={() => void submitSave()} />
            <button
              type="button"
              onClick={() => void submitSave()}
              className="hover-lift h-[30px] flex-none rounded-[7px] border-0 bg-primary px-3 text-[12.5px] font-semibold text-primary-foreground hover:bg-primary-hover"
            >
              Save
            </button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
