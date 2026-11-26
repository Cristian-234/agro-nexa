import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { App } from '../src/app/App'
import type { Exploration, Indicator, MonthlyComparison } from '../src/api/climate'
import type { Location } from '../src/api/locations'

vi.mock('../src/features/climate/Charts', () => ({
  chartColors: ['green', 'blue', 'brown'],
  ClimateChart: ({ title, data }: { title: string; data: unknown[] }) =>
    <div aria-label={title} data-testid={'chart-' + title}>{JSON.stringify(data)}</div>,
}))
vi.mock('../src/features/climate/LocationMap', () => ({
  LocationMap: ({ locations, onSelect }: { locations: Location[]; onSelect: (id: string) => void }) =>
    <div aria-label="Mapa TEST">{locations.map(item =>
      <button key={item.id} type="button" onClick={() => onSelect(item.id)}>{item.name}</button>)}</div>,
}))

const locations = [
  ['puno-ilave', 'Ilave', 'Puno'], ['cusco-urubamba', 'Urubamba', 'Cusco'], ['arequipa-chivay', 'Chivay', 'Arequipa'],
].map(([id, name, region]): Location => ({
  id, name, region, latitude: -1, longitude: -2, coordinate_source: 'Coordenada TEST', verified: false,
}))

// Valores sintéticos TEST para verificar los estados de la interfaz.
const period = { start: '2024-01-01', end: '2024-12-31' }
const value: Indicator = {
  value: 12, unit: 'degC', status: 'complete', expected_days: 366, valid_days: 366, coverage_pct: 100,
}
const partial: Indicator = {
  ...value, value: 2.5, unit: 'mm', status: 'partial', valid_days: 4, coverage_pct: 1.1,
}
const exploration: Exploration = {
  location_id: locations[0].id, group_by: 'period', min_coverage_pct: 90, rain_day_threshold_mm: 1, period,
  groups: [{ period, warnings: ['Lluvia parcial TEST'], indicators: {
    mean_temperature: value, min_temperature: value, max_temperature: value,
    accumulated_precipitation: partial, potential_frost_days: { ...value, unit: 'days' },
    rainy_days: { ...value, unit: 'days' },
  } }],
  source: {
    provider: 'NASA POWER TEST', product: 'daily point', version: 'TEST', time_standard: 'LST',
    cache_status: 'stale', cache_age_seconds: 61, fetched_at: '2026-11-22T12:01:00Z',
    resolution: 'Resolución TEST', documentation_url: 'https://example.test/',
    response_sha256: 'a'.repeat(64), metadata: {},
  },
  warnings: ['Limite de datos TEST'],
  series: [{ date: '2024-01-01', t2m: null, t2m_min: 1, t2m_max: 15, prectotcorr: 0, quality_flags: {} }],
}
const compared: MonthlyComparison = {
  aligned_period: period,
  locations: locations.map(item => ({ ...exploration, location_id: item.id })),
  comparisons: [], warnings: ['Acumulados completos requeridos TEST'],
  monthly_groups: Object.fromEntries(locations.map(item => [item.id, exploration.groups])),
}

function withApi(path: string, operation: (url: URL, signal?: AbortSignal) => Promise<Response>) {
  window.history.replaceState(null, '', path)
  const fetch = vi.fn((url: string, options?: RequestInit) => {
    const parsed = new URL(url, 'http://localhost')
    return parsed.pathname.endsWith('/locations')
      ? Promise.resolve(Response.json(locations))
      : operation(parsed, options?.signal ?? undefined)
  })
  vi.stubGlobal('fetch', fetch)
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  window.sessionStorage.clear()
  window.history.replaceState(null, '', '/')
})

