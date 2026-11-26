import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'
import { verifyAbstention } from './rotation-flow.mjs'

const base = process.env.AGRONEXA_WEB_BASE ?? 'http://127.0.0.1:5173'
const demo = process.argv.includes('--demo')
const manifestPath = process.env[demo ? 'AGRONEXA_DEMO_MANIFEST' : 'AGRONEXA_PHASE3_MANIFEST']
  ?? '../data/cache/manifest_2024-01-01_2024-12-31.json'
const evidence = process.env.AGRONEXA_EVIDENCE_DIR
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
const campaignManifest = demo && process.env.AGRONEXA_CAMPAIGN_MANIFEST
  ? JSON.parse(await readFile(process.env.AGRONEXA_CAMPAIGN_MANIFEST, 'utf8')) : undefined
const browser = await chromium.launch({
  channel: process.env.AGRONEXA_BROWSER || (process.platform === 'win32' ? 'msedge' : undefined),
})
const widths = [360, 768, 1024, 1440, 1920]
const report = {
  browser_version: browser.version(),
  period: manifest.period,
  nasa_runs: manifest.results.map(item => ({
    location_id: item.location_id,
    http_status: item.source.metadata.http_status,
    fetched_at: item.source.fetched_at,
    response_sha256: item.source.response_sha256,
    csv_sha256: item.csv_sha256,
    coverage_pct_by_variable: item.quality.coverage_pct_by_variable,
  })),
  viewports: [],
  map_fallback: false,
}
const expected = Object.fromEntries(manifest.results.map(item => [item.location_id, item]))
const ids = ['puno-ilave', 'cusco-urubamba', 'arequipa-chivay']

function hash(bytes) {
  return createHash('sha256').update(bytes).digest('hex')
}

async function checkOverflow(page) {
  assert.equal(await page.evaluate(() =>
    document.documentElement.scrollWidth <= document.documentElement.clientWidth), true)
}

async function verifyDownload(page, width) {
  const [download] = await Promise.all([
    page.waitForEvent('download'), page.getByRole('button', { name: 'Descargar CSV' }).click(),
  ])
  const filename = download.suggestedFilename()
  assert.equal(filename, 'agronexa_puno-ilave_2024-01-01_2024-12-31.csv')
  const bytes = await readFile(await download.path())
  const digest = hash(bytes)
  assert.equal(digest, expected['puno-ilave'].csv_sha256)
  if (evidence && width === 1440) await writeFile(path.join(evidence, filename), bytes)
  return digest
}

async function verifyMobileMap(page, map) {
  async function verifyOverview() {
    assert.equal(await map.evaluate(element => {
      const frame = element.getBoundingClientRect()
      const pins = [...element.querySelectorAll('.leaflet-marker-icon')]
      return pins.length === 3 && pins.every(pin => {
        const box = pin.getBoundingClientRect()
        return box.left >= frame.left && box.right <= frame.right
          && box.top >= frame.top && box.bottom <= frame.bottom
      })
    }), true)
  }
  await map.getByTitle('Ilave, Puno').waitFor()
  await verifyOverview()
  await page.getByRole('button', { name: 'Acercar a Ilave', exact: true }).click()
  await page.getByRole('button', { name: 'Ver todas las localidades', exact: true }).click()
  await verifyOverview()

  for (const [layer, expectedCredits] of [
    ['Satelital ESRI', ['Esri World Imagery']],
    ['Híbrido ESRI', ['Esri World Imagery', 'Esri World Boundaries and Places']],
    ['Topográfico ESRI', ['Esri World Topo Map']],
    ['Mapa base', ['OpenStreetMap contributors']],
  ]) {
    await page.getByLabel('Capa del mapa').selectOption({ label: layer })
    for (const credit of expectedCredits) {
      await map.getByRole('link', { name: credit, exact: true }).waitFor()
    }
    if (layer === 'Mapa base') {
      assert.equal(await map.getByRole('link', { name: /Esri World/ }).count(), 0)
    }
    await checkOverflow(page)
  }
}

