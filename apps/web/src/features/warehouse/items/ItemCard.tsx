import { useNavigate } from '@tanstack/react-router'
import { Check } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { DocumentCard, DocumentPage, type DocumentState } from '@/components/document/DocumentPage'
import { Field, Notice, fieldClass, primaryButton, secondaryButton } from '@/components/document/parts'
import { HelpTarget } from '@/components/help/HelpTarget'
import type { HelpEntry, HelpMap } from '@/components/help/types'
import { Switch } from '@/components/ui/switch'
import { CommandError } from '@/data/api/commands'
import { useList, useUpsert } from '@/data/queries'
import type { Item, Vendor } from '@/data/schemas'
import {
  COSTING_METHODS,
  ITEM_TYPES,
  type ItemCardDraft,
  type ItemCardMode,
  blankItemCard,
  buildItemCardSave,
  itemCardCategoryGroups,
  itemCardMarginInfo,
  itemCardReorderHint,
  itemCardUomOptions,
  itemCardVendorOptions,
  itemNextNo,
  itemToCardDraft,
  validateItemCard,
} from '@/domain/item-card'
import { EM_DASH, money, pct } from '@/lib/format'
import { isTypingTarget } from '@/lib/keyboard'
import { cn } from '@/lib/utils'

interface TrackingToggleDef {
  id: string
  key: 'tracksLot' | 'tracksExpiry' | 'tracksSerial'
  label: string
}

const TRACKING_TOGGLES: readonly TrackingToggleDef[] = [
  { id: 'ic-tracks-lot', key: 'tracksLot', label: 'Tracks lot / batch' },
  { id: 'ic-tracks-expiry', key: 'tracksExpiry', label: 'Tracks expiry dates' },
  { id: 'ic-tracks-serial', key: 'tracksSerial', label: 'Tracks serial numbers' },
]

interface AvailabilityToggleDef {
  id: string
  key: 'sellable' | 'blocked'
  label: string
  help: HelpEntry
}

const AVAILABILITY_TOGGLES: readonly AvailabilityToggleDef[] = [
  {
    id: 'ic-sellable',
    key: 'sellable',
    label: 'Sellable',
    help: { title: 'Sellable', body: 'Appears in the catalogue and on sales orders.' },
  },
  {
    id: 'ic-blocked',
    key: 'blocked',
    label: 'Blocked',
    help: { title: 'Blocked', body: 'Stops the item being used on any new document.' },
  },
]

/** Quiet help for the card (CLAUDE.md "Quiet pages"): descriptions live behind ⓘ. */
const HELP = {
  no: { title: 'Item no.', body: 'The record key — fixed once created.' },
  desc: { title: 'Description', body: 'Shown on documents, pick lists and the catalogue.' },
  availability: {
    title: 'Availability',
    body: 'Stock quantities are never typed here — they move through receipts, shipments and assembly. Open Stock by Location to see them.',
  },
} satisfies HelpMap

function SectionTitle({ children, className, help }: { children: string; className?: string; help?: HelpEntry }) {
  return (
    <div
      className={cn(
        'mb-[13px] text-[11px] font-semibold tracking-[0.05em] text-muted-foreground uppercase',
        className,
      )}
    >
      {help ? (
        <HelpTarget help={help} label={help.title}>
          {children}
        </HelpTarget>
      ) : (
        children
      )}
    </div>
  )
}

export interface ItemCardProps {
  mode: ItemCardMode
  routeNo?: string
}

