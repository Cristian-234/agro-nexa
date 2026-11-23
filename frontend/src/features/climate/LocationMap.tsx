import { divIcon, type LatLngTuple } from 'leaflet'
import { useEffect, useState } from 'react'
import { MapContainer, Marker, Popup, TileLayer, Tooltip, useMap, ZoomControl } from 'react-leaflet'
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
  const bounds = locations.map(({ latitude, longitude }): LatLngTuple => [latitude, longitude])
  return (
    <section className="panel map-panel" aria-labelledby="map-heading">
      <header className="card-heading">
        <h2 id="map-heading">Mapa de localidades</h2>
        <p>Sur del Perú{selected && <> · <strong>{selected.name} seleccionada</strong></>}</p>
      </header>
      <div className="map-frame" role="region" aria-label="Mapa interactivo del sur del Perú">
        <MapContainer bounds={bounds} boundsOptions={{ padding: [35, 35], maxZoom: 9 }} maxZoom={18}
          scrollWheelZoom={false} zoomControl={false} attributionControl={false}>
          <MapResize />
          <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            eventHandlers={{ tileerror: () => setTilesFailed(true) }} />
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
        <div className="map-credit">© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a></div>
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
    </section>
  )
}
