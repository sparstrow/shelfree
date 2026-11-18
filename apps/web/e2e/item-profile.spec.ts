import { expect, test } from '@playwright/test'

test.describe('Item profile', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/warehouse/items')
    await expect(page.getByRole('grid')).toBeVisible()
    await page.getByRole('row', { name: /ASH-PWH-18/ }).dblclick()
    await expect(page).toHaveURL(/\/warehouse\/items\/ASH-PWH-18$/)
    await expect(
      page.getByRole('heading', { name: 'Arunachala Mountain Sambrani Holder, Pearl White', level: 1 }),
    ).toBeVisible()
  })

  test('opens on Overview with header pills, 6 prototype tabs, KPIs and Overview facts', async ({ page }) => {
    const header = page.locator('section[data-screen-label="Item"] > div').first()
    await expect(header.getByText('ASH-PWH-18', { exact: true })).toBeVisible()
    await expect(header.getByText('Healthy', { exact: true })).toBeVisible()

    const tabs = page.getByRole('tablist', { name: 'Item sections' }).getByRole('tab')
    await expect(tabs).toHaveText([
      'Overview',
      'Stock & locations',
      'Purchasing',
      'Bill of materials',
      'Units of measure',
      'Notes',
    ])
    await expect(page.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true')

    const panel = page.getByRole('tabpanel')
    await expect(panel).toContainText('On hand')
    await expect(panel).toContainText('93')
    await expect(panel).toContainText('Available')
    await expect(panel).toContainText('59')

    await expect(page.getByRole('region', { name: 'Details' })).toContainText('₹399.00')
    await expect(page.getByRole('region', { name: 'Details' })).toContainText('₹145.00')
    await expect(page.getByRole('region', { name: 'Attributes' })).toContainText('Pearl White')
  })

  test('switches tabs by click and number keys while keeping the URL in step', async ({ page }) => {
    await page.getByRole('tab', { name: 'Stock & locations' }).click()
    await expect(page).toHaveURL(/\?tab=stock$/)
    await expect(page.getByRole('tab', { name: 'Stock & locations' })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('region', { name: 'Replenishment' })).toContainText('40')

    await page.getByRole('tab', { name: 'Purchasing' }).click()
    await expect(page).toHaveURL(/\?tab=purchasing$/)
    await expect(page.getByRole('region', { name: 'Sourcing' })).toContainText('12 days')

    await page.keyboard.press('4')
    await expect(page).toHaveURL(/\?tab=bom$/)
    await expect(page.getByRole('region', { name: 'Active components' })).toContainText('BOM00001')

    await page.keyboard.press('5')
    await expect(page).toHaveURL(/\?tab=units$/)
    await expect(page.getByLabel('Base unit of measure', { exact: true })).toHaveValue('NOS')

    await page.keyboard.press('6')
    await expect(page).toHaveURL(/\?tab=notes$/)
    await expect(page.getByRole('region', { name: 'Notes' })).toBeVisible()

    await page.keyboard.press('1')
    await expect(page).toHaveURL(/\/warehouse\/items\/ASH-PWH-18$/)
    await expect(page.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true')
  })

  test('shows seed stock-by-site figures on Stock & locations', async ({ page }) => {
    await page.keyboard.press('2')
    await expect(page).toHaveURL(/\?tab=stock$/)

    const byLocation = page.getByRole('region', { name: 'Stock by location' })
    await expect(byLocation).toContainText('Main')
    await expect(byLocation).toContainText('59')
    await expect(byLocation).toContainText('Assembly unit')
    await expect(byLocation).toContainText('20')
    await expect(byLocation).toContainText('Chennai DC')
    await expect(byLocation).toContainText('14')
    await expect(byLocation).toContainText('Total on hand')
    await expect(byLocation).toContainText('93')

    const valuation = page.getByRole('region', { name: 'Valuation' })
    await expect(valuation).toContainText('₹13,485.00')
  })

  test('navigates from BOM and Assembly Order rows to their record pages', async ({ page }) => {
    await page.keyboard.press('4')
    await expect(page).toHaveURL(/\?tab=bom$/)

    const whereUsed = page.getByRole('region', { name: 'Where used' })
    await expect(whereUsed).toContainText('BOM00004')
    await whereUsed.getByRole('row', { name: /BOM00004/ }).click()
    await expect(page).toHaveURL(/\/production\/bills-of-materials\/BOM00004$/)

    await page.goto('/warehouse/items/ASH-PWH-18?tab=bom')
    const assemblyOrders = page.getByRole('region', { name: 'Assembly orders' })
    await expect(assemblyOrders).toContainText('AO00002')
    await assemblyOrders.getByRole('row', { name: /AO00002/ }).click()
    await expect(page).toHaveURL(/\/production\/assembly-orders\/AO00002$/)
  })

  test('navigates to PO and vendor records from Purchasing', async ({ page }) => {
    await page.goto('/warehouse/items/RM-LID-PWH?tab=purchasing')
    await expect(
      page.getByRole('heading', { name: 'Ceramic Mountain Lid, Pearl White Glaze (component)', level: 1 }),
    ).toBeVisible()

    const pos = page.getByRole('region', { name: 'Purchase orders' })
    await expect(pos).toContainText('PO00001')
    await pos.getByRole('row', { name: /PO00001/ }).click()
    await expect(page).toHaveURL(/\/purchasing\/purchase-orders\/PO00001$/)

    await page.goto('/warehouse/items/RM-LID-PWH?tab=purchasing')
    await page.getByRole('region', { name: 'Sourcing' }).getByRole('button', { name: 'Kailash Ceramics Works' }).click()
    await expect(page).toHaveURL(/\/purchasing\/vendors\/V00001$/)
  })

  test('navigates to the edit placeholder on Edit button click and E key', async ({ page }) => {
    await page.getByRole('button', { name: 'Edit', exact: true }).click()
    await expect(page).toHaveURL(/\/warehouse\/items\/ASH-PWH-18\/edit$/)
    await expect(page.getByText('Edit item ASH-PWH-18', { exact: true })).toBeVisible()

    await page.goto('/warehouse/items/ASH-PWH-18')
    await expect(
      page.getByRole('heading', { name: 'Arunachala Mountain Sambrani Holder, Pearl White', level: 1 }),
    ).toBeVisible()
    await page.keyboard.press('e')
    await expect(page).toHaveURL(/\/warehouse\/items\/ASH-PWH-18\/edit$/)
    await expect(page.getByText('Edit item ASH-PWH-18', { exact: true })).toBeVisible()
  })

  test('adds a pack unit on Units of measure and derives Master pack automatically', async ({ page }) => {
    await page.keyboard.press('5')
    await expect(page).toHaveURL(/\?tab=units$/)

    await page.getByRole('button', { name: 'Add unit', exact: true }).click()
    await page.getByRole('button', { name: /DOZ.*Dozen/ }).click()

    const baseSection = page.getByRole('region', { name: 'Base and master pack' })
    await expect(baseSection).toContainText('Dozen (DOZ)')
    await expect(baseSection).toContainText('= 12 NOS')
  })

  test('Esc returns to the list with the row selected', async ({ page }) => {
    await page.keyboard.press('Escape')
    await expect(page).toHaveURL(/\/warehouse\/items\?sel=ASH-PWH-18$/)
    await expect(page.getByRole('complementary', { name: 'Item ASH-PWH-18' })).toBeVisible()
  })
})
