import { expect, test } from '@playwright/test'

test.describe('Production ▸ Bills of Materials list', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/production/bills-of-materials')
    await expect(page.getByRole('grid')).toBeVisible()
  })

  test('lists seeded BOMs, filters by view, and shows components and notes in preview', async ({ page }) => {
    await expect(page.getByText('Showing 1–9 of 9 bills of materials')).toBeVisible()

    await expect(page.getByRole('menu')).toHaveCount(0)
    await page.getByTitle('Saved views').click()
    await page.getByRole('menuitem', { name: 'Active' }).click()
    await expect(page.getByText('Showing 1–7 of 7 bills of materials')).toBeVisible()

    await expect(page.getByRole('menu')).toHaveCount(0)
    await page.getByTitle('Saved views').click()
    await page.getByRole('menuitem', { name: 'Drafts' }).click()
    await expect(page.getByRole('row', { name: /BOM00008/ })).toBeVisible()
    await expect(page.getByRole('row', { name: /BOM00001/ })).toHaveCount(0)

    await expect(page.getByRole('menu')).toHaveCount(0)
    await page.getByTitle('Saved views').click()
    await page.getByRole('menuitem', { name: 'All' }).click()

    await page.getByRole('row', { name: /BOM00001/ }).click()
    const drawer = page.getByRole('complementary', { name: 'Bill of materials BOM00001' })
    await expect(drawer).toContainText('COMPONENTS')
    await expect(drawer).toContainText('RM-LID-PWH')
    await expect(drawer).toContainText('DETAILS')
    await expect(drawer).toContainText('NOTES')
    await expect(drawer).toContainText('15-minute cure wait')
  })

  test('blocks deleting active or referenced BOMs and allows deleting + undoing unused drafts', async ({ page }) => {
    await page.getByRole('row', { name: /BOM00001/ }).click()
    await expect(page.getByRole('button', { name: 'Delete bill of materials' })).toBeDisabled()

    await page.getByRole('row', { name: /BOM00008/ }).click()
    await page.getByRole('button', { name: 'Delete bill of materials' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Delete bill of materials' }).click()
    await expect(page.getByText('Showing 1–8 of 8 bills of materials')).toBeVisible()

    await page.getByRole('button', { name: 'Undo' }).click()
    await expect(page.getByText('Showing 1–9 of 9 bills of materials')).toBeVisible()
  })

  test('opens BOM document route on row double-click', async ({ page }) => {
    await page.getByRole('row', { name: /BOM00001/ }).dblclick()
    await expect(page).toHaveURL(/\/production\/bills-of-materials\/BOM00001$/)
    await expect(page.getByText('Bill of materials BOM00001')).toBeVisible()
  })
})

test.describe('Production ▸ Assembly Orders list', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/production/assembly-orders')
    await expect(page.getByRole('grid')).toBeVisible()
  })

  test('lists seeded orders, filters by view, and shows shortages, components, and notes in preview', async ({
    page,
  }) => {
    await expect(page.getByText('Showing 1–6 of 6 assembly orders')).toBeVisible()

    await expect(page.getByRole('menu')).toHaveCount(0)
    await page.getByTitle('Saved views').click()
    await page.getByRole('menuitem', { name: 'Open' }).click()
    await expect(page.getByText('Showing 1–4 of 4 assembly orders')).toBeVisible()
    await expect(page.getByRole('row', { name: /AO00004/ })).toHaveCount(0)

    await page.getByRole('row', { name: /AO00001/ }).click()
    const drawer = page.getByRole('complementary', { name: 'Assembly order AO00001' })
    await expect(drawer.getByRole('status')).toContainText('Short ')
    await expect(drawer).toContainText('COMPONENTS')
    await expect(drawer).toContainText('ASH-PWH-18')
    await expect(drawer).toContainText('DETAILS')
    await expect(drawer).toContainText('NOTES')
    await expect(drawer).toContainText('Short two base trays')
  })

  test('blocks deleting released orders and allows deleting + undoing draft orders', async ({ page }) => {
    await page.getByRole('row', { name: /AO00001/ }).click()
    await expect(page.getByRole('button', { name: 'Delete assembly order' })).toBeDisabled()

    await page.getByRole('row', { name: /AO00003/ }).click()
    await page.getByRole('button', { name: 'Delete assembly order' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Delete assembly order' }).click()
    await expect(page.getByText('Showing 1–5 of 5 assembly orders')).toBeVisible()

    await page.getByRole('button', { name: 'Undo' }).click()
    await expect(page.getByText('Showing 1–6 of 6 assembly orders')).toBeVisible()
  })

  test('opens assembly order document route on row double-click', async ({ page }) => {
    await page.getByRole('row', { name: /AO00001/ }).dblclick()
    await expect(page).toHaveURL(/\/production\/assembly-orders\/AO00001$/)
    await expect(page.getByText('Assembly order AO00001')).toBeVisible()
  })
})
