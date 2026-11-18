import { expect, test } from '@playwright/test'

test.describe('Vendor profile ▸ Contacts tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/purchasing/vendors/V00001?tab=contacts')
    await expect(page.getByRole('heading', { name: 'Kailash Ceramics Works', level: 1 })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Contacts' })).toHaveAttribute('aria-selected', 'true')
  })

  test('lists V00001 contacts with Primary, links another contact, sets primary, and unlinks without deleting', async ({
    page,
  }) => {
    await expect(page.getByText('People at this vendor')).toBeVisible()

    const murugesanRow = page.getByRole('row', { name: /Murugesan Pillai/ })
    await expect(murugesanRow).toContainText('Owner')
    await expect(murugesanRow).toContainText('94421 10287')
    await expect(murugesanRow).toContainText('orders@kailashceramics.example')
    await expect(murugesanRow).toContainText('Primary')

    await expect(page.getByRole('row', { name: /Selvi Murugesan/ })).toContainText('Accounts')
    await expect(page.getByRole('row', { name: /Raghu Anand/ })).toContainText('Kiln dispatch')

    // Link another contact (Karthik R., CON00001 — already linked to carrier STC).
    await page.getByRole('button', { name: 'Add contact', exact: true }).click()
    const pop = page.locator('[data-lk-pop]')
    await expect(pop).toBeVisible()
    // Already-linked contacts on V00001 are excluded from the picker.
    await expect(pop.getByRole('option', { name: /Murugesan Pillai/ })).toHaveCount(0)

    await pop.getByRole('combobox', { name: 'Search contacts' }).fill('Karthik')
    await pop.getByRole('option', { name: /Karthik R\./ }).click()

    const karthikRow = page.getByRole('row', { name: /Karthik R\./ })
    await expect(karthikRow).toBeVisible()
    await expect(karthikRow).toContainText('Also on 1')
    await expect(karthikRow).toContainText('94431 52876')

    // Set the newly linked contact as primary and verify it persists across reload.
    await karthikRow.getByRole('button', { name: 'Make primary' }).click()
    await expect(karthikRow).toContainText('Primary')
    await expect(murugesanRow.getByRole('button', { name: 'Make primary' })).toBeVisible()

    await page.reload()
    await expect(page.getByRole('row', { name: /Karthik R\./ })).toContainText('Primary')

    // Shared-edit warning shows when editing a shared contact.
    await page.getByRole('row', { name: /Karthik R\./ }).getByRole('button', { name: 'Edit' }).click()
    await expect(page.getByText(/Shared by 2 records/)).toBeVisible()
    await page.getByRole('button', { name: 'Cancel' }).click()

    // Unlink removes the link from V00001 and promotes the next link to Primary, without deleting CON00001.
    await page.getByRole('row', { name: /Karthik R\./ }).getByRole('button', { name: 'Unlink' }).click()
    await expect(page.getByRole('row', { name: /Karthik R\./ })).toHaveCount(0)
    await expect(page.getByRole('row', { name: /Murugesan Pillai/ })).toContainText('Primary')

    await page.goto('/people/contacts?sel=CON00001')
    await expect(page.getByRole('complementary', { name: 'Contact CON00001' })).toBeVisible()
  })
})
