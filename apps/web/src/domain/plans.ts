/**
 * Plans — information only (tiers are parked, CLAUDE.md "CURRENT WORKING MODE"): which plan the workspace
 * is on and what each plan includes. Nothing here locks, gates or bills anything; the backend will own
 * the plan and billing when subscriptions start. See docs/plan-billing/README.md.
 */

export type PlanId = 'starter' | 'growth' | 'enterprise'

export interface PlanDef {
  id: PlanId
  name: string
  price: string
  /** `/mo` and the like; empty for a price that is not per month. */
  per: string
  tagline: string
  features: readonly string[]
}

export const PLANS: readonly PlanDef[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 'Free',
    per: '',
    tagline: 'Everything a single-location shop needs.',
    features: ['1 location', 'Core inventory & items', 'Basic purchasing & sales', 'Owner + up to 2 users', 'In-app support'],
  },
  {
    id: 'growth',
    name: 'Growth',
    price: '$49',
    per: '/mo',
    tagline: 'Scale up as you add sites and team.',
    features: [
      'Multi-warehouse & zones',
      'Lot / expiry & barcodes',
      'Roles & permissions',
      'Terminology & custom lists',
      'Advanced reporting',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    per: '',
    tagline: 'Depth and control for large operations.',
    features: [
      'Everything in Growth',
      'Serial tracking & approvals',
      'Custom fields & sequences',
      'Multi-currency & region',
      'Integrations (EDI, accounting)',
      'SSO & audit log',
    ],
  },
]

/** The workspace's plan (the prototype's default). The backend supplies it per tenant. */
export const CURRENT_PLAN_ID: PlanId = 'growth'

export function currentPlan(): PlanDef {
  return PLANS.find((p) => p.id === CURRENT_PLAN_ID) ?? PLANS[0]
}

/** The payment method on file (a masked sample — billing is not connected). */
export const PAYMENT_METHOD_SAMPLE = '•••• 4242'
