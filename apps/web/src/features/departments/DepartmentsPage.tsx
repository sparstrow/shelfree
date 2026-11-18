import { useRouter } from '@tanstack/react-router'
import { ExternalLink, Search, Star } from 'lucide-react'
import { type MouseEvent, useEffect, useMemo, useRef, useState } from 'react'
import { ModuleIcon, PathIcon } from '@/app/icons'
import { ICON_STAR, MODULES } from '@/app/nav'
import { TopBar } from '@/app/shell/TopBar'
import { describePath } from '@/app/shell/use-active-page'
import { useUi } from '@/app/stores/ui'
import { useFavoriteActions } from '@/components/saved-views/use-favorite-actions'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { useWorkspace } from '@/data/queries/session'
import {
  type DepartmentPageEntry,
  buildDepartmentBlocks,
  clampDepartmentFocus,
  flattenDepartmentBlocks,
  stepDepartmentFocus,
} from '@/domain/departments'
import { isTypingTarget } from '@/lib/keyboard'
import { useLatestCallback } from '@/lib/use-latest-callback'
import { cn } from '@/lib/utils'

function StarGlyph({ on }: { on: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill={on ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={on ? 1.4 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={ICON_STAR} />
    </svg>
  )
}

interface RecentPageChip {
  path: string
  label: string
  moduleName: string
  icon: string
}

/** Whole-app page directory grouped by module, derived from the sidebar registry. */
export function DepartmentsPage() {
  const router = useRouter()
  const workspace = useWorkspace().data
  const favoriteActions = useFavoriteActions()
  const recents = useUi((s) => s.recents)
  const openTab = useUi((s) => s.openTab)

  const [query, setQuery] = useState('')
  const [focusIdx, setFocusIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const rowRefs = useRef(new Map<string, HTMLButtonElement>())

  const blocks = useMemo(() => buildDepartmentBlocks(MODULES, query), [query])
  const flat = useMemo(() => flattenDepartmentBlocks(blocks), [blocks])
  const activeFocusIdx = clampDepartmentFocus(focusIdx, flat.length)
  const focusedKey = activeFocusIdx >= 0 ? flat[activeFocusIdx].key : ''

  const recentChips = useMemo<RecentPageChip[]>(() => {
    const out: RecentPageChip[] = []
    for (const path of recents) {
      const at = describePath(path)
      if (at.kind === 'page' && at.rest.length === 0) {
        out.push({ path, label: at.page.label, moduleName: at.module.name, icon: at.page.icon })
        if (out.length >= 5) break
      }
    }
    return out
  }, [recents])

  const openEntry = (entry: DepartmentPageEntry, newTab = false) => {
    if (newTab) openTab(entry.path)
    router.history.push(entry.path)
  }

  const isFav = (entry: DepartmentPageEntry) =>
    !!favoriteActions.pageFavorite(entry.moduleId, entry.slug)

  const moveFocus = (nextIdx: number) => {
    setFocusIdx(nextIdx)
    const target = flat[nextIdx]
    if (target) rowRefs.current.get(target.key)?.scrollIntoView?.({ block: 'nearest' })
  }

  const onWindowKeyDown = useLatestCallback((e: globalThis.KeyboardEvent) => {
    if (document.querySelector('[role="dialog"], [role="menu"], [role="listbox"]')) return
    const inFilterInput = e.target === inputRef.current
    const typing = isTypingTarget(e.target)
    if (typing && !inFilterInput) return

    const mod = e.metaKey || e.ctrlKey
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (flat.length === 0) return
      e.preventDefault()
      moveFocus(stepDepartmentFocus(flat, activeFocusIdx, e.key))
      return
    }
    if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && !inFilterInput && !mod && !e.altKey) {
      if (flat.length === 0) return
      e.preventDefault()
      moveFocus(stepDepartmentFocus(flat, activeFocusIdx, e.key))
      return
    }
    if (e.key === 'Enter') {
      const target = flat[activeFocusIdx]
      if (!target) return
      // Let focused buttons/links handle Enter themselves unless the filter input is focused.
      if (!inFilterInput && e.target instanceof HTMLElement && e.target.closest('button, a')) return
      e.preventDefault()
      openEntry(target, mod)
      return
    }
    if (!inFilterInput && !mod && !e.altKey && e.shiftKey && e.key.toLowerCase() === 's') {
      const target = flat[activeFocusIdx]
      if (!target) return
      e.preventDefault()
      favoriteActions.togglePage(target.moduleId, target.slug, target.label)
      return
    }
    if (e.key === 'Escape' && query.trim()) {
      e.preventDefault()
      setQuery('')
      setFocusIdx(0)
      return
    }
    if (!typing && !mod && !e.altKey && /^[a-z0-9]$/i.test(e.key)) {
      e.preventDefault()
      setQuery((prev) => prev + e.key)
      setFocusIdx(0)
      inputRef.current?.focus()
    }
  })

  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => onWindowKeyDown(e)
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onWindowKeyDown])

  const wsName = workspace?.name ?? 'Kanalora'
  const hasQuery = !!query.trim()

  const renderRow = (entry: DepartmentPageEntry) => {
    const fav = isFav(entry)
    const focused = entry.key === focusedKey
    const onStar = (e: MouseEvent) => {
      e.stopPropagation()
      favoriteActions.togglePage(entry.moduleId, entry.slug, entry.label)
    }
    return (
      <ContextMenu key={entry.key}>
        <ContextMenuTrigger asChild>
          <div className="group/row relative">
            <button
              ref={(el) => {
                if (el) rowRefs.current.set(entry.key, el)
                else rowRefs.current.delete(entry.key)
              }}
              type="button"
              onClick={() => openEntry(entry)}
              onFocus={() => {
                const idx = flat.findIndex((x) => x.key === entry.key)
                if (idx >= 0) setFocusIdx(idx)
              }}
              data-focused={focused ? 'true' : undefined}
              title={entry.built ? undefined : 'Not built in the new app yet — opens a placeholder screen'}
              className={cn(
                'hover-lift flex w-full items-center gap-[9px] rounded-lg border-0 px-[9px] py-[7px] text-left text-[13.5px] font-medium hover:bg-tint-10',
                focused
                  ? 'bg-tint-7 shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--primary)_45%,transparent)]'
                  : 'bg-transparent',
                entry.built ? 'text-foreground' : 'text-muted-foreground opacity-75',
              )}
            >
              <span className="flex size-[15px] flex-none items-center justify-center opacity-80">
                <PathIcon d={entry.icon} />
              </span>
              <span className="min-w-0 flex-1 truncate">{entry.label}</span>
              {!entry.built && (
                <span className="flex-none rounded-full border border-border bg-muted px-[7px] py-0.5 text-[9.5px] font-semibold tracking-[0.05em] whitespace-nowrap text-muted-foreground uppercase">
                  Coming soon
                </span>
              )}
              <span className="w-[15px] flex-none" />
            </button>
            <button
              type="button"
              onClick={onStar}
              title={fav ? 'Remove from favorites' : 'Add to favorites'}
              aria-label={fav ? `Remove ${entry.label} from favorites` : `Add ${entry.label} to favorites`}
              aria-pressed={fav}
              className={cn(
                'absolute top-1/2 right-[9px] flex size-[15px] -translate-y-1/2 items-center justify-center border-0 bg-transparent p-0 transition-[opacity,scale] duration-[140ms] hover:scale-[1.18] hover:opacity-100 focus-visible:opacity-100',
                fav
                  ? 'text-primary opacity-95'
                  : cn(
                      'text-muted-foreground',
                      focused ? 'opacity-50' : 'opacity-0 group-hover/row:opacity-50',
                    ),
              )}
            >
              <StarGlyph on={fav} />
            </button>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-[212px] rounded-[10px] p-1.5">
          <ContextMenuItem className="gap-[9px] text-[12.5px]" onSelect={() => openEntry(entry)}>
            <ExternalLink className="size-[14px]" strokeWidth={2} />
            Open
          </ContextMenuItem>
          <ContextMenuItem className="gap-[9px] text-[12.5px]" onSelect={() => openEntry(entry, true)}>
            <ExternalLink className="size-[14px]" strokeWidth={2} />
            Open in new tab
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            className="gap-[9px] text-[12.5px]"
            onSelect={() => favoriteActions.togglePage(entry.moduleId, entry.slug, entry.label)}
          >
            <Star className="size-[14px]" strokeWidth={2} />
            {fav ? 'Remove from favorites' : 'Add to favorites'}
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    )
  }

  return (
    <>
      <TopBar pageLabel="Departments" />
      <section data-screen-label="Departments" className="min-h-0 min-w-0 flex-1 overflow-auto px-[26px] pt-6 pb-12">
        <div className="mx-auto flex max-w-[1220px] flex-col gap-4">
          <div className="flex flex-wrap items-end gap-5">
            <div className="min-w-[240px] flex-1">
              <h1 className="m-0 text-xl font-bold tracking-[-0.02em]">Departments</h1>
              <p className="mt-1.5 mb-0 max-w-[620px] text-[13.5px] text-pretty text-muted-foreground">
                Every page in {wsName}, grouped by department. Start typing to filter, then Enter to open.
              </p>
            </div>
            <span className="relative inline-flex flex-none">
              <Search
                className="pointer-events-none absolute top-3 left-3 size-[14px] text-muted-foreground"
                strokeWidth={2}
              />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setFocusIdx(0)
                }}
                placeholder="Filter pages…"
                aria-label="Filter pages"
                className="h-[38px] w-[252px] rounded-[9px] border border-input bg-transparent pr-3 pl-[34px] text-[13.5px] text-foreground outline-none transition-[border-color,box-shadow] duration-[140ms] placeholder:text-muted-foreground focus:border-ring focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--primary)_20%,transparent)]"
              />
            </span>
          </div>

          {hasQuery && (
            <div className="tnum flex items-center gap-2 text-[12.5px] text-muted-foreground">
              <span>
                {flat.length} {flat.length === 1 ? 'page' : 'pages'} in {blocks.length}{' '}
                {blocks.length === 1 ? 'department' : 'departments'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setQuery('')
                  setFocusIdx(0)
                  inputRef.current?.focus()
                }}
                className="rounded-md border-0 bg-transparent px-2 py-[3px] text-[12.5px] font-semibold text-primary transition-colors duration-[140ms] hover:bg-[color-mix(in_oklab,var(--primary)_14%,transparent)]"
              >
                Clear
              </button>
            </div>
          )}

          {!hasQuery && recentChips.length > 0 && (
            <div className="flex flex-col gap-[9px]">
              <div className="text-[11px] font-semibold tracking-[0.07em] text-muted-foreground uppercase">
                Jump back in
              </div>
              <div className="flex flex-wrap gap-2">
                {recentChips.map((chip) => (
                  <button
                    key={chip.path}
                    type="button"
                    onClick={() => router.history.push(chip.path)}
                    className="hover-lift inline-flex h-8 items-center gap-2 rounded-full border border-border bg-card px-[13px] text-[12.5px] font-medium text-muted-foreground hover:bg-tint-10 hover:text-foreground"
                  >
                    <PathIcon d={chip.icon} size={14} className="opacity-70" />
                    <span className="font-medium text-foreground">{chip.label}</span>
                    <span className="text-[11.5px]">{chip.moduleName}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {blocks.length === 0 && (
            <div className="py-5 text-[13.5px] text-muted-foreground">
              {hasQuery ? `No page matches “${query.trim()}”.` : 'No departments are available.'}
            </div>
          )}

          <div className="[columns:272px_4] gap-x-[30px]">
            {blocks.map((block, i) => (
              <section
                key={block.id}
                aria-label={block.name}
                style={{ animationDelay: `${i * 40}ms` }}
                className="mb-[22px] break-inside-avoid animate-sf-slide"
              >
                <div className="flex items-center gap-[9px] px-[9px] pb-[7px]">
                  <span className="flex size-[18px] flex-none items-center justify-center text-primary">
                    <ModuleIcon id={block.id} size={17} strokeWidth={1.8} />
                  </span>
                  <h2 className="m-0 min-w-0 flex-1 truncate text-[13px] font-bold">{block.name}</h2>
                  <span className="tnum flex-none text-[11px] text-muted-foreground">
                    {block.totalCount} {block.totalCount === 1 ? 'page' : 'pages'}
                  </span>
                </div>

                <div className="flex flex-col gap-px">{block.work.map(renderRow)}</div>

                {block.setup.length > 0 && (
                  <>
                    <div className="mx-[9px] mt-2.5 mb-[7px] h-px bg-border" />
                    <div className="px-[9px] pb-[5px] text-[10px] font-semibold tracking-[0.07em] text-muted-foreground uppercase">
                      Setup
                    </div>
                    <div className="flex flex-col gap-px">{block.setup.map(renderRow)}</div>
                  </>
                )}
              </section>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
