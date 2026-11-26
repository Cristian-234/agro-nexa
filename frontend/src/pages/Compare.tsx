import { useState, type FormEvent } from 'react'
import { compare, type MonthlyComparison, type Period } from '../api/climate'
import type { Location } from '../api/locations'
import { Icon, LoadingSkeleton, PageHeading } from '../app/ui'
import { ClimateChart, chartColors, type ChartRow } from '../features/climate/Charts'
import { examplePeriod, initialPeriod, periodError, PeriodFields, rememberConsultedPeriod, saveFilters } from '../features/climate/filters'
import { differenceStatus, formatPeriod, indicatorName, indicators, names, number, qualityLabel, unit } from '../features/climate/format'
import { Provenance, TableDetails, Warnings } from '../features/climate/ResultDetails'
import { useRequest } from '../hooks/useRequest'

const localityColors: Record<string, string> = {
  'puno-ilave': '#168568', 'cusco-urubamba': '#347db2', 'arequipa-chivay': '#b35e29',
}

function CompareResults({ data, locations }: { data: MonthlyComparison; locations: Location[] }) {
  const label = (id: string) => locations.find(location => location.id === id)?.name ?? id
  const series = data.locations.map(({ location_id }, index) => ({
    key: location_id, label: label(location_id), color: localityColors[location_id] ?? chartColors[index],
  }))
  const hasData = data.locations.some(location => Object.values(location.groups[0].indicators)
    .some(indicator => indicator.valid_days > 0))
  const warnings = data.warnings.map(message => {
    const separator = message.indexOf(': ')
    const id = message.slice(0, separator)
    if (!data.locations.some(location => location.location_id === id)) return message
    const warning = message.slice(separator + 2)
    return data.locations.every(location => location.warnings.includes(warning))
      ? warning : label(id) + ' · ' + warning
  })
  const months = data.monthly_groups[series[0].key]
  function chartData(metric: 'mean_temperature' | 'accumulated_precipitation'): ChartRow[] {
    return months.map((group, index) => ({
      date: group.period.start,
      ...Object.fromEntries(series.map(item => [
        item.key,
        // Los acumulados parciales se consultan en la tabla con su cobertura.
        metric === 'accumulated_precipitation' && data.monthly_groups[item.key][index].indicators[metric].status === 'partial'
          ? null : data.monthly_groups[item.key][index].indicators[metric].value,
      ])),
    }))
  }

  return (
    <section className="result-stack" aria-labelledby="comparison-results">
      <header className="result-heading">
        <div><h2 id="comparison-results">Resultados de la comparación</h2><p>{formatPeriod(data.aligned_period)}</p></div>
      </header>
      <div className="comparison-sources">
        {data.locations.map(item => {
          const { mean_temperature: temperature, accumulated_precipitation: rain } = item.groups[0].indicators
          return <article className="panel compare-summary" key={item.location_id}>
            <h3><span className="series-dot" style={{ backgroundColor: series.find(row => row.key === item.location_id)?.color }} />{label(item.location_id)}</h3>
            <dl>
              <div><dt>Temperatura media</dt><dd>{number(temperature.value)} <small>{unit(temperature.unit)}</small><span>{number(temperature.coverage_pct)} % de cobertura</span></dd></div>
              <div><dt>{indicatorName('accumulated_precipitation', rain)}</dt><dd>{number(rain.value)} <small>{unit(rain.unit)}</small><span>{number(rain.coverage_pct)} % de cobertura</span></dd></div>
            </dl>
            <details className="rotation-criterion"><summary>Ver fuente y cobertura</summary>
              <Provenance source={item.source} period={item.period} />
            </details>
          </article>
        })}
      </div>
      <Warnings warnings={warnings} />
      {!hasData && <p role="status" className="notice">No hay observaciones válidas para las localidades y el periodo seleccionados.</p>}
      {hasData && <>
        <div className="charts-grid">
          <ClimateChart title="Temperatura media mensual" description="Temperatura observada por localidad"
            data={chartData('mean_temperature')} series={series} kind="line" monthly unit="°C" />
          <ClimateChart title="Precipitación mensual" description="Barras para totales completos. Consulta los acumulados parciales en la tabla."
            data={chartData('accumulated_precipitation')} series={series} kind="bar" monthly unit="mm" />
        </div>
        <TableDetails title="Ver datos mensuales en tabla">
          <table>
            <caption>Temperatura y precipitación por grupo mensual</caption>
            <thead><tr><th scope="col">Periodo</th><th scope="col">Localidad</th><th scope="col">Temperatura media (°C)</th>
              <th scope="col">Precipitación (mm)</th></tr></thead>
            <tbody>{months.flatMap((period, index) => series.map(item => {
              const values = data.monthly_groups[item.key][index].indicators
              const temperature = values.mean_temperature
              const rain = values.accumulated_precipitation
              return <tr key={period.period.start + item.key}><th scope="row">{formatPeriod(period.period)}</th><td>{item.label}</td>
                <td>{number(temperature.value)}<small>{number(temperature.coverage_pct)} % · {qualityLabel[temperature.status]}</small></td>
                <td>{number(rain.value)}<small>{number(rain.coverage_pct)} % · {indicatorName('accumulated_precipitation', rain)} · {qualityLabel[rain.status]}</small></td></tr>
            }))}</tbody>
          </table>
        </TableDetails>
      </>}
      <details className="panel table-card comparison-indicators">
        <summary>Ver todos los indicadores por localidad</summary>
        <div className="table-scroll" role="region" tabIndex={0} aria-label="Tabla de indicadores por localidad">
          <table>
            <thead><tr><th scope="col">Indicador</th>{series.map(item => <th scope="col" key={item.key}>{item.label}</th>)}</tr></thead>
            <tbody>{indicators.map(code => <tr key={code}><th scope="row">{names[code]}</th>
              {data.locations.map(item => {
                const value = item.groups[0].indicators[code]
                return <td key={item.location_id}><strong>{number(value.value)} {unit(value.unit)}</strong>
                  <small>{number(value.coverage_pct)} % · {value.valid_days}/{value.expected_days} días</small>
                  <small className={value.status === 'complete' ? '' : 'quality-warning'}>
                    {code === 'accumulated_precipitation' && value.status === 'partial' ? 'Acumulado observado parcial' : qualityLabel[value.status]}
                  </small></td>
              })}
            </tr>)}</tbody>
          </table>
        </div>
      </details>
      <section className="difference-stack" aria-labelledby="pair-heading">
        <header><h3 id="pair-heading">Diferencias entre localidades</h3>
          <p>Se resta la segunda localidad de la primera. Las diferencias de medias y conteos usan fechas válidas comunes.</p></header>
        {data.comparisons.map(pair => <TableDetails key={pair.location_a + pair.location_b} title={label(pair.location_a) + ' − ' + label(pair.location_b)}>
          <table>
            <thead><tr><th scope="col">Indicador</th><th scope="col">Diferencia</th><th scope="col">Días comunes</th><th scope="col">Estado</th></tr></thead>
            <tbody>{indicators.map(code => {
              const value = pair.differences[code]
              return <tr key={code}><th scope="row">{names[code]}</th><td>{number(value.value)} {unit(value.unit)}</td>
                <td>{value.common_valid_days} · {number(value.common_coverage_pct)} %</td><td>{differenceStatus[value.status]}</td></tr>
            })}</tbody>
          </table>
          <Warnings warnings={pair.warnings} />
        </TableDetails>)}
      </section>
    </section>
  )
}

