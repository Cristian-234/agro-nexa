import type { Indicator, IndicatorCode, IndicatorDifference, Period } from '../../api/climate'

export const mainIndicators = ['mean_temperature', 'min_temperature', 'max_temperature', 'accumulated_precipitation'] as const
export const indicators: IndicatorCode[] = [...mainIndicators, 'potential_frost_days', 'rainy_days']

export const names: Record<IndicatorCode, string> = {
  mean_temperature: 'Temperatura media',
  min_temperature: 'Temperatura mínima',
  max_temperature: 'Temperatura máxima',
  accumulated_precipitation: 'Precipitación acumulada',
  potential_frost_days: 'Días de helada potencial',
  rainy_days: 'Días de lluvia',
}

const decimal = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 2 })
const day = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
const shortDay = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const month = new Intl.DateTimeFormat('es-PE', { month: 'short', year: '2-digit', timeZone: 'UTC' })
const instant = new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Lima' })

export const number = (value: number | null) => value === null ? '—' : decimal.format(value)
export const unit = (value: Indicator['unit']) => ({ degC: '°C', mm: 'mm', days: 'días' })[value]
const isoDate = (iso: string) => new Date(iso + 'T00:00:00Z')
export const formatDay = (iso: string) => day.format(isoDate(iso))
export const formatShortDay = (iso: string) => shortDay.format(isoDate(iso))
export const formatMonth = (iso: string) => month.format(isoDate(iso))
export const formatInstant = (iso: string) => instant.format(new Date(iso))
export const formatPeriod = ({ start, end }: Period) => start === end ? formatDay(start) : formatDay(start) + ' – ' + formatDay(end)

export const qualityLabel: Record<Indicator['status'], string> = {
  complete: 'Completa', partial: 'Parcial', insufficient: 'Insuficiente', no_data: 'Sin datos',
}

export const differenceStatus: Record<IndicatorDifference['status'], string> = {
  available: 'Disponible',
  insufficient: 'Cobertura insuficiente',
  incomplete_precipitation: 'Precipitación incompleta',
  incompatible: 'Fuentes o unidades incompatibles',
}

export function indicatorName(code: IndicatorCode, value: Indicator) {
  return code === 'accumulated_precipitation' && value.status === 'partial'
    ? 'Precipitación observada parcial' : names[code]
}
