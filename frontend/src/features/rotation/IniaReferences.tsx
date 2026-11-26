import { useState, type FormEvent } from 'react'
import { evaluatePreliminary, type Moisture, type PreliminaryResult } from '../../api/preliminary'
import type { RotationInput } from '../../api/rotation'
import { useRequest } from '../../hooks/useRequest'
import { CampaignClimate } from './CampaignClimate'
import { initialPreliminaryFields, PreliminaryFields, PreliminaryResults } from './Preliminary'

export function IniaReferences({ form }: { form: RotationInput }) {
  const answers = form.planting_answers
  const [fields, setFields] = useState(() => ({
    ...initialPreliminaryFields,
    phDate: answers?.ph_date ?? '',
    phMethod: answers?.ph_method ?? '',
    lotHistory: [{
      crop: form.previous_crop,
      harvest_date: answers?.last_harvest_approximate ? null : answers?.last_harvest ?? null,
    }],
    sowingDate: form.plot_context.sowing_approximate ? '' : form.plot_context.planned_sowing_date ?? '',
  }))
  const [error, setError] = useState('')
  const preliminary = useRequest<PreliminaryResult>()

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    let moisture: Moisture = { kind: 'unknown' }
    const method = fields.moistureMethod.trim() || undefined
    const date = fields.moistureDate || null
    if (fields.moistureKind === 'observed') {
      moisture = { kind: 'observed', date, condition: fields.moistureCondition || null, method }
    }
    if (fields.moistureKind === 'measured') {
      const value = fields.moistureValue === '' ? null : Number(fields.moistureValue)
      if (value !== null && (!Number.isFinite(value) || value < 0 || value > 100)) {
        setError('Revisa el contenido volumétrico. Debe estar entre 0 y 100 % v/v.')
        return
      }
      moisture = { kind: 'measured', date, value, unit: '% v/v', method }
    }
    const size = fields.lotHistory.reduce((count, item, index) =>
      item.crop !== 'unknown' || item.harvest_date ? index + 1 : count, 0)
    const lotHistory = fields.lotHistory.slice(0, size)
    const dates = lotHistory.flatMap(item => item.harvest_date ? [item.harvest_date] : [])
    if (dates.some((day, index) => index > 0 && day >= dates[index - 1])) {
      setError('Ordena las cosechas de la más reciente a la más antigua.')
      return
    }
    if (fields.sowingDate && dates[0] && fields.sowingDate < dates[0]) {
      setError('La siembra prevista debe ocurrir después de la última cosecha registrada.')
      return
    }
    preliminary.load(signal => evaluatePreliminary({
      location_id: 'puno-ilave', previous_crop: 'potato', candidate_crop: 'quinoa',
      cultivar: fields.cultivar, lot_history: lotHistory,
      soil_ph: form.soil_ph, soil_ph_date: fields.phDate || null, soil_ph_method: fields.phMethod.trim() || null,
      soil_texture: form.soil_texture, soil_texture_method: fields.textureMethod.trim() || null,
      drainage: fields.drainage, flooding_history: fields.flooding, irrigation: form.irrigation,
      establishment_moisture: moisture,
      plot_context: {
        planned_sowing_date: fields.sowingDate || null, agrochemical_history: fields.chemicals.trim() || null,
        elevation_m: fields.elevation === '' ? null : Number(fields.elevation), position: fields.position,
      },
    }, signal))
  }

  return <details className="panel query-card rotation-references">
    <summary>Consultar referencias del INIA</summary>
    <form className="rotation-form" noValidate onSubmit={submit}>
      <p className="rotation-help">Contraste documental para papa → quinua en Ilave. Las mediciones y observaciones tienen distinto alcance.</p>
      <PreliminaryFields data={fields} onChange={update => {
        setFields(current => ({ ...current, ...update }))
        setError('')
        preliminary.reset()
      }} />
      {error && <p className="notice error" role="alert">{error}</p>}
      <button className="button secondary" type="submit" disabled={preliminary.result.status === 'loading'}>Contrastar con las referencias</button>
    </form>
    {preliminary.result.status === 'loading' && <p className="notice" role="status">Consultando referencias de Illpa INIA…</p>}
    {preliminary.result.status === 'error' && <p className="notice error" role="alert">{preliminary.result.message}</p>}
    {preliminary.result.status === 'ready' && <PreliminaryResults data={preliminary.result.data} />}
    <CampaignClimate />
  </details>
}
