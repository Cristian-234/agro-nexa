import type { Cultivar, Drainage, FloodingHistory, LotHarvest, Moisture, MoistureCondition, PlotContext, Position, PreliminaryResult } from '../../api/preliminary'
import type { PreviousCrop } from '../../api/rotation'
import { peruToday } from '../climate/filters'
import { irrigationNames, textureNames } from './labels'

const cultivarNames: Record<Cultivar, string> = {
  unknown: 'Sin confirmar', illpa_inia: 'Illpa INIA confirmado', other: 'Otro cultivar',
}
const drainageNames: Record<Drainage, string> = {
  unknown: 'No sé', good: 'Buen drenaje', limited: 'Drenaje limitado', poor: 'Drenaje deficiente', waterlogging: 'Encharcamiento',
}
const crops: Record<PreviousCrop, string> = { unknown: 'No sé', potato: 'Papa', quinoa: 'Quinua', other: 'Otro cultivo' }
const floodingNames: Record<FloodingHistory, string> = { unknown: 'No sé', yes: 'Sí', no: 'No' }
const positions: Record<Position, string> = { unknown: 'No sé', slope: 'Ladera', plain: 'Pampa o terreno llano', other: 'Otra' }
const emptyHarvest: LotHarvest = { crop: 'unknown', harvest_date: null }
const moistureNames: Record<Moisture['kind'], string> = {
  unknown: 'Sin evidencia', observed: 'Humedad observada', measured: 'Humedad medida',
}
const conditions: Record<MoistureCondition, string> = {
  dry: 'Seco', moist: 'Húmedo', saturated: 'Saturado',
}
export const preliminaryTextures = { ...textureNames, sandy_loam: 'Franco-arenosa' }

export interface PreliminaryFieldsData {
  cultivar: Cultivar
  lotHistory: LotHarvest[]
  phDate: string
  phMethod: string
  textureMethod: string
  drainage: Drainage
  flooding: FloodingHistory
  moistureKind: Moisture['kind']
  moistureDate: string
  moistureCondition: MoistureCondition | ''
  moistureValue: string
  moistureMethod: string
  sowingDate: string
  chemicals: string
  elevation: string
  position: Position
}

export const initialPreliminaryFields: PreliminaryFieldsData = {
  cultivar: 'unknown', lotHistory: [emptyHarvest], phDate: '', phMethod: '', textureMethod: '',
  drainage: 'unknown', flooding: 'unknown', moistureKind: 'unknown',
  moistureDate: '', moistureCondition: '', moistureValue: '', moistureMethod: '',
  sowingDate: '', chemicals: '', elevation: '', position: 'unknown',
}

