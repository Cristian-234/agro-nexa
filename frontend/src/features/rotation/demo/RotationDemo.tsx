import { useState } from 'react'
import type { Crop, RotationResult, SoilTexture } from '../../../api/rotation'
import { PageHeading } from '../../../app/ui'
import { number } from '../../climate/format'
import { RotationResults } from '../RotationResults'
import { textureNames } from '../labels'
import fixtures from './rotation-test-fixtures.json'

type Scenario = {
  scenario: 'comparison' | 'restriction'
  soil_ph: number
  soil_texture: SoilTexture
  result: RotationResult
}

const scenarios = fixtures as Scenario[]
const crops: Crop[] = [
  { id: 'quinoa', name_es: 'Quinua después de papa', description: '', source_url: null },
  { id: 'potato', name_es: 'Papa después de papa', description: '', source_url: null },
]

const scenarioLabels = {
  comparison: 'Comparar dos alternativas',
  restriction: 'Ver una restricción crítica',
}

export function RotationDemo() {
  const [selected, setSelected] = useState(scenarios[0])
  const [result, setResult] = useState<RotationResult | null>(null)
  return <>
    <PageHeading title="Simulación de rotaciones" description="Probar el motor con dos fichas ficticias situadas en Ilave." icon="rotate" />
    <section className="panel query-card rotation-form" aria-labelledby="scenario-heading">
      <div className="query-heading"><h2 id="scenario-heading">Selecciona una ficha de ejemplo</h2>
        <a href="/rotaciones">Volver a la ficha agrícola</a></div>
      <p className="notice"><strong>Simulación TEST.</strong> Los valores, umbrales y pesos son ficticios. Usa estos resultados únicamente para entender el funcionamiento del motor.</p>
      <fieldset className="choice-set">
        <legend>Escenario</legend>
        <div className="choices rotation-choices">
          {scenarios.map(scenario => <label key={scenario.scenario} className="choice">
            <input type="radio" name="scenario" checked={selected === scenario} onChange={() => {
              setSelected(scenario)
              setResult(null)
            }} />
            <span><strong>{scenarioLabels[scenario.scenario]}</strong>
              <small>pH {number(scenario.soil_ph)} · Textura {textureNames[scenario.soil_texture].toLowerCase()}</small></span>
          </label>)}
        </div>
      </fieldset>
      <p className="rotation-help">Cultivo anterior: papa. En cada alternativa puedes abrir los criterios para ver la condición, el dato evaluado y el peso.</p>
      <button className="button primary" type="button" onClick={() => setResult(selected.result)}>Simular evaluación</button>
    </section>
    {result && <RotationResults data={result} crops={crops} simulation />}
  </>
}
