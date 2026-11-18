/**
 * The Settings frame: top bar with the Settings ▸ Group ▸ Section breadcrumb,
 * the section navigation (scope switch + groups; a select on phones) and the
 * section body. Sections not moved to the React app yet show a "not moved yet"
 * state inside the frame, so the whole navigation works from day one.
 */
import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowRight, Lock, Settings2 } from 'lucide-react'
import type { ComponentType } from 'react'
import { TopBar } from '@/app/shell/TopBar'
import { useUi } from '@/app/stores/ui'
import { cn } from '@/lib/utils'
import { SETTINGS_GROUPS, SETTINGS_SCOPES, type SettingsScope, findSection, firstSection } from './nav'

export interface SettingsFrameProps {
  /** Section id from the URL. */
  sectionId: string
  /** Ported sections by id; anything missing shows the "not moved yet" state. */
  sections: Readonly<Record<string, ComponentType>>
}

const itemClass =
  'flex h-8 items-center rounded-lg border-0 bg-transparent px-[10px] text-[13px] font-medium text-muted-foreground no-underline transition-[background-color,color,transform] duration-[140ms] hover:translate-x-px hover:bg-tint-12 hover:text-foreground aria-[current=page]:bg-row-sel aria-[current=page]:text-foreground'

export function SettingsFrame({ sectionId, sections }: SettingsFrameProps) {
  const navigate = useNavigate()
  const demoRole = useUi((s) => s.demoRole)
  const found = findSection(sectionId)
  if (!found) return null
  const { group, section } = found
  // Workspace settings are for owners and admins; a member sees My settings only.
  // (UX only — the backend enforces it.)
  const canWorkspace = demoRole !== 'member'
  const scope: SettingsScope = group.scope
  const groups = SETTINGS_GROUPS.filter((g) => g.scope === scope)
  const Body = sections[section.id]

  return (
    <>
      <TopBar pageLabel={section.label} crumb={group.label} />
      <div className="flex min-h-0 min-w-0 flex-1">
        <nav aria-label="Settings" className="hidden w-[236px] flex-none flex-col gap-4 overflow-y-auto border-r border-border bg-panel px-3 py-4 md:flex">
          {canWorkspace && (
            <div role="group" aria-label="Settings scope" className="grid grid-cols-2 gap-0.5 rounded-lg bg-muted p-0.5">
              {SETTINGS_SCOPES.map((s) => (
                <Link
                  key={s.id}
                  to="/settings/$section"
                  params={{ section: firstSection(s.id) }}
                  aria-current={s.id === scope ? 'true' : undefined}
                  className="flex h-7 items-center justify-center rounded-md text-[12.5px] font-medium text-muted-foreground no-underline transition-[background-color,color,box-shadow] duration-[140ms] hover:text-foreground aria-[current=true]:bg-card aria-[current=true]:text-foreground aria-[current=true]:shadow-base"
                >
                  {s.label}
                </Link>
              ))}
            </div>
          )}
          {groups.map((g) => (
            <div key={g.id} className="flex flex-col gap-0.5">
              <div className="px-[10px] pb-1 text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">{g.label}</div>
              {g.sections.map((s) => (
                <Link
                  key={s.id}
                  to="/settings/$section"
                  params={{ section: s.id }}
                  aria-current={s.id === section.id ? 'page' : undefined}
                  className={itemClass}
                >
                  <span className="truncate">{s.label}</span>
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex-none border-b border-border px-[22px] py-2 md:hidden">
            <select
              aria-label="Settings section"
              value={section.id}
              onChange={(e) => void navigate({ to: '/settings/$section', params: { section: e.target.value } })}
              className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-[13px] text-foreground outline-none focus:border-ring"
            >
              {SETTINGS_GROUPS.filter((g) => canWorkspace || g.scope === 'user').map((g) => (
                <optgroup key={g.id} label={g.label}>
                  {g.sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          {scope === 'workspace' && !canWorkspace ? (
            <FrameMessage
              icon={<Lock className="size-7" strokeWidth={1.6} />}
              title={section.label}
              text="Workspace settings are for owners and admins."
              to="me-profile"
              toLabel="Go to My settings"
            />
          ) : Body ? (
            <Body key={section.id} />
          ) : (
            <FrameMessage
              icon={<Settings2 className="size-7" strokeWidth={1.6} />}
              title={section.label}
              text="This section has not been moved to the new app yet. It still runs in the prototype."
              to="ws-profile"
              toLabel="Go to Business profile"
            />
          )}
        </div>
      </div>
    </>
  )
}

function FrameMessage({ icon, title, text, to, toLabel }: { icon: React.ReactNode; title: string; text: string; to: string; toLabel: string }) {
  return (
    <section aria-label={title} className="flex min-h-0 flex-1 animate-sf-fade flex-col items-center justify-center gap-[14px] p-12 text-center">
      <div className={cn('flex size-16 items-center justify-center rounded-[18px] bg-muted text-muted-foreground')}>{icon}</div>
      <div>
        <h1 className="m-0 text-[17px] font-bold tracking-[-0.01em]">{title}</h1>
        <p className="mx-auto mt-1.5 max-w-[340px] text-[13px] text-muted-foreground">{text}</p>
      </div>
      <Link
        to="/settings/$section"
        params={{ section: to }}
        className="hover-lift inline-flex h-[34px] items-center gap-[7px] rounded-lg border border-border bg-card px-[14px] text-[13px] font-medium text-foreground hover:bg-tint-16"
      >
        {toLabel}
        <ArrowRight className="size-[14px]" strokeWidth={2} />
      </Link>
    </section>
  )
}
