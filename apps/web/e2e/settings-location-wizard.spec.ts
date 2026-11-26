import { type Page, expect, test } from '@playwright/test'

/** Settings ▸ Locations & warehouses ▸ New location setup wizard, floors and areas. */

const openWizard = async (page: Page) => {
  await page.getByRole('button', { name: 'New location', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'New location' })
  await expect(dialog).toBeVisible()
  return dialog
}

const next = (dialog: ReturnType<Page['getByRole']>) => dialog.getByRole('button', { name: 'Continue', exact: true }).click()

const stepOf = (dialog: ReturnType<Page['getByRole']>, label: string) => dialog.getByRole('button', { name: label, exact: true })

test.describe('Settings ▸ Locations & warehouses ▸ setup wizard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/warehouse/settings/locations')
    await expect(page.getByRole('heading', { name: 'Locations & warehouses', level: 1 })).toBeVisible()
    await expect(page.getByRole('grid', { name: 'locations' })).toBeVisible()
  })

  test('shows the seeded floors and areas in the list and the drawer', async ({ page }) => {
    const grid = page.getByRole('grid', { name: 'locations' })
    await expect(grid.getByRole('columnheader', { name: /Floors/ })).toBeVisible()
    await expect(grid.getByRole('columnheader', { name: /Areas/ })).toBeVisible()
    await page.getByRole('row', { name: /TVM-MAIN/ }).click()
    const view = page.getByRole('complementary', { name: 'Location TVM-MAIN' })
    const floors = view.getByRole('region', { name: 'Floors' })
    await expect(floors.locator('[data-floor="L1"]')).toContainText('Ground floor')
    await expect(floors.locator('[data-floor="L1"]')).toContainText('10')
    await expect(floors.locator('[data-floor="MZ"]')).toContainText('Carton loft')
    await expect(floors.locator('[data-floor="MZ"]')).toContainText('1')
    await expect(view.getByText('Floors', { exact: true }).first()).toBeVisible()
  })

  test('creates a multi-floor site from a template and shows its floors and areas', async ({ page }) => {
    const dialog = await openWizard(page)
    // Basics
    await expect(stepOf(dialog, 'Basics')).toHaveAttribute('aria-current', 'step')
    await expect(dialog.getByLabel('Name', { exact: true })).toBeFocused()
    await dialog.getByLabel('Name', { exact: true }).fill('Salem Hub')
    await dialog.getByLabel('Code', { exact: true }).fill('slm-hub')
    await dialog.getByRole('radio', { name: /Manufacturing \+ DC/ }).click()
    await next(dialog)

    // Building
    await expect(stepOf(dialog, 'Building')).toHaveAttribute('aria-current', 'step')
    await dialog.getByRole('radio', { name: 'Multi-level', exact: true }).click()
    await expect(dialog.getByLabel('Floor 2 code', { exact: true })).toBeVisible()
    await dialog.getByLabel('Floor 2 code', { exact: true }).fill('mz')
    await dialog.getByLabel('Floor 2 name', { exact: true }).fill('Carton loft')
    await dialog.getByRole('button', { name: 'Add floor', exact: true }).click()
    await expect(dialog.getByLabel('Floor 3 code', { exact: true })).toHaveValue('L3')
    await dialog.getByRole('button', { name: 'Remove floor 3', exact: true }).click()
    await expect(dialog.getByLabel('Floor 3 code', { exact: true })).toHaveCount(0)
    await next(dialog)

    // Areas: a quick start fills the picks and the preview.
    await expect(stepOf(dialog, 'Areas')).toHaveAttribute('aria-current', 'step')
    await dialog.getByRole('button', { name: /Multi-floor building/ }).click()
    await expect(dialog.getByText('6 areas', { exact: true })).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Fragile ceramic', exact: false }).first()).toHaveAttribute('aria-pressed', 'true')
    await dialog.getByRole('button', { name: 'More Fragile ceramic', exact: true }).click()
    await expect(dialog.getByText('7 areas', { exact: true })).toBeVisible()
    await dialog.getByRole('button', { name: /^Bulk storage/ }).click()
    await expect(dialog.getByText('8 areas', { exact: true })).toBeVisible()
    await dialog.getByRole('button', { name: /^Bulk storage/ }).click()
    await expect(dialog.getByText('7 areas', { exact: true })).toBeVisible()
    await next(dialog)

    // Finish: review, address, state.
    await expect(stepOf(dialog, 'Finish')).toHaveAttribute('aria-current', 'step')
    const review = dialog.getByLabel('Review')
    await expect(review).toContainText('Salem Hub')
    await expect(review).toContainText('SLM-HUB')
    await expect(review).toContainText('Manufacturing + DC')
    await expect(review).toContainText('2 floors')
    await expect(review).toContainText('7 areas')
    await dialog.getByLabel('City', { exact: true }).fill('Salem')
    await dialog.getByLabel('State', { exact: true }).selectOption({ label: 'Tamil Nadu' })
    await expect(review).toContainText('Salem, Tamil Nadu')
    await expect(dialog.getByText(/33ABCDE1234F1Z7/)).toBeVisible()
    await dialog.getByRole('button', { name: 'Create location', exact: true }).click()
    await expect(dialog).toBeHidden()
    await expect(page.getByText('Location created', { exact: true })).toBeVisible()

    // The new site is in the list with its floors and areas; the drawer lists the floors.
    const row = page.getByRole('row', { name: /SLM-HUB/ })
    await expect(row).toContainText('Salem Hub')
    await expect(row).toContainText('Setting up')
    await row.click()
    const view = page.getByRole('complementary', { name: 'Location SLM-HUB' })
    await expect(view.getByText('Floors', { exact: true }).first()).toBeVisible()
    const floors = view.getByRole('region', { name: 'Floors' })
    await expect(floors.locator('[data-floor="L1"]')).toContainText('Ground floor')
    await expect(floors.locator('[data-floor="L1"]')).toContainText('7')
    await expect(floors.locator('[data-floor="MZ"]')).toContainText('Carton loft')
    await expect(floors.locator('[data-floor="MZ"]')).toContainText('0')
  })

  test('validation blocks Next and shows the errors in place', async ({ page }) => {
    const dialog = await openWizard(page)
    // Basics: a name is required.
    await next(dialog)
    await expect(dialog.getByRole('alert')).toContainText('Give your warehouse a name to continue.')
    await expect(dialog.getByText('Give your warehouse a name to continue.')).toHaveCount(2)
    await expect(stepOf(dialog, 'Basics')).toHaveAttribute('aria-current', 'step')
    await expect(dialog.getByLabel('Name', { exact: true })).toBeFocused()
    // Typing clears the error.
    await dialog.getByLabel('Name', { exact: true }).fill('Copy')
    await expect(dialog.getByRole('alert')).toHaveCount(0)

    // A code another site uses.
    await dialog.getByLabel('Code', { exact: true }).fill('tvm-main')
    await next(dialog)
    await expect(dialog.getByText('Code “TVM-MAIN” is already used by another warehouse.').first()).toBeVisible()
    await expect(stepOf(dialog, 'Basics')).toHaveAttribute('aria-current', 'step')
    await dialog.getByLabel('Code', { exact: true }).fill('cpy')
    await next(dialog)

    // Building: floor codes must be unique.
    await dialog.getByRole('radio', { name: 'Multi-level', exact: true }).click()
    await dialog.getByLabel('Floor 2 code', { exact: true }).fill('l1')
    await next(dialog)
    await expect(dialog.getByText('Each floor needs a unique code (e.g. L1, L2, MZ).').first()).toBeVisible()
    await expect(stepOf(dialog, 'Building')).toHaveAttribute('aria-current', 'step')
    await dialog.getByLabel('Floor 2 code', { exact: true }).fill('mz')
    await next(dialog)

    // Areas never blocks.
    await next(dialog)

    // Finish: the state, and Active needs a GST registration for it.
    await dialog.getByRole('button', { name: 'Create location', exact: true }).click()
    await expect(dialog.getByText('Choose the state — it decides which GST registration this site files under.').first()).toBeVisible()
    await expect(dialog).toBeVisible()
    await dialog.getByLabel('State', { exact: true }).selectOption({ label: 'Karnataka' })
    await dialog.getByLabel('Status', { exact: true }).selectOption({ label: 'Active' })
    await dialog.getByRole('button', { name: 'Create location', exact: true }).click()
    await expect(dialog.getByText(/Karnataka has no active GST registration/).first()).toBeVisible()
    await dialog.getByLabel('Status', { exact: true }).selectOption({ label: 'Setting up' })
    await dialog.getByRole('button', { name: 'Create location', exact: true }).click()
    await expect(dialog).toBeHidden()
    await expect(page.getByRole('row', { name: /CPY/ })).toContainText('Copy')
  })

  test('the Finish step keeps the 3PL, country and principal rules', async ({ page }) => {
    const dialog = await openWizard(page)
    await dialog.getByLabel('Name', { exact: true }).fill('Salem HQ')
    await dialog.getByLabel('Code', { exact: true }).fill('SLM-HQ')
    await next(dialog)
    await next(dialog)
    await next(dialog)
    await expect(dialog.getByLabel('Operated by (3PL vendor)', { exact: true })).toHaveCount(0)
    await dialog.getByLabel('Country', { exact: true }).selectOption({ label: 'Singapore' })
    await expect(dialog.getByLabel('On the GST certificate as', { exact: true })).toHaveCount(0)
    await expect(dialog.getByLabel('Region', { exact: true })).toBeVisible()
    await expect(dialog.getByText('Outside India — no GST registration')).toBeVisible()
    await dialog.getByLabel('Country', { exact: true }).selectOption({ label: 'India' })
    await dialog.getByLabel('State', { exact: true }).selectOption({ label: 'Tamil Nadu' })
    await dialog.getByLabel('On the GST certificate as', { exact: true }).selectOption({ label: 'Principal place of business' })
    await expect(dialog.getByText('Creating makes this the principal place and moves Tiruvannamalai — Main to Additional.')).toBeVisible()

    // Back to Basics and pick 3PL: the vendor field appears on Finish.
    await stepOf(dialog, 'Basics').click()
    await dialog.getByRole('radio', { name: /Third-party \(3PL\)/ }).click()
    await stepOf(dialog, 'Finish').click()
    await expect(dialog.getByLabel('Operated by (3PL vendor)', { exact: true })).toBeVisible()
    await dialog.getByRole('button', { name: 'Create location', exact: true }).click()
    await expect(dialog).toBeHidden()
    await expect(page.getByText('Principal place changed')).toBeVisible()
    await page.getByRole('row', { name: /TVM-MAIN/ }).click()
    await expect(page.getByRole('complementary', { name: 'Location TVM-MAIN' })).toContainText('Additional place')
  })

  test('Back and the step dots keep what was entered', async ({ page }) => {
    const dialog = await openWizard(page)
    await dialog.getByLabel('Name', { exact: true }).fill('Keep me')
    await dialog.getByRole('radio', { name: /Retail forward stock/ }).click()
    await next(dialog)
    await dialog.getByRole('radio', { name: 'Multi-level', exact: true }).click()
    await dialog.getByLabel('Floor 2 name', { exact: true }).fill('Roof deck')
    await next(dialog)
    await dialog.getByRole('button', { name: /^Receiving/ }).click()
    await dialog.getByRole('button', { name: 'More Receiving', exact: true }).click()
    await expect(dialog.getByText('2 areas', { exact: true })).toBeVisible()

    // Back twice: the earlier steps still hold their values.
    await dialog.getByRole('button', { name: 'Back', exact: true }).click()
    await expect(stepOf(dialog, 'Building')).toHaveAttribute('aria-current', 'step')
    await expect(dialog.getByLabel('Floor 2 name', { exact: true })).toHaveValue('Roof deck')
    await dialog.getByRole('button', { name: 'Back', exact: true }).click()
    await expect(dialog.getByLabel('Name', { exact: true })).toHaveValue('Keep me')
    await expect(dialog.getByRole('radio', { name: /Retail forward stock/ })).toHaveAttribute('aria-checked', 'true')

    // A step dot jumps forward to a visited step (and Alt + → continues).
    await stepOf(dialog, 'Areas').click()
    await expect(stepOf(dialog, 'Areas')).toHaveAttribute('aria-current', 'step')
    await expect(dialog.getByText('2 areas', { exact: true })).toBeVisible()
    await page.keyboard.press('Alt+ArrowLeft')
    await expect(stepOf(dialog, 'Building')).toHaveAttribute('aria-current', 'step')
    await page.keyboard.press('Alt+ArrowRight')
    await expect(stepOf(dialog, 'Areas')).toHaveAttribute('aria-current', 'step')
    await expect(dialog.getByRole('button', { name: 'Back', exact: true })).toBeVisible()
  })

  test('Enter continues from a field, N opens the wizard', async ({ page }) => {
    await page.keyboard.press('n')
    const dialog = page.getByRole('dialog', { name: 'New location' })
    await expect(dialog).toBeVisible()
    await dialog.getByLabel('Name', { exact: true }).fill('Enter site')
    await page.keyboard.press('Enter')
    await expect(stepOf(dialog, 'Building')).toHaveAttribute('aria-current', 'step')
    // The focus moves to the step's first control.
    await expect(dialog.getByRole('radio', { name: 'Single level', exact: true })).toBeFocused()
    await page.keyboard.press('Control+Enter')
    await expect(stepOf(dialog, 'Areas')).toHaveAttribute('aria-current', 'step')
  })

  test('Esc closes at once when nothing was entered, and asks before discarding when something was', async ({ page }) => {
    const dialog = await openWizard(page)
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()

    await openWizard(page)
    await dialog.getByLabel('Name', { exact: true }).fill('Throwaway')
    await page.keyboard.press('Escape')
    const confirm = page.getByRole('dialog', { name: 'Discard this location?' })
    await expect(confirm).toContainText('Discard this location?')
    // Keep editing: the wizard is still there with its value.
    await confirm.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(confirm).toBeHidden()
    await expect(dialog.getByLabel('Name', { exact: true })).toHaveValue('Throwaway')
    // Discard.
    await page.keyboard.press('Escape')
    await page.getByRole('dialog', { name: 'Discard this location?' }).getByRole('button', { name: 'Discard', exact: true }).click()
    await expect(dialog).toBeHidden()
    await expect(page.getByRole('row', { name: /Throwaway/ })).toHaveCount(0)

    // A fresh wizard starts empty again.
    await openWizard(page)
    await expect(dialog.getByLabel('Name', { exact: true })).toHaveValue('')
  })

  test('deleting a site removes its floors and areas, and Undo restores them', async ({ page }) => {
    const dialog = await openWizard(page)
    await dialog.getByLabel('Name', { exact: true }).fill('Undo site')
    await dialog.getByLabel('Code', { exact: true }).fill('UND')
    await next(dialog)
    await next(dialog)
    await dialog.getByRole('button', { name: /Small stockroom/ }).click()
    await next(dialog)
    await dialog.getByLabel('State', { exact: true }).selectOption({ label: 'Tamil Nadu' })
    await dialog.getByRole('button', { name: 'Create location', exact: true }).click()
    await expect(dialog).toBeHidden()

    await page.getByRole('row', { name: /UND/ }).click({ button: 'right' })
    await page.getByRole('menuitem', { name: 'Delete', exact: true }).click()
    await page.getByRole('dialog', { name: 'Delete this location?' }).getByRole('button', { name: 'Delete location', exact: true }).click()
    await expect(page.getByRole('row', { name: /UND/ })).toHaveCount(0)
    await page.getByRole('button', { name: 'Undo', exact: true }).click()
    await expect(page.getByRole('row', { name: /UND/ })).toBeVisible()
    await page.getByRole('row', { name: /UND/ }).click()
    const floors = page.getByRole('complementary', { name: 'Location UND' }).getByRole('region', { name: 'Floors' })
    await expect(floors.locator('[data-floor="L1"]')).toContainText('4')
  })

  test('edits floors in the drawer: add, rename, duplicate code refused, remove blocked while it has areas', async ({ page }) => {
    await page.getByRole('row', { name: /TVM-ASSY/ }).dblclick()
    const edit = page.getByRole('complementary', { name: 'Edit location' })
    await expect(edit).toBeVisible()
    const floors = edit.getByRole('region', { name: 'Floors' })

    // The only floor has 4 areas, so it can't be removed (and a single floor has no remove button at all).
    await expect(floors.getByRole('button', { name: /Remove floor/ })).toHaveCount(0)
    await floors.getByRole('button', { name: 'Add floor', exact: true }).click()
    await expect(floors.getByLabel('Floor 2 code', { exact: true })).toHaveValue('L2')
    await expect(floors.getByLabel('Floor 2 name', { exact: true })).toHaveValue('Level 2')
    // Remove is allowed for the new, empty floor; blocked for the one with areas.
    await expect(floors.getByRole('button', { name: 'Remove floor 2', exact: true })).toBeEnabled()
    const blocked = floors.getByRole('button', { name: 'Remove floor 1', exact: true })
    await expect(blocked).toBeDisabled()
    await expect(blocked).toHaveAttribute('title', 'Ground floor has 4 areas — remove them first.')

    // A duplicate code is refused where it's typed.
    await floors.getByLabel('Floor 2 code', { exact: true }).fill('l1')
    await edit.getByRole('button', { name: 'Save changes', exact: true }).click()
    await expect(floors.getByText('Each floor needs a unique code (e.g. L1, L2, MZ).')).toBeVisible()

    await floors.getByLabel('Floor 2 code', { exact: true }).fill('mz')
    await floors.getByLabel('Floor 2 name', { exact: true }).fill('Packing loft')
    await edit.getByRole('button', { name: 'Save changes', exact: true }).click()
    await expect(page.getByRole('complementary', { name: 'Edit location' })).toHaveCount(0)
    await expect(page.getByRole('row', { name: /TVM-ASSY/ })).toContainText('Assembly unit')

    // The drawer stays open in view mode after saving.
    const view = page.getByRole('complementary', { name: 'Location TVM-ASSY' }).getByRole('region', { name: 'Floors' })
    await expect(view.locator('[data-floor="MZ"]')).toContainText('Packing loft')

    // Rename and remove again.
    await page.keyboard.press('e')
    const again = page.getByRole('complementary', { name: 'Edit location' }).getByRole('region', { name: 'Floors' })
    await again.getByLabel('Floor 1 name', { exact: true }).fill('Assembly hall')
    await again.getByRole('button', { name: 'Remove floor 2', exact: true }).click()
    await expect(again.getByLabel('Floor 2 code', { exact: true })).toHaveCount(0)
    await page.getByRole('complementary', { name: 'Edit location' }).getByRole('button', { name: 'Save changes', exact: true }).click()
    const after = page.getByRole('complementary', { name: 'Location TVM-ASSY' }).getByRole('region', { name: 'Floors' })
    await expect(after.locator('[data-floor="L1"]')).toContainText('Assembly hall')
    await expect(after.locator('[data-floor="MZ"]')).toHaveCount(0)
  })

  test('is a full-screen sheet on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    const dialog = await openWizard(page)
    const box = await dialog.boundingBox()
    expect(box?.width).toBeGreaterThanOrEqual(374)
    expect(box?.height).toBeGreaterThanOrEqual(811)
    await expect(dialog.getByLabel('Name', { exact: true })).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Continue', exact: true })).toBeVisible()
  })

  test('is not offered to a member', async ({ page }) => {
    await page.getByRole('button', { name: 'Account menu', exact: true }).click()
    await page.getByRole('menuitem', { name: /^Member/ }).click()
    await expect(page.getByText('View only — ask an admin to change these settings.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'New location', exact: true })).toHaveCount(0)
    await page.keyboard.press('n')
    await expect(page.getByRole('dialog', { name: 'New location' })).toHaveCount(0)
    await page.getByRole('row', { name: /TVM-MAIN/ }).click()
    const view = page.getByRole('complementary', { name: 'Location TVM-MAIN' })
    await expect(view.getByRole('region', { name: 'Floors' })).toBeVisible()
    await expect(view.getByRole('button', { name: 'Add floor', exact: true })).toHaveCount(0)
  })
})
