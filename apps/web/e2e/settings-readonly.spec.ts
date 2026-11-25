import { expect, test } from '@playwright/test'

test.describe('Settings ▸ read-only mode for members', () => {
  test('Purchasing settings is view-only for a member without Manage settings right', async ({ page }) => {
    await page.goto('/purchasing/settings/sequences')
    await expect(page.getByRole('heading', { name: 'Number sequences', level: 1 })).toBeVisible()
    await expect(page.getByRole('button', { name: 'New series', exact: true })).toBeVisible()

    // Switch demo role to Member (Kavitha has read access to Purchasing, no Manage settings right).
    await page.getByRole('button', { name: 'Account menu', exact: true }).click()
    await page.getByRole('menuitem', { name: /^Member/ }).click()

    // View-only state line shows, New button and mutating controls disappear.
    await expect(page.getByText('View only — ask an admin to change these settings.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'New series', exact: true })).toHaveCount(0)

    // Keyboard shortcut N is inert in view-only mode.
    await page.keyboard.press('n')
    await expect(page.getByRole('complementary', { name: 'New series' })).toHaveCount(0)

    // Clicking a row opens the drawer view-only without Edit / Set as default / Delete buttons.
    const poRow = page.getByRole('row', { name: /PO00011/ })
    await poRow.click()
    const drawer = page.getByRole('complementary', { name: 'Series PO00011' })
    await expect(drawer).toBeVisible()
    await expect(drawer.getByRole('button', { name: 'Edit', exact: true })).toHaveCount(0)
    await expect(drawer.getByRole('button', { name: 'Delete series', exact: true })).toHaveCount(0)
    await expect(drawer.getByRole('button', { name: 'Set as default', exact: true })).toHaveCount(0)

    // Keyboard shortcut E and double-click stay view-only.
    await page.keyboard.press('e')
    await expect(page.getByRole('complementary', { name: 'Edit series' })).toHaveCount(0)
    await poRow.dblclick()
    await expect(page.getByRole('complementary', { name: 'Edit series' })).toHaveCount(0)

    // Workspace settings and modules without access show the access-blocked message.
    await page.goto('/settings/ws-profile')
    await expect(page.getByText('Workspace settings are for owners and admins.')).toBeVisible()

    await page.goto('/people/settings/sequences')
    await expect(page.getByText('You don’t have access to People settings.')).toBeVisible()

    // Switching back to Admin restores edit controls.
    await page.getByRole('button', { name: 'Account menu', exact: true }).click()
    await page.getByRole('menuitem', { name: /^Admin/ }).click()
    await page.goto('/purchasing/settings/sequences')
    await expect(page.getByRole('button', { name: 'New series', exact: true })).toBeVisible()
    await expect(page.getByText('View only — ask an admin to change these settings.')).toHaveCount(0)
  })
})
