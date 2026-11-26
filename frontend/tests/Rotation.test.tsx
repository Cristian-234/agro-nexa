import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { Rotations } from '../src/pages/Rotations'
import { App } from '../src/app/App'
import { CampaignClimate } from '../src/features/rotation/CampaignClimate'
import type { RotationInput, RotationResult } from '../src/api/rotation'
import type { PreliminaryInput, PreliminaryResult } from '../src/api/preliminary'

const location = {
  id: 'puno-ilave', name: 'Ilave', region: 'Puno', latitude: -1, longitude: -2,
  coordinate_source: 'Fixture TEST', verified: true,
}
const crops = [
  { id: 'potato', name_es: 'Papa', description: 'TEST', source_url: null },
  { id: 'quinoa', name_es: 'Quinua', description: 'TEST', source_url: null },
  { id: 'barley', name_es: 'Cebada', description: 'TEST', source_url: null },
  { id: 'faba-bean', name_es: 'Haba', description: 'TEST', source_url: null },
]
const result: RotationResult = {
  location_id: location.id, period: { start: '2024-01-01', end: '2024-12-31' },
  evaluated_at: '2024-12-31T12:00:00Z', rule_set_version: null, climate_source: null,
  min_evidence_coverage: 0.8, warnings: [],
  alternatives: [{
    crop_id: 'quinoa', state: 'insufficient_evidence', rule_set_version: null, criteria: [],
    evidence_coverage: 0, score: null, rank: null, warnings: ['Faltan reglas aprobadas TEST.'],
  }],
}
const preliminary: PreliminaryResult = {
  location_id: 'puno-ilave', cultivar: 'illpa_inia', version: 'test',
  criteria: [{
    reference: {
      id: 'ph', parameter: 'pH del suelo', version: 'test', value: [5.5, 8.0], unit: 'pH',
      scope: 'Ámbito TEST', source_title: 'Fuente TEST', source_url: 'https://example.test',
      source_section: 'Página 1 TEST', criterion_type: 'candidate_rule',
      source_issuer: 'Organismo TEST', source_year: 2024, verification: 'verified_in_primary_source',
    },
    entered_value: { soil_ph: 6, date: '2024-07-12' }, state: 'matches_reference',
    explanation: 'Explicación TEST', limitation: 'Limitación TEST', pending_data: [],
  }],
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  window.history.replaceState(null, '', '/')
})

function mockApi() {
  const posted: { evaluation?: RotationInput; preliminary?: PreliminaryInput } = {}
  const fetch = vi.fn((url: string, options?: RequestInit) => {
    if (url.endsWith('/crops')) return Promise.resolve(Response.json(crops))
    if (url.endsWith('/rotations/evaluate')) {
      posted.evaluation = JSON.parse(String(options?.body))
      return Promise.resolve(Response.json(result))
    }
    if (url.endsWith('/rotations/preliminary')) {
      posted.preliminary = JSON.parse(String(options?.body))
      return Promise.resolve(Response.json(preliminary))
    }
    expect(url).toMatch(/\/climate\/summary\?/)
    return Promise.resolve(Response.json({ message: 'Resumen climático TEST no disponible.' }, { status: 503 }))
  })
  vi.stubGlobal('fetch', fetch)
  return { fetch, posted }
}

