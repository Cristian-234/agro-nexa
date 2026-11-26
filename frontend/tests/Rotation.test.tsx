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

it('valida la ficha por pasos y muestra abstención con pH opcional', async () => {
  let submitted: RotationInput | null = null
  vi.stubGlobal('fetch', vi.fn((url: string, options?: RequestInit) => {
    if (url.endsWith('/crops')) return Promise.resolve(Response.json(crops))
    expect(url).toMatch(/\/rotations\/evaluate$/)
    expect(options?.method).toBe('POST')
    submitted = JSON.parse(String(options?.body))
    return Promise.resolve(Response.json(result))
  }))
  const user = userEvent.setup()
  render(<Rotations locations={[location]} />)
  await user.click(await screen.findByRole('button', { name: 'Usar año 2024' }))
  await user.click(screen.getByRole('button', { name: 'Continuar' }))
  await user.click(screen.getByRole('button', { name: 'Continuar' }))
  expect(screen.getByRole('alert').textContent).toContain('cultivo candidato')
  await user.selectOptions(screen.getByLabelText('Cultivo anterior'), 'potato')
  await user.click(screen.getByRole('checkbox', { name: /Quinua/ }))
  await user.click(screen.getByRole('button', { name: 'Continuar' }))
  expect(screen.getByText('Consultar referencias del INIA').closest('details')?.open).toBe(false)
  const ph = screen.getByLabelText('pH medido (opcional)')
  await user.type(ph, '15')
  await user.click(screen.getByRole('button', { name: 'Evaluar alternativas' }))
  expect(screen.getByRole('alert').textContent).toContain('entre 0 y 14')
  expect(submitted).toBeNull()
  await user.clear(ph)
  await user.click(screen.getByRole('checkbox', { name: 'Agua' }))
  await user.click(screen.getByRole('button', { name: 'Evaluar alternativas' }))
  expect(await screen.findByText('Evidencia insuficiente')).toBeTruthy()
  expect(screen.queryByText(/Puntuación exploratoria/)).toBeNull()
  expect(submitted).toMatchObject({
    location_id: location.id, candidate_crops: ['quinoa'], soil_ph: null,
    priorities: ['water'], irrigation: 'unknown', start: '2024-01-01',
  })
  expect(window.location.search).not.toContain('priorities')
  await user.click(screen.getByRole('button', { name: 'Editar agua y suelo' }))
  expect((screen.getByRole('checkbox', { name: 'Agua' }) as HTMLInputElement).checked).toBe(true)
  await user.selectOptions(screen.getByLabelText('Disponibilidad de riego'), 'limited')
  expect(screen.queryByText('Evidencia insuficiente')).toBeNull()
}, 10_000)

