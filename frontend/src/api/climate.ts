import { request } from './request'

export type Grouping = 'month' | 'year' | 'period'
export type Period = { start: string; end: string }
export type IndicatorCode =
  | 'mean_temperature' | 'min_temperature' | 'max_temperature'
  | 'accumulated_precipitation' | 'potential_frost_days' | 'rainy_days'

type Unit = 'degC' | 'mm' | 'days'

export interface ClimateSource {
  provider: string
  product: string
  version: string
  fetched_at: string
  cache_status: 'fresh' | 'cached' | 'stale'
  cache_age_seconds: number
  time_standard: 'LST'
  resolution: string
  documentation_url: string
  response_sha256: string
  metadata: Record<string, unknown>
}

export interface Indicator {
  value: number | null
  unit: Unit
  valid_days: number
  expected_days: number
  coverage_pct: number
  status: 'complete' | 'partial' | 'insufficient' | 'no_data'
}

export interface ClimateSummary {
  location_id: string
  period: Period
  source: ClimateSource
  group_by: Grouping
  min_coverage_pct: number
  rain_day_threshold_mm: number
  groups: {
    period: Period
    indicators: Record<IndicatorCode, Indicator>
    warnings: string[]
  }[]
  warnings: string[]
}

export interface IndicatorDifference {
  value: number | null
  unit: Unit
  method: 'common_valid_days' | 'observed_extrema' | 'complete_period'
  status: 'available' | 'insufficient' | 'incomplete_precipitation' | 'incompatible'
  common_valid_days: number
  common_coverage_pct: number
}

export interface ClimateComparison {
  locations: ClimateSummary[]
  aligned_period: Period
  comparisons: {
    location_a: string
    location_b: string
    differences: Record<IndicatorCode, IndicatorDifference>
    warnings: string[]
  }[]
  warnings: string[]
}

export interface DailyRow {
  date: string
  t2m: number | null
  t2m_min: number | null
  t2m_max: number | null
  prectotcorr: number | null
  quality_flags: Record<string, string>
}

export interface Exploration extends ClimateSummary {
  series: DailyRow[]
}

export interface MonthlyComparison extends ClimateComparison {
  monthly_groups: Record<string, ClimateSummary['groups']>
}

export async function explore(location: string, period: Period, signal: AbortSignal): Promise<Exploration> {
  const params = new URLSearchParams({ ...period, location_id: location, include_series: 'true' })
  return (await request('/climate/summary', signal, params)).json()
}

export async function summarizePeriod(location: string, period: Period, signal: AbortSignal): Promise<ClimateSummary> {
  const params = new URLSearchParams({ ...period, location_id: location, group_by: 'period' })
  return (await request('/climate/summary', signal, params)).json()
}

export async function compare(locations: string[], period: Period, signal: AbortSignal): Promise<MonthlyComparison> {
  const params = new URLSearchParams({ ...period, include_monthly: 'true' })
  for (const location of locations) params.append('location_ids', location)
  return (await request('/climate/compare', signal, params)).json()
}

export async function exportCsv(result: Exploration, signal: AbortSignal) {
  const { location_id, period, source } = result
  const params = new URLSearchParams({
    ...period, location_id, response_sha256: source.response_sha256, fetched_at: source.fetched_at,
  })
  const response = await request('/climate/export', signal, params)
  const blob = await response.blob()
  if (signal.aborted) return
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `agronexa_${location_id}_${period.start}_${period.end}.csv`
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
}
