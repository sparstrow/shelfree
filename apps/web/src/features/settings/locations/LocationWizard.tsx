import { Check, Layers, Minus, Plus } from 'lucide-react'
import { useMemo } from 'react'
import { toast } from 'sonner'
import { Wizard, type WizardStep } from '@/components/wizard/Wizard'
import { wizardControlClass } from '@/components/wizard/control-class'
import { WizardField, WizardSection } from '@/components/wizard/fields'
import type { Employee, GstRegistration, Vendor, Warehouse } from '@/data/schemas'
import { GST_STATES } from '@/domain/gst'
import { registrationForSite } from '@/domain/gst-registrations'
import {
  AREA_COUNT_MAX,
  AREA_TEMPLATES,
  AREA_TYPES,
  FLOOR_CODE_MAX,
  type AreaPick,
  applyAreaTemplate,
  areaCountLabel,
  floorWord,
  newFloor,
  normalizeFloorCode,
  placeAreas,
  setMultiLevel,
  stepAreaPick,
  toggleAreaPick,
  totalAreas,
} from '@/domain/location-layouts'
import {
  LOCATION_WIZARD_STEPS,
  type LocationWizardDraft,
  type LocationWizardStepId,
  blankLocationDraft,
  draftToWarehouse,
  effectiveCode,
  locationDraftErrors,
  stepErrors,
  stepOfError,
} from '@/domain/location-wizard'
import {
  LOCATION_COUNTRIES,
  LOCATION_POB,
  LOCATION_STATUSES,
  isIndianSite,
  locationStateLabel,
  principalDisplaced,
} from '@/domain/locations'
import { cn } from '@/lib/utils'
import { SITE_TYPE_CARDS, areaIcon } from './area-icons'
import { LOCATIONS_HELP } from './help'

const STATE_OPTIONS = GST_STATES.filter((s) => !s.legacy).map((s) => ({ value: s.code, label: s.name }))

const stateWord = (d: LocationWizardDraft): string => locationStateLabel({ country: d.country, state: d.state })

/** A card that picks one value of a radio group (site type, single / multi-level). */
function Choice({
  selected,
  onSelect,
  children,
  className,
  autoFocus,
}: {
  selected: boolean
  onSelect: () => void
  children: React.ReactNode
  className?: string
  autoFocus?: boolean
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      data-autofocus={autoFocus ? '' : undefined}
      onClick={onSelect}
      className={cn(
        'hover-lift flex min-w-0 cursor-pointer items-start gap-[11px] rounded-[11px] border-[1.5px] p-3 text-left transition-colors duration-[140ms]',
        selected ? 'border-primary/60 bg-primary/10' : 'border-border bg-card hover:border-foreground/25',
        className,
      )}
    >
      {children}
    </button>
  )
}

export interface LocationWizardProps {
  open: boolean
  onClose: () => void
  noun: string
  sites: readonly Warehouse[]
  employees: readonly Employee[]
  vendors: readonly Vendor[]
  registrations: readonly GstRegistration[]
  /** Save the site and place the areas (`useCreateWarehouse`). */
  onCreate: (site: Warehouse, areas: AreaPick[]) => Promise<{ moved: Warehouse | null }>
}

/**
 * Settings ▸ Locations & warehouses ▸ New location: the 4-step setup wizard of the prototype
 * (Basics → Building → Areas → Finish), built from the shared `Wizard` template.
 */
