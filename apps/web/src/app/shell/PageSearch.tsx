import { useRouter } from '@tanstack/react-router'
import { FileText, Search } from 'lucide-react'
import { type KeyboardEvent, useMemo, useRef, useState } from 'react'
import { pagePath } from '@/app/nav'
import { useNavPages } from '@/app/shell/use-nav-modules'
import { useUi } from '@/app/stores/ui'
import { useMe } from '@/data/queries/session'
import { cn } from '@/lib/utils'
import { describePath } from './use-active-page'

interface Result {
  path: string
  label: string
  moduleName: string
}

/** Top-bar "Search pages…" box: type to find any page, or pick a recent one. */
export function PageSearch() {
  const router = useRouter()
  const recents = useUi((s) => s.recents)
  const clearRecents = useUi((s) => s.clearRecents)
  // Settings ▸ Personal ▸ Favorites & views can hide the recents list.
  const showRecents = useMe().data?.showRecents !== false
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const q = query.trim().toLowerCase()
  const navPages = useNavPages()
  const results = useMemo<Result[]>(() => {
    if (!q) {
      if (!showRecents) return []
      return recents
        .map((path) => {
          const at = describePath(path)
          return at.kind === 'page' && at.rest.length === 0
            ? { path, label: at.page.label, moduleName: at.module.name }
            : null
        })
        .filter((r): r is Result => !!r)
        .slice(0, 5)
    }
    return navPages
      .filter((p) => p.label.toLowerCase().includes(q) || p.moduleName.toLowerCase().includes(q))
      .slice(0, 8)
      .map((p) => ({ path: pagePath(p.moduleId, p.slug), label: p.label, moduleName: p.moduleName }))
  }, [q, recents, navPages, showRecents])

  const showPanel = open && (!!q || results.length > 0)

  const pick = (result: Result) => {
    setOpen(false)
    setQuery('')
    inputRef.current?.blur()
    router.history.push(result.path)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      const hit = results[index]
      if (hit) pick(hit)
    }
  }

  return (
    <span className="relative inline-flex min-w-[120px] shrink">
      <Search
        className="pointer-events-none absolute top-[9px] left-[10px] size-[14px] text-muted-foreground"
        strokeWidth={2}
      />
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setIndex(0)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Search pages…"
        title="Search any page to navigate"
        aria-label="Search pages"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls="page-search-results"
        aria-autocomplete="list"
        className="h-8 w-[220px] max-w-full min-w-0 rounded-lg border border-input bg-transparent pr-[10px] pl-[31px] text-[13px] text-foreground outline-none transition-[width,border-color,box-shadow] duration-150 placeholder:text-muted-foreground focus:w-[280px] focus:border-ring focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--primary)_20%,transparent)]"
      />
      {showPanel && (
        <>
          <div className="fixed inset-0 z-[44]" onClick={() => setOpen(false)} aria-hidden="true" />
          <div
            id="page-search-results"
            role="listbox"
            className="absolute top-[38px] left-0 z-[45] w-[280px] animate-sf-pop rounded-[10px] border border-border bg-card p-1.5 shadow-pop"
          >
            {!q && results.length > 0 && (
              <div className="flex items-center gap-2 px-[9px] pt-1 pb-1.5">
                <span className="flex-1 text-[10.5px] font-semibold tracking-[0.06em] text-muted-foreground">
                  RECENT
                </span>
                <button
                  type="button"
                  onClick={clearRecents}
                  className="border-0 bg-transparent p-0 text-[11px] text-muted-foreground transition-colors duration-[140ms] hover:text-foreground"
                >
                  Clear
                </button>
              </div>
            )}
            {results.map((result, i) => (
              <button
                key={result.path}
                type="button"
                role="option"
                aria-selected={i === index}
                onMouseEnter={() => setIndex(i)}
                onClick={() => pick(result)}
                className={cn(
                  'flex w-full items-center gap-[9px] rounded-[7px] border-0 px-[9px] py-[7px] text-left text-[12.5px] font-medium text-foreground transition-colors duration-[120ms] hover:bg-[color-mix(in_oklab,var(--foreground)_8%,transparent)]',
                  i === index ? 'bg-[color-mix(in_oklab,var(--foreground)_8%,transparent)]' : 'bg-transparent',
                )}
              >
                <FileText className="size-[13px] flex-none opacity-60" strokeWidth={2} />
                <span className="min-w-0 flex-1 truncate">{result.label}</span>
                <span className="flex-none text-[11px] text-muted-foreground">{result.moduleName}</span>
              </button>
            ))}
            {q && results.length === 0 && (
              <div className="px-[9px] py-[10px] text-[12.5px] text-muted-foreground">No pages found</div>
            )}
          </div>
        </>
      )}
    </span>
  )
}
