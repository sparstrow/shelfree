import { expect, test } from '@playwright/test'

test.describe('Items list', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/warehouse/items')
    await expect(page.getByRole('grid')).toBeVisible()
  })

  test('lists the seeded items and shows stock breakdown and facts in the preview', async ({ page }) => {
    await expect(page.getByText('Showing 1–20 of 22 items')).toBeVisible()

    const ashRow = page.getByRole('row', { name: /ASH-PWH-18/ })
    await expect(ashRow).toContainText('Arunachala Mountain Sambrani Holder, Pearl White')
    await expect(ashRow).toContainText('Main  +2')

    await ashRow.click()
    const drawer = page.getByRole('complementary', { name: 'Item ASH-PWH-18' })
    await expect(drawer).toContainText('Arunachala Mountain Sambrani Holder, Pearl White')
    await expect(drawer).toContainText('Finished Goods › Sambrani Holder')
    await expect(drawer).toContainText('Healthy')

    // On hand = 59 + 20 + 14 = 93, Committed = 34, Available = 59.
    await expect(drawer).toContainText('93')
    await expect(drawer).toContainText('34')
    await expect(drawer).toContainText('59')

    await expect(drawer).toContainText('STOCK BY LOCATION')
    await expect(drawer.getByRole('progressbar', { name: 'Main stock' })).toBeVisible()
    await expect(drawer.getByRole('progressbar', { name: 'Assembly unit stock' })).toBeVisible()
    await expect(drawer.getByRole('progressbar', { name: 'Chennai DC stock' })).toBeVisible()

    await expect(drawer).toContainText('DETAILS')
    await expect(drawer).toContainText('₹399.00')
    await expect(drawer).toContainText('₹145.00')
    await expect(drawer).toContainText('NOTES')

    await page.keyboard.press('Escape')
    await expect(drawer).toBeHidden()
  })

  test('filters rows via the Low stock view (none in seed) and quick search', async ({ page }) => {
    await page.getByRole('button', { name: 'All items' }).click()
    await page.getByRole('menuitem', { name: 'Low stock' }).click()
    await expect(page.getByText('No items', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Clear all' }).click()
    await expect(page.getByText('Showing 1–20 of 22 items')).toBeVisible()

    await page.keyboard.press('/')
    await page.keyboard.type('terracotta')
    await expect(page.getByText('Showing 1–3 of 3 items')).toBeVisible()
  })

  test('shows the low-stock warning dot and banner when an item drops to its reorder point', async ({ page }) => {
    await expect(page.getByText('Showing 1–20 of 22 items')).toBeVisible()
    // All 22 seeded items start above their reorder points.
    await expect(page.locator('[title*="reorder point"]')).toHaveCount(0)

    // Store one low-stock item: start from the demo data served by the app, lower one item's stock.
    await page.evaluate(async () => {
      const seedModule = '/src/data/seed/seed-data.js'
      const seed = (await import(/* @vite-ignore */ seedModule)) as { seedItems: () => Array<{ no: string; locs: Record<string, number> }> }
      const items = seed.seedItems()
      const next = items.map((it) =>
        it.no === 'CMB-BLK-12' ? { ...it, locs: { 'WH-TVM': 12, 'WH-ASSY': 4, 'WH-CHN': 2 } } : it,
      )
      localStorage.setItem('shelfree.v2.items', JSON.stringify(next))
    })

    await page.reload()
    await expect(page.getByRole('grid')).toBeVisible()

    const row = page.getByRole('row', { name: /CMB-BLK-12/ })
    await expect(row.getByTitle(/Low stock/)).toBeVisible()

    await page.getByRole('button', { name: 'All items' }).click()
    await page.getByRole('menuitem', { name: 'Low stock' }).click()
    await expect(page.getByText('Showing 1–1 of 1 item')).toBeVisible()
    await expect(row).toBeVisible()

    await row.click()
    const drawer = page.getByRole('complementary', { name: 'Item CMB-BLK-12' })
    await expect(drawer).toContainText('Low stock')
    await expect(drawer).toContainText('Below reorder point (20)')
  })

  test('blocks deleting an item that appears on purchase orders or holds stock', async ({ page }) => {
    await page.getByRole('row', { name: /RM-LID-PWH/ }).click()
    await expect(page.getByRole('complementary', { name: 'Item RM-LID-PWH' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Delete item' })).toBeDisabled()
  })

  test('opens item route on row double-click', async ({ page }) => {
    await page.getByRole('row', { name: /ASH-TER-18/ }).dblclick()
    await expect(page).toHaveURL(/\/warehouse\/items\/ASH-TER-18$/)
    await expect(
      page.getByRole('heading', { name: 'Arunachala Mountain Sambrani Holder, Terracotta', level: 1 }),
    ).toBeVisible()
  })
})
