import { type Page, expect, test } from '@playwright/test'

const VENDORS = '/purchasing/vendors'

/** The Views button in the list toolbar. */
const viewsButton = (page: Page) => page.getByTitle('Saved views')
const dirtyMark = (page: Page) => viewsButton(page).getByRole('img', { name: 'Unsaved changes' })
const viewsMenu = (page: Page) => page.getByRole('menu')
/** The row of one view in the open Views menu (its buttons are labelled "Rename", "Delete"…). */
const viewRow = (page: Page, name: string) => viewsMenu(page).getByRole('group', { name, exact: true })
const favRows = (page: Page) => page.locator('[data-fav-row]')

/** Filter the grid to vendors whose No. contains `text` (adds the filter on first use, edits it after). */
async function filterNo(page: Page, text: string) {
  if (await page.getByRole('button', { name: 'Remove No. filter' }).count()) {
    await page.getByTitle('Edit value').click()
  } else {
    await page.getByRole('button', { name: 'Add filter' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'No.', exact: true }).click()
    await page.keyboard.press('Escape')
    await page.getByTitle('Edit value').click()
  }
  await page.getByLabel('No. value').fill(text)
  await page.keyboard.press('Escape')
  await expect(page.getByLabel('No. value')).toHaveCount(0)
}

async function openViews(page: Page) {
  if (!(await viewsMenu(page).isVisible())) await viewsButton(page).click()
  await expect(viewsMenu(page)).toBeVisible()
}

async function saveAs(page: Page, name: string) {
  await openViews(page)
  await viewsMenu(page).getByRole('menuitem', { name: 'Save as new view' }).click()
  await viewsMenu(page).getByLabel('View name').fill(name)
  await page.keyboard.press('Enter')
  await expect(viewsMenu(page)).toBeHidden()
}

test.describe('Saved views', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(VENDORS)
    await expect(page.getByText('Showing 1–6 of 6 vendors')).toBeVisible()
  })

  test('save, change (dirty), update, rename, set default, reload, delete and undo', async ({ page }) => {
    await filterNo(page, 'V00001')
    await expect(page.getByText('Showing 1–1 of 1 vendor')).toBeVisible()
    // A built-in view with a filter you added is dirty.
    await expect(dirtyMark(page)).toBeVisible()

    await saveAs(page, 'Mine')
    await expect(viewsButton(page)).toContainText('Mine')
    await expect(dirtyMark(page)).toHaveCount(0)

    // Change the filter: the saved view is dirty until updated.
    await filterNo(page, 'V00002')
    await expect(dirtyMark(page)).toBeVisible()
    await openViews(page)
    await viewsMenu(page).getByRole('menuitem', { name: 'Save changes to this view' }).click()
    await expect(page.getByText('View updated')).toBeVisible()
    await expect(dirtyMark(page)).toHaveCount(0)

    // Another view with the same name gets a number.
    await saveAs(page, 'Mine')
    await expect(viewsButton(page)).toContainText('Mine 2')

    // Rename.
    await openViews(page)
    await viewRow(page, 'Mine 2').getByRole('menuitem', { name: 'Rename' }).click()
    await viewsMenu(page).getByLabel('Rename Mine 2').fill('Second')
    await page.keyboard.press('Enter')
    await expect(viewsButton(page)).toContainText('Second')

    // Default: the page opens with it after a reload.
    await openViews(page)
    await viewRow(page, 'Second').getByRole('menuitem', { name: 'Make default' }).click()
    await expect(page.getByText('Default view set')).toBeVisible()
    await page.reload()
    await expect(viewsButton(page)).toContainText('Second')
    await expect(page.getByText('Showing 1–1 of 1 vendor')).toBeVisible()

    // Delete, then undo.
    await openViews(page)
    await viewRow(page, 'Second').getByRole('menuitem', { name: 'Delete' }).click()
    await expect(viewsMenu(page)).toBeHidden()
    await expect(page.getByText('View deleted')).toBeVisible()
    await expect(viewsButton(page)).toContainText('All vendors')
    await page.getByRole('button', { name: 'Undo' }).click()
    await expect(page.getByText('View restored')).toBeVisible()
    await openViews(page)
    await expect(viewRow(page, 'Second')).toBeVisible()
  })

  test('Ctrl+S updates the active view; Ctrl+Shift+S opens save as', async ({ page }) => {
    await page.keyboard.press('Control+Shift+S')
    await expect(viewsMenu(page).getByLabel('View name')).toBeVisible()
    await viewsMenu(page).getByLabel('View name').fill('Keys')
    await page.keyboard.press('Enter')
    await expect(viewsButton(page)).toContainText('Keys')

    await filterNo(page, 'V00003')
    await expect(dirtyMark(page)).toBeVisible()
    await page.keyboard.press('Control+S')
    await expect(page.getByText('View updated')).toBeVisible()
    await expect(dirtyMark(page)).toHaveCount(0)
  })
})

