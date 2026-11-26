import type { Location } from '../api/locations'
import { nasa } from '../app/AppShell'
import { Icon, type IconName } from '../app/ui'
import { formatPeriod, number } from '../features/climate/format'
import { lastConsultedPeriod } from '../features/climate/filters'

const descriptions: Record<string, string> = {
  'puno-ilave': 'Altiplano de Puno, provincia de El Collao.',
  'cusco-urubamba': 'Valle Sagrado de los Incas, Cusco.',
  'arequipa-chivay': 'Valle del Colca, provincia de Caylloma.',
}

const modules = [
  { href: '/explorar', title: 'Exploración climática', text: 'Series diarias, mapa e indicadores por localidad.', icon: 'compass' },
  { href: '/comparar', title: 'Comparación regional', text: 'Temperatura y precipitación sobre un periodo común.', icon: 'chart' },
  { href: '/rotaciones', title: 'Planificar mi siembra', text: 'Revisa qué se sabe sobre tu próximo cultivo.', icon: 'rotate' },
] satisfies { href: string; title: string; text: string; icon: IconName }[]

export function Home({ locations }: { locations: Location[] }) {
  const period = lastConsultedPeriod()
  const facts = [
    { label: 'Localidades disponibles', value: String(locations.length), icon: 'pin' },
    { label: 'Fuente climática', value: 'NASA POWER', icon: 'satellite' },
    { label: 'Último periodo consultado', value: period ? formatPeriod(period) : 'Sin consulta en esta sesión', icon: 'calendar' },
  ] satisfies { label: string; value: string; icon: IconName }[]
  return <>
    <section className="home-intro" aria-labelledby="welcome-title">
      <div className="hero-copy">
        <h1 id="welcome-title">Conoce tu clima. <em>Planifica tu siembra.</em></h1>
        <p>Consulta el clima de Ilave, Urubamba y Chivay. Explora qué se sabe sobre sembrar papa, quinua, cebada o haba después de tu última cosecha.</p>
        <div className="action-row">
          <a href="/rotaciones" className="button primary">Planificar mi siembra <Icon name="arrow" size={17} /></a>
          <a href="/explorar" className="button secondary">Explorar datos climáticos</a>
        </div>
      </div>
      <figure className="hero-image">
        <img src="/assets/paisaje-andino.webp" alt="" fetchPriority="high" />
        <figcaption>Paisaje andino ilustrativo</figcaption>
      </figure>
    </section>
    <dl className="home-facts" aria-label="Datos disponibles en AgroNexa">
      {facts.map(fact => <div className="panel home-fact" key={fact.label}>
        <span className="tile-icon"><Icon name={fact.icon} size={18} /></span>
        <div><dt>{fact.label}</dt><dd>{fact.value}</dd></div>
      </div>)}
    </dl>
    <section className="home-zones" aria-labelledby="zones">
      <div className="section-heading"><h2 id="zones">Zonas de estudio</h2><a href="/comparar">Comparar localidades <Icon name="arrow" size={16} /></a></div>
      <div className="location-grid">
        {locations.map(place => {
          const [label, url] = place.coordinate_source.split(' https://', 2)
          return <article className="panel zone" key={place.id}>
            <div className="zone-heading"><span className="tile-icon"><Icon name="pin" size={19} /></span><p className="region-name">{place.region}</p></div>
            <h3>{place.name}</h3>
            {descriptions[place.id] && <p className="zone-description">{descriptions[place.id]}</p>}
            {!place.verified && <p className="badge badge-warn">Coordenada preliminar</p>}
            <details><summary>Ver coordenadas y fuente</summary>
              <p className="zone-coordinates">{number(place.latitude)}°, {number(place.longitude)}°</p>
              <p>{url ? <a href={'https://' + url}>{label}</a> : label}</p>
            </details>
            <a className="zone-link" href={'/explorar?' + new URLSearchParams({ location_id: place.id })}>Explorar {place.name} <Icon name="arrow" size={16} /></a>
          </article>
        })}
      </div>
    </section>
    <section className="home-modules" aria-labelledby="modules">
      <div className="section-heading"><h2 id="modules">Módulos de análisis</h2></div>
      <div className="location-grid">
        {modules.map(item => <a className="panel module-link" key={item.href} href={item.href}>
          <span className="tile-icon"><Icon name={item.icon} size={19} /></span>
          <div><h3>{item.title}</h3><p>{item.text}</p></div><Icon name="arrow" size={17} />
        </a>)}
      </div>
    </section>
    <section className="panel home-method" aria-labelledby="method">
      <span className="tile-icon"><Icon name="book" /></span>
      <div><h2 id="method">Fuentes y metodología</h2><p>Consulta la procedencia, la cobertura y los límites de las series históricas de <a href={nasa}>NASA POWER</a>.</p></div>
      <a href="/metodologia" className="button secondary">Ver metodología <Icon name="arrow" size={16} /></a>
    </section>
  </>
}