async function run(page, width) {
  await page.goto(base, { waitUntil: 'domcontentloaded' })
  await page.getByRole('heading', { name: 'Conoce tu clima. Planifica tu siembra.' }).waitFor()
  await page.getByText('API disponible', { exact: true }).waitFor()
  await page.waitForFunction(() => document.querySelector('.hero-image img')?.naturalWidth > 0)
  await checkOverflow(page)
  if (width <= 900) {
    const menu = page.getByRole('button', { name: 'Abrir menú' })
    await menu.focus()
    await page.keyboard.press('Enter')
    const drawer = page.getByRole('dialog', { name: 'Menú de AgroNexa' })
    await drawer.getByRole('link', { name: 'Metodología' }).waitFor()
    assert.equal(await drawer.evaluate(element => element.contains(document.activeElement)), true)
    await page.keyboard.press('Escape')
    await drawer.waitFor({ state: 'hidden' })
    assert.equal(await menu.evaluate(element => element === document.activeElement), true)
  } else {
    const collapse = page.getByRole('button', { name: 'Colapsar barra lateral' })
    await collapse.click()
    const expand = page.getByRole('button', { name: 'Expandir barra lateral' })
    assert.equal(await expand.getAttribute('aria-expanded'), 'false')
    await checkOverflow(page)
    await expand.click()
  }
  if (evidence && (width === 360 || width === 1440)) {
    await page.screenshot({ path: path.join(evidence, 'inicio-' + width + '.jpg'), fullPage: true, quality: 86 })
  }
  await page.getByRole('link', { name: 'Explorar datos climáticos' }).click()
  const explore = page.getByRole('button', { name: 'Consultar clima' })
  await explore.waitFor()
  assert.equal(await page.getByLabel('Localidad', { exact: true }).inputValue(), 'puno-ilave')
  const map = page.getByRole('region', { name: 'Mapa interactivo del sur del Perú' })
  if (width === 360) await verifyMobileMap(page, map)
  if (width === 1440) {
    const expanded = await map.boundingBox()
    await page.getByRole('button', { name: 'Colapsar barra lateral' }).click()
    const collapsed = await map.boundingBox()
    assert.ok(expanded && collapsed && collapsed.width > expanded.width)
    await page.getByRole('button', { name: 'Expandir barra lateral' }).click()
  }
  await map.getByTitle('Urubamba, Cusco').click()
  assert.equal(await page.getByLabel('Localidad', { exact: true }).inputValue(), 'cusco-urubamba')
  await map.getByTitle('Ilave, Puno').click()
  assert.equal(await map.getByRole('link', { name: 'OpenStreetMap contributors' }).count(), 1)
  await page.getByRole('button', { name: 'Usar año 2024' }).click()
  if (width === 360) {
    await page.getByLabel('Fecha inicial').fill('2024-12-31')
    await page.getByLabel('Fecha final').fill('2024-01-01')
    await explore.click()
    await page.getByRole('alert').filter({ hasText: 'fecha inicial' }).waitFor()
    await page.getByRole('button', { name: 'Usar año 2024' }).click()
  }
  const seriesRequest = page.waitForResponse(response => response.url().includes('/climate/summary?'))
  await explore.focus()
  await page.keyboard.press('Enter')
  const exploration = await seriesRequest
  assert.equal(exploration.status(), 200)
  const data = await exploration.json()
  await page.getByRole('heading', { name: 'Resultados de Ilave' }).waitFor()
  assert.equal(data.series.length, 366)
  assert.equal(data.source.response_sha256, expected['puno-ilave'].source.response_sha256)
  assert.equal(data.source.cache_status, 'cached')
  const explorationUrl = page.url()
  await page.getByRole('region', { name: 'Temperatura diaria' }).locator('.recharts-line-curve').first().waitFor()
  await page.getByRole('region', { name: 'Precipitación diaria' }).locator('.recharts-bar-rectangle path').first().waitFor()
  assert.equal(await page.getByText('Caché vigente', { exact: true }).count(), 1)
  await checkOverflow(page)
  await page.getByText('Ver datos diarios en tabla', { exact: true }).click()
  await page.getByRole('table', { name: /Serie diaria de Ilave/ }).waitFor()
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click()
  await page.getByText('Filas 32–62 de 366', { exact: true }).waitFor()
  if (width === 360) {
    const scroll = page.getByRole('region', { name: 'Ver datos diarios en tabla', exact: true })
    assert.equal(await scroll.evaluate(element => {
      element.scrollLeft = 20
      return element.scrollLeft > 0 && element.scrollWidth > element.clientWidth
    }), true)
  }
  await page.getByText('Ver datos diarios en tabla', { exact: true }).click()
  let csvHash = demo ? null : await verifyDownload(page, width)
  const tiles = await page.locator('img.leaflet-tile-loaded').count()
  if (evidence && (width === 360 || width === 1440)) {
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.screenshot({ path: path.join(evidence, 'explorar-' + width + '.jpg'), fullPage: true, quality: 86 })
  }
  if (width === 1440) {
    await map.getByTitle('Acercar mapa').click()
    await map.getByTitle('Alejar mapa').click()
  }

  await page.getByRole('link', { name: 'Comparar localidad' }).click()
  for (const name of ['Urubamba', 'Chivay']) await page.getByRole('checkbox', { name: new RegExp(name) }).check()
  assert.equal(await page.getByLabel('Fecha inicial').inputValue(), '2024-01-01')
  const comparisonRequest = page.waitForResponse(response => response.url().includes('/climate/compare?'))
  await page.getByRole('button', { name: 'Comparar localidades' }).click()
  const comparison = await comparisonRequest
  assert.equal(comparison.status(), 200)
  const result = await comparison.json()
  assert.deepEqual(result.aligned_period, manifest.period)
  assert.deepEqual(result.locations.map(item => item.location_id), ids)
  assert.equal(result.comparisons.length, 3)
  for (const location of result.locations) {
    assert.equal(result.monthly_groups[location.location_id].length, 12)
    assert.equal(location.source.response_sha256, expected[location.location_id].source.response_sha256)
    if (demo) assert.equal(location.source.cache_status, 'cached')
  }
  await page.getByRole('heading', { name: 'Resultados de la comparación' }).waitFor()
  await page.getByRole('region', { name: 'Precipitación mensual' }).locator('.recharts-bar-rectangle path').first().waitFor()
  await page.getByRole('region', { name: 'Temperatura media mensual' }).locator('.recharts-line-curve').first().waitFor()
  const pair = page.getByText('Ilave − Urubamba', { exact: true })
  await pair.focus()
  await page.keyboard.press('Enter')
  await page.getByRole('region', { name: 'Ilave − Urubamba', exact: true }).getByText('366 · 100 %').first().waitFor()
  await checkOverflow(page)
  if (evidence && (width === 360 || width === 1440)) {
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.screenshot({ path: path.join(evidence, 'comparar-' + width + '.jpg'), fullPage: true, quality: 86 })
  }
  let rotation
  if (demo) {
    await page.goto(explorationUrl, { waitUntil: 'domcontentloaded' })
    const snapshot = page.waitForResponse(response => response.url().includes('/climate/summary?'))
    await page.getByRole('button', { name: 'Consultar clima' }).click()
    const refreshed = await (await snapshot).json()
    assert.equal(refreshed.source.response_sha256, data.source.response_sha256)
    assert.equal(refreshed.source.cache_status, 'cached')
    csvHash = await verifyDownload(page, width)
    await page.getByRole('link', { name: 'Abrir ficha agrícola' }).click()
    rotation = await verifyAbstention(page, manifest.period, campaignManifest, {
      checkPlotContext: width === 360,
      captureCropStep: evidence && width === 360 ? path.join(evidence, 'cultivos-360.jpg') : undefined,
    })
    await checkOverflow(page)
    const motor = page.getByText('Ver detalle del motor de evaluación', { exact: true })
    if (evidence && (width === 360 || width === 1440)) {
      await page.getByText('Consultar referencias del INIA', { exact: true }).click()
      await motor.click()
      await page.evaluate(() => window.scrollTo(0, 0))
      await page.screenshot({ path: path.join(evidence, 'rotaciones-' + width + '.jpg'), fullPage: true, quality: 86 })
      await motor.click()
    }
    await page.getByRole('link', { name: /cómo se evalúan/ }).click()
    await page.getByRole('heading', { name: 'Evaluación de rotaciones' }).waitFor()
    await checkOverflow(page)
    if (evidence && width === 1440) await page.screenshot({ path: path.join(evidence, 'metodologia-1440.jpg'), fullPage: true, quality: 86 })
  }
  return { width_px: width, base_map_tiles_loaded: tiles, daily_rows: data.series.length, monthly_groups_per_location: 12,
    comparisons: 3, csv_sha256: csvHash, horizontal_overflow: false, ...(rotation ? { rotation } : {}) }
}

