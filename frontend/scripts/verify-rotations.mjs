import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'
import { verifyAbstention } from './rotation-flow.mjs'

const base = process.env.AGRONEXA_WEB_BASE ?? 'http://127.0.0.1:5173'
const evidence = process.env.AGRONEXA_EVIDENCE_DIR
const browser = await chromium.launch({
  channel: process.env.AGRONEXA_BROWSER || (process.platform === 'win32' ? 'msedge' : undefined),
})
const widths = [360, 768, 1440]
const report = { browser: browser.version(), widths: [], climate_cache: null, state: null }

try {
  for (const width of widths) {
    const page = await browser.newPage({ viewport: { width, height: 950 } })
    page.setDefaultTimeout(15000)
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    if (width === 1440) {
      await page.goto(base + '/explorar', { waitUntil: 'domcontentloaded' })
      await page.getByRole('button', { name: 'Usar año 2024' }).click()
      const weather = page.waitForResponse(response => response.url().includes('/climate/summary?'))
      await page.getByRole('button', { name: 'Consultar clima' }).click()
      const climate = await (await weather).json()
      assert.equal(climate.source.provider, 'NASA POWER')
      assert.equal(climate.source.cache_status, 'cached')
      assert.equal(climate.series.length, 366)
      report.climate_cache = climate.source.response_sha256
      await page.getByRole('link', { name: 'Abrir ficha agrícola' }).click()
    } else {
      await page.goto(base + '/rotaciones?location_id=puno-ilave&start=2024-01-01&end=2024-12-31',
        { waitUntil: 'domcontentloaded' })
    }
    const result = await verifyAbstention(page, { start: '2024-01-01', end: '2024-12-31' })
    report.state = result.state
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
    assert.deepEqual(errors, [])
    if (evidence && width !== 768) {
      await mkdir(evidence, { recursive: true })
      await page.evaluate(() => window.scrollTo(0, 0))
      await page.screenshot({ path: path.join(evidence, 'rotaciones-' + width + '.jpg'), fullPage: true, quality: 86 })
    }
    report.widths.push(width)
    await page.close()
  }
  const json = JSON.stringify(report, null, 2)
  if (evidence) await writeFile(path.join(evidence, 'browser-verification.json'), json + '\n')
  console.log(json)
} finally {
  await browser.close()
}
