export type ID = string;

// ============================================================================
// CORE: Organización y Tenencia Múltiple
// ============================================================================
export interface Organizacion {
  id: ID;
  nombre: string;
  cif_nif: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  logo_url?: string;
  configuracion: Record<string, any>; // JSON para ajustes específicos (moneda, colores, etc.)
  created_at: string;
  updated_at: string;
}

// ============================================================================
// CORE: Roles y Usuarios
// ============================================================================
export type Permiso = 
  | 'ver_expedientes' | 'crear_expedientes' | 'editar_expedientes' | 'eliminar_expedientes'
  | 'ver_clientes' | 'crear_clientes'
  | 'ver_facturacion' | 'gestionar_organizacion';

export interface Rol {
  id: ID;
  organizacion_id: ID;
  nombre: string; // Ej: "Admin", "Mecánico", "Recepción"
  permisos: Permiso[];
  created_at: string;
}

export interface Usuario {
  id: ID;
  auth_id: string; // Relación con el sistema de auth (Supabase Auth, Firebase, etc.)
  organizacion_id: ID;
  rol_id: ID;
  nombre: string;
  email: string;
  estado: 'activo' | 'inactivo';
  created_at: string;
}

// ============================================================================
// CORE: Entidades Principales (Personas/Empresas y Activos)
// ============================================================================
export interface Cliente {
  id: ID;
  organizacion_id: ID;
  numero: string; // Código legible (Ej: CLI-001)
  nombre_completo: string;
  nif_cif: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  notas?: string;
  created_at: string;
  updated_at: string;
}

export interface Vehiculo {
  id: ID;
  organizacion_id: ID;
  cliente_id: ID;
  matricula: string;
  marca: string;
  modelo: string;
  bastidor?: string;
  color?: string;
  año?: number;
  created_at: string;
}

// ============================================================================
// CORE: EXPEDIENTE (La entidad centralizadora)
// ============================================================================
export type EstadoExpediente = 'borrador' | 'en_curso' | 'pausado' | 'finalizado' | 'cancelado';

export interface Expediente {
  id: ID;
  organizacion_id: ID;
  numero: string; // Ej: EXP-2026-0001
  cliente_id: ID;
  vehiculo_id?: ID; // Opcional, por si el expediente no es de un vehículo
  estado: EstadoExpediente;
  titulo: string;
  descripcion?: string;
  
  // Metadatos de progreso
  fecha_apertura: string;
  fecha_cierre?: string;
  
  // Archivos adjuntos y fotos subidas con la cámara
  adjuntos: Adjunto[];
  
  created_at: string;
  updated_at: string;
}

// ============================================================================
// SUBMÓDULOS DEL EXPEDIENTE
// ============================================================================
export interface Presupuesto {
  id: ID;
  expediente_id: ID;
  numero: string;
  estado: 'pendiente' | 'aprobado' | 'rechazado';
  subtotal: number;
  impuestos: number;
  total: number;
  fecha_validez?: string;
  created_at: string;
}

export interface Reparacion {
  id: ID;
  expediente_id: ID;
  mecanico_id?: ID; // Referencia a un Usuario con rol mecánico
  descripcion_trabajo: string;
  horas_estimadas: number;
  horas_reales: number;
  estado: 'pendiente' | 'en_progreso' | 'completada';
  created_at: string;
}

export interface Factura {
  id: ID;
  expediente_id: ID;
  numero: string;
  estado: 'borrador' | 'emitida' | 'pagada' | 'vencida' | 'anulada';
  subtotal: number;
  impuestos: number;
  total: number;
  fecha_emision: string;
  fecha_vencimiento?: string;
  metodo_pago?: string;
  created_at: string;
}

// ============================================================================
// UTILIDADES
// ============================================================================
export interface Adjunto {
  id: ID;
  url: string;
  tipo: 'imagen' | 'documento' | 'video';
  nombre_archivo: string;
  contexto?: string; // Ej: "foto_danos_previos", "dni_cliente"
  created_at: string;
}
