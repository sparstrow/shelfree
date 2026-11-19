import { expect, test } from '@playwright/test'

test.describe('Notes page', () => {
  test('lists all seeded notes, filters by status/record/search, and opens a record', async ({ page }) => {
    await page.goto('/notes')
    await expect(page.getByRole('grid')).toBeVisible()
    await expect(page.getByText('Showing 1–20 of 42 notes')).toBeVisible()

    // Status view filter: Valid vs Invalid.
    await page.getByRole('button', { name: 'All notes' }).click()
    await page.getByRole('menuitem', { name: 'Invalid notes' }).click()
    await expect(page.getByText('Showing 1–1 of 1 note')).toBeVisible()
    await page.getByRole('row', { name: /PO00001/ }).click()
    const invalidDrawer = page.getByRole('complementary', { name: /Note NOTE-/ })
    await expect(invalidDrawer).toContainText('Invalidated by Bhuvaneswari Iyer')
    await expect(invalidDrawer).toContainText('only 120 of 750 units')

    await page.getByRole('button', { name: 'Invalid notes' }).click()
    await page.getByRole('menuitem', { name: 'All notes' }).click()
    await expect(page.getByText('Showing 1–20 of 42 notes')).toBeVisible()

    // Filter by Record type in the Filters side panel.
    await page.getByRole('button', { name: /^Add filter/ }).click()
    const record = page.getByRole('complementary', { name: 'Filters' }).getByRole('region', { name: 'Record', exact: true })
    await record.getByRole('button', { name: /^Record/ }).click()
    await record.getByLabel('Vendor', { exact: true }).click()
    await page.keyboard.press('Escape')
    await expect(page.getByText('Showing 1–3 of 3 notes')).toBeVisible()
    await page.getByRole('button', { name: 'Clear all' }).click()
    await expect(page.getByText('Showing 1–20 of 42 notes')).toBeVisible()

    // Search and open the linked record.
    await page.keyboard.press('/')
    await page.keyboard.type('Glaze consistency')
    await expect(page.getByText('Showing 1–1 of 1 note')).toBeVisible()
    await page.getByRole('row', { name: /V00001/ }).dblclick()
    await expect(page).toHaveURL(/\/purchasing\/vendors\/V00001$/)
    await expect(page.getByRole('heading', { name: 'Kailash Ceramics Works', level: 1 })).toBeVisible()
  })

  test('also serves the sidebar module URL /notes/notes', async ({ page }) => {
    await page.goto('/notes/notes')
    await expect(page.getByRole('grid')).toBeVisible()
    await expect(page.getByText('Showing 1–20 of 42 notes')).toBeVisible()
  })
})

test.describe('Departments page', () => {
  test('renders module groups, type-to-filter narrows blocks, arrow + Enter opens a page', async ({ page }) => {
    await page.goto('/departments')
    await expect(page.getByRole('heading', { name: 'Departments', level: 1 })).toBeVisible()

    for (const name of ['Home', 'Finance', 'Sales', 'Purchasing', 'Warehouse', 'Production', 'People', 'Notes']) {
      await expect(page.getByRole('region', { name, exact: true })).toBeVisible()
    }
    await expect(page.getByRole('region', { name: 'Purchasing', exact: true })).toContainText('Setup')
    await expect(page.getByRole('region', { name: 'Home', exact: true })).toContainText('Coming soon')

    // Type anywhere to filter.
    await page.keyboard.type('purchase')
    await expect(page.getByLabel('Filter pages', { exact: true })).toHaveValue('purchase')
    await expect(page.getByText('5 pages in 1 department')).toBeVisible()
    await expect(page.getByRole('region', { name: 'Home', exact: true })).toHaveCount(0)

    // Arrow down to Purchase Lines and Enter to open it.
    await page.keyboard.press('ArrowDown')
    await expect(page.getByRole('button', { name: 'Purchase Lines', exact: true })).toHaveAttribute('data-focused', 'true')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/purchasing\/purchase-lines$/)
    await expect(page.getByRole('grid')).toBeVisible()

    // Returning to Departments shows Purchase Lines under Jump back in.
    await page.goto('/departments')
    await expect(page.getByText('Jump back in')).toBeVisible()
    await expect(page.getByRole('button', { name: /Purchase Lines/ }).first()).toBeVisible()
  })
})

test.describe('Vendor purchase items page', () => {
  test('opens from vendor Items supplied, lists V00001 prices, adds and removes one, returns to vendor', async ({
    page,
  }) => {
    await page.goto('/purchasing/vendors/V00001?tab=items')
    await expect(page.getByRole('heading', { name: 'Kailash Ceramics Works', level: 1 })).toBeVisible()
    await page.getByRole('button', { name: 'Manage prices', exact: true }).click()
    await expect(page).toHaveURL(/\/purchasing\/vendors\/V00001\/items$/)

    await expect(
      page.getByRole('heading', { name: 'Purchase prices — Kailash Ceramics Works', level: 1 }),
    ).toBeVisible()
    await expect(page.getByText('5 prices', { exact: true })).toBeVisible()
    await expect(page.getByRole('row', { name: /RM-BASE-STD/ })).toContainText('₹41.00')
    await expect(page.getByRole('row', { name: /RM-LID-PWH/ })).toContainText('₹62.00')

    // Add a new item price inline.
    await page.getByRole('button', { name: 'Add price', exact: true }).click()
    const itemSearch = page.getByLabel('Search items by no. or description', { exact: true })
    await itemSearch.fill('SBC-ASHTRAY')
    await page.getByRole('option', { name: /SBC-ASHTRAY/ }).click()
    const priceInput = page.getByLabel('Price', { exact: true })
    await priceInput.fill('29.5')
    await priceInput.press('Enter')

    await expect(page.getByText('6 prices', { exact: true })).toBeVisible()
    const addedRow = page.getByRole('row', { name: /SBC-ASHTRAY/ })
    await expect(addedRow).toContainText('₹29.50')
    await expect(addedRow).toContainText('Active')

    // Reload to verify persistence.
    await page.reload()
    await expect(page.getByText('6 prices', { exact: true })).toBeVisible()
    await expect(page.getByRole('row', { name: /SBC-ASHTRAY/ })).toBeVisible()

    // Remove the added row.
    await page
      .getByRole('row', { name: /SBC-ASHTRAY/ })
      .getByRole('button', { name: 'Remove this price', exact: true })
      .click()
    await expect(page.getByText('5 prices', { exact: true })).toBeVisible()
    await expect(page.getByRole('row', { name: /SBC-ASHTRAY/ })).toHaveCount(0)

    // Back to the vendor profile.
    await page.getByRole('button', { name: 'Back to vendor', exact: true }).click()
    await expect(page).toHaveURL(/\/purchasing\/vendors\/V00001$/)
    await expect(page.getByRole('heading', { name: 'Kailash Ceramics Works', level: 1 })).toBeVisible()
  })
})
