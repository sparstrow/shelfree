import { expect, test } from '@playwright/test'

test.describe('Customer profile ▸ Sales prices & Contacts tabs', () => {
  test('Sales prices tab lists agreed prices, creates/edits inline, and opens Sales Prices filtered & pre-filled', async ({
    page,
  }) => {
    await page.goto('/sales/customers/CUS00001?tab=prices')
    await expect(page.getByRole('heading', { name: 'Sri Annamalaiyar Pooja Stores', level: 1 })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Sales prices' })).toHaveAttribute('aria-selected', 'true')

    await expect(page.getByText('5 agreed prices')).toBeVisible()
    await expect(page.getByText('On customer pricing', { exact: true })).toBeVisible()
    await expect(page.getByRole('row', { name: /ASH-PWH-18/ })).toHaveCount(2)
    await expect(page.getByRole('row', { name: /ASH-TER-18/ })).toHaveCount(1)

    // Add a new agreed price inline: validation error first, then valid
    await page.getByRole('button', { name: 'New price', exact: true }).click()
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.getByText('Pick an item.')).toBeVisible()
    await expect(page.getByText('Enter a price of 0 or more.')).toBeVisible()

    await page.getByLabel('Item', { exact: true }).selectOption('ASH-BLK-18')
    await page.getByLabel('Price ₹', { exact: true }).fill('385')
    await page.getByRole('button', { name: 'Save', exact: true }).click()

    await expect(page.getByText('6 agreed prices')).toBeVisible()
    const newRow = page.getByRole('row', { name: /ASH-BLK-18/ })
    await expect(newRow).toContainText('₹385.00')

    await page.reload()
    await expect(page.getByText('6 agreed prices')).toBeVisible()

    // Inline price edit on the tab
    await page.getByRole('row', { name: /ASH-BLK-18/ }).locator('[data-col-key="price"]').click()
    await page.getByLabel('Edit ASH-BLK-18 Price ₹', { exact: true }).fill('380')
    await page.keyboard.press('Enter')
    await expect(page.getByRole('row', { name: /ASH-BLK-18/ })).toContainText('₹380.00')

    // Action opens Sales Prices filtered to CUS00001 and pre-fills New customer price
    await page.getByRole('button', { name: 'Open in Sales prices', exact: true }).click()
    await expect(page).toHaveURL(/\/sales\/sales-prices\?customer=CUS00001$/)
    await expect(page.getByText('Showing 1–6 of 6 customer prices')).toBeVisible()

    await page.getByRole('button', { name: 'New customer price', exact: true }).click()
    const drawer = page.getByRole('complementary', { name: 'New customer price' })
    await expect(drawer.getByLabel('Customer', { exact: true })).toHaveValue('CUS00001')
  })

  test('Contacts tab lists contacts, links via picker, sets primary, warns on shared edit, and unlinks without deleting', async ({
    page,
  }) => {
    await page.goto('/sales/customers/CUS00001?tab=contacts')
    await expect(page.getByRole('heading', { name: 'Sri Annamalaiyar Pooja Stores', level: 1 })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Contacts' })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByText('People at this account')).toBeVisible()

    const ganesanRow = page.getByRole('row', { name: /Ganesan Murthy/ })
    await expect(ganesanRow).toContainText('Owner')
    await expect(ganesanRow).toContainText('94420 11562')
    await expect(ganesanRow).toContainText('orders@annamalaiyarpooja.example')
    await expect(ganesanRow).toContainText('Primary')
    await expect(page.getByRole('row', { name: /Vasanthi Ganesan/ })).toContainText('Accounts')

    // Link another contact (Karthik R., CON00001 — already linked to carrier STC)
    await page.getByRole('button', { name: 'Add contact', exact: true }).click()
    const pop = page.locator('[data-lk-pop]')
    await expect(pop).toBeVisible()
    await expect(pop.getByRole('option', { name: /Ganesan Murthy/ })).toHaveCount(0)

    await pop.getByRole('combobox', { name: 'Search contacts' }).fill('Karthik')
    await pop.getByRole('option', { name: /Karthik R\./ }).click()

    const karthikRow = page.getByRole('row', { name: /Karthik R\./ })
    await expect(karthikRow).toBeVisible()
    await expect(karthikRow).toContainText('Also on 1')
    await expect(karthikRow).toContainText('94431 52876')

    // Set primary and persist across reload
    await karthikRow.getByRole('button', { name: 'Make primary' }).click()
    await expect(karthikRow).toContainText('Primary')
    await expect(ganesanRow.getByRole('button', { name: 'Make primary' })).toBeVisible()

    await page.reload()
    await expect(page.getByRole('row', { name: /Karthik R\./ })).toContainText('Primary')

    // Shared-edit warning shows when editing a shared contact
    await page.getByRole('row', { name: /Karthik R\./ }).getByRole('button', { name: 'Edit' }).click()
    await expect(page.getByText(/Shared by 2 records/)).toBeVisible()
    await page.getByRole('button', { name: 'Cancel' }).click()

    // Unlink promotes next link back to Primary and leaves CON00001 intact in People › Contacts
    await page.getByRole('row', { name: /Karthik R\./ }).getByRole('button', { name: 'Unlink' }).click()
    await expect(page.getByRole('row', { name: /Karthik R\./ })).toHaveCount(0)
    await expect(page.getByRole('row', { name: /Ganesan Murthy/ })).toContainText('Primary')

    await page.goto('/people/contacts?sel=CON00001')
    await expect(page.getByRole('complementary', { name: 'Contact CON00001' })).toBeVisible()
  })
})
