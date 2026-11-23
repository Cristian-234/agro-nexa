import type { Period } from '../../api/climate'

const isoPattern = /^\d{4}-\d{2}-\d{2}$/
const consultedPeriodKey = 'agronexa.consulted-period'
export const peruToday = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Lima' }).format(new Date())

export function initialPeriod(): Period {
  const params = new URLSearchParams(window.location.search)
  const start = params.get('start') ?? ''
  const end = params.get('end') ?? ''
  return isoPattern.test(start) && isoPattern.test(end)
    ? { start, end } : { start: '2021-01-01', end: '2025-12-31' }
}

export function periodError(period: Period) {
  if (!isoPattern.test(period.start) || !isoPattern.test(period.end)) return 'Completa las dos fechas.'
  const first = Date.parse(period.start)
  const last = Date.parse(period.end)
  if (!Number.isFinite(first) || !Number.isFinite(last)
    || new Date(first).toISOString().slice(0, 10) !== period.start
    || new Date(last).toISOString().slice(0, 10) !== period.end) return 'Ingresa fechas válidas.'
  if (period.start > period.end) return 'La fecha inicial debe ser anterior o igual a la final.'
  if (period.end > peruToday()) return 'La fecha final no puede estar en el futuro.'
  if ((last - first) / 86400000 + 1 > 3660) return 'El periodo puede incluir hasta 3660 días.'
  return ''
}

export function saveFilters(period: Period, values: [string, string][]) {
  const params = new URLSearchParams(values)
  params.set('start', period.start)
  params.set('end', period.end)
  window.history.replaceState(null, '', window.location.pathname + '?' + params)
}

export function rememberConsultedPeriod(period: Period) {
  try { window.sessionStorage.setItem(consultedPeriodKey, JSON.stringify(period)) } catch { /* Optional session storage. */ }
}

export function lastConsultedPeriod(): Period | null {
  try {
    const value = JSON.parse(window.sessionStorage.getItem(consultedPeriodKey) ?? 'null')
    return typeof value?.start === 'string' && typeof value.end === 'string' && !periodError(value) ? value : null
  } catch {
    return null
  }
}

export function PeriodFields({ period, onChange, invalid, idPrefix = 'period', errorId = 'filter-error' }: {
  period: Period
  onChange: (value: Period) => void
  invalid: boolean
  idPrefix?: string
  errorId?: string
}) {
  const today = peruToday()
  return (
    <>
      <div className="field"><label htmlFor={idPrefix + '-start'}>Fecha inicial</label>
        <input id={idPrefix + '-start'} type="date" required value={period.start} max={today}
          aria-invalid={invalid} aria-describedby={invalid ? errorId : undefined}
          onChange={(event) => onChange({ ...period, start: event.target.value })} />
      </div>
      <div className="field"><label htmlFor={idPrefix + '-end'}>Fecha final</label>
        <input id={idPrefix + '-end'} type="date" required value={period.end} max={today}
          aria-invalid={invalid} aria-describedby={invalid ? errorId : undefined}
          onChange={(event) => onChange({ ...period, end: event.target.value })} />
      </div>
    </>
  )
}

export const examplePeriod = { start: '2024-01-01', end: '2024-12-31' }