it('conserva las respuestas, explora los cuatro cultivos y permite omitir el análisis del suelo', async () => {
  const { posted } = mockApi()
  const user = userEvent.setup()
  render(<Rotations locations={[location]} />)
  await screen.findByRole('heading', { name: 'Mi terreno' })
  expect(screen.getByRole('progressbar')).toHaveProperty('value', 1)
  await user.type(screen.getByLabelText(/Cuántas veces has sembrado/), '3')
  await user.click(screen.getByRole('button', { name: 'Continuar' }))
  expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Mis cultivos anteriores' }))
  await user.click(screen.getByRole('radio', { name: 'Cebada' }))
  await user.selectOptions(screen.getByLabelText(/Has sembrado varias veces/), 'yes')
  await user.type(screen.getByLabelText(/Cuántas campañas seguidas/), '2')
  await user.click(screen.getByRole('button', { name: 'Anterior' }))
  expect(screen.getByLabelText(/Cuántas veces has sembrado/)).toHaveProperty('value', '3')
  await user.click(screen.getByRole('button', { name: 'Continuar' }))
  expect(screen.getByRole('radio', { name: 'Cebada' })).toHaveProperty('checked', true)
  await user.click(screen.getByRole('button', { name: 'Continuar' }))
  await user.click(screen.getByRole('button', { name: 'Continuar' }))
  expect(screen.getByRole('alert').textContent).toContain('Elige un cultivo')
  await user.click(screen.getByRole('radio', { name: 'Todavía no lo decido' }))
  await user.click(screen.getByRole('button', { name: 'Continuar' }))
  expect(screen.queryByLabelText('pH medido (opcional)')).toBeNull()
  await user.selectOptions(screen.getByLabelText(/Cómo consigues el agua/), 'both')
  await user.click(screen.getByRole('button', { name: 'Continuar' }))
  expect(screen.getByText(/Campañas seguidas/i)).toBeTruthy()
  await user.click(screen.getByRole('button', { name: 'Analizar mi próxima siembra' }))
  await screen.findByText(/hacen falta criterios aprobados/)
  expect(screen.queryByText('Consultar referencias del INIA')).toBeNull()
  expect(posted.evaluation).toMatchObject({
    previous_crop: 'barley', candidate_crops: ['potato', 'quinoa', 'barley', 'faba-bean'],
    soil_ph: null, irrigation: 'available', planting_answers: {
      campaigns: 3, consecutive: 2, experience: 'unknown', water: 'both', soil_test: 'unknown',
    },
  })
  expect(window.location.search).not.toContain('campaigns')
}, 20_000)

it('corrige las fechas, conserva el contexto local y permite revisar la abstención', async () => {
  const { posted } = mockApi()
  const user = userEvent.setup()
  render(<Rotations locations={[location]} />)
  const next = await screen.findByRole('button', { name: 'Continuar' })
  await user.click(next)
  await user.click(screen.getByRole('button', { name: 'Continuar' }))
  await user.click(screen.getByRole('radio', { name: 'Quinua' }))
  const [sowingMode, harvestMode] = screen.getAllByLabelText('Precisión de la fecha')
  await user.selectOptions(sowingMode, 'day')
  await user.selectOptions(harvestMode, 'day')
  await user.type(screen.getByLabelText(/Fecha exacta.*Cuándo piensas sembrar/), '2026-12-01')
  const harvest = screen.getByLabelText(/Fecha exacta.*Cuándo esperas cosechar/)
  await user.type(harvest, '2026-11-01')
  await user.click(screen.getByRole('button', { name: 'Continuar' }))
  expect(screen.getByRole('alert').textContent).toContain('igual o posterior')
  expect(document.activeElement).toBe(harvest)
  expect(posted.evaluation).toBeUndefined()
  await user.clear(harvest)
  await user.type(harvest, '2027-02-01')
  await user.click(screen.getByRole('button', { name: 'Continuar' }))
  await user.click(screen.getByText('Datos adicionales de mi terreno'))
  await user.type(screen.getByLabelText('Campaña agrícola'), 'Campaña TEST')
  await user.type(screen.getByLabelText('Área de parcela (m²)'), '0')
  await user.click(screen.getByRole('button', { name: 'Continuar' }))
  await user.click(screen.getByRole('button', { name: 'Analizar mi próxima siembra' }))
  const context = await screen.findByRole('region', { name: 'Contexto declarado de la parcela' })
  expect(within(context).getByText('Campaña TEST')).toBeTruthy()
  expect(within(context).getByText('0 m²')).toBeTruthy()
  await user.click(await screen.findByText('Ver detalle del motor de evaluación'))
  expect(screen.getByText('Evidencia insuficiente')).toBeTruthy()
  expect(screen.queryByText(/Puntuación exploratoria/)).toBeNull()
}, 20_000)

