import { Plus } from 'lucide-react'
import { StatusPill } from '@/components/StatusPill'
import { primaryButton, secondaryButton } from '@/components/document/parts'
import { RecordCard } from '@/components/record-page/RecordPage'
import type { Item } from '@/data/schemas'
import type { ItemBomSummary } from '@/domain/item-profile'
import { EM_DASH, fmtDate, int, money } from '@/lib/format'
import { cn } from '@/lib/utils'

export interface ItemBomTabProps {
  item: Item
  summary: ItemBomSummary
  onOpenItem: (itemNo: string) => void
  onOpenBom: (bomNo: string) => void
  onNewBom: () => void
  onOpenAo: (aoNo: string) => void
  onNewAo: () => void
}

export function ItemBomTab({
  item,
  summary,
  onOpenItem,
  onOpenBom,
  onNewBom,
  onOpenAo,
  onNewAo,
}: ItemBomTabProps) {
  const { activeBom, versions, lines, rollup, buildable, costDeltaText, whereUsed, assemblyOrders, openAssemblyOrders } =
    summary

  return (
    <div className="flex animate-sf-fade flex-col gap-4">
      {versions.length === 0 ? (
        <section
          aria-label="Bill of materials"
          className="rounded-xl border border-border bg-card px-6 py-10 text-center"
        >
          <div className="mb-1 text-sm font-semibold">This item has no bill of materials</div>
          <div className="mx-auto mb-4 max-w-[420px] text-[13px] text-muted-foreground">
            Add one if the item is assembled in-house — Shelfree will roll its cost up from the parts and let you raise
            assembly orders against it.
          </div>
          <button type="button" onClick={onNewBom} className={primaryButton}>
            <Plus className="size-3.5" strokeWidth={2.5} />
            New bill of materials
          </button>
        </section>
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <section aria-label="Active components" className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-[18px] py-[13px]">
              <div>
                <h2 className="m-0 text-[13px] font-semibold">Active components</h2>
                <div className="mt-0.5 text-[11.5px] text-muted-foreground">
                  {activeBom
                    ? `${activeBom.no} · ${activeBom.version} · makes ${int(activeBom.outputQty || 1)} ${activeBom.uom || item.uom}`
                    : 'No active version'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={onNewAo} className={cn(secondaryButton, 'h-8 px-3')}>
                  New assembly order
                </button>
                {activeBom && (
                  <button
                    type="button"
                    onClick={() => onOpenBom(activeBom.no)}
                    className={cn(primaryButton, 'h-8 px-3')}
                  >
                    Open
                  </button>
                )}
              </div>
            </div>

            {activeBom ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-border text-[10.5px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">
                      <th className="px-3 py-2 text-left">Component</th>
                      <th className="px-3 py-2 text-right">Qty per</th>
                      <th className="px-3 py-2 text-right">Needs</th>
                      <th className="px-3 py-2 text-right">Unit cost</th>
                      <th className="px-3 py-2 text-right">Line cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line) => (
                      <tr
                        key={line.item}
                        onClick={() => onOpenItem(line.item)}
                        className="cursor-pointer border-b border-border transition-colors duration-100 last:border-b-0 hover:bg-muted/60"
                      >
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[12.5px] font-semibold">{line.item}</span>
                            {line.isSubAssembly && (
                              <StatusPill
                                label="Sub-assembly"
                                tone="info"
                                className="px-2 text-[10px] font-bold tracking-[0.04em] uppercase"
                              />
                            )}
                          </div>
                          <div className="mt-0.5 text-[12.5px] text-muted-foreground">{line.desc}</div>
                        </td>
                        <td className="tnum px-3 py-2.5 text-right text-[13px] whitespace-nowrap">
                          {line.qtyPer}
                          {line.scrapPct ? ` +${line.scrapPct}%` : ''}
                        </td>
                        <td className="tnum px-3 py-2.5 text-right text-[12.5px] whitespace-nowrap text-muted-foreground">
                          {line.required} {line.uom}
                        </td>
                        <td className="tnum px-3 py-2.5 text-right text-[12.5px] text-muted-foreground">
                          {money(line.unitCost)}
                        </td>
                        <td className="tnum px-3 py-2.5 text-right text-[13px] font-medium">{money(line.lineCost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-4 py-8 text-center text-[13px] text-muted-foreground">
                No version is active today — activate one to roll cost up and raise assembly orders.
              </div>
            )}
          </section>

          <div className="flex flex-col gap-4">
            <RecordCard title="Rolled-up cost">
              <div className="tnum text-2xl font-bold tracking-[-0.02em]">
                {rollup ? money(rollup.unit) : EM_DASH}
              </div>
              {costDeltaText && <div className="mt-1 text-xs text-muted-foreground">{costDeltaText}</div>}
              <div className="mt-3 flex flex-col">
                <div className="flex justify-between gap-3 border-b border-dashed border-border py-[7px] text-[12.5px]">
                  <span className="text-muted-foreground">Materials</span>
                  <span className="tnum font-medium">{rollup ? money(rollup.materials) : EM_DASH}</span>
                </div>
                <div className="flex justify-between gap-3 border-b border-dashed border-border py-[7px] text-[12.5px]">
                  <span className="text-muted-foreground">Labour</span>
                  <span className="tnum font-medium">{rollup ? money(rollup.labour) : EM_DASH}</span>
                </div>
                <div className="flex justify-between gap-3 py-[7px] text-[12.5px]">
                  <span className="text-muted-foreground">Overhead</span>
                  <span className="tnum font-medium">{rollup ? money(rollup.overhead) : EM_DASH}</span>
                </div>
              </div>
              <div className="mt-3 border-t border-border pt-3 text-[12.5px] text-muted-foreground">
                Buildable from stock on hand:{' '}
                <strong className="tnum font-semibold text-foreground">{int(buildable)}</strong>
              </div>
            </RecordCard>

            <section aria-label="Versions" className="rounded-xl border border-border bg-card px-[18px] py-4">
              <div className="mb-2.5 flex items-center justify-between gap-3">
                <h2 className="m-0 text-[11px] font-semibold tracking-[0.05em] text-muted-foreground uppercase">
                  Versions
                </h2>
                <span className="text-[11.5px] text-muted-foreground">
                  {int(versions.length)} {versions.length === 1 ? 'version' : 'versions'}
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                {versions.map((v) => (
                  <button
                    key={v.no}
                    type="button"
                    onClick={() => onOpenBom(v.no)}
                    className="hover-lift flex w-full items-center gap-2.5 rounded-[9px] border border-border bg-card px-[11px] py-[9px] text-left transition-colors duration-[140ms] hover:border-ring hover:bg-muted/60"
                  >
                    <span className="font-mono text-xs font-semibold text-muted-foreground">{v.no}</span>
                    <span className="text-[13px] font-semibold">{v.version}</span>
                    <StatusPill label={v.statusLabel} />
                    <span className="flex-1" />
                    <span className="tnum text-[11.5px] text-muted-foreground">
                      {int(v.lineCount)} · {money(v.unitCost)}
                    </span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={onNewBom}
                className="mt-2.5 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-transparent text-[12.5px] font-medium text-muted-foreground transition-colors duration-[140ms] hover:border-ring hover:bg-muted hover:text-foreground"
              >
                <Plus className="size-[13px]" strokeWidth={2.5} />
                New version
              </button>
            </section>
          </div>
        </div>
      )}

      <RecordCard title="Where used">
        {whereUsed.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border text-[10.5px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">
                  <th className="px-2 pb-2 text-left">BOM no.</th>
                  <th className="px-2 pb-2 text-left">Goes into</th>
                  <th className="px-2 pb-2 text-left">Status</th>
                  <th className="px-2 pb-2 text-right">Qty per</th>
                </tr>
              </thead>
              <tbody>
                {whereUsed.map((u) => (
                  <tr
                    key={u.bomNo}
                    onClick={() => onOpenBom(u.bomNo)}
                    className="cursor-pointer border-b border-border transition-colors duration-100 last:border-b-0 hover:bg-muted/60"
                  >
                    <td className="px-2 py-2.5 font-mono text-[12.5px] font-semibold">{u.bomNo}</td>
                    <td className="px-2 py-2.5">
                      <div className="font-mono text-[12.5px] font-medium">{u.parentItem}</div>
                      <div className="mt-0.5 text-[12.5px] text-muted-foreground">{u.parentDesc}</div>
                    </td>
                    <td className="px-2 py-2.5">
                      <StatusPill label={u.statusLabel} />
                    </td>
                    <td className="tnum px-2 py-2.5 text-right text-[13px] whitespace-nowrap">
                      {u.qtyPer} {u.uom}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-4 py-6 text-center text-[13px] text-muted-foreground">
            This item isn&apos;t a component of anything yet.
          </div>
        )}
      </RecordCard>

      <section aria-label="Assembly orders" className="rounded-xl border border-border bg-card px-[18px] py-4">
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <h2 className="m-0 text-[11px] font-semibold tracking-[0.05em] text-muted-foreground uppercase">
            Assembly orders
          </h2>
          {assemblyOrders.length > 0 && (
            <span className="text-[11.5px] text-muted-foreground">
              {int(assemblyOrders.length)} {assemblyOrders.length === 1 ? 'order' : 'orders'}
              {openAssemblyOrders.length > 0 ? ` · ${int(openAssemblyOrders.length)} open` : ''}
            </span>
          )}
        </div>
        {assemblyOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border text-[10.5px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">
                  <th className="px-2 pb-2 text-left">Order</th>
                  <th className="px-2 pb-2 text-left">Role</th>
                  <th className="px-2 pb-2 text-left">Builds</th>
                  <th className="px-2 pb-2 text-left">Site</th>
                  <th className="px-2 pb-2 text-left">Status</th>
                  <th className="px-2 pb-2 text-right">Qty</th>
                  <th className="px-2 pb-2 text-right">Due</th>
                </tr>
              </thead>
              <tbody>
                {assemblyOrders.map((ao) => (
                  <tr
                    key={ao.no}
                    onClick={() => onOpenAo(ao.no)}
                    className="cursor-pointer border-b border-border transition-colors duration-100 last:border-b-0 hover:bg-muted/60"
                  >
                    <td className="px-2 py-2.5 font-mono text-[12.5px] font-semibold">{ao.no}</td>
                    <td className="px-2 py-2.5 text-[12.5px] text-muted-foreground">{ao.role}</td>
                    <td className="px-2 py-2.5">
                      <div className="font-mono text-[12.5px] font-medium">{ao.item}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{ao.desc}</div>
                    </td>
                    <td className="px-2 py-2.5 text-[12.5px] text-muted-foreground">{ao.siteName}</td>
                    <td className="px-2 py-2.5">
                      <StatusPill label={ao.statusLabel} />
                    </td>
                    <td className="tnum px-2 py-2.5 text-right text-[13px] whitespace-nowrap">
                      {ao.role === 'Builds item'
                        ? `${int(ao.qtyFinished)} / ${int(ao.qty)} ${ao.uom}`
                        : `Needs ${ao.lineQtyRequired ?? 0}`}
                    </td>
                    <td className="tnum px-2 py-2.5 text-right text-[12.5px] whitespace-nowrap text-muted-foreground">
                      {fmtDate(ao.dueDate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-4 py-6 text-center text-[13px] text-muted-foreground">
            No assembly orders reference this item yet.
          </div>
        )}
      </section>
    </div>
  )
}
