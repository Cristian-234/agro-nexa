import type { Irrigation, PreviousCrop, SoilTexture } from './rotation'
import { request } from './request'

export type Cultivar = 'illpa_inia' | 'other' | 'unknown'
export type Texture = SoilTexture | 'sandy_loam'
export type Drainage = 'good' | 'limited' | 'poor' | 'waterlogging' | 'unknown'
export type FloodingHistory = 'yes' | 'no' | 'unknown'
export type Position = 'slope' | 'plain' | 'other' | 'unknown'
export type LotHarvest = { crop: PreviousCrop; harvest_date: string | null }
export interface PlotContext {
  planned_sowing_date?: string | null
  agrochemical_history?: string | null
  elevation_m?: number | null
  position?: Position
}
export type MoistureCondition = 'dry' | 'moist' | 'saturated'
export type Moisture =
  | { kind: 'unknown' }
  | { kind: 'observed'; date: string | null; condition: MoistureCondition | null; method?: string }
  | { kind: 'measured'; date: string | null; value: number | null; unit: '% v/v'; method?: string }

export interface PreliminaryInput {
  location_id: 'puno-ilave'
  previous_crop: 'potato'
  candidate_crop: 'quinoa'
  cultivar: Cultivar
  lot_history?: LotHarvest[]
  soil_ph: number | null
  soil_ph_date: string | null
  soil_ph_method?: string | null
  soil_texture: Texture
  soil_texture_method?: string | null
  drainage: Drainage
  flooding_history?: FloodingHistory
  plot_context?: PlotContext
  irrigation: Irrigation
  establishment_moisture: Moisture
}

interface Reference {
  version: string
  id: 'sequence' | 'ph' | 'texture' | 'drainage' | 'moisture' | 'precipitation' | 'temperature'
  parameter: string
  value: string | [number, number] | string[]
  unit: string | null
  scope: string
  source_title: string
  source_url: string
  source_section: string
  source_issuer?: string
  source_year?: number
  verification?: 'verified_in_primary_source'
  criterion_type?: 'candidate_rule' | 'documentary_reference' | 'not_evaluable'
  location_id?: 'puno-ilave'
  cultivar?: 'illpa_inia'
}

export interface PreliminaryResult {
  location_id: 'puno-ilave'
  cultivar: Cultivar
  version: string
  plot_context?: PlotContext
  criteria: {
    reference: Reference
    entered_value: (Record<string, string | number | LotHarvest[] | null>) | null
    state: 'matches_reference' | 'outside_reference' | 'insufficient_information'
    explanation: string
    limitation: string
    pending_data: string[]
  }[]
}

export async function evaluatePreliminary(data: PreliminaryInput, signal: AbortSignal): Promise<PreliminaryResult> {
  return (await request('/rotations/preliminary', signal, undefined, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })).json()
}