it('contrasta las respuestas de Ilave y revela la fuente solo al expandir el criterio', async () => {
  const { posted } = mockApi()
  const user = userEvent.setup()
  render(<Rotations locations={[location]} />)
  await user.click(await screen.findByRole('button', { name: 'Continuar' }))
  await user.click(screen.getByRole('radio', { name: 'Papa' }))
  await user.selectOptions(screen.getByLabelText('Precisión de la fecha'), 'day')
  await user.type(screen.getByLabelText(/Fecha exacta.*última cosecha/), '2024-05-01')
  await user.click(screen.getByRole('button', { name: 'Continuar' }))
  await user.click(screen.getByRole('radio', { name: 'Quinua' }))
  await user.click(screen.getByRole('button', { name: 'Continuar' }))
  await user.selectOptions(screen.getByLabelText(/Conoces el tipo de tierra/), 'sandy_loam')
  await user.selectOptions(screen.getByLabelText(/mandaste analizar/), 'yes')
  await user.click(screen.getByText('Datos adicionales de mi terreno'))
  await user.type(screen.getByLabelText('pH medido (opcional)'), '6')
  await user.type(screen.getByLabelText('Fecha de medición del pH'), '2024-07-12')
  await user.type(screen.getByLabelText('Método de medición del pH'), 'TEST')
  await user.click(screen.getByRole('button', { name: 'Continuar' }))
  await user.click(screen.getByRole('button', { name: 'Analizar mi próxima siembra' }))
  await user.click(await screen.findByText('Consultar referencias del INIA'))
  await user.selectOptions(screen.getByLabelText('Cultivar de quinua'), 'illpa_inia')
  expect(posted.preliminary).toBeUndefined()
  await user.click(screen.getByRole('button', { name: 'Contrastar con las referencias' }))
  const section = await screen.findByRole('region', { name: 'Evaluación agronómica preliminar' })
  expect(within(section).getByText('Coincide con la referencia')).toBeTruthy()
  const criterion = within(section).getByText('¿Por qué aparece este resultado?')
  expect(criterion.closest('details')?.open).toBe(false)
  await user.click(criterion)
  expect(criterion.closest('details')?.open).toBe(true)
  expect(within(section).getByRole('link', { name: 'Fuente TEST' }).getAttribute('href')).toBe('https://example.test')
  expect(posted.preliminary).toMatchObject({
    cultivar: 'illpa_inia', soil_ph: 6, soil_ph_date: '2024-07-12',
    soil_ph_method: 'TEST', soil_texture: 'sandy_loam',
    lot_history: [{ crop: 'potato', harvest_date: '2024-05-01' }],
  })
  expect(posted.evaluation).not.toHaveProperty('cultivar')
  expect(window.location.search).not.toContain('soil_ph')
}, 20_000)

it.each([
  ['cusco-urubamba', 'Urubamba', 'Cusco'],
  ['arequipa-chivay', 'Chivay', 'Arequipa'],
])('selecciona %s sin trasladar el contraste de Ilave', async (id, name, region) => {
  const { posted } = mockApi()
  const user = userEvent.setup()
  render(<Rotations locations={[location, { ...location, id, name, region }]} />)
  await user.selectOptions(await screen.findByLabelText('Departamento'), region)
  expect(screen.getByLabelText('Localidad')).toHaveProperty('value', id)
  await user.click(screen.getByRole('button', { name: 'Continuar' }))
  await user.click(screen.getByRole('radio', { name: 'Papa' }))
  await user.click(screen.getByRole('button', { name: 'Continuar' }))
  await user.click(screen.getByRole('radio', { name: 'Quinua' }))
  await user.click(screen.getByRole('button', { name: 'Continuar' }))
  await user.click(screen.getByRole('button', { name: 'Continuar' }))
  await user.click(screen.getByRole('button', { name: 'Analizar mi próxima siembra' }))
  expect(await screen.findByRole('heading', { name: 'Lo que encontramos sobre tu próxima siembra' })).toBeTruthy()
  expect(posted.evaluation?.location_id).toBe(id)
  expect(screen.queryByText('Consultar referencias del INIA')).toBeNull()
}, 12_000)

