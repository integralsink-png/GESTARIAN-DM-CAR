import type { LucideIcon } from 'lucide-react'

export interface Cliente {
  id: string
  numero?: number
  nombre: string
  dni: string | null
  telefono: string | null
  email: string | null
  direccion: string | null
  cp?: string | null
  localidad?: string | null
  created_at: string
}

export interface Vehiculo {
  id: string
  cliente_id: string
  matricula: string
  marca: string | null
  modelo: string | null
  anio: number | null
  vin: string | null
  codigo_color?: string | null
  fotos?: string[]
  created_at: string
}

export interface Concepto {
  descripcion: string
  cantidad: number
  precio: number
}

export type EstadoPresupuesto = 'pendiente' | 'aceptado' | 'rechazado'
export type EstadoCita = 'pendiente' | 'confirmada' | 'completada' | 'cancelada'
export type EstadoReparacion = 'en_proceso' | 'finalizado'
export type EstadoCobro = 'pendiente' | 'parcial' | 'pagada'

export interface Presupuesto {
  id: string
  numero: string
  expediente_id?: string | null
  cliente_id: string
  vehiculo_id: string | null
  estado: EstadoPresupuesto
  conceptos: Concepto[]
  total: number
  observaciones: string | null
  fotos?: string[]
  aplicarIva?: boolean
  enviado_email_at?: string | null
  enviado_whatsapp_at?: string | null
  created_at: string
  updated_at?: string
}

export interface Cita {
  id: string
  presupuesto_id: string | null
  cliente_id: string
  vehiculo_id: string | null
  fecha: string
  hora: string | null
  estado: EstadoCita
  observaciones: string | null
  fotos?: string[]
  created_at: string
}

export interface Reparacion {
  id: string
  cita_id: string | null
  cliente_id: string
  vehiculo_id: string | null
  estado: EstadoReparacion
  descripcion: string | null
  fotos: string[]
  created_at: string
}

export interface Factura {
  id: string
  numero: string
  reparacion_id: string | null
  cliente_id: string
  vehiculo_id: string | null
  conceptos: Concepto[]
  total: number
  total_abonado: number
  estado_cobro: EstadoCobro
  fecha: string
  fotos?: string[]
  observaciones?: string
  enviado_email_at?: string | null
  enviado_whatsapp_at?: string | null
  created_at: string
  updated_at?: string
}

export interface Cobro {
  id: string
  factura_id: string
  importe: number
  fecha: string
  metodo: string | null
  created_at: string
}

export interface Configuracion {
  id: number
  nombre_empresa: string
  cif: string
  direccion: string
  telefono: string | null
  email: string | null
  email_gestoria: string | null
  logo_color: string | null
  logo_bn: string | null
  fondo_landscape: string | null
  fondo_portrait: string | null
  color_fondo: string | null
  color_texto: string | null
  color_glow_botones: string | null
  color_linea_botones: string | null
  color_relleno_campo: string | null
  color_relleno_botones: string | null
  tipo_empresa: 'autonomo' | 'sociedad_limitada' | null
  animaciones_activadas: boolean | null
  sonido_activado: boolean | null
}

export interface AppearanceSettings {
  color_fondo: string
  color_texto: string
  color_glow_botones: string
  color_linea_botones: string
  color_relleno_campo: string
  color_relleno_botones: string
  color_relleno_paneles: string
  modo_diurno: boolean
  animaciones_activadas: boolean
  sonido_activado: boolean
}

export type ThemePreset =
  | 'classic'
  | 'professional'
  | 'dark'
  | 'blue'
  | 'green'
  | 'orange'
  | 'premium'
  | 'custom'

export interface ThemeSettings {
  id: number
  theme_preset: ThemePreset
  primary_color: string
  secondary_color: string
  button_color: string
  icon_color: string
  warning_color: string
  success_color: string
  error_color: string
  is_dark_mode: boolean
  card_color: string
  dashboard_color: string
  table_color: string
  header_color: string
  typography: string
  font_size: string
  border_radius: string
  shadows: string
  spacing: string
  visual_density: string

