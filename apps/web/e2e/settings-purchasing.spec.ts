import { type Page, expect, test } from '@playwright/test'

const switchRole = async (page: Page, role: RegExp) => {
  await page.getByRole('button', { name: 'Account menu', exact: true }).click()
  await page.getByRole('menuitem', { name: role }).click()
}

test.describe('Settings ▸ Purchasing — carrier types', () => {
  test('lists the built-in types, adds one that Carriers then offers, and deletes it', async ({ page }) => {
    await page.goto('/purchasing/settings/carrier-types')
    await expect(page.getByRole('heading', { name: 'Carrier types', level: 1 })).toBeVisible()
    const grid = page.getByRole('grid', { name: 'types' })
    for (const code of ['COURIER', 'GTA', 'OWN']) await expect(grid.getByRole('row', { name: new RegExp(code) })).toBeVisible()

    await page.getByRole('button', { name: 'New type', exact: true }).click()
    const drawer = page.getByRole('complementary', { name: 'New type' })
    // Validation: an existing code is refused, in place.
    await drawer.getByLabel('Code', { exact: true }).fill('gta')
    await drawer.getByLabel('Type', { exact: true }).fill('Rail parcel')
    await drawer.getByRole('button', { name: 'Create type', exact: true }).click()
    await expect(drawer.getByText('This code is already used.')).toBeVisible()

    await drawer.getByLabel('Code', { exact: true }).fill('rail')
    await drawer.getByRole('button', { name: 'Create type', exact: true }).click()
    await expect(grid.getByRole('row', { name: /RAIL.*Rail parcel/ })).toBeVisible()

    // The new type is offered on the carrier editor.
    await page.goto('/purchasing/carriers')
    await page.getByRole('button', { name: 'New carrier', exact: true }).click()
    const carrier = page.getByRole('complementary', { name: 'New carrier' })
    await expect(carrier.getByLabel('Type', { exact: true }).locator('option', { hasText: 'Rail parcel' })).toHaveCount(1)

    // An unused custom type can be deleted.
    await page.goto('/purchasing/settings/carrier-types')
    await grid.getByRole('row', { name: /RAIL/ }).click()
    await page.keyboard.press('Delete')
    await page.getByRole('button', { name: 'Delete type', exact: true }).last().click()
    await expect(grid.getByRole('row', { name: /RAIL/ })).toHaveCount(0)
  })

  test('built-in types keep their code and behaviour, and cannot be deleted', async ({ page }) => {
    await page.goto('/purchasing/settings/carrier-types')
    const grid = page.getByRole('grid', { name: 'types' })
    await grid.getByRole('row', { name: /COURIER/ }).click()
    await page.keyboard.press('e')
    const drawer = page.getByRole('complementary', { name: 'Edit type' })
    await expect(drawer.getByLabel('Code', { exact: true })).toHaveCount(0)
    await expect(drawer.getByLabel('Behaves as', { exact: true })).toHaveCount(0)
    await expect(drawer.getByLabel('Type', { exact: true })).toBeVisible()
    await page.keyboard.press('Escape')
    await page.keyboard.press('Delete')
    await expect(page.getByText('Built-in types can’t be deleted — make them inactive instead.').first()).toBeVisible()
  })

  test('a member sees carrier types view-only', async ({ page }) => {
    await page.goto('/purchasing/settings/carrier-types')
    await expect(page.getByRole('button', { name: 'New type', exact: true })).toBeVisible()
    await switchRole(page, /^Member/)
    await expect(page.getByText('View only — ask an admin to change these settings.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'New type', exact: true })).toHaveCount(0)
  })
})

test.describe('Settings ▸ Purchasing — statuses & stages', () => {
  test('the Purchasing slice lists only purchasing documents; the shared list has a Module column', async ({ page }) => {
    await page.goto('/purchasing/settings/statuses')
    await expect(page.getByRole('heading', { name: 'Statuses & stages', level: 1 })).toBeVisible()
    const grid = page.getByRole('grid', { name: 'statuses' })
    await expect(grid.getByRole('row', { name: /Partially received/ })).toBeVisible()
    await expect(grid.getByRole('row', { name: /Awaiting QC/ })).toBeVisible()
    await expect(grid.getByRole('row', { name: /Shipped/ })).toHaveCount(0)
    await expect(grid.getByRole('columnheader', { name: /Module/ })).toHaveCount(0)

    await page.goto('/settings/shared/statuses')
    await expect(grid.getByRole('columnheader', { name: /Module/ })).toBeVisible()
    await expect(grid.getByRole('row', { name: /Partially received/ })).toBeVisible()
    // 34 statuses are more than one page: search reaches the rest.
    await page.getByPlaceholder(/Search all columns/).fill('Shipped')
    await expect(grid.getByRole('row', { name: /Shipped/ })).toBeVisible()
  })

  test('adds a custom stage, then deletes it; system statuses are locked', async ({ page }) => {
    await page.goto('/purchasing/settings/statuses')
    const grid = page.getByRole('grid', { name: 'statuses' })
    await page.getByRole('button', { name: 'New status', exact: true }).click()
    const drawer = page.getByRole('complementary', { name: 'New status' })
    await drawer.getByLabel('Status', { exact: true }).fill('Issued')
    await drawer.getByRole('button', { name: 'Create status', exact: true }).click()
    await expect(drawer.getByText(/already has a status with this name/)).toBeVisible()
    await drawer.getByLabel('Status', { exact: true }).fill('Sent to vendor')
    await drawer.getByRole('button', { name: 'Create status', exact: true }).click()
    await expect(grid.getByRole('row', { name: /Sent to vendor/ })).toBeVisible()

    await page.goto('/purchasing/settings/statuses')
    await grid.getByRole('row', { name: /Sent to vendor/ }).click()
    await page.keyboard.press('Delete')
    await page.getByRole('button', { name: 'Delete status', exact: true }).last().click()
    await expect(grid.getByRole('row', { name: /Sent to vendor/ })).toHaveCount(0)

    await grid.getByRole('row', { name: /Cancelled/ }).first().click()
    await page.keyboard.press('Delete')
    await expect(page.getByText('System statuses are used by Shelfree’s own rules and can’t be deleted.').first()).toBeVisible()
  })

  test('Sales and Production show their own documents', async ({ page }) => {
    await page.goto('/sales/settings/statuses')
    const grid = page.getByRole('grid', { name: 'statuses' })
    await expect(grid.getByRole('row', { name: /Packed/ })).toBeVisible()
    await expect(grid.getByRole('row', { name: /Awaiting QC/ })).toHaveCount(0)
    await page.goto('/production/settings/statuses')
    await expect(grid.getByRole('row', { name: /In progress/ })).toBeVisible()
  })
})

test.describe('Settings ▸ Purchasing — custom fields', () => {
  test('slices by module, validates a list field and deletes', async ({ page }) => {
    await page.goto('/purchasing/settings/fields')
    await expect(page.getByRole('heading', { name: 'Custom fields', level: 1 })).toBeVisible()
    const grid = page.getByRole('grid', { name: 'fields' })
    await expect(grid.getByRole('row', { name: /Kiln batch ref\./ })).toBeVisible()
    await expect(grid.getByRole('row', { name: /Country of origin/ })).toHaveCount(0)

    await page.getByRole('button', { name: 'New field', exact: true }).click()
    const drawer = page.getByRole('complementary', { name: 'New field' })
    await drawer.getByLabel('Field', { exact: true }).fill('Payment mode')
    await drawer.getByLabel('Type', { exact: true }).selectOption('list')
    await drawer.getByLabel('Choices', { exact: true }).fill('UPI')
    await drawer.getByRole('button', { name: 'Create field', exact: true }).click()
    await expect(drawer.getByText('Add at least two choices, separated by commas.')).toBeVisible()
    await drawer.getByLabel('Choices', { exact: true }).fill('UPI, Cheque, Cash')
    await drawer.getByRole('button', { name: 'Create field', exact: true }).click()
    await expect(grid.getByRole('row', { name: /Payment mode.*UPI, Cheque, Cash/ })).toBeVisible()

    await page.goto('/purchasing/settings/fields')
    await grid.getByRole('row', { name: /Payment mode/ }).click()
    await page.keyboard.press('Delete')
    await page.getByRole('button', { name: 'Delete field', exact: true }).last().click()
    await expect(grid.getByRole('row', { name: /Payment mode/ })).toHaveCount(0)
  })

  test('the shared list shows every module; Warehouse shows only item fields', async ({ page }) => {
    await page.goto('/settings/shared/fields')
    const grid = page.getByRole('grid', { name: 'fields' })
    await expect(grid.getByRole('columnheader', { name: /Module/ })).toBeVisible()
    await expect(grid.getByRole('row', { name: /Country of origin/ })).toBeVisible()
    await expect(grid.getByRole('row', { name: /Loyalty tier/ })).toBeVisible()
    await expect(grid.getByRole('row', { name: /Kiln batch ref\./ })).toBeVisible()
    await page.goto('/warehouse/settings/fields')
    await expect(grid.getByRole('row', { name: /Country of origin/ })).toBeVisible()
    await expect(grid.getByRole('row', { name: /Loyalty tier/ })).toHaveCount(0)
  })
})

test.describe('Settings ▸ Purchasing — payment terms', () => {
  test('a term can serve Purchasing and Sales; a sales-only term stays out of Purchasing', async ({ page }) => {
    await page.goto('/purchasing/settings/terms')
    await expect(page.getByRole('heading', { name: 'Payment terms', level: 1 })).toBeVisible()
    const grid = page.getByRole('grid', { name: 'terms' })
    await expect(grid.getByRole('row', { name: /NET30/ })).toBeVisible()
    await expect(grid.getByRole('row', { name: /EOM/ })).toBeVisible()

    await page.goto('/sales/settings/terms')
    await page.getByRole('button', { name: 'New term', exact: true }).click()
    const drawer = page.getByRole('complementary', { name: 'New term' })
    await drawer.getByLabel('Code', { exact: true }).fill('net45')
    await drawer.getByLabel('Name', { exact: true }).fill('Net 45 days')
    await drawer.getByLabel('Net days', { exact: true }).fill('450')
    await drawer.getByRole('button', { name: 'Create term', exact: true }).click()
    await expect(drawer.getByText('Use whole days from 0 to 365, or leave blank.')).toBeVisible()
    await drawer.getByLabel('Net days', { exact: true }).fill('45')
    await drawer.getByRole('button', { name: 'Create term', exact: true }).click()
    await expect(grid.getByRole('row', { name: /NET45/ })).toBeVisible()

    await page.goto('/purchasing/settings/terms')
    await expect(grid.getByRole('row', { name: /NET45/ })).toHaveCount(0)
    await page.goto('/settings/shared/terms')
    await expect(grid.getByRole('columnheader', { name: /Module/ })).toBeVisible()
    await expect(grid.getByRole('row', { name: /NET45.*Sales/ })).toBeVisible()
    await expect(grid.getByRole('row', { name: /NET30.*Purchasing, Sales/ })).toBeVisible()
  })

  test('a term vendors or customers use cannot be deleted; an unused one can', async ({ page }) => {
    await page.goto('/purchasing/settings/terms')
    const grid = page.getByRole('grid', { name: 'terms' })
    await grid.getByRole('row', { name: /NET30/ }).click()
    await page.keyboard.press('Delete')
    await expect(page.getByText(/Used by \d+ vendors? and \d+ customers?/).first()).toBeVisible()
    await page.keyboard.press('Escape')

    await grid.getByRole('row', { name: /EOM/ }).click()
    await page.keyboard.press('Delete')
    await page.getByRole('button', { name: 'Delete term', exact: true }).last().click()
    await expect(grid.getByRole('row', { name: /EOM/ })).toHaveCount(0)
  })

  test('a member sees payment terms view-only', async ({ page }) => {
    await page.goto('/purchasing/settings/terms')
    await switchRole(page, /^Member/)
    await expect(page.getByText('View only — ask an admin to change these settings.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'New term', exact: true })).toHaveCount(0)
  })
})
