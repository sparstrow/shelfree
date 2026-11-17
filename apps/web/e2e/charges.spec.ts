import { expect, test } from '@playwright/test'

test.describe('Charges (editable drawer)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/purchasing/charges')
    await expect(page.getByText('Showing 1–4 of 4 charges')).toBeVisible()
  })

  test('views a charge; a system charge is locked and cannot be deleted', async ({ page }) => {
    await page.getByRole('row', { name: /FRT-IN/ }).click()
    const drawer = page.getByRole('complementary', { name: 'Charge FRT-IN' })
    await expect(drawer).toContainText('Freight inward')
    await expect(drawer).toContainText('System charge')
    await expect(drawer.getByRole('button', { name: 'Delete charge' })).toBeDisabled()

    // Same rows in edit mode; locked fields stay as text.
    await page.keyboard.press('e')
    const edit = page.getByRole('complementary', { name: 'Edit charge' })
    await expect(edit.getByLabel('Description', { exact: true })).toBeEditable()
    await expect(edit.getByLabel('Code', { exact: true })).toHaveCount(0)
    await page.keyboard.press('Escape')
    await expect(page.getByRole('complementary', { name: 'Charge FRT-IN' })).toBeVisible()
  })

  test('creates a charge with validation, then edits, duplicates and deletes it', async ({ page }) => {
    await page.getByRole('button', { name: 'New charge' }).click()
    const drawer = page.getByRole('complementary', { name: 'New charge' })
    await drawer.getByRole('button', { name: 'Create charge' }).click()
    await expect(drawer).toContainText('Fix the highlighted fields to save.')
    await expect(drawer).toContainText('Use 2–12 letters, digits or hyphens.')

    await drawer.getByLabel('Code', { exact: true }).fill('crate')
    await drawer.getByLabel('Description', { exact: true }).fill('Wooden crate for kiln loads')
    await drawer.getByLabel('HSN/SAC', { exact: true }).fill('998540')
    await page.keyboard.press('Control+s')
    await expect(page.getByText('Showing 1–5 of 5 charges')).toBeVisible()
    await expect(page.getByRole('complementary', { name: 'Charge CRATE' })).toContainText('Wooden crate for kiln loads')

    await page.getByRole('button', { name: 'Edit' }).click()
    await page.getByRole('complementary', { name: 'Edit charge' }).getByLabel('Direction', { exact: true }).selectOption('Sales')
    await expect(page.getByRole('complementary', { name: 'Edit charge' }).getByLabel('Purchase account', { exact: true })).toHaveCount(0)
    await page.getByRole('button', { name: 'Cancel' }).click()

    await page.getByRole('button', { name: 'Duplicate' }).click()
    await expect(page.getByRole('complementary', { name: 'New charge' }).getByLabel('Code', { exact: true })).toHaveValue('CRATE-2')
    await page.keyboard.press('Escape')

    await page.getByRole('row', { name: /CRATE/ }).click()
    await page.getByRole('button', { name: 'Delete charge' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Delete charge' }).click()
    await expect(page.getByText('Showing 1–4 of 4 charges')).toBeVisible()
  })

  test('N opens a new charge from the keyboard', async ({ page }) => {
    await page.getByRole('grid').click()
    await page.keyboard.press('n')
    await expect(page.getByRole('complementary', { name: 'New charge' })).toBeVisible()
  })
})
