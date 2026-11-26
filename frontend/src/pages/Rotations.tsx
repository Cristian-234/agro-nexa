import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { summarizePeriod, type ClimateSummary } from '../api/climate'
import type { Location } from '../api/locations'
import { evaluateRotation, getCrops, type Crop, type CropId, type KnownAnswer, type PlantingAnswers, type Priority, type RotationInput, type RotationResult, type SoilTexture } from '../api/rotation'
import { Icon, LoadingSkeleton, PageHeading } from '../app/ui'
import { examplePeriod, initialPeriod, lastConsultedPeriod, periodError, PeriodFields, peruToday, rememberConsultedPeriod, saveFilters } from '../features/climate/filters'
import { formatDay, formatPeriod, indicatorName, number, qualityLabel, unit } from '../features/climate/format'
import { Provenance, Warnings } from '../features/climate/ResultDetails'
import { AdditionalPlotFields, initialPlotContext, plotMeasurements } from '../features/rotation/AdditionalPlotFields'
import { IniaReferences } from '../features/rotation/IniaReferences'
import { priorityNames, textureNames } from '../features/rotation/labels'
import { PlotContextSummary } from '../features/rotation/PlotContextSummary'
import { RotationResults } from '../features/rotation/RotationResults'
import { useRequest } from '../hooks/useRequest'

const steps = ['Mi terreno', 'Mis cultivos anteriores', 'Mi próxima siembra', 'Conozcamos un poco más tu terreno', 'Revisar mis respuestas']
const experienceNames = { first: 'Es la primera vez', one_two: 'Desde hace 1 o 2 campañas', three_more: 'Desde hace 3 o más campañas', unknown: 'No recuerdo' } as const
const knownNames = { yes: 'Sí', no: 'No', unknown: 'No recuerdo' } satisfies Record<KnownAnswer, string>
const waterNames = { rain: 'Principalmente de la lluvia', irrigation: 'Tengo riego', both: 'Uso lluvia y riego', unknown: 'No estoy seguro' } as const
const pondingNames = { yes: 'Sí, suele quedarse acumulada', sometimes: 'A veces', no: 'No, el agua se retira normalmente', unknown: 'No sé' } as const
const soilDescriptions = { sand: 'Suelta, con granos que se sienten al tocarla.', clay: 'Pegajosa cuando está mojada.', loam: 'Mezcla de arena, limo y arcilla.', sandy_loam: 'Mezcla con más arena al tacto.', unknown: 'Puedes continuar sin este dato.' }
const scheduleError = 'La cosecha prevista debe ser igual o posterior a la siembra prevista.'

type DeclaredDate = { kind: 'unknown' | 'month' | 'day'; value: string }
const blankDate: DeclaredDate = { kind: 'unknown', value: '' }
const dateValue = (field: DeclaredDate) => field.kind === 'month' && field.value ? field.value + '-01' : field.value || null
function dateBound(field: DeclaredDate, latest: boolean) {
  const value = dateValue(field)
  if (!value || !latest || field.kind !== 'month') return value
  const [year, month] = value.split('-').map(Number)
  return field.value + '-' + new Date(Date.UTC(year, month, 0)).getUTCDate()
}
function dateLabel(date: DeclaredDate) {
  const value = dateValue(date)
  if (!value) return 'Sin fecha'
  return date.kind === 'month'
    ? new Intl.DateTimeFormat('es-PE', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(value))
    : formatDay(value)
}

function ChoiceField<T extends string>({ id, label, value, options, onChange }: {
  id: string; label: string; value: T; options: Record<T, string>; onChange: (value: T) => void
}) {
  return <div className="field">
    <label htmlFor={id}>{label}</label>
    <select id={id} value={value} onChange={event => onChange(event.target.value as T)}>
      {(Object.entries(options) as [T, string][]).map(([key, name]) => <option value={key} key={key}>{name}</option>)}
    </select>
  </div>
}

