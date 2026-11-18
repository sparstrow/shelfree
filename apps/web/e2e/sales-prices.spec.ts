import { type Page, expect, test } from '@playwright/test'

const rowOf = (page: Page, text: string) => page.getByRole('row').filter({ hasText: text })
const drawerFor = (page: Page, name = 'New customer price') => page.getByRole('complementary', { name })

async function addCustomerPrice(
  page: Page,
  o: { customer: string; item: string; price: string; qty?: string; from?: string; to?: string },
) {
  await page.getByRole('button', { name: 'New customer price', exact: true }).click()
  const d = drawerFor(page)
  await d.getByLabel('Customer', { exact: true }).selectOption(o.customer)
  await d.getByLabel('Item', { exact: true }).selectOption(o.item)
  if (o.qty) await d.getByLabel('From qty', { exact: true }).fill(o.qty)
  await d.getByLabel(/^Price/).fill(o.price)
  if (o.from) await d.getByLabel('Starts', { exact: true }).fill(o.from)
  if (o.to) await d.getByLabel('Ends', { exact: true }).fill(o.to)
  await page.keyboard.press('Control+s')
}

test.describe('Sales prices (List prices + Customer prices + Price check)', () => {
  test('List prices: seeded count, view filters, and inline list-price editing', async ({ page }) => {
    await page.goto('/sales/sales-prices')
    await expect(page.getByText('Showing 1–20 of 22 list prices')).toBeVisible()

    // View filters
    await page.getByRole('button', { name: /All list prices/ }).click()
    await page.getByRole('menuitem', { name: 'Needs a price' }).click()
    await expect(page.getByText('Showing 1–10 of 10 list prices')).toBeVisible()

    await page.getByRole('button', { name: /Needs a price/ }).click()
    await page.getByRole('menuitem', { name: 'Has agreed prices' }).click()
    await expect(page.getByText('Showing 1–5 of 5 list prices')).toBeVisible()

    await page.getByRole('button', { name: /Has agreed prices/ }).click()
    await page.getByRole('menuitem', { name: 'All list prices' }).click()

    // Inline list price edit: Esc cancels, Enter saves, negative is refused
    const row = rowOf(page, 'ASH-PWH-18')
    const cell = row.locator('[data-col-key="price"]')
    await expect(cell).toContainText('₹399.00')

    await cell.click()
    await page.getByLabel('Edit List price', { exact: true }).fill('999')
    await page.keyboard.press('Escape')
    await expect(cell).toContainText('₹399.00')

    await cell.click()
    await page.getByLabel('Edit List price', { exact: true }).fill('-5')
    await page.keyboard.press('Enter')
    await expect(page.getByText('Not saved')).toBeVisible()
    await expect(cell).toContainText('₹399.00')

    await cell.click()
    await page.getByLabel('Edit List price', { exact: true }).fill('100')
    await page.keyboard.press('Enter')
    await expect(cell).toContainText('₹100.00')
    await expect(row.locator('[data-col-key="priceState"]')).toContainText('Below cost')

    await page.getByRole('button', { name: /All list prices/ }).click()
    await page.getByRole('menuitem', { name: 'Below cost' }).click()
    await expect(page.getByText('Showing 1–1 of 1 list price')).toBeVisible()
  })

  test('Customer prices: seeded count, validation, scheduled/expired statuses, views, inline edit, and delete/undo', async ({
    page,
  }) => {
    await page.goto('/sales/sales-prices')
    await page.getByRole('tab', { name: /Customer prices/ }).click()
    await expect(page.getByText('Showing 1–11 of 11 customer prices')).toBeVisible()

    // Create price: validation errors first
    await page.getByRole('button', { name: 'New customer price', exact: true }).click()
    const d = drawerFor(page)
    await d.getByRole('button', { name: 'Create customer price' }).click()
    await expect(d).toContainText('Fix the highlighted fields to save.')
    await expect(d).toContainText('Pick a customer.')
    await expect(d).toContainText('Pick an item.')
    await expect(d).toContainText('Enter a price of 0 or more.')

    await d.getByLabel('Customer', { exact: true }).selectOption('CUS00003')
    await d.getByLabel('Item', { exact: true }).selectOption('ASH-BLK-18')
    await d.getByLabel('From qty', { exact: true }).fill('1.5')
    await d.getByLabel(/^Price/).fill('390')
    await d.getByRole('button', { name: 'Create customer price' }).click()
    await expect(d).toContainText('Use a whole number, 1 or more.')

    await d.getByLabel('From qty', { exact: true }).fill('1')
    await page.keyboard.press('Control+s')

    await expect(page.getByText('Showing 1–12 of 12 customer prices')).toBeVisible()
    const view = drawerFor(page, 'Customer price CP00012')
    await expect(view).toContainText('₹390.00')
    await expect(view).toContainText('Active')
    await page.keyboard.press('Escape')

    // Refuses overlapping tier for same customer, item, and qty
    await addCustomerPrice(page, { customer: 'CUS00001', item: 'ASH-PWH-18', price: '350' })
    await expect(d).toContainText('Overlaps CP00001')
    await page.keyboard.press('Escape')

    // Expired & Scheduled statuses + views
    await addCustomerPrice(page, {
      customer: 'CUS00003',
      item: 'SBC-CONE-12',
      price: '60',
      from: '2020-01-01',
      to: '2020-06-30',
    })
    await expect(page.getByText('of 13 customer prices')).toBeVisible()
    await page.keyboard.press('Escape')

    await addCustomerPrice(page, {
      customer: 'CUS00003',
      item: 'SBC-CONE-12',
      qty: '10',
      price: '55',
      from: '2099-01-01',
    })
    await expect(page.getByText('of 14 customer prices')).toBeVisible()
    await page.keyboard.press('Escape')

    await expect(rowOf(page, 'CUS00003').filter({ hasText: 'Expired' })).toHaveCount(1)
    await expect(rowOf(page, 'CUS00003').filter({ hasText: 'Scheduled' })).toHaveCount(1)

    await page.getByRole('button', { name: /All customer prices/ }).click()
    await page.getByRole('menuitem', { name: 'Scheduled' }).click()
    await expect(page.getByText('Showing 1–1 of 1 customer price')).toBeVisible()

    await page.getByRole('button', { name: /Scheduled/ }).first().click()
    await page.getByRole('menuitem', { name: 'Expired' }).click()
    await expect(page.getByText('Showing 1–1 of 1 customer price')).toBeVisible()

    await page.getByRole('button', { name: /Expired/ }).first().click()
    await page.getByRole('menuitem', { name: 'All customer prices' }).click()

    // Inline cell edit on CP00001 (CUS00001 · ASH-PWH-18 · Annual trade agreement)
    const cp1Row = rowOf(page, 'CUS00001').filter({ hasText: 'Annual trade agreement' })
    const priceCell = cp1Row.locator('[data-col-key="price"]')

    await priceCell.click()
    await page.getByLabel('Edit Price ₹', { exact: true }).fill('999')
    await page.keyboard.press('Escape')
    await expect(priceCell).toContainText('₹360.00')

    await priceCell.click()
    await page.getByLabel('Edit Price ₹', { exact: true }).fill('355')
    await page.keyboard.press('Enter')
    await expect(priceCell).toContainText('₹355.00')
    await expect(cp1Row.locator('[data-col-key="vsList"]')).toContainText('−11%')

    // Delete + Undo
    await rowOf(page, 'CUS00010').locator('[data-col-key="customerName"]').click()
    await page.getByRole('button', { name: 'Delete customer price' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Delete customer price' }).click()
    await expect(page.getByText('Showing 1–13 of 13 customer prices')).toBeVisible()
    await page.getByRole('button', { name: 'Undo' }).click()
    await expect(page.getByText('Showing 1–14 of 14 customer prices')).toBeVisible()
  })

  test('?customer= filter and Price check resolution', async ({ page }) => {
    await page.goto('/sales/sales-prices?customer=CUS00001')
    await expect(page.getByText('Showing 1–5 of 5 customer prices')).toBeVisible()

    await page.getByRole('tab', { name: 'Price check' }).click()
    await page.getByLabel('Customer', { exact: true }).selectOption('CUS00001')
    await page.getByLabel('Item', { exact: true }).selectOption('ASH-PWH-18')
    await page.getByLabel('Quantity', { exact: true }).fill('50')
    await expect(page.getByText('₹340.00')).toBeVisible()
    await expect(page.getByText('Quantity break', { exact: true })).toBeVisible()
  })
})