/** Warehouse ▸ Item card (`/warehouse/items/new` and `/warehouse/items/$no/edit`). */
export function ItemCard({ mode, routeNo }: ItemCardProps) {
  const items = useList('items')
  const vendors = useList('vendors')

  const queries = [items, vendors]
  const failed = queries.find((q) => q.isError)
  const loading = queries.some((q) => q.isLoading)

  const isNew = mode === 'new'
  const targetNo = routeNo ?? ''
  const saved = !isNew ? items.data?.find((item) => item.no === targetNo) : undefined
  const missing = !failed && !loading && !isNew && !saved

  const backTo = isNew ? '/warehouse/items' : `/warehouse/items/${encodeURIComponent(targetNo)}`
  const backLabel = isNew ? 'Back to items' : 'Back to item'
  const pageLabel = isNew ? 'New item' : `Edit item ${targetNo}`

  if (failed || loading) {
    const state: DocumentState = failed
      ? { kind: 'error', message: 'Could not load item details.', retry: () => void failed.refetch() }
      : { kind: 'loading' }

    return (
      <DocumentPage
        pageLabel={pageLabel}
        backTo={backTo}
        header={{
          title: isNew ? 'New item' : 'Edit item',
          no: isNew ? undefined : targetNo,
          status: isNew ? 'Draft' : 'Saved record',
          backLabel,
        }}
        state={state}
      />
    )
  }

  if (missing || (!isNew && !saved)) {
    return (
      <DocumentPage
        pageLabel={pageLabel}
        backTo="/warehouse/items"
        header={{
          title: 'Edit item',
          no: targetNo,
          backLabel: 'Back to items',
        }}
        state={{ kind: 'error', message: `Item ${targetNo} was not found.` }}
      />
    )
  }

  return (
    <ItemCardForm
      key={isNew ? 'new' : `edit:${saved?.no ?? targetNo}`}
      mode={mode}
      items={items.data ?? []}
      vendors={vendors.data ?? []}
      saved={saved}
    />
  )
}

interface ItemCardFormProps {
  mode: ItemCardMode
  items: readonly Item[]
  vendors: readonly Vendor[]
  saved?: Item
}

