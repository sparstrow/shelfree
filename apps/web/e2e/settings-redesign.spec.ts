import { type Page, expect, test } from '@playwright/test'

const switchRole = async (page: Page, role: RegExp) => {
  await page.getByRole('button', { name: 'Account menu', exact: true }).click()
  await page.getByRole('menuitem', { name: role }).click()
}

test.describe('Settings redesign — end to end', () => {
  test('sidebar Purchasing ▸ Settings shows only Purchasing sections', async ({ page }) => {
    await page.goto('/purchasing/purchase-orders')
    await page.locator('aside [data-module="purchasing"]').getByRole('link', { name: 'Settings', exact: true }).click()
    await expect(page).toHaveURL(/\/purchasing\/settings\/[^/]+$/)

    const nav = page.getByRole('navigation', { name: 'Settings' })
    await expect(nav.getByRole('link', { name: 'Number sequences', exact: true })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'All settings', exact: true })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Business profile', exact: true })).toHaveCount(0)
    await expect(nav.getByRole('link', { name: 'Units of measure', exact: true })).toHaveCount(0)
  })

  test('central Settings groups sections and Find a setting jumps to a highlighted row', async ({ page }) => {
    await page.goto('/settings')
    const nav = page.getByRole('navigation', { name: 'Settings' })
    for (const g of ['Workspace', 'Modules', 'Shared lists', 'Personal']) {
      await expect(nav.getByText(g, { exact: true })).toBeVisible()
    }

    await expect(page.getByLabel('Business name', { exact: true })).toBeVisible()
    await page.locator('body').click({ position: { x: 5, y: 5 } })
    await page.keyboard.press('/')
    const find = page.getByLabel('Find a setting', { exact: true })
    await expect(find).toBeFocused()
    await find.fill('GSTIN')
    await expect(page.getByRole('listbox', { name: 'Matching settings' }).getByRole('option').first()).toContainText('GSTIN')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\?find=gstin$/)
    await expect(page.locator('[data-setting-row="gstin"]')).toHaveAttribute('data-setting-highlight', 'true')
  })

  test('[ and ] step through sections but not while typing', async ({ page }) => {
    await page.goto('/purchasing/settings/carrier-types')
    await expect(page.getByRole('heading', { name: 'Carrier types', level: 1 })).toBeVisible()
    await page.locator('body').click({ position: { x: 5, y: 5 } })
    await page.keyboard.press(']')
    await expect(page).toHaveURL(/\/purchasing\/settings\/sequences$/)
    await page.keyboard.press('[')
    await expect(page).toHaveURL(/\/purchasing\/settings\/carrier-types$/)

    // Typing in an input leaves the section alone.
    await page.goto('/settings/ws-profile')
    const name = page.getByLabel('Business name', { exact: true })
    await name.focus()
    await page.keyboard.press(']')
    await expect(page).toHaveURL(/\/settings\/ws-profile$/)
    await expect(name).toHaveValue(/\]$/)
  })

  test('/settings/uom redirects to the Warehouse module', async ({ page }) => {
    await page.goto('/settings/uom')
    await expect(page).toHaveURL(/\/warehouse\/settings\/uom$/)
    await expect(page.getByRole('heading', { name: 'Units of measure', level: 1 })).toBeVisible()
  })

  test('a member sees Purchasing settings read-only while the owner can edit', async ({ page }) => {
    await page.goto('/purchasing/settings/sequences')
    await expect(page.getByRole('button', { name: 'New series', exact: true })).toBeVisible()

    await switchRole(page, /^Member/)
    await expect(page.getByText('View only — ask an admin to change these settings.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'New series', exact: true })).toHaveCount(0)

    await switchRole(page, /^Owner/)
    await expect(page.getByRole('button', { name: 'New series', exact: true })).toBeVisible()
    await expect(page.getByText('View only — ask an admin to change these settings.')).toHaveCount(0)
  })

  test('a second PO series made default issues KPO00001 and cannot then be deleted', async ({ page }) => {
    await page.goto('/purchasing/settings/sequences')
    const grid = page.getByRole('grid', { name: 'series' })
    await page.getByRole('button', { name: 'New series', exact: true }).click()
    const drawer = page.getByRole('complementary', { name: 'New series' })
    await drawer.getByLabel('Name', { exact: true }).fill('Kanalora PO')
    await drawer.getByLabel('Prefix', { exact: true }).fill('KPO')
    await drawer.getByLabel('Default', { exact: true }).click()
    await drawer.getByRole('button', { name: 'Create series', exact: true }).click()

    await expect(grid.getByRole('row', { name: /Kanalora PO.*KPO00001/ })).toContainText('Default')
    await expect(grid.getByRole('row', { name: /PO00011/ })).toContainText('Active')

    await page.goto('/purchasing/purchase-orders/new')
    await page.getByLabel('Vendor', { exact: true }).selectOption({ label: 'Kailash Ceramics Works' })
    await page.getByRole('button', { name: 'Save draft', exact: true }).click()
    await expect(page).toHaveURL(/sel=KPO00001$/)

    await page.goto('/purchasing/settings/sequences')
    await page.getByRole('row', { name: /Kanalora PO/ }).click()
    const view = page.getByRole('complementary', { name: /^Series KPO/ })
    await expect(view.getByText('Numbers were already issued from this series — make it inactive instead.')).toBeVisible()
    await page.keyboard.press('Delete')
    await expect(page.getByText('can’t be deleted')).toBeVisible()
  })

  test('Keyboard shortcuts lists the section keys and the Number sequences group', async ({ page }) => {
    await page.goto('/settings/shortcuts')
    await expect(page.getByRole('heading', { name: 'Keyboard shortcuts', level: 1 })).toBeVisible()
    const every = page.getByRole('region', { name: 'Settings — every page' })
    await expect(every.getByText('[ / ]', { exact: true })).toBeVisible()
    await expect(every.getByText('Find a setting', { exact: false }).first()).toBeVisible()
    await expect(page.getByRole('region', { name: 'Settings › Number sequences' })).toBeVisible()
  })
})
