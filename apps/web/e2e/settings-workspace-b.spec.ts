import { type Page, expect, test } from '@playwright/test'

const main = (page: Page) => page.getByRole('navigation', { name: 'Main', exact: true })
const roleRow = (page: Page, role: string) =>
  page.getByRole('row').filter({ has: page.getByRole('gridcell', { name: role, exact: true }) })
const save = async (page: Page) => {
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByText('Saved', { exact: true }).first()).toBeVisible()
}

test.describe('Settings ▸ Modules & capabilities', () => {
  test('switching a module off hides it, its settings area and its settings URLs (G-001)', async ({ page }) => {
    await page.goto('/settings/ws-modules')
    await expect(page.getByRole('heading', { name: 'Modules & capabilities', level: 1 })).toBeVisible()

    // Home and Warehouse are always on: shown as text, no switch.
    await expect(page.getByRole('switch', { name: 'Home', exact: true })).toHaveCount(0)
    await expect(page.getByRole('switch', { name: 'Warehouse', exact: true })).toHaveCount(0)
    await expect(page.getByRole('switch', { name: 'Sales', exact: true })).toHaveAttribute('aria-checked', 'true')
    await expect(main(page).getByRole('button', { name: 'Sales', exact: true })).toBeVisible()

    await page.getByRole('switch', { name: 'Sales', exact: true }).click()
    await expect(page.getByText('Off — its pages and settings are hidden from everyone.')).toBeVisible()
    await save(page)

    // Sidebar, settings navigation and module settings URLs all follow.
    await expect(main(page).getByRole('button', { name: 'Sales', exact: true })).toHaveCount(0)
    await expect(main(page).getByRole('button', { name: 'Purchasing', exact: true })).toBeVisible()
    await page.goto('/sales/settings/cfg-pricing')
    await expect(page).toHaveURL(/\/settings\/ws-profile$/)
    await page.goto('/sales/settings')
    await expect(page).toHaveURL(/\/settings\/ws-profile$/)
    await expect(page.getByRole('navigation', { name: 'Settings' }).getByRole('button', { name: /Sales/ })).toHaveCount(0)

    // Switch it back on: everything returns.
    await page.goto('/settings/ws-modules')
    await page.getByRole('switch', { name: 'Sales', exact: true }).click()
    await save(page)
    await page.goto('/sales/settings/cfg-pricing')
    await expect(page.getByRole('heading', { name: 'Sales pricing', level: 1 })).toBeVisible()
    await expect(main(page).getByRole('button', { name: 'Sales', exact: true })).toBeVisible()
  })

  test('the customer pricing capability is the Sales pricing switch (G-027)', async ({ page }) => {
    await page.goto('/settings/ws-modules')
    const pricing = page.getByRole('switch', { name: 'Customer-specific pricing', exact: true })
    await expect(pricing).toHaveAttribute('aria-checked', 'true')
    await pricing.click()
    await save(page)
    await page.reload()
    await expect(page.getByRole('switch', { name: 'Customer-specific pricing', exact: true })).toHaveAttribute('aria-checked', 'false')
  })

  test('the production capability shows Production Orders and the work-in-progress location (G-027)', async ({ page }) => {
    await page.goto('/production/settings/assembly')
    await expect(page.getByRole('heading', { name: 'Assembly & production', level: 1 })).toBeVisible()
    await expect(page.getByLabel('Work-in-progress location', { exact: true })).toHaveCount(0)

    await page.goto('/settings/ws-modules')
    await page.getByRole('switch', { name: 'Production orders & routing', exact: true }).click()
    await save(page)

    await page.goto('/production/settings/assembly')
    await expect(page.getByLabel('Work-in-progress location', { exact: true })).toBeVisible()
    await page.goto('/departments')
    await expect(page.getByRole('button', { name: /^Production Orders/ })).toBeVisible()
  })

  test('is for owners and admins only', async ({ page }) => {
    await page.goto('/settings/ws-modules')
    await page.getByRole('button', { name: 'Account menu', exact: true }).click()
    await page.getByRole('menuitem', { name: /^Member/ }).click()
    await expect(page.getByText('Workspace settings are for owners and admins.')).toBeVisible()
  })
})

test.describe('Settings ▸ Plan & billing', () => {
  test('shows the current plan and what each plan includes, with nothing to buy', async ({ page }) => {
    await page.goto('/settings/ws-plan')
    await expect(page.getByRole('heading', { name: 'Plan & billing', level: 1 })).toBeVisible()
    for (const name of ['Starter', 'Growth', 'Enterprise']) {
      await expect(page.getByRole('article', { name: `${name} plan` })).toBeVisible()
    }
    await expect(page.getByRole('article', { name: 'Growth plan' })).toContainText('Current')
    await expect(page.getByRole('article', { name: 'Growth plan' })).toContainText('Multi-warehouse & zones')
    await expect(page.getByRole('button', { name: /Upgrade|Switch to/ })).toHaveCount(0)
  })
})

