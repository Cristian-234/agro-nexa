import { lazy, Suspense, useEffect } from 'react'
import { getLocations, type Location } from '../api/locations'
import { useRequest } from '../hooks/useRequest'
import { Home } from '../pages/Home'
import { Methodology } from '../pages/Methodology'
import { AppShell, navigation } from './AppShell'
import { LoadingSkeleton } from './ui'

const Explore = lazy(() => import('../pages/Explore').then(module => ({ default: module.Explore })))
const Compare = lazy(() => import('../pages/Compare').then(module => ({ default: module.Compare })))
const Rotations = lazy(() => import('../pages/Rotations').then(module => ({ default: module.Rotations })))
const RotationDemo = lazy(() => import('../features/rotation/demo/RotationDemo').then(module => ({ default: module.RotationDemo })))

export function App() {
  const path = window.location.pathname.replace(/\/$/, '') || '/'
  const known = navigation.find(item => item.href === path)
  const { result, load } = useRequest<Location[]>()

  useEffect(() => { document.title = (known?.label ?? 'Página no encontrada') + ' · AgroNexa' }, [known])
  useEffect(() => { load(getLocations) }, [load])

  let content
  if (path === '/metodologia') content = <Methodology />
  else if (path === '/rotaciones' && new URLSearchParams(window.location.search).get('modo') === 'demo') {
    content = <RotationDemo />
  } else if (!known) content = <section className="page-heading"><div><h1>Página no encontrada</h1><a href="/">Ir al inicio</a></div></section>
  else if (result.status === 'error') content = <div className="notice error">
    <p role="alert">No se pudo cargar el catálogo de localidades.</p>
    <button className="button secondary" type="button" onClick={() => load(getLocations)}>Reintentar</button>
  </div>
  else if (result.status === 'ready') {
    const locations = result.data
    if (!locations.length) content = <p className="notice" role="status">Aún no hay localidades en el catálogo.</p>
    else if (path === '/explorar') content = <Explore locations={locations} />
    else if (path === '/comparar') content = <Compare locations={locations} />
    else if (path === '/rotaciones') content = <Rotations locations={locations} />
    else content = <Home locations={locations} />
  } else content = <LoadingSkeleton label="Cargando localidades…" />

  return <AppShell path={path} status={result.status}>
    <Suspense fallback={<LoadingSkeleton label="Cargando pantalla…" />}>{content}</Suspense>
  </AppShell>
}
