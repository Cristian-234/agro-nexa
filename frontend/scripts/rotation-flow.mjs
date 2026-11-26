import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

export async function verifyAbstention(page, { start, end }, campaignManifest, { checkPlotContext = false, captureCropStep } = {}) {
  const next = page.getByRole('button', { name: 'Continuar' })
  await next.waitFor()
  assert.equal(await page.getByLabel('Fecha inicial').inputValue(), start)
  assert.equal(await page.getByLabel('Fecha final').inputValue(), end)
  assert.equal(await page.getByLabel('Localidad', { exact: true }).inputValue(), 'puno-ilave')
  await next.focus()
  await page.keyboard.press('Enter')
  await page.getByRole('heading', { name: 'Mis cultivos anteriores' }).waitFor()
  assert.equal(await page.getByRole('heading', { name: 'Mis cultivos anteriores' }).evaluate(el => el === document.activeElement), true)
  for (const crop of ['Papa', 'Quinua', 'Cebada', 'Haba']) {
    await page.getByRole('radio', { name: crop, exact: true }).waitFor()
  }
  if (captureCropStep) await page.screenshot({ path: captureCropStep, fullPage: true, quality: 86 })
  await page.getByRole('radio', { name: 'Papa', exact: true }).check()
  await next.click()
  await page.getByRole('radio', { name: 'Quinua', exact: true }).check()
  if (checkPlotContext) {
    await page.getByLabel('Precisión de la fecha').first().selectOption('day')
    await page.getByLabel('Precisión de la fecha').last().selectOption('day')
    await page.locator('#next-sowing').fill('2026-12-01')
    await page.locator('#next-harvest').fill('2026-11-01')
    await next.click()
    await page.getByRole('alert').filter({ hasText: 'igual o posterior' }).waitFor()
    assert.equal(await page.locator('#next-harvest').getAttribute('aria-invalid'), 'true')
    await page.locator('#next-harvest').fill('2027-02-01')
  }
  await next.click()
  assert.equal(await page.getByLabel('¿Cómo consigues el agua para tus cultivos?').inputValue(), 'unknown')
  assert.equal(await page.getByLabel('pH medido (opcional)').count(), 0)
  if (checkPlotContext) {
    await page.getByText('Datos adicionales de mi terreno', { exact: true }).click()
    await page.getByLabel('Campaña agrícola').fill('Campaña TEST')
  }
  await next.click()
  await page.getByRole('heading', { name: 'Revisar mis respuestas' }).waitFor()
  const evaluate = page.getByRole('button', { name: 'Analizar mi próxima siembra' })
  const historyResponse = page.waitForResponse(item => item.url().includes('/climate/summary?'))
  const toggle = page.getByText('Consultar referencias del INIA', { exact: true })
  const response = page.waitForResponse(item => item.url().endsWith('/api/v1/rotations/evaluate'))
  await evaluate.click()
  const evaluation = await response
  assert.equal(evaluation.status(), 200)
  assert.equal(evaluation.headers()['cache-control'], 'no-store')
  const body = await evaluation.json()
  if (checkPlotContext) {
    assert.equal('plot_context' in body, false)
    await page.getByRole('region', { name: 'Contexto declarado de la parcela' }).getByText('Campaña TEST').waitFor()
  }
  assert.equal(body.location_id, 'puno-ilave')
  assert.deepEqual(body.period, { start, end })
  assert.equal(body.rule_set_version, null)
  assert.equal(body.climate_source, null)
  assert.equal(body.alternatives.length, 1)
  const { crop_id, state, score, rank } = body.alternatives[0]
  assert.deepEqual({ crop_id, state, score, rank }, {
    crop_id: 'quinoa', state: 'insufficient_evidence', score: null, rank: null,
  })
  assert.equal(body.regional_notes.filter(note => note.matrix_id === 'PUN-PAP-QUI').length, 2)
  await page.getByText('Información de referencia', { exact: true }).first().waitFor()
  const history = await (await historyResponse).json()
  assert.equal(history.source.provider, 'NASA POWER')
  assert.equal(history.source.cache_status, 'cached')
  assert.deepEqual(history.period, { start, end })
  await page.getByRole('heading', { name: 'El clima histórico del lugar' }).waitFor()
  await page.getByText('Ver detalle del motor de evaluación', { exact: true }).click()
  await page.getByText('Evidencia insuficiente', { exact: true }).waitFor()
  assert.equal(await toggle.evaluate(item => item.parentElement.open), false)
  if (checkPlotContext) {
    const [download] = await Promise.all([
      page.waitForEvent('download'), page.getByRole('button', { name: 'Descargar evaluación (JSON)' }).click(),
    ])
    const record = JSON.parse(await readFile(await download.path(), 'utf8'))
    assert.equal(record.schema_version, 1)
    assert.equal(record.input.plot_context.campaign, 'Campaña TEST')
    assert.equal(record.climate.source.response_sha256, history.source.response_sha256)
    assert.equal(record.result.alternatives[0].state, 'insufficient_evidence')
  }
  assert.equal(await page.getByText(/Puntuación exploratoria/).count(), 0)
  await toggle.click()
  const preliminaryResponse = page.waitForResponse(item => item.url().endsWith('/api/v1/rotations/preliminary'))
  await page.getByRole('button', { name: 'Contrastar con las referencias' }).click()
  const preliminary = await preliminaryResponse
  assert.equal(preliminary.status(), 200)
  assert.equal(preliminary.headers()['cache-control'], 'no-store')
  const draft = await preliminary.json()
  assert.equal(draft.version, 'illpa-inia-ilave-v2')
  assert.equal(draft.cultivar, 'unknown')
  assert.equal(draft.criteria.length, 7)
  assert.equal(draft.criteria.find(item => item.reference.id === 'ph').entered_value.soil_ph, null)
  assert.deepEqual(draft.criteria.find(item => item.reference.id === 'moisture').entered_value,
    { irrigation: 'unknown', kind: 'unknown' })
  assert.equal(draft.criteria.filter(item => item.state === 'insufficient_information').length, 7)
  assert.equal(draft.criteria.filter(item => item.reference.criterion_type === 'candidate_rule').length, 3)
  const region = page.getByRole('region', { name: 'Evaluación agronómica preliminar' })
  await region.getByRole('heading', { name: 'Precipitación de referencia' }).waitFor()
  const phDetails = region.getByText('¿Por qué aparece este resultado?', { exact: true }).nth(1)
  assert.equal(await phDetails.evaluate(item => item.parentElement.open), false)
  await phDetails.click()
  await region.getByRole('link', { name: 'INIA · Quinua Illpa INIA' }).waitFor()
  const campaign = page.getByRole('region', { name: 'Clima histórico de campaña en Ilave' })
  const campaignPeriod = campaignManifest?.period ?? { start, end }
  await campaign.getByLabel('Fecha inicial').fill(campaignPeriod.start)
  await campaign.getByLabel('Fecha final').fill(campaignPeriod.end)
  const campaignResponse = page.waitForResponse(item => item.url().includes('/climate/summary?'))
  await campaign.getByRole('button', { name: 'Consultar clima de campaña' }).click()
  const weather = await campaignResponse
  assert.equal(weather.status(), 200)
  const climate = await weather.json()
  assert.equal(climate.source.provider, 'NASA POWER')
  assert.equal(climate.source.cache_status, 'cached')
  assert.deepEqual(climate.period, campaignPeriod)
  assert.equal(climate.groups.length, 1)
  if (campaignManifest) assert.equal(climate.source.response_sha256, campaignManifest.results[0].source.response_sha256)
  await campaign.getByRole('heading', { name: 'Días de helada potencial' }).waitFor()
  await campaign.getByRole('heading', { name: 'Cobertura de temperatura máxima' }).waitFor()
  const { mean_temperature, accumulated_precipitation, potential_frost_days } = climate.groups[0].indicators
  return {
    crop_id, state, score, rank, rule_set_version: body.rule_set_version,
    plot_context_checked: checkPlotContext,
    planting_questionnaire: true, regional_reference: 'PUN-PAP-QUI',
    historical_summary_sha256: history.source.response_sha256,
    preliminary: { version: draft.version, cultivar: draft.cultivar, criteria: draft.criteria.length,
      states: Object.fromEntries(draft.criteria.map(item => [item.reference.id, item.state])) },
    campaign: { period: campaignPeriod, provider: climate.source.provider, cache_status: climate.source.cache_status,
      response_sha256: climate.source.response_sha256, mean_temperature, accumulated_precipitation, potential_frost_days },
  }
}