function DateField({ id, label, value, onChange, max, invalid = false }: {
  id: string; label: string; value: DeclaredDate; onChange: (value: DeclaredDate) => void; max?: string; invalid?: boolean
}) {
  return <fieldset className="choice-set planting-date">
    <legend>{label}</legend>
    <ChoiceField id={id + '-precision'} label="Precisión de la fecha" value={value.kind}
      options={{ unknown: 'Sin fecha por ahora', month: 'Mes aproximado', day: 'Fecha exacta' }}
      onChange={kind => onChange({ kind, value: '' })} />
    {value.kind !== 'unknown' && <div className="field">
      <label htmlFor={id}>{value.kind === 'month' ? 'Mes aproximado' : 'Fecha exacta'} · {label}</label>
      <input id={id} type={value.kind === 'month' ? 'month' : 'date'} value={value.value}
        max={value.kind === 'month' ? max?.slice(0, 7) : max}
        aria-invalid={invalid} aria-describedby={invalid ? 'planting-error' : undefined}
        onChange={event => onChange({ ...value, value: event.target.value })} />
    </div>}
  </fieldset>
}

function CropChoices({ crops, extras, name, legend, value, onChange }: {
  crops: Crop[]; extras: Pick<Crop, 'id' | 'name_es' | 'profile'>[]; name: string; legend: string; value: string | null; onChange: (value: string) => void
}) {
  return <fieldset className="choice-set">
    <legend>{legend}</legend>
    <div className="crop-choices">{[...crops, ...extras].map(item => (
      <label key={item.id} className={'crop-choice' + (value === item.id ? ' is-selected' : '')}>
        <input type="radio" name={name} value={item.id} checked={value === item.id} onChange={() => onChange(item.id)} />
        <span className="crop-symbol" aria-hidden="true">{item.profile?.icon ?? <Icon name="leaf" />}</span>
        <strong>{item.name_es}</strong>
      </label>
    ))}</div>
  </fieldset>
}

function CropLibrary({ crops }: { crops: Crop[] }) {
  return <details className="panel query-card planting-details">
    <summary>Conocer los cultivos y la secuencia de ejemplo</summary>
    <p><strong>Papa → Quinua → Cebada → Haba.</strong> Ejemplo documental basado en esquemas andinos de tubérculo, quinua, cereal y leguminosa. La elección de cebada y haba requiere comprobar la variedad y las condiciones locales.</p>
    <ul className="crop-library">{crops.map(({ id, name_es, profile }) => profile && <li key={id}>
      <strong>{name_es} · <i>{profile.scientific_name}</i></strong>
      <p>{profile.introduction} Familia {profile.family}. Información documental.</p>
      {profile.varieties.length > 0 && <p>Variedades citadas en el catálogo de referencia. {profile.varieties.join(', ')}.</p>}
      {profile.references.map(source => <a key={source.url} href={source.url}>{source.title} · {source.section}</a>)}
    </li>)}</ul>
  </details>
}

const noteStates = {
  attention: ['Necesita atención', 'badge-warn'],
  missing_data: ['Faltan datos', 'badge-neutral'],
  reference: ['Información de referencia', 'badge-good'],
}

function RegionalResults({ data, crops }: { data: RotationResult; crops: Crop[] }) {
  return <div className="planting-result-grid">
    {data.alternatives.map(item => {
      const crop = crops.find(crop => crop.id === item.crop_id)
      const notes = data.regional_notes?.filter(note => note.crop_id === item.crop_id) ?? []
      return <article className="panel query-card planting-result" key={item.crop_id}>
        <h3><span aria-hidden="true">{crop?.profile?.icon ?? '🌱'}</span> {crop?.name_es ?? item.crop_id}</h3>
        {item.state === 'restriction_detected' && <p className="notice">Una regla aprobada detectó una restricción. Revisa el detalle del motor.</p>}
        {notes.map((note, index) => <div className="planting-note" key={index}>
          <span className={'badge ' + noteStates[note.state][1]}>{noteStates[note.state][0]}</span>
          <p>{note.message}</p>
          {note.matrix_id && <details className="rotation-criterion">
            <summary>¿Por qué aparece este resultado?</summary>
            <p>Matriz regional v0.3 · p. {note.matrix_page} · {note.matrix_id} · Borrador.</p>
            {note.sources.map(source => <p key={source.url}><a href={source.url}>{source.title} · {source.section}</a></p>)}
          </details>}
        </div>)}
        {item.state === 'insufficient_evidence' && <p className="rotation-help">Para evaluar esta opción hacen falta criterios aprobados y evidencia suficiente para tu terreno.</p>}
      </article>
    })}
  </div>
}

