import { useState, type FormEvent } from 'react'
import { explore, exportCsv, type Exploration, type Period } from '../api/climate'
import type { Location } from '../api/locations'
import { Icon, LoadingSkeleton, PageHeading } from '../app/ui'
import { ClimateChart, chartColors } from '../features/climate/Charts'
import { examplePeriod, initialPeriod, periodError, PeriodFields, rememberConsultedPeriod, saveFilters } from '../features/climate/filters'
import { formatDay, formatPeriod, indicators, indicatorName, number, qualityLabel, unit } from '../features/climate/format'
import { LocationMap } from '../features/climate/LocationMap'
import { MetricCards, Provenance, TableDetails, Warnings } from '../features/climate/ResultDetails'
import { useRequest } from '../hooks/useRequest'

const temperature = [
  { key: 't2m', label: 'Media', color: chartColors[0] },
  { key: 't2m_min', label: 'Mínima', color: chartColors[1] },
  { key: 't2m_max', label: 'Máxima', color: chartColors[2] },
]
const rain = [{ key: 'prectotcorr', label: 'Precipitación', color: chartColors[1] }]

function CoordinateSource({ location }: { location: Location }) {
  const [label, url] = location.coordinate_source.split(' https://', 2)
  return url ? <a href={'https://' + url}>{label}</a> : <span>{label}</span>
}

function ExplorationResults({ data, name }: { data: Exploration; name: string }) {
  const download = useRequest<void>()
  const [page, setPage] = useState(0)
  const pageSize = 31
  const pageStart = page * pageSize
  const pageEnd = Math.min(pageStart + pageSize, data.series.length)
  const values = data.groups[0].indicators
  const hasData = Object.values(values).some(value => value.valid_days > 0)
  const chartRows = data.series.map(({ date, t2m, t2m_min, t2m_max, prectotcorr }) =>
    ({ date, t2m, t2m_min, t2m_max, prectotcorr }))
  const compareParams = new URLSearchParams({ ...data.period, location_ids: data.location_id })

  return (
    <section className="result-stack" aria-labelledby="exploration-results">
      <header className="result-heading">
        <div>
          <h2 id="exploration-results">Resultados de {name}</h2>
          <p>{formatPeriod(data.period)}</p>
        </div>
        <div className="action-row">
          <a className="button secondary" href={'/rotaciones?' + new URLSearchParams({ ...data.period, location_id: data.location_id })}>Abrir ficha agrícola</a>
          <a className="button secondary" href={'/comparar?' + compareParams}>Comparar localidad <span aria-hidden="true">↗</span></a>
          <button className="button primary" type="button" disabled={download.result.status === 'loading'}
            onClick={() => download.load(signal => exportCsv(data, signal))}>
            {download.result.status === 'loading' ? 'Preparando CSV…' : 'Descargar CSV'}
          </button>
        </div>
      </header>
      {download.result.status === 'error' && <p className="notice error" role="alert">{download.result.message}</p>}
      {download.result.status === 'ready' && <p className="notice" role="status">Descarga CSV iniciada.</p>}
      <div className="panel source-panel">
        <Provenance source={data.source} period={data.period} />
        <Warnings warnings={[...data.warnings, ...data.groups[0].warnings]} />
      </div>
      {!hasData && <p role="status" className="notice">No hay observaciones válidas para este periodo. Puedes elegir otras fechas.</p>}
      <MetricCards summary={data} />
      {hasData && (
        <div className="charts-grid">
          <ClimateChart title="Temperatura diaria" description="Media, mínima y máxima del aire a 2 m"
            data={chartRows} series={temperature} kind="line" unit="°C" />
          <ClimateChart title="Precipitación diaria" description="Observaciones válidas por día"
            data={chartRows} series={rain} kind="bar" unit="mm/día" />
        </div>
      )}
      <TableDetails title="Ver cobertura e indicadores">
        <table>
          <caption>Indicadores de {name} · {formatPeriod(data.period)}</caption>
          <thead><tr><th scope="col">Indicador</th><th scope="col">Valor</th><th scope="col">Días válidos</th><th scope="col">Cobertura</th><th scope="col">Estado</th></tr></thead>
          <tbody>{indicators.map(code => {
            const value = values[code]
            return <tr key={code}><th scope="row">{indicatorName(code, value)}</th><td>{number(value.value)} {unit(value.unit)}</td>
              <td>{value.valid_days}/{value.expected_days}</td><td>{number(value.coverage_pct)} %</td><td>{qualityLabel[value.status]}</td></tr>
          })}</tbody>
        </table>
      </TableDetails>
      {hasData && <TableDetails title="Ver datos diarios en tabla">
        <table>
          <caption>Serie diaria de {name} · {formatPeriod(data.period)} · — indica dato faltante</caption>
          <thead><tr><th scope="col">Fecha</th><th scope="col">Media (°C)</th><th scope="col">Mínima (°C)</th><th scope="col">Máxima (°C)</th><th scope="col">Lluvia (mm/día)</th></tr></thead>
          <tbody>{data.series.slice(pageStart, pageEnd).map(row => <tr key={row.date}><th scope="row">{formatDay(row.date)}</th>
            <td>{number(row.t2m)}</td><td>{number(row.t2m_min)}</td><td>{number(row.t2m_max)}</td><td>{number(row.prectotcorr)}</td></tr>)}</tbody>
        </table>
        <div className="table-pagination">
          <span aria-live="polite">Filas {pageStart + 1}–{pageEnd} de {data.series.length}</span>
          <div className="action-row">
            <button className="button secondary" type="button" onClick={() => setPage(page - 1)} disabled={page === 0}>Anterior</button>
            <button className="button secondary" type="button" onClick={() => setPage(page + 1)} disabled={pageEnd >= data.series.length}>Siguiente</button>
          </div>
        </div>
      </TableDetails>}
    </section>
  )
}

