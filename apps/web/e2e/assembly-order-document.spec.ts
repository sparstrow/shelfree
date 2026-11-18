import { expect, test } from '@playwright/test'

test.describe('Production ▸ Assembly Order document', () => {
  test('opens an existing order from the list and renders BOM lines and shortage warning', async ({ page }) => {
    await page.goto('/production/assembly-orders')
    await expect(page.getByRole('grid')).toBeVisible()

    await page.getByRole('row', { name: /AO00001/ }).click()
    await page.getByRole('button', { name: 'Open order', exact: true }).click()

    await expect(page).toHaveURL(/\/production\/assembly-orders\/AO00001$/)
    await expect(page.getByRole('heading', { name: 'Assembly order' })).toBeVisible()
    await expect(page.getByText('AO00001', { exact: true }).filter({ visible: true }).first()).toBeVisible()
    await expect(page.getByText('Released', { exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: /BOM00004 · v1/ })).toBeVisible()
    await expect(page.getByText(/Short 15\.4 .* you can build 24 of 40\./)).toBeVisible()
    await expect(page.getByRole('link', { name: /ASH-PWH-18/ })).toBeVisible()
  })

  test('finished orders are completely read-only and expose Reopen to admins', async ({ page }) => {
    await page.goto('/production/assembly-orders/AO00004')
    await expect(page.getByRole('heading', { name: 'Assembly order' })).toBeVisible()
    await expect(page.getByText('Finished — this order is a closed record.')).toBeVisible()
    await expect(page.getByLabel('Output location', { exact: true })).toBeDisabled()
    await expect(page.getByLabel('Due date', { exact: true })).toBeDisabled()
    await expect(page.getByLabel('Assignee', { exact: true })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Save', exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Reopen', exact: true })).toBeVisible()
  })

  test('creates an order from the active BOM, rescales lines, releases -> starts -> finishes, and updates item stock', async ({
    page,
  }) => {
    await page.goto('/production/assembly-orders')
    await page.getByRole('button', { name: 'New assembly order', exact: true }).click()

    await expect(page).toHaveURL(/\/production\/assembly-orders\/new$/)
    await expect(page.getByRole('heading', { name: 'New assembly order' })).toBeVisible()
    await expect(page.getByText('Draft', { exact: true })).toBeVisible()

    // Pick ASH-PWH-18 -> populates lines from active BOM00001 (v2)
    await page.getByLabel('Item to assemble', { exact: true }).click()
    const picker = page.getByRole('dialog', { name: 'What are you building?' })
    await expect(picker).toBeVisible()
    await picker.getByLabel('Search assembled items', { exact: true }).fill('ASH-PWH-18')
    await picker.getByRole('button', { name: /ASH-PWH-18/ }).click()

    await expect(page.getByRole('link', { name: /BOM00001 · v2/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /RM-LID-PWH/ })).toBeVisible()
    await expect(page.getByText('1.03', { exact: true }).first()).toBeVisible()

    // Change quantity to 10 -> BOM lines rescale cleanly
    await page.getByLabel('Quantity', { exact: true }).fill('10')
    await expect(page.getByText('10.3', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('0.05', { exact: true })).toBeVisible()

    // Release -> Start -> Finish
    await page.getByRole('button', { name: 'Release', exact: true }).click()
    await expect(page).toHaveURL(/\/production\/assembly-orders\/AO00007$/)
    await expect(page.getByText('Released', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Start', exact: true }).click()
    await expect(page.getByText('In progress', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Finish', exact: true }).click()
    const finishDlg = page.getByRole('dialog', { name: 'Finish assembly order' })
    await expect(finishDlg).toBeVisible()
    await expect(finishDlg.getByLabel('Quantity finished', { exact: true })).toHaveValue('10')
    await expect(finishDlg).toContainText('COMPONENTS CONSUMED')
    await expect(finishDlg).toContainText('10.3 NOS')

    await finishDlg.getByRole('button', { name: 'Post output', exact: true }).click()
    await expect(finishDlg).toHaveCount(0)
    await expect(page.getByText('Finished', { exact: true })).toBeVisible()
    await expect(page.getByText('10 / 10', { exact: true })).toBeVisible()
    await expect(page.getByText('Finished — this order is a closed record.')).toBeVisible()

    // Verify Items list reflects +10 on ASH-PWH-18 (93 -> 103) and -10.3 on RM-LID-PWH (272 -> 261.7)
    await page.goto('/warehouse/items')
    await expect(page.getByRole('grid')).toBeVisible()
    const outputRow = page.getByRole('row', { name: /ASH-PWH-18/ })
    await expect(outputRow.getByText('103', { exact: true })).toBeVisible()
    const lidRow = page.getByRole('row', { name: /RM-LID-PWH/ })
    await expect(lidRow.getByText('261.7', { exact: true }).first()).toBeVisible()
  })

  test('blocks finish on a seeded order with a component shortage', async ({ page }) => {
    // AO00005 requires 25.25 x ASH-BLK-18 at WH-TVM (22 on hand, 24 committed -> 0 net available)
    await page.goto('/production/assembly-orders/AO00005')
    await expect(page.getByText('Released', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Start', exact: true }).click()
    await expect(page.getByText('In progress', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Finish', exact: true }).click()
    const finishDlg = page.getByRole('dialog', { name: 'Finish assembly order' })
    await expect(finishDlg).toBeVisible()

    await finishDlg.getByRole('button', { name: 'Post output', exact: true }).click()
    await expect(finishDlg.getByRole('alert')).toContainText('Short')
    await expect(finishDlg.getByRole('alert')).toContainText('ASH-BLK-18')

    await finishDlg.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(page.getByText('In progress', { exact: true })).toBeVisible()
    await expect(page.getByText('0 / 25', { exact: true })).toBeVisible()
  })
})
