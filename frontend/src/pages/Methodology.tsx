import { nasa } from '../app/AppShell'
import { Icon, PageHeading, type IconName } from '../app/ui'

const pipeline = [
  { title: 'Adquisición', text: 'Series diarias de NASA POWER para una celda meteorológica.', icon: 'satellite' },
  { title: 'Normalización', text: 'Calendario continuo y control de valores faltantes.', icon: 'layers' },
  { title: 'Indicadores', text: 'Agregados históricos y cobertura por variable.', icon: 'chart' },
  { title: 'Consulta', text: 'Mapas, gráficos, tablas y exportación CSV.', icon: 'compass' },
] satisfies { title: string; text: string; icon: IconName }[]

export function Methodology() {
  return <>
    <PageHeading title="Metodología" description="De dónde vienen los datos, cómo se procesan y qué alcance tienen los resultados." icon="book" />
    <section className="panel method-intro" aria-labelledby="method-source">
      <span className="tile-icon"><Icon name="satellite" /></span>
      <div><h2 id="method-source">Fuente y resolución</h2>
        <p>NASA POWER Daily Point proporciona temperatura del aire a 2 m y precipitación corregida. El dato representa una celda meteorológica alrededor del punto consultado.</p>
        <a href={nasa}>Documentación de NASA POWER Daily API <Icon name="external" size={15} /></a>
      </div>
      <dl><div><dt>Malla nominal MERRA-2</dt><dd>0,5° × 0,625°</dd></div><div><dt>Estándar temporal</dt><dd>Tiempo solar local (LST)</dd></div></dl>
    </section>
    <section className="method-section" aria-labelledby="flow">
      <div className="section-heading"><h2 id="flow">Flujo de procesamiento</h2></div>
      <ol className="pipeline">
        {pipeline.map(item => <li className="panel" key={item.title}>
          <span className="tile-icon"><Icon name={item.icon} size={19} /></span><h3>{item.title}</h3><p>{item.text}</p>
        </li>)}
      </ol>
    </section>
    <div className="method-grid">
      <section className="panel table-card" aria-labelledby="variables">
        <header className="card-heading"><h2 id="variables">Variables climáticas</h2></header>
        <div className="table-scroll" tabIndex={0} role="region" aria-label="Unidades de las variables climáticas">
          <table className="variable-table">
            <thead><tr><th scope="col">Variable</th><th scope="col">Código</th><th scope="col">Unidad</th></tr></thead>
            <tbody>
              <tr><th scope="row">Temperatura media</th><td>T2M</td><td>°C</td></tr>
              <tr><th scope="row">Temperatura mínima</th><td>T2M_MIN</td><td>°C</td></tr>
              <tr><th scope="row">Temperatura máxima</th><td>T2M_MAX</td><td>°C</td></tr>
              <tr><th scope="row">Precipitación corregida</th><td>PRECTOTCORR</td><td>mm/día</td></tr>
            </tbody>
          </table>
        </div>
      </section>
      <section className="panel method-card">
        <h2>Indicadores y cobertura</h2>
        <p>La cobertura divide los días con valor válido entre los días calendario solicitados. Los faltantes quedan vacíos en el CSV y generan huecos en los gráficos.</p>
        <p>La lluvia con días faltantes se etiqueta como acumulado observado parcial. Los días con mínima de 0 °C o menos indican helada meteorológica potencial a escala de celda.</p>
        <p>Los resultados identifican el periodo, la resolución declarada, la fecha de descarga y la antigüedad de la caché.</p>
      </section>
    </div>
    <section className="method-section method-stack" aria-label="Alcance del análisis">
      <details className="panel method-disclosure" open>
        <summary><h2>Comparación y limitaciones</h2></summary>
        <div><p>Las diferencias de medias y los conteos usan fechas válidas comunes. Los extremos se calculan con las observaciones disponibles por localidad. Las diferencias de lluvia acumulada requieren cobertura completa.</p>
          <p>Las series son históricas y describen condiciones a escala regional. Los datos recientes dependen de la publicación del proveedor. La cartografía muestra puntos públicos y conserva el selector cuando fallan las teselas.</p>
          <a href="https://www.openstreetmap.org/copyright">Atribución y licencia de OpenStreetMap</a></div>
      </details>
      <details className="panel method-disclosure" open>
        <summary><h2>Evaluación de rotaciones</h2></summary>
        <div><p>El motor aplica reglas aprobadas según la localidad y la secuencia. Si faltan reglas aprobadas o evidencia crítica, muestra evidencia insuficiente. Las restricciones críticas se identifican por separado.</p>
          <p>La comparación opcional para papa → quinua en Ilave muestra referencias documentales de Illpa INIA. Los rangos de precipitación y temperatura requieren precisar la ventana temporal y el estadístico antes de compararlos con NASA POWER. Las decisiones de parcela requieren validación agronómica local.</p>
          <a href="/rotaciones">Abrir ficha agrícola</a></div>
      </details>
    </section>
    <section className="panel method-card method-references" aria-labelledby="scientific-references">
      <h2 id="scientific-references">Referencias científicas</h2>
      <ul>
        <li><a href={nasa}>NASA POWER Daily API</a></li>
        <li><a href="https://repositorio.inia.gob.pe/handle/20.500.12955/79">INIA · Ficha de quinua Illpa INIA</a></li>
        <li><a href="https://repositorio.inia.gob.pe/handle/20.500.12955/1146">INIA · Manual técnico de manejo integrado de papa</a></li>
        <li><a href="https://repositorio.inia.gob.pe/handle/20.500.12955/926">INIA · Manejo integrado del cultivo de quinua en el Cusco</a></li>
      </ul>
    </section>
  </>
}
