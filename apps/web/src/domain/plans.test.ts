import { describe, expect, it } from 'vitest'
import { CURRENT_PLAN_ID, PLANS, currentPlan } from './plans'

describe('plans', () => {
  it('lists the three plans, each with something included', () => {
    expect(PLANS.map((p) => p.id)).toEqual(['starter', 'growth', 'enterprise'])
    for (const p of PLANS) expect(p.features.length).toBeGreaterThan(0)
  })

  it('knows the current plan', () => {
    expect(currentPlan().id).toBe(CURRENT_PLAN_ID)
  })
})
