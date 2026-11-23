import { useRef, useState, type ReactNode } from 'react'
import { Icon, type IconName } from './ui'

export const navigation = [
  { href: '/', label: 'Inicio', icon: 'home' },
  { href: '/explorar', label: 'Explorar', icon: 'compass' },
  { href: '/comparar', label: 'Comparar', icon: 'chart' },
  { href: '/rotaciones', label: 'Rotaciones', icon: 'rotate' },
  { href: '/metodologia', label: 'Metodología', icon: 'book' },
] satisfies { href: string; label: string; icon: IconName }[]

export const nasa = 'https://power.larc.nasa.gov/docs/services/api/temporal/daily/'

function Brand() {
  return <a className="brand" href="/" aria-label="AgroNexa, inicio">
    <span className="brand-mark"><Icon name="leaf" size={22} /></span>
    <span className="brand-label">AgroNexa<small>Inteligencia agrícola</small></span>
  </a>
}

function Navigation({ path }: { path: string }) {
  return <nav aria-label="Navegación principal">
    <span className="nav-label">Módulos</span>
    {navigation.map(item => <a key={item.href} href={item.href} data-tooltip={item.label}
      aria-current={item.href === path ? 'page' : undefined}>
      <Icon name={item.icon} /><span className="nav-text">{item.label}</span>
    </a>)}
  </nav>
}

function SourceLink() {
  return <a className="sidebar-source" href={nasa} aria-label="Fuente climática, NASA POWER" data-tooltip="NASA POWER">
    <Icon name="satellite" size={20} /><span className="source-label"><small>Fuente climática</small>NASA POWER</span>
  </a>
}

export function AppShell({ path, status, children }: {
  path: string
  status: 'idle' | 'loading' | 'ready' | 'error'
  children: ReactNode
}) {
  const [collapsed, setCollapsed] = useState(false)
  const drawer = useRef<HTMLDialogElement>(null)
  const section = navigation.find(item => item.href === path)
  const statusText = status === 'ready' ? 'API disponible' : status === 'error' ? 'API sin respuesta válida' : 'Verificando API'

  return <div className="app-shell" data-collapsed={collapsed}>
    <a className="skip-link" href="#main-content">Saltar al contenido</a>
    <aside className="sidebar">
      <Brand />
      <Navigation path={path} />
      <SourceLink />
      <button className="sidebar-toggle" type="button" aria-label={collapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
        aria-expanded={!collapsed} onClick={() => setCollapsed(value => !value)}>
        <Icon name="panel" /><span className="nav-text">{collapsed ? 'Expandir' : 'Colapsar menú'}</span>
      </button>
    </aside>
    <dialog className="nav-drawer" ref={drawer} aria-label="Menú de AgroNexa" onClick={event => {
      if (event.target === event.currentTarget) drawer.current?.close()
    }}>
      <div className="drawer-content">
        <div className="drawer-heading"><Brand /><button className="icon-button" type="button" aria-label="Cerrar menú"
          onClick={() => drawer.current?.close()}><Icon name="close" /></button></div>
        <Navigation path={path} />
        <SourceLink />
      </div>
    </dialog>
    <div className="app-body">
      <header className="topbar">
        <div className="topbar-content">
          <button className="icon-button mobile-toggle" type="button" aria-label="Abrir menú"
            aria-haspopup="dialog" onClick={() => drawer.current?.showModal()}><Icon name="menu" /></button>
          <nav className="breadcrumbs" aria-label="Ubicación actual">
            {path !== '/' && <><a href="/">Inicio</a><span aria-hidden="true">/</span></>}
            <span aria-current="page">{section?.label ?? 'Página no encontrada'}</span>
          </nav>
          <span className="service-status" data-status={status} title="Comprobado mediante la consulta del catálogo de localidades">
            <i aria-hidden="true" />{statusText}
          </span>
          {path !== '/metodologia' && <a className="topbar-method" href="/metodologia" aria-label="Fuentes y metodología"><Icon name="book" size={17} /></a>}
        </div>
      </header>
      <main className="main-content" id="main-content" tabIndex={-1}>{children}</main>
    </div>
  </div>
}
