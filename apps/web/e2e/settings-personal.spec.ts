import { type Page, expect, test } from '@playwright/test'

/** Settings ▸ Personal (run 2.6): seven sections, editable by every user, Member included. */

const save = (page: Page) => page.getByRole('button', { name: 'Save', exact: true })
const theme = (page: Page) => page.evaluate(() => document.documentElement.dataset.theme)

async function switchRole(page: Page, role: 'Owner' | 'Admin' | 'Member') {
  await page.getByRole('button', { name: 'Account menu', exact: true }).click()
  await page.getByRole('menuitem', { name: new RegExp(`^${role}`) }).click()
}

test.describe('Settings ▸ Personal', () => {
  test('a member can edit their own profile, and the People ▸ Users record follows', async ({ page }) => {
    await page.goto('/settings/me-profile')
    await switchRole(page, 'Member')
    await page.goto('/settings')
    await expect(page).toHaveURL(/\/settings\/me-profile$/)
    await expect(page.getByRole('heading', { name: 'Profile', level: 1 })).toBeVisible()
    // Editable: inputs and a Save bar, no "View only" line.
    await expect(page.getByText('View only — ask an admin to change these settings.')).toHaveCount(0)
    const name = page.getByLabel('Full name', { exact: true })
    await expect(name).toHaveValue('Kavitha Elumalai')

    // Validation: blank name and a bad email are refused.
    await name.fill('')
    await page.getByLabel('Email', { exact: true }).fill('not-an-email')
    await save(page).click()
    await expect(page.getByText('Enter your name.')).toBeVisible()
    await expect(page.getByText('Enter a valid email address.')).toBeVisible()

    await name.fill('Kavitha E. Elumalai')
    await page.getByLabel('Email', { exact: true }).fill('kavitha.elumalai@kanalora.example')
    await page.getByLabel('Phone', { exact: true }).fill('+91 90031 44999')
    await save(page).click()
    await expect(page.getByText('Saved', { exact: true })).toBeVisible()

    // Persisted and shown in the account menu.
    await page.reload()
    await expect(page.getByLabel('Full name', { exact: true })).toHaveValue('Kavitha E. Elumalai')
    await expect(page.getByLabel('Phone', { exact: true })).toHaveValue('+91 90031 44999')
    await expect(page.getByRole('button', { name: 'Account menu', exact: true })).toContainText('Kavitha E. Elumalai')

    // The same person on People ▸ Users (mirror, not a copy): switch back to a role that can open People.
    await switchRole(page, 'Owner')
    await page.goto('/people/users')
    await expect(page.getByRole('row', { name: /USR00007/ })).toContainText('Kavitha E. Elumalai')
  })

  test('appearance previews the theme live, keeps it per user and replaces the temporary switch', async ({ page }) => {
    await page.goto('/settings/me-appearance')
    await expect(page.getByRole('heading', { name: 'Appearance', level: 1 })).toBeVisible()
    await expect.poll(() => theme(page)).toBe('dark')

    await page.getByLabel('Theme', { exact: true }).selectOption('light')
    await expect.poll(() => theme(page)).toBe('light') // live, before Save
    // Leaving the section without saving puts the saved theme back.
    await page.getByRole('button', { name: 'Discard', exact: true }).click()
    await expect.poll(() => theme(page)).toBe('dark')

    await page.getByLabel('Theme', { exact: true }).selectOption('light')
    await save(page).click()
    await page.reload()
    await expect.poll(() => theme(page)).toBe('light')
    await expect(page.getByLabel('Theme', { exact: true })).toHaveValue('light')

    // The account menu entry is a shortcut into the same setting.
    await page.getByRole('button', { name: 'Account menu', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Dark theme', exact: true }).click()
    await expect.poll(() => theme(page)).toBe('dark')
    await expect(page.getByLabel('Theme', { exact: true })).toHaveValue('dark')

    // Match my device follows the colour scheme the browser reports.
    await page.emulateMedia({ colorScheme: 'light' })
    await page.getByLabel('Theme', { exact: true }).selectOption('system')
    await save(page).click()
    await expect.poll(() => theme(page)).toBe('light')
    await page.emulateMedia({ colorScheme: 'dark' })
    await expect.poll(() => theme(page)).toBe('dark')
  })

  test('comfortable density becomes the default row height of lists', async ({ page }) => {
    await page.goto('/settings/me-appearance')
    await page.getByLabel('Default grid density', { exact: true }).selectOption('comfortable')
    await save(page).click()
    await page.goto('/warehouse/items')
    await expect(page.getByRole('button', { name: 'Switch to compact rows', exact: true })).toBeVisible()
  })

  test('notifications save only their own keys', async ({ page }) => {
    await page.goto('/settings/me-notifications')
    await expect(page.getByRole('heading', { name: 'Notifications', level: 1 })).toBeVisible()
    await expect(page.getByLabel('Low-stock alerts', { exact: true })).toBeChecked()
    await page.getByLabel('Weekly digest', { exact: true }).click()
    await page.getByLabel('Delivery channel', { exact: true }).selectOption('Email only')
    await save(page).click()

    // A save in another section doesn't undo it, nor does it lose the profile.
    await page.goto('/settings/me-language')
    await page.getByRole('combobox', { name: 'Language', exact: true }).selectOption('Hindi')
    await save(page).click()
    await page.goto('/settings/me-notifications')
    await expect(page.getByLabel('Weekly digest', { exact: true })).toBeChecked()
    await expect(page.getByLabel('Delivery channel', { exact: true })).toHaveValue('Email only')
    await page.goto('/settings/me-language')
    await expect(page.getByRole('combobox', { name: 'Language', exact: true })).toHaveValue('Hindi')
  })

  test('language & region: a personal format overrides the workspace one, "Workspace default" follows it', async ({ page }) => {
    await page.goto('/settings/me-language')
    const date = page.getByLabel('Date format', { exact: true })
    await expect(date).toHaveValue('')
    await expect(date.locator('option').first()).toHaveText('Workspace default (DD/MM/YYYY)')
    await date.selectOption('YYYY-MM-DD')
    await save(page).click()
    await page.reload()
    await expect(page.getByLabel('Date format', { exact: true })).toHaveValue('YYYY-MM-DD')

    // Changing the workspace format changes what "Workspace default" says.
    await page.goto('/settings/ws-regional')
    await page.getByLabel('Date format', { exact: true }).selectOption('MM/DD/YYYY')
    await save(page).click()
    await page.goto('/settings/me-language')
    await expect(page.getByLabel('Date format', { exact: true }).locator('option').first()).toHaveText('Workspace default (MM/DD/YYYY)')
  })

  test('personal defaults: landing page, validation, and the assembly defaults pre-fill a new order', async ({ page }) => {
    await page.goto('/settings/me-defaults')
    await expect(page.getByRole('heading', { name: 'Personal defaults', level: 1 })).toBeVisible()
    await page.getByLabel('Default quantity', { exact: true }).fill('0')
    await save(page).click()
    await expect(page.getByText('Enter a whole number from 1.')).toBeVisible()

    await page.getByLabel('Default quantity', { exact: true }).fill('25')
    await page.getByLabel('Build at', { exact: true }).selectOption('WH-ASSY')
    await page.getByLabel('Landing page', { exact: true }).selectOption('Sales · Customers')
    await save(page).click()
    await expect(page.getByText('Saved', { exact: true })).toBeVisible()

    await page.goto('/production/assembly-orders/new')
    await expect(page.getByLabel('Quantity', { exact: true }).first()).toHaveValue('25')

    // The app now opens on the chosen page.
    await page.goto('/')
    await expect(page).toHaveURL(/\/sales\/customers$/)
  })

  test('favorites & views: reorder, remove and pin from one place', async ({ page }) => {
    await page.goto('/purchasing/vendors')
    await page.getByRole('button', { name: 'Add Vendors to favorites' }).click()
    await expect(page.getByRole('button', { name: 'Remove Vendors from favorites' }).first()).toBeVisible()
    await page.goto('/warehouse/items')
    await page.getByRole('button', { name: 'Add Items to favorites' }).click()
    await expect(page.getByRole('button', { name: 'Remove Items from favorites' }).first()).toBeVisible()

    await page.goto('/settings/me-favorites')
    await expect(page.getByRole('heading', { name: 'Favorites & views', level: 1 })).toBeVisible()
    const rows = page.getByRole('region', { name: 'Pinned in the sidebar' }).locator('[data-row]')
    await expect(rows).toHaveCount(2)
    await expect(rows.first()).toContainText('Vendors')
    await page.getByRole('button', { name: 'Move Items up', exact: true }).click()
    await expect(rows.first()).toContainText('Items')
    await page.getByRole('button', { name: 'Remove', exact: true }).first().click()
    await expect(rows).toHaveCount(1)

    // Recents can be hidden from page search.
    await page.getByLabel('Show recents in page search', { exact: true }).click()
    await page.getByRole('combobox').first().click()
    await expect(page.getByText('RECENT', { exact: true })).toHaveCount(0)
  })

  test('security: validation, a stubbed password change, 2FA confirm and other sessions', async ({ page }) => {
    await page.goto('/settings/me-security')
    await expect(page.getByRole('heading', { name: 'Security', level: 1 })).toBeVisible()

    await page.getByRole('button', { name: 'Change password', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Change password' })
    await dialog.getByRole('button', { name: 'Change password', exact: true }).click()
    await expect(dialog.getByText('Enter your current password.')).toBeVisible()
    await expect(dialog.getByText(/Use at least 10 characters/).nth(1)).toBeVisible()

    await dialog.getByLabel('Current password', { exact: true }).fill('old-Passw0rd')
    await dialog.getByLabel('New password', { exact: true }).fill('Tiruvanna1malai')
    await dialog.getByLabel('Confirm new password', { exact: true }).fill('Tiruvanna1malaj')
    await dialog.getByRole('button', { name: 'Change password', exact: true }).click()
    await expect(dialog.getByText('The two passwords do not match.')).toBeVisible()
    await dialog.getByLabel('Confirm new password', { exact: true }).fill('Tiruvanna1malai')
    await dialog.getByRole('button', { name: 'Change password', exact: true }).click()
    await expect(page.getByText('Password change sent to the sign-in service')).toBeVisible()
    await expect(dialog).toHaveCount(0)

    // Nothing sensitive reached the browser's storage.
    const stored = await page.evaluate(() => JSON.stringify({ ...localStorage }))
    expect(stored).not.toContain('Tiruvanna1malai')
    expect(stored).not.toContain('old-Passw0rd')

    // Turning two-factor off asks first.
    const twoFA = page.getByLabel('Two-factor authentication', { exact: true })
    await expect(twoFA).toBeChecked()
    await twoFA.click()
    await page.getByRole('button', { name: 'Keep it on', exact: true }).click()
    await expect(twoFA).toBeChecked()
    await twoFA.click()
    await page.getByRole('button', { name: 'Turn off', exact: true }).click()
    await expect(twoFA).not.toBeChecked()

    await expect(page.getByText(/Android phone/)).toBeVisible()
    await page.getByRole('button', { name: 'Sign out others', exact: true }).click()
    await expect(page.getByText(/Android phone/)).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Sign out others', exact: true })).toBeDisabled()
  })
})
