import type { RotationObjective, RotationPlotContext, SoilFertility, WaterSource } from '../../api/rotation'
import { formatDay, number } from '../climate/format'

export const waterSourceNames = {
  unknown: 'No sé', canal: 'Canal', pozo: 'Pozo', lluvia: 'Lluvia', mixto: 'Mixta',
} satisfies Record<WaterSource, string>

export const fertilityNames = {
  unknown: 'No sé', high: 'Alta', medium: 'Media', low: 'Baja',
} satisfies Record<SoilFertility, string>

export const objectiveNames = {
  unknown: 'No definido', yield: 'Mejorar rendimiento', water_saving: 'Ahorrar agua',
  soil_conservation: 'Conservar el suelo', risk_reduction: 'Reducir riesgos',
} satisfies Record<RotationObjective, string>

export function PlotContextSummary({ context }: { context: RotationPlotContext }) {
  function displayDate(value: string | null, approximate?: boolean) {
    if (!value) return null
    return approximate
      ? new Intl.DateTimeFormat('es-PE', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(value)) + ' (aprox.)'
      : formatDay(value)
  }
  const rows = [
    ['Campaña agrícola', context.campaign?.trim()],
    ['Área de parcela', context.plot_area_m2 === null ? null : number(context.plot_area_m2) + ' m²'],
    ['Altitud', context.elevation_m === null ? null : number(context.elevation_m) + ' m s. n. m.'],
    ['Pendiente', context.slope_percent === null ? null : number(context.slope_percent) + ' %'],
    ['Fuente de agua', context.water_source === 'unknown' ? null : waterSourceNames[context.water_source]],
    ['Fertilidad estimada', context.soil_fertility === 'unknown' ? null : fertilityNames[context.soil_fertility]],
    ['Último rendimiento', context.last_yield_kg === null ? null : number(context.last_yield_kg) + ' kg'],
    ['Siembra prevista', displayDate(context.planned_sowing_date, context.sowing_approximate)],
    ['Cosecha prevista', displayDate(context.planned_harvest_date, context.harvest_approximate)],
    ['Objetivo principal', context.objective === 'unknown' ? null : objectiveNames[context.objective]],
    ['Historial de cultivos', context.previous_history?.trim()],
    ['Plagas o enfermedades observadas', context.pest_history?.trim()],
  ].filter(([, value]) => value)
  if (!rows.length) return null

  return <section className="panel query-card plot-context-summary" aria-labelledby="plot-context-heading">
    <h2 id="plot-context-heading">Contexto declarado de la parcela</h2>
    <p className="rotation-help">Datos ingresados en esta ficha para documentar la evaluación.</p>
    <dl>{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
  </section>
}
