import { expect, test, type Page } from '@playwright/test'

/** Karnataka GSTIN under Kanalora's PAN (ABCDE1234F), with a valid check character. */
const KA_GSTIN = '29ABCDE1234F1ZW'

async function switchRole(page: Page, role: 'Member' | 'Admin') {
  await page.getByRole('button', { name: 'Account menu', exact: true }).click()
  await page.getByRole('menuitem', { name: new RegExp(`^${role}`) }).click()
}

async function addKarnatakaRegistration(page: Page) {
  await page.getByRole('button', { name: 'New registration', exact: true }).click()
  const drawer = page.getByRole('complementary', { name: 'New registration' })
  await drawer.getByLabel('GSTIN', { exact: true }).fill(KA_GSTIN)
  await drawer.getByRole('button', { name: 'Create registration', exact: true }).click()
  await expect(page.getByRole('row', { name: new RegExp(KA_GSTIN) })).toBeVisible()
}

test.describe('Settings ▸ Workspace ▸ GST registrations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings/ws-gst')
    await expect(page.getByRole('heading', { name: 'GST registrations', level: 1 })).toBeVisible()
    await expect(page.getByRole('grid', { name: 'registrations' })).toBeVisible()
  })

  test('lists the seeded Tamil Nadu registration as primary, with its invoice numbers and locations', async ({ page }) => {
    const grid = page.getByRole('grid', { name: 'registrations' })
    const tn = grid.getByRole('row', { name: /33ABCDE1234F1Z7/ })
    await expect(tn).toContainText('33 · Tamil Nadu')
    await expect(tn).toContainText('Kanalora Crafts Pvt. Ltd.')
    await expect(tn).toContainText('Primary')
    await expect(tn).toContainText('Regular')
    await expect(tn).toContainText(/TN\/\d{4}(-\d{2})?\/0001/)
    // No gap: every Kanalora site is in Tamil Nadu.
    await expect(page.getByText('has no active GST registration')).toHaveCount(0)
  })

  test('adds a registration in Karnataka: the invoice prefix follows the state, then edit in place', async ({ page }) => {
    await page.getByRole('button', { name: 'New registration', exact: true }).click()
    const drawer = page.getByRole('complementary', { name: 'New registration' })
    await expect(drawer.getByLabel('Primary', { exact: true })).not.toBeChecked()
    await drawer.getByLabel('GSTIN', { exact: true }).fill(KA_GSTIN)
    await expect(drawer.getByLabel('Invoice number prefix', { exact: true })).toHaveValue('KA/{FY}/')
    await drawer.getByLabel('Trade name', { exact: true }).fill('Kanalora Bengaluru')
    await drawer.getByRole('button', { name: 'Create registration', exact: true }).click()

    const row = page.getByRole('row', { name: new RegExp(KA_GSTIN) })
    await expect(row).toContainText('29 · Karnataka')
    await expect(row).toContainText('Active')
    await expect(row).toContainText(/KA\/\d{4}(-\d{2})?\/0001/)

    // Edit in place: the GSTIN is fixed after saving.
    await row.dblclick()
    const edit = page.getByRole('complementary', { name: 'Edit registration' })
    await expect(edit.getByLabel('GSTIN', { exact: true })).toHaveCount(0)
    await edit.getByLabel('Scheme', { exact: true }).selectOption('Composition')
    await expect(edit.getByRole('switch', { name: 'E-invoice' })).toHaveCount(0)
    await edit.getByLabel('Legal name', { exact: true }).fill('Kanalora Crafts Pvt. Ltd. (Karnataka)')
    await edit.getByRole('button', { name: 'Save changes', exact: true }).click()
    await expect(page.getByRole('row', { name: new RegExp(KA_GSTIN) })).toContainText('Composition')
    await expect(page.getByRole('row', { name: new RegExp(KA_GSTIN) })).toContainText('Karnataka)')
  })

  test('validates the GSTIN: required, check character, PAN, duplicate state', async ({ page }) => {
    await page.keyboard.press('n')
    const drawer = page.getByRole('complementary', { name: 'New registration' })
    await expect(drawer).toBeVisible()
    await drawer.getByRole('button', { name: 'Create registration', exact: true }).click()
    await expect(drawer.getByText('Enter the GSTIN from your registration certificate.')).toBeVisible()

    await drawer.getByLabel('GSTIN', { exact: true }).fill('29ABCDE1234F1Z0')
    await drawer.getByRole('button', { name: 'Create registration', exact: true }).click()
    await expect(drawer.getByText('The last character doesn’t check out')).toBeVisible()

    await drawer.getByLabel('GSTIN', { exact: true }).fill('29ZZZZZ9999Z1Z0')
    await drawer.getByRole('button', { name: 'Create registration', exact: true }).click()
    await expect(drawer.getByText(/Not a valid GSTIN|isn’t your business PAN|doesn’t check out/)).toBeVisible()

    await drawer.getByLabel('GSTIN', { exact: true }).fill('33ABCDE1234F1Z7')
    await drawer.getByRole('button', { name: 'Create registration', exact: true }).click()
    await expect(drawer.getByText('This GSTIN is already on the list.')).toBeVisible()

    await drawer.getByLabel('GSTIN', { exact: true }).fill(KA_GSTIN)
    await drawer.getByLabel('Legal name', { exact: true }).fill('')
    await drawer.getByLabel('Invoice number prefix', { exact: true }).fill('KARNATAKA/{FY}/')
    await drawer.getByRole('button', { name: 'Create registration', exact: true }).click()
    await expect(drawer.getByText('Enter the legal name as on the certificate.')).toBeVisible()
    await expect(drawer.getByText(/at most 16 characters/)).toBeVisible()
  })

  test('a casual registration needs a fixed period of at most 180 days and can’t be primary', async ({ page }) => {
    await page.keyboard.press('n')
    const drawer = page.getByRole('complementary', { name: 'New registration' })
    await drawer.getByLabel('GSTIN', { exact: true }).fill(KA_GSTIN)
    await drawer.getByLabel('Registration type', { exact: true }).selectOption('Casual')
    await drawer.getByRole('button', { name: 'Create registration', exact: true }).click()
    await expect(drawer.getByText('Enter both dates — a casual registration runs for a fixed period.')).toBeVisible()
    await drawer.getByLabel('Valid from', { exact: true }).fill('2026-12-01')
    await drawer.getByLabel('Valid to', { exact: true }).fill('2027-12-01')
    await drawer.getByRole('button', { name: 'Create registration', exact: true }).click()
    await expect(drawer.getByText(/A casual registration runs up to 90 days/)).toBeVisible()
    await drawer.getByLabel('Valid to', { exact: true }).fill('2027-02-28')
    await drawer.getByRole('button', { name: 'Create registration', exact: true }).click()
    await expect(page.getByRole('row', { name: new RegExp(KA_GSTIN) })).toContainText('Casual')
  })

  test('the primary can’t be cancelled or deleted while locations are in its state', async ({ page }) => {
    const tn = page.getByRole('row', { name: /33ABCDE1234F1Z7/ })
    await tn.click()
    await page.keyboard.press('c')
    await expect(page.getByText('This is your primary registration — make another one primary first.')).toBeVisible()
    await page.keyboard.press('Delete')
    await expect(page.getByText(/can’t be deleted/)).toBeVisible()
  })

  test('cancels (with a confirm), reactivates and deletes a registration, with Undo', async ({ page }) => {
    await addKarnatakaRegistration(page)
    const row = () => page.getByRole('row', { name: new RegExp(KA_GSTIN) })
    await row().click({ button: 'right' })
    await page.getByRole('menuitem', { name: 'Cancel registration…', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel registration', exact: true }).click()
    await expect(row()).toContainText('Cancelled')

    await row().click({ button: 'right' })
    await page.getByRole('menuitem', { name: 'Reactivate', exact: true }).click()
    await expect(row()).toContainText('Active')

    await row().click({ button: 'right' })
    await page.getByRole('menuitem', { name: 'Delete', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Delete registration', exact: true }).click()
    await expect(row()).toHaveCount(0)
    await page.getByRole('button', { name: 'Undo', exact: true }).click()
    await expect(row()).toBeVisible()
  })

  test('make primary moves the flag (key P) and the Business profile GSTIN follows', async ({ page }) => {
    await addKarnatakaRegistration(page)
    await page.getByRole('row', { name: new RegExp(KA_GSTIN) }).click()
    await page.keyboard.press('p')
    await expect(page.getByText('Primary registration changed')).toBeVisible()
    await expect(page.getByRole('row', { name: new RegExp(KA_GSTIN) })).toContainText('Primary')
    await page.goto('/settings/ws-profile')
    await expect(page.getByText(KA_GSTIN)).toBeVisible()
  })

  test('G-017: a location can’t be Active without a registration; the banner offers to add it', async ({ page }) => {
    await page.goto('/warehouse/settings/locations')
    await page.getByRole('button', { name: 'New location', exact: true }).click()
    const wizard = page.getByRole('dialog', { name: 'New location' })
    await wizard.getByLabel('Name', { exact: true }).fill('Bengaluru DC')
    await wizard.getByLabel('Code', { exact: true }).fill('BLR')
    for (let i = 0; i < 3; i++) await wizard.getByRole('button', { name: 'Continue', exact: true }).click()
    await wizard.getByLabel('State', { exact: true }).selectOption({ label: 'Karnataka' })
    await wizard.getByLabel('Status', { exact: true }).selectOption({ label: 'Active' })
    await wizard.getByRole('button', { name: 'Create location', exact: true }).click()
    await expect(wizard.getByText(/Karnataka has no active GST registration/).first()).toBeVisible()
    await wizard.getByLabel('Status', { exact: true }).selectOption({ label: 'Setting up' })
    await wizard.getByRole('button', { name: 'Create location', exact: true }).click()
    await expect(page.getByRole('row', { name: /BLR/ })).toBeVisible()

    await page.goto('/settings/ws-gst')
    await expect(page.getByText('Bengaluru DC is in Karnataka, which has no active GST registration.')).toBeVisible()
    await page.getByRole('button', { name: 'Add Karnataka registration', exact: true }).click()
    const drawer2 = page.getByRole('complementary', { name: 'New registration' })
    await expect(drawer2.getByLabel('GSTIN', { exact: true })).toHaveValue('29')
    await expect(drawer2.getByLabel('Invoice number prefix', { exact: true })).toHaveValue('KA/{FY}/')
    await drawer2.getByLabel('GSTIN', { exact: true }).fill(KA_GSTIN)
    await drawer2.getByRole('button', { name: 'Create registration', exact: true }).click()
    await page.getByRole('row', { name: new RegExp(KA_GSTIN) }).click()
    await expect(page.getByRole('complementary', { name: `Registration ${KA_GSTIN}` })).toContainText('Bengaluru DC')
    await expect(page.getByText('has no active GST registration')).toHaveCount(0)

    // Now Karnataka is covered, so the site can be made Active, and the registration can't be cancelled under it.
    await page.goto('/warehouse/settings/locations')
    await page.getByRole('row', { name: /BLR/ }).dblclick()
    const edit = page.getByRole('complementary', { name: 'Edit location' })
    await edit.getByLabel('Status', { exact: true }).selectOption({ label: 'Active' })
    await edit.getByRole('button', { name: 'Save changes', exact: true }).click()
    await expect(page.getByRole('row', { name: /BLR/ })).toContainText('Active')
    await page.goto('/settings/ws-gst')
    await page.getByRole('row', { name: new RegExp(KA_GSTIN) }).click()
    await page.keyboard.press('c')
    await expect(page.getByText('Bengaluru DC is in Karnataka and would be left without a registration.')).toBeVisible()
  })

  test('a location shows the registration it files under', async ({ page }) => {
    await page.goto('/warehouse/settings/locations')
    await page.getByRole('row', { name: /TVM-MAIN/ }).click()
    const view = page.getByRole('complementary', { name: 'Location TVM-MAIN' })
    await expect(view.getByText('33ABCDE1234F1Z7')).toBeVisible()
  })

  test('G-025: States & territories reads the registrations', async ({ page }) => {
    await addKarnatakaRegistration(page)
    await page.goto('/settings/cfg-states')
    const grid = page.getByRole('grid', { name: 'states' })
    await page.getByPlaceholder(/Search all columns/).fill('Karnataka')
    await expect(grid.getByRole('row', { name: /\b29\b.*Karnataka/ })).toContainText('Registered')
    await page.getByPlaceholder(/Search all columns/).fill('Tamil')
    await expect(grid.getByRole('row', { name: /\b33\b.*Tamil Nadu/ })).toContainText('Primary')
    await page.getByLabel('GSTIN to check', { exact: true }).fill(KA_GSTIN)
    await expect(page.getByText('Same state as your registration → CGST + SGST')).toBeVisible()
    await page.getByLabel('GSTIN to check', { exact: true }).fill('27ABCDE1234F1Z0')
    await expect(page.getByText('TN → MH · IGST')).toBeVisible()
  })

  test('page help opens from the title; a member has no access to Workspace settings', async ({ page }) => {
    await page.getByRole('button', { name: 'About GST registrations', exact: true }).click()
    await expect(page.getByText('Your own GSTINs, one for each state you operate in.', { exact: false })).toBeVisible()
    await switchRole(page, 'Member')
    await expect(page.getByText('Workspace settings are for owners and admins.')).toBeVisible()
  })
})

test.describe('Settings ▸ Workspace ▸ Regional & format', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings/ws-regional')
    await expect(page.getByRole('heading', { name: 'Regional & format', level: 1 })).toBeVisible()
  })

  test('shows Kanalora’s defaults in label | control rows', async ({ page }) => {
    await expect(page.getByLabel('Base currency', { exact: true })).toHaveValue('INR')
    await expect(page.getByLabel('Number format', { exact: true })).toHaveValue('12,34,567.89')
    await expect(page.getByLabel('Time zone', { exact: true })).toHaveValue('Asia/Kolkata (IST)')
    await expect(page.getByLabel('Date format', { exact: true })).toHaveValue('DD/MM/YYYY')
    await expect(page.getByLabel('Week starts on', { exact: true })).toHaveValue('Monday')
    await expect(page.getByLabel('Fiscal year starts', { exact: true })).toHaveValue('April')
    // Quiet: descriptions live in the help popovers only.
    await expect(page.getByText('The currency your books are kept in.', { exact: false })).toHaveCount(0)
  })

  test('saves, survives a reload, and Discard puts the value back', async ({ page }) => {
    await page.getByLabel('Base currency', { exact: true }).selectOption('USD')
    await page.getByRole('button', { name: 'Discard', exact: true }).click()
    await expect(page.getByLabel('Base currency', { exact: true })).toHaveValue('INR')

    await page.getByLabel('Base currency', { exact: true }).selectOption('USD')
    await page.getByLabel('Week starts on', { exact: true }).selectOption('Sunday')
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.getByText('No unsaved changes')).toBeVisible()
    await page.reload()
    await expect(page.getByLabel('Base currency', { exact: true })).toHaveValue('USD')
    await expect(page.getByLabel('Week starts on', { exact: true })).toHaveValue('Sunday')
  })

  test('the financial year start names the year in GST invoice numbers', async ({ page }) => {
    await page.getByLabel('Fiscal year starts', { exact: true }).selectOption('January')
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.getByText('No unsaved changes')).toBeVisible()
    await page.goto('/settings/ws-gst')
    await expect(page.getByRole('row', { name: /33ABCDE1234F1Z7/ })).toContainText(/TN\/\d{4}\/0001/)
    await expect(page.getByRole('row', { name: /33ABCDE1234F1Z7/ })).not.toContainText(/TN\/\d{4}-\d{2}\/0001/)
  })

  test('page help opens from the title', async ({ page }) => {
    await page.getByRole('button', { name: 'About Regional & format', exact: true }).click()
    await expect(page.getByText('How money, numbers, dates and the financial year are shown', { exact: false })).toBeVisible()
  })
})

