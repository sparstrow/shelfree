import { expect, test } from '@playwright/test'

test.describe('Warehouse ▸ Item card', () => {
  test('new item from Items list opens /warehouse/items/new with next number, validates, and saves into list', async ({
    page,
  }) => {
    await page.goto('/warehouse/items')
    await page.getByRole('button', { name: 'New item' }).click()

    await expect(page).toHaveURL(/\/warehouse\/items\/new$/)
    await expect(page.getByRole('heading', { name: 'New item', exact: true })).toBeVisible()

    const noInput = page.getByLabel('Item no.', { exact: true })
    await expect(noInput).toHaveValue(/^ITM\d{5}$/)
    const nextNo = await noInput.inputValue()

    // Save blocked when required fields are empty
    await page.getByRole('button', { name: 'Create item' }).click()
    await expect(page.getByText('A description is required.')).toBeVisible()
    await expect(page).toHaveURL(/\/warehouse\/items\/new$/)

    await page.getByLabel('Description', { exact: true }).fill('Terracotta Lotus Holder')
    await page.getByRole('button', { name: 'Create item' }).click()
    await expect(page.getByText('Choose a category for this item.')).toBeVisible()

    await page.getByLabel('Category', { exact: true }).selectOption('Sambrani Holder')
    await page.getByLabel('Unit price', { exact: true }).fill('-10')
    await page.getByRole('button', { name: 'Create item' }).click()
    await expect(page.getByText('Unit price cannot be negative.')).toBeVisible()

    await page.getByLabel('Unit price', { exact: true }).fill('325')
    await page.getByLabel('Unit cost', { exact: true }).fill('195')
    await expect(page.getByText('40%', { exact: true })).toBeVisible()
    await page.getByLabel('Sellable', { exact: true }).click()

    await page.getByRole('button', { name: 'Create item' }).click()

    await expect(page).toHaveURL(new RegExp(`/warehouse/items/?\\?sel=${nextNo}$`))
    await expect(page.getByText(nextNo).first()).toBeVisible()
    await expect(page.getByText('Terracotta Lotus Holder').first()).toBeVisible()
  })

  test('edit from Item profile opens card filled, saves updated price back to profile, and Esc returns', async ({
    page,
  }) => {
    await page.goto('/warehouse/items/ASH-PWH-18')
    await page.getByRole('button', { name: /^Edit/ }).click()

    await expect(page).toHaveURL(/\/warehouse\/items\/ASH-PWH-18\/edit$/)
    await expect(page.getByRole('heading', { name: 'Edit item', exact: true })).toBeVisible()

    const noInput = page.getByLabel('Item no.', { exact: true })
    await expect(noInput).toHaveValue('ASH-PWH-18')
    await expect(noInput).toBeDisabled()
    await expect(page.getByLabel('Description', { exact: true })).toHaveValue(
      'Arunachala Mountain Sambrani Holder, Pearl White',
    )
    await expect(page.getByLabel('Category', { exact: true })).toHaveValue('Sambrani Holder')

    await page.getByLabel('Unit price', { exact: true }).fill('777')
    await page.getByRole('button', { name: 'Save changes' }).click()

    await expect(page).toHaveURL(/\/warehouse\/items\/ASH-PWH-18$/)
    await expect(page.getByText('₹777.00').first()).toBeVisible()

    // Esc discards unsaved edits and returns to the profile
    await page.getByRole('button', { name: /^Edit/ }).click()
    await expect(page).toHaveURL(/\/warehouse\/items\/ASH-PWH-18\/edit$/)
    await page.getByLabel('Unit price', { exact: true }).fill('999')
    await page.getByRole('heading', { name: 'Edit item', exact: true }).click()
    await page.keyboard.press('Escape')

    await expect(page).toHaveURL(/\/warehouse\/items\/ASH-PWH-18$/)
    await expect(page.getByText('₹777.00').first()).toBeVisible()
    await expect(page.getByText('₹999.00')).toHaveCount(0)
  })

  test('Ctrl/Cmd+S commits edits and Esc from /warehouse/items/new returns to the list', async ({
    page,
  }) => {
    await page.goto('/warehouse/items')
    await page.getByRole('button', { name: 'New item' }).click()
    await expect(page).toHaveURL(/\/warehouse\/items\/new$/)
    await expect(page.getByLabel('Item no.', { exact: true })).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(page).toHaveURL(/\/warehouse\/items\/?$/)

    await page.goto('/warehouse/items/ASH-PWH-18/edit')
    await page.getByLabel('Unit price', { exact: true }).fill('825')
    await page.keyboard.press('ControlOrMeta+s')

    await expect(page).toHaveURL(/\/warehouse\/items\/ASH-PWH-18$/)
    await expect(page.getByText('₹825.00').first()).toBeVisible()
  })
})
