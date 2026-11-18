import { expect, test } from '@playwright/test'

test.describe('Production ▸ Bill of materials document', () => {
  test('opens BOM00001 by double-click and shows seed-based cost rollup and apply cost', async ({ page }) => {
    await page.goto('/production/bills-of-materials')
    await expect(page.getByRole('grid')).toBeVisible()

    await page.getByRole('row', { name: /BOM00001/ }).dblclick()
    await expect(page).toHaveURL(/\/production\/bills-of-materials\/BOM00001$/)
    await expect(page.getByRole('heading', { name: 'Bill of materials', exact: true })).toBeVisible()
    await expect(page.getByText('BOM00001')).toBeVisible()

    await expect(page.getByText('₹127.60')).toBeVisible()
    await expect(page.getByText('₹152.88')).toBeVisible()
    await expect(page.getByText('+₹7.88 vs item cost')).toBeVisible()
    await expect(page.getByText('176', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Apply as item cost' }).click()
    const dialog = page.getByRole('dialog', { name: 'Apply rolled-up cost?' })
    await expect(dialog).toContainText('Set ASH-PWH-18’s unit cost to ₹152.88 (currently ₹145.00).')
    await dialog.getByRole('button', { name: 'Apply cost' }).click()
    await expect(page.getByText('Matches the item cost')).toBeVisible()
  })

  test('creates a new BOM (validation error first, then adds two lines and saves as draft)', async ({ page }) => {
    await page.goto('/production/bills-of-materials')
    await expect(page.getByRole('grid')).toBeVisible()

    await page.getByRole('button', { name: 'New BOM' }).click()
    await expect(page).toHaveURL(/\/production\/bills-of-materials\/new$/)
    await expect(page.getByRole('heading', { name: 'New bill of materials' })).toBeVisible()
    await expect(page.getByText('BOM00010')).toBeVisible()

    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.getByRole('alert')).toContainText('Choose the item this BOM makes.')

    await page.getByLabel('Makes', { exact: true }).selectOption('ASH-STAND-WD')
    await page.getByRole('button', { name: 'Activate' }).click()
    await expect(page.getByRole('alert')).toContainText('Add at least one component.')

    await page.getByRole('button', { name: 'Add component' }).click()
    await page.getByRole('textbox', { name: 'Search items to add' }).fill('PKG-BOX-STD')
    await page.getByRole('textbox', { name: 'Search items to add' }).press('Enter')
    await expect(page.getByText('1 component')).toBeVisible()

    await page.getByRole('button', { name: 'Add component' }).click()
    await page.getByRole('textbox', { name: 'Search items to add' }).fill('PKG-CARE-CARD')
    await page.getByRole('textbox', { name: 'Search items to add' }).press('Enter')
    await expect(page.getByText('2 components')).toBeVisible()

    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page).toHaveURL(/\/production\/bills-of-materials\?sel=BOM00010/)
    await expect(page.getByRole('row', { name: /BOM00010/ })).toBeVisible()
    await expect(page.getByRole('complementary', { name: 'Bill of materials BOM00010' })).toContainText('ASH-STAND-WD')
  })

  test('edits a line quantity to update the roll-up and activates a draft', async ({ page }) => {
    await page.goto('/production/bills-of-materials/BOM00008')
    await expect(page.getByRole('heading', { name: 'Bill of materials' })).toBeVisible()
    await expect(page.getByText('₹26.26')).toBeVisible()

    const qty = page.getByRole('spinbutton', { name: 'Qty per, line 1' })
    await qty.fill('10')
    await expect(page.getByText('₹12.00').first()).toBeVisible()
    await expect(page.getByText('₹38.85')).toBeVisible()

    await page.getByRole('button', { name: 'Activate' }).click()
    await expect(page).toHaveURL(/\/production\/bills-of-materials\?sel=BOM00008/)
    await expect(page.getByRole('row', { name: /BOM00008/ })).toContainText('Active')
    await expect(page.getByRole('complementary', { name: 'Bill of materials BOM00008' })).toContainText('₹38.85')
  })

  test('refuses cycles directly and through sub-assemblies', async ({ page }) => {
    await page.goto('/production/bills-of-materials/BOM00001')

    await page.getByRole('button', { name: 'Add component' }).click()
    const search = page.getByRole('textbox', { name: 'Search items to add' })
    await search.fill('ASH-PWH-18')
    await expect(page.getByText('No matching items.')).toBeVisible()
    await search.fill('CMB-PWH-12')
    await search.press('Enter')

    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.getByRole('alert')).toContainText(
      'This would make the item part of itself: ASH-PWH-18 → CMB-PWH-12 → ASH-PWH-18',
    )

    await page.goto('/production/bills-of-materials/new')
    await page.getByRole('button', { name: 'Add component' }).click()
    const newSearch = page.getByRole('textbox', { name: 'Search items to add' })
    await newSearch.fill('ASH-PWH-18')
    await newSearch.press('Enter')

    await page.getByLabel('Makes', { exact: true }).selectOption('ASH-PWH-18')
    await page.getByRole('button', { name: 'Activate' }).click()
    await expect(page.getByRole('alert')).toContainText(
      'This would make the item part of itself: ASH-PWH-18 → ASH-PWH-18',
    )
  })

  test('expands sub-assemblies, renders operations, and refuses overlapping active BOMs', async ({ page }) => {
    await page.goto('/production/bills-of-materials/BOM00004')
    await expect(page.getByText('₹375.67')).toBeVisible()
    await page.getByRole('button', { name: 'Show sub-assembly for ASH-PWH-18' }).click()
    await expect(page.getByText('RM-LID-PWH').filter({ visible: true }).first()).toBeVisible()

    await page.goto('/production/bills-of-materials/BOM00009')
    await expect(page.getByText('Operations')).toBeVisible()
    await expect(page.getByText('Press cones')).toBeVisible()

    await page.goto('/production/bills-of-materials/BOM00007')
    await expect(page.getByText('Archived version — kept for history.')).toBeVisible()
    await page.getByLabel('Effective to', { exact: true }).fill('')
    await page.getByRole('button', { name: 'Activate' }).click()
    await expect(page.getByRole('alert')).toContainText(
      'Another active BOM (BOM00001 · v2) already covers these dates.',
    )
  })
})
