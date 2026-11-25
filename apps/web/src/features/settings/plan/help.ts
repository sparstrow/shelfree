import type { HelpMap } from '@/components/help/types'

/** Settings ▸ Plan & billing — quiet-help text (prototype `q.plan.*`, without the upgrade wording: tiers are parked). */
export const PLAN_HELP: HelpMap = {
  page: {
    title: 'Plan & billing',
    body: 'The plan this workspace is on and what each plan includes. For now everything is switched on for Kanalora; nothing is limited by plan.',
  },
  pay: {
    title: 'Payment method',
    body: 'Billing is not connected yet — no card is charged.',
  },
}
