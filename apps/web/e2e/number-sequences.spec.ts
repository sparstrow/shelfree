import { expect, test } from '@playwright/test'

test.describe('Settings ▸ Number sequences', () => {
  test('adds a second PO series, sets it default, issues a KPO order, and blocks deleting issued series', async ({
    page,
  }) => {
    await page.goto('/purchasing/settings')
    const nav = page.getByRole('navigation', { name: 'Settings' })
    await nav.getByRole('link', { name: 'Number sequences', exact: true }).click()
    await expect(page).toHaveURL(/\/purchasing\/settings\/sequences$/)
    await expect(page.getByRole('heading', { name: 'Number sequences', level: 1 })).toBeVisible()

    const grid = page.getByRole('grid', { name: 'series' })
    await expect(grid).toBeVisible()
    await expect(grid.getByText('Document type: Purchase orders')).toBeVisible()
    await expect(grid.getByText('Document type: Goods receipts')).toBeVisible()
    await expect(grid.getByRole('row', { name: /PO00011/ })).toBeVisible()
    await expect(grid.getByRole('row', { name: /GRN00006/ })).toBeVisible()
    // Module slice hides series belonging to other modules.
    await expect(grid.getByRole('row', { name: /SO000/ })).toHaveCount(0)

    // Add a second PO series with prefix KPO.
    await page.getByRole('button', { name: 'New series', exact: true }).click()
    const newDrawer = page.getByRole('complementary', { name: 'New series' })
    await expect(newDrawer).toBeVisible()
    await expect(newDrawer.getByLabel('Document type', { exact: true })).toHaveValue('purchase-order')

    await newDrawer.getByLabel('Name', { exact: true }).fill('Kanalora PO')
    await newDrawer.getByLabel('Prefix', { exact: true }).fill('KPO')
    await expect(newDrawer.getByText('KPO00001')).toBeVisible()
    await newDrawer.getByRole('button', { name: 'Create series', exact: true }).click()

    const viewDrawer = page.getByRole('complementary', { name: 'Series KPO00001' })
    await expect(viewDrawer).toBeVisible()
    await expect(grid.getByRole('row', { name: /Kanalora PO.*KPO00001/ })).toContainText('Active')

    // Set the new series as the default for Purchase orders.
    await viewDrawer.getByRole('button', { name: 'Set as default', exact: true }).click()
    await expect(grid.getByRole('row', { name: /Kanalora PO.*KPO00001/ })).toContainText('Default')

    // Create a new purchase order and save — it receives KPO00001.
    await page.goto('/purchasing/purchase-orders/new')
    await expect(page.getByRole('heading', { name: 'New purchase order' })).toBeVisible()
    await expect(page.getByText('KPO00001')).toBeVisible()
    await page.getByLabel('Vendor', { exact: true }).selectOption({ label: 'Kailash Ceramics Works' })
    await page.getByRole('button', { name: 'Save draft', exact: true }).click()

    await expect(page).toHaveURL(/\/purchasing\/purchase-orders\?sel=KPO00001$/)
    await expect(page.getByRole('complementary', { name: 'Purchase order KPO00001' })).toBeVisible()

    // Back in Number sequences, KPO advanced to KPO00002 and deleting it is blocked.
    await page.goto('/purchasing/settings/sequences')
    const kpoRow = page.getByRole('row', { name: /Kanalora PO.*KPO00002/ })
    await expect(kpoRow).toBeVisible()
    await kpoRow.click()

    const issuedDrawer = page.getByRole('complementary', { name: 'Series KPO00002' })
    await expect(issuedDrawer).toBeVisible()
    const blockedReason = 'Numbers were already issued from this series — make it inactive instead.'
    await expect(issuedDrawer.getByText(blockedReason)).toBeVisible()
    const deleteBtn = issuedDrawer.getByRole('button', { name: 'Delete series', exact: true })
    await expect(deleteBtn).toBeDisabled()
    await expect(deleteBtn).toHaveAttribute('title', blockedReason)
  })

  test('shared view shows all modules with a Module column', async ({ page }) => {
    await page.goto('/settings/shared/sequences')
    await expect(page.getByRole('heading', { name: 'Number sequences', level: 1 })).toBeVisible()
    const grid = page.getByRole('grid', { name: 'series' })
    await expect(grid.getByRole('columnheader', { name: /Module/ })).toBeVisible()
    await expect(grid.getByText('Document type: Purchase orders')).toBeVisible()
    await expect(grid.getByText('Document type: Sales orders')).toBeVisible()
  })
})
