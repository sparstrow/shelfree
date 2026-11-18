import { type Download, expect, test } from '@playwright/test'

async function readDownloadText(download: Download) {
  const stream = await download.createReadStream()
  const chunks: string[] = []
  if (stream) {
    stream.setEncoding('utf8')
    for await (const chunk of stream) chunks.push(String(chunk))
  }
  return chunks.join('')
}

test.describe('People ▸ Users & Employees', () => {
  test('Users: seeded count, masked PII in grid & CSV, full in drawer, edit role & permissions, suspend/reactivate, protected delete', async ({ page }) => {
    await page.goto('/people/users')

    const grid = page.getByRole('grid', { name: 'users' })
    await expect(page.getByText('Showing 1–11 of 11 users')).toBeVisible()

    // Grid masks email; raw address must never appear in the grid.
    await expect(grid.getByText('k••••@kanalora.example').first()).toBeVisible()
    await expect(grid.getByText('karthik.subramaniam@kanalora.example')).toHaveCount(0)

    // CSV export also keeps email masked.
    const dlPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Export', exact: true }).click()
    await page.getByRole('menuitem', { name: /Export all/i }).click()
    const csv = await readDownloadText(await dlPromise)
    expect(csv).toContain('k••••@kanalora.example')
    expect(csv).not.toContain('karthik.subramaniam@kanalora.example')
    expect(csv).not.toContain('kavitha.elumalai@kanalora.example')

    // Drawer displays full email and enforces last-Admin delete protection.
    await grid.getByText('USR00001').click()
    const adminDrawer = page.getByRole('complementary', { name: 'User USR00001' })
    await expect(adminDrawer).toBeVisible()
    await expect(adminDrawer.getByText('karthik.subramaniam@kanalora.example').first()).toBeVisible()
    const adminDelete = adminDrawer.getByRole('button', { name: 'Delete user' })
    await expect(adminDelete).toBeDisabled()
    await expect(adminDelete).toHaveAttribute('title', /last Admin/i)

    // Signed-in user (Kavitha, USR00007) also cannot be deleted.
    await grid.getByText('USR00007').click()
    const selfDrawer = page.getByRole('complementary', { name: 'User USR00007' })
    await expect(selfDrawer).toBeVisible()
    const selfDelete = selfDrawer.getByRole('button', { name: 'Delete user' })
    await expect(selfDelete).toBeDisabled()
    await expect(selfDelete).toHaveAttribute('title', /own signed-in user/i)

    // Edit USR00003 role and Sales module permission in place and save.
    await grid.getByText('USR00003').click()
    const userDrawer = page.getByRole('complementary', { name: 'User USR00003' })
    await expect(userDrawer).toBeVisible()
    await userDrawer.getByRole('button', { name: 'Edit' }).click()

    const editDrawer = page.getByRole('complementary', { name: 'Edit user' })
    await editDrawer.getByLabel('Role', { exact: true }).selectOption('Manager')
    await editDrawer.getByRole('radiogroup', { name: 'Sales permission' }).getByRole('radio', { name: 'Write', exact: true }).click()
    await editDrawer.getByRole('button', { name: 'Save changes' }).click()

    await expect(userDrawer).toContainText('Manager')
    await expect(userDrawer.getByRole('radiogroup', { name: 'Sales permission' }).getByRole('radio', { name: 'Write', exact: true })).toHaveAttribute(
      'aria-checked',
      'true',
    )

    // Suspend then reactivate USR00003 from the drawer footer.
    await userDrawer.getByRole('button', { name: 'Suspend user' }).click()
    await expect(userDrawer).toContainText('Suspended')
    await userDrawer.getByRole('button', { name: 'Reactivate' }).click()
    await expect(userDrawer).toContainText('Active')

    // Non-protected user delete + Undo via drawer (assert Pending invite CTA first).
    await grid.getByText('USR00011').click()
    const viewerDrawer = page.getByRole('complementary', { name: 'User USR00011' })
    await expect(viewerDrawer.getByRole('button', { name: 'Resend invite' })).toBeVisible()
    await viewerDrawer.getByRole('button', { name: 'Delete user' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Delete user' }).click()
    await expect(page.getByText('Showing 1–10 of 10 users')).toBeVisible()
    await page.locator('.cn-toast', { hasText: 'User deleted' }).getByRole('button', { name: 'Undo' }).click()
    await expect(page.getByText('Showing 1–11 of 11 users')).toBeVisible()

    // Bulk delete refuses protected last Admin.
    await page.getByRole('checkbox', { name: 'Select USR00001' }).click()
    await page.getByRole('button', { name: 'Delete', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Delete selected' }).click()
    await expect(page.getByText('Delete refused')).toBeVisible()
    await expect(page.getByText('Showing 1–11 of 11 users')).toBeVisible()
    await page.getByRole('button', { name: 'Clear', exact: true }).click()

    // Bulk status change: suspend USR00005 then reactivate via bulk Activate.
    await page.getByRole('checkbox', { name: 'Select USR00005' }).click()
    await page.getByRole('button', { name: 'Suspend', exact: true }).click()
    await expect(page.getByText('1 user set to Suspended')).toBeVisible()
    await page.getByRole('checkbox', { name: 'Select USR00005' }).click()
    await page.getByRole('button', { name: 'Activate', exact: true }).click()
    await expect(page.getByText('1 user set to Active')).toBeVisible()
  })

  test('Employees: seeded count, masked PII in grid & CSV, full in drawer, validation error on create, status toggle, protected delete', async ({
    page,
  }) => {
    await page.goto('/people/employees')

    const grid = page.getByRole('grid', { name: 'employees' })
    await expect(page.getByText('Showing 1–20 of 21 employees')).toBeVisible()

    // Grid masks email and phone; raw PII must not appear in the grid.
    await expect(grid.getByText('k••••@kanalora.example').first()).toBeVisible()
    await expect(grid.getByText('•••• 4210').first()).toBeVisible()
    await expect(grid.getByText('karthik.subramaniam@kanalora.example')).toHaveCount(0)
    await expect(grid.getByText('+91 90031 44210')).toHaveCount(0)

    // CSV export also keeps email and phone masked.
    const dlPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Export', exact: true }).click()
    await page.getByRole('menuitem', { name: /Export all/i }).click()
    const csv = await readDownloadText(await dlPromise)
    expect(csv).toContain('k••••@kanalora.example')
    expect(csv).toContain('•••• 4210')
    expect(csv).not.toContain('karthik.subramaniam@kanalora.example')
    expect(csv).not.toContain('+91 90031 44210')

    // Drawer reveals full email and phone and blocks deleting a referenced employee.
    await grid.getByText('EMP00001').click()
    const ceoDrawer = page.getByRole('complementary', { name: 'Employee EMP00001' })
    await expect(ceoDrawer).toBeVisible()
    await expect(ceoDrawer.getByText('karthik.subramaniam@kanalora.example')).toBeVisible()
    await expect(ceoDrawer.getByText('+91 90031 44210')).toBeVisible()
    await expect(ceoDrawer.getByRole('button', { name: 'Delete employee' })).toBeDisabled()

    // Create an employee: trigger validation errors first (required fields, then duplicate email), then succeed.
    await page.getByRole('button', { name: 'New employee' }).click()
    const newDrawer = page.getByRole('complementary', { name: 'New employee' })
    await expect(newDrawer).toBeVisible()

    await newDrawer.getByRole('button', { name: 'Create employee' }).click()
    await expect(newDrawer.getByText('Full name is required.')).toBeVisible()
    await expect(newDrawer.getByText('Job title is required.')).toBeVisible()
    await expect(newDrawer.getByText('Enter a valid work email.')).toBeVisible()

    await newDrawer.getByLabel('Full name', { exact: true }).fill('Arjun Selvam')
    await newDrawer.getByLabel('Job title', { exact: true }).fill('Kiln Technician')
    await newDrawer.getByLabel('Email', { exact: true }).fill('karthik.subramaniam@kanalora.example')
    await newDrawer.getByRole('button', { name: 'Create employee' }).click()
    await expect(newDrawer.getByText('An employee with this email already exists.')).toBeVisible()

    await newDrawer.getByLabel('Email', { exact: true }).fill('arjun.selvam@kanalora.example')
    await newDrawer.getByLabel('Phone', { exact: true }).fill('+91 90031 99022')
    await newDrawer.getByRole('button', { name: 'Create employee' }).click()

    await expect(page.getByText('Showing 1–20 of 22 employees')).toBeVisible()
    const createdDrawer = page.getByRole('complementary', { name: 'Employee EMP00022' })
    await expect(createdDrawer).toBeVisible()
    await expect(createdDrawer.getByText('arjun.selvam@kanalora.example')).toBeVisible()

    // Status transitions on the new employee, then delete cleanly back to 21.
    await createdDrawer.getByRole('button', { name: 'Set on leave' }).click()
    await expect(createdDrawer).toContainText('On leave')
    await createdDrawer.getByRole('button', { name: 'Mark active' }).click()
    await expect(createdDrawer).toContainText('Active')

    await createdDrawer.getByRole('button', { name: 'Delete employee' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Delete employee' }).click()
    await expect(page.getByText('Showing 1–20 of 21 employees')).toBeVisible()

    // Bulk status change + Undo on EMP00004.
    await page.getByRole('checkbox', { name: 'Select EMP00004' }).click()
    await page.getByRole('button', { name: 'Set on leave', exact: true }).click()
    await expect(page.getByText('1 employee set to On leave')).toBeVisible()
    await page.locator('.cn-toast', { hasText: '1 employee set to On leave' }).getByRole('button', { name: 'Undo' }).click()
  })
})
