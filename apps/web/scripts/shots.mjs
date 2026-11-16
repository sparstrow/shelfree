// Side-by-side screenshots of the React app and the prototype, for parity checks.
// Usage: node scripts/shots.mjs <outDir> [light]
// Needs both servers running: `pnpm dev` (5174) and the prototype static server (5173).
import { mkdirSync } from 'node:fs'
import { chromium } from '@playwright/test'

const out = process.argv[2] ?? 'shots'
const light = process.argv[3] === 'light'
mkdirSync(out, { recursive: true })

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })

// ── new app ──
const app = await context.newPage()
const errors = []
app.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
app.on('pageerror', (e) => errors.push(String(e)))
await app.goto('http://127.0.0.1:5174/purchasing/purchase-orders')
if (light) {
  await app.evaluate(() => {
    document.documentElement.dataset.theme = 'light'
  })
}
await app.getByRole('grid').waitFor()
await app.getByText('PO00003').waitFor()
await app.screenshot({ path: `${out}/app-list.png` })
await app.getByText('PO00003').click()
await app.waitForTimeout(300)
await app.screenshot({ path: `${out}/app-drawer.png` })
console.log('app console errors:', errors.length ? errors : 'none')

// ── prototype ──
if (!light) {
  const proto = await context.newPage()
  await proto.goto('http://127.0.0.1:5173/prototype/designs/erp/Shelfree%20App.dc.html')
  await proto.getByText('Purchasing', { exact: true }).first().click()
  await proto.getByText('PO00003').waitFor({ timeout: 20000 })
  await proto.waitForTimeout(500)
  await proto.screenshot({ path: `${out}/proto-list.png` })
  await proto.getByText('PO00003').click()
  await proto.waitForTimeout(300)
  await proto.screenshot({ path: `${out}/proto-drawer.png` })
}

await browser.close()
