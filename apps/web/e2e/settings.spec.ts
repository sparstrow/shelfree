import { type Page, expect, test } from '@playwright/test'

const popover = (page: Page) => page.locator('[data-slot="popover-content"]')

test.describe('Settings ▸ frame and navigation', () => {
  test('/settings lands on Business profile and every section is reachable', async ({ page }) => {
    await page.goto('/settings')
    await expect(page).toHaveURL(/\/settings\/ws-profile$/)
    await expect(page.getByRole('heading', { name: 'Business profile', level: 1 })).toBeVisible()
    await expect(page.getByLabel('Business name', { exact: true })).toHaveValue('Kanalora')

    const nav = page.getByRole('navigation', { name: 'Settings' })
    await nav.getByRole('button', { name: 'Warehouse', exact: true }).click()
    await nav.getByRole('link', { name: 'Units of measure', exact: true }).click()
    await expect(page).toHaveURL(/\/warehouse\/settings\/uom$/)
    await expect(page.getByRole('heading', { name: 'Units of measure', level: 1 })).toBeVisible()

    // Return to central Settings and open a section still in the prototype.
    await nav.getByRole('link', { name: 'All settings', exact: true }).click()
    await expect(page).toHaveURL(/\/settings\/ws-profile$/)
    await nav.getByRole('button', { name: 'Finance', exact: true }).click()
    await nav.getByRole('link', { name: 'Tax settings', exact: true }).click()
    await expect(page).toHaveURL(/\/finance\/settings\/cfg-taxset$/)
    await expect(page.getByText('has not been moved to the new app yet')).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Tax settings', exact: true })).toHaveAttribute('aria-current', 'page')

    // Personal sections live in central Settings too.
    await nav.getByRole('link', { name: 'All settings', exact: true }).click()
    await nav.getByRole('link', { name: 'Profile', exact: true }).click()
    await expect(page).toHaveURL(/\/settings\/me-profile$/)
    await expect(nav.getByRole('link', { name: 'Security', exact: true })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Business profile', exact: true })).toBeVisible()
  })

  test('the sidebar entries open Settings and My settings', async ({ page }) => {
    await page.goto('/')
    await page.locator('aside a[href="/settings"]').click()
    await expect(page).toHaveURL(/\/settings\/ws-profile$/)
    await page.getByRole('button', { name: 'Account menu', exact: true }).click()
    await page.getByRole('menuitem', { name: 'My settings', exact: true }).click()
    await expect(page).toHaveURL(/\/settings\/me-profile$/)
  })

  test('an unknown section is not found', async ({ page }) => {
    await page.goto('/settings/nope')
    await expect(page.getByText('Page not found')).toBeVisible()
  })
})

test.describe('Quiet help', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings/ws-profile')
    await expect(page.getByLabel('Business name', { exact: true })).toBeVisible()
  })

  test('hover opens after a moment, leaving closes, click pins, Esc closes', async ({ page }) => {
    const label = page.locator('[data-row="name"] label')
    await label.hover()
    await expect(popover(page)).toBeVisible()
    await expect(popover(page)).toContainText('The name people know you by')
    await page.mouse.move(700, 600)
    await expect(popover(page)).toBeHidden()

    const info = page.getByRole('button', { name: 'About Business name', exact: true })
    await expect(info).toHaveAttribute('aria-expanded', 'false')
    await info.click()
    await expect(info).toHaveAttribute('aria-expanded', 'true')
    await page.mouse.move(700, 600)
    await page.waitForTimeout(400)
    await expect(popover(page)).toBeVisible() // pinned: stays after the pointer leaves
    await page.keyboard.press('Escape')
    await expect(popover(page)).toBeHidden()
    await expect(info).toHaveAttribute('aria-expanded', 'false')
  })

  test('✕ and a click outside close a pinned description', async ({ page }) => {
    const info = page.getByRole('button', { name: 'About Legal / registered name', exact: true })
    await info.click()
    await expect(popover(page)).toBeVisible()
    await popover(page).getByRole('button', { name: 'Close', exact: true }).click()
    await expect(popover(page)).toBeHidden()

    await info.click()
    await expect(popover(page)).toBeVisible()
    await page.getByRole('heading', { name: 'Contact', level: 2 }).click()
    await expect(popover(page)).toBeHidden()
  })

  test('keyboard: focusing ⓘ opens it, Enter pins it', async ({ page }) => {
    await page.getByLabel('Business name', { exact: true }).focus()
    await page.keyboard.press('Shift+Tab') // onto the ⓘ before the field
    const info = page.getByRole('button', { name: 'About Business name', exact: true })
    await expect(info).toBeFocused()
    await expect(popover(page)).toBeVisible()
    await page.keyboard.press('Enter')
    await expect(popover(page)).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(popover(page)).toBeHidden()
  })

  test('the ? key shows every description inline and ? again hides them', async ({ page }) => {
    const text = 'The name people know you by'
    await expect(page.getByText(text)).toHaveCount(0)
    await page.locator('body').click({ position: { x: 5, y: 5 } })
    await page.keyboard.press('?')
    await expect(page.getByText(text)).toBeVisible()
    await page.keyboard.press('?')
    await expect(page.getByText(text)).toHaveCount(0)

    // Typing a ? into a field never toggles it.
    await page.getByLabel('Business name', { exact: true }).fill('Kanalora?')
    await expect(page.getByText(text)).toHaveCount(0)
  })

  test('the inline choice is remembered', async ({ page }) => {
    await page.locator('body').click({ position: { x: 5, y: 5 } })
    await page.keyboard.press('?')
    await expect(page.getByText('The name people know you by')).toBeVisible()
    await page.reload()
    await expect(page.getByText('The name people know you by')).toBeVisible()
  })
})

