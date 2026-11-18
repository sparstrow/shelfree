import { expect, test } from '@playwright/test'

test.describe('Customers list', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/sales/customers')
    await expect(page.getByRole('grid')).toBeVisible()
  })

  test('lists the seeded customers, masks phone in grid, and shows full phone in drawer', async ({ page }) => {
    await expect(page.getByText('Showing 1–16 of 16 customers')).toBeVisible()

    const c1Row = page.getByRole('row', { name: /CUS00001/ })
    await expect(c1Row).toContainText('•••• 1562')
    await expect(c1Row).not.toContainText('+91 94420 11562')

    await c1Row.click()
    const drawer = page.getByRole('complementary', { name: 'Customer CUS00001' })
    await expect(drawer).toContainText('Sri Annamalaiyar Pooja Stores')
    await expect(drawer).toContainText('CONTACT')
    await expect(drawer).toContainText('+91 94420 11562')
    await expect(drawer).toContainText('orders@annamalaiyarpooja.example')
  })

  test('filters rows via the On hold view', async ({ page }) => {
    await page.getByRole('button', { name: 'All customers' }).click()
    await page.getByRole('menuitem', { name: 'On hold' }).click()
    await expect(page.getByText('Showing 1–3 of 3 customers')).toBeVisible()
  })

  test('blocks deleting customers with balance/open orders and allows deleting + undoing idle ones', async ({ page }) => {
    await page.getByRole('row', { name: /CUS00001/ }).click()
    await expect(page.getByRole('button', { name: 'Delete customer' })).toBeDisabled()

    // CUS00009 (Sri Ramana Ashram Book & Gift Stall) has zero balance and no open orders in seed data.
    await page.getByRole('row', { name: /CUS00009/ }).click()
    await page.getByRole('button', { name: 'Delete customer' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Delete customer' }).click()
    await expect(page.getByText('Showing 1–15 of 15 customers')).toBeVisible()

    await page.getByRole('button', { name: 'Undo' }).click()
    await expect(page.getByText('Showing 1–16 of 16 customers')).toBeVisible()
  })

  test('opens customer profile route on row double-click', async ({ page }) => {
    await page.getByRole('row', { name: /CUS00002/ }).dblclick()
    await expect(page).toHaveURL(/\/sales\/customers\/CUS00002$/)
    await expect(page.getByRole('heading', { name: 'Girivalam Path Handicrafts', level: 1 })).toBeVisible()
  })
})

test('the customer preview shows its notes thread', async ({ page }) => {
  await page.goto('/sales/customers')
  await page.getByRole('row', { name: /CUS00001/ }).click()
  const drawer = page.getByRole('complementary', { name: 'Customer CUS00001' })
  await expect(drawer).toContainText('NOTES')
  await expect(drawer).toContainText('Karthigai Deepam display box quote')
})
