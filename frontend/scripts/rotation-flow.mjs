import assert from 'node:assert/strict'

export async function verifyAbstention(page, { start, end }, campaignManifest) {
  const next = page.getByRole('button', { name: 'Continuar' })
  await next.waitFor()
  assert.equal(await page.getByLabel('Fecha inicial').inputValue(), start)
  assert.equal(await page.getByLabel('Fecha final').inputValue(), end)
  assert.equal(await page.getByLabel('Localidad', { exact: true }).inputValue(), 'puno-ilave')
  await next.focus()
  await page.keyboard.press('Enter')
  await page.getByLabel('Cultivo anterior').selectOption('potato')
  await page.getByRole('checkbox', { name: /Quinua/ }).check()
  await next.click()
  assert.equal(await page.getByLabel('Disponibilidad de riego').inputValue(), 'unknown')
  assert.equal(await page.getByLabel('pH medido (opcional)').inputValue(), '')
  const response = page.waitForResponse(item => item.url().endsWith('/api/v1/rotations/evaluate'))
  const toggle = page.getByText('Consultar referencias del INIA', { exact: true })
  assert.equal(await toggle.evaluate(item => item.parentElement.open), false)
  await page.getByRole('button', { name: 'Contrastar con las referencias' }).waitFor({ state: 'hidden' })
  await page.getByRole('button', { name: 'Evaluar alternativas' }).click()
  const evaluation = await response
  assert.equal(evaluation.status(), 200)
  assert.equal(evaluation.headers()['cache-control'], 'no-store')
  const body = await evaluation.json()
  assert.equal(body.location_id, 'puno-ilave')
  assert.deepEqual(body.period, { start, end })
  assert.equal(body.rule_set_version, null)
  assert.equal(body.climate_source, null)
  assert.equal(body.alternatives.length, 1)
  const { crop_id, state, score, rank } = body.alternatives[0]
  assert.deepEqual({ crop_id, state, score, rank }, {
    crop_id: 'quinoa', state: 'insufficient_evidence', score: null, rank: null,
  })
  await page.getByText('Evidencia insuficiente', { exact: true }).waitFor()
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
  assert.equal(await region.getByRole('link', { name: 'INIA · Quinua Illpa INIA' }).count(), 6)
  await region.getByText(/8\. Tipos de suelos/).waitFor()
  await region.getByText('Sin historial del mismo lote', { exact: true }).waitFor()
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
    preliminary: { version: draft.version, cultivar: draft.cultivar, criteria: draft.criteria.length,
      states: Object.fromEntries(draft.criteria.map(item => [item.reference.id, item.state])) },
    campaign: { period: campaignPeriod, provider: climate.source.provider, cache_status: climate.source.cache_status,
      response_sha256: climate.source.response_sha256, mean_temperature, accumulated_precipitation, potential_frost_days },
  }
}