function LotHistoryFields({ value, onChange }: { value: LotHarvest[]; onChange: (value: LotHarvest[]) => void }) {
  function edit(index: number, update: Partial<LotHarvest>) {
    onChange(value.map((item, position) => position === index ? { ...item, ...update } : item))
  }
  return <fieldset className="choice-set">
    <legend>Historial de cultivos del mismo lote</legend>
    <p className="rotation-help">Empieza por el cultivo inmediatamente anterior. Si registras más cosechas, ordénalas de la más reciente a la más antigua.</p>
    {value.map((item, index) => <div className="rotation-fields" key={index}>
      <div className="field">
        <label htmlFor={'lot-crop-' + index}>{index === 0 ? 'Cultivo inmediato del mismo lote' : 'Cultivo previo ' + (index + 1)}</label>
        <select id={'lot-crop-' + index} value={item.crop}
          onChange={event => edit(index, { crop: event.target.value as PreviousCrop })}>
          {Object.entries(crops).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor={'harvest-' + index}>{index === 0 ? 'Fecha de cosecha anterior' : 'Fecha de cosecha ' + (index + 1)}</label>
        <input id={'harvest-' + index} type="date" value={item.harvest_date ?? ''} max={peruToday()}
          onChange={event => edit(index, { harvest_date: event.target.value || null })} />
      </div>
    </div>)}
    <div className="action-row">
      {value.length < 8 && <button className="text-button" type="button" onClick={() => onChange([...value, emptyHarvest])}>Añadir una cosecha anterior</button>}
      {value.length > 1 && <button className="text-button" type="button" onClick={() => onChange(value.slice(0, -1))}>Quitar última fila</button>}
    </div>
  </fieldset>
}

export function PreliminaryFields({ data, onChange }: {
  data: PreliminaryFieldsData
  onChange: (update: Partial<PreliminaryFieldsData>) => void
}) {
  return <fieldset className="choice-set">
    <legend>Datos de parcela para Ilave</legend>
    <p className="rotation-help">Estas observaciones se contrastan con referencias bibliográficas de Illpa INIA cuando corresponda.</p>
    <LotHistoryFields value={data.lotHistory} onChange={lotHistory => onChange({ lotHistory })} />
    <div className="rotation-fields">
      <div className="field">
        <label htmlFor="illpa-cultivar">Cultivar de quinua</label>
        <select id="illpa-cultivar" value={data.cultivar}
          onChange={event => onChange({ cultivar: event.target.value as Cultivar })}>
          {Object.entries(cultivarNames).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="ph-date">Fecha de medición del pH</label>
        <input id="ph-date" type="date" value={data.phDate} max={peruToday()}
          onChange={event => onChange({ phDate: event.target.value })} />
      </div>
      <div className="field">
        <label htmlFor="ph-method">Método de medición del pH</label>
        <input id="ph-method" value={data.phMethod} maxLength={120}
          onChange={event => onChange({ phMethod: event.target.value })} />
      </div>
      <div className="field">
        <label htmlFor="texture-method">Método de identificación de la textura</label>
        <input id="texture-method" value={data.textureMethod} maxLength={120}
          onChange={event => onChange({ textureMethod: event.target.value })} />
      </div>
      <div className="field">
        <label htmlFor="drainage">Drenaje de la parcela</label>
        <select id="drainage" value={data.drainage}
          onChange={event => onChange({ drainage: event.target.value as Drainage })}>
          {Object.entries(drainageNames).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="flooding">Antecedentes de inundación</label>
        <select id="flooding" value={data.flooding}
          onChange={event => onChange({ flooding: event.target.value as FloodingHistory })}>
          {Object.entries(floodingNames).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="moisture-kind">Humedad en el establecimiento</label>
        <select id="moisture-kind" value={data.moistureKind}
          onChange={event => onChange({
            moistureKind: event.target.value as Moisture['kind'],
            moistureDate: '', moistureCondition: '', moistureValue: '', moistureMethod: '',
          })}>
          {Object.entries(moistureNames).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
      </div>
      {data.moistureKind !== 'unknown' && <div className="field">
        <label htmlFor="moisture-date">Fecha de la observación o medición</label>
        <input id="moisture-date" type="date" value={data.moistureDate} max={peruToday()}
          onChange={event => onChange({ moistureDate: event.target.value })} />
      </div>}
      {data.moistureKind !== 'unknown' && <div className="field">
        <label htmlFor="moisture-method">Método de observación o medición de humedad</label>
        <input id="moisture-method" value={data.moistureMethod} maxLength={120}
          onChange={event => onChange({ moistureMethod: event.target.value })} />
      </div>}
      {data.moistureKind === 'observed' && <div className="field">
        <label htmlFor="moisture-condition">Condición observada</label>
        <select id="moisture-condition" value={data.moistureCondition}
          onChange={event => onChange({ moistureCondition: event.target.value as MoistureCondition | '' })}>
          <option value="">Selecciona una condición</option>
          {Object.entries(conditions).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
      </div>}
      {data.moistureKind === 'measured' && <div className="field">
        <label htmlFor="moisture-value">Contenido volumétrico (% v/v)</label>
        <input id="moisture-value" type="number" min="0" max="100" step="any" value={data.moistureValue}
          onChange={event => onChange({ moistureValue: event.target.value })} />
      </div>}
    </div>
    <details className="plot-context">
      <summary>Contexto adicional del lote</summary>
      <div className="rotation-fields">
        <div className="field">
          <label htmlFor="planned-sowing">Fecha prevista de siembra</label>
          <input id="planned-sowing" type="date" value={data.sowingDate}
            onChange={event => onChange({ sowingDate: event.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="plot-elevation">Altitud declarada (m s. n. m.)</label>
          <input id="plot-elevation" type="number" step="any" value={data.elevation}
            onChange={event => onChange({ elevation: event.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="plot-position">Posición fisiográfica</label>
          <select id="plot-position" value={data.position}
            onChange={event => onChange({ position: event.target.value as Position })}>
            {Object.entries(positions).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="plot-chemicals">Historial conocido de agroquímicos</label>
          <textarea id="plot-chemicals" rows={2} maxLength={300} value={data.chemicals}
            aria-describedby="plot-chemicals-help" onChange={event => onChange({ chemicals: event.target.value })} />
          <small id="plot-chemicals-help">Evita incluir nombres, direcciones u otros datos personales.</small>
        </div>
      </div>
    </details>
  </fieldset>
}

const states = {
  matches_reference: { label: 'Coincide con la referencia', style: 'badge-good' },
  outside_reference: { label: 'Fuera de la referencia', style: 'badge-warn' },
  insufficient_information: { label: 'Información insuficiente', style: 'badge-neutral' },
}
const number = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 10 })

type Criterion = PreliminaryResult['criteria'][number]

function fieldLabel<T extends string>(names: Record<T, string>, value: unknown) {
  return typeof value === 'string' && Object.hasOwn(names, value) ? names[value as T] : 'Sin dato'
}

function enteredValue({ entered_value: entry, reference }: Criterion) {
  if (!entry) return 'Sin contraste con datos climáticos'
  switch (reference.id) {
    case 'sequence': return Array.isArray(entry.lot_history) && entry.lot_history.length
      ? <ul>{entry.lot_history.map((harvest, index) => <li key={index}>
        {index === 0 && 'Inmediato · '}{crops[harvest.crop]} · {harvest.harvest_date ?? 'Fecha sin registrar'}
      </li>)}</ul>
      : 'Sin historial del mismo lote'
    case 'ph': {
      const ph = typeof entry.soil_ph === 'number' ? number.format(entry.soil_ph) + ' pH' : 'Sin medición'
      return ph + ' · ' + (entry.date ?? 'Fecha sin registrar') + ' · ' + (entry.method ?? 'Método sin registrar')
    }
    case 'texture': return fieldLabel(preliminaryTextures, entry.soil_texture)
      + (entry.method ? ' · ' + entry.method : '')
    case 'drainage': return fieldLabel(drainageNames, entry.drainage)
      + ' · Inundación previa: ' + fieldLabel(floodingNames, entry.flooding_history ?? 'unknown')
    case 'moisture': {
      const irrigation = 'Riego: ' + fieldLabel(irrigationNames, entry.irrigation)
      const method = ' · ' + (entry.method ?? 'Método sin registrar')
      const date = ' · ' + (entry.date ?? 'Fecha sin registrar')
      if (entry.kind === 'observed') return irrigation + ' · Observación: ' + fieldLabel(conditions, entry.condition) + date + method
      if (entry.kind === 'measured') return irrigation + ' · Medición: '
        + (typeof entry.value === 'number' ? number.format(entry.value) + ' % v/v' : 'Sin valor') + date + method
      return irrigation + ' · Humedad sin evidencia'
    }
    default: return 'Sin dato'
  }
}

function referenceValue(reference: Criterion['reference']) {
  const { value, unit } = reference
  if (typeof value === 'string') return value
  if (reference.id === 'texture') return value.map(item => fieldLabel(preliminaryTextures, item)).join(' / ')
  return value.map(item => number.format(Number(item))).join('–') + (unit ? ' ' + unit : '')
}

function PlotSummary({ context }: { context: PlotContext }) {
  const { planned_sowing_date: date, position, agrochemical_history: chemicals, elevation_m: elevation } = context
  if (!date && !chemicals && elevation == null && (!position || position === 'unknown')) return null
  return <details className="plot-context">
    <summary>Contexto declarado del lote</summary>
    <dl>
      <dt>Siembra prevista</dt><dd>{date ?? 'Sin dato'}</dd>
      <dt>Altitud</dt><dd>{elevation == null ? 'Sin dato' : number.format(elevation) + ' m s. n. m.'}</dd>
      <dt>Posición fisiográfica</dt><dd>{positions[position ?? 'unknown']}</dd>
      <dt>Agroquímicos</dt><dd>{chemicals ?? 'Sin dato'}</dd>
    </dl>
  </details>
}

const criterionTypes = {
  candidate_rule: 'Regla candidata · Borrador',
  documentary_reference: 'Referencia documental',
  not_evaluable: 'No evaluable',
}

export function PreliminaryResults({ data }: { data: PreliminaryResult }) {
  return <section className="panel query-card" aria-labelledby="preliminary-results">
    <h2 id="preliminary-results">Evaluación agronómica preliminar</h2>
    <p>Ilave · Papa → quinua · {cultivarNames[data.cultivar]}</p>
    <p className="rotation-help">Las coincidencias describen la bibliografía. La evaluación agronómica de la parcela requiere revisión local.</p>
    {data.plot_context && <PlotSummary context={data.plot_context} />}
    <div className="rotation-results-grid preliminary-grid">
      {data.criteria.map(item => <article key={item.reference.id} className="panel query-card preliminary-criterion">
        <h3>{item.reference.parameter}</h3>
        {item.reference.criterion_type && <p className="criterion-type" data-type={item.reference.criterion_type}>{criterionTypes[item.reference.criterion_type]}</p>}
        <span className={'badge ' + states[item.state].style}>{states[item.state].label}</span>
        <dl>
          <dt>Dato de la ficha</dt><dd>{enteredValue(item)}</dd>
          <dt>Referencia</dt><dd>{referenceValue(item.reference)}. {item.reference.scope}</dd>
          <dt>Interpretación</dt><dd>{item.explanation}</dd>
          <dt>Limitación</dt><dd>{item.limitation}</dd>
          {item.pending_data.length > 0 && <>
            <dt>Datos pendientes</dt><dd><ul>{item.pending_data.map(pending => <li key={pending}>{pending}</li>)}</ul></dd>
          </>}
          <dt>Fuente</dt><dd>
            <a href={item.reference.source_url} target="_blank" rel="noreferrer">{item.reference.source_title}</a>
            <br />{item.reference.source_section}
            {item.reference.source_issuer && <><br />{item.reference.source_issuer} · {item.reference.source_year}</>}
            {item.reference.verification && <><br />Cotejada en la fuente primaria</>}
            <br />Versión {item.reference.version}
          </dd>
        </dl>
      </article>)}
    </div>
  </section>
}