it('reintenta el catálogo con un error controlado', async () => {
  vi.stubGlobal('fetch', vi.fn()
    .mockResolvedValueOnce(Response.json({ message: 'Error TEST' }, { status: 503 }))
    .mockResolvedValueOnce(Response.json(crops)))
  const user = userEvent.setup()
  render(<Rotations locations={[location]} />)
  expect((await screen.findByRole('alert')).textContent).toBe('Error TEST')
  await user.click(screen.getByRole('button', { name: 'Reintentar catálogo' }))
  expect(await screen.findByRole('heading', { name: 'Mi terreno' })).toBeTruthy()
})

it('muestra puntuación y una restricción aunque el catálogo real esté inaccesible', async () => {
  const fetch = vi.fn().mockRejectedValue(new Error('API fuera de servicio TEST'))
  vi.stubGlobal('fetch', fetch)
  window.history.replaceState(null, '', '/rotaciones?modo=demo')
  const user = userEvent.setup()
  render(<App />)
  expect(await screen.findByText('Simulación TEST.')).toBeTruthy()
  const submit = screen.getByRole('button', { name: 'Simular evaluación' })
  await user.click(submit)
  expect(screen.getByText('100 de 100')).toBeTruthy()
  expect(screen.getByText(/Posición 1/)).toBeTruthy()
  expect(screen.getByText(/Posición 2/)).toBeTruthy()
  await user.click(screen.getByRole('radio', { name: /Ver una restricción crítica/ }))
  await user.click(submit)
  const quinoa = screen.getByRole('heading', { name: 'Quinua después de papa' }).closest('article')
  expect(quinoa).toBeTruthy()
  expect(within(quinoa!).getByText('Restricción detectada')).toBeTruthy()
  expect(within(quinoa!).queryByText(/Puntos de la simulación/)).toBeNull()
  expect(screen.queryByText('Evidencia insuficiente')).toBeNull()
  expect(fetch).toHaveBeenCalledTimes(1)
  expect(fetch.mock.calls[0][0]).toMatch(/\/locations$/)
})

it('consulta una ventana de campaña sin invocar los endpoints agronómicos', async () => {
  // Synthetic summary for UI and query validation only.
  const period = { start: '2023-10-01', end: '2024-04-30' }
  const indicator = { value: 100, coverage_pct: 95, valid_days: 202, expected_days: 213, status: 'partial' }
  const fetch = vi.fn().mockResolvedValue(Response.json({
    period, warnings: [],
    source: {
      provider: 'NASA POWER', documentation_url: 'https://example.test', resolution: 'TEST',
      time_standard: 'LST', fetched_at: '2024-05-01T00:00:00Z', cache_status: 'cached', cache_age_seconds: 0,
    },
    groups: [{ warnings: [], indicators: {
      accumulated_precipitation: { ...indicator, unit: 'mm' },
      mean_temperature: { ...indicator, unit: 'degC' },
      potential_frost_days: { ...indicator, unit: 'days' },
      max_temperature: { ...indicator, unit: 'degC' },
    } }],
  }))
  vi.stubGlobal('fetch', fetch)
  const user = userEvent.setup()
  render(<CampaignClimate />)
  const submit = screen.getByRole('button', { name: 'Consultar clima de campaña' })
  await user.click(submit)
  expect(screen.getByRole('alert').textContent).toContain('Completa las dos fechas')
  expect(fetch).not.toHaveBeenCalled()
  await user.type(screen.getByLabelText('Fecha inicial'), period.start)
  await user.type(screen.getByLabelText('Fecha final'), period.end)
  await user.click(submit)
  expect(await screen.findByRole('heading', { name: 'Precipitación observada parcial' })).toBeTruthy()
  expect(screen.getByText(/Temperatura mínima diaria: 95/)).toBeTruthy()
  expect(fetch).toHaveBeenCalledTimes(1)
  const request = new URL(fetch.mock.calls[0][0], 'https://example.test')
  expect(request.pathname).toBe('/api/v1/climate/summary')
  expect(Object.fromEntries(request.searchParams)).toEqual({ ...period, location_id: 'puno-ilave', group_by: 'period' })
}, 10_000)