it('envía los datos de Illpa y muestra la fuente junto con la abstención', async () => {
  let draft: PreliminaryInput | undefined
  let approved: RotationInput | undefined
  vi.stubGlobal('fetch', vi.fn((url: string, options?: RequestInit) => {
    if (url.endsWith('/crops')) return Promise.resolve(Response.json(crops))
    const payload = JSON.parse(String(options?.body))
    if (url.endsWith('/preliminary')) {
      draft = payload
      return Promise.resolve(Response.json(preliminary))
    }
    approved = payload
    return Promise.resolve(Response.json(result))
  }))
  const user = userEvent.setup()
  render(<Rotations locations={[location]} />)
  await user.click(await screen.findByRole('button', { name: 'Usar año 2024' }))
  await user.click(screen.getByRole('button', { name: 'Continuar' }))
  await user.selectOptions(screen.getByLabelText('Cultivo anterior'), 'potato')
  await user.click(screen.getByRole('checkbox', { name: /Quinua/ }))
  await user.click(screen.getByRole('button', { name: 'Continuar' }))
  await user.click(screen.getByText('Consultar referencias del INIA'))
  await user.selectOptions(screen.getByLabelText('Cultivar de quinua'), 'illpa_inia')
  await user.selectOptions(screen.getByLabelText('Cultivo inmediato del mismo lote'), 'potato')
  await user.type(screen.getByLabelText('Fecha de cosecha anterior'), '2024-05-01')
  await user.selectOptions(screen.getByLabelText('Textura del suelo'), 'loam')
  await user.selectOptions(screen.getByLabelText('Textura para el contraste'), 'sandy_loam')
  await user.selectOptions(screen.getByLabelText('Drenaje de la parcela'), 'limited')
  await user.selectOptions(screen.getByLabelText('Antecedentes de inundación'), 'yes')
  await user.selectOptions(screen.getByLabelText('Disponibilidad de riego'), 'none')
  await user.selectOptions(screen.getByLabelText('Humedad en el establecimiento'), 'observed')
  await user.type(screen.getByLabelText('Fecha de la observación o medición'), '2024-07-13')
  await user.selectOptions(screen.getByLabelText('Condición observada'), 'moist')
  await user.type(screen.getByLabelText('pH medido (opcional)'), '6')
  await user.type(screen.getByLabelText('Fecha de medición del pH'), '2024-07-12')
  await user.type(screen.getByLabelText('Método de medición del pH'), 'TEST')
  await user.click(screen.getByRole('button', { name: 'Evaluar alternativas' }))
  const approvedSection = await screen.findByRole('region', { name: 'Evaluación con reglas aprobadas' })
  expect(screen.getByRole('heading', { name: 'Evaluación y resultados' })).toBeTruthy()
  expect(draft).toBeUndefined()
  await user.click(screen.getByRole('button', { name: 'Contrastar con las referencias' }))
  const preliminarySection = await screen.findByRole('region', { name: 'Evaluación agronómica preliminar' })
  expect(within(approvedSection).getByText('Evidencia insuficiente')).toBeTruthy()
  expect(within(approvedSection).getByText(/carece de una versión aprobada/)).toBeTruthy()
  expect(within(approvedSection).queryByText(/Cobertura de evidencia/)).toBeNull()
  expect(within(preliminarySection).getByText('Coincide con la referencia')).toBeTruthy()
  expect(preliminarySection.compareDocumentPosition(approvedSection) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Fuente TEST' }).getAttribute('href')).toBe('https://example.test')
  expect(screen.getByText('Versión test', { exact: false })).toBeTruthy()
  expect(screen.getByText('Regla candidata · Borrador')).toBeTruthy()
  expect(screen.getByText('Cotejada en la fuente primaria', { exact: false })).toBeTruthy()
  expect(draft).toMatchObject({
    cultivar: 'illpa_inia', soil_ph: 6, soil_ph_date: '2024-07-12', soil_texture: 'sandy_loam',
    soil_ph_method: 'TEST', drainage: 'limited', flooding_history: 'yes', irrigation: 'none',
    lot_history: [{ crop: 'potato', harvest_date: '2024-05-01' }],
    establishment_moisture: { kind: 'observed', condition: 'moist', date: '2024-07-13' },
  })
  expect(approved?.soil_texture).toBe('loam')
  expect(approved).not.toHaveProperty('cultivar')
  expect(window.location.search).not.toContain('soil_ph')
  expect(window.location.search).not.toContain('irrigation')
}, 15_000)

it.each([
  ['cusco-urubamba', 'Urubamba', 'Cusco'],
  ['arequipa-chivay', 'Chivay', 'Arequipa'],
])('mantiene la ficha básica en %s', async (id, name, region) => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(crops)))
  const user = userEvent.setup()
  render(<Rotations locations={[location, { ...location, id, name, region }]} />)
  await user.selectOptions(await screen.findByLabelText('Localidad'), id)
  await user.click(screen.getByRole('button', { name: 'Usar año 2024' }))
  await user.click(screen.getByRole('button', { name: 'Continuar' }))
  await user.selectOptions(screen.getByLabelText('Cultivo anterior'), 'potato')
  await user.click(screen.getByRole('checkbox', { name: /Quinua/ }))
  await user.click(screen.getByRole('button', { name: 'Continuar' }))
  expect(screen.getByLabelText('Disponibilidad de riego')).toBeTruthy()
  expect(screen.getByLabelText('Textura del suelo')).toBeTruthy()
  expect(screen.getByLabelText('pH medido (opcional)')).toBeTruthy()
  expect(screen.queryByText('Consultar referencias del INIA')).toBeNull()
})

it('reintenta el catálogo con un error controlado', async () => {
  vi.stubGlobal('fetch', vi.fn()
    .mockResolvedValueOnce(Response.json({ message: 'Error TEST' }, { status: 503 }))
    .mockResolvedValueOnce(Response.json(crops)))
  const user = userEvent.setup()
  render(<Rotations locations={[location]} />)
  expect((await screen.findByRole('alert')).textContent).toBe('Error TEST')
  await user.click(screen.getByRole('button', { name: 'Reintentar catálogo' }))
  expect(await screen.findByRole('heading', { name: 'Zona y periodo' })).toBeTruthy()
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
