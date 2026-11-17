import { expect, test } from '@playwright/test'

test.describe('People ▸ Contacts', () => {
  test('renders seeded count and masks PII in the grid while showing full values in the drawer', async ({ page }) => {
    await page.goto('/people/contacts')

    await expect(page.getByText('34 contacts')).toBeVisible()
    await expect(page.getByText(/1–20 of 34/)).toBeVisible()

    // Grid displays masked phone and masked email; unmasked email/phone must not appear before opening drawer.
    await expect(page.getByText('CON00006')).toBeVisible()
    await expect(page.getByText('Murugesan Pillai')).toBeVisible()
    await expect(page.getByText('•••• 0287')).toBeVisible()
    await expect(page.getByText('o••••@kailashceramics.example')).toBeVisible()
    await expect(page.getByText('orders@kailashceramics.example')).toHaveCount(0)

    // Opening CON00006 shows full formatted phone and full email in the drawer.
    await page.getByText('CON00006').click()
    const drawer = page.getByRole('complementary', { name: 'Contact CON00006' })
    await expect(drawer).toBeVisible()
    await expect(drawer.getByText('94421 10287')).toBeVisible()
    await expect(drawer.getByText('orders@kailashceramics.example')).toBeVisible()
    await expect(drawer.getByText(/edits to name, phone and email apply everywhere it is linked/i)).toBeVisible()
  })

  test('shows LINKED TO section with working vendor deep link and blocks delete when linked', async ({ page }) => {
    await page.goto('/people/contacts?sel=CON00006')

    const drawer = page.getByRole('complementary', { name: 'Contact CON00006' })
    await expect(drawer).toBeVisible()
    await expect(drawer.getByText('LINKED TO', { exact: true })).toBeVisible()
    await expect(drawer.getByRole('button', { name: 'Delete contact' })).toBeDisabled()

    const vendorLink = drawer.getByRole('button', { name: /Kailash Ceramics/ })
    await expect(vendorLink).toContainText('Vendor')
    await expect(vendorLink).toContainText('V00001')
    await expect(vendorLink).toContainText('Primary')
    await vendorLink.click()

    await expect(page).toHaveURL(/\/purchasing\/vendors\?sel=V00001/)
    await expect(page.getByRole('complementary', { name: 'Vendor V00001' })).toBeVisible()
  })

  test('validates, creates, edits, deletes a contact, and opens a new contact with N', async ({ page }) => {
    await page.goto('/people/contacts')

    // Validation first when submitting blank name and bad phone.
    await page.getByRole('button', { name: 'New contact' }).click()
    const newDrawer = page.getByRole('complementary', { name: 'New contact' })
    await expect(newDrawer).toBeVisible()

    await newDrawer.getByLabel('Phone', { exact: true }).fill('1234')
    await newDrawer.getByRole('button', { name: 'Create contact' }).click()
    await expect(newDrawer.getByText('Enter the person’s name.')).toBeVisible()
    await expect(newDrawer.getByText(/10-digit mobile/)).toBeVisible()

    // Fill valid values and create CON00035.
    await newDrawer.getByLabel('Name', { exact: true }).fill('Meena Sundaram')
    await newDrawer.getByLabel('Phone', { exact: true }).fill('98840 12345')
    await newDrawer.getByLabel('Email', { exact: true }).fill('meena@sundaram.example')
    await newDrawer.getByRole('button', { name: 'Create contact' }).click()

    const createdDrawer = page.getByRole('complementary', { name: 'Contact CON00035' })
    await expect(createdDrawer).toBeVisible()
    await expect(createdDrawer.getByText('98840 12345')).toBeVisible()
    await expect(createdDrawer.getByText('meena@sundaram.example')).toBeVisible()
    await expect(createdDrawer.getByRole('button', { name: 'Delete contact' })).toBeEnabled()

    // Edit in place.
    await createdDrawer.getByRole('button', { name: 'Edit' }).click()
    const editDrawer = page.getByRole('complementary', { name: 'Edit contact' })
    await editDrawer.getByLabel('Name', { exact: true }).fill('Meena S.')
    await editDrawer.getByLabel('Notes', { exact: true }).fill('Morning dispatch desk')
    await editDrawer.getByRole('button', { name: 'Save changes' }).click()

    await expect(createdDrawer).toBeVisible()
    await expect(createdDrawer.getByText('Meena S.').first()).toBeVisible()
    await expect(createdDrawer.getByText('Morning dispatch desk')).toBeVisible()

    // Delete unlinked contact.
    await createdDrawer.getByRole('button', { name: 'Delete contact' }).click()
    const confirm = page.getByRole('dialog')
    await expect(confirm).toBeVisible()
    await confirm.getByRole('button', { name: 'Delete contact' }).click()
    await expect(createdDrawer).toHaveCount(0)
    await expect(page.getByText('34 contacts')).toBeVisible()

    // Keyboard shortcut N opens a new contact drawer.
    await page.keyboard.press('n')
    await expect(page.getByRole('complementary', { name: 'New contact' })).toBeVisible()
  })
})
