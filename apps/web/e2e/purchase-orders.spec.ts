import { expect, test } from '@playwright/test'

test.describe('Purchase Orders list', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/purchasing/purchase-orders')
    await expect(page.getByRole('grid')).toBeVisible()
  })

  test('lists the seeded orders and opens the preview drawer', async ({ page }) => {
    await expect(page.getByText('Showing 1–10 of 10 purchase orders')).toBeVisible()
    await page.getByRole('row', { name: /PO00003/ }).click()
    const drawer = page.getByRole('complementary', { name: 'Purchase order PO00003' })
    await expect(drawer).toContainText('Malaimayil Dhoop & Sambrani Works')
    await expect(drawer).toContainText('₹18,050.00')
    await page.keyboard.press('Escape')
    await expect(drawer).toBeHidden()
  })

  test('filters by view, search and sort', async ({ page }) => {
    await page.getByRole('button', { name: 'All orders' }).click()
    await page.getByRole('menuitem', { name: 'Drafts' }).click()
    await expect(page.getByText('Showing 1–2 of 2 purchase orders')).toBeVisible()
    await page.getByRole('button', { name: 'Clear all' }).click()

    await page.keyboard.press('/')
    await page.keyboard.type('vellore')
    await expect(page.getByText('Showing 1–1 of 1 purchase order')).toBeVisible()
    await page.keyboard.press('Escape')

    await page.getByRole('columnheader', { name: /Total/ }).getByRole('button').click()
    await page.getByRole('columnheader', { name: /Total/ }).getByRole('button').click()
    await expect(page.getByRole('row').nth(1)).toContainText('PO00001')
  })

  test('only drafts can be deleted, with undo', async ({ page }) => {
    await page.getByRole('row', { name: /PO00001/ }).click()
    await expect(page.getByRole('button', { name: 'Delete purchase order' })).toBeDisabled()

    await page.getByRole('row', { name: /PO00008/ }).click()
    await page.getByRole('button', { name: 'Delete purchase order' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Delete purchase order' }).click()
    await expect(page.getByText('Showing 1–9 of 9 purchase orders')).toBeVisible()
    await page.getByRole('button', { name: 'Undo' }).click()
    await expect(page.getByText('Showing 1–10 of 10 purchase orders')).toBeVisible()
  })
})

test.describe('Purchase order document', () => {
  test('edits a draft: qty re-prices the total, save returns to the list', async ({ page }) => {
    await page.goto('/purchasing/purchase-orders/PO00006')
    await expect(page.getByRole('heading', { name: 'Edit purchase order' })).toBeVisible()
    await expect(page.getByText('₹14,220.00').first()).toBeVisible()

    const qty = page.getByRole('spinbutton', { name: 'Quantity, line 1' })
    await qty.fill('100')
    await expect(page.getByText('₹6,020.00').first()).toBeVisible() // 100 × 41 + 600 × 3.20

    await page.getByRole('button', { name: 'Save draft' }).click()
    await expect(page).toHaveURL(/purchase-orders\?sel=PO00006/)
    await expect(page.getByRole('complementary', { name: 'Purchase order PO00006' })).toContainText('₹6,020.00')
  })

  test('adds a line from the vendor price list and issues the order', async ({ page }) => {
    await page.goto('/purchasing/purchase-orders/PO00006')
    await page.getByRole('button', { name: 'Add line' }).click()
    const search = page.getByRole('textbox', { name: 'Search items to add' })
    await search.fill('lid')
    await search.press('Enter')
    await expect(page.getByText('3 lines')).toBeVisible()

    await page.getByRole('button', { name: 'Issue purchase order' }).click()
    await expect(page).toHaveURL(/purchase-orders\?sel=PO00006/)
    await expect(page.getByRole('row', { name: /PO00006/ })).toContainText('Issued')
    await expect(page.getByRole('row', { name: /PO00006/ })).toContainText('Locked')
  })

  test('an issued order is locked until reopened', async ({ page }) => {
    await page.goto('/purchasing/purchase-orders/PO00001')
    await expect(page.getByText('Issued and locked — reopen it to edit the vendor, dates, or lines.')).toBeVisible()
    await expect(page.getByLabel('Vendor', { exact: true })).toBeDisabled()

    // Line actions are attempted and explained, not hidden.
    await page.getByRole('spinbutton', { name: 'Quantity, line 1' }).fill('5')
    await expect(page.getByText('PO00001 is locked — reopen it to edit lines.')).toBeVisible()

    await page.getByRole('button', { name: 'Reopen for editing' }).click()
    await expect(page.getByLabel('Vendor', { exact: true })).toBeEnabled()
    await expect(page.getByText('Reopened — this order was issued to the vendor.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Save & lock' })).toBeVisible()
  })

  test('a new order needs a vendor and explains missing prices', async ({ page }) => {
    await page.goto('/purchasing/purchase-orders/new')
    await expect(page.getByRole('heading', { name: 'New purchase order' })).toBeVisible()
    await expect(page.getByText('PO00011')).toBeVisible()

    await page.getByRole('button', { name: 'Save draft' }).click()
    await expect(page.getByRole('alert')).toContainText('Choose a vendor before saving.')

    await page.getByRole('button', { name: 'Add line' }).click()
    await expect(page.getByText('pick the vendor above first')).toBeVisible()
    await page.keyboard.press('Escape')

    await page.getByLabel('Vendor', { exact: true }).selectOption({ label: 'Kailash Ceramics Works' })
    await page.getByRole('button', { name: 'Issue purchase order' }).click()
    await expect(page.getByRole('alert')).toContainText('A vendor and at least one line are required to issue.')
  })
})
