import { expect, test } from '@playwright/test'

test.describe('Grid multi-row bulk actions', () => {
  test('Purchase Orders: mixed-status counts, status op + undo, bulk edit + undo, multi-row menu, Esc, drafts-only delete', async ({
    page,
  }) => {
    await page.goto('/purchasing/purchase-orders')
    await expect(page.getByRole('grid', { name: 'purchase orders' })).toBeVisible()
    await expect(page.getByText('Showing 1–10 of 10 purchase orders')).toBeVisible()

    // Select 3 rows with mixed statuses:
    // PO00003 = Issued (Locked, no receipts), PO00004 = Received (Final), PO00006 = Draft (Open)
    await page.getByRole('checkbox', { name: 'Select PO00003' }).click()
    await page.getByRole('checkbox', { name: 'Select PO00004' }).click()
    await page.getByRole('checkbox', { name: 'Select PO00006' }).click()

    const bar = page.getByRole('region', { name: 'Bulk actions' })
    await expect(bar).toContainText('3 purchase orders selected')
    await expect(bar.getByRole('button', { name: /Reopen 1/ })).toHaveAttribute(
      'title',
      '1 of 3 selected can be reopened',
    )
    await expect(bar.getByRole('button', { name: /Issue 1/ })).toHaveAttribute(
      'title',
      '1 of 3 selected can be set to Issued',
    )
    await expect(bar.getByRole('button', { name: /Cancel 2/ })).toHaveAttribute(
      'title',
      '2 of 3 selected can be set to Cancelled',
    )
    await expect(bar.getByRole('button', { name: /Close 1/ })).toHaveAttribute(
      'title',
      '1 of 3 selected can be set to Closed',
    )
    await expect(bar.getByRole('button', { name: /Delete 1 of 3/ })).toHaveAttribute(
      'title',
      'Only draft purchase orders can be deleted',
    )

    // Status op changes only valid rows (PO00006 Draft → Issued); Undo restores it.
    await bar.getByRole('button', { name: /Issue 1/ }).click()
    await expect(page.getByRole('row', { name: /PO00006/ })).toContainText('Issued')
    await expect(page.getByRole('row', { name: /PO00004/ })).toContainText('Received')
    await page.locator('.cn-toast', { hasText: '1 purchase order issued' }).getByRole('button', { name: 'Undo' }).click()
    await expect(page.getByRole('row', { name: /PO00006/ })).toContainText('Draft')

    // Bulk edit dialog: state breakdown + Esc closes it.
    await bar.getByRole('button', { name: 'Edit', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText('Edit 3 purchase orders')
    await expect(dialog).toContainText('1 editable')
    await expect(dialog).toContainText('1 locked — reopen to edit')
    await expect(dialog).toContainText('1 can’t be edited')
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()

    // Bulk edit Expected date on editable rows + Undo.
    await bar.getByRole('button', { name: 'Edit', exact: true }).click()
    await expect(dialog).toBeVisible()
    await dialog.getByLabel('Column', { exact: true }).selectOption('expectedDate')
    await dialog.getByLabel('New value', { exact: true }).fill('2026-09-15')
    await dialog.getByRole('button', { name: 'Apply to 1' }).click()
    await expect(dialog).toBeHidden()
    await expect(page.getByRole('row', { name: /PO00006/ })).toContainText('Sep 15, 2026')
    await expect(page.getByRole('row', { name: /PO00003/ })).toContainText('Aug 01, 2026')
    await page
      .locator('.cn-toast', { hasText: 'Expected date updated on 1 purchase order' })
      .getByRole('button', { name: 'Undo' })
      .click()
    await expect(page.getByRole('row', { name: /PO00006/ })).toContainText('Jul 27, 2026')

    // Right-click a selected row opens the multi-row menu; Esc closes it.
    await page.getByRole('row', { name: /PO00006/ }).click({ button: 'right' })
    const menu = page.getByRole('menu')
    await expect(menu).toBeVisible()
    await expect(menu).toContainText('3 purchase orders selected')
    await expect(menu.getByRole('menuitem', { name: /Copy rows/ })).toBeVisible()
    await expect(menu.getByRole('menuitem', { name: /Copy numbers/ })).toBeVisible()
    await expect(menu.getByRole('menuitem', { name: /Duplicate/ })).toBeVisible()
    await expect(menu.getByRole('menuitem', { name: /Edit column…/ })).toBeVisible()
    await expect(menu.getByRole('menuitem', { name: /Issue 1 of 3/ })).toBeEnabled()
    await expect(menu.getByRole('menuitem', { name: /Lock 0 of 3/ })).toHaveAttribute('aria-disabled', 'true')
    await expect(menu.getByRole('menuitem', { name: /Export selected/ })).toBeVisible()
    await expect(menu.getByRole('menuitem', { name: /Delete 1 of 3/ })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(menu).toBeHidden()

    // Delete removes only the 1 Draft row (PO00006); Undo restores it.
    await bar.getByRole('button', { name: /Delete 1 of 3/ }).click()
    await expect(page.getByRole('dialog')).toContainText('Delete 1 purchase order?')
    await page.getByRole('dialog').getByRole('button', { name: 'Delete 1 purchase order' }).click()
    await expect(page.getByText('Showing 1–9 of 9 purchase orders')).toBeVisible()
    await expect(page.getByRole('row', { name: /PO00006/ })).toHaveCount(0)
    await expect(page.getByRole('row', { name: /PO00003/ })).toBeVisible()
    await expect(page.getByRole('row', { name: /PO00004/ })).toBeVisible()
    await page.locator('.cn-toast', { hasText: '1 purchase order deleted' }).getByRole('button', { name: 'Undo' }).click()
    await expect(page.getByText('Showing 1–10 of 10 purchase orders')).toBeVisible()
  })

  test('Purchase Orders: duplicate 2 rows creates new Draft numbers with undo', async ({ page }) => {
    await page.goto('/purchasing/purchase-orders')
    await expect(page.getByRole('grid', { name: 'purchase orders' })).toBeVisible()

    await page.getByRole('checkbox', { name: 'Select PO00003' }).click()
    await page.getByRole('checkbox', { name: 'Select PO00006' }).click()

    const bar = page.getByRole('region', { name: 'Bulk actions' })
    await bar.getByRole('button', { name: 'Duplicate', exact: true }).click()

    await expect(page.getByText('Showing 1–12 of 12 purchase orders')).toBeVisible()
    await expect(page.getByRole('row', { name: /PO00011/ })).toContainText('Draft')
    await expect(page.getByRole('row', { name: /PO00012/ })).toContainText('Draft')

    await page
      .locator('.cn-toast', { hasText: '2 purchase orders duplicated' })
      .getByRole('button', { name: 'Undo' })
      .click()
    await expect(page.getByText('Showing 1–10 of 10 purchase orders')).toBeVisible()
  })

  test('Items: duplicate one row adds a -COPY item with "(copy)" suffix and undo', async ({ page }) => {
    await page.goto('/warehouse/items')
    await expect(page.getByRole('grid', { name: 'items' })).toBeVisible()
    await expect(page.getByText('Showing 1–20 of 22 items')).toBeVisible()

    await page.getByRole('checkbox', { name: 'Select ASH-PWH-18' }).click()
    const bar = page.getByRole('region', { name: 'Bulk actions' })
    await bar.getByRole('button', { name: 'Duplicate', exact: true }).click()

    await expect(page.getByText('Showing 1–20 of 23 items')).toBeVisible()
    const copyRow = page.getByRole('row', { name: /ASH-PWH-18-COPY/ })
    await expect(copyRow).toBeVisible()
    await expect(copyRow).toContainText('(copy)')

    await page.locator('.cn-toast', { hasText: '1 item duplicated' }).getByRole('button', { name: 'Undo' }).click()
    await expect(page.getByText('Showing 1–20 of 22 items')).toBeVisible()
  })
})
