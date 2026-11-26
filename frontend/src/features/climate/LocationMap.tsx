import { divIcon, type FitBoundsOptions, type LatLngTuple, type Map as LeafletMap } from 'leaflet'
import { useEffect, useRef, useState } from 'react'
import { AttributionControl, MapContainer, Marker, Popup, TileLayer, Tooltip, useMap, ZoomControl } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { Location } from '../../api/locations'
import { number } from './format'

const marker = (selected: boolean) => divIcon({
  className: selected ? 'map-pin map-pin-selected' : 'map-pin',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
})
const pin = marker(false)
const selectedPin = marker(true)
const overview: FitBoundsOptions = { padding: [35, 35], maxZoom: 9 }
const arcgis = 'https://server.arcgisonline.com/ArcGIS/rest/services'
const imagery = arcgis + '/World_Imagery/MapServer'
const boundaries = arcgis + '/Reference/World_Boundaries_and_Places/MapServer'
const topographic = arcgis + '/World_Topo_Map/MapServer'
const tile = '/tile/{z}/{y}/{x}'
const osmCredit = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
const imageryCredit = `<a href="${imagery}">Esri World Imagery</a>, Vantor, Earthstar Geographics y GIS User Community`
const boundariesCredit = `<a href="${boundaries}">Esri World Boundaries and Places</a>, HERE, Garmin, ${osmCredit} y GIS User Community`
const topographicCredit = `<a href="${topographic}">Esri World Topo Map</a>, HERE, Garmin, Intermap, increment P Corp., GEBCO, USGS, FAO, NPS, NRCAN, GeoBase, IGN, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), ${osmCredit} y GIS User Community`
const layers = {
  osm: { name: 'Mapa base', tiles: [{ url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', credit: osmCredit }] },
  imagery: { name: 'Satelital ESRI', tiles: [{ url: imagery + tile, credit: imageryCredit }] },
  hybrid: { name: 'Híbrido ESRI', tiles: [
    { url: imagery + tile, credit: imageryCredit },
    { url: boundaries + tile, credit: boundariesCredit },
  ] },
  topographic: { name: 'Topográfico ESRI', tiles: [{ url: topographic + tile, credit: topographicCredit }] },
}

function MapResize() {
  const map = useMap()
  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => map.invalidateSize({ pan: false, debounceMoveend: true }))
    observer.observe(map.getContainer())
    return () => observer.disconnect()
  }, [map])
  return null
}

export function LocationMap({ locations, selected, onSelect }: {
  locations: Location[]
  selected: Location | undefined
  onSelect: (id: string) => void
}) {
  const [tilesFailed, setTilesFailed] = useState(false)
  const [layer, setLayer] = useState<keyof typeof layers>('osm')
  const map = useRef<LeafletMap>(null)
  const bounds = locations.map(({ latitude, longitude }): LatLngTuple => [latitude, longitude])
  return (
    <section className="panel map-panel" aria-labelledby="map-heading">
      <header className="card-heading map-heading">
        <div>
          <h2 id="map-heading">Mapa de localidades</h2>
          <p>Sur del Perú{selected && <> · <strong>{selected.name} seleccionada</strong></>}</p>
        </div>
        <div className="field map-layer-field">
          <label htmlFor="map-layer">Capa del mapa</label>
          <select id="map-layer" value={layer} onChange={event => {
            setLayer(event.target.value as keyof typeof layers)
            setTilesFailed(false)
          }}>
            {Object.entries(layers).map(([id, item]) => <option key={id} value={id}>{item.name}</option>)}
          </select>
        </div>
      </header>
      <div className="map-frame" role="region" aria-label="Mapa interactivo del sur del Perú">
        <MapContainer ref={map} bounds={bounds} boundsOptions={overview} maxZoom={18} minZoom={4}
          scrollWheelZoom zoomControl={false} attributionControl={false} className="map-canvas">
          <MapResize />
          <AttributionControl prefix={false} />
          {layers[layer].tiles.map(({ url, credit }) => <TileLayer key={url} url={url} attribution={credit}
            eventHandlers={{ tileerror: () => setTilesFailed(true) }} />)}
          <ZoomControl position="topright" zoomInTitle="Acercar mapa" zoomOutTitle="Alejar mapa" />
          {locations.map((location) => (
            <Marker key={location.id} position={[location.latitude, location.longitude]}
              title={location.name + ', ' + location.region} alt={location.name + ', ' + location.region}
              icon={selected?.id === location.id ? selectedPin : pin}
              eventHandlers={{ click: () => onSelect(location.id) }}>
              <Tooltip direction="top" offset={[0, -12]}>{location.name}</Tooltip>
              <Popup autoPan={false} offset={[0, -10]}><strong>{location.name}, {location.region}</strong><br />
                {number(location.latitude)}°, {number(location.longitude)}°</Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
      {tilesFailed && <p role="status" className="map-notice">El mapa base no pudo cargar por completo. Los marcadores y el selector siguen disponibles.</p>}
      <div className="map-locations" aria-label="Seleccionar localidad del mapa">
        {locations.map((location) => (
          <button key={location.id} type="button" className="map-location"
            aria-pressed={selected?.id === location.id} onClick={() => onSelect(location.id)}>
            <strong>{location.name}</strong>
            <span>{number(location.latitude)}°, {number(location.longitude)}°</span>
            {!location.verified && <span>Coordenada preliminar</span>}
          </button>
        ))}
      </div>
      <div className="action-row map-view-actions">
        {selected && <button type="button" className="text-button" onClick={() => {
          const instance = map.current
          instance?.setView([selected.latitude, selected.longitude], Math.max(instance.getZoom(), 9), { animate: false })
        }}>Acercar a {selected.name}</button>}
        <button type="button" className="text-button" onClick={() => map.current?.fitBounds(bounds, { ...overview, animate: false })}>
          Ver todas las localidades
        </button>
      </div>
    </section>
  )
}
