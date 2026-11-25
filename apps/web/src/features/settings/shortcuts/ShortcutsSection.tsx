import { Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { SHORTCUT_GROUPS, filterShortcuts } from '@/app/shortcuts'
import type { HelpEntry } from '@/components/help/types'
import { SettingsPage } from '@/components/settings/SettingsPage'
import { isTypingTarget } from '@/lib/keyboard'

const PAGE_HELP: HelpEntry = {
  title: 'Keyboard shortcuts',
  body: 'Every shortcut in the app, grouped by where it applies. Single-key shortcuts work when you are not typing in a field. Ctrl is Cmd on a Mac.',
}

/** Settings ▸ Personal ▸ Keyboard shortcuts (`/settings/shortcuts`). */
export function ShortcutsSection({ readOnly }: { readOnly?: boolean } = {}) {
  const [query, setQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const groups = useMemo(() => filterShortcuts(SHORTCUT_GROUPS, query), [query])
  const total = useMemo(() => SHORTCUT_GROUPS.reduce((n, g) => n + g.items.length, 0), [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return
      e.preventDefault()
      searchRef.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <SettingsPage title="Keyboard shortcuts" help={PAGE_HELP} count={total} width="wide" readOnly={readOnly}>
      <label className="relative flex h-9 w-full max-w-[420px] items-center">
        <Search className="pointer-events-none absolute left-3 size-[14px] text-muted-foreground" strokeWidth={2} />
        <input
          ref={searchRef}
          type="search"
          aria-label="Search shortcuts"
          placeholder="Search shortcuts"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && query) {
              e.preventDefault()
              setQuery('')
            }
          }}
          className="h-9 w-full rounded-lg border border-input bg-transparent pr-3 pl-9 text-[13px] text-foreground outline-none transition-colors duration-[140ms] placeholder:text-muted-foreground hover:border-ring/60 focus:border-ring"
        />
      </label>
      {groups.length === 0 && (
        <p role="status" className="m-0 rounded-xl border border-border bg-card p-6 text-center text-[13px] text-muted-foreground">
          No shortcuts match “{query}”.
        </p>
      )}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {groups.map((g) => (
          <section key={g.id} aria-label={g.title} className="min-w-0 self-start rounded-xl border border-border bg-card px-4 pt-3.5 pb-2">
            <h2 className="m-0 mb-1.5 text-[13px] font-bold">{g.title}</h2>
            <ul className="m-0 list-none p-0">
              {g.items.map((s) => (
                <li
                  key={s.combo + s.desc}
                  className="grid grid-cols-[minmax(110px,150px)_1fr] items-start gap-x-3 border-b border-dashed border-border py-2 text-[12.5px] transition-colors duration-[120ms] last:border-b-0 hover:bg-row-hover sm:grid-cols-[170px_1fr]"
                >
                  <kbd className="w-fit max-w-full rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[11.5px] leading-snug font-medium break-words whitespace-normal text-foreground">
                    {s.combo}
                  </kbd>
                  <span className="min-w-0 text-muted-foreground">{s.desc}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </SettingsPage>
  )
}
