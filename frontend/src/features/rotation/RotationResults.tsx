import type { Criterion, Crop, RotationResult } from '../../api/rotation'
import { formatDay, formatInstant, formatPeriod, number } from '../climate/format'
import { Provenance, Warnings } from '../climate/ResultDetails'
import { displayEvidence } from './labels'

const states = {
  insufficient_evidence: 'Evidencia insuficiente',
  restriction_detected: 'Restricción detectada',
  exploratory_comparison: 'Evaluación exploratoria',
}
const criterionStates = {
  pass: 'Cumple', fail: 'Incumple', unknown: 'Desconocido', not_applicable: 'No aplica',
}
const operators = { eq: '=', gte: '≥', lte: '≤', between: 'entre' }

function CriterionDetail({ item }: { item: Criterion }) {
  const threshold = item.predicate.threshold
  const target = Array.isArray(threshold) ? threshold.map(displayEvidence).join(' y ') : displayEvidence(threshold)
  const unit = item.unit === 'degC' ? ' °C' : item.unit ? ' ' + item.unit : ''
  return (
    <details className="rotation-criterion">
      <summary>{item.criterion} <span>{criterionStates[item.state]}{item.critical && ' · Crítico'}</span></summary>
      <div className="criterion-body">
        <p>{item.explanation}</p>
        <dl>
          <div><dt>Condición</dt><dd>{operators[item.predicate.operator]} {target}{unit}</dd></div>
          <div><dt>Evidencia</dt><dd>{displayEvidence(item.value)}{item.value === null ? '' : unit}
            {item.evidence_origin && ' · ' + item.evidence_origin}</dd></div>
          {item.evidence_coverage !== null && <div><dt>Cobertura climática</dt><dd>{number(item.evidence_coverage * 100)} %</dd></div>}
          <div><dt>Periodo</dt><dd>{item.predicate.temporal_scope === 'reference_period' ? 'Periodo de referencia' : 'Ficha registrada'}</dd></div>
          <div><dt>Peso</dt><dd>{number(item.weight)}</dd></div>
        </dl>
        <p>{item.geographic_context} · Revisión del {formatDay(item.reviewed_on)}</p>
        <p>{item.limitation}</p>
        <a href={item.source.url}>{item.source.title} · {item.source.section}</a>
      </div>
    </details>
  )
}

export function RotationResults({ data, crops }: { data: RotationResult; crops: Crop[] }) {
  const ranks = data.alternatives.map(item => item.rank)
  return (
    <section className="result-stack" aria-labelledby="rotation-results">
      <header className="result-heading">
        <div><h2 id="rotation-results">Evaluación con reglas aprobadas</h2>
          <p>{formatPeriod(data.period)} · Evaluación del {formatInstant(data.evaluated_at)} (Perú)</p></div>
      </header>
      <div className="panel source-panel">
        {data.rule_set_version
          ? <p>Versión del catálogo {data.rule_set_version}</p>
          : <p>El catálogo todavía carece de una versión aprobada. Por eso esta evaluación muestra «Evidencia insuficiente» aunque completes la ficha.</p>}
        {data.climate_source && <Provenance source={data.climate_source} period={data.period} />}
        <Warnings warnings={data.warnings} />
      </div>
      <div className="rotation-results-grid">
        {data.alternatives.map(item => (
          <article className="panel method-card" key={item.crop_id}>
            <h3>{crops.find(crop => crop.id === item.crop_id)?.name_es ?? item.crop_id}</h3>
            <span className={'badge ' + (item.state === 'exploratory_comparison' ? 'badge-good' : 'badge-warn')}>{states[item.state]}</span>
            {data.rule_set_version && <p>Cobertura de evidencia {number(item.evidence_coverage * 100)} %</p>}
            {item.score !== null && <p><strong>{number(item.score)} de 100</strong> · Puntuación exploratoria
              {item.rank !== null && (' · Posición ' + item.rank +
                (ranks.filter(rank => rank === item.rank).length > 1 ? ' (empate)' : ''))}</p>}
            <Warnings warnings={item.warnings} />
            {item.criteria.map(criterion => <CriterionDetail key={criterion.rule_id} item={criterion} />)}
          </article>
        ))}
      </div>
      <p><a href="/metodologia">Consultar cómo se evalúan las alternativas</a></p>
    </section>
  )
}