test.describe('Business profile: dirty, save, discard, leave guard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings/ws-profile')
    await expect(page.getByLabel('Business name', { exact: true })).toBeVisible()
  })

  test('counts changes, discards, and saves with Ctrl+S', async ({ page }) => {
    const name = page.getByLabel('Business name', { exact: true })
    const save = page.getByRole('button', { name: 'Save', exact: true })
    const discard = page.getByRole('button', { name: 'Discard', exact: true })
    await expect(page.getByText('No unsaved changes')).toBeVisible()
    await expect(save).toBeDisabled()

    await name.fill('Kanalora Crafts')
    await page.getByLabel('City', { exact: true }).fill('Chengam')
    await expect(page.getByText('2 unsaved changes')).toBeVisible()
    await expect(save).toBeEnabled()

    await discard.click()
    await expect(name).toHaveValue('Kanalora')
    await expect(page.getByLabel('City', { exact: true })).toHaveValue('Tiruvannamalai')
    await expect(page.getByText('No unsaved changes')).toBeVisible()

    // Editing back to the saved value is not a change.
    await name.fill('Kanalora x')
    await expect(page.getByText('1 unsaved change')).toBeVisible()
    await name.fill('Kanalora')
    await expect(page.getByText('No unsaved changes')).toBeVisible()

    await name.fill('Kanalora Crafts')
    await page.keyboard.press('Control+s')
    await expect(page.getByText('No unsaved changes')).toBeVisible()
    await expect(page.getByText('Saved', { exact: true })).toBeVisible()
    await page.reload()
    await expect(page.getByLabel('Business name', { exact: true })).toHaveValue('Kanalora Crafts')
    // The sidebar follows the saved name.
    await expect(page.getByText('Kanalora Crafts · Inventory', { exact: true })).toBeVisible()
  })

  test('Esc discards unsaved changes', async ({ page }) => {
    const name = page.getByLabel('Business name', { exact: true })
    await name.fill('Something else')
    await page.keyboard.press('Escape')
    await expect(name).toHaveValue('Kanalora')
    await expect(page.getByText('No unsaved changes')).toBeVisible()
  })

  test('blocks saving an invalid value and explains why', async ({ page }) => {
    await page.getByLabel('Business name', { exact: true }).fill('')
    await page.getByLabel('Postal code', { exact: true }).fill('12')
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.getByText('Enter a business name.')).toBeVisible()
    await expect(page.getByText('Enter a six-digit PIN code.')).toBeVisible()
    await expect(page.getByText('2 unsaved changes')).toBeVisible()
  })

  test('warns, without blocking, when the PAN looks wrong', async ({ page }) => {
    await page.getByLabel('PAN', { exact: true }).fill('abc')
    await expect(page.getByText('A PAN is 5 letters, 4 digits, 1 letter')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeEnabled()
  })

  test('leaving with unsaved changes asks first: keep editing, discard, or save', async ({ page }) => {
    const nav = page.getByRole('navigation', { name: 'Settings' })
    const name = page.getByLabel('Business name', { exact: true })
    await name.fill('Kanalora Holdings')

    await nav.getByRole('link', { name: 'Keyboard shortcuts', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Leave without saving?' })
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: 'Keep editing', exact: true }).click()
    await expect(page).toHaveURL(/\/settings\/ws-profile$/)
    await expect(name).toHaveValue('Kanalora Holdings')

    await nav.getByRole('link', { name: 'Keyboard shortcuts', exact: true }).click()
    await page.getByRole('dialog', { name: 'Leave without saving?' }).getByRole('button', { name: 'Discard and leave', exact: true }).click()
    await expect(page).toHaveURL(/\/settings\/shortcuts$/)

    await nav.getByRole('link', { name: 'Business profile', exact: true }).click()
    await expect(page.getByLabel('Business name', { exact: true })).toHaveValue('Kanalora')

    await page.getByLabel('Business name', { exact: true }).fill('Kanalora Holdings')
    await nav.getByRole('link', { name: 'Keyboard shortcuts', exact: true }).click()
    await page.getByRole('dialog', { name: 'Leave without saving?' }).getByRole('button', { name: 'Save and leave', exact: true }).click()
    await expect(page).toHaveURL(/\/settings\/shortcuts$/)
    await nav.getByRole('link', { name: 'Business profile', exact: true }).click()
    await expect(page.getByLabel('Business name', { exact: true })).toHaveValue('Kanalora Holdings')
  })
})