test.describe('Sidebar favorites', () => {
  test('pin a view, open it from another page, rename it, reorder, remove', async ({ page }) => {
    await page.goto(VENDORS)
    await expect(page.getByText('Showing 1–6 of 6 vendors')).toBeVisible()
    await expect(page.getByText('Star a page or view to pin it here.')).toBeVisible()

    await filterNo(page, 'V00001')
    await saveAs(page, 'Kailash only')
    await openViews(page)
    await viewRow(page, 'Kailash only').getByRole('menuitem', { name: 'Pin to favorites' }).click()
    await expect(page.getByText('Pinned to favorites')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(favRows(page)).toHaveCount(1)
    await expect(favRows(page).first()).toContainText('Kailash only')
    await expect(favRows(page).first()).toContainText('Vendors')

    // Open it from another page: it lands on the vendors list with the view applied.
    await page.goto('/purchasing/purchase-orders')
    await expect(page.getByRole('grid')).toBeVisible()
    await favRows(page).filter({ hasText: 'Kailash only' }).click()
    await expect(page).toHaveURL(/\/purchasing\/vendors$/)
    await expect(viewsButton(page)).toContainText('Kailash only')
    await expect(page.getByText('Showing 1–1 of 1 vendor')).toBeVisible()

    // Pin a page too (the star beside the sidebar link).
    await page.getByRole('button', { name: 'Add Purchase Orders to favorites' }).click()
    await expect(favRows(page)).toHaveCount(2)
    await expect(favRows(page).nth(0)).toContainText('Kailash only')
    await expect(favRows(page).nth(1)).toContainText('Purchase Orders')

    // Rename the view favorite in place (right-click ▸ Rename).
    await favRows(page).nth(0).click({ button: 'right' })
    await page.getByRole('menuitem', { name: 'Rename' }).click()
    await page.getByLabel('Rename view').fill('Kailash')
    await page.keyboard.press('Enter')
    await expect(favRows(page).nth(0)).toContainText('Kailash')
    await expect(viewsButton(page)).toContainText('Kailash')

    // Drag the second onto the first.
    await favRows(page).nth(1).dragTo(favRows(page).nth(0))
    await expect(favRows(page).nth(0)).toContainText('Purchase Orders')
    await expect(favRows(page).nth(1)).toContainText('Kailash')
    // Move down from the menu, and the order survives a reload.
    await favRows(page).nth(0).click({ button: 'right' })
    await page.getByRole('menuitem', { name: 'Move down' }).click()
    await expect(favRows(page).nth(0)).toContainText('Kailash')
    await page.reload()
    await expect(favRows(page).nth(0)).toContainText('Kailash')
    await expect(favRows(page).nth(1)).toContainText('Purchase Orders')

    // Remove with Undo.
    await page.getByRole('button', { name: 'Unpin Purchase Orders' }).click()
    await expect(favRows(page)).toHaveCount(1)
    await page.getByRole('button', { name: 'Undo' }).click()
    await expect(favRows(page)).toHaveCount(2)
    await expect(favRows(page).nth(1)).toContainText('Purchase Orders')
  })

  test('deleting a view removes the favorites that point at it', async ({ page }) => {
    await page.goto(VENDORS)
    await filterNo(page, 'V00002')
    await page.keyboard.press('Control+D')
    // Unsaved filters are saved as "<Page> · my view", pinned, and the sidebar asks for a name.
    await expect(page.getByLabel('Rename view')).toBeVisible()
    await page.getByLabel('Rename view').fill('Temp')
    await page.keyboard.press('Enter')
    await expect(favRows(page)).toHaveCount(1)
    await expect(favRows(page).first()).toContainText('Temp')

    await openViews(page)
    await viewRow(page, 'Temp').getByRole('menuitem', { name: 'Delete' }).click()
    await expect(favRows(page)).toHaveCount(0)
  })

  test('the right-click menus open from the keyboard and close with Esc', async ({ page }) => {
    await page.goto(VENDORS)
    await expect(page.getByRole('grid')).toBeVisible()

    // A sidebar page: Shift+F10.
    const link = page.getByRole('link', { name: 'Purchase Orders' })
    await link.focus()
    await page.keyboard.press('Shift+F10')
    await expect(page.getByRole('menuitem', { name: 'Add to favorites' })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: 'Open in new tab' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('menu')).toHaveCount(0)

    // Add it via the menu, then open the favorite's menu with the Menu key.
    await link.focus()
    await page.keyboard.press('Shift+F10')
    await page.getByRole('menuitem', { name: 'Add to favorites' }).click()
    await expect(favRows(page)).toHaveCount(1)
    await favRows(page).first().focus()
    await page.keyboard.press('ContextMenu')
    await expect(page.getByRole('menuitem', { name: 'Move up' })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: 'Remove' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('menu')).toHaveCount(0)
  })

  test('keeps the favorites the first React build stored in the UI preferences', async ({ page }) => {
    await page.addInitScript(() => {
      if (!localStorage.getItem('shelfree.v2.favorites')) {
        localStorage.setItem(
          'shelfree.v2.ui',
          JSON.stringify({ state: { favorites: [{ moduleId: 'purchasing', slug: 'vendors' }, { moduleId: 'warehouse', slug: 'items' }] }, version: 1 }),
        )
      }
    })
    await page.goto('/')
    await expect(favRows(page)).toHaveCount(2)
    await expect(favRows(page).nth(0)).toContainText('Vendors')
    await expect(favRows(page).nth(1)).toContainText('Items')
    await page.reload()
    await expect(favRows(page)).toHaveCount(2)
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('shelfree.v2.ui') ?? '{}'))
    expect(stored.state.favorites).toBeUndefined()
  })
})
