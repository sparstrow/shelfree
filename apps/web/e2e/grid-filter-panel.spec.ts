import { expect, test } from '@playwright/test'

test.describe('Grid filter side panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/warehouse/items')
    await expect(page.getByRole('grid')).toBeVisible()
    await expect(page.getByText('Showing 1–20 of 22 items')).toBeVisible()
  })

  test('filters via enum checkboxes, number range, section search, clear actions, Esc focus return, and dirty view state', async ({
    page,
  }) => {
    const filterButton = page.getByRole('button', { name: /^Add filter(?:\s*\d+)?$/ })

    // Opens side panel from toolbar and closes Columns / Views popovers mutually.
    await page.getByRole('button', { name: 'Columns', exact: true }).click()
    await expect(page.getByText('COLUMNS', { exact: true })).toBeVisible()

    await filterButton.click()
    await expect(page.getByText('COLUMNS', { exact: true })).toBeHidden()
    await expect(filterButton).toHaveAttribute('aria-expanded', 'true')

    const panel = page.getByRole('complementary', { name: 'Filters' })
    await expect(panel).toBeVisible()
    await expect(panel.getByText('Narrow down the list')).toBeVisible()

    // Searching columns narrows the list and shows an empty state for non-matching queries.
    const colSearch = panel.getByLabel('Search filters', { exact: true })
    await colSearch.fill('nomatchxyz')
    await expect(panel.getByText('No filters match “nomatchxyz”.')).toBeVisible()

    await colSearch.fill('Sub-category')
    const subCatSection = panel.getByRole('region', { name: 'Sub-category', exact: true })
    await expect(subCatSection).toBeVisible()
    await expect(panel.getByRole('region', { name: 'Unit price', exact: true })).toBeHidden()

    // Picking two enum values updates the grid, FilterChips, count badges, and view dirty indicator.
    await subCatSection.getByRole('button', { name: /^Sub-category/ }).click()
    await expect(subCatSection).toContainText('Sambrani Holder')
    await subCatSection.getByLabel('Sambrani Holder', { exact: true }).click()
    await subCatSection.getByLabel('Combo Pack', { exact: true }).click()

    await expect(page.getByText('Showing 1–6 of 6 items')).toBeVisible()
    await expect(filterButton).toContainText('1')
    await expect(panel.getByText('1 filter active')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Remove Sub-category filter' })).toBeVisible()
    await expect(page.getByText('Sambrani Holder, Combo Pack')).toBeVisible()
    await expect(page.getByRole('button', { name: /All items/ }).getByLabel('Unsaved changes')).toBeVisible()

    // Setting a numeric "between" range updates the grid and chips live.
    await colSearch.fill('Unit price')
    const priceSection = panel.getByRole('region', { name: 'Unit price', exact: true })
    await priceSection.getByRole('button', { name: /^Unit price/ }).click()
    await priceSection.getByLabel('Unit price condition', { exact: true }).click()
    await page.getByRole('option', { name: 'between', exact: true }).click()
    await priceSection.getByLabel('Unit price from', { exact: true }).fill('350')
    await priceSection.getByLabel('Unit price to', { exact: true }).fill('430')

    await expect(page.getByText('Showing 1–4 of 4 items')).toBeVisible()
    await expect(filterButton).toContainText('2')
    await expect(panel.getByText('2 filters active')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Remove Unit price filter' })).toBeVisible()

    // Closing and reopening starts active filter sections expanded.
    await page.keyboard.press('Escape')
    await expect(panel).toBeHidden()
    await expect(filterButton).toBeFocused()

    await filterButton.click()
    await expect(panel).toBeVisible()
    await panel.getByLabel('Clear filter search').click()
    await expect(
      panel.getByRole('region', { name: 'Sub-category', exact: true }).getByRole('button', { name: /^Sub-category/ }),
    ).toHaveAttribute('aria-expanded', 'true')
    await expect(
      panel.getByRole('region', { name: 'Unit price', exact: true }).getByRole('button', { name: /^Unit price/ }),
    ).toHaveAttribute('aria-expanded', 'true')

    // Clearing one section removes only that column's filter.
    await panel.getByRole('region', { name: 'Sub-category', exact: true }).getByRole('button', { name: 'Clear', exact: true }).click()
    await expect(filterButton).toContainText('1')
    await expect(panel.getByText('1 filter active')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Remove Sub-category filter' })).toBeHidden()
    await expect(page.getByRole('button', { name: 'Remove Unit price filter' })).toBeVisible()

    // Clear all resets filters and restores full dataset count.
    await panel.getByRole('button', { name: 'Clear all', exact: true }).click()
    await expect(page.getByText('Showing 1–20 of 22 items')).toBeVisible()
    await expect(panel.getByText('Narrow down the list')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Remove Unit price filter' })).toBeHidden()

    // Esc closes the panel and returns focus to the toolbar Filter button.
    await panel.getByLabel('Search filters', { exact: true }).focus()
    await page.keyboard.press('Escape')
    await expect(panel).toBeHidden()
    await expect(filterButton).toBeFocused()
  })

  test('opens as a right-side Sheet on narrow viewports', async ({ page }) => {
    await page.setViewportSize({ width: 640, height: 800 })
    const filterButton = page.getByRole('button', { name: /^Add filter(?:\s*\d+)?$/ })
    await filterButton.click()

    const sheet = page.getByRole('dialog')
    await expect(sheet).toBeVisible()
    await expect(sheet.getByRole('heading', { name: 'Filters' })).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(sheet).toBeHidden()
    await expect(filterButton).toBeFocused()
  })
})
