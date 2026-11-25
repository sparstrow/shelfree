import { expect, test } from '@playwright/test'

test.describe('People ▸ Users — Manage settings & Manage roles', () => {
  test('toggles Manage settings on a user, persists across reload, and links Manage roles to /settings/ws-team', async ({
    page,
  }) => {
    await page.goto('/people/users')

    const grid = page.getByRole('grid', { name: 'users' })
    await expect(grid).toBeVisible()

    // Open USR00003 (Warehouse role — Purchasing settings starts disabled).
    await grid.getByText('USR00003').click()
    const userDrawer = page.getByRole('complementary', { name: 'User USR00003' })
    await expect(userDrawer).toBeVisible()
    await expect(userDrawer.locator('[data-module="purchasing"]')).toContainText('—')

    // Edit in place: switch Purchasing Manage settings on and save.
    await userDrawer.getByRole('button', { name: 'Edit' }).click()
    const editDrawer = page.getByRole('complementary', { name: 'Edit user' })
    await expect(editDrawer).toBeVisible()

    const purchasingSwitch = editDrawer.getByRole('switch', { name: 'Purchasing manage settings', exact: true })
    await expect(purchasingSwitch).toHaveAttribute('aria-checked', 'false')
    await purchasingSwitch.click()
    await expect(purchasingSwitch).toHaveAttribute('aria-checked', 'true')

    await editDrawer.getByRole('button', { name: 'Save changes' }).click()
    await expect(userDrawer).toBeVisible()
    await expect(userDrawer.locator('[data-module="purchasing"]')).toContainText('Yes')

    // Persists across reload.
    await page.reload()
    await page.getByRole('grid', { name: 'users' }).getByText('USR00003').click()
    await expect(
      page.getByRole('complementary', { name: 'User USR00003' }).locator('[data-module="purchasing"]'),
    ).toContainText('Yes')

    // Top-bar "Manage roles" link routes to Workspace ▸ Team & roles.
    const manageRoles = page.getByRole('link', { name: 'Manage roles', exact: true })
    await expect(manageRoles).toBeVisible()
    await manageRoles.click()
    await expect(page).toHaveURL(/\/settings\/ws-team$/)
    await expect(page.getByText('Team & roles').first()).toBeVisible()
  })
})