test.describe('Settings ▸ Team & roles', () => {
  test('lists the roles and who holds them, and edits a role in place', async ({ page }) => {
    await page.goto('/settings/ws-team')
    await expect(page.getByRole('heading', { name: 'Team & roles', level: 1 })).toBeVisible()
    for (const role of ['Admin', 'Manager', 'Warehouse', 'Sales', 'Purchasing', 'Finance', 'Viewer']) {
      await expect(roleRow(page, role)).toBeVisible()
    }
    // A fixed list: roles are edited, not added.
    await expect(page.getByRole('button', { name: /^New role/ })).toHaveCount(0)

    await roleRow(page, 'Sales').click()
    const drawer = page.getByRole('complementary', { name: /Role Sales/ })
    await expect(drawer).toBeVisible()
    await expect(drawer.getByText('MEMBERS', { exact: true })).toBeVisible()
    await drawer.getByRole('button', { name: 'Edit', exact: true }).click()

    // Too long a description is refused; a valid change saves.
    const edit = page.getByRole('complementary', { name: 'Edit role' })
    await edit.getByLabel('Description', { exact: true }).fill('x'.repeat(150))
    await page.keyboard.press('Control+s')
    await expect(edit.getByText('Keep it to 140 characters.')).toBeVisible()
    await edit.getByLabel('Description', { exact: true }).fill('Sell to pooja stores and gift shops.')
    await edit.getByRole('radiogroup', { name: 'Finance permission' }).getByRole('radio', { name: 'Read', exact: true }).click()
    await edit.getByRole('button', { name: 'Save changes', exact: true }).click()
    await expect(roleRow(page, 'Sales')).toContainText('Sell to pooja stores')

    // People ▸ Users starts a new Sales user from the edited role.
    await page.goto('/people/users')
    await page.getByRole('button', { name: 'New user', exact: true }).click()
    const form = page.getByRole('complementary', { name: 'New user' })
    await form.getByLabel('Role', { exact: true }).selectOption('Sales')
    await expect(form.getByRole('radiogroup', { name: 'Finance permission' }).getByRole('radio', { name: 'Read', exact: true })).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })

  test('Admin always has full access', async ({ page }) => {
    await page.goto('/settings/ws-team')
    await roleRow(page, 'Admin').click()
    const drawer = page.getByRole('complementary', { name: /Role Admin/ })
    await expect(drawer.getByText('Admin always has full access to every module and its settings.')).toBeVisible()
  })

  test('People ▸ Users links to it, and the people counts follow the users', async ({ page }) => {
    await page.goto('/people/users')
    await page.getByRole('link', { name: 'Manage roles', exact: true }).click()
    await expect(page).toHaveURL(/\/settings\/ws-team$/)
    await expect(page.getByRole('heading', { name: 'Team & roles', level: 1 })).toBeVisible()
    await expect(page.getByText('Not moved yet')).toHaveCount(0)
  })
})

test.describe('Settings ▸ Navigation', () => {
  test('switches the Departments page off and on', async ({ page }) => {
    await page.goto('/settings/cfg-nav')
    await expect(page.getByRole('heading', { name: 'Navigation', level: 1 })).toBeVisible()
    await expect(main(page).getByRole('link', { name: 'Departments', exact: true })).toBeVisible()

    await page.getByRole('switch', { name: 'Departments page', exact: true }).click()
    // The other two options only apply while the page is on.
    await expect(page.getByRole('switch', { name: '“Jump back in” row', exact: true })).toHaveCount(0)
    await save(page)
    await expect(main(page).getByRole('link', { name: 'Departments', exact: true })).toHaveCount(0)
    await page.goto('/departments')
    await expect(page).toHaveURL(/\/purchasing\/purchase-orders$/)

    await page.goto('/settings/cfg-nav')
    await page.getByRole('switch', { name: 'Departments page', exact: true }).click()
    await save(page)
    await expect(main(page).getByRole('link', { name: 'Departments', exact: true })).toBeVisible()
  })

  test('leaves unbuilt pages and the Jump back in row off the Departments page', async ({ page }) => {
    await page.goto('/settings/cfg-nav')
    await page.getByRole('switch', { name: 'List pages that aren’t built yet', exact: true }).click()
    await page.getByRole('switch', { name: '“Jump back in” row', exact: true }).click()
    await save(page)
    await page.goto('/departments')
    await expect(page.getByRole('heading', { name: 'Departments', level: 1 })).toBeVisible()
    await expect(page.getByText('Coming soon')).toHaveCount(0)
    await expect(page.getByText('Jump back in', { exact: true })).toHaveCount(0)
  })
})

test.describe('Settings ▸ Favorites & views', () => {
  test('refuses a cap outside 3–30 and saves a valid one', async ({ page }) => {
    await page.goto('/settings/cfg-favorites')
    await expect(page.getByRole('heading', { name: 'Favorites & views', level: 1 })).toBeVisible()
    const cap = page.getByLabel('Pins shown before “Show all”', { exact: true })
    await expect(cap).toHaveValue('10')
    await cap.fill('2')
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.getByText('Enter a whole number from 3 to 30.')).toBeVisible()
    await cap.fill('4')
    await save(page)
    await page.reload()
    await expect(page.getByLabel('Pins shown before “Show all”', { exact: true })).toHaveValue('4')
  })

  test('switching the pinned section off removes it and every star, for everyone', async ({ page }) => {
    await page.goto('/purchasing/purchase-orders')
    await expect(main(page).getByRole('button', { name: 'Favorites', exact: true })).toBeVisible()
    await page.goto('/settings/cfg-favorites')
    await page.getByRole('switch', { name: 'Pinned sidebar section', exact: true }).click()
    await save(page)
    await expect(main(page).getByRole('button', { name: 'Favorites', exact: true })).toHaveCount(0)
    await expect(main(page).getByRole('button', { name: /^Add .* to favorites$/ })).toHaveCount(0)
    await page.goto('/departments')
    await expect(page.getByRole('button', { name: /^Add .* to favorites$/ })).toHaveCount(0)
  })
})
