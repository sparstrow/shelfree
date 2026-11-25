import { Check, CreditCard } from 'lucide-react'
import { HelpTarget } from '@/components/help/HelpTarget'
import { SettingsPage } from '@/components/settings/SettingsPage'
import { CURRENT_PLAN_ID, PAYMENT_METHOD_SAMPLE, PLANS } from '@/domain/plans'
import { cn } from '@/lib/utils'
import { PLAN_HELP as HELP } from './help'

/** Settings ▸ Workspace ▸ Plan & billing (`/settings/ws-plan`). Information only: no billing, no upgrade, no locks. */
export function PlanBillingSection({ readOnly }: { readOnly?: boolean } = {}) {
  return (
    <SettingsPage title="Plan & billing" help={HELP.page} width="wide" readOnly={readOnly}>
      <div className="grid gap-4 md:grid-cols-3">
        {PLANS.map((plan) => {
          const current = plan.id === CURRENT_PLAN_ID
          return (
            <article
              key={plan.id}
              aria-label={`${plan.name} plan`}
              aria-current={current ? 'true' : undefined}
              className={cn(
                'hover-lift flex flex-col gap-3.5 rounded-[14px] border p-5 transition-[border-color,box-shadow,background-color] duration-150',
                current
                  ? 'border-primary bg-[color-mix(in_oklab,var(--primary)_7%,var(--card))] shadow-[0_0_0_1px_var(--primary)]'
                  : 'border-border bg-card',
              )}
            >
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="m-0 text-[15px] font-bold">{plan.name}</h2>
                {current && (
                  <span className="rounded-full bg-[color-mix(in_oklab,var(--primary)_15%,transparent)] px-2 py-0.5 text-[10.5px] font-bold tracking-[0.04em] text-primary uppercase">
                    Current
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-[3px]">
                <span className="tnum text-[26px] font-bold tracking-[-0.02em]">{plan.price}</span>
                <span className="text-[13px] text-muted-foreground">{plan.per}</span>
              </div>
              <div className="min-h-[34px] text-[12.5px] leading-[1.45] text-muted-foreground">{plan.tagline}</div>
              <ul className="m-0 flex flex-1 list-none flex-col gap-2 p-0">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[12.5px]">
                    <Check className="mt-px size-[15px] flex-none text-primary" strokeWidth={2.4} aria-hidden="true" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </article>
          )
        })}
      </div>
      <div className="flex items-center gap-3 rounded-[14px] border border-border bg-card px-[22px] py-5">
        <CreditCard className="size-[18px] flex-none text-muted-foreground" strokeWidth={1.8} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <HelpTarget help={HELP.pay}>
            <span className="text-[13px] font-semibold">Payment method</span>
          </HelpTarget>
        </div>
        <span className="font-mono text-xs text-muted-foreground">{PAYMENT_METHOD_SAMPLE}</span>
      </div>
    </SettingsPage>
  )
}
