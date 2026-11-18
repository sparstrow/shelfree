import { expect, test } from '@playwright/test'

test.describe('Vendor profile', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/purchasing/vendors')
    await expect(page.getByRole('grid')).toBeVisible()
    await page.getByRole('row', { name: /V00001/ }).dblclick()
    await expect(page).toHaveURL(/\/purchasing\/vendors\/V00001$/)
    // Shortcuts are live once the profile has loaded.
    await expect(page.getByRole('heading', { name: 'Kailash Ceramics Works', level: 1 })).toBeVisible()
  })

  test('opens on Overview with the vendor in the header', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Kailash Ceramics Works', level: 1 })).toBeVisible()
    const header = page.locator('section[data-screen-label="Vendor"]')
    await expect(header.getByText('V00001', { exact: true })).toBeVisible()
    await expect(header.getByText('Active', { exact: true })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('tablist', { name: 'Vendor sections' }).getByRole('tab')).toHaveCount(10)
    await expect(page.getByRole('region', { name: 'Details' })).toContainText('Ceramic Manufacturing')
    await expect(page.getByRole('region', { name: 'Tax' })).toContainText('Registered — regular')
    // Subcontractor vendors show the badge.
    await expect(page.getByText('Subcontractor', { exact: true }).first()).toBeVisible()
  })

  test('] and [ move between tabs and keep the URL in step', async ({ page }) => {
    await page.keyboard.press(']')
    await expect(page).toHaveURL(/\?tab=details$/)
    await expect(page.getByRole('tab', { name: 'Address & payment' })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'rp-tab-details')

    await page.keyboard.press('3')
    await expect(page).toHaveURL(/\?tab=items$/)

    await page.keyboard.press('[')
    await expect(page).toHaveURL(/\?tab=details$/)

    await page.keyboard.press('1')
    await expect(page).toHaveURL(/\/purchasing\/vendors\/V00001$/)
    await expect(page.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true')
  })

  test('E edits in place: nothing moves', async ({ page }) => {
    const row = page.locator('[data-field="category"]')
    const view = row.getByText('Ceramic Manufacturing')
    const before = await view.boundingBox()
    const editButton = page.getByRole('button', { name: 'Edit' })
    const headerBefore = await page.getByRole('heading', { name: 'Kailash Ceramics Works', level: 1 }).boundingBox()
    const buttonBefore = await editButton.boundingBox()

    await page.keyboard.press('e')
    const input = row.getByRole('textbox')
    await expect(input).toBeVisible()
    const after = await input.boundingBox()
    expect(before).not.toBeNull()
    expect(after).not.toBeNull()
    expect(after?.y).toBe(before?.y)
    expect(after?.x).toBe(before?.x)
    expect(after?.height).toBe(before?.height)

    // The header keeps its size too: the Edit group stays in its cell, Save sits in the same cell.
    const headerAfter = await page.getByRole('textbox', { name: 'Vendor name' }).boundingBox()
    expect(headerAfter?.y).toBe(headerBefore?.y)
    const saveButton = await page.getByRole('button', { name: 'Save changes' }).boundingBox()
    expect(saveButton?.y).toBe(buttonBefore?.y)
    // Read-only rows stay as text.
    await expect(page.locator('[data-field="vendorSince"]')).toContainText('Nov 08, 2022')

    await page.keyboard.press('Escape')
    await expect(row.getByRole('textbox')).toHaveCount(0)
    expect((await view.boundingBox())?.y).toBe(before?.y)
  })

  test('a validation error blocks the save; a valid change saves and persists', async ({ page }) => {
    await page.keyboard.press('e')
    const name = page.getByRole('textbox', { name: 'Vendor name' })
    await name.fill('')
    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(page.getByRole('alert').filter({ hasText: 'Vendor name is required.' })).toBeVisible()
    await expect(page.getByText('Fix the highlighted field to save.')).toBeVisible()
    // Still editing.
    await expect(page.getByRole('button', { name: 'Save changes' })).toBeVisible()

    await name.fill('Kailash Ceramics Works Pvt Ltd')
    await page.locator('[data-field="category"]').getByRole('textbox').fill('Ceramics & Glazing')
    await page.keyboard.press('Control+s')
    await expect(page.getByText('Vendor updated')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Kailash Ceramics Works Pvt Ltd', level: 1 })).toBeVisible()
    await expect(page.locator('[data-field="category"]')).toContainText('Ceramics & Glazing')
    await expect(page.locator('[data-field="category"]').getByRole('textbox')).toHaveCount(0)

    await page.reload()
    await expect(page.getByRole('heading', { name: 'Kailash Ceramics Works Pvt Ltd', level: 1 })).toBeVisible()
    await expect(page.locator('[data-field="category"]')).toContainText('Ceramics & Glazing')
  })

  test('an invalid GSTIN is reported under its row', async ({ page }) => {
    await page.keyboard.press('e')
    await page.locator('[data-field="gstin"]').getByRole('textbox').fill('123')
    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(page.locator('[data-field="gstin"]').getByRole('alert')).toContainText('15 characters')
  })

  test('Esc goes back to the list with the row selected', async ({ page }) => {
    await page.keyboard.press('Escape')
    await expect(page).toHaveURL(/\/purchasing\/vendors\?sel=V00001$/)
    await expect(page.getByRole('complementary', { name: 'Vendor V00001' })).toBeVisible()
  })
})
