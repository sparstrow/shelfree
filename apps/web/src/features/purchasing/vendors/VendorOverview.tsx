import { FieldRows } from '@/components/record-fields/FieldRows'
import type { EditorField } from '@/components/record-fields/model'
import { RecordCard, type RecordTabContext } from '@/components/record-page/RecordPage'
import { secondaryButton } from '@/components/document/parts'
import type { Vendor } from '@/data/schemas'
import { VENDOR_GST_TYPES, vendorGstTypeInfo } from '@/domain/gst'
import {
  VENDOR_PAYMENT_METHODS,
  type VendorActivityEntry,
  type VendorForm,
  type VendorStats,
  type VendorSupply,
  vendorGstEffect,
} from '@/domain/vendor'
import { EM_DASH, fmtDate, int, money } from '@/lib/format'
import { cn } from '@/lib/utils'

/** Read-only facts shown as rows next to the editable ones (they never move in edit). */
export interface VendorFacts {
  supplies: string
  vendorSince: string
  lastOrder: string
  openOrders: string
}

/** The page's form values: what Overview edits plus its read-only facts. */
export type VendorDraft = VendorForm & VendorFacts

export interface WorkspaceTaxLabels {
  /** Workspace values, to mark the matching option "(workspace)". */
  taxCalc: 'line' | 'rate'
  roundTotal: boolean
}

export interface VendorOverviewProps {
  ctx: RecordTabContext<Vendor, VendorDraft>
  stats: VendorStats
  supply: VendorSupply
  activity: VendorActivityEntry[]
  purchasePersonOptions: { value: string; label: string }[]
  workspaceTax: WorkspaceTaxLabels
}

const TAX_CALC_LABEL = { line: 'On each line', rate: 'On each tax-rate total' } as const

