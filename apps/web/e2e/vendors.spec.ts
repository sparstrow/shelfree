import { expect, test } from '@playwright/test'

test.describe('Vendors list', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/purchasing/vendors')
    await expect(page.getByRole('grid')).toBeVisible()
  })

  test('lists the seeded vendors, masks phone in grid, and shows full phone in drawer', async ({ page }) => {
    await expect(page.getByText('Showing 1–6 of 6 vendors')).toBeVisible()

    const v1Row = page.getByRole('row', { name: /V00001/ })
    await expect(v1Row).toContainText('•••• 0287')
    await expect(v1Row).not.toContainText('+91 94421 10287')

    await v1Row.click()
    const drawer = page.getByRole('complementary', { name: 'Vendor V00001' })
    await expect(drawer).toContainText('Kailash Ceramics Works')
    await expect(drawer).toContainText('CONTACT')
    await expect(drawer).toContainText('+91 94421 10287')
    await expect(drawer).toContainText('orders@kailashceramics.example')
  })

  test('filters rows via Service providers and Overdue balance views', async ({ page }) => {
    await page.getByRole('button', { name: 'All vendors' }).click()
    await page.getByRole('menuitem', { name: 'Service providers' }).click()
    await expect(page.getByText('Showing 1–2 of 2 vendors')).toBeVisible()

    await page.getByRole('button', { name: 'Service providers' }).click()
    await page.getByRole('menuitem', { name: 'Overdue balance' }).click()
    await expect(page.getByText('No vendors', { exact: true })).toBeVisible()
  })

  test('blocks deleting referenced vendors and allows deleting + undoing unreferenced ones', async ({ page }) => {
    await page.getByRole('row', { name: /V00001/ }).click()
    await expect(page.getByRole('button', { name: 'Delete vendor' })).toBeDisabled()

    // V00005 (TN Express Cargo & Logistics) has no purchase orders or receipts in seed data.
    await page.getByRole('row', { name: /V00005/ }).click()
    await page.getByRole('button', { name: 'Delete vendor' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Delete vendor' }).click()
    await expect(page.getByText('Showing 1–5 of 5 vendors')).toBeVisible()

    await page.getByRole('button', { name: 'Undo' }).click()
    await expect(page.getByText('Showing 1–6 of 6 vendors')).toBeVisible()
  })

  test('opens vendor profile route on row double-click', async ({ page }) => {
    await page.getByRole('row', { name: /V00002/ }).dblclick()
    await expect(page).toHaveURL(/\/purchasing\/vendors\/V00002$/)
    await expect(page.getByRole('heading', { name: 'Malaimayil Dhoop & Sambrani Works', level: 1 })).toBeVisible()
  })
})

test('the vendor preview shows its notes thread', async ({ page }) => {
  await page.goto('/purchasing/vendors')
  await page.getByRole('row', { name: /V00001/ }).click()
  const drawer = page.getByRole('complementary', { name: 'Vendor V00001' })
  await expect(drawer).toContainText('NOTES')
  await expect(drawer).toContainText('Glaze consistency on Charcoal Black')
})