function WeatherSummary({ data }: { data: ClimateSummary }) {
  const group = data.groups[0]
  return <section className="panel query-card planting-weather" aria-labelledby="planting-weather">
    <h3 id="planting-weather">El clima histórico del lugar</h3>
    <p>{formatPeriod(data.period)} · NASA POWER. Los valores describen la zona observada y sirven para revisar el pasado.</p>
    {group && <dl className="planting-metrics">{(['mean_temperature', 'accumulated_precipitation', 'potential_frost_days'] as const).map(code => {
      const item = group.indicators[code]
      return <div key={code}><dt>{indicatorName(code, item)}</dt><dd>{number(item.value)} {unit(item.unit)}</dd></div>
    })}</dl>}
    <details className="rotation-criterion"><summary>Ver procedencia y cobertura</summary>
      <p>Una celda de NASA POWER cubre un área mayor que la parcela. Los días de frío potencial no identifican daños en el cultivo ni anticipan una fecha de siembra.</p>
      {group && <ul>{(['mean_temperature', 'accumulated_precipitation', 'potential_frost_days'] as const).map(code => {
        const item = group.indicators[code]
        return <li key={code}>{indicatorName(code, item)} · {number(item.coverage_pct)} % · {qualityLabel[item.status]}</li>
      })}</ul>}
      <Provenance source={data.source} period={data.period} />
      <Warnings warnings={[...data.warnings, ...(group?.warnings ?? [])]} />
    </details>
  </section>
}

