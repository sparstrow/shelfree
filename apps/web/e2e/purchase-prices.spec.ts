import { type Page, expect, test } from '@playwright/test'

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const inDays = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return ymd(d)
}

const drawerFor = (page: Page, name = 'New purchase price') => page.getByRole('complementary', { name })
const rowOf = (page: Page, text: string) => page.getByRole('row').filter({ hasText: text })

/** Create a price for Sri Annamalai-free vendor V00004 on RM-LID-PWH (no seeded row), through the drawer. */
async function addPrice(page: Page, o: { from?: string; to?: string; qty?: string; price?: string }) {
  await page.getByRole('button', { name: 'New purchase price', exact: true }).click()
  const d = drawerFor(page)
  await d.getByLabel('Vendor', { exact: true }).selectOption('V00004')
  await d.getByLabel('Item', { exact: true }).selectOption('RM-LID-PWH')
  if (o.qty) await d.getByLabel('From qty', { exact: true }).fill(o.qty)
  await d.getByLabel(/^Price/).fill(o.price ?? '60')
  if (o.from) await d.getByLabel('Starts', { exact: true }).fill(o.from)
  if (o.to) await d.getByLabel('Ends', { exact: true }).fill(o.to)
  await page.keyboard.press('Control+s')
}

test.describe('Purchase prices (list + drawer + inline edit)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/purchasing/purchase-prices')
    await expect(page.getByText('Showing 1–14 of 14 purchase prices')).toBeVisible()
  })

  test('creates a price: validation first, then valid; lead time follows the item', async ({ page }) => {
    await page.getByRole('button', { name: 'New purchase price', exact: true }).click()
    const d = drawerFor(page)
    await d.getByRole('button', { name: 'Create purchase price' }).click()
    await expect(d).toContainText('Fix the highlighted fields to save.')
    await expect(d).toContainText('Pick a vendor.')
    await expect(d).toContainText('Pick an item.')
    await expect(d).toContainText('Enter a price of 0 or more.')

    await d.getByLabel('Vendor', { exact: true }).selectOption('V00004')
    await d.getByLabel('Item', { exact: true }).selectOption('RM-LID-PWH')
    await expect(d.getByLabel('Lead time (days)', { exact: true })).not.toHaveValue('')
    await d.getByLabel(/^Price/).fill('59.5')
    await d.getByLabel('From qty', { exact: true }).fill('1.5')
    await d.getByRole('button', { name: 'Create purchase price' }).click()
    await expect(d).toContainText('Use a whole number, 1 or more.')
    await d.getByLabel('From qty', { exact: true }).fill('1')
    await page.keyboard.press('Control+s')

    await expect(page.getByText('Showing 1–15 of 15 purchase prices')).toBeVisible()
    const view = drawerFor(page, 'Purchase price PP00015')
    await expect(view).toContainText('Vendor item code')
    await expect(view).toContainText('₹59.50')
    await expect(view).toContainText('Active')
  })

  test('refuses an overlapping row for the same vendor, item and quantity', async ({ page }) => {
    await page.getByRole('button', { name: 'New purchase price', exact: true }).click()
    const d = drawerFor(page)
    await d.getByLabel('Vendor', { exact: true }).selectOption('V00001')
    await d.getByLabel('Item', { exact: true }).selectOption('RM-BASE-STD')
    await d.getByLabel(/^Price/).fill('40')
    await page.keyboard.press('Control+s')
    await expect(d).toContainText('Overlaps PP00001')
  })

  test('shows Expired, Scheduled and Expiring statuses; views filter by status', async ({ page }) => {
    await addPrice(page, { from: '2020-01-01', to: '2020-06-30' })
    await expect(page.getByText('of 15 purchase prices')).toBeVisible()
    await page.keyboard.press('Escape')
    await addPrice(page, { from: '2099-01-01', qty: '10' })
    await expect(page.getByText('of 16 purchase prices')).toBeVisible()
    await page.keyboard.press('Escape')
    await addPrice(page, { from: '2021-01-01', to: inDays(10), qty: '20' })
    await expect(page.getByText('of 17 purchase prices')).toBeVisible()

    await expect(rowOf(page, 'V00004').filter({ hasText: 'Expired' })).toHaveCount(1)
    await expect(rowOf(page, 'V00004').filter({ hasText: 'Scheduled' })).toHaveCount(1)
    await expect(rowOf(page, 'V00004').filter({ hasText: 'Expiring' })).toHaveCount(1)

    await page.getByRole('button', { name: /All prices/ }).click()
    await page.getByRole('menuitem', { name: 'Active' }).click()
    // 14 seeded + the expiring one are in force; expired and scheduled are not.
    await expect(page.getByText('Showing 1–15 of 15 purchase prices')).toBeVisible()

    await page.getByRole('button', { name: /Active/ }).first().click()
    await page.getByRole('menuitem', { name: /Expiring in 30 days/ }).click()
    await expect(page.getByText('Showing 1–1 of 1 purchase price')).toBeVisible()
  })

  test('?vendor= filters to one vendor (seed: V00004 has one price)', async ({ page }) => {
    await page.goto('/purchasing/purchase-prices?vendor=V00004')
    await expect(page.getByText('Showing 1–1 of 1 purchase price')).toBeVisible()
    await expect(rowOf(page, 'RM-GASKET')).toHaveCount(1)
  })

  test('edits a price cell in place: Enter saves, Esc cancels, invalid is refused', async ({ page }) => {
    const row = rowOf(page, 'RM-BASE-STD')
    const cell = row.locator('[data-col-key="price"]')
    await expect(cell).toContainText('₹41.00')

    await cell.click()
    await page.getByLabel('Edit Price ₹').fill('99')
    await page.keyboard.press('Escape')
    await expect(cell).toContainText('₹41.00')

    await cell.click()
    await page.getByLabel('Edit Price ₹').fill('45.5')
    await page.keyboard.press('Enter')
    await expect(cell).toContainText('₹45.50')
    await expect(row.locator('[data-col-key="vsCost"]')).toContainText('+11%')

    await cell.click()
    await page.getByLabel('Edit Price ₹').fill('-3')
    await page.keyboard.press('Enter')
    await expect(page.getByText('Not saved')).toBeVisible()
    await expect(page.getByText('Enter a price of 0 or more.').first()).toBeVisible()
    await expect(cell).toContainText('₹45.50')

    // Keyboard: focus a cell, Enter edits, Tab commits and moves to the next editable cell (Lead time).
    await cell.focus()
    await page.keyboard.press('Enter')
    await page.getByLabel('Edit Price ₹').fill('46')
    await page.keyboard.press('Tab')
    await expect(page.getByLabel('Edit From qty')).toHaveCount(0)
    await expect(page.getByLabel('Edit Lead time (days)')).toBeFocused()
    await expect(cell).toContainText('₹46.00')
  })

  test('Shift+P changes a price: the old row ends the day before; T adds a quantity tier', async ({ page }) => {
    await rowOf(page, 'RM-BASE-STD').locator('[data-col-key="vendorName"]').click()
    await page.keyboard.press('Shift+P')
    const d = drawerFor(page)
    await expect(d).toBeVisible()
    await expect(d.getByLabel('Vendor', { exact: true })).toHaveCount(0) // locked while changing a price
    await d.getByLabel(/^Price/).fill('44')
    await page.keyboard.press('Control+s')
    await expect(page.getByText('Showing 1–15 of 15 purchase prices')).toBeVisible()
    await expect(rowOf(page, 'RM-BASE-STD').filter({ hasText: 'Expired' })).toHaveCount(1)
    await expect(rowOf(page, 'RM-BASE-STD').filter({ hasText: 'Active' })).toHaveCount(1)

    await page.keyboard.press('Escape')
    await rowOf(page, 'RM-GASKET').filter({ hasText: 'V00001' }).locator('[data-col-key="vendorName"]').click()
    await page.keyboard.press('t')
    const tier = drawerFor(page)
    await expect(tier.getByLabel('From qty', { exact: true })).toHaveValue('10')
    await tier.getByLabel(/^Price/).fill('3')
    await page.keyboard.press('Control+s')
    await expect(page.getByText('Showing 1–16 of 16 purchase prices')).toBeVisible()
  })

  test('change price on an expired row is refused', async ({ page }) => {
    await addPrice(page, { from: '2020-01-01', to: '2020-06-30' })
    await expect(page.getByText('of 15 purchase prices')).toBeVisible()
    // The saved row is the active one.
    await expect(drawerFor(page, 'Purchase price PP00015')).toBeVisible()
    await page.keyboard.press('Shift+P')
    await expect(page.getByText('This price has already ended')).toBeVisible()
  })

  test('items with no vendor price: add price pre-fills the item and its vendor', async ({ page }) => {
    await page.getByRole('tab', { name: /Items with no vendor price · 3/ }).click()
    await expect(page.getByRole('row')).toHaveCount(0)
    await expect(page.getByText('SBC-ASHTRAY')).toBeVisible()
    await expect(page.getByText('SBC-CONE-50')).toBeVisible()
    await expect(page.getByText('ASH-STAND-WD')).toBeVisible()

    await page.getByRole('button', { name: 'Add price for SBC-ASHTRAY' }).click()
    const d = drawerFor(page)
    await expect(d.getByLabel('Item', { exact: true })).toHaveValue('SBC-ASHTRAY')
    await expect(d.getByLabel('Vendor', { exact: true })).toHaveValue('V00001') // Kailash Ceramics Works
    await d.getByLabel(/^Price/).fill('27')
    await page.keyboard.press('Control+s')
    await expect(page.getByText('Showing 1–15 of 15 purchase prices')).toBeVisible()

    await page.getByRole('tab', { name: /Items with no vendor price · 2/ }).click()
    await expect(page.getByText('SBC-ASHTRAY')).toHaveCount(0)
  })

  test('deletes a price and can undo', async ({ page }) => {
    await rowOf(page, 'PKG-CARE-CARD').locator('[data-col-key="vendorName"]').click()
    await page.getByRole('button', { name: 'Delete purchase price' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Delete purchase price' }).click()
    await expect(page.getByText('Showing 1–13 of 13 purchase prices')).toBeVisible()
    await page.getByRole('button', { name: 'Undo' }).click()
    await expect(page.getByText('Showing 1–14 of 14 purchase prices')).toBeVisible()
  })

  test('N opens a new price from the keyboard', async ({ page }) => {
    await page.getByRole('grid').click()
    await page.keyboard.press('n')
    await expect(drawerFor(page)).toBeVisible()
  })
})