export function VendorOverview({ ctx, stats, supply, activity, purchasePersonOptions, workspaceTax }: VendorOverviewProps) {
  const { record, draft, editing, errors, onChange, goToTab } = ctx
  const onTime = stats.onTimePct

  const kpis = [
    { label: 'Balance', value: money(record.balance), sub: 'Owed to this vendor' },
    {
      label: 'Due now',
      value: money(record.balanceDue),
      sub: record.overdue > 0 ? `${money(record.overdue)} overdue` : 'Nothing overdue',
      tone: record.overdue > 0 ? ('bad' as const) : undefined,
    },
    {
      label: 'Open orders',
      value: money(stats.openValue),
      sub: stats.open.length
        ? `${int(stats.open.length)} ${stats.open.length === 1 ? 'order' : 'orders'} to receive${stats.lateOpen ? ` · ${stats.lateOpen} late` : ''}`
        : 'Nothing to receive',
    },
    {
      label: 'On-time delivery',
      value: onTime == null ? EM_DASH : `${onTime}%`,
      sub: stats.timed ? `${stats.onTime} of ${stats.timed} receipts on time` : 'No posted receipts yet',
      tone: onTime != null && onTime < 80 ? ('warn' as const) : undefined,
    },
  ]

  // ── Details ────────────────────────────────────────────────────────────────
  const methods: string[] = [...VENDOR_PAYMENT_METHODS]
  if (draft.paymentMethod && !methods.includes(draft.paymentMethod)) methods.unshift(draft.paymentMethod)
  const detailFields: EditorField<VendorDraft>[] = [
    { key: 'category', label: 'Category', type: 'text' },
    { key: 'supplies', label: 'Supplies', type: 'text', locked: true },
    { key: 'paymentTerms', label: 'Payment terms', type: 'text' },
    {
      key: 'paymentMethod',
      label: 'Payment method',
      type: 'select',
      options: [{ value: '', label: 'Not set' }, ...methods.map((m) => ({ value: m, label: m }))],
      display: (d) => d.paymentMethod,
    },
    {
      key: 'purchasePerson',
      label: 'Purchase person',
      type: 'select',
      options: purchasePersonOptions,
      hint: 'The buyer responsible for this vendor. New purchase orders to this vendor start with them.',
    },
    {
      key: 'budgetedAmount',
      label: 'Purchase budget',
      type: 'number',
      display: (d) => (Number(d.budgetedAmount) > 0 ? money(Number(d.budgetedAmount)) : 'Not set'),
      muted: (d) => !(Number(d.budgetedAmount) > 0),
    },
    { key: 'vendorSince', label: 'Vendor since', type: 'text', locked: true },
    { key: 'lastOrder', label: 'Last order', type: 'text', locked: true },
    { key: 'openOrders', label: 'Open orders', type: 'text', locked: true },
  ]
  const typeInfo = vendorGstTypeInfo(draft.gstRegType)

  // ── Tax ────────────────────────────────────────────────────────────────────
  const vendorRules = draft.taxRules === 'vendor'
  const gstFields: EditorField<VendorDraft>[] = [
    {
      key: 'gstRegType',
      label: 'GST registration',
      type: 'select',
      options: VENDOR_GST_TYPES.map((t) => ({ value: t.value, label: t.label + (t.value === 'regular' ? ' (default)' : '') })),
      display: (d) => vendorGstTypeInfo(d.gstRegType).label,
      hint: typeInfo.desc,
    },
    ...(typeInfo.gstin
      ? [
          {
            key: 'gstin' as const,
            label: 'GSTIN',
            type: 'text' as const,
            mono: true,
            placeholder: '33AAFCK5100M1Z0',
            maxLength: 15,
            display: (d) => d.gstin || 'Not added',
            muted: (d) => !d.gstin,
            copyable: true,
          } satisfies EditorField<VendorDraft>,
        ]
      : []),
  ]
  const ruleFields: EditorField<VendorDraft>[] = [
    {
      key: 'taxRules',
      label: 'Tax rules',
      type: 'select',
      options: [
        { value: 'workspace', label: 'Workspace settings' },
        { value: 'vendor', label: 'Vendor-specific' },
      ],
      hint: 'Workspace settings follow Settings ▸ Tax settings. Vendor-specific rules apply to this vendor’s new purchase orders only.',
    },
    {
      key: 'taxCalc',
      label: 'Calculate tax',
      type: 'select',
      locked: !vendorRules,
      options: (['line', 'rate'] as const).map((k) => ({
        value: k,
        label: TAX_CALC_LABEL[k] + (k === workspaceTax.taxCalc ? ' (workspace)' : ''),
      })),
      display: (d) => TAX_CALC_LABEL[d.taxCalc],
    },
    {
      key: 'roundTotal',
      label: 'Round total to the rupee',
      type: 'select',
      locked: !vendorRules,
      options: [
        { value: 'yes', label: 'Yes' + (workspaceTax.roundTotal ? ' (workspace)' : '') },
        { value: 'no', label: 'No' + (!workspaceTax.roundTotal ? ' (workspace)' : '') },
      ],
      display: (d) => (d.roundTotal === 'yes' ? 'Yes' : 'No'),
    },
  ]
  const dot = typeInfo.charges ? 'bg-ok-fg' : typeInfo.value === 'sez' || typeInfo.value === 'overseas' ? 'bg-info-fg' : 'bg-muted-foreground'
  const clearedGstin = editing && !typeInfo.gstin && record.gstin.trim() !== ''

  return (
    <div className="animate-sf-fade">
      <div className="mb-5 grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-3.5">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border border-border bg-card px-4 py-[15px]">
            <div className="text-[11px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">{k.label}</div>
            <div
              className={cn(
                'tnum mt-1.5 text-[22px] font-bold',
                k.tone === 'bad' && 'text-bad-fg',
                k.tone === 'warn' && 'text-warn-fg',
              )}
            >
              {k.value}
            </div>
            <div className="mt-[3px] text-[11.5px] text-muted-foreground">{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] items-start gap-4">
        <RecordCard title="Details" hint="Who we buy from and on what terms. Supplies, Vendor since, Last order and Open orders are worked out from the vendor’s records and can’t be edited here.">
          <FieldRows
            fields={detailFields}
            values={draft}
            editing={editing}
            errors={errors}
            onChange={onChange}
            idPrefix="vp-details"
            layout="wide"
          />
        </RecordCard>

        <div className="flex flex-col gap-4">
          <RecordCard title="Supply">
            <div className="text-[12.5px] text-pretty text-muted-foreground">
              {supply.total
                ? `${int(supply.total)} ${supply.total === 1 ? 'item' : 'items'} supplied · ${int(supply.preferred)} as preferred vendor · ${int(supply.priced)} with a current price`
                : 'No items linked yet — set it as an item’s preferred vendor or add a price list.'}
            </div>
            {record.subInfo.sub && (
              <>
                <div className="mt-[11px] flex flex-wrap gap-1.5">
                  {(record.subInfo.ops ?? []).map((op) => (
                    <span key={op} className="rounded-full border border-border px-[9px] py-[3px] text-[11.5px] font-semibold">
                      {op}
                    </span>
                  ))}
                </div>
                <div className="mt-1.5">
                  {[
                    { k: 'Work centre', v: record.subInfo.wc || EM_DASH },
                    { k: 'Subcontract cost / unit', v: record.subInfo.cost != null ? money(record.subInfo.cost) : EM_DASH },
                    { k: 'Quoted lead time', v: record.subInfo.lead ? `${record.subInfo.lead} days` : EM_DASH },
                  ].map((f) => (
                    <div key={f.k} className="flex justify-between gap-3 border-b border-dashed border-border py-[9px] text-[13px]">
                      <span className="text-muted-foreground">{f.k}</span>
                      <span className="tnum min-w-0 truncate text-right font-semibold">{f.v}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
            <div className="mt-[13px] flex flex-wrap gap-2">
              <button type="button" className={secondaryButton} onClick={() => goToTab('items')}>
                Items supplied
              </button>
              <button type="button" className={secondaryButton} onClick={() => goToTab('orders')}>
                Purchase orders
              </button>
            </div>
          </RecordCard>

          <RecordCard
            title="Tax"
            hint="Why this vendor does or doesn’t charge GST — it decides whether tax is calculated on purchase orders and whether credit is claimed."
          >
            <FieldRows
              fields={gstFields}
              values={draft}
              editing={editing}
              errors={errors}
              onChange={onChange}
              idPrefix="vp-tax"
              layout="wide"
            />
            <div className="mt-2.5 flex items-center gap-[7px] text-xs leading-normal text-muted-foreground">
              <span className={cn('size-1.5 flex-none rounded-full transition-colors duration-[140ms]', dot)} />
              <span>{vendorGstEffect(draft.gstRegType)}</span>
            </div>
            {clearedGstin && (
              <div className="mt-2.5 animate-sf-slide rounded-lg bg-muted px-2.5 py-[9px] text-xs leading-normal text-muted-foreground">
                The GSTIN {record.gstin.toUpperCase()} will be removed when you save — {typeInfo.short.toLowerCase()} vendors don’t have one.
              </div>
            )}
            {typeInfo.charges ? (
              <div className="mt-1.5">
                <FieldRows
                  fields={ruleFields}
                  values={draft}
                  editing={editing}
                  errors={errors}
                  onChange={onChange}
                  idPrefix="vp-rules"
                  layout="wide"
                />
              </div>
            ) : (
              <div className="mt-2.5 text-xs leading-normal text-pretty text-muted-foreground">
                {typeInfo.value === 'sez' || typeInfo.value === 'overseas'
                  ? 'Purchase orders from this vendor carry no GST. IGST is paid at customs on the bill of entry.'
                  : 'Purchase orders from this vendor carry no GST, so there’s nothing to calculate or round.'}
              </div>
            )}
            {editing && (
              <div className="mt-2.5 animate-sf-fade text-xs leading-normal text-pretty text-muted-foreground">
                Applies to new purchase orders. Posted receipts and bills keep the registration they were posted with.
              </div>
            )}
          </RecordCard>

          <RecordCard title="Recent activity">
            {activity.map((a, i) => (
              <div key={`${a.text}-${i}`} className="flex gap-[11px] border-b border-dashed border-border py-2 last:border-b-0">
                <span className="tnum w-[88px] flex-none text-[11.5px] text-muted-foreground">{a.date ? fmtDate(a.date) : ''}</span>
                <span className="min-w-0 flex-1 text-[12.5px]">
                  <span className="block font-medium">{a.text}</span>
                  <span className="block text-muted-foreground">{a.meta}</span>
                </span>
              </div>
            ))}
          </RecordCard>
        </div>
      </div>
    </div>
  )
}
