import { expect, test, type Page } from '@playwright/test'

async function switchRole(page: Page, role: 'Member' | 'Admin') {
  await page.getByRole('button', { name: 'Account menu', exact: true }).click()
  await page.getByRole('menuitem', { name: new RegExp(`^${role}`) }).click()
}

test.describe('Settings ▸ Finance ▸ Tax settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/finance/settings/cfg-taxset')
    await expect(page.getByRole('heading', { name: 'Tax settings', level: 1 })).toBeVisible()
  })

  test('shows the defaults in label | control rows with no description text inline', async ({ page }) => {
    await expect(page.getByLabel('Calculate tax', { exact: true })).toHaveValue('line')
    await expect(page.getByRole('switch', { name: 'Round totals to the rupee' })).toBeChecked()
    await expect(page.getByLabel('Round-off account', { exact: true })).toHaveValue('6190')
    await expect(page.getByLabel('Composition vendor in another state', { exact: true })).toHaveValue('warn')
    await expect(page.getByLabel('Bill-to and ship-to in different states', { exact: true })).toHaveValue('warn')
    await expect(page.getByLabel('Book input tax credit', { exact: true })).toHaveValue('onBill')
    await expect(page.getByLabel('Transfer value', { exact: true })).toHaveValue('landed')
    // Quiet: the descriptions live in ⓘ only.
    await expect(page.getByText('Applies to every document that carries GST')).toHaveCount(0)
    // Share of selling price only exists for that transfer value.
    await expect(page.getByLabel('Share of selling price (%)', { exact: true })).toHaveCount(0)
  })

  test('saves a change, keeps it after a reload, and Discard puts it back', async ({ page }) => {
    await page.getByLabel('Calculate tax', { exact: true }).selectOption('rate')
    await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Discard', exact: true }).click()
    await expect(page.getByLabel('Calculate tax', { exact: true })).toHaveValue('line')

    await page.getByLabel('Calculate tax', { exact: true }).selectOption('rate')
    await page.getByLabel('Composition vendor in another state', { exact: true }).selectOption('block')
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.getByText('No unsaved changes')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeDisabled()

    await page.reload()
    await expect(page.getByLabel('Calculate tax', { exact: true })).toHaveValue('rate')
    await expect(page.getByLabel('Composition vendor in another state', { exact: true })).toHaveValue('block')
  })

  test('round-off account is shown as text while rounding is off; share of selling price is validated', async ({ page }) => {
    await page.getByRole('switch', { name: 'Round totals to the rupee' }).click()
    await expect(page.getByLabel('Round-off account', { exact: true })).toHaveCount(0)
    await expect(page.getByText('6190 · Round off')).toBeVisible()
    await page.getByRole('switch', { name: 'Round totals to the rupee' }).click()
    await expect(page.getByLabel('Round-off account', { exact: true })).toHaveValue('6190')

    await page.getByLabel('Transfer value', { exact: true }).selectOption('pctSell')
    const pct = page.getByLabel('Share of selling price (%)', { exact: true })
    await expect(pct).toHaveValue('90')
    await pct.fill('0')
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.getByText('Enter a share from 1 to 100.')).toBeVisible()
    await pct.fill('85')
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.getByText('No unsaved changes')).toBeVisible()
    await page.reload()
    await expect(page.getByLabel('Share of selling price (%)', { exact: true })).toHaveValue('85')
  })

  test('a label opens its quiet help with each option explained', async ({ page }) => {
    await page.getByRole('button', { name: 'About Calculate tax', exact: true }).click()
    await expect(page.getByText('Lines are grouped by tax rate, and tax is worked out once')).toBeVisible()
  })

  // Closes G-004: a form section's read-only mode, in the UI. Kavitha (the Member) has write access to
  // Finance but no Manage settings right, so she can read these rows and not change them.
  test('is view-only for a member: values as text in the same rows, no Save bar', async ({ page }) => {
    await switchRole(page, 'Member')
    await expect(page.getByText('View only — ask an admin to change these settings.')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Tax settings', level: 1 })).toBeVisible()

    const calc = page.locator('[data-row="taxCalc"]')
    await expect(calc).toContainText('Calculate tax')
    await expect(calc).toContainText('On each line')
    await expect(page.locator('[data-row="roundTotal"]')).toContainText('On')
    await expect(page.locator('[data-row="roundOffAcct"]')).toContainText('6190 · Round off')
    await expect(page.locator('[data-row="itcBooking"]')).toContainText('When the bill is posted')

    // Nothing to edit: no inputs, selects or switches, and no Save / Discard bar.
    await expect(page.locator('[data-row]').getByRole('combobox')).toHaveCount(0)
    await expect(page.locator('[data-row]').getByRole('switch')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Save', exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Discard', exact: true })).toHaveCount(0)
    await page.keyboard.press('Control+s')
    await expect(page.getByText('Saved', { exact: true })).toHaveCount(0)

    // Help still works.
    await page.getByRole('button', { name: 'About Calculate tax', exact: true }).click()
    await expect(page.getByText('Lines are grouped by tax rate')).toBeVisible()

    await switchRole(page, 'Admin')
    await expect(page.getByLabel('Calculate tax', { exact: true })).toBeVisible()
    await expect(page.getByText('View only — ask an admin to change these settings.')).toHaveCount(0)
  })
})

