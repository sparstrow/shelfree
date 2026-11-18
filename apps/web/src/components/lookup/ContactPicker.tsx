import { ArrowLeft, Check, ChevronDown, Plus, Search, X } from 'lucide-react'
import { type KeyboardEvent, type ReactNode, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { fieldBoxClass } from '@/components/record-fields/model'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useList, useUpsert } from '@/data/queries'
import type { Contact } from '@/data/schemas'
import {
  type ContactLookup,
  blankContact,
  contactLinkedSummary,
  contactLinks,
  formatContactPhone,
  normalizeContact,
  validateContact,
} from '@/domain/contacts'
import { cn } from '@/lib/utils'

export interface ContactPickerProps {
  /** Currently selected contact no (`CON00001`), or `''`. */
  value?: string
  /** Called with the selected contact no (or `''` when cleared), plus the contact record when picked/created. */
  onChange: (contactNo: string, contact?: Contact) => void
  /** Contact nos to exclude from the list (e.g. already linked to this record). */
  exclude?: readonly string[]
  /** Show a "No contact" clear row when a value is set and query is empty. */
  allowNone?: boolean
  /** Popover header label, e.g. "Contact" or "Driver". */
  title?: string
  placeholder?: string
  disabled?: boolean
  /** Custom trigger element (`asChild`). Omit for the standard field trigger button. */
  children?: ReactNode
  id?: string
  'aria-invalid'?: boolean
  triggerClassName?: string
  align?: 'start' | 'center' | 'end'
}

type PickerOption =
  | { kind: 'none' }
  | { kind: 'row'; contact: Contact }
  | { kind: 'create' }

interface QuickDraft {
  name: string
  phone: string
  email: string
}

function initialsOf(name: string): string {
  const parts = String(name || '?').trim().split(/\s+/).filter(Boolean)
  return parts.slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?'
}

/**
 * Shared searchable contact picker popover over People ▸ Contacts.
 * Supports keyboard navigation (↑/↓/PgUp/PgDn/Enter/Esc), mouse picking,
 * and inline "Create …" quick-create saved through `useUpsert('contacts')`.
 */