function ItemCardForm({ mode, items, vendors, saved }: ItemCardFormProps) {
  const navigate = useNavigate()
  const upsert = useUpsert('items')

  const editing = mode === 'edit'
  const lockedNo = saved?.no ?? ''

  const [draft, setDraft] = useState<ItemCardDraft>(() =>
    saved ? itemToCardDraft(saved) : blankItemCard(items),
  )
  const [error, setError] = useState('')

  const backTo = editing ? `/warehouse/items/${encodeURIComponent(lockedNo)}` : '/warehouse/items'
  const normalizedNo = draft.no.trim().toUpperCase()
  const noLabel = editing ? lockedNo : normalizedNo || 'Unsaved'

  const categoryGroups = useMemo(
    () => itemCardCategoryGroups(items, draft.category),
    [items, draft.category],
  )
  const uomOptions = useMemo(() => itemCardUomOptions(draft.uom), [draft.uom])
  const vendorOptions = useMemo(
    () => itemCardVendorOptions(vendors, draft.vendor),
    [vendors, draft.vendor],
  )
  const typeOptions = useMemo(
    () =>
      !draft.type || ITEM_TYPES.includes(draft.type as (typeof ITEM_TYPES)[number])
        ? [...ITEM_TYPES]
        : [...ITEM_TYPES, draft.type],
    [draft.type],
  )
  const costingOptions = useMemo(
    () =>
      !draft.costing || COSTING_METHODS.includes(draft.costing as (typeof COSTING_METHODS)[number])
        ? [...COSTING_METHODS]
        : [...COSTING_METHODS, draft.costing],
    [draft.costing],
  )
  const { ratio: marginRatio, unitMargin } = useMemo(
    () => itemCardMarginInfo(draft.price, draft.cost),
    [draft.price, draft.cost],
  )
  const reorderHint = useMemo(
    () => itemCardReorderHint(draft.rp, draft.uom),
    [draft.rp, draft.uom],
  )

  const patchDraft = useCallback((patch: Partial<ItemCardDraft>) => {
    setError('')
    setDraft((prev) => ({ ...prev, ...patch }))
  }, [])

  const goBack = useCallback(() => {
    if (editing) {
      void navigate({ to: '/warehouse/items/$no', params: { no: lockedNo } })
    } else {
      void navigate({ to: '/warehouse/items' })
    }
  }, [editing, lockedNo, navigate])

  const handleSave = useCallback(async () => {
    const validationError = validateItemCard(draft, items, mode, lockedNo)
    if (validationError) {
      setError(validationError)
      return
    }

    const nextItem = buildItemCardSave(draft, {
      mode,
      existing: saved,
    })

    try {
      await upsert.mutateAsync(nextItem)
    } catch (err) {
      setError(
        err instanceof CommandError
          ? err.message
          : 'Could not save the item. Check your connection and try again.',
      )
      return
    }

    setError('')
    toast(editing ? 'Item updated' : 'Item created', {
      description: `${nextItem.no} · ${nextItem.desc}`,
    })

    if (editing) {
      void navigate({ to: '/warehouse/items/$no', params: { no: nextItem.no } })
    } else {
      void navigate({ to: '/warehouse/items', search: { sel: nextItem.no } })
    }
  }, [draft, items, mode, lockedNo, saved, upsert, editing, navigate])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && (e.key.toLowerCase() === 's' || e.key === 'Enter')) {
        if (upsert.isPending) return
        e.preventDefault()
        void handleSave()
        return
      }
      if (e.key === 'Escape') {
        if (document.querySelector('[role="menu"], [role="listbox"], [role="dialog"]')) return
        if (isTypingTarget(e.target)) {
          if (e.target instanceof HTMLElement && e.target.tagName !== 'SELECT') {
            e.target.blur()
          }
          return
        }
        e.preventDefault()
        goBack()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [upsert.isPending, handleSave, goBack])

  return (
    <DocumentPage
      pageLabel={editing ? `Edit item ${lockedNo}` : 'New item'}
      backTo={backTo}
      header={{
        title: editing ? 'Edit item' : 'New item',
        no: noLabel,
        status: editing ? 'Saved record' : 'Draft',
        backLabel: editing ? 'Back to item' : 'Back to items',
      }}
      footerEnd={
        <>
          <button
            type="button"
            disabled={upsert.isPending}
            onClick={goBack}
            className={cn(secondaryButton, 'font-medium')}
          >
            Discard
          </button>
          <button
            type="button"
            disabled={upsert.isPending}
            onClick={() => void handleSave()}
            className={primaryButton}
          >
            <Check className="size-[14px]" strokeWidth={2.4} />
            {editing ? 'Save changes' : 'Create item'}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1.35fr_1fr]">
        <DocumentCard className="px-[18px] py-4">
          <SectionTitle>IDENTIFICATION</SectionTitle>
          <div className="grid grid-cols-1 gap-x-4 gap-y-[14px] sm:grid-cols-[200px_1fr]">
            <Field label="Item no." htmlFor="ic-no" help={HELP.no}>
              <input
                id="ic-no"
                value={draft.no}
                disabled={editing}
                onChange={(e) => patchDraft({ no: e.target.value })}
                placeholder="ASH-PWH-18"
                title={editing ? 'Item no. cannot be changed once created' : undefined}
                className={cn(fieldClass, 'font-mono')}
              />
              {editing ? null : (
                <button
                  type="button"
                  onClick={() => patchDraft({ no: itemNextNo(items) })}
                  className="mt-1.5 cursor-pointer border-0 bg-transparent p-0 text-[11.5px] font-medium text-primary transition-opacity duration-150 hover:opacity-75"
                >
                  Use next in sequence
                </button>
              )}
            </Field>

            <Field label="Description" htmlFor="ic-desc" help={HELP.desc}>
              <input
                id="ic-desc"
                value={draft.desc}
                onChange={(e) => patchDraft({ desc: e.target.value })}
                placeholder="e.g. Arunachala Mountain Sambrani Holder, Pearl White…"
                className={fieldClass}
              />
            </Field>
          </div>

          <div className="mt-[15px] max-w-[420px]">
            <Field label="Category" htmlFor="ic-category">
              <select
                id="ic-category"
                value={draft.category}
                onChange={(e) => patchDraft({ category: e.target.value })}
                className={fieldClass}
              >
                <option value="">Choose a category…</option>
                {categoryGroups.map((group) =>
                  group.group ? (
                    <optgroup key={group.group} label={group.group}>
                      {group.categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </optgroup>
                  ) : (
                    group.categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))
                  ),
                )}
              </select>
            </Field>
          </div>

          <div className="mt-[15px] grid grid-cols-1 gap-x-4 gap-y-[14px] sm:grid-cols-2">
            <Field label="Item type" htmlFor="ic-type">
              <select
                id="ic-type"
                value={draft.type}
                onChange={(e) => patchDraft({ type: e.target.value })}
                className={fieldClass}
              >
                {typeOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Unit of measure" htmlFor="ic-uom">
              <select
                id="ic-uom"
                value={draft.uom}
                onChange={(e) => patchDraft({ uom: e.target.value })}
                className={fieldClass}
              >
                {uomOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </DocumentCard>

        <DocumentCard className="px-[18px] py-4">
          <SectionTitle className="mb-1.5" help={HELP.availability}>
            AVAILABILITY
          </SectionTitle>
          {AVAILABILITY_TOGGLES.map((toggle, index) => (
            <div
              key={toggle.id}
              className={cn(
                'flex items-center gap-3 py-[11px]',
                index === 0 && 'border-b border-border',
              )}
            >
              <div className="flex-1">
                <HelpTarget help={toggle.help} label={toggle.label}>
                  <label
                    htmlFor={toggle.id}
                    className="block cursor-pointer text-[13.5px] font-semibold text-foreground"
                  >
                    {toggle.label}
                  </label>
                </HelpTarget>
              </div>
              <Switch
                id={toggle.id}
                checked={draft[toggle.key]}
                onCheckedChange={(checked) => patchDraft({ [toggle.key]: Boolean(checked) })}
              />
            </div>
          ))}
        </DocumentCard>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <DocumentCard className="px-[18px] py-4">
          <SectionTitle>PRICING & COSTING</SectionTitle>
          <div className="grid grid-cols-1 gap-x-4 gap-y-[14px] sm:grid-cols-2">
            <Field label="Unit price" htmlFor="ic-price">
              <input
                id="ic-price"
                type="number"
                min="0"
                step="0.01"
                value={draft.price}
                onChange={(e) => patchDraft({ price: e.target.value })}
                placeholder="0.00"
                className={cn(fieldClass, 'tnum')}
              />
            </Field>

            <Field label="Unit cost" htmlFor="ic-cost">
              <input
                id="ic-cost"
                type="number"
                min="0"
                step="0.01"
                value={draft.cost}
                onChange={(e) => patchDraft({ cost: e.target.value })}
                placeholder="0.00"
                className={cn(fieldClass, 'tnum')}
              />
            </Field>

            <Field label="Costing method" htmlFor="ic-costing">
              <select
                id="ic-costing"
                value={draft.costing}
                onChange={(e) => patchDraft({ costing: e.target.value })}
                className={fieldClass}
              >
                {costingOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </Field>

            <div className="flex flex-col justify-end">
              <div className="mb-[5px] text-xs font-medium text-muted-foreground">Margin</div>
              <div className="flex h-[34px] items-baseline gap-2">
                <span
                  className={cn(
                    'tnum text-[19px] font-bold',
                    marginRatio == null
                      ? 'text-muted-foreground'
                      : marginRatio < 0
                        ? 'text-bad-fg'
                        : 'text-foreground',
                  )}
                >
                  {marginRatio == null ? EM_DASH : pct(marginRatio)}
                </span>
                <span className="tnum text-xs text-muted-foreground">{money(unitMargin)} / unit</span>
              </div>
            </div>
          </div>
        </DocumentCard>

        <DocumentCard className="px-[18px] py-4">
          <SectionTitle>PURCHASING & REPLENISHMENT</SectionTitle>
          <div className="grid grid-cols-1 gap-x-4 gap-y-[14px] sm:grid-cols-[1fr_120px]">
            <Field label="Preferred vendor" htmlFor="ic-vendor">
              <select
                id="ic-vendor"
                value={draft.vendor}
                onChange={(e) => patchDraft({ vendor: e.target.value })}
                className={fieldClass}
              >
                {vendorOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Lead time" htmlFor="ic-lead">
              <input
                id="ic-lead"
                type="number"
                min="0"
                step="1"
                value={draft.lead}
                onChange={(e) => patchDraft({ lead: e.target.value })}
                placeholder="0"
                title="Days from order to receipt"
                className={cn(fieldClass, 'tnum')}
              />
            </Field>
          </div>

          <div className="mt-[14px] grid grid-cols-1 gap-x-4 gap-y-[14px] sm:grid-cols-3">
            <Field label="Reorder point" htmlFor="ic-rp" help={{ title: 'Reorder point', body: reorderHint }}>
              <input
                id="ic-rp"
                type="number"
                min="0"
                step="1"
                value={draft.rp}
                onChange={(e) => patchDraft({ rp: e.target.value })}
                placeholder="0"
                className={cn(fieldClass, 'tnum')}
              />
            </Field>

            <Field label="Reorder qty" htmlFor="ic-rq">
              <input
                id="ic-rq"
                type="number"
                min="0"
                step="1"
                value={draft.rq}
                onChange={(e) => patchDraft({ rq: e.target.value })}
                placeholder="0"
                className={cn(fieldClass, 'tnum')}
              />
            </Field>

            <Field label="Safety stock" htmlFor="ic-ss">
              <input
                id="ic-ss"
                type="number"
                min="0"
                step="1"
                value={draft.ss}
                onChange={(e) => patchDraft({ ss: e.target.value })}
                placeholder="0"
                className={cn(fieldClass, 'tnum')}
              />
            </Field>
          </div>

        </DocumentCard>
      </div>

      <DocumentCard className="px-[18px] py-4">
        <SectionTitle className="mb-[11px]">TRACKING</SectionTitle>
        <div className="grid grid-cols-1 gap-x-[18px] gap-y-2 md:grid-cols-2">
          {TRACKING_TOGGLES.map((opt) => (
            <label
              key={opt.id}
              htmlFor={opt.id}
              className="flex w-full cursor-pointer items-center gap-[9px] rounded-lg border border-border bg-transparent px-[9px] py-2 text-left text-[12.5px] text-foreground transition-colors duration-[140ms] hover:border-ring hover:bg-muted/60"
            >
              <input
                id={opt.id}
                type="checkbox"
                checked={draft[opt.key]}
                onChange={(e) => patchDraft({ [opt.key]: e.target.checked })}
                className="peer sr-only"
              />
              <span
                aria-hidden="true"
                className={cn(
                  'flex size-4 flex-none items-center justify-center rounded border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ring',
                  draft[opt.key]
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-input bg-transparent',
                )}
              >
                {draft[opt.key] && <Check className="size-[11px]" strokeWidth={3} />}
              </span>
              <span className="flex-1">{opt.label}</span>
            </label>
          ))}

          <Field label="Barcode" htmlFor="ic-barcode">
            <input
              id="ic-barcode"
              value={draft.barcode}
              onChange={(e) => patchDraft({ barcode: e.target.value })}
              placeholder="e.g. 8904210000000"
              className={cn(fieldClass, 'font-mono')}
            />
          </Field>
        </div>
      </DocumentCard>

      {error && <Notice tone="bad">{error}</Notice>}
    </DocumentPage>
  )
}
