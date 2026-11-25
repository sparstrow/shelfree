import { expect, test } from '@playwright/test'

test.describe('Settings frame — module areas, central search, shortcuts and redirects', () => {
  test('sidebar Purchasing ▸ Settings opens module area with only Purchasing sections and breadcrumb', async ({ page }) => {
    await page.goto('/purchasing/purchase-orders')
    await expect(page.getByRole('heading', { name: 'Purchase Orders', level: 1 })).toBeVisible()

    const purchasingGroup = page.locator('aside [data-module="purchasing"]')
    await purchasingGroup.getByRole('link', { name: 'Settings', exact: true }).click()
    await expect(page).toHaveURL(/\/purchasing\/settings\/carrier-types$/)

    const header = page.locator('header')
    await expect(header).toContainText('Purchasing')
    await expect(header).toContainText('Settings')
    await expect(header).toContainText('Carrier types')

    const nav = page.getByRole('navigation', { name: 'Settings' })
    await expect(nav.getByRole('link', { name: 'Carrier types', exact: true })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Number sequences', exact: true })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Payment terms', exact: true })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'All settings', exact: true })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Business profile', exact: true })).toHaveCount(0)
    await expect(nav.getByRole('link', { name: 'Units of measure', exact: true })).toHaveCount(0)

    await nav.getByRole('link', { name: 'Number sequences', exact: true }).click()
    await expect(page).toHaveURL(/\/purchasing\/settings\/sequences$/)
    await expect(header).toContainText('Number sequences')
  })

  test('central Settings lists Workspace, Modules, Shared lists and Personal', async ({ page }) => {
    await page.goto('/settings')
    await expect(page).toHaveURL(/\/settings\/ws-profile$/)

    const header = page.locator('header')
    await expect(header).toContainText('Settings')
    await expect(header).toContainText('Workspace')
    await expect(header).toContainText('Business profile')

    const nav = page.getByRole('navigation', { name: 'Settings' })
    await expect(nav.getByText('Workspace', { exact: true })).toBeVisible()
    await expect(nav.getByText('Modules', { exact: true })).toBeVisible()
    await expect(nav.getByText('Shared lists', { exact: true })).toBeVisible()
    await expect(nav.getByText('Personal', { exact: true })).toBeVisible()

    await nav.getByRole('button', { name: 'Purchasing', exact: true }).click()
    await expect(nav.getByRole('link', { name: 'Carrier types', exact: true })).toBeVisible()
  })

  test('Find a setting jumps to Business profile GSTIN row and highlights it', async ({ page }) => {
    await page.goto('/settings/ws-profile')
    await expect(page.getByLabel('Business name', { exact: true })).toBeVisible()

    const find = page.getByLabel('Find a setting', { exact: true })
    await page.locator('body').click({ position: { x: 5, y: 5 } })
    await page.keyboard.press('/')
    await expect(find).toBeFocused()

    await find.fill('zzzz-no-match')
    await expect(page.getByText('No settings match', { exact: true })).toBeVisible()

    // Esc clears first, then blurs on second Esc.
    await page.keyboard.press('Escape')
    await expect(find).toHaveValue('')
    await expect(find).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(find).not.toBeFocused()

    // Search for GSTIN and press Enter to jump to and highlight the row.
    await page.keyboard.press('/')
    await find.fill('GSTIN')
    const listbox = page.getByRole('listbox', { name: 'Matching settings' })
    await expect(listbox).toBeVisible()
    await expect(listbox.getByRole('option').first()).toContainText('GSTIN')
    await expect(listbox.getByRole('option').first()).toContainText('Workspace')
    await page.keyboard.press('Enter')

    await expect(page).toHaveURL(/\/settings\/ws-profile\?find=gstin$/)
    await expect(page.locator('[data-setting-row="gstin"]')).toHaveAttribute('data-setting-highlight', 'true')
  })

  test('[ and ] move between sections in the current list', async ({ page }) => {
    await page.goto('/purchasing/settings/carrier-types')
    await expect(page.getByRole('heading', { name: 'Carrier types', level: 1 })).toBeVisible()

    await page.locator('body').click({ position: { x: 5, y: 5 } })
    await page.keyboard.press(']')
    await expect(page).toHaveURL(/\/purchasing\/settings\/sequences$/)

    await page.keyboard.press('[')
    await expect(page).toHaveURL(/\/purchasing\/settings\/carrier-types$/)
  })

  test('legacy /settings/uom redirects to /warehouse/settings/uom and /purchasing/purchase-orders still opens', async ({
    page,
  }) => {
    await page.goto('/settings/uom')
    await expect(page).toHaveURL(/\/warehouse\/settings\/uom$/)
    await expect(page.getByRole('heading', { name: 'Units of measure', level: 1 })).toBeVisible()

    await page.goto('/settings/cfg-sequences')
    await expect(page).toHaveURL(/\/settings\/shared\/sequences$/)

    await page.goto('/purchasing/purchase-orders')
    await expect(page).toHaveURL(/\/purchasing\/purchase-orders\/?$/)
    await expect(page.getByRole('heading', { name: 'Purchase Orders', level: 1 })).toBeVisible()
  })

  test('a member sees Personal only in central Settings', async ({ page }) => {
    await page.goto('/settings/ws-profile')
    await page.getByRole('button', { name: 'Account menu', exact: true }).click()
    await page.getByRole('menuitem', { name: /Member/ }).click()

    await page.goto('/settings')
    await expect(page).toHaveURL(/\/settings\/me-profile$/)

    const nav = page.getByRole('navigation', { name: 'Settings' })
    await expect(nav.getByText('Personal', { exact: true })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Profile', exact: true })).toBeVisible()
    await expect(nav.getByText('Workspace', { exact: true })).toHaveCount(0)
    await expect(nav.getByText('Modules', { exact: true })).toHaveCount(0)
    await expect(nav.getByText('Shared lists', { exact: true })).toHaveCount(0)
  })
})
