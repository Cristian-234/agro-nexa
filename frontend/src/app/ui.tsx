import type { ReactNode } from 'react'

const shapes = {
  home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M9 21v-7h6v7"/></>,
  compass: <><circle cx="12" cy="12" r="9"/><path d="m16 8-2 6-6 2 2-6z"/></>,
  chart: <><path d="M4 3v17h17M8 15v-4m5 4V6m5 9v-7"/></>,
  rotate: <><path d="M20 10a8 8 0 0 0-14-4L4 8m0-5v5h5m-5 6a8 8 0 0 0 14 4l2-2m0 5v-5h-5"/></>,
  book: <><path d="M12 6v15M3 4h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5v15h-5a4 4 0 0 0-4 2 4 4 0 0 0-4-2H3z"/></>,
  panel: <><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/></>,
  pin: <><path d="M12 22s6-5 6-12a6 6 0 0 0-12 0c0 7 6 12 6 12Z"/><circle cx="12" cy="10" r="2"/></>,
  arrow: <path d="M4 12h15m-6-6 6 6-6 6"/>,
  external: <path d="M13 5h6v6m0-6-9 9m7-1v6H5V7h6"/>,
  menu: <path d="M4 6h16M4 12h16M4 18h16"/>,
  close: <path d="m6 6 12 12M18 6 6 18"/>,
  leaf: <><path d="M5 19c2-6 6-10 14-14 0 9-4 14-10 14H5Zm3-4C3 15 3 9 4 5c5 0 8 2 9 4"/></>,
  satellite: <><path d="m8 8 8 8m-3-3 5-5m-2-4 4 4m-8-4 8 8M3 16a5 5 0 0 1 5 5m-5-9a9 9 0 0 1 9 9"/><circle cx="3" cy="21" r="1"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18m-12 5h1m4 0h1"/></>,
  layers: <><path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5"/></>,
  thermometer: <><path d="M10 14V5a2 2 0 0 1 4 0v9a4 4 0 1 1-4 0Zm2-3v6"/><path d="M18 6h2m-2 4h2"/></>,
  rain: <><path d="M7 15a4 4 0 1 1 .8-7.9A5 5 0 0 1 17.5 9a3 3 0 1 1 .5 6M9 17l-1 4m5-4-1 4m5-4-1 4"/></>,
  filter: <path d="M4 5h16l-6 7v5l-4 2v-7z"/>,
  check: <path d="m5 12 5 5L20 7"/>,
} satisfies Record<string, ReactNode>

export type IconName = keyof typeof shapes

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{shapes[name]}</svg>
}

export function PageHeading({ title, description, icon }: { title: string; description: string; icon: IconName }) {
  return <header className="page-heading">
    <span className="page-icon"><Icon name={icon} size={23} /></span>
    <div><h1>{title}</h1><p>{description}</p></div>
  </header>
}

export function LoadingSkeleton({ label }: { label: string }) {
  return <div className="panel loading-panel" role="status">
    <p>{label}</p>
    <div className="skeleton-grid" aria-hidden="true">
      {[1, 2, 3].map(item => <span key={item}><i /><i /></span>)}
    </div>
  </div>
}
