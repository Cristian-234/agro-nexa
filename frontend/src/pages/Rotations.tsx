import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { Location } from '../api/locations'
import { Icon, LoadingSkeleton, PageHeading } from '../app/ui'
import { evaluatePreliminary, type Moisture, type PreliminaryResult, type Texture } from '../api/preliminary'
import { evaluateRotation, getCrops, type Crop, type CropId, type Irrigation, type PreviousCrop, type Priority, type RotationInput, type RotationObjective, type RotationResult, type SoilFertility, type SoilTexture, type WaterSource } from '../api/rotation'
import { examplePeriod, initialPeriod, periodError, PeriodFields, saveFilters } from '../features/climate/filters'
import { formatPeriod } from '../features/climate/format'
import { CampaignClimate } from '../features/rotation/CampaignClimate'
import { irrigationNames, priorityNames, textureNames } from '../features/rotation/labels'
import { initialPreliminaryFields, PreliminaryFields, PreliminaryResults, preliminaryTextures, type PreliminaryFieldsData } from '../features/rotation/Preliminary'
import { RotationResults } from '../features/rotation/RotationResults'
import { useRequest } from '../hooks/useRequest'

const steps = ['Zona y periodo', 'Cultivos y antecedentes', 'Agua y suelo', 'Evaluación y resultados']

