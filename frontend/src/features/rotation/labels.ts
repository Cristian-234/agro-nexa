import type { Irrigation, Priority, SoilTexture } from '../../api/rotation'

export const irrigationNames = {
  unknown: 'No sé', available: 'Disponible', limited: 'Limitado', none: 'Sin riego',
} satisfies Record<Irrigation, string>
export const textureNames = {
  unknown: 'No sé', sand: 'Arenosa', loam: 'Franca', sandy_loam: 'Franco-arenosa', clay: 'Arcillosa', other: 'Otra',
} satisfies Record<SoilTexture, string>
export const priorityNames = {
  water: 'Agua', soil_conservation: 'Conservación del suelo', climate_adaptation: 'Adaptación climática',
} satisfies Record<Priority, string>

export function displayEvidence(value: number | string | null) {
  if (typeof value === 'string') {
    return (irrigationNames as Record<string, string>)[value]
      ?? (textureNames as Record<string, string>)[value] ?? value
  }
  return value === null ? '—' : new Intl.NumberFormat('es-PE', { maximumFractionDigits: 6 }).format(value)
}
