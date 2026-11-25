import { expect, test } from '@playwright/test'

test.describe('Settings ▸ Item categories', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/warehouse/settings/categories')
    await expect(page.getByRole('heading', { name: 'Item categories', level: 1 })).toBeVisible()
    await expect(page.getByRole('grid', { name: 'categories' })).toBeVisible()
  })

  test('lists the seeded tree with parents and item counts, and filters by group', async ({ page }) => {
    const grid = page.getByRole('grid', { name: 'categories' })
    await expect(grid.getByRole('row', { name: /\bFG\b.*Finished Goods/ })).toBeVisible()
    const holder = grid.getByRole('row', { name: /\bSBH\b.*Sambrani Holder/ })
    await expect(holder).toContainText('Finished Goods')
    await expect(holder).toContainText('Active')
    await expect(grid.getByRole('row', { name: /\bPKG\b.*Packaging/ })).toBeVisible()

    await page.getByRole('button', { name: 'All categories', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Components', exact: true }).click()
    await expect(grid.getByRole('row', { name: /\bCRM\b.*Ceramic Component/ })).toBeVisible()
    await expect(grid.getByRole('row', { name: /\bSBH\b/ })).toHaveCount(0)
  })

  test('creates, edits (renaming follows into items) and deletes a category, with Undo', async ({ page }) => {
    await page.getByRole('button', { name: 'New category', exact: true }).click()
    const drawer = page.getByRole('complementary', { name: 'New category' })
    await expect(drawer).toBeVisible()
    await drawer.getByLabel('Code', { exact: true }).fill('fm')
    await drawer.getByLabel('Category name', { exact: true }).fill('Foam inserts')
    await drawer.getByLabel('Parent category', { exact: true }).selectOption({ label: 'Packaging' })
    await expect(drawer.getByText('Foam inserts', { exact: true })).toBeVisible()
    await drawer.getByRole('button', { name: 'Create category', exact: true }).click()

    const row = page.getByRole('row', { name: /\bFM\b.*Foam inserts/ })
    await expect(row).toContainText('Packaging')
    await expect(row).toContainText('Active')

    // The item card offers it, grouped under Packaging.
    await page.goto('/warehouse/items/new')
    await expect(page.getByLabel('Category', { exact: true }).locator('option', { hasText: 'Foam inserts' })).toHaveCount(1)
    await page.goto('/warehouse/settings/categories')

    // Edit in place: rename an unused category.
    await page.getByRole('row', { name: /\bFM\b.*Foam inserts/ }).dblclick()
    const edit = page.getByRole('complementary', { name: 'Edit category' })
    await expect(edit).toBeVisible()
    await edit.getByLabel('Category name', { exact: true }).fill('Foam wraps')
    await edit.getByRole('button', { name: 'Save changes', exact: true }).click()
    await expect(page.getByRole('row', { name: /\bFM\b.*Foam wraps/ })).toBeVisible()

    await page.getByRole('row', { name: /\bFM\b/ }).click({ button: 'right' })
    await page.getByRole('menuitem', { name: 'Delete', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Delete category', exact: true }).click()
    await expect(page.getByRole('row', { name: /\bFM\b/ })).toHaveCount(0)

    await page.getByRole('button', { name: 'Undo', exact: true }).click()
    await expect(page.getByRole('row', { name: /\bFM\b.*Foam wraps/ })).toBeVisible()
  })

  test('renaming a category used by items renames it on the items', async ({ page }) => {
    await page.getByRole('row', { name: /\bSBH\b.*Sambrani Holder/ }).dblclick()
    const edit = page.getByRole('complementary', { name: 'Edit category' })
    await edit.getByLabel('Category name', { exact: true }).fill('Mountain Holder')
    await edit.getByRole('button', { name: 'Save changes', exact: true }).click()
    await expect(page.getByRole('row', { name: /\bSBH\b.*Mountain Holder/ })).toBeVisible()

    await page.goto('/warehouse/items')
    await expect(page.getByRole('row', { name: /ASH-PWH-18/ })).toContainText('Mountain Holder')
  })

  test('validates the form: required, duplicate code and name, nesting', async ({ page }) => {
    await page.keyboard.press('n')
    const drawer = page.getByRole('complementary', { name: 'New category' })
    await expect(drawer).toBeVisible()
    await drawer.getByRole('button', { name: 'Create category', exact: true }).click()
    await expect(drawer.getByText('Enter a short code (e.g. SBH).')).toBeVisible()
    await expect(drawer.getByText('Enter a name for the category.')).toBeVisible()
    await drawer.getByLabel('Code', { exact: true }).fill('sbh')
    await drawer.getByLabel('Category name', { exact: true }).fill('packaging')
    await drawer.getByRole('button', { name: 'Create category', exact: true }).click()
    await expect(drawer.getByText('Code “SBH” is already used by “Sambrani Holder”.')).toBeVisible()
    await expect(drawer.getByText('A category named “Packaging” already exists.')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(drawer).toBeHidden()

    // A group can't be moved beneath its own sub-category: the parent list leaves them out.
    await page.getByRole('row', { name: /\bFG\b.*Finished Goods/ }).dblclick()
    const edit = page.getByRole('complementary', { name: 'Edit category' })
    const parent = edit.getByLabel('Parent category', { exact: true })
    await expect(parent.locator('option', { hasText: 'Sambrani Holder' })).toHaveCount(0)
    await expect(parent.locator('option', { hasText: 'Packaging' })).toHaveCount(1)
  })

  test('blocks deleting a category an item uses', async ({ page }) => {
    await page.getByRole('row', { name: /\bSBH\b.*Sambrani Holder/ }).click()
    const view = page.getByRole('complementary', { name: 'Category SBH' })
    await expect(view).toBeVisible()
    const del = view.getByRole('button', { name: 'Delete category', exact: true })
    await expect(del).toBeDisabled()
    await expect(del).toHaveAttribute('title', /items use this category/)
    await page.keyboard.press('Delete')
    await expect(page.getByText('SBH can’t be deleted')).toBeVisible()
  })

  test('page help opens from the title', async ({ page }) => {
    await page.getByRole('button', { name: 'About Item categories', exact: true }).click()
    await expect(page.getByText('Organise your catalogue into the groups your team actually uses.')).toBeVisible()
  })

  test('is view-only for a member', async ({ page }) => {
    await page.getByRole('button', { name: 'Account menu', exact: true }).click()
    await page.getByRole('menuitem', { name: /^Member/ }).click()
    await expect(page.getByText('View only — ask an admin to change these settings.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'New category', exact: true })).toHaveCount(0)
    await page.keyboard.press('n')
    await expect(page.getByRole('complementary', { name: 'New category' })).toHaveCount(0)
    await page.getByRole('row', { name: /\bSBH\b.*Sambrani Holder/ }).click()
    const view = page.getByRole('complementary', { name: 'Category SBH' })
    await expect(view).toBeVisible()
    await expect(view.getByRole('button', { name: 'Edit', exact: true })).toHaveCount(0)
    await expect(view.getByRole('button', { name: 'Delete category', exact: true })).toHaveCount(0)
  })
})

test.describe('Settings ▸ Locations & warehouses', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/warehouse/settings/locations')
    await expect(page.getByRole('heading', { name: 'Locations & warehouses', level: 1 })).toBeVisible()
    await expect(page.getByRole('grid', { name: 'locations' })).toBeVisible()
  })

  test('lists the three Kanalora sites with stock and open documents, and filters by type', async ({ page }) => {
    const grid = page.getByRole('grid', { name: 'locations' })
    const main = grid.getByRole('row', { name: /TVM-MAIN/ })
    await expect(main).toContainText('Tiruvannamalai — Main')
    await expect(main).toContainText('Active')
    await expect(main).toContainText('Tamil Nadu')
    await expect(grid.getByRole('row', { name: /TVM-ASSY/ })).toContainText('Assembly unit')
    await expect(grid.getByRole('row', { name: /CHN-DC/ })).toContainText('Setting up')

    await page.getByRole('button', { name: 'All locations', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Third-party (3PL)', exact: true }).click()
    await expect(grid.getByRole('row', { name: /CHN-DC/ })).toBeVisible()
    await expect(grid.getByRole('row', { name: /TVM-MAIN/ })).toHaveCount(0)
  })

  test('creates, edits and deletes a location, with Undo', async ({ page }) => {
    await page.getByRole('button', { name: 'New location', exact: true }).click()
    const drawer = page.getByRole('complementary', { name: 'New location' })
    await expect(drawer).toBeVisible()
    await drawer.getByLabel('Name', { exact: true }).fill('Salem outlet')
    await drawer.getByLabel('Code', { exact: true }).fill('slm-out')
    await drawer.getByLabel('State', { exact: true }).selectOption({ label: 'Tamil Nadu' })
    await drawer.getByLabel('City', { exact: true }).fill('Salem')
    await drawer.getByRole('button', { name: 'Create location', exact: true }).click()

    const row = page.getByRole('row', { name: /SLM-OUT/ })
    await expect(row).toContainText('Salem outlet')
    await expect(row).toContainText('Setting up')

    // Edit in place; the new site has no documents yet, so its code can still change.
    await row.dblclick()
    const edit = page.getByRole('complementary', { name: 'Edit location' })
    await expect(edit).toBeVisible()
    await edit.getByLabel('Name', { exact: true }).fill('Salem retail outlet')
    await edit.getByLabel('Status', { exact: true }).selectOption({ label: 'Active' })
    await edit.getByRole('button', { name: 'Save changes', exact: true }).click()
    await expect(page.getByRole('row', { name: /SLM-OUT.*Salem retail outlet.*Active/ })).toBeVisible()

    await page.getByRole('row', { name: /SLM-OUT/ }).click({ button: 'right' })
    await page.getByRole('menuitem', { name: 'Delete', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Delete location', exact: true }).click()
    await expect(page.getByRole('row', { name: /SLM-OUT/ })).toHaveCount(0)

    await page.getByRole('button', { name: 'Undo', exact: true }).click()
    await expect(page.getByRole('row', { name: /SLM-OUT/ })).toBeVisible()
  })

  test('validates the form: required, duplicate code, state, 3PL fields', async ({ page }) => {
    await page.keyboard.press('n')
    const drawer = page.getByRole('complementary', { name: 'New location' })
    await expect(drawer).toBeVisible()
    await drawer.getByRole('button', { name: 'Create location', exact: true }).click()
    await expect(drawer.getByText('Enter a warehouse name.')).toBeVisible()
    await expect(drawer.getByText('Enter a short code (e.g. MAIN).')).toBeVisible()
    await expect(drawer.getByText('Choose the state — it decides which GST registration this site files under.')).toBeVisible()

    await drawer.getByLabel('Name', { exact: true }).fill('Copy')
    await drawer.getByLabel('Code', { exact: true }).fill('tvm-main')
    await drawer.getByLabel('State', { exact: true }).selectOption({ label: 'Tamil Nadu' })
    await drawer.getByRole('button', { name: 'Create location', exact: true }).click()
    await expect(drawer.getByText('Code “TVM-MAIN” is already used by another warehouse.')).toBeVisible()

    // 3PL adds the operator; a site outside India drops the GST fields.
    await expect(drawer.getByLabel('Operated by (3PL vendor)', { exact: true })).toHaveCount(0)
    await drawer.getByLabel('Type', { exact: true }).selectOption({ label: 'Third-party (3PL)' })
    await expect(drawer.getByLabel('Operated by (3PL vendor)', { exact: true })).toBeVisible()
    await expect(drawer.getByLabel('On the GST certificate as', { exact: true })).toBeVisible()
    await drawer.getByLabel('Country', { exact: true }).selectOption({ label: 'Singapore' })
    await expect(drawer.getByLabel('On the GST certificate as', { exact: true })).toHaveCount(0)
    await expect(drawer.getByLabel('Region', { exact: true })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(drawer).toBeHidden()
  })

  test('saving a site as principal moves the state’s previous principal to Additional', async ({ page }) => {
    await page.keyboard.press('n')
    const drawer = page.getByRole('complementary', { name: 'New location' })
    await drawer.getByLabel('Name', { exact: true }).fill('Salem HQ')
    await drawer.getByLabel('Code', { exact: true }).fill('SLM-HQ')
    await drawer.getByLabel('State', { exact: true }).selectOption({ label: 'Tamil Nadu' })
    await drawer.getByLabel('On the GST certificate as', { exact: true }).selectOption({ label: 'Principal place of business' })
    await expect(drawer.getByText('Saving makes this the principal place and moves Tiruvannamalai — Main to Additional.')).toBeVisible()
    await drawer.getByRole('button', { name: 'Create location', exact: true }).click()
    await expect(page.getByText('Principal place changed')).toBeVisible()

    await page.getByRole('row', { name: /TVM-MAIN/ }).click()
    await expect(page.getByRole('complementary', { name: 'Location TVM-MAIN' })).toContainText('Additional place')
  })

  test('fixes the code of a site documents refer to and blocks deleting a site with stock', async ({ page }) => {
    await page.getByRole('row', { name: /CHN-DC/ }).dblclick()
    const edit = page.getByRole('complementary', { name: 'Edit location' })
    await expect(edit).toBeVisible()
    await expect(edit.locator('[data-field="code"] input')).toHaveCount(0)
    await expect(edit.locator('[data-field="code"]')).toContainText('CHN-DC')
    await page.keyboard.press('Escape')

    await page.getByRole('row', { name: /TVM-MAIN/ }).click()
    const view = page.getByRole('complementary', { name: 'Location TVM-MAIN' })
    await expect(view).toBeVisible()
    const del = view.getByRole('button', { name: 'Delete location', exact: true })
    await expect(del).toBeDisabled()
    await expect(del).toHaveAttribute('title', /in stock/)
    await page.keyboard.press('Delete')
    await expect(page.getByText('TVM-MAIN can’t be deleted')).toBeVisible()
  })

  test('keeps at least one active location', async ({ page }) => {
    // Make the other two sites inactive first, then try to deactivate the last active one.
    for (const code of ['TVM-ASSY', 'CHN-DC']) {
      await page.getByRole('row', { name: new RegExp(code) }).dblclick()
      const edit = page.getByRole('complementary', { name: 'Edit location' })
      await edit.getByLabel('Status', { exact: true }).selectOption({ label: 'Inactive' })
      await edit.getByRole('button', { name: 'Save changes', exact: true }).click()
      await expect(page.getByRole('row', { name: new RegExp(`${code}.*Inactive`) })).toBeVisible()
    }
    await page.getByRole('row', { name: /TVM-MAIN/ }).dblclick()
    const edit = page.getByRole('complementary', { name: 'Edit location' })
    await edit.getByLabel('Status', { exact: true }).selectOption({ label: 'Inactive' })
    await edit.getByRole('button', { name: 'Save changes', exact: true }).click()
    await expect(edit.getByText('There must always be one active location — make another one active first.')).toBeVisible()
  })

  test('page help opens from the title', async ({ page }) => {
    await page.getByRole('button', { name: 'About Locations & warehouses', exact: true }).click()
    await expect(page.getByText('The sites that hold your stock', { exact: false })).toBeVisible()
  })

  test('is view-only for a member', async ({ page }) => {
    await page.getByRole('button', { name: 'Account menu', exact: true }).click()
    await page.getByRole('menuitem', { name: /^Member/ }).click()
    await expect(page.getByText('View only — ask an admin to change these settings.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'New location', exact: true })).toHaveCount(0)
    await page.keyboard.press('n')
    await expect(page.getByRole('complementary', { name: 'New location' })).toHaveCount(0)
    await page.getByRole('row', { name: /TVM-ASSY/ }).click()
    const view = page.getByRole('complementary', { name: 'Location TVM-ASSY' })
    await expect(view).toBeVisible()
    await expect(view.getByRole('button', { name: 'Edit', exact: true })).toHaveCount(0)
    await expect(view.getByRole('button', { name: 'Delete location', exact: true })).toHaveCount(0)
  })

  test('Warehouse settings lists both sections in the nav', async ({ page }) => {
    const nav = page.getByRole('navigation', { name: 'Settings' })
    await expect(nav.getByRole('link', { name: 'Item categories', exact: true })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Locations & warehouses', exact: true })).toBeVisible()
  })
})