test.describe('Settings ▸ Workspace ▸ Terminology', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings/terminology')
    await expect(page.getByRole('heading', { name: 'Terminology', level: 1 })).toBeVisible()
    await expect(page.getByRole('grid', { name: 'labels' })).toBeVisible()
  })

  test('lists the renamable labels with their original wording, and has no New', async ({ page }) => {
    const grid = page.getByRole('grid', { name: 'labels' })
    await expect(grid.getByRole('row', { name: /\bLocation\b.*\bRecords\b/ })).toContainText('Locations')
    await expect(grid.getByRole('row', { name: /\bFinance\b.*Modules & navigation/ })).toBeVisible()
    await expect(grid.getByRole('row', { name: /\bFavorites\b.*Favorites & views/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /^New label/i })).toHaveCount(0)
    await page.keyboard.press('n')
    await expect(page.getByRole('complementary', { name: /^New/ })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Reset all', exact: true })).toHaveCount(0)
  })

  test('renames Location to Store: the Locations section, Stock by location and its headings follow (G-018)', async ({ page }) => {
    await page.getByRole('row', { name: /\bLocation\b.*\bRecords\b/ }).dblclick()
    const edit = page.getByRole('complementary', { name: 'Edit label' })
    await edit.getByLabel('Singular', { exact: true }).fill('Store')
    await edit.getByLabel('Plural', { exact: true }).fill('Stores')
    await edit.getByRole('button', { name: 'Save changes', exact: true }).click()
    const row = page.getByRole('row', { name: /\bLocation\b.*\bRecords\b/ })
    await expect(row).toContainText('Store')
    await expect(row).toContainText('Renamed')
    await expect(page.getByText('1 override')).toBeVisible()

    await page.goto('/warehouse/settings/locations')
    await expect(page.getByRole('heading', { name: 'Stores & warehouses', level: 1 })).toBeVisible()
    await expect(page.getByRole('button', { name: 'New store', exact: true })).toBeVisible()
    await expect(page.getByRole('grid', { name: 'stores' })).toBeVisible()
    await page.getByRole('row', { name: /TVM-MAIN/ }).click()
    await expect(page.getByRole('complementary', { name: 'Store TVM-MAIN' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Stock by Store', exact: true })).toBeVisible()

    await page.goto('/warehouse/items')
    await page.getByRole('row').nth(1).click()
    await expect(page.getByText('STOCK BY STORE', { exact: true })).toBeVisible()
  })

  test('blank restores the original; a change can be undone one by one and with Reset all', async ({ page }) => {
    await page.getByRole('row', { name: /\bFinance\b.*Modules & navigation/ }).dblclick()
    const edit = page.getByRole('complementary', { name: 'Edit label' })
    await edit.getByLabel('Singular', { exact: true }).fill('Accounts')
    await edit.getByRole('button', { name: 'Save changes', exact: true }).click()
    await expect(page.getByRole('row', { name: /\bFinance\b.*Modules & navigation/ })).toContainText('Accounts')

    // Restore from the drawer.
    await page.getByRole('button', { name: 'Restore original', exact: true }).click()
    await expect(page.getByRole('row', { name: /\bFinance\b.*Modules & navigation/ })).toContainText('Original')

    // Two overrides, then Reset all (with a confirm).
    for (const [label, value] of [['Finance', 'Accounts'], ['Sales', 'Selling']] as const) {
      await page.getByRole('row', { name: new RegExp(`\\b${label}\\b.*Modules & navigation`) }).dblclick()
      const drawer = page.getByRole('complementary', { name: 'Edit label' })
      await drawer.getByLabel('Singular', { exact: true }).fill(value)
      await drawer.getByRole('button', { name: 'Save changes', exact: true }).click()
    }
    await expect(page.getByText('2 overrides')).toBeVisible()
    await page.getByRole('button', { name: 'Reset all', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Reset all', exact: true }).click()
    await expect(page.getByText('2 overrides')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Reset all', exact: true })).toHaveCount(0)
  })

  test('page help opens from the title', async ({ page }) => {
    await page.getByRole('button', { name: 'About Terminology', exact: true }).click()
    await expect(page.getByText('Rename the words Shelfree uses', { exact: false })).toBeVisible()
  })
})
