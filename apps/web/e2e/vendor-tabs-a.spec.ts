import { expect, test } from '@playwright/test'

test.describe('Vendor profile — Address & payment, Payables & blocking, Notes & activity, Documents', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/purchasing/vendors')
    await expect(page.getByRole('grid')).toBeVisible()
    await page.getByRole('row', { name: /V00001/ }).dblclick()
    await expect(page).toHaveURL(/\/purchasing\/vendors\/V00001$/)
    await expect(page.getByRole('heading', { name: 'Kailash Ceramics Works', level: 1 })).toBeVisible()
  })

  test('opens each of the four tabs by click and by number key', async ({ page }) => {
    await page.getByRole('tab', { name: 'Address & payment' }).click()
    await expect(page).toHaveURL(/\?tab=details$/)
    await expect(page.getByRole('tab', { name: 'Address & payment' })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('region', { name: 'Address & payment' })).toContainText('14 Kiln Street, Sathuvachari')

    await page.getByRole('tab', { name: 'Payables & blocking' }).click()
    await expect(page).toHaveURL(/\?tab=payables$/)
    await expect(page.getByRole('tab', { name: 'Payables & blocking' })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('region', { name: 'Payables' })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Blocking' })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Purchase budget' })).toBeVisible()

    await page.getByRole('tab', { name: 'Notes & activity' }).click()
    await expect(page).toHaveURL(/\?tab=notes$/)
    await expect(page.getByRole('tab', { name: 'Notes & activity' })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('region', { name: 'Notes' })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Activity' })).toBeVisible()

    await page.getByRole('tab', { name: 'Documents' }).click()
    await expect(page).toHaveURL(/\?tab=docs$/)
    await expect(page.getByRole('tab', { name: 'Documents' })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('tabpanel')).toContainText('No documents attached')

    await page.keyboard.press('2')
    await expect(page).toHaveURL(/\?tab=details$/)
    await expect(page.getByRole('tab', { name: 'Address & payment' })).toHaveAttribute('aria-selected', 'true')

    await page.keyboard.press('6')
    await expect(page).toHaveURL(/\?tab=payables$/)
    await expect(page.getByRole('tab', { name: 'Payables & blocking' })).toHaveAttribute('aria-selected', 'true')

    await page.keyboard.press('8')
    await expect(page).toHaveURL(/\?tab=notes$/)
    await expect(page.getByRole('tab', { name: 'Notes & activity' })).toHaveAttribute('aria-selected', 'true')

    await page.keyboard.press('9')
    await expect(page).toHaveURL(/\?tab=docs$/)
    await expect(page.getByRole('tab', { name: 'Documents' })).toHaveAttribute('aria-selected', 'true')
  })

  test('Address & payment edits in place, validates PIN code, and persists across reload', async ({ page }) => {
    await page.keyboard.press('2')
    await expect(page).toHaveURL(/\?tab=details$/)

    const addrRow = page.locator('[data-field="addr1"]')
    const viewText = addrRow.getByText('14 Kiln Street, Sathuvachari')
    const before = await viewText.boundingBox()

    await page.keyboard.press('e')
    const addrInput = page.getByLabel('Address line 1', { exact: true })
    await expect(addrInput).toBeVisible()
    const after = await addrInput.boundingBox()
    expect(before).not.toBeNull()
    expect(after).not.toBeNull()
    expect(after?.y).toBe(before?.y)
    expect(after?.x).toBe(before?.x)
    expect(after?.height).toBe(before?.height)

    // Read-only rows stay as text in edit mode.
    await expect(page.locator('[data-field="currency"]')).toContainText('Workspace default')
    await expect(page.locator('[data-field="currency"]').locator('input, select')).toHaveCount(0)
    await expect(page.locator('[data-field="vendorSince"]')).toContainText('Nov 08, 2022')
    await expect(page.locator('[data-field="vendorSince"]').locator('input, select')).toHaveCount(0)

    const pinInput = page.getByLabel('PIN code', { exact: true })
    await pinInput.fill('123')
    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(page.locator('[data-field="zip"]').getByRole('alert')).toContainText('A PIN code has 6 digits.')
    await expect(page).toHaveURL(/\?tab=details$/)
    await expect(page.getByRole('button', { name: 'Save changes' })).toBeVisible()

    await page.getByLabel('Address line 2', { exact: true }).fill('Phase II')
    await page.getByLabel('City', { exact: true }).fill('Ranipet')
    await pinInput.fill('632401')
    await page.keyboard.press('Control+s')

    await expect(page.getByText('Vendor updated')).toBeVisible()
    await expect(addrRow.getByRole('textbox')).toHaveCount(0)
    await expect(page.locator('[data-field="addr2"]')).toContainText('Phase II')
    await expect(page.locator('[data-field="city"]')).toContainText('Ranipet')
    await expect(page.locator('[data-field="zip"]')).toContainText('632401')

    await page.reload()
    await expect(page.getByRole('heading', { name: 'Kailash Ceramics Works', level: 1 })).toBeVisible()
    await expect(page.locator('[data-field="addr2"]')).toContainText('Phase II')
    await expect(page.locator('[data-field="city"]')).toContainText('Ranipet')
    await expect(page.locator('[data-field="zip"]')).toContainText('632401')
  })

  test('blocks and unblocks a vendor on Payables & blocking', async ({ page }) => {
    await page.keyboard.press('6')
    await expect(page).toHaveURL(/\?tab=payables$/)

    const payables = page.getByRole('region', { name: 'Payables' })
    await expect(payables).toContainText('Not yet due')
    await expect(payables).toContainText('Due now')
    await expect(payables).toContainText('Overdue')
    await expect(payables).toContainText('Received, not yet billed')
    await expect(page.getByRole('region', { name: 'Purchase budget' })).toContainText('committed of')

    const header = page.locator('section[data-screen-label="Vendor"]')
    await page.getByRole('radio', { name: /Block all transactions/i }).click()
    await expect(page.getByText('Vendor blocked')).toBeVisible()
    await expect(header.getByText('Blocked', { exact: true })).toBeVisible()
    await expect(header.getByText('Blocked · all', { exact: true })).toBeVisible()
    await expect(page.getByRole('radio', { name: /Block all transactions/i })).toHaveAttribute('aria-checked', 'true')

    await page.reload()
    await expect(header.getByText('Blocked', { exact: true })).toBeVisible()
    await expect(header.getByText('Blocked · all', { exact: true })).toBeVisible()
    await expect(page.getByRole('radio', { name: /Block all transactions/i })).toHaveAttribute('aria-checked', 'true')

    await page.getByRole('radio', { name: /Block payments/i }).click()
    await expect(page.getByText('V00001 · orders and receipts still allowed')).toBeVisible()
    await expect(header.getByText('Payments blocked', { exact: true })).toBeVisible()
    await expect(page.getByRole('radio', { name: /Block payments/i })).toHaveAttribute('aria-checked', 'true')

    await page.getByRole('radio', { name: /Not blocked/i }).click()
    await expect(page.getByText('Vendor unblocked')).toBeVisible()
    await expect(header.getByText('Active', { exact: true })).toBeVisible()
    await expect(page.getByRole('radio', { name: /Not blocked/i })).toHaveAttribute('aria-checked', 'true')
  })

  test('adds a note on Notes & activity and persists it across reload', async ({ page }) => {
    await page.keyboard.press('8')
    await expect(page).toHaveURL(/\?tab=notes$/)

    const notes = page.getByRole('region', { name: 'Notes' })
    await expect(notes).toContainText('Glaze consistency on Charcoal Black')
    await expect(page.getByRole('region', { name: 'Activity' })).toContainText('Vendor added')

    await page.getByLabel('New note', { exact: true }).fill('Confirmed kiln batch schedule for Pournami.')
    await page.getByRole('button', { name: 'Add note', exact: true }).click()

    await expect(page.getByText('Note added to V00001')).toBeVisible()
    await expect(notes).toContainText('Confirmed kiln batch schedule for Pournami.')

    await page.reload()
    await expect(notes).toContainText('Confirmed kiln batch schedule for Pournami.')
  })
})