it('explora, preserva los faltantes y muestra la procedencia y la lluvia parcial', async () => {
  withApi('/explorar', async (url) => {
    expect(url.searchParams.get('include_series')).toBe('true')
    expect(url.searchParams.get('start')).toBe('2024-01-01')
    return Response.json(exploration)
  })
  const user = userEvent.setup()
  render(<App />)
  await user.click(await screen.findByRole('button', { name: 'Usar año 2024' }, { timeout: 3000 }))
  await user.click(screen.getByRole('button', { name: 'Consultar clima' }))
  expect(await screen.findByRole('heading', { name: 'Resultados de Ilave' })).toBeTruthy()
  expect(screen.getByText('Caché desactualizada')).toBeTruthy()
  expect(screen.getByText('Precipitación observada parcial')).toBeTruthy()
  expect(screen.getByTestId('chart-Temperatura diaria').textContent).toContain('"t2m":null')
  expect(screen.getByTestId('chart-Precipitación diaria').textContent).toContain('"prectotcorr":0')
  expect(window.location.search).toContain('location_id=puno-ilave')
  expect(JSON.parse(window.sessionStorage.getItem('agronexa.consulted-period') ?? 'null')).toEqual(period)
})

it('valida fechas y descarta una consulta cuando se cambia la localidad', async () => {
  let signal: AbortSignal | undefined
  let finish: (response: Response) => void = () => { throw new Error('Consulta TEST sin iniciar') }
  withApi('/explorar?start=2024-02-02&end=2024-01-01', (_url, requestSignal) => {
    signal = requestSignal
    return new Promise(resolve => { finish = resolve })
  })
  const user = userEvent.setup()
  render(<App />)
  const submit = await screen.findByRole('button', { name: 'Consultar clima' })
  await user.click(submit)
  expect(screen.getByRole('alert').textContent).toContain('fecha inicial')
  expect(signal).toBeUndefined()
  await user.click(screen.getByRole('button', { name: 'Usar año 2024' }))
  await user.click(submit)
  expect(screen.getByRole('button', { name: 'Consultando…' })).toBeTruthy()
  const map = screen.getByLabelText('Mapa TEST')
  await user.click(within(map).getByRole('button', { name: 'Chivay' }))
  expect(signal?.aborted).toBe(true)
  await act(async () => finish(Response.json(exploration)))
  expect(screen.queryByRole('heading', { name: /Resultados de/ })).toBeNull()
  expect((screen.getByLabelText('Localidad') as HTMLSelectElement).value).toBe('arequipa-chivay')
})

it('reintenta un fallo de la API y anuncia cuando la exploración no tiene datos', async () => {
  let attempts = 0
  const group = exploration.groups[0]
  withApi('/explorar', async () => {
    if (++attempts === 1) return Response.json({ message: 'NASA no está disponible TEST' }, { status: 503 })
    return Response.json({ ...exploration, groups: [{
      ...group,
      indicators: Object.fromEntries(Object.entries(group.indicators).map(([code, indicator]) =>
        [code, { ...indicator, status: 'no_data', coverage_pct: 0, valid_days: 0, value: null }])),
    }] })
  })
  const user = userEvent.setup()
  render(<App />)
  await user.click(await screen.findByRole('button', { name: 'Consultar clima' }))
  expect((await screen.findByRole('alert')).textContent).toContain('NASA no está disponible TEST')
  await user.click(screen.getByRole('button', { name: 'Reintentar consulta' }))
  expect(await screen.findByText(/No hay observaciones válidas/)).toBeTruthy()
  expect(screen.queryByTestId('chart-Temperatura diaria')).toBeNull()
})

it('compara tres localidades con el mismo periodo y deja huecos para totales incompletos', async () => {
  let ids: string[] = []
  withApi('/comparar?location_ids=puno-ilave', async (url) => {
    ids = url.searchParams.getAll('location_ids')
    expect(url.searchParams.get('include_monthly')).toBe('true')
    return Response.json(compared)
  })
  const user = userEvent.setup()
  render(<App />)
  const submit = await screen.findByRole('button', { name: 'Comparar localidades' })
  await user.click(submit)
  expect(screen.getByRole('alert').textContent).toContain('dos o tres')
  await user.click(screen.getByRole('checkbox', { name: /Urubamba/ }))
  await user.click(screen.getByRole('checkbox', { name: /Chivay/ }))
  await user.click(screen.getByRole('button', { name: 'Usar año 2024' }))
  await user.click(submit)
  expect(await screen.findByRole('heading', { name: 'Resultados de la comparación' })).toBeTruthy()
  expect(ids).toEqual(locations.map(item => item.id))
  expect(screen.getByTestId('chart-Precipitación mensual').textContent).toContain('"arequipa-chivay":null')
  expect(screen.getAllByText('Acumulado observado parcial')).toHaveLength(3)
})