  logo_url: string | null
  logo_inicio_url: string | null
  dashboard_image_url: string | null
  background_image_url: string | null
  favicon_url: string | null
  commercial_name: string | null
  splash_screen_url: string | null
  pwa_icon_url: string | null
  notification_color: string

  created_at?: string
  updated_at?: string
}



export interface SmartRowField {
  label: string
  value: string
}

export interface SmartRowAction {
  label: string
  icon?: LucideIcon
  onClick: () => void
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
}

export interface StatusChipConfig {
  label: string
  color: 'green' | 'yellow' | 'red' | 'blue' | 'gray'
}

export interface Proveedor {
  id: string
  nombre: string
  cif: string | null
  direccion: string | null
  telefono: string | null
  email: string | null
  contacto: string | null
  created_at: string
}

export interface PagoRecibida {
  id: string
  importe: number
  fecha: string
  metodo_pago?: string
  recibo_foto?: string
}

export interface FacturaRecibida {
  id: string
  numero: string
  numero_registro?: string
  proveedor_id: string | null
  presupuesto_id?: string | null
  fecha: string
  base_imponible: number
  iva: number
  total: number
  total_pagado?: number
  estado: string
  archivo_url: string | null
  conceptos: Concepto[]
  pagos?: PagoRecibida[]
  fotos_recibos?: string[]
  created_at: string
}

export interface NotaVehiculo {
  id: string
  vehiculo_id: string
  cliente_id: string | null
  autor: string
  texto: string
  visible_cliente: boolean
  created_at: string
}

export interface ClienteInvitacion {
  id: string
  cliente_id: string
  vehiculo_id: string
  email: string
  token: string
  enviado: boolean
  created_at: string
}

export type RolUsuario = 'admin' | 'jefe' | 'operario'

export interface Usuario {
  id: string
  nombre: string
  email: string
  rol: RolUsuario
  puede_editar_precios: boolean
  puede_enviar_gestoria: boolean
  activo: boolean
  created_at: string
}

export type PrioridadIncidencia =
  | 'baja'
  | 'media'
  | 'alta'
  | 'urgente'

export type EstadoIncidencia =
  | 'abierta'
  | 'en_proceso'
  | 'resuelta'
  | 'cerrada'

export interface Incidencia {
  id: string
  titulo: string
  descripcion: string | null
  prioridad: PrioridadIncidencia
  estado: EstadoIncidencia
  vehiculo_id: string | null
  cliente_id: string | null
  asignado_a: string | null
  resolucion: string | null
  created_at: string
}

export type TextColorValue =
  | '#000000'
  | '#ffffff'
  | '#808080'

export interface TextColorSettings {
  text_title: TextColorValue
  text_primary: TextColorValue
  text_input: TextColorValue
  text_secondary: TextColorValue
  text_card: TextColorValue
}

export interface AiAssistantConfig {
  provider: 'gemini' | 'groq' | 'huggingface' | 'openai'
  model: string
  api_key: string
  status: 'connected' | 'disconnected' | 'testing' | 'error'
}

export interface DocumentOcrConfig {
  provider: 'gemini' | 'tesseract' | 'google_vision'
  model: string
  api_key: string
  status: 'connected' | 'disconnected' | 'testing' | 'error'
}

export interface PlateRecognizerConfig {
  provider: 'plate_recognizer'
  api_key: string
  endpoint_url?: string
  status: 'connected' | 'disconnected' | 'testing' | 'error'
}

export interface StorageConfig {
  provider: 'supabase_storage'
  bucket_name: string
  status: 'connected' | 'disconnected'
}

export interface FallbackAiConfig {
  provider: 'openrouter' | 'groq' | 'huggingface' | 'openai' | 'deepseek'
  model: string
  api_key: string
  enabled: boolean
  status: 'connected' | 'disconnected' | 'testing' | 'error'
}

export interface ServicesConfig {
  ai_assistant: AiAssistantConfig
  document_ocr: DocumentOcrConfig
  plate_ocr: PlateRecognizerConfig
  storage: StorageConfig
  fallback_ai: FallbackAiConfig
}