export function Explore({ locations }: { locations: Location[] }) {
  const suggested = locations.find(item => item.id === 'puno-ilave') ?? locations[0]
  const initial = locations.find(item => item.id === new URLSearchParams(window.location.search).get('location_id')) ?? suggested
  const [id, setId] = useState(initial.id)
  const [period, setPeriod] = useState(initialPeriod)
  const [error, setError] = useState('')
  const { result, load, reset } = useRequest<Exploration>()
  const selected = locations.find(item => item.id === id) ?? initial
  const regions = [...new Set(locations.map(item => item.region))]

  function select(location: string) {
    if (location === id) return
    setId(location)
    setError('')
    reset()
  }

  function changePeriod(period: Period) {
    setPeriod(period)
    setError('')
    reset()
  }

  function submit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    const issue = periodError(period)
    if (issue) { setError(issue); return }
    setError('')
    saveFilters(period, [['location_id', id]])
    load(async signal => {
      const data = await explore(id, period, signal)
      if (!signal.aborted) rememberConsultedPeriod(data.period)
      return data
    })
  }

  return (
    <>
      <PageHeading title="Explorar clima" description="Consulta series históricas de temperatura y precipitación por localidad." icon="compass" />
      <form className="panel query-card" noValidate onSubmit={submit}>
        <div className="query-heading">
          <h2><Icon name="filter" size={17} /> Periodo y ubicación</h2>
          <button type="button" className="text-button" onClick={() => changePeriod(examplePeriod)}>Usar año 2024</button>
        </div>
        <div className="explore-filters">
          <div className="field"><label htmlFor="explore-region">Región</label>
            <select id="explore-region" value={selected.region} onChange={event => {
              const item = locations.find(location => location.region === event.target.value)
              if (item) select(item.id)
            }}>{regions.map(region => <option key={region}>{region}</option>)}</select>
          </div>
          <div className="field"><label htmlFor="explore-location">Localidad</label>
            <select id="explore-location" value={id} onChange={event => select(event.target.value)}>
              {locations.filter(location => location.region === selected.region)
                .map(location => <option key={location.id} value={location.id}>{location.name}</option>)}
            </select>
          </div>
          <PeriodFields period={period} onChange={changePeriod} invalid={Boolean(error)} />
          <button className="button primary" type="submit" disabled={result.status === 'loading'}>
            {result.status === 'loading' ? 'Consultando…' : 'Consultar clima'}
          </button>
        </div>
        {error && <p id="filter-error" role="alert" className="notice error">{error}</p>}
      </form>
      <div className="explore-overview">
        <LocationMap locations={locations} selected={selected} onSelect={select} />
        <section className="panel locality-panel" aria-labelledby="locality-heading">
          <div className="place-emblem"><Icon name="pin" size={24} /></div>
          <p className="region-name">{selected.region}</p>
          <h2 id="locality-heading">{selected.name}</h2>
          <dl className="coordinate-grid">
            <div><dt>Latitud</dt><dd>{number(selected.latitude)}°</dd></div>
            <div><dt>Longitud</dt><dd>{number(selected.longitude)}°</dd></div>
          </dl>
          {!selected.verified && <p className="badge badge-warn">Coordenada preliminar</p>}
          <div className="coordinate-source"><strong>Fuente de coordenadas</strong><CoordinateSource location={selected} /></div>
          <p className="locality-note">La serie de NASA POWER representa una celda meteorológica alrededor del punto consultado.</p>
        </section>
      </div>
      {result.status === 'idle' && <p className="notice" role="status">Elige el periodo y selecciona «Consultar clima» para ver los datos.</p>}
      {result.status === 'loading' && <LoadingSkeleton label="Consultando las series de NASA POWER…" />}
      {result.status === 'error' && <div className="notice error"><p role="alert">{result.message}</p>
        <button className="text-button" type="button" onClick={() => submit()}>Reintentar consulta</button></div>}
      {result.status === 'ready' && <ExplorationResults data={result.data} name={selected.name} />}
    </>
  )
}
