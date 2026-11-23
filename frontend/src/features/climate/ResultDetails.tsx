import { useState, type ReactNode } from 'react'
import type { ClimateSource, ClimateSummary, Period } from '../../api/climate'
import { Icon } from '../../app/ui'
import { formatInstant, formatPeriod, indicatorName, mainIndicators, number, qualityLabel, unit } from './format'

const statusText = {
  fresh: 'Descarga reciente',
  cached: 'Caché vigente',
  stale: 'Caché desactualizada',
}

function cacheAge(seconds: number) {
  if (seconds < 60) return 'menos de un minuto'
  if (seconds < 3600) return Math.floor(seconds / 60) + ' min'
  if (seconds < 86400) return Math.floor(seconds / 3600) + ' h'
  const days = Math.floor(seconds / 86400)
  return days === 1 ? '1 día' : days + ' días'
}

export function Provenance({ source, period }: { source: ClimateSource; period: Period }) {
  return (
    <div className="provenance">
      <span className={'badge ' + (source.cache_status === 'stale' ? 'badge-warn' : 'badge-good')}>
        {statusText[source.cache_status]}
      </span>
      <span><a href={source.documentation_url}>{source.provider}</a> · {formatPeriod(period)}</span>
      <span>{source.resolution} · {source.time_standard}</span>
      <span>Descarga del {formatInstant(source.fetched_at)} (Perú) · Antigüedad de {cacheAge(source.cache_age_seconds)}</span>
    </div>
  )
}

export function Warnings({ warnings }: { warnings: string[] }) {
  const messages = [...new Set(warnings)]
  return messages.length ? (
    <ul className="warnings" aria-label="Observaciones sobre los datos">
      {messages.map(message => <li key={message}>{message}</li>)}
    </ul>
  ) : null
}

export function MetricCards({ summary }: { summary: ClimateSummary }) {
  const values = summary.groups[0].indicators
  return (
    <div className="metric-grid">
      {mainIndicators.map(code => {
        const value = values[code]
        return (
          <article className={'panel metric metric-' + code} key={code}>
            <div className="metric-heading"><span className="tile-icon"><Icon name={code === 'accumulated_precipitation' ? 'rain' : 'thermometer'} size={17} /></span>
              <h3>{indicatorName(code, value)}</h3></div>
            <p className="metric-value">{number(value.value)} <span>{unit(value.unit)}</span></p>
            <p className="metric-coverage">{number(value.coverage_pct)} % · {value.valid_days}/{value.expected_days} días</p>
            <progress className="coverage-track" max={100} value={value.coverage_pct} aria-label={'Cobertura de ' + indicatorName(code, value).toLowerCase()} />
            <p className="metric-source">{qualityLabel[value.status]} · {summary.source.provider}<br />{formatPeriod(summary.period)}</p>
          </article>
        )
      })}
    </div>
  )
}

export function TableDetails({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <details className="panel table-details" onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary>{title}</summary>
      {open && <div className="table-scroll" tabIndex={0} role="region" aria-label={title}>{children}</div>}
    </details>
  )
}