test.describe('Settings ▸ Units of measure', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/warehouse/settings/uom')
    await expect(page.getByRole('row', { name: /PNL/ })).toBeVisible()
  })

  test('lists defaults (locked) and the business’s own units, and filters', async ({ page }) => {
    await expect(page.getByRole('row', { name: /^NOS Numbers/ })).toContainText('Default')
    await expect(page.getByRole('row', { name: /^PNL Panel/ })).toContainText('Custom')
    await expect(page.getByRole('row', { name: /^DOZ/ })).toContainText('1 DOZ = 12 NOS')

    await page.getByRole('button', { name: 'Weight', exact: true }).click()
    await expect(page.getByRole('row', { name: /^KG Kilogram/ })).toBeVisible()
    await expect(page.getByRole('row', { name: /^PNL/ })).toHaveCount(0)
    await page.getByRole('button', { name: 'All', exact: true }).click()

    await page.getByLabel('Search units', { exact: true }).fill('running')
    await expect(page.getByRole('row', { name: /^RFT/ })).toBeVisible()
    await expect(page.getByRole('row', { name: /^NOS/ })).toHaveCount(0)
    await page.getByLabel('Search units', { exact: true }).fill('zzzz')
    await expect(page.getByText('No units match.')).toBeVisible()
  })

  test('adds, edits and deletes a unit', async ({ page }) => {
    await page.getByRole('button', { name: 'New unit', exact: true }).click()
    const form = page.getByRole('dialog', { name: 'New unit' })
    await form.getByLabel('Code', { exact: true }).fill('bx12')
    await form.getByLabel('Name', { exact: true }).fill('Box of 12')
    await form.getByLabel('Conversion factor', { exact: true }).fill('12')
    await expect(form.getByText('1 BX12 = 12 NOS')).toBeVisible()
    await form.getByRole('button', { name: 'Add unit', exact: true }).click()
    const row = page.getByRole('row', { name: /^BX12 Box of 12/ })
    await expect(row).toContainText('1 BX12 = 12 NOS')
    await expect(row).toContainText('Custom')

    await row.dblclick()
    const edit = page.getByRole('dialog', { name: 'Edit BX12' })
    await edit.getByLabel('Name', { exact: true }).fill('Carton of 12')
    await edit.getByLabel('Conversion factor', { exact: true }).fill('24')
    await edit.getByRole('button', { name: 'Save unit', exact: true }).click()
    await expect(page.getByRole('row', { name: /^BX12 Carton of 12/ })).toContainText('1 BX12 = 24 NOS')

    await page.getByRole('row', { name: /^BX12/ }).click({ button: 'right' })
    await page.getByRole('menuitem', { name: 'Delete', exact: true }).click()
    await page.getByRole('alertdialog').or(page.getByRole('dialog', { name: 'Delete BX12?' })).getByRole('button', { name: 'Delete', exact: true }).click()
    await expect(page.getByRole('row', { name: /^BX12/ })).toHaveCount(0)

    await page.getByRole('button', { name: 'Undo', exact: true }).click()
    await expect(page.getByRole('row', { name: /^BX12/ })).toBeVisible()
  })

  test('validates the form: required, duplicate code', async ({ page }) => {
    await page.keyboard.press('n')
    const form = page.getByRole('dialog', { name: 'New unit' })
    await form.getByRole('button', { name: 'Add unit', exact: true }).click()
    await expect(form.getByText('Enter a short code (e.g. PNL).')).toBeVisible()
    await expect(form.getByText('Enter a name for the unit.')).toBeVisible()
    await form.getByLabel('Code', { exact: true }).fill('nos')
    await form.getByLabel('Name', { exact: true }).fill('Dup')
    await form.getByRole('button', { name: 'Add unit', exact: true }).click()
    await expect(form.getByText('Code NOS already exists. Pick another.')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(form).toBeHidden()
  })

  test('blocks deleting a default unit', async ({ page }) => {
    const nos = page.getByRole('row', { name: /^NOS Numbers/ })
    await nos.click({ button: 'right' })
    await expect(page.getByRole('menuitem', { name: 'Delete', exact: true })).toHaveAttribute('aria-disabled', 'true')
    await expect(page.getByRole('menuitem', { name: 'Edit', exact: true })).toHaveAttribute('aria-disabled', 'true')
    await page.keyboard.press('Escape')

    await nos.click()
    await page.keyboard.press('Delete')
    await expect(page.getByText('NOS can’t be deleted')).toBeVisible()
    await expect(page.getByRole('row', { name: /^NOS Numbers/ })).toBeVisible()
  })

  test('blocks deleting a unit an item uses, and fixes its code', async ({ page }) => {
    // Put a custom unit on an item, then reload so the page reads it back.
    await page.evaluate(async () => {
      const mod = (await import('/src/data/api/index.ts')) as typeof import('@/data/api')
      const [item] = await mod.api.items.list()
      await mod.api.items.upsert({ ...item, uom: 'PNL' })
    })
    await page.reload()
    const row = page.getByRole('row', { name: /^PNL Panel/ })
    await row.click({ button: 'right' })
    await expect(page.getByRole('menuitem', { name: 'Delete', exact: true })).toHaveAttribute('aria-disabled', 'true')
    await page.keyboard.press('Escape')

    await row.click()
    await page.keyboard.press('Delete')
    await expect(page.getByText('PNL can’t be deleted')).toBeVisible()
    await expect(page.getByText('1 item uses PNL. Change its unit first.')).toBeVisible()

    await row.dblclick()
    await expect(page.getByRole('dialog', { name: 'Edit PNL' }).getByLabel('Code', { exact: true })).toBeDisabled()
  })

  test('keyboard: arrows move, E edits, / searches', async ({ page }) => {
    await page.getByRole('row', { name: /^RFT/ }).click()
    await page.keyboard.press('ArrowUp')
    await expect(page.getByRole('row', { name: /^PNL/ })).toHaveAttribute('aria-selected', 'true')
    await page.keyboard.press('e')
    await expect(page.getByRole('dialog', { name: 'Edit PNL' })).toBeVisible()
    await page.keyboard.press('Escape')
    await page.keyboard.press('/')
    await expect(page.getByLabel('Search units', { exact: true })).toBeFocused()
  })

  test('column help opens from the header', async ({ page }) => {
    await page.getByRole('button', { name: 'About GST UQC', exact: true }).click()
    await expect(popover(page)).toContainText('Unique Quantity Code')
    await page.keyboard.press('Escape')
  })
})

