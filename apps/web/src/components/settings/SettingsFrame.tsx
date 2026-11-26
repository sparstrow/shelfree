/**
 * The Settings frame: top bar breadcrumb, section navigation (central grouped
 * list with "Find a setting" or a focused module list with "All settings"; a
 * select on phones), keyboard section stepping (`[` / `]`, `/`), row jump
 * highlighting (`?find=<rowKey>`), and the section body. Sections not moved to
 * the React app yet keep a "not moved yet" state inside the frame.
 */
import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, ArrowRight, ChevronRight, Lock, Search, Settings2 } from 'lucide-react'
import { type ComponentType, type KeyboardEvent, type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { TopBar } from '@/app/shell/TopBar'
import type { HelpMap } from '@/components/help/types'
import { useEnabledModules } from '@/data/queries/workspace-config'
import { canViewArea } from '@/domain/settings-permissions'
import { isTypingTarget } from '@/lib/keyboard'
import { useLatestCallback } from '@/lib/use-latest-callback'
import { cn } from '@/lib/utils'
import {
  SETTINGS_AREAS,
  areasForModules,
  type SectionDef,
  type SettingsArea,
  type SettingsAreaId,
  type SettingsModuleId,
  type SettingsSearchMatch,
  findArea,
  findSection,
  firstSection,
  searchSettings,
  sectionPath,
} from './registry'
import { useSettingsAccess, useSettingsActor } from './use-settings-access'

export type SettingsSectionComponent = ComponentType<{
  module?: SettingsModuleId
  readOnly?: boolean
}>

export interface SettingsFrameProps {
  /** Settings area (`workspace`, a module id, `shared`, or `personal`). */
  area: SettingsAreaId
  /** Section id from the URL. */
  sectionId: string
  /** Ported sections by id; anything missing shows the "not moved yet" state. */
  sections: Readonly<Record<string, SettingsSectionComponent>>
  /** Quiet-help maps keyed by section id, used by "Find a setting". */
  helpMaps?: Readonly<Record<string, HelpMap>>
  /** Optional row key to scroll to and briefly highlight (from `?find=<rowKey>`). */
  highlightRow?: string
}

const OPEN_LAYER = '[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"], [data-slot="popover-content"]'

const itemClass =
  'flex h-8 items-center rounded-lg border-0 bg-transparent px-[10px] text-[13px] font-medium text-muted-foreground no-underline transition-[background-color,color,transform] duration-[140ms] hover:translate-x-px hover:bg-tint-12 hover:text-foreground aria-[current=page]:bg-row-sel aria-[current=page]:text-foreground'

const groupHeadClass =
  'px-[10px] pb-1 text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase'

interface NavTarget {
  area: SettingsArea
  section: SectionDef
}

function SectionLink({
  area,
  section,
  active,
  className,
  children,
}: {
  area: SettingsArea
  section: SectionDef
  active?: boolean
  className?: string
  children: ReactNode
}) {
  const current = active ? ('page' as const) : undefined
  if (area.kind === 'module') {
    return (
      <Link
        to="/$module/settings/$section"
        params={{ module: area.id, section: section.id }}
        aria-current={current}
        className={className}
      >
        {children}
      </Link>
    )
  }
  if (area.kind === 'shared') {
    return (
      <Link
        to="/settings/shared/$list"
        params={{ list: section.id }}
        aria-current={current}
        className={className}
      >
        {children}
      </Link>
    )
  }
  return (
    <Link
      to="/settings/$section"
      params={{ section: section.id }}
      aria-current={current}
      className={className}
    >
      {children}
    </Link>
  )
}

export function SettingsFrame({ area, sectionId, sections, helpMaps, highlightRow }: SettingsFrameProps) {
  const navigate = useNavigate()
  const { actor } = useSettingsActor()
  const access = useSettingsAccess(area)
  const found = findSection(area, sectionId)

  const [query, setQuery] = useState('')
  const [matchIdx, setMatchIdx] = useState(0)
  const [openModules, setOpenModules] = useState<Record<string, boolean>>(() =>
    found?.area.kind === 'module' ? { [found.area.id]: true } : {},
  )
  const [highlightTick, setHighlightTick] = useState(0)
  const findInputRef = useRef<HTMLInputElement>(null)
  const paneRef = useRef<HTMLDivElement>(null)

  const areaObj = found?.area ?? null
  const section = found?.section ?? null
  const isModuleArea = areaObj?.kind === 'module'
  const canWorkspace = canViewArea(actor, 'workspace')

  // A module that is switched off (Settings ▸ Modules & capabilities) has no settings area (G-001).
  const enabledModules = useEnabledModules()
  const enabledKey = [...enabledModules].join(',')
  const centralAreas = useMemo(
    () =>
      areasForModules(new Set(enabledKey.split(',').filter(Boolean))).filter((a) =>
        canViewArea(actor, a.kind, a.kind === 'module' ? a.id : undefined),
      ),
    [actor, enabledKey],
  )
  const workspaceArea = useMemo(() => centralAreas.find((a) => a.kind === 'workspace') ?? null, [centralAreas])
  const moduleAreas = useMemo(() => centralAreas.filter((a) => a.kind === 'module'), [centralAreas])
  const sharedArea = useMemo(() => centralAreas.find((a) => a.kind === 'shared') ?? null, [centralAreas])
  const personalArea = useMemo(() => centralAreas.find((a) => a.kind === 'personal') ?? null, [centralAreas])

  const isModuleOpen = (id: SettingsAreaId) =>
    openModules[id] !== undefined ? openModules[id] : areaObj?.kind === 'module' && areaObj.id === id

  const hasQuery = query.trim().length > 0
  const matches = useMemo<SettingsSearchMatch[]>(
    () => (hasQuery && !isModuleArea ? searchSettings(query, helpMaps, centralAreas) : []),
    [hasQuery, isModuleArea, query, helpMaps, centralAreas],
  )
  const activeMatchIdx = matches.length > 0 ? Math.max(0, Math.min(matchIdx, matches.length - 1)) : -1

  const navSequence = useMemo<NavTarget[]>(() => {
    if (!areaObj) return []
    if (isModuleArea) {
      return areaObj.sections.map((s) => ({ area: areaObj, section: s }))
    }
    const items: NavTarget[] = []
    for (const a of centralAreas) {
      if (a.kind === 'module' && !openModules[a.id]) continue
      for (const s of a.sections) items.push({ area: a, section: s })
    }
    return items
  }, [areaObj, isModuleArea, centralAreas, openModules])

  const goToSection = useLatestCallback((targetArea: SettingsArea, targetSectionId: string, find?: string) => {
    const search = find ? { find } : {}
    if (targetArea.kind === 'module') {
      void navigate({
        to: '/$module/settings/$section',
        params: { module: targetArea.id, section: targetSectionId },
        search,
      })
      return
    }
    if (targetArea.kind === 'shared') {
      void navigate({
        to: '/settings/shared/$list',
        params: { list: targetSectionId },
        search,
      })
      return
    }
    void navigate({
      to: '/settings/$section',
      params: { section: targetSectionId },
      search,
    })
  })

  const selectMatch = (match: SettingsSearchMatch) => {
    setQuery('')
    setMatchIdx(0)
    findInputRef.current?.blur()
    if (match.rowKey) setHighlightTick((t) => t + 1)
    goToSection(match.area, match.section.id, match.rowKey)
  }

  const onFindKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      if (matches.length === 0) return
      e.preventDefault()
      setMatchIdx((i) => Math.min(i + 1, matches.length - 1))
    } else if (e.key === 'ArrowUp') {
      if (matches.length === 0) return
      e.preventDefault()
      setMatchIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      const hit = matches[activeMatchIdx]
      if (!hit) return
      e.preventDefault()
      selectMatch(hit)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      if (query) {
        setQuery('')
        setMatchIdx(0)
      } else {
        findInputRef.current?.blur()
      }
    }
  }

  // Frame keyboard shortcuts: `/` focuses Find a setting (central), `[` / `]` step sections.
  const onWindowKeyDown = useLatestCallback((e: globalThis.KeyboardEvent) => {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return
    if (isTypingTarget(e.target)) return
    if (document.querySelector(OPEN_LAYER)) return

    if (e.key === '/' && !isModuleArea && findInputRef.current) {
      e.preventDefault()
      findInputRef.current.focus()
      findInputRef.current.select()
      return
    }

    if ((e.key === '[' || e.key === ']') && areaObj && section) {
      const idx = navSequence.findIndex((item) => item.area.id === areaObj.id && item.section.id === section.id)
      if (idx < 0) return
      const next = navSequence[idx + (e.key === ']' ? 1 : -1)]
      if (!next) return
      e.preventDefault()
      goToSection(next.area, next.section.id)
    }
  })

  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => onWindowKeyDown(e)
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onWindowKeyDown])

  // Scroll to and briefly highlight a target row when opened via `?find=<rowKey>`.
  useEffect(() => {
    if (!highlightRow) return
    const pane = paneRef.current
    if (!pane) return

    let clearTimer: number | undefined
    let stopTimer: number | undefined
    let observer: MutationObserver | undefined

    const trigger = (): boolean => {
      const escaped = typeof CSS !== 'undefined' && typeof CSS.escape === 'function' ? CSS.escape(highlightRow) : highlightRow.replace(/["\\]/g, '\\$&')
      const el = pane.querySelector<HTMLElement>(`[data-setting-row="${escaped}"]`)
      if (!el) return false
      el.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
      el.removeAttribute('data-setting-highlight')
      void el.offsetWidth
      el.setAttribute('data-setting-highlight', 'true')
      clearTimer = window.setTimeout(() => {
        el.removeAttribute('data-setting-highlight')
      }, 1900)
      return true
    }

    if (!trigger()) {
      observer = new MutationObserver(() => {
        if (trigger()) {
          observer?.disconnect()
          window.clearTimeout(stopTimer)
        }
      })
      observer.observe(pane, { childList: true, subtree: true })
      stopTimer = window.setTimeout(() => observer?.disconnect(), 3000)
    }

    return () => {
      observer?.disconnect()
      window.clearTimeout(clearTimer)
      window.clearTimeout(stopTimer)
    }
  }, [highlightRow, highlightTick, area, sectionId])

  if (!areaObj || !section) return null

  const Body = sections[section.id]
  const currentPath = sectionPath(areaObj, section)
  const blockedAccess = !access.isLoading && !access.canView
  const personalFallbackArea = personalArea ?? findArea('personal')
  const personalFirst = firstSection('personal')
  const blockedText =
    areaObj.kind === 'module'
      ? `You don’t have access to ${areaObj.label} settings.`
      : 'Workspace settings are for owners and admins.'
  // "Not moved yet" points at a section that is ported: one in this area, else Business profile
  // (or Profile for a member) — never back at the page you are on.
  const portedHere = areaObj.sections.find((s) => s.id !== section.id && sections[s.id])
  const fallback: { area: SettingsArea; section: SectionDef } | null = portedHere
    ? { area: areaObj, section: portedHere }
    : canWorkspace && workspaceArea
      ? { area: workspaceArea, section: firstSection(workspaceArea) }
      : personalFallbackArea
        ? { area: personalFallbackArea, section: personalFirst }
        : null

  const onMobileChange = (nextPath: string) => {
    if (nextPath === '/settings') {
      void navigate({ to: '/settings' })
      return
    }
    for (const a of SETTINGS_AREAS) {
      for (const s of a.sections) {
        if (sectionPath(a, s) === nextPath) {
          goToSection(a, s.id)
          return
        }
      }
    }
  }

  return (
    <>
      <TopBar
        pageLabel={section.label}
        crumb={isModuleArea ? undefined : areaObj.label}
        settingsModule={areaObj.kind === 'module' ? (areaObj.id as SettingsModuleId) : undefined}
      />
      <div className="flex min-h-0 min-w-0 flex-1">
        <nav
          aria-label="Settings"
          className="hidden w-[244px] flex-none flex-col gap-4 overflow-y-auto border-r border-border bg-panel px-3 py-4 md:flex"
        >
          {isModuleArea ? (
            <>
              <div className="flex flex-col gap-0.5">
                <div className={groupHeadClass}>{areaObj.label}</div>
                {areaObj.sections.map((s) => (
                  <SectionLink
                    key={s.id}
                    area={areaObj}
                    section={s}
                    active={s.id === section.id}
                    className={itemClass}
                  >
                    <span className="truncate">{s.label}</span>
                  </SectionLink>
                ))}
              </div>
              <div className="mt-auto border-t border-border pt-3">
                <Link
                  to="/settings"
                  className="hover-lift flex h-8 items-center gap-2 rounded-lg border-0 bg-transparent px-[10px] text-[12.5px] font-medium text-muted-foreground no-underline hover:bg-tint-12 hover:text-foreground"
                >
                  <ArrowLeft className="size-3.5 flex-none" strokeWidth={2} />
                  <span>All settings</span>
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="relative flex items-center">
                <Search
                  className="pointer-events-none absolute left-2.5 size-[14px] text-muted-foreground"
                  strokeWidth={2}
                />
                <input
                  ref={findInputRef}
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value)
                    setMatchIdx(0)
                  }}
                  onKeyDown={onFindKeyDown}
                  placeholder="Find a setting…"
                  title="Find a setting (/)"
                  aria-label="Find a setting"
                  role="combobox"
                  aria-expanded={hasQuery}
                  aria-controls="settings-find-results"
                  aria-autocomplete="list"
                  className="h-8 w-full rounded-lg border border-input bg-transparent pr-2.5 pl-8 text-[13px] text-foreground outline-none transition-[border-color,box-shadow] duration-[140ms] placeholder:text-muted-foreground hover:border-ring/60 focus:border-ring focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--primary)_20%,transparent)]"
                />
              </div>

              {hasQuery ? (
                <div id="settings-find-results" role="listbox" aria-label="Matching settings" className="flex flex-col gap-0.5">
                  {matches.length === 0 ? (
                    <div role="status" className="px-[10px] py-3 text-[12.5px] text-muted-foreground">
                      No settings match
                    </div>
                  ) : (
                    matches.map((match, i) => (
                      <button
                        key={match.id}
                        type="button"
                        role="option"
                        aria-selected={i === activeMatchIdx}
                        onMouseEnter={() => setMatchIdx(i)}
                        onClick={() => selectMatch(match)}
                        className={cn(
                          'flex w-full flex-col rounded-lg border-0 px-[10px] py-1.5 text-left transition-[background-color,color,transform] duration-[120ms] hover:translate-x-px hover:bg-tint-12',
                          i === activeMatchIdx ? 'bg-row-sel text-foreground' : 'bg-transparent text-foreground',
                        )}
                      >
                        <span className="truncate text-[13px] font-medium">{match.label}</span>
                        <span className="truncate text-[11px] text-muted-foreground">{match.areaLabel}</span>
                      </button>
                    ))
                  )}
                </div>
              ) : (
                <>
                  {workspaceArea && (
                    <div className="flex flex-col gap-0.5">
                      <div className={groupHeadClass}>{workspaceArea.label}</div>
                      {workspaceArea.sections.map((s) => (
                        <SectionLink
                          key={s.id}
                          area={workspaceArea}
                          section={s}
                          active={areaObj.id === workspaceArea.id && s.id === section.id}
                          className={itemClass}
                        >
                          <span className="truncate">{s.label}</span>
                        </SectionLink>
                      ))}
                    </div>
                  )}

                  {moduleAreas.length > 0 && (
                    <div className="flex flex-col gap-0.5">
                      <div className={groupHeadClass}>Modules</div>
                      {moduleAreas.map((mod) => {
                        const open = isModuleOpen(mod.id)
                        return (
                          <div key={mod.id} className="flex flex-col">
                            <button
                              type="button"
                              aria-expanded={open}
                              onClick={() => setOpenModules((prev) => ({ ...prev, [mod.id]: !open }))}
                              className="flex h-8 w-full items-center gap-1.5 rounded-lg border-0 bg-transparent px-[10px] text-left text-[13px] font-medium text-muted-foreground transition-[background-color,color,transform] duration-[140ms] hover:translate-x-px hover:bg-tint-12 hover:text-foreground"
                            >
                              <ChevronRight
                                className={cn(
                                  'size-3.5 flex-none opacity-65 transition-transform duration-[160ms]',
                                  open && 'rotate-90',
                                )}
                                strokeWidth={2}
                              />
                              <span className="min-w-0 flex-1 truncate">{mod.label}</span>
                            </button>
                            <div
                              className={cn(
                                'grid transition-[grid-template-rows,opacity] duration-[200ms] ease-[cubic-bezier(.4,0,.2,1)]',
                                open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
                              )}
                              inert={!open}
                            >
                              <div className="min-h-0 overflow-hidden">
                                <div className="mt-0.5 mb-1 ml-3.5 flex flex-col gap-0.5 border-l border-border pl-2">
                                  {mod.sections.map((s) => (
                                    <SectionLink
                                      key={s.id}
                                      area={mod}
                                      section={s}
                                      active={areaObj.id === mod.id && s.id === section.id}
                                      className={itemClass}
                                    >
                                      <span className="truncate">{s.label}</span>
                                    </SectionLink>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {sharedArea && (
                    <div className="flex flex-col gap-0.5">
                      <div className={groupHeadClass}>{sharedArea.label}</div>
                      {sharedArea.sections.map((s) => (
                        <SectionLink
                          key={s.id}
                          area={sharedArea}
                          section={s}
                          active={areaObj.id === sharedArea.id && s.id === section.id}
                          className={itemClass}
                        >
                          <span className="truncate">{s.label}</span>
                        </SectionLink>
                      ))}
                    </div>
                  )}

                  {personalArea && (
                    <div className="flex flex-col gap-0.5">
                      <div className={groupHeadClass}>{personalArea.label}</div>
                      {personalArea.sections.map((s) => (
                        <SectionLink
                          key={s.id}
                          area={personalArea}
                          section={s}
                          active={areaObj.id === personalArea.id && s.id === section.id}
                          className={itemClass}
                        >
                          <span className="truncate">{s.label}</span>
                        </SectionLink>
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </nav>

        <div ref={paneRef} className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex-none border-b border-border px-[22px] py-2 md:hidden">
            <select
              aria-label="Settings section"
              value={currentPath}
              onChange={(e) => onMobileChange(e.target.value)}
              className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-[13px] text-foreground outline-none focus:border-ring"
            >
              {isModuleArea ? (
                <>
                  <optgroup label={areaObj.label}>
                    {areaObj.sections.map((s) => (
                      <option key={s.id} value={sectionPath(areaObj, s)}>
                        {s.label}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Settings">
                    <option value="/settings">All settings</option>
                  </optgroup>
                </>
              ) : (
                centralAreas.map((a) => (
                  <optgroup key={a.id} label={a.label}>
                    {a.sections.map((s) => (
                      <option key={s.id} value={sectionPath(a, s)}>
                        {s.label}
                      </option>
                    ))}
                  </optgroup>
                ))
              )}
            </select>
          </div>

          {access.isLoading ? null : blockedAccess && personalFallbackArea ? (
            <FrameMessage
              icon={<Lock className="size-7" strokeWidth={1.6} />}
              title={section.label}
              text={blockedText}
              area={personalFallbackArea}
              section={personalFirst}
              toLabel="Go to Personal settings"
            />
          ) : Body ? (
            <Body
              key={`${areaObj.id}:${section.id}`}
              module={areaObj.kind === 'module' ? (areaObj.id as SettingsModuleId) : undefined}
              readOnly={!access.canEdit}
            />
          ) : (
            <FrameMessage
              icon={<Settings2 className="size-7" strokeWidth={1.6} />}
              title={section.label}
              text="This section has not been moved to the new app yet. It still runs in the prototype."
              area={fallback?.area ?? areaObj}
              section={fallback?.section ?? section}
              toLabel={`Go to ${fallback?.section.label ?? section.label}`}
            />
          )}
        </div>
      </div>
    </>
  )
}

function FrameMessage({
  icon,
  title,
  text,
  area,
  section,
  toLabel,
}: {
  icon: ReactNode
  title: string
  text: string
  area: SettingsArea
  section: SectionDef
  toLabel: string
}) {
  return (
    <section aria-label={title} className="flex min-h-0 flex-1 animate-sf-fade flex-col items-center justify-center gap-[14px] p-12 text-center">
      <div className={cn('flex size-16 items-center justify-center rounded-[18px] bg-muted text-muted-foreground')}>{icon}</div>
      <div>
        <h1 className="m-0 text-[17px] font-bold tracking-[-0.01em]">{title}</h1>
        <p className="mx-auto mt-1.5 max-w-[340px] text-[13px] text-muted-foreground">{text}</p>
      </div>
      <SectionLink
        area={area}
        section={section}
        className="hover-lift inline-flex h-[34px] items-center gap-[7px] rounded-lg border border-border bg-card px-[14px] text-[13px] font-medium text-foreground no-underline hover:bg-tint-16"
      >
        {toLabel}
        <ArrowRight className="size-[14px]" strokeWidth={2} />
      </SectionLink>
    </section>
  )
}
