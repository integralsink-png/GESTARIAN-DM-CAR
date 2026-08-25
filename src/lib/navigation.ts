import {
  LayoutDashboard, Users, ClipboardList, Calendar, Wrench,
  FileText, Scale, Truck, AlertTriangle,
  UserCog, Settings, FolderOpen, Coins
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  label: string
  path: string
  icon: LucideIcon
  permiso?: string | null
}

// Full menu (hamburger / sidebar)
export const NAV_ITEMS: NavItem[] = [
  { label: 'Inicio',              path: '/',                   icon: LayoutDashboard, permiso: null },
  { label: 'Expedientes',         path: '/expedientes',        icon: FolderOpen,      permiso: null },
  { label: 'Clientes',            path: '/clientes',            icon: Users,           permiso: null },
  { label: 'Presupuestos',        path: '/presupuestos',        icon: ClipboardList,   permiso: null },
  { label: 'Citas',               path: '/citas',              icon: Calendar,        permiso: null },
  { label: 'Reparaciones',        path: '/reparaciones',       icon: Wrench,          permiso: null },
  { label: 'Abonos Parciales',    path: '/abonos-parciales',   icon: Coins,           permiso: null },
  { label: 'Facturación',         path: '/facturas',           icon: FileText,        permiso: null },
  { label: 'Balances',            path: '/balances',           icon: Scale,           permiso: null },
  { label: 'Proveedores',         path: '/proveedores',        icon: Truck,           permiso: null },
  { label: 'Incidencias',         path: '/incidencias',        icon: AlertTriangle,   permiso: null },
  { label: 'Configuración',       path: '/configuracion',      icon: Settings,        permiso: null },
]

// PC / Tablet Landscape footer (text buttons, no icons except mic)
export const FOOTER_NAV: NavItem[] = [
  { label: 'Expedientes',  path: '/expedientes',   icon: FolderOpen,      permiso: null },
  { label: 'Clientes',     path: '/clientes',      icon: Users,           permiso: null },
  { label: 'Presupuestos', path: '/presupuestos',  icon: ClipboardList,   permiso: null },
  { label: 'Citas',        path: '/citas',         icon: Calendar,        permiso: null },
  { label: 'Reparaciones', path: '/reparaciones',  icon: Wrench,          permiso: null },
  { label: 'Facturación',  path: '/facturas',      icon: FileText,        permiso: null },
  { label: 'Balances',     path: '/balances',      icon: Scale,           permiso: null },
  { label: 'Configuración', path: '/configuracion', icon: Settings,        permiso: null },
]

// Mobile / Tablet Portrait footer (3 icons: camera, menu, mic)
export const MOBILE_FOOTER_ICONS = ['camera', 'menu', 'mic'] as const

export function openCameraWithPlate(matricula: string) {
  window.dispatchEvent(new CustomEvent('gestarian-camera-open', { detail: { matricula } }))
}

export function openCameraWithoutPlate() {
  window.dispatchEvent(new CustomEvent('gestarian-camera-open', {}))
}