test.describe('Settings ▸ Keyboard shortcuts', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings/shortcuts')
    await expect(page.getByRole('heading', { name: 'Keyboard shortcuts', level: 1 })).toBeVisible()
  })

  test('lists the list-page and record-page keys, and page keys from their source', async ({ page }) => {
    const charges = page.getByRole('region', { name: 'Charges' })
    await expect(charges).toContainText('New charge')
    await expect(charges.getByText('Ctrl/Cmd + Enter or Ctrl/Cmd + S')).toBeVisible()

    const record = page.getByRole('region', { name: /^Record pages/ })
    await expect(record.getByText('[ / ]', { exact: true })).toBeVisible()
    await expect(record.getByText('1…9, 0', { exact: true })).toBeVisible()

    const po = page.getByRole('region', { name: 'Purchase orders', exact: true })
    await expect(po.getByText('R', { exact: true })).toBeVisible()
    await expect(po).toContainText('goods-in receipt')

    const prices = page.getByRole('region', { name: 'Purchase prices', exact: true })
    await expect(prices.getByText('Shift + P', { exact: true })).toBeVisible()
  })

  test('search filters the catalogue, / focuses it, Esc clears it', async ({ page }) => {
    const search = page.getByLabel('Search shortcuts', { exact: true })
    await page.locator('body').click({ position: { x: 5, y: 5 } })
    await page.keyboard.press('/')
    await expect(search).toBeFocused()

    await search.fill('goods-in receipt')
    await expect(page.getByRole('region', { name: 'Purchase orders', exact: true })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Charges' })).toHaveCount(0)

    await search.fill('zzzz')
    await expect(page.getByText('No shortcuts match')).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(search).toHaveValue('')
    await expect(page.getByRole('region', { name: 'Charges' })).toBeVisible()
  })
})

test.describe('Quiet help on touch', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } })

  test('ⓘ is always visible with a 44 px target and opens a bottom sheet', async ({ page }) => {
    await page.goto('/settings/ws-profile')
    const info = page.getByRole('button', { name: 'About Business name', exact: true })
    await expect(info).toBeVisible()
    const box = await info.boundingBox()
    expect(box?.width).toBeGreaterThanOrEqual(44)
    expect(box?.height).toBeGreaterThanOrEqual(44)
    await info.tap()
    const sheet = page.getByRole('dialog', { name: 'Business name' })
    await expect(sheet).toBeVisible()
    await expect(sheet).toContainText('The name people know you by')
    await sheet.getByRole('button', { name: 'Close', exact: true }).tap()
    await expect(sheet).toBeHidden()
  })
})
