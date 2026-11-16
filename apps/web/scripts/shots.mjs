// Side-by-side screenshots of the React app and the prototype, for parity checks.
// Usage: node scripts/shots.mjs <outDir> <scenario>
//   scenarios: po-list | po-editor
// Needs both servers running: `pnpm dev` (5174) and the prototype static server (5173).
import { mkdirSync } from 'node:fs'
import { chromium } from '@playwright/test'

const out = process.argv[2] ?? 'shots'
const scenario = process.argv[3] ?? 'po-list'
mkdirSync(out, { recursive: true })

const APP = 'http://127.0.0.1:5174'
const PROTO = 'http://127.0.0.1:5173/prototype/designs/erp/Shelfree%20App.dc.html'

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const errors = []
const watch = (page) => {
  page.on('console', (m) => m.type() === 'error' && !m.text().includes('attribute d:') && errors.push(m.text()))
  page.on('pageerror', (e) => errors.push(String(e)))
}

const scenarios = {
  'po-list': async () => {
    const app = await context.newPage()
    watch(app)
    await app.goto(`${APP}/purchasing/purchase-orders`)
    await app.getByText('PO00003').waitFor()
    await app.screenshot({ path: `${out}/app-list.png` })
    await app.getByText('PO00003').click()
    await app.waitForTimeout(300)
    await app.screenshot({ path: `${out}/app-drawer.png` })

    const proto = await context.newPage()
    await proto.goto(PROTO)
    await proto.getByText('PO00003').waitFor({ timeout: 20000 })
    await proto.getByText('PO00003').click()
    await proto.waitForTimeout(300)
    await proto.screenshot({ path: `${out}/proto-drawer.png` })
  },
  'po-editor': async () => {
    const app = await context.newPage()
    watch(app)
    // a draft with lines
    await app.goto(`${APP}/purchasing/purchase-orders/PO00006`)
    await app.getByText('Line items').waitFor()
    await app.waitForTimeout(400)
    await app.screenshot({ path: `${out}/app-editor-draft.png`, fullPage: false })
    // an issued (locked) order
    await app.goto(`${APP}/purchasing/purchase-orders/PO00001`)
    await app.getByText('Line items').waitFor()
    await app.waitForTimeout(400)
    await app.screenshot({ path: `${out}/app-editor-issued.png` })

    const proto = await context.newPage()
    await proto.goto(PROTO)
    await proto.getByText('PO00006').waitFor({ timeout: 20000 })
    await proto.getByText('PO00006').dblclick()
    await proto.getByText('Line items').waitFor()
    await proto.waitForTimeout(500)
    await proto.screenshot({ path: `${out}/proto-editor-draft.png` })
    await proto.getByTitle('Back to purchase orders').click()
    await proto.getByText('PO00001').waitFor()
    await proto.getByText('PO00001').dblclick()
    await proto.getByText('Line items').waitFor()
    await proto.waitForTimeout(500)
    await proto.screenshot({ path: `${out}/proto-editor-issued.png` })
  },
}

await scenarios[scenario]()
console.log('app console errors:', errors.length ? errors : 'none')
await browser.close()
