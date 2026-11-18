import { expect, test } from '@playwright/test'

test.describe('Purchasing ▸ Carriers', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/purchasing/carriers')
    await expect(page.getByText('Showing 1–6 of 6 carriers')).toBeVisible()
  })

  test('shows seeded count, masks phone in grid, and shows full contact details in drawer', async ({ page }) => {
    const grid = page.getByRole('grid')
    await expect(grid).not.toContainText('94431')

    // Reveal the hidden Contact and Phone columns in the grid.
    const columnsBtn = page.getByRole('button', { name: 'Columns' })
    await columnsBtn.click()
    await page.getByRole('checkbox', { name: 'Contact' }).click()
    await page.getByRole('checkbox', { name: 'Phone' }).click()
    await columnsBtn.click()

    const stcRow = page.getByRole('row', { name: /STC/ })
    await expect(stcRow).toContainText('Karthik R.')
    await expect(stcRow).toContainText('•••• 2876')
    await expect(stcRow).not.toContainText('94431 52876')
    await expect(stcRow).not.toContainText('9443152876')

    // Opening the drawer shows the full formatted phone number and contact link card.
    await stcRow.click()
    const drawer = page.getByRole('complementary', { name: 'Carrier STC' })
    await expect(drawer).toBeVisible()
    await expect(drawer).toContainText('Karthik R. · 94431 52876')
    await expect(drawer).toContainText('CON00001')
  })

  test('creates a carrier by picking an existing contact with the keyboard', async ({ page }) => {
    await page.getByRole('button', { name: 'New carrier' }).click()
    const newDrawer = page.getByRole('complementary', { name: 'New carrier' })
    await expect(newDrawer).toBeVisible()

    await newDrawer.getByLabel('Code', { exact: true }).fill('bluedart')
    await newDrawer.getByLabel('Name', { exact: true }).fill('Blue Dart Express')

    // Type to pre-search on the Contact trigger, then ↓ and Enter to pick the second match (Senthil V.).
    const contactTrigger = newDrawer.getByLabel('Contact', { exact: true })
    await contactTrigger.focus()
    await page.keyboard.type('se')
    await expect(page.getByRole('option', { name: /Selvi Murugesan/ })).toBeVisible()
    await expect(page.getByRole('option', { name: /Senthil V\./ })).toBeVisible()
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')

    await expect(contactTrigger).toContainText('Senthil V.')
    await newDrawer.getByRole('button', { name: 'Create carrier' }).click()

    await expect(page.getByText('Showing 1–7 of 7 carriers')).toBeVisible()
    const viewDrawer = page.getByRole('complementary', { name: 'Carrier BLUEDART' })
    await expect(viewDrawer).toBeVisible()
    await expect(viewDrawer).toContainText('Senthil V. · 90255 18843')
  })

  test('creates a carrier with inline "Create …" contact and allows deletion with undo', async ({ page }) => {
    await page.getByRole('button', { name: 'New carrier' }).click()
    const newDrawer = page.getByRole('complementary', { name: 'New carrier' })

    await newDrawer.getByLabel('Code', { exact: true }).fill('DELHIVERY')
    await newDrawer.getByLabel('Name', { exact: true }).fill('Delhivery Surface')

    await newDrawer.getByLabel('Contact', { exact: true }).click()
    const pop = page.locator('[data-lk-pop]')
    await pop.getByRole('combobox', { name: 'Search contacts' }).fill('Anand Kumar')
    await pop.getByRole('option', { name: /Create “Anand Kumar”/ }).click()

    await expect(pop.getByLabel('Name', { exact: true })).toHaveValue('Anand Kumar')
    await pop.getByLabel('Phone', { exact: true }).fill('9876543210')
    await pop.getByLabel('Email', { exact: true }).fill('anand@delhivery.example')
    await pop.getByRole('button', { name: 'Create & link' }).click()

    await expect(newDrawer.getByLabel('Contact', { exact: true })).toContainText('Anand Kumar')
    await newDrawer.getByRole('button', { name: 'Create carrier' }).click()

    await expect(page.getByText('Showing 1–7 of 7 carriers')).toBeVisible()
    const viewDrawer = page.getByRole('complementary', { name: 'Carrier DELHIVERY' })
    await expect(viewDrawer).toBeVisible()
    await expect(viewDrawer).toContainText('Anand Kumar · 98765 43210')
    await expect(viewDrawer).toContainText('anand@delhivery.example')

    // Prototype delete rule: carriers can be deleted (confirm + undo).
    await viewDrawer.getByRole('button', { name: 'Delete carrier' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Delete carrier' }).click()
    await expect(page.getByText('Showing 1–6 of 6 carriers')).toBeVisible()

    await page.getByRole('button', { name: 'Undo' }).click()
    await expect(page.getByText('Showing 1–7 of 7 carriers')).toBeVisible()
  })
})
