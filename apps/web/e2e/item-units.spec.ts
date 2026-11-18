import { expect, test } from '@playwright/test'

test.describe('Warehouse ▸ Units of Measure (item units)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/warehouse/units-of-measure')
    await expect(page.getByRole('grid', { name: 'item units' })).toBeVisible()
  })

  test('lists the seeded item-unit rows, narrows by search, and switches views', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Units of Measure', level: 1 })).toBeVisible()
    await expect(page.getByTitle('22 item units')).toBeVisible()
    await expect(page.getByText('Showing 1–20 of 22 item units')).toBeVisible()

    const ashRow = page.getByRole('row', { name: /ASH-PWH-18/ })
    await expect(ashRow).toContainText('NOS')
    await expect(ashRow).toContainText('Numbers')
    await expect(ashRow).toContainText('Count')
    await expect(ashRow).toContainText('1 NOS')
    await expect(ashRow).toContainText('Base')

    const bulkRow = page.getByRole('row', { name: /RM-CONE-BULK/ })
    await expect(bulkRow).toContainText('KGS')
    await expect(bulkRow).toContainText('1 KGS')
    await expect(bulkRow).toContainText('Base')

    const search = page.getByLabel('Search all columns', { exact: true })
    await search.fill('terracotta')
    await expect(page.getByText('Showing 1–3 of 3 item units')).toBeVisible()
    await expect(page.getByRole('row', { name: /ASH-TER-18/ })).toBeVisible()
    await expect(page.getByRole('row', { name: /ASH-PWH-18/ })).toHaveCount(0)

    await search.fill('')
    await expect(page.getByText('Showing 1–20 of 22 item units')).toBeVisible()

    await expect(page.getByRole('menu')).toHaveCount(0)
    await page.getByTitle('Saved views').click()
    await page.getByRole('menuitem', { name: 'Pack units' }).click()
    await expect(page.getByText('No item units', { exact: true })).toBeVisible()
    await expect(page.getByText('No item units match the current search and filters.')).toBeVisible()

    await expect(page.getByRole('menu')).toHaveCount(0)
    await page.getByTitle('Saved views').click()
    await page.getByRole('menuitem', { name: 'All item units' }).click()
    await expect(page.getByText('Showing 1–20 of 22 item units')).toBeVisible()
  })

  test('opens the detail drawer and navigates to the item Units of measure tab', async ({ page }) => {
    await page.getByRole('row', { name: /ASH-PWH-18/ }).click()
    const drawer = page.getByRole('complementary', { name: 'Item unit ASH-PWH-18 · NOS' })
    await expect(drawer).toBeVisible()
    await expect(drawer).toContainText('UNIT DETAILS')
    await expect(drawer).toContainText('NOS · Numbers')
    await expect(drawer).toContainText('Finished Goods')

    await drawer.getByRole('button', { name: 'Open on item', exact: true }).click()
    await expect(page).toHaveURL(/\/warehouse\/items\/ASH-PWH-18\?tab=units$/)
    await expect(page.getByRole('tab', { name: 'Units of measure' })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByLabel('Base unit of measure', { exact: true })).toHaveValue('NOS')

    await page.goto('/warehouse/units-of-measure')
    await expect(page.getByRole('grid', { name: 'item units' })).toBeVisible()
    await page.getByRole('row', { name: /ASH-TER-18/ }).dblclick()
    await expect(page).toHaveURL(/\/warehouse\/items\/ASH-TER-18\?tab=units$/)
  })

  test('removes a unit row with confirm + undo and persists confirmed removals', async ({ page }) => {
    await page.getByRole('row', { name: /ASH-PWH-18/ }).click()
    await expect(page.getByRole('complementary', { name: 'Item unit ASH-PWH-18 · NOS' })).toBeVisible()
    await page.getByRole('button', { name: 'Delete item unit', exact: true }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toContainText('NOS · Numbers on ASH-PWH-18 will be removed.')
    await dialog.getByRole('button', { name: 'Delete item unit', exact: true }).click()

    await expect(page.getByText('Showing 1–20 of 21 item units')).toBeVisible()
    await expect(page.getByRole('row', { name: /ASH-PWH-18/ })).toHaveCount(0)

    await page.getByRole('button', { name: 'Undo', exact: true }).click()
    await expect(page.getByText('Showing 1–20 of 22 item units')).toBeVisible()
    await expect(page.getByRole('row', { name: /ASH-PWH-18/ })).toBeVisible()

    await page.getByRole('row', { name: /ASH-TER-18/ }).click()
    await page.getByRole('button', { name: 'Delete item unit', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Delete item unit', exact: true }).click()
    await expect(page.getByText('Showing 1–20 of 21 item units')).toBeVisible()

    await page.reload()
    await expect(page.getByRole('grid', { name: 'item units' })).toBeVisible()
    await expect(page.getByText('Showing 1–20 of 21 item units')).toBeVisible()
    await expect(page.getByRole('row', { name: /ASH-TER-18/ })).toHaveCount(0)
  })

  test('persists pack units added on the Item profile across navigation, lists them in Pack units, and removes them cleanly', async ({
    page,
  }) => {
    await page.goto('/warehouse/items/ASH-PWH-18?tab=units')
    await expect(page.getByLabel('Base unit of measure', { exact: true })).toHaveValue('NOS')

    // Explanatory text lives behind ⓘ (Quiet pages), not printed inline.
    await expect(page.getByText('Stock, costs and prices are held in this unit.')).toHaveCount(0)
    await expect(page.getByText('For pack units like Box or Carton')).toHaveCount(0)
    await page.getByRole('button', { name: 'About Master pack unit of measure', exact: true }).click()
    const popover = page.locator('[data-slot="popover-content"]')
    await expect(popover).toContainText('largest non-base unit on this item')
    await popover.getByRole('button', { name: 'Close', exact: true }).click()
    await expect(popover).toBeHidden()

    // Add a pack unit and set its conversion.
    await page.getByRole('button', { name: 'Add unit', exact: true }).click()
    await page.getByRole('button', { name: /BOX.*Box/ }).click()
    const boxInput = page.getByLabel('Conversion for BOX', { exact: true })
    await expect(boxInput).toBeVisible()
    await boxInput.fill('24')

    const baseSection = page.getByRole('region', { name: 'Base and master pack' })
    await expect(baseSection).toContainText('Box (BOX)')
    await expect(baseSection).toContainText('= 24 NOS')
    await expect(page.getByRole('row', { name: /^BOX\b/ })).toContainText('Master pack')

    // Leave, reload, and return — still persisted.
    await page.goto('/warehouse/items')
    await expect(page.getByRole('grid')).toBeVisible()
    await page.goto('/warehouse/items/ASH-PWH-18?tab=units')
    await page.reload()
    await expect(baseSection).toContainText('Box (BOX)')
    await expect(baseSection).toContainText('= 24 NOS')
    await expect(page.getByLabel('Conversion for BOX', { exact: true })).toHaveValue('24')

    // Visible in Warehouse ▸ Units of Measure under Pack units.
    await page.goto('/warehouse/units-of-measure')
    await expect(page.getByRole('grid', { name: 'item units' })).toBeVisible()
    await expect(page.getByText('Showing 1–20 of 23 item units')).toBeVisible()

    await page.getByTitle('Saved views').click()
    await page.getByRole('menuitem', { name: 'Pack units' }).click()
    await expect(page.getByText('Showing 1–1 of 1 item unit')).toBeVisible()

    const packRow = page
      .getByRole('row')
      .filter({ has: page.getByRole('checkbox', { name: 'Select ASH-PWH-18 · BOX', exact: true }) })
    await expect(packRow).toBeVisible()
    await expect(packRow).toContainText('24 NOS')
    await expect(packRow).toContainText('Master pack')

    // Remove it from the register and confirm it is gone on the Item profile too.
    await packRow.click()
    await expect(page.getByRole('complementary', { name: 'Item unit ASH-PWH-18 · BOX' })).toBeVisible()
    await page.getByRole('button', { name: 'Delete item unit', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Delete item unit', exact: true }).click()
    await expect(page.getByText('No item units', { exact: true })).toBeVisible()

    await page.goto('/warehouse/items/ASH-PWH-18?tab=units')
    await expect(baseSection).toContainText('Not set yet')
    await expect(page.getByLabel('Conversion for BOX', { exact: true })).toHaveCount(0)
    await expect(page.getByText('1 unit on this item')).toBeVisible()
  })

  test('keeps item.uom aligned when changing base or removing the base unit', async ({ page }) => {
    await page.goto('/warehouse/items/ASH-PWH-18?tab=units')
    await page.getByRole('button', { name: 'Add unit', exact: true }).click()
    await page.getByRole('button', { name: /DOZ.*Dozen/ }).click()

    const baseSelect = page.getByLabel('Base unit of measure', { exact: true })
    await baseSelect.selectOption('DOZ')
    await expect(baseSelect).toHaveValue('DOZ')
    await expect(page.getByText(/UoM DOZ/)).toBeVisible()

    await page.goto('/warehouse/units-of-measure')
    await page
      .getByRole('row')
      .filter({ has: page.getByRole('checkbox', { name: 'Select ASH-PWH-18 · DOZ', exact: true }) })
      .click()
    await page.getByRole('button', { name: 'Delete item unit', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Delete item unit', exact: true }).click()
    await expect(
      page
        .getByRole('row')
        .filter({ has: page.getByRole('checkbox', { name: 'Select ASH-PWH-18 · NOS', exact: true }) }),
    ).toContainText('Base')

    await page.goto('/warehouse/items/ASH-PWH-18?tab=units')
    await expect(page.getByLabel('Base unit of measure', { exact: true })).toHaveValue('NOS')
    await expect(page.getByText(/UoM NOS/)).toBeVisible()
  })
})

test.describe('Production ▸ Production Orders', () => {
  test('renders the Assembly Orders list under Production Orders', async ({ page }) => {
    await page.goto('/production/production-orders')
    await expect(page.getByRole('grid', { name: 'assembly orders' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Production Orders', level: 1 })).toBeVisible()
    await expect(page.getByText('Showing 1–6 of 6 assembly orders')).toBeVisible()

    await page.getByRole('row', { name: /AO00001/ }).click()
    await expect(page.getByRole('complementary', { name: 'Assembly order AO00001' })).toBeVisible()

    await page.getByRole('row', { name: /AO00001/ }).dblclick()
    await expect(page).toHaveURL(/\/production\/assembly-orders\/AO00001$/)
    await expect(page.getByRole('heading', { name: 'Assembly order' })).toBeVisible()
    await expect(page.getByText('AO00001', { exact: true })).toBeVisible()
  })
})
