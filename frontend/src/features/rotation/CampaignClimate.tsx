import { useState, type FormEvent } from 'react'
import { summarizePeriod, type ClimateSummary, type Period } from '../../api/climate'
import { useRequest } from '../../hooks/useRequest'
import { periodError, PeriodFields, rememberConsultedPeriod } from '../climate/filters'
import { indicatorName, number, qualityLabel, unit } from '../climate/format'
import { Provenance, Warnings } from '../climate/ResultDetails'

const metrics = [
  ['mean_temperature', 'Temperatura media diaria'],
  ['accumulated_precipitation', 'Precipitación diaria'],
  ['potential_frost_days', 'Temperatura mínima diaria'],
  ['max_temperature', 'Temperatura máxima diaria'],
] as const

export function CampaignClimate() {
  const [period, setPeriod] = useState<Period>({ start: '', end: '' })
  const [error, setError] = useState('')
  const weather = useRequest<ClimateSummary>()

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const issue = periodError(period)
    setError(issue)
    if (!issue) weather.load(async signal => {
      const summary = await summarizePeriod('puno-ilave', period, signal)
      if (!signal.aborted) rememberConsultedPeriod(summary.period)
      return summary
    })
  }

  const summary = weather.result.status === 'ready' ? weather.result.data : null
  const group = summary?.groups[0]
  return <section className="panel query-card" aria-labelledby="campaign-title">
    <h2 id="campaign-title">Clima histórico de campaña en Ilave</h2>
    <p>Elige una ventana histórica. Los días con mínima ≤ 0 °C indican frío potencial a escala de celda. El sistema desconoce las etapas del cultivo y los daños en la parcela.</p>
    <form noValidate onSubmit={submit}>
      <div className="rotation-fields">
        <PeriodFields period={period} invalid={Boolean(error)} idPrefix="campaign-period" errorId="campaign-error"
          onChange={value => { setPeriod(value); setError(''); weather.reset() }} />
      </div>
      {error && <p id="campaign-error" role="alert" className="notice error">{error}</p>}
      <div className="action-row">
        <button className="button secondary" type="submit" disabled={weather.result.status === 'loading'}>Consultar clima de campaña</button>
      </div>
    </form>
    {weather.result.status === 'loading' && <p className="notice" role="status">Consultando NASA POWER…</p>}
    {weather.result.status === 'error' && <p role="alert" className="notice error">{weather.result.message}</p>}
    {summary && group && <>
      <Provenance source={summary.source} period={summary.period} />
      <Warnings warnings={[...summary.warnings, ...group.warnings]} />
      <div className="rotation-results-grid preliminary-grid">
        {metrics.map(([code, variable]) => {
          const value = group.indicators[code]
          return <article className="panel query-card preliminary-criterion" key={code}>
            <h3>{code === 'max_temperature' ? 'Cobertura de temperatura máxima' : indicatorName(code, value)}</h3>
            {code !== 'max_temperature' && <p>{number(value.value)} {unit(value.unit)} · {qualityLabel[value.status]}</p>}
            <p>{variable}: {number(value.coverage_pct)} % ({value.valid_days}/{value.expected_days} días válidos)</p>
          </article>
        })}
      </div>
    </>}
  </section>
}
