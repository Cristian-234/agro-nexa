import type { ClimateSource, Period } from './climate'
import { request } from './request'

export type CropId = string
export type PreviousCrop = CropId
export type Irrigation = 'available' | 'limited' | 'none' | 'unknown'
export type SoilTexture = 'sand' | 'loam' | 'sandy_loam' | 'clay' | 'other' | 'unknown'
export type Priority = 'water' | 'soil_conservation' | 'climate_adaptation'
export type WaterSource = 'canal' | 'pozo' | 'lluvia' | 'mixto' | 'unknown'
export type SoilFertility = 'high' | 'medium' | 'low' | 'unknown'
export type RotationObjective = 'yield' | 'water_saving' | 'soil_conservation' | 'risk_reduction' | 'unknown'

export interface RotationPlotContext {
  campaign: string | null
  plot_area_m2: number | null
  elevation_m: number | null
  slope_percent: number | null
  water_source: WaterSource
  soil_fertility: SoilFertility
  last_yield_kg: number | null
  planned_sowing_date: string | null
  planned_harvest_date: string | null
  sowing_approximate?: boolean
  harvest_approximate?: boolean
  objective: RotationObjective
  pest_history: string | null
  previous_history: string | null
}

export interface Crop {
  id: CropId
  name_es: string
  description: string
  source_url: string | null
  profile?: {
    scientific_name: string
    family: string
    introduction: string
    icon: string
    varieties: string[]
    references: { url: string; title: string; section: string }[]
    evaluation_status: 'documentary_only'
  } | null
}

export type KnownAnswer = 'yes' | 'no' | 'unknown'
export interface PlantingAnswers {
  experience: 'first' | 'one_two' | 'three_more' | 'unknown'
  campaigns: number | null
  repeated: KnownAnswer
  consecutive: number | null
  other_crop: string | null
  last_harvest: string | null
  last_harvest_approximate: boolean
  ponding: 'yes' | 'sometimes' | 'no' | 'unknown'
  water: 'rain' | 'irrigation' | 'both' | 'unknown'
  soil_test: KnownAnswer
  ph_date: string | null
  ph_method: string | null
}

export interface RotationInput extends Period {
  location_id: string
  previous_crop: PreviousCrop
  candidate_crops: CropId[]
  irrigation: Irrigation
  soil_texture: SoilTexture
  soil_ph: number | null
  soil_notes: string | null
  priorities: Priority[]
  plot_context: RotationPlotContext
  planting_answers?: PlantingAnswers
}

export type Criterion = {
  rule_id: string
  criterion: string
  state: 'pass' | 'fail' | 'unknown' | 'not_applicable'
  variable: string
  value: number | string | null
  unit: string | null
  predicate: {
    operator: 'eq' | 'gte' | 'lte' | 'between'
    threshold: number | string | [number, number]
    temporal_scope: 'reference_period' | 'recorded_profile'
  }
  weight: number
  critical: boolean
  source: { url: string; title: string; section: string }
  evidence_origin: 'ficha' | 'NASA POWER' | null
  evidence_coverage: number | null
  geographic_context: string
  reviewed_on: string
  limitation: string
  explanation: string
}

export interface RotationResult {
  location_id: string
  period: Period
  evaluated_at: string
  rule_set_version: string | null
  min_evidence_coverage: number
  climate_source: ClimateSource | null
  warnings: string[]
  plot_notes?: { state: 'attention' | 'missing_data'; message: string }[]
  regional_notes?: {
    crop_id: CropId
    state: 'attention' | 'missing_data' | 'reference'
    message: string
    matrix_id: string | null
    matrix_page: number | null
    version: string
    sources: { url: string; title: string; section: string }[]
  }[]
  alternatives: {
    crop_id: CropId
    state: 'insufficient_evidence' | 'restriction_detected' | 'exploratory_comparison'
    rule_set_version: string | null
    criteria: Criterion[]
    evidence_coverage: number
    score: number | null
    rank: number | null
    warnings: string[]
  }[]
}

export async function getCrops(signal: AbortSignal): Promise<Crop[]> {
  return (await request('/crops', signal)).json()
}

export async function evaluateRotation(data: RotationInput, signal: AbortSignal): Promise<RotationResult> {
  return (await request('/rotations/evaluate', signal, undefined, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })).json()
}
