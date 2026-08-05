import {
  LayoutDashboard, Users, ClipboardList, Calendar, Wrench,
  FileText, Scale, Receipt, Truck, AlertTriangle,
  UserCog, Building2, Settings,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  label: string
  path: string
  icon: LucideIcon
}

// Full menu (hamburger / sidebar)
export const NAV_ITEMS: NavItem[] = [
  { label: 'Inicio',              path: '/',                   icon: LayoutDashboard },
  { label: 'Clientes',            path: '/clientes',            icon: Users },
  { label: 'Presupuestos',        path: '/presupuestos',        icon: ClipboardList },
  { label: 'Citas',               path: '/citas',              icon: Calendar },
  { label: 'Reparaciones',        path: '/reparaciones',       icon: Wrench },
  { label: 'Facturación',         path: '/facturas',           icon: FileText },
  { label: 'Balances',            path: '/balances',           icon: Scale },
  { label: 'Facturas Recibidas',  path: '/facturas-recibidas', icon: Receipt },
  { label: 'Proveedores',         path: '/proveedores',        icon: Truck },
  { label: 'Incidencias',         path: '/incidencias',        icon: AlertTriangle },
  { label: 'Usuarios',            path: '/usuarios',           icon: UserCog },
  { label: 'Configuración',       path: '/configuracion',      icon: Settings },
]

// PC / Tablet Landscape footer (text buttons, no icons except mic)
export const FOOTER_NAV: NavItem[] = [
  { label: 'Clientes',     path: '/clientes',      icon: Users },
  { label: 'Presupuestos', path: '/presupuestos',  icon: ClipboardList },
  { label: 'Citas',        path: '/citas',         icon: Calendar },
  { label: 'Reparaciones', path: '/reparaciones',  icon: Wrench },
  { label: 'Facturación',  path: '/facturas',      icon: FileText },
  { label: 'Balances',     path: '/balances',      icon: Scale },
  { label: 'Configuración', path: '/configuracion', icon: Settings },
]

// Mobile / Tablet Portrait footer (3 icons: camera, menu, mic)
export const MOBILE_FOOTER_ICONS = ['camera', 'menu', 'mic'] as const

export function openCameraWithPlate(matricula: string) {
  window.dispatchEvent(new CustomEvent('gestarian-camera-open', { detail: { matricula } }))
}

export function openCameraWithoutPlate() {
  window.dispatchEvent(new CustomEvent('gestarian-camera-open', {}))
}
