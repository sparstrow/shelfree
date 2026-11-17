import { expect, test } from '@playwright/test'

test.describe('Purchase Receipts', () => {
  test('lists receipts and previews one', async ({ page }) => {
    await page.goto('/purchasing/purchase-receipts')
    await expect(page.getByText('Showing 1–5 of 5 purchase receipts')).toBeVisible()
    await page.getByRole('row', { name: /GRN00005/ }).click()
    const drawer = page.getByRole('complementary', { name: 'Purchase receipt GRN00005' })
    await expect(drawer).toContainText('Kailash Ceramics Works')
    await expect(drawer).toContainText('WHAT ARRIVED')
  })

  test('a posted receipt cannot be deleted', async ({ page }) => {
    await page.goto('/purchasing/purchase-receipts')
    await page.getByRole('row', { name: /GRN00004/ }).click()
    await expect(page.getByRole('button', { name: 'Delete receipt' })).toBeDisabled()
  })

  test('starts a receipt from the order picker', async ({ page }) => {
    await page.goto('/purchasing/purchase-receipts')
    await page.getByRole('button', { name: 'New purchase receipt' }).click()
    const picker = page.getByRole('dialog', { name: 'Receive against which order?' })
    await expect(picker).toBeVisible()
    await picker.getByRole('button', { name: /PO00009/ }).click()
    await expect(page).toHaveURL(/purchase-receipts\/new\?po=PO00009/)
    await expect(page.getByRole('heading', { name: 'New purchase receipt' })).toBeVisible()
    await expect(page.getByText('GRN00006')).toBeVisible()
  })

  test('posting moves stock and the order status follows', async ({ page }) => {
    // PO00009 is issued with nothing received yet.
    await page.goto('/purchasing/purchase-receipts/new?po=PO00009')
    await expect(page.getByText('What arrived')).toBeVisible()

    // Over-receiving is caught before posting.
    const firstQty = page.getByRole('spinbutton', { name: /^Receiving now,/ }).first()
    await firstQty.fill('999999')
    await expect(page.getByText('More than this line still has outstanding on the order.')).toBeVisible()
    await page.getByRole('button', { name: 'Post receipt' }).click()
    await expect(page.getByRole('alert').last()).toContainText('are still outstanding on PO00009')

    // Receive part of the first line only.
    await page.getByRole('button', { name: 'Clear' }).click()
    await firstQty.fill('10')
    await page.getByRole('button', { name: 'Post receipt' }).click()
    await expect(page.getByRole('heading', { name: 'Purchase receipt' })).toBeVisible()
    await expect(page.getByText('Posted — stock has moved.')).toBeVisible()
    await expect(firstQty).toBeDisabled()

    await page.getByRole('button', { name: 'Purchase order', exact: true }).click()
    await expect(page).toHaveURL(/purchase-orders\/PO00009/)
    await expect(page.getByText('Receiving has started against this order')).toBeVisible()
    await expect(page.getByText('Receipts against this order')).toBeVisible()
  })

  test('the PO drawer Receive button opens a receipt for that order', async ({ page }) => {
    await page.goto('/purchasing/purchase-orders')
    await page.getByRole('row', { name: /PO00001/ }).click()
    await page.getByRole('button', { name: 'Receive', exact: true }).click()
    await expect(page).toHaveURL(/purchase-receipts\/new\?po=PO00001/)
  })
})
