import { expect, test } from '@playwright/test'

test.describe('Settings ▸ Sales pricing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/sales/settings/cfg-pricing')
    await expect(page.getByRole('heading', { name: 'Sales pricing', level: 1 })).toBeVisible()
  })

  test('shows the seeded rule with the customer list, and changes it with Save / Discard', async ({ page }) => {
    const mode = page.getByLabel('Who can have their own price', { exact: true })
    await expect(mode).toHaveValue('selected')
    await expect(page.getByText('Customers on customer pricing', { exact: true })).toBeVisible()
    await expect(page.getByRole('switch', { name: /^Customer pricing for / }).first()).toBeVisible()

    // Changing the rule marks it unsaved; the customer list only applies to "Selected customers".
    await mode.selectOption('all')
    await expect(page.getByText('Customers on customer pricing', { exact: true })).toHaveCount(0)
    await page.getByRole('button', { name: 'Discard', exact: true }).click()
    await expect(mode).toHaveValue('selected')

    await mode.selectOption('off')
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.getByText('Saved', { exact: true }).first()).toBeVisible()

    // Sales prices reads the same setting.
    await page.goto('/sales/sales-prices?tab=check')
    await expect(page.getByText('No one', { exact: true })).toBeVisible()

    await page.goto('/sales/settings/cfg-pricing')
    await expect(page.getByLabel('Who can have their own price', { exact: true })).toHaveValue('off')
  })

  test('new customers only stamps the cut-off when saved', async ({ page }) => {
    await page.getByLabel('Who can have their own price', { exact: true }).selectOption('newOnly')
    await expect(page.getByText('Set when you save', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.getByText('Set when you save', { exact: true })).toHaveCount(0)
    await expect(page.locator('[data-row="newCutoff"]')).toContainText(String(new Date().getFullYear()))
  })

  test('the block switch is locked while the fallback is on', async ({ page }) => {
    const block = page.locator('[data-row="blockUnpriced"]')
    await expect(block.getByRole('switch')).toBeVisible()
    await page.getByRole('switch', { name: 'Fall back to the list price', exact: true }).click()
    await expect(block.getByRole('switch')).toHaveCount(0)
    await expect(block).toContainText('Not used while the fallback above is on')
  })

  test('puts a customer on customer pricing straight away', async ({ page }) => {
    const first = page.getByRole('switch', { name: /^Customer pricing for / }).first()
    const before = await first.getAttribute('aria-checked')
    await first.click()
    await expect(first).toHaveAttribute('aria-checked', before === 'true' ? 'false' : 'true')
    await page.reload()
    await expect(page.getByRole('switch', { name: /^Customer pricing for / }).first()).toHaveAttribute(
      'aria-checked',
      before === 'true' ? 'false' : 'true',
    )
  })
})

test.describe('Settings ▸ Assembly & production', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/production/settings/assembly')
    await expect(page.getByRole('heading', { name: 'Assembly & production', level: 1 })).toBeVisible()
  })

  test('shows the defaults, validates the scrap allowance and saves', async ({ page }) => {
    await expect(page.getByLabel('Finished goods arrive at', { exact: true })).toBeVisible()
    await expect(page.getByLabel('Default scrap allowance %', { exact: true })).toHaveValue('0')
    await expect(page.getByRole('switch', { name: 'Allow release with shortages', exact: true })).toBeChecked()

    const scrap = page.getByLabel('Default scrap allowance %', { exact: true })
    await scrap.fill('150')
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.getByRole('alert').filter({ hasText: 'Enter a percentage from 0 to 100.' })).toBeVisible()

    await scrap.fill('2.5')
    await page.getByRole('switch', { name: 'Allow release with shortages', exact: true }).click()
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.getByText('Saved', { exact: true }).first()).toBeVisible()

    await page.reload()
    await expect(page.getByLabel('Default scrap allowance %', { exact: true })).toHaveValue('2.5')
    await expect(page.getByRole('switch', { name: 'Allow release with shortages', exact: true })).not.toBeChecked()
  })
})

test.describe('Settings ▸ form sections are view-only for a member without Manage settings', () => {
  for (const [url, heading, lockedLabel] of [
    ['/sales/settings/cfg-pricing', 'Sales pricing', 'Who can have their own price'],
    ['/production/settings/assembly', 'Assembly & production', 'Finished goods arrive at'],
  ] as const) {
    test(`${heading}`, async ({ page }) => {
      await page.goto(url)
      await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible()
      await expect(page.getByRole('region', { name: heading }).getByRole('button', { name: 'Save', exact: true })).toBeVisible()

      // Kavitha (Member) can read Sales and Production but has no Manage settings right.
      await page.getByRole('button', { name: 'Account menu', exact: true }).click()
      await page.getByRole('menuitem', { name: /^Member/ }).click()
      await page.goto(url)

      await expect(page.getByText('View only — ask an admin to change these settings.')).toBeVisible()
      // Values stay in the same rows as text: no inputs, no switches, no Save bar.
      const row = page.locator('[data-row]').first()
      await expect(row).toBeVisible()
      await expect(page.getByLabel(lockedLabel, { exact: true })).toHaveCount(0)
      await expect(page.locator('[data-row] select, [data-row] input')).toHaveCount(0)
      await expect(page.getByRole('button', { name: 'Save', exact: true })).toHaveCount(0)
      await expect(page.getByRole('button', { name: 'Discard', exact: true })).toHaveCount(0)
      await expect(page.getByText(lockedLabel, { exact: true })).toBeVisible()

      // Ctrl+S is inert.
      await page.keyboard.press('Control+s')
      await expect(page.getByText('Saved', { exact: true })).toHaveCount(0)
    })
  }

  test('Sales pricing customer switches are disabled for a member', async ({ page }) => {
    await page.goto('/sales/settings/cfg-pricing')
    await page.getByRole('button', { name: 'Account menu', exact: true }).click()
    await page.getByRole('menuitem', { name: /^Member/ }).click()
    await page.goto('/sales/settings/cfg-pricing')
    await expect(page.getByRole('switch', { name: /^Customer pricing for / }).first()).toBeDisabled()
  })
})
