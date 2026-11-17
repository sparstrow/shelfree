import { expect, test } from '@playwright/test'

test.describe('Chart of accounts (editable drawer)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/finance/chart-of-accounts')
    await expect(page.getByText('Showing 1–10 of 10 accounts')).toBeVisible()
  })

  test('views a system account; locked fields stay text and cannot be deleted', async ({ page }) => {
    await page.getByRole('row', { name: /1300/ }).click()
    const drawer = page.getByRole('complementary', { name: 'Account 1300' })
    await expect(drawer).toContainText('Inventory')
    await expect(drawer).toContainText('System account')
    await expect(drawer.getByRole('button', { name: 'Delete account' })).toBeDisabled()

    // Same rows in edit mode; only name and description are editable.
    await page.keyboard.press('e')
    const edit = page.getByRole('complementary', { name: 'Edit account' })
    await expect(edit.getByLabel('Account name', { exact: true })).toBeEditable()
    await expect(edit.getByLabel('Description', { exact: true })).toBeEditable()
    await expect(edit.getByLabel('Code', { exact: true })).toHaveCount(0)
    await expect(edit.getByLabel('Type', { exact: true })).toHaveCount(0)
    await expect(edit.getByLabel('Group', { exact: true })).toHaveCount(0)
    await page.keyboard.press('Escape')
    await expect(page.getByRole('complementary', { name: 'Account 1300' })).toBeVisible()
  })

  test('creates an account with validation, then edits, duplicates and deletes it', async ({ page }) => {
    await page.getByRole('button', { name: 'New account' }).click()
    const drawer = page.getByRole('complementary', { name: 'New account' })

    // Next free code is proposed for Expense / Indirect expenses (6010), and tracks type/group changes.
    await expect(drawer.getByLabel('Code', { exact: true })).toHaveValue('6010')
    await drawer.getByLabel('Type', { exact: true }).selectOption('Asset')
    await expect(drawer.getByLabel('Code', { exact: true })).toHaveValue('1010')
    await drawer.getByLabel('Type', { exact: true }).selectOption('Expense')
    await expect(drawer.getByLabel('Code', { exact: true })).toHaveValue('5010')
    await drawer.getByLabel('Group', { exact: true }).selectOption('Indirect expenses')
    await expect(drawer.getByLabel('Code', { exact: true })).toHaveValue('6010')

    // Validation errors first.
    await drawer.getByLabel('Code', { exact: true }).fill('9999')
    await drawer.getByRole('button', { name: 'Create account' }).click()
    await expect(drawer).toContainText('Fix the highlighted fields to save.')
    await expect(drawer).toContainText('Expense codes start with 5 or 6.')
    await expect(drawer).toContainText('Enter an account name.')

    // Valid create.
    await drawer.getByLabel('Code', { exact: true }).fill('6010')
    await drawer.getByLabel('Account name', { exact: true }).fill('Office stationery')
    await drawer.getByLabel('Description', { exact: true }).fill('Pens, paper and printer supplies.')
    await page.keyboard.press('Control+s')
    await expect(page.getByText('Showing 1–11 of 11 accounts')).toBeVisible()
    await expect(page.getByRole('complementary', { name: 'Account 6010' })).toContainText('Office stationery')

    // Edit.
    await page.getByRole('button', { name: 'Edit' }).click()
    const edit = page.getByRole('complementary', { name: 'Edit account' })
    await edit.getByLabel('Account name', { exact: true }).fill('Office stationery & supplies')
    await edit.getByRole('button', { name: 'Save changes' }).click()
    await expect(page.getByRole('complementary', { name: 'Account 6010' })).toContainText('Office stationery & supplies')

    // Duplicate proposes the next free code.
    await page.getByRole('button', { name: 'Duplicate' }).click()
    const dupe = page.getByRole('complementary', { name: 'New account' })
    await expect(dupe.getByLabel('Code', { exact: true })).toHaveValue('6020')
    await expect(dupe.getByLabel('Account name', { exact: true })).toHaveValue('Office stationery & supplies (copy)')
    await page.keyboard.press('Escape')

    // Delete.
    await page.getByRole('row', { name: /6010/ }).click()
    await page.getByRole('button', { name: 'Delete account' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Delete account' }).click()
    await expect(page.getByText('Showing 1–10 of 10 accounts')).toBeVisible()
  })

  test('an account used by a charge shows the link and cannot be deleted', async ({ page }) => {
    // Seeded charge FRT-IN posts to 5110 (system account, also linked to FRT-IN).
    await page.getByRole('row', { name: /5110/ }).click()
    const seededDrawer = page.getByRole('complementary', { name: 'Account 5110' })
    await expect(seededDrawer).toContainText('FRT-IN')
    await expect(seededDrawer.getByRole('button', { name: 'Delete account' })).toBeDisabled()

    // Custom account linked to a charge cannot be deleted or deactivated either.
    await page.getByRole('button', { name: 'New account' }).click()
    const newAccount = page.getByRole('complementary', { name: 'New account' })
    await newAccount.getByLabel('Account name', { exact: true }).fill('Transit cover expense')
    await newAccount.getByRole('button', { name: 'Create account' }).click()
    await expect(page.getByText('Showing 1–11 of 11 accounts')).toBeVisible()

    await page.goto('/purchasing/charges')
    await page.getByRole('row', { name: /INS/ }).click()
    await page.getByRole('button', { name: 'Edit' }).click()
    const editCharge = page.getByRole('complementary', { name: 'Edit charge' })
    await editCharge.getByLabel('Purchase account', { exact: true }).selectOption('6010')
    await editCharge.getByRole('button', { name: 'Save changes' }).click()
    await expect(page.getByRole('complementary', { name: 'Charge INS' })).toContainText('6010 · Transit cover expense')

    await page.goto('/finance/chart-of-accounts')
    await page.getByRole('row', { name: /6010/ }).click()
    const linkedDrawer = page.getByRole('complementary', { name: 'Account 6010' })
    await expect(linkedDrawer).toContainText('INS')
    const deleteBtn = linkedDrawer.getByRole('button', { name: 'Delete account' })
    await expect(deleteBtn).toBeDisabled()
    await expect(deleteBtn).toHaveAttribute('title', 'Used by charge INS — point it at another account first.')

    await page.getByRole('button', { name: 'Edit' }).click()
    const editLinked = page.getByRole('complementary', { name: 'Edit account' })
    await editLinked.getByLabel('Status', { exact: true }).click()
    await editLinked.getByRole('button', { name: 'Save changes' }).click()
    await expect(editLinked).toContainText('Used by active charge INS — point it at another account first.')
  })

  test('N opens a new account from the keyboard', async ({ page }) => {
    await page.getByRole('grid').click()
    await page.keyboard.press('n')
    await expect(page.getByRole('complementary', { name: 'New account' })).toBeVisible()
  })
})
