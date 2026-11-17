import { expect, test } from '@playwright/test'

test.describe('Purchase Lines', () => {
  test('lists every order line and filters to open lines', async ({ page }) => {
    await page.goto('/purchasing/purchase-lines')
    await expect(page.getByText('Showing 1–18 of 18 purchase lines')).toBeVisible()
    await page.getByRole('button', { name: 'All lines' }).click()
    await page.getByRole('menuitem', { name: 'Open lines' }).click()
    await expect(page.getByText(/of \d+ purchase lines?$/)).not.toHaveText('Showing 1–18 of 18 purchase lines')
  })

  test('opens pre-filtered to one item and double-click opens the order', async ({ page }) => {
    await page.goto('/purchasing/purchase-lines?item=RM-LID-PWH')
    await expect(page.getByText('Filters')).toBeVisible()
    const row = page.getByRole('row', { name: /RM-LID-PWH/ }).first()
    await expect(row).toBeVisible()
    await row.dblclick()
    await expect(page).toHaveURL(/purchase-orders\/PO\d{5}$/)
  })
})
