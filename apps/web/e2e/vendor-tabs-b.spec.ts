import { expect, test } from '@playwright/test'

test.describe('Vendor profile — supply, orders, receipts, and performance tabs', () => {
  test('opens each tab by click and number key and shows seed rows and counts for V00001', async ({ page }) => {
    await page.goto('/purchasing/vendors/V00001')
    await expect(page.getByRole('heading', { name: 'Kailash Ceramics Works', level: 1 })).toBeVisible()

    // Click: Items supplied (tab 3)
    await page.getByRole('tab', { name: 'Items supplied', exact: true }).click()
    await expect(page).toHaveURL(/\?tab=items$/)
    await expect(page.getByText('6 items')).toBeVisible()
    const itemsRegion = page.getByRole('region', { name: 'Items supplied' })
    await expect(itemsRegion).toContainText('RM-LID-PWH')
    await expect(itemsRegion).toContainText('Preferred')
    await expect(itemsRegion).toContainText('₹62.00')
    await expect(itemsRegion).toContainText('SBC-ASHTRAY')
    await expect(itemsRegion).toContainText('No price')

    // Click: Purchase orders (tab 4)
    await page.getByRole('tab', { name: 'Purchase orders', exact: true }).click()
    await expect(page).toHaveURL(/\?tab=orders$/)
    const orderFilters = page.getByRole('group', { name: 'Filter purchase orders' })
    await expect(orderFilters.getByRole('button', { name: /^All\s*4$/ })).toBeVisible()
    await expect(orderFilters.getByRole('button', { name: /^Open\s*4$/ })).toBeVisible()
    await expect(orderFilters.getByRole('button', { name: /^Received & closed\s*0$/ })).toBeVisible()
    await expect(orderFilters.getByRole('button', { name: /^Cancelled\s*0$/ })).toBeVisible()

    const ordersRegion = page.getByRole('region', { name: 'Purchase orders' })
    await expect(ordersRegion).toContainText('PO00001')
    await expect(ordersRegion).toContainText('PO00002')
    await expect(ordersRegion).toContainText('574 / 620 received')
    await expect(ordersRegion).toContainText('₹37,500.00')

    await orderFilters.getByRole('button', { name: /^Received & closed/ }).click()
    await expect(ordersRegion).toContainText('No purchase orders in this filter.')
    await orderFilters.getByRole('button', { name: /^All/ }).click()

    // Click: Purchase receipts (tab 5)
    await page.getByRole('tab', { name: 'Purchase receipts', exact: true }).click()
    await expect(page).toHaveURL(/\?tab=receipts$/)
    const receiptFilters = page.getByRole('group', { name: 'Filter purchase receipts' })
    await expect(receiptFilters.getByRole('button', { name: /^All\s*2$/ })).toBeVisible()
    await expect(receiptFilters.getByRole('button', { name: /^Draft\s*1$/ })).toBeVisible()
    await expect(receiptFilters.getByRole('button', { name: /^Posted\s*1$/ })).toBeVisible()
    await expect(receiptFilters.getByRole('button', { name: /^Cancelled\s*0$/ })).toBeVisible()

    const receiptsRegion = page.getByRole('region', { name: 'Purchase receipts' })
    await expect(receiptsRegion).toContainText('GRN00005')
    await expect(receiptsRegion).toContainText('GRN00004')
    await expect(receiptsRegion).toContainText('KCW-1187')
    await expect(receiptsRegion).toContainText('₹6,410.00')

    await receiptFilters.getByRole('button', { name: /^Posted/ }).click()
    await expect(receiptsRegion).toContainText('GRN00004')
    await expect(receiptsRegion).not.toContainText('GRN00005')
    await receiptFilters.getByRole('button', { name: /^All/ }).click()

    // Click: Performance (tab 7)
    await page.getByRole('tab', { name: 'Performance', exact: true }).click()
    await expect(page).toHaveURL(/\?tab=performance$/)
    await expect(page.getByRole('region', { name: 'Delivery record' })).toContainText('GRN00004')
    await expect(page.getByRole('region', { name: 'Delivery record' })).toContainText('7 days early')
    const scorecard = page.getByRole('region', { name: 'Scorecard' })
    await expect(scorecard).toContainText('1 of 1 · 100%')
    await expect(scorecard).toContainText('11 days')
    await expect(scorecard).toContainText('21 days')
    await expect(scorecard).toContainText('574')
    await expect(scorecard).toContainText('1%')
    await expect(page.getByRole('region', { name: 'Quality log' })).toContainText('RM-LID-BLK')
    await expect(page.getByRole('region', { name: 'Quality log' })).toContainText('Kiln cracks at the peak vent')

    // Number keys jump between tabs too.
    await page.keyboard.press('3')
    await expect(page).toHaveURL(/\?tab=items$/)
    await expect(page.getByRole('tab', { name: 'Items supplied', exact: true })).toHaveAttribute('aria-selected', 'true')

    await page.keyboard.press('4')
    await expect(page).toHaveURL(/\?tab=orders$/)
    await expect(page.getByRole('tab', { name: 'Purchase orders', exact: true })).toHaveAttribute('aria-selected', 'true')

    await page.keyboard.press('5')
    await expect(page).toHaveURL(/\?tab=receipts$/)
    await expect(page.getByRole('tab', { name: 'Purchase receipts', exact: true })).toHaveAttribute('aria-selected', 'true')

    await page.keyboard.press('7')
    await expect(page).toHaveURL(/\?tab=performance$/)
    await expect(page.getByRole('tab', { name: 'Performance', exact: true })).toHaveAttribute('aria-selected', 'true')
  })

  test('PO row opens the PO page (click and Enter) and Receive opens a draft receipt', async ({ page }) => {
    await page.goto('/purchasing/vendors/V00001?tab=orders')
    const poRow = page.getByRole('button', { name: 'PO00001', exact: true })
    await expect(poRow).toBeVisible()

    // Keyboard Enter on focused row button opens the PO page.
    await poRow.focus()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/purchasing\/purchase-orders\/PO00001$/)
    await expect(page.getByRole('heading', { name: 'Edit purchase order', level: 1 })).toBeVisible()

    // Click on PO row also opens the PO page.
    await page.goto('/purchasing/vendors/V00001?tab=orders')
    await page.getByRole('button', { name: 'PO00002', exact: true }).click()
    await expect(page).toHaveURL(/\/purchasing\/purchase-orders\/PO00002$/)
    await expect(page.getByRole('heading', { name: 'Edit purchase order', level: 1 })).toBeVisible()

    // Receive button starts a new receipt against that PO.
    await page.goto('/purchasing/vendors/V00001?tab=orders')
    await page.getByRole('button', { name: 'Receive', exact: true }).first().click()
    await expect(page).toHaveURL(/\/purchasing\/purchase-receipts\/new\?po=PO00001$/)
    await expect(page.getByRole('heading', { name: 'New purchase receipt', level: 1 })).toBeVisible()
  })

  test('receipt row opens the receipt page and item row opens the item page', async ({ page }) => {
    await page.goto('/purchasing/vendors/V00001?tab=receipts')
    await page.getByRole('button', { name: 'GRN00004', exact: true }).click()
    await expect(page).toHaveURL(/\/purchasing\/purchase-receipts\/GRN00004$/)
    await expect(page.getByRole('heading', { name: 'Purchase receipt', level: 1 })).toBeVisible()

    await page.goto('/purchasing/vendors/V00001?tab=receipts')
    await page.getByRole('button', { name: 'PO00002', exact: true }).click()
    await expect(page).toHaveURL(/\/purchasing\/purchase-orders\/PO00002$/)

    await page.goto('/purchasing/vendors/V00001?tab=items')
    await page.getByRole('button', { name: /RM-LID-PWH/ }).click()
    await expect(page).toHaveURL(/\/warehouse\/items\/RM-LID-PWH$/)
    await expect(page.getByText(/RM-LID-PWH/).first()).toBeVisible()
  })

  test('shows empty states for a vendor with no items, orders, or receipts', async ({ page }) => {
    await page.goto('/purchasing/vendors/V00005')
    await expect(page.getByRole('heading', { name: 'TN Express Cargo & Logistics', level: 1 })).toBeVisible()

    await page.keyboard.press('3')
    await expect(page.getByText('No items linked to this vendor yet')).toBeVisible()

    await page.keyboard.press('4')
    await expect(page.getByText('No purchase orders with this vendor yet.')).toBeVisible()

    await page.keyboard.press('5')
    await expect(page.getByText('Nothing received from this vendor yet.')).toBeVisible()

    await page.keyboard.press('7')
    await expect(page.getByText('No posted receipts yet — the record starts with the first delivery.')).toBeVisible()
    await expect(page.getByText('Nothing rejected on receipt so far.')).toBeVisible()
  })
})