try {
  if (evidence) await mkdir(evidence, { recursive: true })
  for (const width of widths) {
    const page = await browser.newPage({
      viewport: { width, height: 950 }, isMobile: width === 360, hasTouch: width === 360,
    })
    page.setDefaultTimeout(15000)
    page.setDefaultNavigationTimeout(40000)
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    try {
      report.viewports.push(await run(page, width))
    } catch (error) {
      console.error(width + ' px', page.url(), (await page.locator('body').innerText()).slice(0, 1500))
      throw error
    }
    assert.deepEqual(errors, [], width + ' px')
    await page.close()
  }
  const offlineMap = await browser.newPage({ viewport: { width: 360, height: 800 } })
  await offlineMap.route('https://tile.openstreetmap.org/**', route => route.abort())
  await offlineMap.goto(base + '/explorar', { waitUntil: 'domcontentloaded' })
  await offlineMap.getByRole('status').filter({ hasText: 'mapa base no pudo cargar' }).waitFor()
  await offlineMap.locator('.map-locations').getByRole('button', { name: /Chivay/ }).click()
  assert.equal(await offlineMap.getByLabel('Localidad', { exact: true }).inputValue(), 'arequipa-chivay')
  await offlineMap.getByRole('heading', { name: 'Chivay', exact: true }).waitFor()
  report.map_fallback = true
  await offlineMap.close()
  if (demo) {
    const simulation = await browser.newPage({ viewport: { width: 360, height: 850 }, isMobile: true, hasTouch: true })
    await simulation.route('**/api/v1/**', route => route.abort())
    await simulation.goto(base + '/rotaciones?modo=demo', { waitUntil: 'domcontentloaded' })
    await simulation.getByText('Simulación TEST.', { exact: true }).waitFor()
    const runSimulation = simulation.getByRole('button', { name: 'Simular evaluación' })
    await runSimulation.click()
    await simulation.getByText('100 de 100', { exact: true }).waitFor()
    await simulation.getByText(/Posición 2/).waitFor()
    await simulation.getByRole('radio', { name: /Ver una restricción crítica/ }).check()
    await runSimulation.click()
    await simulation.getByText('Restricción detectada', { exact: true }).waitFor()
    await checkOverflow(simulation)
    report.rotation_simulation = { width_px: 360, comparison: true, restriction: true, api_blocked: true }
    await simulation.close()
  }
  const json = JSON.stringify(report, null, 2)
  if (evidence) await writeFile(path.join(evidence, 'browser-verification.json'), json + '\n')
  console.log(json)
} finally {
  await browser.close()
}
