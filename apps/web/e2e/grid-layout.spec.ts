import { type Locator, type Page, expect, test } from '@playwright/test'

const ORDERS = '/purchasing/purchase-orders'

const header = (page: Page, name: string | RegExp) => page.getByRole('columnheader', { name })
const headerKeys = (page: Page) =>
  page.locator('[role="columnheader"]').evaluateAll((els) => els.map((el) => (el as HTMLElement).dataset.colKey))
const columnMenuButton = (page: Page, label: string) => page.getByRole('button', { name: `${label} column menu` })
const widthOf = async (locator: Locator) => (await locator.boundingBox())!.width

async function chooseFromColumnMenu(page: Page, label: string, item: string) {
  await header(page, new RegExp(label)).hover()
  await columnMenuButton(page, label).click()
  await page.getByRole('menuitem', { name: item }).click()
}

test.describe('Grid layout: columns, grouping, find, totals', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ORDERS)
    await expect(page.getByText('Showing 1–10 of 10 purchase orders')).toBeVisible()
  })

  test('pin a column and it stays visible while the grid scrolls', async ({ page }) => {
    await page.setViewportSize({ width: 1000, height: 800 })
    const grid = page.getByRole('grid')
    const gridBox = (await grid.boundingBox())!

    // Unpinned, Vendor scrolls out of view to the left.
    await grid.evaluate((el) => (el.scrollLeft = 500))
    expect((await header(page, /^Vendor/).boundingBox())!.x).toBeLessThan(gridBox.x)
    await grid.evaluate((el) => (el.scrollLeft = 0))

    await chooseFromColumnMenu(page, 'Vendor', 'Pin to left')
    await expect(header(page, /^Vendor/).getByLabel('Pinned column')).toBeVisible()
    await grid.evaluate((el) => (el.scrollLeft = 500))
    const pinned = (await header(page, /^Vendor/).boundingBox())!
    expect(pinned.x).toBeGreaterThanOrEqual(gridBox.x)
    expect(pinned.x + pinned.width).toBeLessThan(gridBox.x + gridBox.width)

    // Unpin from the right-click menu.
    await header(page, /^Vendor/).click({ button: 'right' })
    await page.getByRole('menuitem', { name: 'Unpin from left' }).click()
    await expect(header(page, /^Vendor/).getByLabel('Pinned column')).toHaveCount(0)
  })

  test('hide a column and bring it back from the Columns list', async ({ page }) => {
    await chooseFromColumnMenu(page, 'Lock', 'Hide column')
    await expect(header(page, /^Lock/)).toHaveCount(0)
    await page.getByRole('button', { name: 'Columns' }).click()
    await page.getByRole('checkbox', { name: 'Lock' }).click()
    await page.keyboard.press('Escape')
    await expect(header(page, /^Lock/)).toBeVisible()
  })

  test('resize by dragging the edge, autofit on double-click and from the menu', async ({ page }) => {
    const vendor = header(page, /^Vendor/)
    const before = await widthOf(vendor)
    const handle = page.getByRole('separator', { name: 'Resize Vendor' })
    const box = (await handle.boundingBox())!
    const y = box.y + box.height / 2
    await page.mouse.move(box.x + box.width / 2, y)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2 + 120, y, { steps: 6 })
    await page.mouse.up()
    const widened = await widthOf(vendor)
    expect(widened).toBeGreaterThan(before + 100)

    await handle.dblclick()
    const fitted = await widthOf(vendor)
    expect(fitted).toBeLessThan(widened)
    expect(fitted).toBeGreaterThanOrEqual(140)

    // Menu: widen again, then "Autofit this column" returns to the fitted width.
    await page.mouse.move(box.x + box.width / 2, y)
    const box2 = (await handle.boundingBox())!
    await page.mouse.move(box2.x + box2.width / 2, y)
    await page.mouse.down()
    await page.mouse.move(box2.x + box2.width / 2 + 90, y, { steps: 5 })
    await page.mouse.up()
    expect(await widthOf(vendor)).toBeGreaterThan(fitted + 60)
    await chooseFromColumnMenu(page, 'Vendor', 'Autofit this column')
    expect(Math.abs((await widthOf(vendor)) - fitted)).toBeLessThan(2)

    // Reset layout puts every width back.
    await chooseFromColumnMenu(page, 'Vendor', 'Reset layout')
    expect(Math.abs((await widthOf(vendor)) - before)).toBeLessThan(2)
  })

  test('drag a header to reorder columns; the menu moves a column by keyboard', async ({ page }) => {
    expect((await headerKeys(page)).slice(0, 4)).toEqual(['no', 'vendor', 'orderDate', 'expectedDate'])
    await header(page, /^Expected date/).getByTitle(/^Sort/).dragTo(header(page, /^Vendor/))
    expect((await headerKeys(page)).slice(0, 4)).toEqual(['no', 'expectedDate', 'vendor', 'orderDate'])

    await chooseFromColumnMenu(page, 'Order date', 'Move left')
    expect((await headerKeys(page)).slice(0, 4)).toEqual(['no', 'expectedDate', 'orderDate', 'vendor'])
  })

  test('group by a column: counts, collapse and expand, ungroup', async ({ page }) => {
    await chooseFromColumnMenu(page, 'Status', 'Group by this column')
    await expect(page).toHaveURL(/group=status/)
    await expect(page.getByText('Grouped by')).toBeVisible()

    const groupButtons = page.locator('[data-group]')
    const n = await groupButtons.count()
    expect(n).toBeGreaterThan(1)
    const counts = await groupButtons.evaluateAll((els) =>
      els.map((el) => Number(/(\d+) purchase order/.exec(el.textContent ?? '')?.[1])),
    )
    expect(counts.reduce((a, b) => a + b, 0)).toBe(10)
    await expect(groupButtons.first()).toContainText('Status:')

    // Collapsing a group removes its rows; arrow keys skip the group rows.
    await groupButtons.first().click()
    const rest = 10 - counts[0]
    await expect(page.getByText(`Showing 1–${rest} of ${rest} purchase orders`)).toBeVisible()
    await expect(page.locator('[role="row"][aria-expanded="false"]')).toHaveCount(1)
    await groupButtons.first().click()
    await expect(page.getByText('Showing 1–10 of 10 purchase orders')).toBeVisible()

    await page.getByRole('button', { name: 'Collapse all' }).click()
    await expect(page.locator('[role="row"][aria-expanded="false"]')).toHaveCount(n)
    await page.getByRole('button', { name: 'Expand all' }).click()
    await expect(page.locator('[role="row"][aria-expanded="false"]')).toHaveCount(0)

    // Group rows are never the active row: ArrowDown lands on a real order.
    await page.getByRole('grid').focus()
    await page.keyboard.press('ArrowDown')
    await expect(page.getByRole('complementary', { name: /^Purchase order PO/ })).toBeVisible()

    await page.getByRole('button', { name: 'Ungroup' }).click()
    await expect(page.locator('[data-group]')).toHaveCount(0)
    await expect(page).not.toHaveURL(/group=/)
  })

  test('a link with ?group= opens the grid grouped', async ({ page }) => {
    await page.goto(`${ORDERS}?group=vendor`)
    await expect(page.getByText('Grouped by')).toBeVisible()
    await expect(page.locator('[data-group]').first()).toContainText('Vendor:')
  })

  test('find in view: highlight, next / previous, Esc closes', async ({ page }) => {
    await page.getByRole('grid').click({ position: { x: 5, y: 5 } })
    await page.keyboard.press('Control+f')
    const input = page.getByLabel('Find in this view')
    await expect(input).toBeFocused()
    await input.fill('malaimayil')
    const label = page.getByRole('search').locator('[aria-live]')
    await expect(label).toContainText(/1 of \d+ matches?/)
    const total = Number(/of (\d+)/.exec((await label.textContent()) ?? '')?.[1])
    expect(total).toBeGreaterThan(1)
    // The grid keeps every row; matching cells are highlighted.
    await expect(page.getByText('Showing 1–10 of 10 purchase orders')).toBeVisible()

    await input.press('Enter')
    await expect(label).toContainText(`2 of ${total}`)
    await input.press('Shift+Enter')
    await expect(label).toContainText(`1 of ${total}`)
    await input.press('Shift+Enter')
    await expect(label).toContainText(`${total} of ${total}`)

    await input.fill('zzzz-nothing')
    await expect(label).toContainText('No matches')

    await input.press('Escape')
    await expect(page.getByRole('search')).toHaveCount(0)
  })

  test('footer totals: default aggregate, then pick another', async ({ page }) => {
    await page.getByRole('button', { name: 'Columns' }).click()
    await page.getByRole('checkbox', { name: 'Totals row' }).click()
    await page.keyboard.press('Escape')

    const total = page.locator('[data-footer-key="total"]')
    await expect(total).toContainText('₹')
    const sum = await total.textContent()

    await total.click()
    await page.getByRole('menuitemradio', { name: 'Max' }).click()
    await expect(total).not.toHaveText(sum ?? '')
    await expect(total).toContainText('₹')
    await expect(page.getByRole('menu')).toHaveCount(0)

    await total.click()
    await page.getByRole('menuitemradio', { name: 'Count' }).click()
    await expect(total).toHaveText('10')
    await expect(page.getByRole('menu')).toHaveCount(0)

    // A text column only offers None and Count.
    await page.locator('[data-footer-key="vendor"]').click()
    await expect(page.getByRole('menuitemradio')).toHaveCount(2)
    await page.keyboard.press('Escape')
  })

  test('a saved view keeps the layout and applies it after a reload', async ({ page }) => {
    // Layout: pin Vendor, hide Lock, reorder Expected date, group by Status, Count footer on Total, one group collapsed.
    await chooseFromColumnMenu(page, 'Vendor', 'Pin to left')
    await chooseFromColumnMenu(page, 'Lock', 'Hide column')
    await header(page, /^Expected date/).getByTitle(/^Sort/).dragTo(header(page, /^Order date/))
    await chooseFromColumnMenu(page, 'Status', 'Group by this column')
    await page.getByRole('button', { name: 'Columns' }).click()
    await page.getByRole('checkbox', { name: 'Totals row' }).click()
    await page.keyboard.press('Escape')
    await page.locator('[data-footer-key="total"]').click()
    await page.getByRole('menuitemradio', { name: 'Count' }).click()
    await page.locator('[data-group]').first().click()
    const laidOut = await headerKeys(page)
    expect(laidOut).not.toContain('lock')

    const views = page.getByTitle('Saved views')
    const dirty = views.getByRole('img', { name: 'Unsaved changes' })
    await views.click()
    await page.getByRole('menuitem', { name: 'Save as new view' }).click()
    await page.getByLabel('View name').fill('Layout view')
    await page.keyboard.press('Enter')
    await expect(views).toContainText('Layout view')
    await expect(dirty).toHaveCount(0)

    // Changing any part of the layout makes the saved view dirty again.
    await page.locator('[data-footer-key="total"]').click()
    await page.getByRole('menuitemradio', { name: 'Max' }).click()
    await expect(dirty).toBeVisible()

    // Reopening the page: the grid is back to its defaults; applying the view restores the layout.
    await page.goto(ORDERS)
    await expect(page.getByText('Showing 1–10 of 10 purchase orders')).toBeVisible()
    expect(await headerKeys(page)).toContain('lock')
    await expect(page.locator('[data-group]')).toHaveCount(0)
    await views.click()
    await page.getByRole('menuitem', { name: 'Layout view' }).click()
    await expect(views).toContainText('Layout view')
    await expect(dirty).toHaveCount(0)
    expect(await headerKeys(page)).toEqual(laidOut)
    await expect(header(page, /^Vendor/).getByLabel('Pinned column')).toBeVisible()
    await expect(page.getByText('Grouped by')).toBeVisible()
    await expect(page.locator('[role="row"][aria-expanded="false"]')).toHaveCount(1)
    await expect(page).toHaveURL(/group=status/)
    // The footer shows the view's Count (the Max picked before the reload is gone).
    await expect(page.locator('[data-footer-key="total"]')).toHaveText(/^\d+$/)
  })
})
