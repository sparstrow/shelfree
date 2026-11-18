import { expect, test } from '@playwright/test'

test.describe('Customer profile', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/sales/customers')
    await expect(page.getByRole('grid')).toBeVisible()
    await page.getByRole('row', { name: /CUS00002/ }).dblclick()
    await expect(page).toHaveURL(/\/sales\/customers\/CUS00002$/)
    await expect(page.getByRole('heading', { name: 'Girivalam Path Handicrafts', level: 1 })).toBeVisible()
  })

  test('opens on Overview with header pills, 10 prototype tabs and Overview facts', async ({ page }) => {
    const header = page.locator('section[data-screen-label="Customer"] > div').first()
    await expect(header.getByText('CUS00002', { exact: true })).toBeVisible()
    await expect(header.getByText('Active', { exact: true })).toBeVisible()

    const tabs = page.getByRole('tablist', { name: 'Customer sections' }).getByRole('tab')
    await expect(tabs).toHaveText([
      'Overview',
      'Billing & address',
      'Sales prices',
      'Order history',
      'Statement & aging',
      'Shipping addresses',
      'Notes & activity',
      'Documents',
      'Contacts',
      'Credit & risk',
    ])
    await expect(page.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('region', { name: 'Details' })).toContainText('NET 15')
    await expect(page.getByRole('region', { name: 'Details' })).toContainText('Nandhini Balaji')
  })

  test('switches tabs by click and number keys while keeping the URL in step', async ({ page }) => {
    await page.getByRole('tab', { name: 'Billing & address' }).click()
    await expect(page).toHaveURL(/\?tab=details$/)
    await expect(page.getByRole('tab', { name: 'Billing & address' })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('region', { name: 'Billing & address' })).toContainText('Tamil Nadu')

    await page.getByRole('tab', { name: 'Sales prices' }).click()
    await expect(page).toHaveURL(/\?tab=prices$/)
    await expect(page.getByRole('tabpanel')).toContainText('Agreed prices')

    await page.keyboard.press('4')
    await expect(page).toHaveURL(/\?tab=orders$/)
    await expect(page.getByRole('tabpanel')).toContainText('SO00013')
    await expect(page.getByRole('tabpanel')).toContainText('INV00008')

    await page.keyboard.press('7')
    await expect(page).toHaveURL(/\?tab=notes$/)
    await expect(page.getByRole('region', { name: 'Notes' })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Activity' })).toContainText('Account opened')

    await page.keyboard.press('8')
    await expect(page).toHaveURL(/\?tab=docs$/)
    await expect(page.getByRole('tabpanel')).toContainText('No documents attached')

    await page.keyboard.press('9')
    await expect(page).toHaveURL(/\?tab=contacts$/)
    await expect(page.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'rp-tab-contacts')

    await page.keyboard.press('0')
    await expect(page).toHaveURL(/\?tab=credit$/)
    await expect(page.getByRole('region', { name: 'Credit' })).toContainText('₹35,000.00')

    await page.keyboard.press('1')
    await expect(page).toHaveURL(/\/sales\/customers\/CUS00002$/)
    await expect(page.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true')
  })

  test('edits Overview Details in place with validation error and persists across reload', async ({ page }) => {
    await page.keyboard.press('e')
    const limitInput = page.getByLabel('Credit limit', { exact: true })
    await limitInput.fill('-100')
    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(page.locator('[data-field="creditLimit"]').getByRole('alert')).toContainText('0 or more')
    await expect(page.getByText('Fix the highlighted field to save.')).toBeVisible()

    await limitInput.fill('42000')
    await page.getByLabel('Payment terms', { exact: true }).fill('NET 30')
    await page.keyboard.press('Control+s')

    await expect(page.getByText('Customer updated')).toBeVisible()
    await expect(page.locator('[data-field="creditLimit"]')).toContainText('₹42,000.00')
    await expect(page.locator('[data-field="terms"]')).toContainText('NET 30')

    await page.reload()
    await expect(page.locator('[data-field="creditLimit"]')).toContainText('₹42,000.00')
    await expect(page.locator('[data-field="terms"]')).toContainText('NET 30')
  })

  test('edits Billing & address in place, reports GSTIN error and persists after reload', async ({ page }) => {
    await page.keyboard.press('2')
    await expect(page).toHaveURL(/\?tab=details$/)

    const cityRow = page.locator('[data-field="city"]')
    const cityView = cityRow.getByText('Tiruvannamalai — Girivalam Road')
    const before = await cityView.boundingBox()

    await page.keyboard.press('e')
    const cityInput = page.getByLabel('City', { exact: true })
    await expect(cityInput).toBeVisible()
    const after = await cityInput.boundingBox()
    expect(before).not.toBeNull()
    expect(after).not.toBeNull()
    expect(after?.y).toBe(before?.y)
    expect(after?.x).toBe(before?.x)
    expect(after?.height).toBe(before?.height)

    // Invalid GSTIN blocks save with inline error under its row.
    await page.getByLabel('GSTIN', { exact: true }).fill('123')
    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(page.locator('[data-field="gstin"]').getByRole('alert')).toContainText('15 characters')
    await expect(page.getByText('Fix the highlighted field to save.')).toBeVisible()

    // Fix GSTIN, update City, then save and reload.
    await page.getByLabel('GSTIN', { exact: true }).fill('33AABCS1002K1Z2')
    await cityInput.fill('Tiruvannamalai — Girivalam Main')
    await page.keyboard.press('Control+s')

    await expect(page.getByText('Customer updated')).toBeVisible()
    await expect(cityRow).toContainText('Tiruvannamalai — Girivalam Main')
    await expect(cityRow.getByRole('textbox')).toHaveCount(0)

    await page.reload()
    await expect(page.locator('[data-field="city"]')).toContainText('Tiruvannamalai — Girivalam Main')
  })

  test('adds then deletes a ship-to address and persists across reload', async ({ page }) => {
    await page.keyboard.press('6')
    await expect(page).toHaveURL(/\?tab=shipping$/)
    await expect(page.getByText('Main store', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Add address' }).click()
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.getByRole('alert').filter({ hasText: 'Label is required.' })).toBeVisible()

    await page.getByLabel('Label', { exact: true }).fill('Pournami stall')
    await page.getByLabel('Address', { exact: true }).fill('Girivalam Road, near Adi Annamalai')
    await page.getByRole('button', { name: 'Save', exact: true }).click()

    await expect(page.getByText('Pournami stall', { exact: true })).toBeVisible()
    await page.reload()
    await expect(page.getByText('Pournami stall', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Remove Pournami stall', exact: true }).click()
    await expect(page.getByText('Pournami stall', { exact: true })).toHaveCount(0)
    await page.reload()
    await expect(page.getByText('Pournami stall', { exact: true })).toHaveCount(0)
  })

  test('toggles credit hold and shows the header tag across reload', async ({ page }) => {
    const header = page.locator('section[data-screen-label="Customer"] > div').first()
    await expect(header.getByText('Credit hold', { exact: true })).toHaveCount(0)

    await page.keyboard.press('0')
    await expect(page).toHaveURL(/\?tab=credit$/)
    const toggle = page.getByRole('switch', { name: 'Credit hold' })
    await expect(toggle).toHaveAttribute('aria-checked', 'false')

    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-checked', 'true')
    await expect(header.getByText('Credit hold', { exact: true })).toBeVisible()

    await page.reload()
    await expect(header.getByText('Credit hold', { exact: true })).toBeVisible()
    await expect(page.getByRole('switch', { name: 'Credit hold' })).toHaveAttribute('aria-checked', 'true')
  })

  test('shows seed-based overdue aging buckets on Statement & aging', async ({ page }) => {
    await page.goto('/sales/customers/CUS00007?tab=statement')
    await expect(page.getByRole('heading', { name: 'Kailash Pooja Samagri', level: 1 })).toBeVisible()
    const aging = page.getByRole('region', { name: 'Aging' })
    await expect(aging).toContainText('90+ days')
    await expect(aging).toContainText('₹6,285.00')
    const openItems = page.getByRole('region', { name: 'Open items' })
    await expect(openItems).toContainText('₹6,285.00')
    await expect(openItems).toContainText('1 invoice')
  })

  test('Esc returns to the list with the row selected', async ({ page }) => {
    await page.keyboard.press('Escape')
    await expect(page).toHaveURL(/\/sales\/customers\?sel=CUS00002$/)
    await expect(page.getByRole('complementary', { name: 'Customer CUS00002' })).toBeVisible()
  })
})