function RotationForm({ locations, crops }: { locations: Location[]; crops: Crop[] }) {
  const [step, setStep] = useState(0)
  const [error, setError] = useState('')
  const [referenceError, setReferenceError] = useState('')
  const [form, setForm] = useState<Omit<RotationInput, 'soil_texture'>>(() => {
    const requested = new URLSearchParams(window.location.search).get('location_id')
    return {
      ...initialPeriod(),
      location_id: locations.find(item => item.id === requested)?.id
        ?? locations.find(item => item.id === 'puno-ilave')?.id ?? locations[0].id,
      previous_crop: 'unknown', candidate_crops: [], irrigation: 'unknown',
      soil_ph: null, soil_notes: null, priorities: [],
      plot_context: {
        campaign: null, plot_area_m2: null, elevation_m: null, slope_percent: null,
        water_source: 'unknown', soil_fertility: 'unknown', last_yield_kg: null,
        planned_sowing_date: null, planned_harvest_date: null, objective: 'unknown',
        pest_history: null, previous_history: null,
      },
    }
  })
  const [ph, setPh] = useState('')
  const [soilTexture, setSoilTexture] = useState<SoilTexture>('unknown')
  const [referenceTexture, setReferenceTexture] = useState<Texture | ''>('')
  const [fields, setFields] = useState(initialPreliminaryFields)
  const heading = useRef<HTMLHeadingElement>(null)
  const evaluation = useRequest<RotationResult>()
  const preliminary = useRequest<PreliminaryResult>()
  const selected = locations.find(location => location.id === form.location_id)
  const inScope = form.location_id === 'puno-ilave' && form.previous_crop === 'potato'
    && form.candidate_crops.includes('quinoa')
  const measuredPh = ph === '' ? null : Number(ph)
  const invalidPh = measuredPh !== null && (!Number.isFinite(measuredPh) || measuredPh < 0 || measuredPh > 14)
  const phError = (Boolean(error) || Boolean(referenceError)) && invalidPh

  useEffect(() => { heading.current?.focus() }, [step])

  function edit(update: Partial<typeof form>) {
    setForm(current => ({ ...current, ...update }))
    setError('')
    setReferenceError('')
    evaluation.reset()
    preliminary.reset()
  }
  function editFields(update: Partial<PreliminaryFieldsData>) {
    setFields(current => ({ ...current, ...update }))
    setReferenceError('')
    preliminary.reset()
  }
  function toggleCrop(id: CropId) {
    edit({ candidate_crops: form.candidate_crops.includes(id)
      ? form.candidate_crops.filter(crop => crop !== id) : [...form.candidate_crops, id] })
  }
  function togglePriority(id: Priority) {
    edit({ priorities: form.priorities.includes(id)
      ? form.priorities.filter(priority => priority !== id) : [...form.priorities, id] })
  }
  function navigateStep(target: number) {
    setError('')
    setReferenceError('')
    evaluation.reset()
    preliminary.reset()
    setStep(target)
  }
  function runEvaluation() {
    evaluation.load(signal => evaluateRotation({ ...form, soil_ph: measuredPh, soil_texture: soilTexture }, signal))
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (step === 0) {
      const issue = periodError(form)
      if (issue) { setError(issue); return }
      saveFilters(form, [['location_id', form.location_id]])
    }
    if (step === 1 && !form.candidate_crops.length) {
      setError('Selecciona al menos un cultivo candidato.')
      return
    }
    setError('')
    if (step < 2) { setStep(step + 1); return }

    if (invalidPh) {
      setError('El pH medido debe estar entre 0 y 14.')
      return
    }
    setStep(3)
    runEvaluation()
  }

  function submitReferences(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    if (invalidPh) {
      setReferenceError('Revisa el pH medido de la ficha básica. Debe estar entre 0 y 14.')
      return
    }
    setReferenceError('')
    let moisture: Moisture = { kind: 'unknown' }
    const method = fields.moistureMethod.trim() || undefined
    const date = fields.moistureDate || null
    if (fields.moistureKind === 'observed') {
      moisture = { kind: 'observed', date, condition: fields.moistureCondition || null, method }
    }
    if (fields.moistureKind === 'measured') {
      const content = fields.moistureValue === '' ? null : Number(fields.moistureValue)
      if (content !== null && (!Number.isFinite(content) || content < 0 || content > 100)) {
        setReferenceError('El contenido volumétrico debe estar entre 0 y 100 % v/v.')
        return
      }
      moisture = { kind: 'measured', date, value: content, unit: '% v/v', method }
    }
    const count = fields.lotHistory.reduce(
      (last, harvest, index) => harvest.crop !== 'unknown' || harvest.harvest_date ? index + 1 : last, 0,
    )
    const lotHistory = fields.lotHistory.slice(0, count)
    const datedHarvests = lotHistory.flatMap(entry => entry.harvest_date ? [entry.harvest_date] : [])
    if (datedHarvests.some((day, index) => index > 0 && day >= datedHarvests[index - 1])) {
      setReferenceError('Ordena las cosechas fechadas de la más reciente a la más antigua.')
      return
    }
    if (fields.sowingDate && datedHarvests[0] && fields.sowingDate < datedHarvests[0]) {
      setReferenceError('La siembra prevista debe ser igual o posterior a la última cosecha registrada.')
      return
    }
    preliminary.load(signal => evaluatePreliminary({
      location_id: 'puno-ilave', previous_crop: 'potato', candidate_crop: 'quinoa',
      cultivar: fields.cultivar, lot_history: lotHistory,
      soil_ph: measuredPh, soil_ph_date: fields.phDate || null, soil_ph_method: fields.phMethod.trim() || null,
      soil_texture: referenceTexture || soilTexture, soil_texture_method: fields.textureMethod.trim() || null,
      drainage: fields.drainage, flooding_history: fields.flooding, irrigation: form.irrigation,
      establishment_moisture: moisture,
      plot_context: {
        planned_sowing_date: fields.sowingDate || null,
        agrochemical_history: fields.chemicals.trim() || null,
        elevation_m: fields.elevation === '' ? null : Number(fields.elevation),
        position: fields.position,
      },
    }, signal))
  }

  return (
    <>
      <div className="wizard-progress"><span>Paso {step + 1} de {steps.length}</span>
        <progress aria-label="Progreso de la ficha" max={steps.length} value={step + 1} />
      </div>
      <ol className="rotation-steps" aria-label="Pasos de la ficha">
        {steps.map((label, index) => <li key={label} aria-current={index === step ? 'step' : undefined} data-completed={index < step}>
          <span>{index < step ? <Icon name="check" size={14} /> : index + 1}</span> {label}
        </li>)}
      </ol>
      {step < 3 && <form className="panel query-card rotation-form" noValidate onSubmit={submit}>
        <h2 ref={heading} tabIndex={-1}>{steps[step]}</h2>
        {step === 0 && <>
          <div className="rotation-fields">
            <div className="field">
              <label htmlFor="rotation-location">Localidad</label>
              <select id="rotation-location" value={form.location_id} onChange={event => edit({ location_id: event.target.value })}>
                {locations.map(location => <option key={location.id} value={location.id}>
                  {location.name} · {location.region}
                </option>)}
              </select>
            </div>
            <PeriodFields period={form} onChange={edit} invalid={Boolean(error)} />
          </div>
          {selected && !selected.verified && <p className="badge badge-warn">Coordenada preliminar</p>}
          <button className="text-button" type="button" onClick={() => edit(examplePeriod)}>Usar año 2024</button>
        </>}
        {step === 1 && <>
          <div className="field rotation-single">
            <label htmlFor="previous-crop">Cultivo anterior</label>
            <select id="previous-crop" value={form.previous_crop} onChange={event => edit({ previous_crop: event.target.value as PreviousCrop })}>
              <option value="unknown">No sé</option>
              <option value="other">Otro cultivo</option>
              {crops.map(crop => <option key={crop.id} value={crop.id}>{crop.name_es}</option>)}
            </select>
          </div>
          <fieldset className="choice-set" aria-describedby={error ? 'filter-error' : undefined}>
            <legend>Cultivos candidatos</legend>
            <div className="choices rotation-choices">
              {crops.map(crop => <label className="choice" key={crop.id}>
                <input type="checkbox" checked={form.candidate_crops.includes(crop.id)} onChange={() => toggleCrop(crop.id)} />
                <span><strong>{crop.name_es}</strong>{crop.description && <small>{crop.description}</small>}</span>
              </label>)}
            </div>
          </fieldset>
        </>}
        {step === 2 && <>
          <div className="rotation-fields">
            <div className="field">
              <label htmlFor="irrigation">Disponibilidad de riego</label>
              <select id="irrigation" value={form.irrigation} onChange={event => edit({ irrigation: event.target.value as Irrigation })}>
                {Object.entries(irrigationNames).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="soil-texture">Textura del suelo</label>
              <select id="soil-texture" value={soilTexture} onChange={event => {
                setSoilTexture(event.target.value as SoilTexture)
                edit({})
              }}>
                {Object.entries(textureNames).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="soil-ph">pH medido (opcional)</label>
              <input id="soil-ph" type="number" min="0" max="14" step="any" value={ph} placeholder="0–14"
                aria-describedby={phError ? (error ? 'filter-error' : 'reference-error') : 'soil-ph-help'} aria-invalid={phError}
                onChange={event => { setPh(event.target.value); edit({ soil_ph: null }) }} />
              <small id="soil-ph-help">Déjalo vacío si no tienes una medición.</small>
            </div>
          </div>
          <fieldset className="choice-set">
            <legend>Prioridades (opcional)</legend>
            <p className="rotation-help">Las prioridades contextualizan la ficha. Los pesos proceden de las reglas aprobadas.</p>
            <div className="choices">
              {Object.entries(priorityNames).map(([id, label]) => <label className="choice" key={id}>
                <input type="checkbox" checked={form.priorities.includes(id as Priority)} onChange={() => togglePriority(id as Priority)} />
                <span>{label}</span>
              </label>)}
            </div>
          </fieldset>
          <div className="field">
            <label htmlFor="soil-notes">Observaciones del suelo (opcional)</label>
            <textarea id="soil-notes" rows={3} maxLength={500} value={form.soil_notes ?? ''}
              aria-describedby="soil-notes-help" onChange={event => edit({ soil_notes: event.target.value || null })} />
            <small id="soil-notes-help">Usa hasta 500 caracteres y evita nombres, direcciones u otros datos personales.</small>
          </div>
          <details className="plot-context">
            <summary>Agregar contexto de la parcela (opcional)</summary>
            <p className="rotation-help">Estos datos ayudan a documentar la ficha. Se mostrarán en el contexto de la evaluación y no generan recomendaciones automáticas sin reglas aprobadas.</p>
            <div className="rotation-fields plot-context-grid">
              <div className="field"><label htmlFor="campaign">Campaña agrícola</label>
                <input id="campaign" type="text" maxLength={80} placeholder="Ej. 2026–2027" value={form.plot_context.campaign ?? ''}
                  onChange={event => edit({ plot_context: { ...form.plot_context, campaign: event.target.value || null } })} /></div>
              <div className="field"><label htmlFor="plot-area">Área de parcela (m²)</label>
                <input id="plot-area" type="number" min="0" step="any" placeholder="Ej. 1200" value={form.plot_context.plot_area_m2 ?? ''}
                  onChange={event => edit({ plot_context: { ...form.plot_context, plot_area_m2: event.target.value === '' ? null : Number(event.target.value) } })} /></div>
              <div className="field"><label htmlFor="elevation">Altitud (m s. n. m.)</label>
                <input id="elevation" type="number" min="0" max="7000" step="any" placeholder="Ej. 3850" value={form.plot_context.elevation_m ?? ''}
                  onChange={event => edit({ plot_context: { ...form.plot_context, elevation_m: event.target.value === '' ? null : Number(event.target.value) } })} /></div>
              <div className="field"><label htmlFor="slope">Pendiente (%)</label>
                <input id="slope" type="number" min="0" max="100" step="any" placeholder="Ej. 12" value={form.plot_context.slope_percent ?? ''}
                  onChange={event => edit({ plot_context: { ...form.plot_context, slope_percent: event.target.value === '' ? null : Number(event.target.value) } })} /></div>
              <div className="field"><label htmlFor="water-source">Fuente de agua</label>
                <select id="water-source" value={form.plot_context.water_source} onChange={event => edit({ plot_context: { ...form.plot_context, water_source: event.target.value as WaterSource } })}>
                  <option value="unknown">No sé</option><option value="canal">Canal</option><option value="pozo">Pozo</option><option value="lluvia">Lluvia</option><option value="mixto">Mixta</option>
                </select></div>
              <div className="field"><label htmlFor="soil-fertility">Fertilidad estimada</label>
                <select id="soil-fertility" value={form.plot_context.soil_fertility} onChange={event => edit({ plot_context: { ...form.plot_context, soil_fertility: event.target.value as SoilFertility } })}>
                  <option value="unknown">No sé</option><option value="high">Alta</option><option value="medium">Media</option><option value="low">Baja</option>
                </select></div>
              <div className="field"><label htmlFor="last-yield">Último rendimiento (kg)</label>
                <input id="last-yield" type="number" min="0" step="any" placeholder="Ej. 850" value={form.plot_context.last_yield_kg ?? ''}
                  onChange={event => edit({ plot_context: { ...form.plot_context, last_yield_kg: event.target.value === '' ? null : Number(event.target.value) } })} /></div>
              <div className="field"><label htmlFor="rotation-objective">Objetivo principal</label>
                <select id="rotation-objective" value={form.plot_context.objective} onChange={event => edit({ plot_context: { ...form.plot_context, objective: event.target.value as RotationObjective } })}>
                  <option value="unknown">No definido</option><option value="yield">Mejorar rendimiento</option><option value="water_saving">Ahorrar agua</option><option value="soil_conservation">Conservar el suelo</option><option value="risk_reduction">Reducir riesgos</option>
                </select></div>
              <div className="field"><label htmlFor="sowing-date">Siembra prevista</label>
                <input id="sowing-date" type="date" value={form.plot_context.planned_sowing_date ?? ''} onChange={event => edit({ plot_context: { ...form.plot_context, planned_sowing_date: event.target.value || null } })} /></div>
              <div className="field"><label htmlFor="harvest-date">Cosecha prevista</label>
                <input id="harvest-date" type="date" value={form.plot_context.planned_harvest_date ?? ''} onChange={event => edit({ plot_context: { ...form.plot_context, planned_harvest_date: event.target.value || null } })} /></div>
            </div>
            <div className="rotation-fields plot-context-notes">
              <div className="field"><label htmlFor="previous-history">Historial de cultivos</label>
                <textarea id="previous-history" rows={2} maxLength={500} placeholder="Cultivos de los últimos años…" value={form.plot_context.previous_history ?? ''}
                  onChange={event => edit({ plot_context: { ...form.plot_context, previous_history: event.target.value || null } })} /></div>
              <div className="field"><label htmlFor="pest-history">Plagas o enfermedades observadas</label>
                <textarea id="pest-history" rows={2} maxLength={500} placeholder="Registra antecedentes si los conoces…" value={form.plot_context.pest_history ?? ''}
                  onChange={event => edit({ plot_context: { ...form.plot_context, pest_history: event.target.value || null } })} /></div>
            </div>
          </details>
        </>}
        {step === 2 && <details className="wizard-review">
          <summary>Revisar datos antes de evaluar</summary>
          <dl>
            <div><dt>Localidad y periodo</dt><dd>{selected?.name} · {formatPeriod(form)}</dd></div>
            <div><dt>Cultivo anterior</dt><dd>{crops.find(crop => crop.id === form.previous_crop)?.name_es
              ?? (form.previous_crop === 'other' ? 'Otro cultivo' : 'No sé')}</dd></div>
            <div><dt>Candidatos</dt><dd>{crops.filter(crop => form.candidate_crops.includes(crop.id)).map(crop => crop.name_es).join(', ')}</dd></div>
            <div><dt>Riego, textura y pH</dt><dd>{irrigationNames[form.irrigation]} · {textureNames[soilTexture]} · {ph || 'Sin pH'}</dd></div>
            <div><dt>Parcela y campaña</dt><dd>{form.plot_context.plot_area_m2 ? `${form.plot_context.plot_area_m2} m²` : 'Sin área'} · {form.plot_context.campaign || 'Sin campaña'}</dd></div>
            <div><dt>Objetivo</dt><dd>{form.plot_context.objective === 'yield' ? 'Mejorar rendimiento' : form.plot_context.objective === 'water_saving' ? 'Ahorrar agua' : form.plot_context.objective === 'soil_conservation' ? 'Conservar el suelo' : form.plot_context.objective === 'risk_reduction' ? 'Reducir riesgos' : 'No definido'}</dd></div>
          </dl>
          <div className="action-row"><button className="text-button" type="button" onClick={() => navigateStep(0)}>Editar zona y periodo</button>
            <button className="text-button" type="button" onClick={() => navigateStep(1)}>Editar cultivos</button></div>
        </details>}
        {error && <p id="filter-error" role="alert" className="notice error">{error}</p>}
        <div className="action-row rotation-actions">
          {step > 0 && <button className="button secondary" type="button" onClick={() => navigateStep(step - 1)}>Volver</button>}
          <button className="button primary" type="submit">
            {step < 2 ? 'Continuar' : 'Evaluar alternativas'}
          </button>
        </div>
      </form>}
      {step === 3 && <header className="panel query-card rotation-review-heading">
        <div><h2 ref={heading} tabIndex={-1}>Evaluación y resultados</h2>
          <p>{selected?.name} · {formatPeriod(form)}</p></div>
        <button type="button" className="button secondary" onClick={() => navigateStep(2)}>Editar agua y suelo</button>
      </header>}
      {step >= 2 && inScope && <details className="panel query-card rotation-references">
        <summary>Consultar referencias del INIA</summary>
        <form className="rotation-form" noValidate onSubmit={submitReferences}>
          <p className="rotation-help">Contraste opcional para papa → quinua en Ilave. Se usa el riego y el pH declarados en la ficha básica.</p>
          <div className="field rotation-single">
            <label htmlFor="reference-texture">Textura para el contraste</label>
            <select id="reference-texture" value={referenceTexture} onChange={event => {
              setReferenceTexture(event.target.value as Texture | '')
              setReferenceError('')
              preliminary.reset()
            }}>
              <option value="">Usar la textura de la ficha básica</option>
              {Object.entries(preliminaryTextures).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
          </div>
          <PreliminaryFields data={fields} onChange={editFields} />
          {referenceError && <p id="reference-error" className="notice error" role="alert">{referenceError}</p>}
          <div className="action-row">
            <button className="button secondary" type="submit" disabled={preliminary.result.status === 'loading'}>Contrastar con las referencias</button>
          </div>
        </form>
        {preliminary.result.status === 'loading' && <p className="notice" role="status">Consultando referencias de Illpa INIA…</p>}
        {preliminary.result.status === 'error' && <p className="notice error" role="alert">{preliminary.result.message}</p>}
        {preliminary.result.status === 'ready' && <PreliminaryResults data={preliminary.result.data} />}
        <CampaignClimate />
      </details>}
      {evaluation.result.status === 'loading' && <LoadingSkeleton label="Revisando reglas y evidencia disponible…" />}
      {evaluation.result.status === 'error' && <div className="notice error"><p role="alert">{evaluation.result.message}</p>
        <button className="text-button" type="button" onClick={runEvaluation}>Reintentar evaluación</button>
      </div>}
      {evaluation.result.status === 'ready' && <RotationResults data={evaluation.result.data} crops={crops} />}
    </>
  )
}

export function Rotations({ locations }: { locations: Location[] }) {
  const { result, load } = useRequest<Crop[]>()
  useEffect(() => { load(getCrops) }, [load])
  return (
    <>
      <PageHeading title="Rotaciones agrícolas" description="Registra el contexto del lote y revisa la evidencia disponible para cada alternativa." icon="rotate" />
      {result.status === 'error' && <div className="notice error"><p role="alert">{result.message}</p>
        <button className="button secondary" type="button" onClick={() => load(getCrops)}>Reintentar catálogo</button></div>}
      {(result.status === 'idle' || result.status === 'loading') && <LoadingSkeleton label="Cargando cultivos…" />}
      {result.status === 'ready' && (result.data.length
        ? <RotationForm locations={locations} crops={result.data} />
        : <p className="notice" role="status">El catálogo de cultivos está vacío.</p>)}
    </>
  )
}
