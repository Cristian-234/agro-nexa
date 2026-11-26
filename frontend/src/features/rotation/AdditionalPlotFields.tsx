import type { RotationPlotContext } from '../../api/rotation'
import { fertilityNames, objectiveNames, waterSourceNames } from './PlotContextSummary'

export const initialPlotContext: RotationPlotContext = {
  campaign: null, plot_area_m2: null, elevation_m: null, slope_percent: null,
  water_source: 'unknown', soil_fertility: 'unknown', last_yield_kg: null,
  planned_sowing_date: null, planned_harvest_date: null, objective: 'unknown',
  pest_history: null, previous_history: null,
}

export const plotMeasurements = [
  { key: 'plot_area_m2', label: 'Área de parcela (m²)', max: 10_000_000 },
  { key: 'elevation_m', label: 'Altitud (m s. n. m.)', max: 7_000 },
  { key: 'slope_percent', label: 'Pendiente (%)', max: 100 },
  { key: 'last_yield_kg', label: 'Último rendimiento (kg)', max: 100_000_000 },
] as const

export function AdditionalPlotFields({ context, onChange }: {
  context: RotationPlotContext; onChange: (update: Partial<RotationPlotContext>) => void
}) {
  const choices = [
    { key: 'water_source', label: 'Fuente de agua específica', options: waterSourceNames },
    { key: 'soil_fertility', label: 'Fertilidad estimada', options: fertilityNames },
    { key: 'objective', label: 'Objetivo principal', options: objectiveNames },
  ] as const
  return <>
    <div className="rotation-fields">
      <div className="field"><label htmlFor="campaign">Campaña agrícola</label>
        <input id="campaign" maxLength={80} value={context.campaign ?? ''}
          onChange={event => onChange({ campaign: event.target.value || null })} /></div>
      {plotMeasurements.map(({ key, label, max }) => <div className="field" key={key}>
        <label htmlFor={key}>{label}</label>
        <input id={key} type="number" min="0" max={max} step="any" value={context[key] ?? ''}
          onChange={event => onChange({ [key]: event.target.value === '' ? null : Number(event.target.value) })} />
      </div>)}
      {choices.map(({ key, label, options }) => <div className="field" key={key}>
        <label htmlFor={key}>{label}</label>
        <select id={key} value={context[key]} onChange={event => onChange({ [key]: event.target.value })}>
          {Object.entries(options).map(([value, name]) => <option key={value} value={value}>{name}</option>)}
        </select>
      </div>)}
    </div>
    <div className="rotation-fields">
      {([{ key: 'previous_history', label: 'Otros cultivos que recuerdes' },
        { key: 'pest_history', label: 'Plagas o enfermedades observadas' }] as const).map(({ key, label }) =>
        <div className="field" key={key}><label htmlFor={key}>{label}</label>
          <textarea id={key} rows={2} maxLength={500} value={context[key] ?? ''}
            onChange={event => onChange({ [key]: event.target.value || null })} /></div>)}
    </div>
  </>
}