export function Compare({ locations }: { locations: Location[] }) {
  const [ids, setIds] = useState(() => {
    const selected = [...new Set(new URLSearchParams(window.location.search).getAll('location_ids'))]
      .filter(id => locations.some(location => location.id === id)).slice(0, 3)
    return selected.length ? selected : ['puno-ilave', 'cusco-urubamba']
      .filter(id => locations.some(location => location.id === id))
  })
  const [period, setPeriod] = useState(initialPeriod)
  const [error, setError] = useState('')
  const [invalidPeriod, setInvalidPeriod] = useState(false)
  const { result, load, reset } = useRequest<MonthlyComparison>()

  function clean() {
    setError('')
    setInvalidPeriod(false)
    reset()
  }

  function changePeriod(period: Period) {
    setPeriod(period)
    clean()
  }

  function toggle(id: string) {
    setIds(ids.includes(id) ? ids.filter(item => item !== id) : [...ids, id])
    clean()
  }

  function submit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    if (ids.length < 2 || ids.length > 3) { setError('Selecciona dos o tres localidades.'); return }
    const issue = periodError(period)
    if (issue) { setError(issue); setInvalidPeriod(true); return }
    saveFilters(period, ids.map(id => ['location_ids', id]))
    load(async signal => {
      const data = await compare(ids, period, signal)
      if (!signal.aborted) rememberConsultedPeriod(data.aligned_period)
      return data
    })
  }

  return (
    <>
      <PageHeading title="Comparar localidades" description="Contrasta hasta tres localidades sobre el mismo periodo histórico." icon="chart" />
      {result.status === 'ready' && <CompareResults data={result.data} locations={locations} />}
      <details className="panel compare-query" open={result.status !== 'ready'}>
        <summary>{result.status === 'ready' ? 'Cambiar localidades o periodo' : 'Elegir localidades y periodo'}</summary>
      <form className="query-card" noValidate onSubmit={submit}>
        <div className="query-heading"><h2><Icon name="filter" size={17} /> Localidades y periodo común</h2>
          <button type="button" className="text-button" onClick={() => changePeriod(examplePeriod)}>Usar año 2024</button>
        </div>
        <fieldset className="choice-set" aria-describedby={error && !invalidPeriod ? 'filter-error' : undefined}>
          <legend>Localidades a comparar · {ids.length} de 3 seleccionadas</legend>
          <div className="choices">{locations.map(location => <label className="choice" key={location.id}>
            <input type="checkbox" checked={ids.includes(location.id)} disabled={ids.length >= 3 && !ids.includes(location.id)}
              onChange={() => toggle(location.id)} />
            <span className="choice-location"><strong><span className="series-dot" aria-hidden="true" style={{ backgroundColor: localityColors[location.id] }} />{location.name}</strong><small>{location.region}{location.verified ? '' : ' · Coordenada preliminar'}</small></span>
          </label>)}</div>
        </fieldset>
        <div className="compare-filters">
          <PeriodFields period={period} onChange={changePeriod} invalid={invalidPeriod} />
          <button className="button primary" type="submit" disabled={result.status === 'loading'}>
            {result.status === 'loading' ? 'Comparando…' : 'Comparar localidades'}
          </button>
        </div>
        {error && <p id="filter-error" role="alert" className="notice error">{error}</p>}
      </form>
      </details>
      {result.status === 'idle' && <p className="notice" role="status">Selecciona las localidades y aplica el mismo periodo para comparar su clima.</p>}
      {result.status === 'loading' && <LoadingSkeleton label="Consultando las localidades en NASA POWER…" />}
      {result.status === 'error' && <div className="notice error"><p role="alert">{result.message}</p>
        <button className="text-button" type="button" onClick={() => submit()}>Reintentar comparación</button></div>}
    </>
  )
}
