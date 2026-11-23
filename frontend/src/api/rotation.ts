import type { ClimateSource, Period } from './climate'
import { request } from './request'

export type CropId = 'potato' | 'quinoa'
export type PreviousCrop = CropId | 'other' | 'unknown'
export type Irrigation = 'available' | 'limited' | 'none' | 'unknown'
export type SoilTexture = 'sand' | 'loam' | 'clay' | 'other' | 'unknown'
export type Priority = 'water' | 'soil_conservation' | 'climate_adaptation'

export interface Crop {
  id: CropId
  name_es: string
  description: string
  source_url: string | null
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