export function LocationWizard({ open, onClose, noun, sites, employees, vendors, registrations, onCreate }: LocationWizardProps) {
  const vendorNos = useMemo(() => new Set(vendors.map((v) => v.no)), [vendors])

  const steps = useMemo<WizardStep<LocationWizardDraft>[]>(() => {
    const errorsOf = (id: LocationWizardStepId, d: LocationWizardDraft) => stepErrors(id, d, sites, vendorNos, registrations)
    const managerOptions = [
      { value: '', label: 'No one assigned' },
      ...employees
        .filter((e) => e.status !== 'Terminated')
        .map((e) => ({ value: e.id, label: e.title ? `${e.name} · ${e.title}` : e.name })),
    ]
    const operatorOptions = [
      { value: '', label: 'Choose the 3PL vendor…' },
      ...vendors.filter((v) => v.supplies !== 'goods').map((v) => ({ value: v.no, label: `${v.name} · ${v.no}` })),
    ]

    return [
      {
        id: 'basics',
        label: 'Basics',
        subtitle: 'Name it and pick what kind of site it is.',
        validate: (d) => errorsOf('basics', d),
        render: ({ draft, errors, update }) => (
          <div className="flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
              <WizardField label="Name" help={LOCATIONS_HELP.name} error={errors.name}>
                {(p) => (
                  <input
                    {...p}
                    value={draft.name}
                    onChange={(e) => update({ name: e.target.value })}
                    placeholder="e.g. Tiruvannamalai — Main"
                    autoComplete="off"
                    className={wizardControlClass(!!errors.name)}
                  />
                )}
              </WizardField>
              <WizardField label="Code" help={LOCATIONS_HELP.code} error={errors.code}>
                {(p) => (
                  <input
                    {...p}
                    value={draft.code}
                    onChange={(e) => update({ code: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '') })}
                    placeholder={draft.name.trim() ? effectiveCode(draft) : 'TVM-MAIN'}
                    maxLength={9}
                    autoComplete="off"
                    className={cn(wizardControlClass(!!errors.code), 'font-mono')}
                  />
                )}
              </WizardField>
            </div>
            <div className="flex flex-col gap-1.5">
              <span id="wiz-type-label" className="text-[12px] font-medium text-muted-foreground">
                What kind of site is it?
              </span>
              <div role="radiogroup" aria-labelledby="wiz-type-label" className="grid gap-2.5 sm:grid-cols-2">
                {SITE_TYPE_CARDS.map((t) => {
                  const selected = draft.type === t.value
                  return (
                    <Choice key={t.value} selected={selected} onSelect={() => update((d) => ({ ...d, type: t.value }))}>
                      <span
                        className={cn(
                          'flex size-[38px] flex-none items-center justify-center rounded-[9px] transition-colors duration-[140ms]',
                          selected ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground',
                        )}
                      >
                        <t.icon className="size-5" strokeWidth={1.8} />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="text-[13px] font-semibold text-foreground">{t.name}</span>
                        <span className="text-[12px] text-muted-foreground">{t.desc}</span>
                      </span>
                      <span
                        aria-hidden="true"
                        className={cn(
                          'flex size-[18px] flex-none items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity duration-[140ms]',
                          selected ? 'opacity-100' : 'opacity-0',
                        )}
                      >
                        <Check className="size-[11px]" strokeWidth={3.5} />
                      </span>
                    </Choice>
                  )
                })}
              </div>
            </div>
          </div>
        ),
      },
      {
        id: 'building',
        label: 'Building',
        subtitle: 'Tell us how the building is laid out.',
        validate: (d) => errorsOf('building', d),
        render: ({ draft, errors, update }) => {
          const multi = draft.floors.length > 1
          const setFloor = (i: number, patch: Partial<LocationWizardDraft['floors'][number]>) =>
            update((d) => ({ ...d, floors: d.floors.map((f, j) => (j === i ? { ...f, ...patch } : f)) }))
          return (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-[11px] border border-border bg-card px-3 py-2.5">
                <span id="wiz-floors-label" className="text-[13px] font-semibold">
                  {LOCATIONS_HELP.building.title}
                </span>
                <div role="radiogroup" aria-labelledby="wiz-floors-label" className="flex gap-1.5">
                  {[
                    { multi: false, label: 'Single level' },
                    { multi: true, label: 'Multi-level' },
                  ].map((o) => (
                    <Choice
                      key={o.label}
                      selected={multi === o.multi}
                      autoFocus={multi === o.multi}
                      onSelect={() => update((d) => ({ ...d, floors: setMultiLevel(d.floors, o.multi) }))}
                      className="items-center px-3 py-1.5 text-[13px] font-medium"
                    >
                      {o.label}
                    </Choice>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-semibold tracking-[0.07em] text-muted-foreground uppercase">Floors · ground at the bottom</span>
                <ul className="m-0 flex list-none flex-col gap-1.5 p-0" aria-label="Floors of the building">
                  {[...draft.floors].reverse().map((f) => (
                    <li key={f.id} className="flex items-center gap-2.5 rounded-[9px] border border-border bg-card px-3 py-2.5">
                      <span className="min-w-8 rounded-md bg-muted px-1.5 py-0.5 text-center font-mono text-[11px] font-semibold">
                        {normalizeFloorCode(f.code) || '—'}
                      </span>
                      <span className="flex-1 truncate text-[13px] font-medium">{f.name.trim() || 'Unnamed floor'}</span>
                      <Layers className="size-4 text-muted-foreground" strokeWidth={1.8} />
                    </li>
                  ))}
                </ul>
              </div>

              {multi && (
                <div className="flex flex-col gap-2 animate-in fade-in-0 motion-reduce:animate-none">
                  <div className="grid grid-cols-[84px_1fr_32px] gap-2 text-[10px] font-semibold tracking-[0.07em] text-muted-foreground uppercase">
                    <span>Code</span>
                    <span>Floor name</span>
                    <span />
                  </div>
                  {draft.floors.map((f, i) => (
                    <div key={f.id} className="grid grid-cols-[84px_1fr_32px] items-center gap-2">
                      <input
                        aria-label={`Floor ${i + 1} code`}
                        aria-invalid={errors.floors ? true : undefined}
                        value={f.code}
                        maxLength={FLOOR_CODE_MAX}
                        onChange={(e) => setFloor(i, { code: e.target.value.toUpperCase() })}
                        className={cn(wizardControlClass(!!errors.floors), 'font-mono')}
                      />
                      <input
                        aria-label={`Floor ${i + 1} name`}
                        value={f.name}
                        placeholder="e.g. Mezzanine"
                        onChange={(e) => setFloor(i, { name: e.target.value })}
                        className={wizardControlClass()}
                      />
                      {draft.floors.length > 1 ? (
                        <button
                          type="button"
                          aria-label={`Remove floor ${i + 1}`}
                          title="Remove floor"
                          onClick={() => update((d) => ({ ...d, floors: d.floors.filter((_, j) => j !== i) }))}
                          className="hover-lift inline-flex size-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:bg-tint-12 hover:text-foreground"
                        >
                          <Minus className="size-[14px]" strokeWidth={2} />
                        </button>
                      ) : (
                        <span />
                      )}
                    </div>
                  ))}
                  {errors.floors && <p className="m-0 text-[12px] text-bad-fg">{errors.floors}</p>}
                  <button
                    type="button"
                    onClick={() => update((d) => ({ ...d, floors: [...d.floors, newFloor(d.floors)] }))}
                    className="hover-lift inline-flex h-8 w-fit items-center gap-1.5 rounded-lg border border-dashed border-border bg-transparent px-3 text-[12.5px] font-medium text-muted-foreground hover:bg-tint-12 hover:text-foreground"
                  >
                    <Plus className="size-[14px]" strokeWidth={2.2} />
                    Add floor
                  </button>
                </div>
              )}
            </div>
          )
        },
      },
      {
        id: 'areas',
        label: 'Areas',
        subtitle: 'Add the areas you have. They can’t be changed once the site is created.',
        render: ({ draft, update }) => {
          const placed = placeAreas(draft.areas)
          const chosen = new Map(draft.areas.map((a) => [a.id, a.count]))
          const total = totalAreas(draft.areas)
          return (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-semibold tracking-[0.07em] text-muted-foreground uppercase">Quick start — optional</span>
                <div className="grid gap-2 sm:grid-cols-3">
                  {AREA_TEMPLATES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        const applied = applyAreaTemplate(t.id, draft.floors)
                        if (!applied) return
                        update((d) => ({ ...d, ...applied }))
                        toast('Template applied', { description: 'Tweak the areas, then continue' })
                      }}
                      className="hover-lift flex cursor-pointer flex-col items-start gap-0.5 rounded-[10px] border border-border bg-card px-3 py-2.5 text-left hover:border-foreground/25"
                    >
                      <span className="text-[13px] font-semibold text-foreground">{t.name}</span>
                      <span className="text-[12px] text-muted-foreground">{t.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-[minmax(0,300px)_1fr]">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-semibold tracking-[0.07em] text-muted-foreground uppercase">Floor preview</span>
                  <div
                    role="img"
                    aria-label={total > 0 ? `Preview of ${areaCountLabel(total)} on the ground floor` : 'Preview — no areas picked yet'}
                    className="relative w-full overflow-hidden rounded-[10px] border border-dashed border-border bg-panel/55"
                    // Dynamic: the preview keeps the floor's proportions, whatever the areas.
                    style={{ aspectRatio: `${placed.floorW} / ${placed.floorH}`, minHeight: 120 }}
                  >
                    {placed.zones.map((z) => {
                      const Icon = areaIcon(z.type)
                      return (
                        <div
                          key={z.id}
                          className="absolute box-border flex items-center justify-center rounded-[5px] border animate-in fade-in-0 zoom-in-95 motion-reduce:animate-none"
                          // Dynamic: each area's position and size on the floor, and its own colour.
                          style={{
                            left: `${(z.x / placed.floorW) * 100}%`,
                            top: `${(z.y / placed.floorH) * 100}%`,
                            width: `${(z.w / placed.floorW) * 100}%`,
                            height: `${(z.h / placed.floorH) * 100}%`,
                            color: z.color,
                            background: `color-mix(in oklab, ${z.color} 16%, transparent)`,
                            borderColor: `color-mix(in oklab, ${z.color} 55%, transparent)`,
                          }}
                        >
                          <Icon className="size-[14px]" strokeWidth={1.9} />
                        </div>
                      )
                    })}
                    {placed.zones.length === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-[12px] text-muted-foreground">
                        Pick areas on the right and they&rsquo;ll lay out here
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold tracking-[0.07em] text-muted-foreground uppercase">Pick your areas</span>
                    <span className="text-[12px] font-medium text-muted-foreground tabular-nums" aria-live="polite">
                      {areaCountLabel(total)}
                    </span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {AREA_TYPES.map((t) => {
                      const count = chosen.get(t.id)
                      const selected = count !== undefined
                      const Icon = areaIcon(t.id)
                      return (
                        <div
                          key={t.id}
                          className={cn(
                            'flex items-center gap-1 rounded-[10px] border-[1.5px] transition-colors duration-[140ms]',
                            selected ? 'border-[color-mix(in_oklab,var(--area)_60%,transparent)] bg-[color-mix(in_oklab,var(--area)_11%,var(--card))]' : 'border-border bg-card hover:border-foreground/25',
                          )}
                          // Dynamic: every area type carries its own colour.
                          style={{ ['--area' as string]: t.color }}
                        >
                          <button
                            type="button"
                            aria-pressed={selected}
                            onClick={() => update((d) => ({ ...d, areas: toggleAreaPick(d.areas, t.id) }))}
                            className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-[9px] border-0 bg-transparent p-2.5 text-left"
                          >
                            <span
                              className="flex size-[34px] flex-none items-center justify-center rounded-[9px]"
                              style={{ background: `color-mix(in oklab, ${t.color} 16%, transparent)`, color: t.color }}
                            >
                              <Icon className="size-[18px]" strokeWidth={1.9} />
                            </span>
                            <span className="flex min-w-0 flex-col gap-px">
                              <span className="truncate text-[12.5px] font-semibold text-foreground">{t.name}</span>
                              <span className="truncate text-[11px] text-muted-foreground">{t.desc}</span>
                            </span>
                          </button>
                          {selected && (
                            <span className="mr-2 inline-flex flex-none items-center gap-1 animate-in fade-in-0 motion-reduce:animate-none">
                              <button
                                type="button"
                                aria-label={`Fewer ${t.name}`}
                                disabled={count <= 1}
                                onClick={() => update((d) => ({ ...d, areas: stepAreaPick(d.areas, t.id, -1) }))}
                                className="hover-lift inline-flex size-6 items-center justify-center rounded-md border border-border bg-card text-foreground hover:bg-tint-12 disabled:opacity-40"
                              >
                                <Minus className="size-[11px]" strokeWidth={2.6} />
                              </button>
                              <span className="min-w-4 text-center text-[12px] font-semibold tabular-nums" aria-label={`${t.name} count`}>
                                {count}
                              </span>
                              <button
                                type="button"
                                aria-label={`More ${t.name}`}
                                disabled={count >= AREA_COUNT_MAX}
                                onClick={() => update((d) => ({ ...d, areas: stepAreaPick(d.areas, t.id, 1) }))}
                                className="hover-lift inline-flex size-6 items-center justify-center rounded-md border border-border bg-card text-foreground hover:bg-tint-12 disabled:opacity-40"
                              >
                                <Plus className="size-[11px]" strokeWidth={2.6} />
                              </button>
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          )
        },
      },
      {
        id: 'finish',
        label: 'Finish',
        subtitle: 'Where it is and how GST sees it, then create it.',
        validate: (d) => errorsOf('finish', d),
        render: ({ draft, errors, update }) => {
          const indian = isIndianSite(draft)
          const reg = indian && draft.state ? registrationForSite(registrations, draft) : null
          const stateName = stateWord(draft)
          const typeName = SITE_TYPE_CARDS.find((t) => t.value === draft.type)?.name ?? draft.type
          const displaced = principalDisplaced(draftToWarehouse(draft, sites), sites)
          const review: [string, string][] = [
            ['Name', draft.name.trim() || '—'],
            ['Code', effectiveCode(draft)],
            ['Type', typeName],
            ['Building', floorWord(draft.floors)],
            ['Areas', totalAreas(draft.areas) > 0 ? areaCountLabel(totalAreas(draft.areas)) : 'None yet'],
            ['Location', draft.city.trim() ? `${draft.city.trim()}${draft.state ? `, ${stateName}` : ''}` : 'Not set'],
          ]
          const registrationLine = !indian
            ? { tone: 'muted', text: 'Outside India — no GST registration', sub: 'Stock here is outside GST. Moves in are exports; moves out are imports.' }
            : !draft.state
              ? { tone: 'muted', text: 'Choose a state first', sub: 'The registration comes from the state — you never pick it by hand.' }
              : reg
                ? { tone: 'ok', text: `${reg.gstin} · ${stateName}`, sub: 'Receipts, transfers and invoices here file under this GSTIN.' }
                : { tone: 'warn', text: `No GST registration in ${stateName}`, sub: 'This site can’t go active until one exists.' }
          return (
            <div className="flex flex-col gap-3">
              <dl className="m-0 grid grid-cols-2 gap-3 rounded-[11px] border border-border bg-card p-3 sm:grid-cols-3" aria-label="Review">
                {review.map(([k, v]) => (
                  <div key={k} className="min-w-0">
                    <dt className="text-[9.5px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">{k}</dt>
                    <dd className={cn('m-0 mt-0.5 truncate text-[13px] font-semibold', k === 'Code' && 'font-mono')}>{v}</dd>
                  </div>
                ))}
              </dl>

              <WizardSection>Address &amp; GST</WizardSection>
              <WizardField label="Street address" help={LOCATIONS_HELP.addr}>
                {(p) => (
                  <input {...p} value={draft.addr} onChange={(e) => update({ addr: e.target.value })} placeholder="12 Kanakaraya Mudali Street" className={wizardControlClass()} />
                )}
              </WizardField>
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                <WizardField label="City" help={LOCATIONS_HELP.city}>
                  {(p) => <input {...p} value={draft.city} onChange={(e) => update({ city: e.target.value })} className={wizardControlClass()} />}
                </WizardField>
                <WizardField label={indian ? 'State' : 'Region'} help={LOCATIONS_HELP.state} required={indian} error={errors.state}>
                  {(p) =>
                    indian ? (
                      <select {...p} value={draft.state} onChange={(e) => update({ state: e.target.value })} className={wizardControlClass(!!errors.state)}>
                        <option value="">Choose a state…</option>
                        {STATE_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input {...p} value={draft.state} onChange={(e) => update({ state: e.target.value })} placeholder="State, province or emirate" className={wizardControlClass(!!errors.state)} />
                    )
                  }
                </WizardField>
                <WizardField label={indian ? 'PIN code' : 'Postal code'} help={LOCATIONS_HELP.zip}>
                  {(p) => <input {...p} value={draft.zip} maxLength={10} onChange={(e) => update({ zip: e.target.value })} className={cn(wizardControlClass(), 'font-mono')} />}
                </WizardField>
                <WizardField label="Floor area (sq ft)" help={LOCATIONS_HELP.area}>
                  {(p) => (
                    <input {...p} type="number" min={0} step={1} value={draft.area} onChange={(e) => update({ area: e.target.value })} placeholder="6200" className={wizardControlClass()} />
                  )}
                </WizardField>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <WizardField label="Country" help={LOCATIONS_HELP.country}>
                  {(p) => (
                    <select
                      {...p}
                      value={draft.country}
                      // The state is a GST code for Indian sites and free text elsewhere, so it resets with the country.
                      onChange={(e) => update((d) => ({ ...d, country: e.target.value, state: '', pobStatus: 'undeclared' }))}
                      className={wizardControlClass()}
                    >
                      {LOCATION_COUNTRIES.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  )}
                </WizardField>
                <WizardField label="Status" help={LOCATIONS_HELP.status} error={errors.status}>
                  {(p) => (
                    <select {...p} value={draft.status} onChange={(e) => update({ status: e.target.value })} className={wizardControlClass(!!errors.status)}>
                      {LOCATION_STATUSES.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  )}
                </WizardField>
              </div>

              <div
                aria-live="polite"
                className={cn(
                  'rounded-[10px] border px-3 py-2 text-[12.5px]',
                  registrationLine.tone === 'ok' && 'border-ok-fg/30 bg-ok-bg text-ok-fg',
                  registrationLine.tone === 'warn' && 'border-warn-fg/30 bg-warn-bg text-warn-fg',
                  registrationLine.tone === 'muted' && 'border-border bg-muted text-muted-foreground',
                )}
              >
                <div className="text-[9.5px] font-semibold tracking-[0.06em] uppercase opacity-80">GST registration</div>
                <div className="font-medium">{registrationLine.text}</div>
                <div className="opacity-80">{registrationLine.sub}</div>
              </div>

              {indian && (
                <WizardField label="On the GST certificate as" help={LOCATIONS_HELP.pobStatus}>
                  {(p) => (
                    <select {...p} value={draft.pobStatus} onChange={(e) => update({ pobStatus: e.target.value })} className={wizardControlClass()}>
                      {LOCATION_POB.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  )}
                </WizardField>
              )}
              {displaced && (
                <p aria-live="polite" className="m-0 text-[12px] text-muted-foreground">
                  Creating makes this the principal place and moves {displaced.name} to Additional.
                </p>
              )}

              <WizardSection>People — optional</WizardSection>
              <div className="grid gap-3 sm:grid-cols-2">
                <WizardField label="Site manager" help={LOCATIONS_HELP.managerEmpId}>
                  {(p) => (
                    <select {...p} value={draft.managerEmpId} onChange={(e) => update({ managerEmpId: e.target.value })} className={wizardControlClass()}>
                      {managerOptions.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  )}
                </WizardField>
                {draft.type === '3pl' && (
                  <WizardField label="Operated by (3PL vendor)" help={LOCATIONS_HELP.operatorVendorId} error={errors.operatorVendorId}>
                    {(p) => (
                      <select {...p} value={draft.operatorVendorId} onChange={(e) => update({ operatorVendorId: e.target.value })} className={wizardControlClass(!!errors.operatorVendorId)}>
                        {operatorOptions.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </WizardField>
                )}
              </div>
            </div>
          )
        },
      },
    ]
  }, [sites, employees, vendors, vendorNos, registrations])

  return (
    <Wizard<LocationWizardDraft>
      open={open}
      onClose={onClose}
      title={`New ${noun}`}
      steps={steps}
      createDraft={blankLocationDraft}
      finishLabel={`Create ${noun}`}
      discard={{ title: `Discard this ${noun}?`, description: `Nothing has been created. What you entered will be lost.` }}
      onFinish={async (d) => {
        // Every rule once more, on the whole draft; an error sends the wizard back to the step that owns it.
        const all = locationDraftErrors(d, sites, vendorNos, registrations)
        const owner = LOCATION_WIZARD_STEPS.find((s) => Object.keys(all).some((k) => stepOfError(k) === s))
        if (owner) {
          return { step: owner, errors: Object.fromEntries(Object.entries(all).filter(([k]) => stepOfError(k) === owner)) }
        }
        const site = draftToWarehouse(d, sites)
        const result = await onCreate(site, d.areas)
        const placed = totalAreas(d.areas)
        toast(`${noun[0].toUpperCase()}${noun.slice(1)} created`, {
          description: `${site.name} · ${site.code}${placed > 0 ? ` · ${areaCountLabel(placed)} placed` : ''}${site.floors && site.floors.length > 1 ? ` · ${site.floors.length} floors` : ''}`,
        })
        if (result.moved) toast('Principal place changed', { description: `${result.moved.name} moved to Additional.` })
        return undefined
      }}
    />
  )
}