export function ContactPicker({
  value = '',
  onChange,
  exclude = [],
  allowNone = true,
  title = '',
  placeholder = 'Pick a contact…',
  disabled = false,
  children,
  id,
  'aria-invalid': ariaInvalid,
  triggerClassName,
  align = 'start',
}: ContactPickerProps) {
  const listboxId = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const createNameRef = useRef<HTMLInputElement>(null)
  const optionRefs = useRef(new Map<number, HTMLDivElement>())

  const contactsQuery = useList('contacts')
  const vendorsQuery = useList('vendors')
  const customersQuery = useList('customers')
  const carriersQuery = useList('carriers')
  const upsertContact = useUpsert('contacts')

  const contacts = useMemo(() => contactsQuery.data ?? [], [contactsQuery.data])
  const lookups = useMemo<ContactLookup>(
    () => ({
      vendors: vendorsQuery.data ?? [],
      customers: customersQuery.data ?? [],
      carriers: carriersQuery.data ?? [],
    }),
    [vendorsQuery.data, customersQuery.data, carriersQuery.data],
  )

  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'list' | 'new'>('list')
  const [q, setQ] = useState('')
  const [hi, setHi] = useState(0)
  const [nd, setNd] = useState<QuickDraft>({ name: '', phone: '', email: '' })
  const [ndErr, setNdErr] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const excludeSet = useMemo(() => new Set(exclude), [exclude])
  const selectedContact = useMemo(() => contacts.find((c) => c.no === value), [contacts, value])

  const linksByNo = useMemo(() => {
    const map = new Map<string, ReturnType<typeof contactLinks>>()
    for (const c of contacts) {
      map.set(c.no, contactLinks(c.no, lookups))
    }
    return map
  }, [contacts, lookups])

  const matches = useMemo(() => {
    const qLower = q.trim().toLowerCase()
    return contacts
      .filter((c) => {
        if (c.active === false && c.no !== value) return false
        if (excludeSet.has(c.no)) return false
        if (!qLower) return true
        const links = linksByNo.get(c.no) ?? []
        const blob = [
          c.no,
          c.name,
          c.phone,
          formatContactPhone(c.phone),
          c.email,
          ...links.map((l) => `${l.name} ${l.role}`),
        ]
          .join(' ')
          .toLowerCase()
        return blob.includes(qLower)
      })
      .sort((a, b) => {
        if (qLower) {
          const sa = a.name.toLowerCase().startsWith(qLower) ? 0 : 1
          const sb = b.name.toLowerCase().startsWith(qLower) ? 0 : 1
          if (sa !== sb) return sa - sb
        }
        return a.name.localeCompare(b.name)
      })
      .slice(0, 60)
  }, [contacts, value, excludeSet, q, linksByNo])

  const options = useMemo<PickerOption[]>(() => {
    const out: PickerOption[] = []
    if (allowNone && value && !q.trim()) out.push({ kind: 'none' })
    for (const contact of matches) out.push({ kind: 'row', contact })
    out.push({ kind: 'create' })
    return out
  }, [allowNone, value, q, matches])

  const placeCaretAtEnd = (el: HTMLInputElement | null) => {
    if (!el) return
    el.focus()
    const len = el.value.length
    try {
      el.setSelectionRange(len, len)
    } catch {
      // Ignore if input is not selectable.
    }
  }

  useLayoutEffect(() => {
    if (!open) return
    if (mode === 'new') placeCaretAtEnd(createNameRef.current)
    else placeCaretAtEnd(searchRef.current)
  }, [open, mode])

  const scrollHighlighted = (index: number) => {
    optionRefs.current.get(index)?.scrollIntoView?.({ block: 'nearest' })
  }

  const openWithQuery = (initialQuery: string) => {
    setMode('list')
    setQ(initialQuery)
    setNd({ name: '', phone: '', email: '' })
    setNdErr({})
    if (!initialQuery && value) {
      const currentIndex = matches.findIndex((c) => c.no === value)
      const offset = allowNone && value ? 1 : 0
      setHi(currentIndex >= 0 ? currentIndex + offset : 0)
    } else {
      setHi(0)
    }
    setOpen(true)
  }

  const closeAndReturnFocus = () => {
    setOpen(false)
    window.setTimeout(() => triggerRef.current?.focus(), 0)
  }

  // Intercept Escape in capture phase before ListPage's window-capture Esc handler cancels drawer edit mode.
  const stateRef = useRef({ open, mode })
  useLayoutEffect(() => {
    stateRef.current = { open, mode }
  })
  useEffect(() => {
    const onWindowKey = (e: globalThis.KeyboardEvent) => {
      const cur = stateRef.current
      if (!cur.open || e.key !== 'Escape') return
      e.preventDefault()
      e.stopImmediatePropagation()
      if (cur.mode === 'new') {
        setMode('list')
        setNdErr({})
      } else {
        closeAndReturnFocus()
      }
    }
    window.addEventListener('keydown', onWindowKey, true)
    return () => window.removeEventListener('keydown', onWindowKey, true)
  }, [])

  const chooseOption = (opt: PickerOption | undefined) => {
    if (!opt) return
    if (opt.kind === 'create') {
      setMode('new')
      setNd({ name: q.trim(), phone: '', email: '' })
      setNdErr({})
      return
    }
    if (opt.kind === 'none') {
      setOpen(false)
      onChange('')
      window.setTimeout(() => triggerRef.current?.focus(), 0)
      return
    }
    setOpen(false)
    onChange(opt.contact.no, opt.contact)
    window.setTimeout(() => triggerRef.current?.focus(), 0)
  }

  const createAndLink = async () => {
    if (saving) return
    const now = new Date().toISOString()
    const candidate = normalizeContact({
      ...blankContact(contacts),
      name: nd.name,
      phone: nd.phone,
      email: nd.email,
      createdAt: now,
      updatedAt: now,
    })
    const errors = validateContact(candidate, contacts)
    if (Object.keys(errors).length) {
      setNdErr(errors)
      return
    }
    setSaving(true)
    try {
      const saved = await upsertContact.mutateAsync(candidate)
      toast('Contact created', { description: `${saved.no} · ${saved.name}` })
      setOpen(false)
      onChange(saved.no, saved)
      window.setTimeout(() => triggerRef.current?.focus(), 0)
    } catch {
      setNdErr({ name: 'Could not save the contact. Try again.' })
    } finally {
      setSaving(false)
    }
  }

  const onSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const next = Math.min(options.length - 1, hi + 1)
      setHi(next)
      scrollHighlighted(next)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const next = Math.max(0, hi - 1)
      setHi(next)
      scrollHighlighted(next)
    } else if (e.key === 'PageDown') {
      e.preventDefault()
      const next = Math.min(options.length - 1, hi + 6)
      setHi(next)
      scrollHighlighted(next)
    } else if (e.key === 'PageUp') {
      e.preventDefault()
      const next = Math.max(0, hi - 6)
      setHi(next)
      scrollHighlighted(next)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
      chooseOption(options[hi])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      closeAndReturnFocus()
    } else if (e.key === 'Tab') {
      setOpen(false)
    }
  }

  const onCreateKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
      void createAndLink()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      setMode('list')
      setNdErr({})
    }
  }

  const onTriggerKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (open || disabled) return
    if (e.key === 'ArrowDown' || e.key === 'F4') {
      e.preventDefault()
      openWithQuery('')
    } else if (e.key.length === 1 && e.key !== ' ' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault()
      openWithQuery(e.key)
    }
  }

  const qTrim = q.trim()
  const matchCount = matches.length
  const countLabel = qTrim ? `${matchCount} ${matchCount === 1 ? 'match' : 'matches'}` : ''

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) openWithQuery('')
        else setOpen(false)
      }}
    >
      <PopoverTrigger asChild onKeyDown={onTriggerKeyDown}>
        {children ?? (
          <button
            ref={triggerRef}
            id={id}
            type="button"
            disabled={disabled}
            aria-invalid={ariaInvalid || undefined}
            aria-haspopup="listbox"
            className={cn(
              fieldBoxClass,
              'h-8 justify-between gap-2 bg-transparent text-left font-normal outline-none focus-visible:border-ring',
              ariaInvalid ? 'border-bad-fg' : 'border-input',
              triggerClassName,
            )}
          >
            <span
              className={cn(
                'min-w-0 flex-1 truncate',
                selectedContact ? 'font-medium text-foreground' : 'text-muted-foreground',
              )}
            >
              {selectedContact
                ? `${selectedContact.name}${selectedContact.active === false ? ' (inactive)' : ''}`
                : value || placeholder}
            </span>
            <ChevronDown className="size-[13px] flex-none text-muted-foreground" strokeWidth={2} />
          </button>
        )}
      </PopoverTrigger>

      <PopoverContent
        align={align}
        data-lk-pop=""
        aria-label={title || 'Pick a contact'}
        onOpenAutoFocus={(e) => {
          e.preventDefault()
          placeCaretAtEnd(mode === 'new' ? createNameRef.current : searchRef.current)
        }}
        className="flex max-h-[392px] w-[360px] max-w-[calc(100vw-16px)] flex-col gap-0 overflow-hidden rounded-[10px] border border-border bg-card p-0 text-foreground shadow-pop"
      >
        {mode === 'list' ? (
          <>
            {title && (
              <div className="px-3 pt-[9px] text-[11px] font-semibold tracking-[0.05em] text-muted-foreground uppercase">
                {title}
              </div>
            )}
            <div className="mx-2 mt-1.5 flex h-9 items-center gap-2 rounded-lg border border-input px-2.5 focus-within:border-ring">
              <Search className="size-[14px] flex-none text-muted-foreground" strokeWidth={2} />
              <input
                ref={searchRef}
                autoFocus
                value={q}
                onChange={(e) => {
                  setQ(e.target.value)
                  setHi(0)
                }}
                onKeyDown={onSearchKeyDown}
                placeholder="Search by name, phone, email or company…"
                aria-label="Search contacts"
                role="combobox"
                aria-expanded={open}
                aria-autocomplete="list"
                aria-controls={listboxId}
                className="h-[34px] min-w-0 flex-1 border-0 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
              />
              {countLabel && <span className="tnum flex-none text-[11px] text-muted-foreground">{countLabel}</span>}
            </div>

            <div
              id={listboxId}
              data-lk-list=""
              role="listbox"
              className="min-h-0 max-h-[268px] flex-1 overflow-auto p-1.5"
            >
              {matchCount === 0 && (
                <div className="px-2.5 pt-3 pb-2 text-center text-[12.5px] text-muted-foreground">
                  {qTrim ? `No contacts match “${qTrim}”.` : 'Everyone is already linked here.'}
                </div>
              )}

              {options.map((opt, idx) => {
                const active = idx === hi
                const baseRow = cn(
                  'flex min-h-[42px] cursor-pointer items-center gap-2.5 rounded-[7px] px-2 py-1.5 transition-colors duration-[120ms]',
                  active ? 'bg-tint-10' : 'bg-transparent',
                )
                if (opt.kind === 'none') {
                  return (
                    <div
                      key="__none__"
                      ref={(el) => {
                        if (el) optionRefs.current.set(idx, el)
                        else optionRefs.current.delete(idx)
                      }}
                      role="option"
                      aria-selected={active}
                      onMouseMove={() => {
                        if (hi !== idx) setHi(idx)
                      }}
                      onClick={() => chooseOption(opt)}
                      className={baseRow}
                    >
                      <span className="flex size-7 flex-none items-center justify-center rounded-full border border-dashed border-input text-muted-foreground">
                        <X className="size-3" strokeWidth={2} />
                      </span>
                      <span className="text-[13px] text-muted-foreground">No contact</span>
                    </div>
                  )
                }

                if (opt.kind === 'create') {
                  return (
                    <div
                      key="__create__"
                      ref={(el) => {
                        if (el) optionRefs.current.set(idx, el)
                        else optionRefs.current.delete(idx)
                      }}
                      role="option"
                      aria-selected={active}
                      onMouseMove={() => {
                        if (hi !== idx) setHi(idx)
                      }}
                      onClick={() => chooseOption(opt)}
                      className={baseRow}
                    >
                      <span className="flex size-7 flex-none items-center justify-center rounded-full bg-primary-tint text-primary">
                        <Plus className="size-[13px]" strokeWidth={2.4} />
                      </span>
                      <span className="truncate text-[13px] font-semibold text-primary">
                        {qTrim ? `Create “${qTrim}”` : 'Create a new contact'}
                      </span>
                    </div>
                  )
                }

                const c = opt.contact
                const links = linksByNo.get(c.no) ?? []
                const sub = [formatContactPhone(c.phone), c.email].filter(Boolean).join(' · ') || 'No phone or email'
                const meta = contactLinkedSummary(links) || 'Unlinked'
                const isCurrent = c.no === value
                return (
                  <div
                    key={c.no}
                    ref={(el) => {
                      if (el) optionRefs.current.set(idx, el)
                      else optionRefs.current.delete(idx)
                    }}
                    role="option"
                    aria-selected={active}
                    onMouseMove={() => {
                      if (hi !== idx) setHi(idx)
                    }}
                    onClick={() => chooseOption(opt)}
                    className={baseRow}
                  >
                    <span className="flex size-7 flex-none items-center justify-center rounded-full bg-neutral-bg text-[11px] font-semibold text-neutral-fg">
                      {initialsOf(c.name)}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-px">
                      <span className="flex min-w-0 items-baseline gap-[7px]">
                        <span className="truncate text-[13px] font-medium">
                          {c.name}
                          {c.active === false ? ' (inactive)' : ''}
                        </span>
                        <span className="flex-none font-mono text-[10.5px] text-muted-foreground">{c.no}</span>
                      </span>
                      <span className="tnum truncate text-[11.5px] text-muted-foreground">{sub}</span>
                    </span>
                    <span className="max-w-[120px] flex-none truncate text-[11px] text-muted-foreground">{meta}</span>
                    {isCurrent && <Check className="size-[14px] flex-none text-primary" strokeWidth={2.4} />}
                  </div>
                )
              })}
            </div>

            <div className="flex items-center gap-3 border-t border-border px-3 py-[7px] text-[11px] text-muted-foreground">
              <span>↑↓ move</span>
              <span>Enter pick</span>
              <span>Esc close</span>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
              <button
                type="button"
                aria-label="Back to list"
                title="Back to the list (Esc)"
                onClick={() => {
                  setMode('list')
                  setNdErr({})
                }}
                className="inline-flex size-[26px] items-center justify-center rounded-[7px] border-0 bg-transparent text-muted-foreground transition-colors duration-[140ms] hover:bg-tint-12 hover:text-foreground"
              >
                <ArrowLeft className="size-[14px]" strokeWidth={2} />
              </button>
              <span className="text-[13.5px] font-semibold">New contact</span>
            </div>

            <div className="grid animate-sf-fade grid-cols-2 gap-x-2.5 gap-y-[11px] p-3">
              <label className="col-span-2 block">
                <span className="mb-[5px] block text-xs font-medium text-muted-foreground">Name</span>
                <input
                  ref={createNameRef}
                  autoFocus
                  value={nd.name}
                  onChange={(e) => {
                    const v = e.target.value
                    setNd((prev) => ({ ...prev, name: v }))
                    setNdErr((prev) => ({ ...prev, name: '' }))
                  }}
                  onKeyDown={onCreateKeyDown}
                  placeholder="e.g. Selvi Murugesan"
                  aria-invalid={!!ndErr.name}
                  className={cn(
                    'h-8 w-full rounded-[7px] border bg-transparent px-2.5 text-[13px] text-foreground outline-none focus:border-ring',
                    ndErr.name ? 'border-bad-fg' : 'border-input',
                  )}
                />
                {ndErr.name && (
                  <span role="alert" className="mt-1 block text-[11.5px] leading-[1.4] text-bad-fg">
                    {ndErr.name}
                  </span>
                )}
              </label>

              <label className="block">
                <span className="mb-[5px] block text-xs font-medium text-muted-foreground">Phone</span>
                <input
                  value={nd.phone}
                  onChange={(e) => {
                    const v = e.target.value
                    setNd((prev) => ({ ...prev, phone: v }))
                    setNdErr((prev) => ({ ...prev, phone: '' }))
                  }}
                  onKeyDown={onCreateKeyDown}
                  placeholder="94421 10290"
                  aria-invalid={!!ndErr.phone}
                  className={cn(
                    'h-8 w-full rounded-[7px] border bg-transparent px-2.5 font-mono text-[13px] text-foreground outline-none focus:border-ring',
                    ndErr.phone ? 'border-bad-fg' : 'border-input',
                  )}
                />
                {ndErr.phone && (
                  <span role="alert" className="mt-1 block text-[11.5px] leading-[1.4] text-bad-fg">
                    {ndErr.phone}
                  </span>
                )}
              </label>

              <label className="block">
                <span className="mb-[5px] block text-xs font-medium text-muted-foreground">Email</span>
                <input
                  value={nd.email}
                  onChange={(e) => {
                    const v = e.target.value
                    setNd((prev) => ({ ...prev, email: v }))
                    setNdErr((prev) => ({ ...prev, email: '' }))
                  }}
                  onKeyDown={onCreateKeyDown}
                  placeholder="name@company.in"
                  aria-invalid={!!ndErr.email}
                  className={cn(
                    'h-8 w-full rounded-[7px] border bg-transparent px-2.5 text-[13px] text-foreground outline-none focus:border-ring',
                    ndErr.email ? 'border-bad-fg' : 'border-input',
                  )}
                />
                {ndErr.email && (
                  <span role="alert" className="mt-1 block text-[11.5px] leading-[1.4] text-bad-fg">
                    {ndErr.email}
                  </span>
                )}
              </label>

              <div className="col-span-2 text-[11.5px] leading-[1.45] text-muted-foreground">
                Saved to People › Contacts, so the same person can be linked to any vendor, customer or carrier.
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-border px-3 py-2.5">
              <button
                type="button"
                onClick={() => {
                  setMode('list')
                  setNdErr({})
                }}
                className="hover-lift h-[30px] rounded-lg border border-input bg-transparent px-3 text-[12.5px] font-medium text-foreground hover:bg-tint-10"
              >
                Back
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void createAndLink()}
                title="Create and link (Enter)"
                className="hover-lift h-[30px] rounded-lg border-0 bg-primary px-[14px] text-[12.5px] font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
              >
                Create &amp; link
              </button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}