test.describe('Settings ▸ Finance ▸ Tax codes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/finance/settings/tax-codes')
    await expect(page.getByRole('heading', { name: 'Tax codes', level: 1 })).toBeVisible()
    await expect(page.getByRole('grid', { name: 'tax codes' })).toBeVisible()
  })

  test('lists the seeded codes with current rate, applies to, charges and status', async ({ page }) => {
    const grid = page.getByRole('grid', { name: 'tax codes' })
    const gst5 = grid.getByRole('row', { name: /\bGST5\b.*GST 5%/ })
    await expect(gst5).toContainText('5%')
    await expect(gst5).toContainText('Built-in')
    await expect(gst5).toContainText('Active')
    await expect(grid.getByRole('row', { name: /\bGST18\b/ })).toContainText('2')
    await expect(grid.getByRole('row', { name: /\bGOODS\b/ })).toContainText('Follows the goods')
    await expect(grid.getByRole('row', { name: /\bGST12\b/ })).toContainText('Inactive')

    await page.getByRole('button', { name: 'All codes', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Inactive', exact: true }).click()
    await expect(grid.getByRole('row', { name: /\bGST28\b/ })).toBeVisible()
    await expect(grid.getByRole('row', { name: /\bGST5\b/ })).toHaveCount(0)
  })

  test('the shared list shows the same codes', async ({ page }) => {
    await page.goto('/settings/shared/tax-codes')
    const grid = page.getByRole('grid', { name: 'tax codes' })
    await expect(page.getByRole('heading', { name: 'Tax codes', level: 1 })).toBeVisible()
    await expect(grid.getByRole('row', { name: /\bGST5\b.*GST 5%/ })).toBeVisible()
    await expect(grid.getByRole('row', { name: /\bGST40\b/ })).toBeVisible()
  })

  test('creates a code with a rate, edits it in place, adds a scheduled rate change, deletes with Undo', async ({ page }) => {
    await page.getByRole('button', { name: 'New tax code', exact: true }).click()
    const drawer = page.getByRole('complementary', { name: 'New tax code' })
    await expect(drawer).toBeVisible()
    await drawer.getByLabel('Code', { exact: true }).fill('gst9')
    await drawer.getByLabel('Name', { exact: true }).fill('GST 9%')
    await drawer.getByLabel('Rate 1 (%)', { exact: true }).fill('9')
    await drawer.getByRole('button', { name: 'Create tax code', exact: true }).click()

    const grid = page.getByRole('grid', { name: 'tax codes' })
    const row = grid.getByRole('row', { name: /\bGST9\b.*GST 9%/ })
    await expect(row).toContainText('9%')
    await expect(row).toContainText('Custom')

    await row.dblclick()
    const edit = page.getByRole('complementary', { name: 'Edit tax code' })
    await expect(edit.getByRole('textbox', { name: 'Code', exact: true })).toHaveCount(0)
    await expect(edit.getByTitle('Locked', { exact: true })).toBeVisible()
    await edit.getByRole('button', { name: 'Add rate change', exact: true }).click()
    await edit.getByLabel('Rate 2 (%)', { exact: true }).fill('12')
    await edit.getByLabel('Effective from 2', { exact: true }).fill('2099-04-01')
    await edit.getByRole('button', { name: 'Save changes', exact: true }).click()
    await expect(grid.getByRole('row', { name: /\bGST9\b/ })).toContainText('9% → 12% from')

    await grid.getByRole('row', { name: /\bGST9\b/ }).click({ button: 'right' })
    await page.getByRole('menuitem', { name: 'Delete', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Delete tax code', exact: true }).click()
    await expect(grid.getByRole('row', { name: /\bGST9\b/ })).toHaveCount(0)
    await page.getByRole('button', { name: 'Undo', exact: true }).click()
    await expect(grid.getByRole('row', { name: /\bGST9\b/ })).toBeVisible()
  })

  test('validates the code, the name and every rate row', async ({ page }) => {
    await page.keyboard.press('n')
    const drawer = page.getByRole('complementary', { name: 'New tax code' })
    await expect(drawer).toBeVisible()
    await drawer.getByLabel('Rate 1 (%)', { exact: true }).fill('150')
    await drawer.getByRole('button', { name: 'Create tax code', exact: true }).click()
    await expect(drawer.getByText('Use 2–12 letters, digits or hyphens.')).toBeVisible()
    await expect(drawer.getByText('Enter a name.')).toBeVisible()
    await expect(drawer.getByText('Enter 0–100, up to 2 decimals.')).toBeVisible()

    await drawer.getByLabel('Code', { exact: true }).fill('gst5')
    await drawer.getByLabel('Name', { exact: true }).fill('gst 5%')
    await drawer.getByLabel('Rate 1 (%)', { exact: true }).fill('5')
    await drawer.getByRole('button', { name: 'Create tax code', exact: true }).click()
    await expect(drawer.getByText('Another tax code already uses this code.')).toBeVisible()
    await expect(drawer.getByText('Another tax code already has this name.')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(drawer).toBeHidden()
  })

  test('a built-in code keeps its history locked; a rate change can only start today or later', async ({ page }) => {
    await page.getByRole('row', { name: /\bGST5\b/ }).dblclick()
    const edit = page.getByRole('complementary', { name: 'Edit tax code' })
    await expect(edit.getByLabel('Rate 1 (%)', { exact: true })).toHaveCount(0)
    await expect(edit.getByLabel('Locked', { exact: true })).toBeVisible()
    await edit.getByRole('button', { name: 'Add rate change', exact: true }).click()
    await edit.getByLabel('Rate 2 (%)', { exact: true }).fill('7')
    await edit.getByLabel('Effective from 2', { exact: true }).fill('2020-01-01')
    await edit.getByRole('button', { name: 'Save changes', exact: true }).click()
    await expect(edit.getByText('Can’t start in the past — documents already use the current rate.')).toBeVisible()
  })

  test('blocks deleting built-in codes and codes a charge uses; blocks deactivating one an active charge uses', async ({ page }) => {
    const grid = page.getByRole('grid', { name: 'tax codes' })
    await grid.getByRole('row', { name: /\bGST18\b/ }).click()
    const view = page.getByRole('complementary', { name: 'Tax code GST18' })
    await expect(view).toBeVisible()
    const del = view.getByRole('button', { name: 'Delete tax code', exact: true })
    await expect(del).toBeDisabled()
    await expect(del).toHaveAttribute('title', /Built-in code/)

    await page.keyboard.press('e')
    const edit = page.getByRole('complementary', { name: 'Edit tax code' })
    await edit.getByRole('switch', { name: 'Status', exact: true }).click()
    await edit.getByRole('button', { name: 'Save changes', exact: true }).click()
    await expect(edit.getByText('Used by 2 active charges — move them to another code first.')).toBeVisible()
  })

  test('a custom code no charge uses can be deleted', async ({ page }) => {
    await page.keyboard.press('n')
    const drawer = page.getByRole('complementary', { name: 'New tax code' })
    await drawer.getByLabel('Code', { exact: true }).fill('temp')
    await drawer.getByLabel('Name', { exact: true }).fill('Temporary')
    await drawer.getByLabel('Rate 1 (%)', { exact: true }).fill('2.5')
    await drawer.getByRole('button', { name: 'Create tax code', exact: true }).click()
    await expect(drawer).toBeHidden()
    await expect(page.getByRole('row', { name: /Temporary/ })).toBeVisible()
    const view = page.getByRole('complementary', { name: 'Tax code TEMP' })
    await expect(view.getByRole('button', { name: 'Delete tax code', exact: true })).toBeEnabled()
  })

  test('page help opens from the title', async ({ page }) => {
    await page.getByRole('button', { name: 'About Tax codes', exact: true }).click()
    await expect(page.getByText('Each code keeps dated rates, so a government rate change never rewrites older documents.')).toBeVisible()
  })

  test('is view-only for a member', async ({ page }) => {
    await switchRole(page, 'Member')
    await expect(page.getByText('View only — ask an admin to change these settings.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'New tax code', exact: true })).toHaveCount(0)
    await page.keyboard.press('n')
    await expect(page.getByRole('complementary', { name: 'New tax code' })).toHaveCount(0)
    await page.getByRole('row', { name: /\bGST5\b/ }).click()
    const view = page.getByRole('complementary', { name: 'Tax code GST5' })
    await expect(view).toBeVisible()
    await expect(view.getByRole('button', { name: 'Edit', exact: true })).toHaveCount(0)
    await expect(view.getByRole('button', { name: 'Delete tax code', exact: true })).toHaveCount(0)
  })
})

test.describe('Settings ▸ Workspace ▸ States & territories', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings/cfg-states')
    await expect(page.getByRole('heading', { name: 'States & territories', level: 1 })).toBeVisible()
    await expect(page.getByRole('grid', { name: 'states' })).toBeVisible()
  })

  test('lists the GST state codes with type, same-state tax and the parties in each', async ({ page }) => {
    const grid = page.getByRole('grid', { name: 'states' })
    // The grid is virtualised: search to bring a later row into view.
    const search = page.getByPlaceholder(/Search all columns/)
    await search.fill('Tamil')
    const tn = grid.getByRole('row', { name: /\b33\b.*Tamil Nadu/ })
    await expect(tn).toContainText('TN')
    await expect(tn).toContainText('State')
    await expect(tn).toContainText('CGST + SGST')
    await search.fill('Chandigarh')
    await expect(grid.getByRole('row', { name: /\b04\b.*Chandigarh/ })).toContainText('CGST + UTGST')
    await search.fill('')

    await page.getByRole('button', { name: 'All', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Union territories', exact: true }).click()
    await expect(grid.getByRole('row', { name: /Chandigarh/ })).toBeVisible()
    await expect(grid.getByRole('row', { name: /Tamil Nadu/ })).toHaveCount(0)
  })

  test('is read-only for everyone: no New, no Edit, no Delete', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'New state', exact: true })).toHaveCount(0)
    await page.keyboard.press('n')
    await expect(page.getByRole('complementary', { name: /^New/ })).toHaveCount(0)
    await page.getByPlaceholder(/Search all columns/).fill('Tamil')
    await page.getByRole('row', { name: /\b33\b.*Tamil Nadu/ }).click()
    const view = page.getByRole('complementary', { name: 'State 33' })
    await expect(view).toBeVisible()
    await expect(view.getByRole('button', { name: 'Edit', exact: true })).toHaveCount(0)
    await expect(view.getByRole('button', { name: /^Delete/ })).toHaveCount(0)
  })

  test('checks a GSTIN: state while typing, a bad state code, the split and a bad check character', async ({ page }) => {
    const box = page.getByLabel('GSTIN to check', { exact: true })
    await box.fill('33AAB')
    await expect(page.getByText('Keep typing — 5 of 15 characters.')).toBeVisible()

    await box.fill('99AABCS1001K1Z5')
    await expect(page.getByText('“99” isn’t a GST state code')).toBeVisible()

    // The seed workspace is in Tamil Nadu: 33… is the same state, 29… is IGST.
    await box.fill('33ABCDE1234F1Z7')
    await expect(page.getByText('Same state as you → CGST + SGST')).toBeVisible()
    await expect(page.getByText('ABCDE1234F')).toBeVisible()
    await box.fill('29ABCDE1234F1Z0')
    await expect(page.getByText('TN → KA · IGST')).toBeVisible()
    await expect(page.getByText('The last character doesn’t check out')).toBeVisible()

    await page.getByRole('button', { name: 'Clear', exact: true }).click()
    await expect(box).toHaveValue('')
  })

  test('page help opens from the title', async ({ page }) => {
    await page.getByRole('button', { name: 'About States & territories', exact: true }).click()
    await expect(page.getByText('The list is set by GSTN and can’t be edited.')).toBeVisible()
  })
})