function downloadEvaluation(input: RotationInput, result: RotationResult, climate?: ClimateSummary) {
  const planting = input.planting_answers
  const payload = {
    schema_version: 1,
    input: {
      ...input, soil_notes: null,
      plot_context: { ...input.plot_context, previous_history: null, pest_history: null },
      planting_answers: planting && { ...planting, other_crop: null },
    },
    result, climate: climate ?? null,
  }
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'agronexa-siembra-' + result.location_id + '.json'
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function RotationForm({ locations, crops }: { locations: Location[]; crops: Crop[] }) {
  const requested = new URLSearchParams(window.location.search)
  const [location, setLocation] = useState(() => locations.find(item => item.id === requested.get('location_id'))
    ?? locations.find(item => item.id === 'puno-ilave') ?? locations[0])
  const [period, setPeriod] = useState(() => requested.has('start') && requested.has('end')
    ? initialPeriod() : lastConsultedPeriod() ?? examplePeriod)
  const [step, setStep] = useState(0)
  const [error, setError] = useState('')
  const [previous, setPrevious] = useState<CropId>('unknown')
  const [candidate, setCandidate] = useState<CropId | null>(null)
  const [lastHarvest, setLastHarvest] = useState(blankDate)
  const [sowing, setSowing] = useState(blankDate)
  const [harvest, setHarvest] = useState(blankDate)
  const [texture, setTexture] = useState<Exclude<SoilTexture, 'other'>>('unknown')
  const [ph, setPh] = useState('')
  const [plot, setPlot] = useState(initialPlotContext)
  const [notes, setNotes] = useState('')
  const [priorities, setPriorities] = useState<Priority[]>([])
  const [answers, setAnswers] = useState<PlantingAnswers>({
    experience: 'unknown', campaigns: null, repeated: 'unknown', consecutive: null, other_crop: null,
    last_harvest: null, last_harvest_approximate: false, ponding: 'unknown', water: 'unknown',
    soil_test: 'unknown', ph_date: null, ph_method: null,
  })
  const [submitted, setSubmitted] = useState<RotationInput | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const details = useRef<HTMLDetailsElement>(null)
  const evaluation = useRequest<RotationResult>()
  const weather = useRequest<ClimateSummary>()
  const regions = [...new Set(locations.map(item => item.region))]
  const candidateIds = candidate === 'undecided' ? crops.map(crop => crop.id) : candidate ? [candidate] : []
  const inScope = location.id === 'puno-ilave' && previous === 'potato' && candidateIds.includes('quinoa')
  const cropName = (id: string) => crops.find(crop => crop.id === id)?.name_es ?? id
  const previousName = previous === 'other' ? answers.other_crop || 'Otro cultivo' : previous === 'fallow'
    ? 'Terreno en descanso' : previous === 'unknown' ? 'No recuerdo' : cropName(previous)
  useEffect(() => heading.current?.focus(), [step])

  function answer(update: Partial<PlantingAnswers>) {
    setAnswers(current => ({ ...current, ...update }))
  }

  function go(target: number) {
    setError('')
    setStep(target)
  }

  function issueAt(index: number) {
    if (index === 0) {
      if (answers.campaigns !== null && (!Number.isInteger(answers.campaigns) || answers.campaigns < 0 || answers.campaigns > 200)) return 'Escribe un número entero de campañas entre 0 y 200.'
      return periodError(period)
    }
    if (index === 1) {
      if (dateValue(lastHarvest) && dateValue(lastHarvest)! > peruToday()) return 'La última cosecha debe ser de hoy o anterior.'
      if ((answers.experience === 'first' || answers.campaigns === 0)
        && ((answers.campaigns ?? 0) > 0 || !['unknown', 'fallow'].includes(previous) || dateValue(lastHarvest) || answers.repeated === 'yes')) {
        return 'Revisa las campañas y el cultivo anterior si es la primera vez que siembras aquí.'
      }
      if (answers.repeated === 'yes' && answers.consecutive !== null
        && (!Number.isInteger(answers.consecutive) || answers.consecutive < 2 || answers.consecutive > (answers.campaigns ?? 200))) {
        return 'Indica al menos 2 campañas seguidas y revisa que el número no supere el total.'
      }
    }
    if (index === 2) {
      if (!candidate) return 'Elige un cultivo o marca «Todavía no lo decido».'
      const first = dateBound(sowing, false)
      const last = dateBound(harvest, true)
      const latestSowing = dateBound(sowing, true)
      const earliestPrevious = dateBound(lastHarvest, false)
      if (first && last && last < first) return scheduleError
      if (latestSowing && earliestPrevious && latestSowing < earliestPrevious) return 'La próxima siembra debe ocurrir después de la última cosecha.'
    }
    if (index === 3) {
      if (answers.soil_test === 'yes' && ph !== '' && (Number(ph) < 0 || Number(ph) > 14 || !Number.isFinite(Number(ph)))) return 'El pH anotado debe estar entre 0 y 14.'
      if (answers.soil_test === 'yes' && answers.ph_date && answers.ph_date > peruToday()) return 'La medición debe ser de hoy o anterior.'
      for (const { key, label, max } of plotMeasurements) {
        const value = plot[key]
        if (value !== null && (!Number.isFinite(value) || value < 0 || value > max)) return 'Revisa el valor de «' + label + '».'
      }
      if (answers.water === 'rain' && ['canal', 'pozo', 'mixto'].includes(plot.water_source)) return 'Revisa la fuente de agua. Marcaste que usas lluvia y seleccionaste una fuente de riego.'
    }
    return ''
  }

  function queryWeather(payload: RotationInput) {
    weather.load(async signal => {
      const data = await summarizePeriod(payload.location_id, payload, signal)
      if (!signal.aborted) rememberConsultedPeriod(data.period)
      return data
    })
  }

  function run(payload: RotationInput) {
    evaluation.load(signal => evaluateRotation(payload, signal))
    queryWeather(payload)
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    for (let index = 0; index <= Math.min(step, 3); index++) {
      const issue = issueAt(index)
      if (issue) {
        setStep(index)
        setError(issue)
        if (issue === scheduleError) document.getElementById('next-harvest')?.focus()
        if (index === 3 && details.current) details.current.open = true
        return
      }
    }
    if (step < 4) { go(step + 1); return }
    const irrigated = answers.water === 'irrigation' || answers.water === 'both'
    const payload: RotationInput = {
      ...period, location_id: location.id, previous_crop: previous, candidate_crops: candidateIds,
      soil_texture: texture, soil_ph: answers.soil_test === 'yes' && ph !== '' ? Number(ph) : null,
      irrigation: irrigated ? 'available' : answers.water === 'rain' ? 'none' : 'unknown',
      soil_notes: notes.trim() || null, priorities,
      planting_answers: {
        ...answers, last_harvest: dateValue(lastHarvest), last_harvest_approximate: lastHarvest.kind === 'month',
        other_crop: previous === 'other' ? answers.other_crop?.trim() || null : null,
        consecutive: answers.repeated === 'yes' ? answers.consecutive : null,
        ph_date: answers.soil_test === 'yes' ? answers.ph_date : null,
        ph_method: answers.soil_test === 'yes' ? answers.ph_method?.trim() || null : null,
      },
      plot_context: {
        ...plot, campaign: plot.campaign?.trim() || null,
        water_source: plot.water_source !== 'unknown' ? plot.water_source
          : answers.water === 'rain' ? 'lluvia' : answers.water === 'both' ? 'mixto' : 'unknown',
        planned_sowing_date: dateValue(sowing),
        planned_harvest_date: dateValue(harvest), sowing_approximate: sowing.kind === 'month', harvest_approximate: harvest.kind === 'month',
      },
    }
    saveFilters(period, [['location_id', location.id]])
    setSubmitted(payload)
    go(5)
    run(payload)
  }

  function reviewRow(label: string, value: ReactNode, target: number) {
    return <div><dt>{label}</dt><dd>{value} <button type="button" className="text-button"
      aria-label={'Editar ' + label.toLowerCase()} onClick={() => go(target)}>Editar</button></dd></div>
  }

  const generalResult = evaluation.result.status === 'ready' ? evaluation.result.data : null
  const climateResult = weather.result.status === 'ready' ? weather.result.data : undefined

  if (step === 5 && submitted) return <div className="result-stack planting-results">
    <header className="panel query-card">
      <h2 ref={heading} tabIndex={-1}>Lo que encontramos sobre tu próxima siembra</h2>
      <p>{location.name} · Cultivo anterior: {previousName}.</p>
      <button type="button" className="button secondary" onClick={() => go(4)}>Editar mis respuestas</button>
    </header>
    {evaluation.result.status === 'loading' && <LoadingSkeleton label="Revisando las referencias agrícolas…" />}
    {evaluation.result.status === 'error' && <div role="alert" className="notice error">
      <p>{evaluation.result.message}</p><button type="button" className="text-button" onClick={() => run(submitted)}>Reintentar análisis</button>
    </div>}
    {generalResult && <RegionalResults data={generalResult} crops={crops} />}
    {Boolean(generalResult?.plot_notes?.length) &&
      <section className="panel query-card planting-details">
        <h3>Aspectos de tu terreno que puedes revisar</h3>
        <ul>{generalResult?.plot_notes?.map(note =>
          <li key={note.message}><strong>{noteStates[note.state][0]}.</strong> {note.message}</li>)}</ul>
      </section>}
    {climateResult && <WeatherSummary data={climateResult} />}
    {weather.result.status === 'loading' && <p className="notice" role="status">Consultando clima histórico…</p>}
    {weather.result.status === 'error' && <div role="status" className="notice">
      <p>No se pudo cargar el resumen histórico. {weather.result.message}</p>
      <button type="button" className="text-button" onClick={() => queryWeather(submitted)}>Reintentar clima</button>
    </div>}
    {inScope && <IniaReferences form={submitted} />}
    {generalResult && <details className="panel query-card planting-details">
      <summary>Ver detalle del motor de evaluación</summary>
      <RotationResults data={generalResult} crops={crops} />
      <button type="button" className="button secondary" onClick={() => downloadEvaluation(submitted, generalResult, climateResult)}>
        Descargar evaluación (JSON)
      </button>
    </details>}
    <PlotContextSummary context={submitted.plot_context} />
  </div>

  return <>
    <form className="panel query-card planting-form" onSubmit={submit} noValidate>
      <div className="planting-progress">
        <label htmlFor="planting-progress">Paso {step + 1} de {steps.length}</label>
        <progress id="planting-progress" value={step + 1} max={steps.length} />
      </div>
      <h2 ref={heading} tabIndex={-1}>{steps[step]}</h2>
      {step === 0 && <>
        <fieldset className="choice-set">
          <legend>¿Dónde está tu terreno?</legend>
          <div className="rotation-fields">
            <ChoiceField id="department" label="Departamento" value={location.region}
              options={Object.fromEntries(regions.map(region => [region, region]))}
              onChange={region => { const selected = locations.find(item => item.region === region); if (selected) setLocation(selected) }} />
            <ChoiceField id="planting-location" label="Localidad" value={location.id}
              options={Object.fromEntries(locations.filter(item => item.region === location.region).map(item => [item.id, item.name]))}
              onChange={id => { const selected = locations.find(item => item.id === id); if (selected) setLocation(selected) }} />
          </div>
        </fieldset>
        <ChoiceField id="experience" label="¿Desde hace cuánto tiempo siembras en este terreno?" value={answers.experience}
          options={experienceNames} onChange={experience => answer({ experience })} />
        <div className="field"><label htmlFor="campaigns">¿Cuántas veces has sembrado en este terreno durante los últimos años?</label>
          <input id="campaigns" type="number" min="0" max="200" step="1" value={answers.campaigns ?? ''}
            onChange={event => answer({ campaigns: event.target.value === '' ? null : Number(event.target.value) })} />
          <small>Cuenta las campañas de siembra. Déjalo en blanco si no recuerdas.</small>
        </div>
        <details className="rotation-criterion"><summary>Periodo del clima histórico</summary>
          <p>{formatPeriod(period)}. Puedes cambiarlo para revisar otro periodo pasado.</p>
          <div className="rotation-fields"><PeriodFields period={period} onChange={setPeriod} invalid={Boolean(error && periodError(period))} errorId="planting-error" /></div>
          <button type="button" className="text-button" onClick={() => setPeriod(examplePeriod)}>Usar año 2024</button>
        </details>
      </>}
      {step === 1 && <>
        <CropChoices crops={crops} extras={[{ id: 'other', name_es: 'Otro cultivo' }, { id: 'fallow', name_es: 'Dejé descansar el terreno' }, { id: 'unknown', name_es: 'No recuerdo' }]}
          name="previous" legend="¿Qué sembraste la última vez en este terreno?" value={previous} onChange={setPrevious} />
        {previous === 'other' && <div className="field"><label htmlFor="other-crop">Nombre del otro cultivo</label>
          <input id="other-crop" maxLength={80} value={answers.other_crop ?? ''} onChange={event => answer({ other_crop: event.target.value })} /></div>}
        <ChoiceField id="repeated" label="¿Has sembrado varias veces el mismo cultivo en este terreno?" value={answers.repeated}
          options={knownNames} onChange={repeated => answer({ repeated })} />
        {answers.repeated === 'yes' && <div className="field"><label htmlFor="consecutive">¿Cuántas campañas seguidas? (opcional)</label>
          <input id="consecutive" type="number" min="2" max="200" step="1" value={answers.consecutive ?? ''}
            onChange={event => answer({ consecutive: event.target.value === '' ? null : Number(event.target.value) })} /></div>}
        <DateField id="last-harvest" label="¿Cuándo fue tu última cosecha?" value={lastHarvest} onChange={setLastHarvest} max={peruToday()} />
      </>}
      {step === 2 && <>
        <CropChoices crops={crops} extras={[{ id: 'undecided', name_es: 'Todavía no lo decido' }]}
          name="candidate" legend="¿Qué te gustaría sembrar ahora?" value={candidate} onChange={setCandidate} />
        {candidate === 'undecided' && <p>Podrás explorar {crops.map(crop => crop.name_es.toLowerCase()).join(', ')} con la misma ficha.</p>}
        <div className="rotation-fields">
          <DateField id="next-sowing" label="¿Cuándo piensas sembrar?" value={sowing} onChange={setSowing} />
          <DateField id="next-harvest" label="¿Cuándo esperas cosechar?" value={harvest} onChange={setHarvest} invalid={error === scheduleError} />
        </div>
      </>}
      {step === 3 && <>
        <ChoiceField id="ponding" label="Cuando llueve bastante, ¿el agua se queda acumulada en tu terreno?" value={answers.ponding}
          options={pondingNames} onChange={ponding => answer({ ponding })} />
        <ChoiceField id="water" label="¿Cómo consigues el agua para tus cultivos?" value={answers.water}
          options={waterNames} onChange={water => answer({ water })} />
        <ChoiceField id="soil-texture" label="¿Conoces el tipo de tierra de tu parcela?" value={texture}
          options={{ sand: textureNames.sand, clay: textureNames.clay, loam: textureNames.loam, sandy_loam: textureNames.sandy_loam, unknown: textureNames.unknown }}
          onChange={setTexture} />
        <details className="rotation-criterion"><summary>Cómo se siente cada tipo de tierra</summary>
          <ul>{Object.entries(soilDescriptions).filter(([key]) => key !== 'unknown').map(([key, description]) =>
            <li key={key}><strong>{textureNames[key as keyof typeof soilDescriptions]}.</strong> {description}</li>)}</ul>
          <p>Estas pistas orientan. Un análisis permite confirmar el tipo de tierra.</p>
        </details>
        <ChoiceField id="soil-test" label="¿Alguna vez mandaste analizar la tierra de tu terreno?" value={answers.soil_test}
          options={knownNames} onChange={soil_test => answer({ soil_test })} />
        <details className="rotation-criterion" ref={details}><summary>Datos adicionales de mi terreno</summary>
          {answers.soil_test === 'yes' && <div className="rotation-fields">
              <div className="field"><label htmlFor="soil-ph">pH medido (opcional)</label>
                <input id="soil-ph" type="number" min="0" max="14" step="any" value={ph} onChange={event => setPh(event.target.value)} /></div>
              <div className="field"><label htmlFor="measurement-date">Fecha de medición del pH</label>
                <input id="measurement-date" type="date" max={peruToday()} value={answers.ph_date ?? ''} onChange={event => answer({ ph_date: event.target.value || null })} /></div>
              <div className="field"><label htmlFor="measurement-method">Método de medición del pH</label>
                <input id="measurement-method" maxLength={120} value={answers.ph_method ?? ''} onChange={event => answer({ ph_method: event.target.value })} /></div>
          </div>}
          <AdditionalPlotFields context={plot} onChange={update => setPlot(current => ({ ...current, ...update }))} />
          <fieldset className="choice-set"><legend>¿Qué te importa más? (opcional)</legend>
            <div className="choices">{(Object.entries(priorityNames) as [Priority, string][]).map(([id, label]) => <label className="choice" key={id}>
              <input type="checkbox" checked={priorities.includes(id)} onChange={event => setPriorities(event.target.checked ? [...priorities, id] : priorities.filter(value => value !== id))} />
              {label}
            </label>)}</div>
          </fieldset>
          <div className="field"><label htmlFor="soil-notes">Observaciones de tu terreno</label>
            <textarea id="soil-notes" value={notes} maxLength={500} onChange={event => setNotes(event.target.value)} />
            <small>Evita incluir nombres, direcciones u otros datos personales.</small></div>
        </details>
      </>}
      {step === 4 && <dl className="planting-review">
        {reviewRow('Lugar y campañas', location.name + ' · ' + location.region + ' · ' + experienceNames[answers.experience] + ' · ' + (answers.campaigns ?? 'Sin número de campañas'), 0)}
        {reviewRow('Cultivo anterior', previousName + ' · ' + dateLabel(lastHarvest) + ' · Repetición: ' + knownNames[answers.repeated] + (answers.repeated === 'yes' && answers.consecutive ? ' · ' + answers.consecutive + ' campañas seguidas' : ''), 1)}
        {reviewRow('Próxima siembra', (candidate === 'undecided' ? 'Por decidir' : cropName(candidate ?? '')) + ' · Siembra: ' + dateLabel(sowing) + ' · Cosecha: ' + dateLabel(harvest), 2)}
        {reviewRow('Agua y tierra', waterNames[answers.water] + ' · Agua acumulada: ' + pondingNames[answers.ponding] + ' · Tierra: ' + textureNames[texture] + ' · ' + (answers.soil_test === 'yes' && ph !== '' ? 'pH declarado: ' + ph : 'Análisis: dato no disponible'), 3)}
      </dl>}
      {error && <p id="planting-error" role="alert" className="notice error">{error}</p>}
      <div className="action-row rotation-actions planting-actions">
        {step > 0 && <button type="button" className="button secondary" onClick={() => go(step - 1)}>Anterior</button>}
        <button className="button primary" type="submit">{step === 4 ? 'Analizar mi próxima siembra' : 'Continuar'}</button>
      </div>
    </form>
    <CropLibrary crops={crops} />
  </>
}

export function Rotations({ locations }: { locations: Location[] }) {
  const { result, load } = useRequest<Crop[]>()
  useEffect(() => { load(getCrops) }, [load])
  return <>
    <PageHeading title="Asistente de planificación de siembra" description="Cuéntanos qué sembraste y qué te gustaría sembrar. Revisa el clima y las referencias agrícolas de tu zona." icon="rotate" />
    {result.status === 'error' && <div className="notice error"><p role="alert">{result.message}</p>
      <button className="button secondary" type="button" onClick={() => load(getCrops)}>Reintentar catálogo</button></div>}
    {(result.status === 'idle' || result.status === 'loading') && <LoadingSkeleton label="Cargando cultivos…" />}
    {result.status === 'ready' && (result.data.length ? <RotationForm locations={locations} crops={result.data} />
      : <p className="notice" role="status">El catálogo de cultivos está vacío.</p>)}
    <p className="rotation-demo-entry"><a href="/rotaciones?modo=demo">Probar simulación con reglas de ejemplo</a></p>
  </>
}
