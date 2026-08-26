import { supabase } from '../../lib/supabase';

export interface PreferenciasUsuario {
  id?: string;
  tema?: string;
  capaVisual?: string;
  idioma?: string;
  notificaciones?: { email: boolean; push: boolean };
}

export interface PerfilUsuario {
  id: string;
  email: string;
  nombre: string;
  rol: string;
  plan?: string | null;
  esDeveloper: boolean;
  permisos: string[];
  // Campos para licencia
  licenciaEstado?: string | null;
  licenciaFechaFin?: string | null;
  planNombre?: string | null;
  // Preferencias personales
  preferencias?: PreferenciasUsuario;
}

let perfilActual: PerfilUsuario | null = null;

export async function cargarPerfil(email: string): Promise<PerfilUsuario | null> {
  const isDevEmail = email.toLowerCase() === 'iclomsinks@gmail.com';

  try {
    // 1. Obtener datos básicos del usuario
    const { data: userData, error: userError } = await supabase
      .from('usuarios')
      .select(`
        id,
        email,
        nombre,
        es_developer,
        licencia_id,
        rol_id,
        plan_id,
        roles:rol_id (id, nombre),
        planes:plan_id (id, nombre)
      `)
      .eq('email', email)
      .maybeSingle();

    if (userError || !userData) {
      if (userError) console.error('Error al obtener usuario:', userError);
      
      // Buscar si está registrado en gestarian_licencias o en backup local
      let backupLic: any = null;
      try {
        const { data: gLic } = await supabase
          .from('gestarian_licencias')
          .select('*')
          .eq('email', email)
          .maybeSingle();
        if (gLic) backupLic = gLic;
      } catch (e) {}

      if (!backupLic) {
        try {
          const raw = localStorage.getItem('gestarian_clientes_registrados_backup');
          if (raw) {
            const list: any[] = JSON.parse(raw);
            backupLic = list.find((c: any) => c.email?.toLowerCase() === email.toLowerCase());
          }
        } catch (e) {}
      }

      // Si se registró como taller o tiene email válido, permitir entrada inmediata como JEFE_TALLER
      const nombreTitular = backupLic?.nombre_titular || backupLic?.nombre_profesional || email.split('@')[0];
      const jefePerfil: PerfilUsuario = {
        id: backupLic?.id || `usr-${Date.now()}`,
        email: email,
        nombre: nombreTitular,
        rol: 'JEFE_TALLER',
        plan: backupLic?.plan_solicitado || 'PRO',
        planNombre: `GESTARIAN ${backupLic?.plan_solicitado || 'PRO'}`,
        esDeveloper: isDevEmail,
        permisos: ['*'],
        licenciaEstado: 'activo',
        licenciaFechaFin: backupLic?.fecha_fin_prueba || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        preferencias: {
          tema: 'oscuro',
          capaVisual: localStorage.getItem('gestarian_active_layer') || 'default',
          idioma: 'es',
          notificaciones: { email: true, push: false }
        }
      };

      // Registrar o sincronizar en Supabase usuarios en segundo plano para que persista
      try {
        void supabase.from('usuarios').upsert({
          email: email.toLowerCase().trim(),
          nombre: nombreTitular,
          rol: 'JEFE_TALLER',
          es_pro: true,
          activo: true
        }, { onConflict: 'email' });
      } catch (e) {}

      perfilActual = jefePerfil;
      return jefePerfil;
    }

    // 2. Si el usuario es desarrollador, no necesitamos permisos específicos
    if (userData.es_developer || isDevEmail) {
      const perfil: PerfilUsuario = {
        id: userData.id,
        email: userData.email,
        nombre: userData.nombre,
        rol: (userData.roles as any)?.nombre || 'DEVELOPER',
        plan: (userData.planes as any)?.nombre || 'DEVELOPER_PLAN',
        planNombre: (userData.planes as any)?.nombre || 'DEVELOPER_PLAN',
        esDeveloper: true,
        permisos: ['*'],
        licenciaEstado: 'activo',
        licenciaFechaFin: null,
        preferencias: {
          tema: 'oscuro',
          capaVisual: localStorage.getItem('gestarian_active_layer') || 'default',
          idioma: 'es',
          notificaciones: { email: true, push: false }
        }
      };
      perfilActual = perfil;
      return perfil;
    }

    // 3. Para usuarios normales, obtener permisos desde su rol
    const rolId = (userData as any).rol_id;
    let permisos: string[] = [];

    if (rolId) {
      const { data: permisosData, error: permisosError } = await supabase
        .from('rol_permisos')
        .select(`
          permisos:permiso_id (clave)
        `)
        .eq('rol_id', rolId);

      if (permisosError) {
        console.error('Error al obtener permisos:', permisosError);
      } else if (permisosData) {
        permisos = permisosData
          .map((rp: any) => rp.permisos?.clave)
          .filter(Boolean);
      }
    }

    // 4. Obtener licencia desde gestarian_licencias por email o licencia_id
    let licenciaEstado = 'prueba';
    let licenciaFechaFin: string | null = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    let planNombre = (userData.planes as any)?.nombre || 'FREE';

    try {
      const { data: gLicencia } = await supabase
        .from('gestarian_licencias')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (gLicencia) {
        licenciaEstado = gLicencia.estado_licencia || (gLicencia.suscripcion_activa ? 'activo' : 'prueba');
        licenciaFechaFin = gLicencia.fecha_fin_prueba || null;
      } else {
        // Registrar automáticamente nuevo usuario en modo PRUEBA (30 días de cortesía)
        await supabase.from('gestarian_licencias').insert({
          email: email,
          nombre_profesional: userData.nombre || 'Taller Usuario',
          estado_licencia: 'prueba',
          suscripcion_activa: false,
          fecha_fin_prueba: licenciaFechaFin
        });
      }
    } catch (e) {
      console.warn('Tabla gestarian_licencias no accesible, usando modo prueba:', e);
    }

    // 5. Cargar preferencias personales
    let preferencias: PreferenciasUsuario = {
      tema: 'oscuro',
      capaVisual: localStorage.getItem('gestarian_active_layer') || 'default',
      idioma: 'es',
      notificaciones: { email: true, push: false }
    };

    try {
      const { data: prefData } = await supabase
        .from('preferencias_usuario')
        .select('*')
        .eq('usuario_id', userData.id)
        .maybeSingle();

      if (prefData) {
        preferencias = {
          id: prefData.id,
          tema: prefData.tema || 'oscuro',
          capaVisual: prefData.capa_visual || 'default',
          idioma: prefData.idioma || 'es',
          notificaciones: prefData.notificaciones || { email: true, push: false }
        };
      }
    } catch (e) {
      console.warn('Tabla preferencias_usuario no disponible todavía, usando local:', e);
    }

    const perfil: PerfilUsuario = {
      id: userData.id,
      email: userData.email,
      nombre: userData.nombre,
      rol: (userData.roles as any)?.nombre || '',
      plan: planNombre,
      planNombre: planNombre,
      esDeveloper: false,
      permisos,
      licenciaEstado,
      licenciaFechaFin,
      preferencias
    };

    perfilActual = perfil;
    return perfil;
  } catch (error) {
    console.error('Error inesperado en cargarPerfil:', error);
    if (isDevEmail) {
      const fallbackPerfil: PerfilUsuario = {
        id: 'dev-fallback',
        email,
        nombre: 'Desarrollador',
        rol: 'DEVELOPER',
        plan: 'DEVELOPER_PLAN',
        planNombre: 'DEVELOPER_PLAN',
        esDeveloper: true,
        permisos: ['*'],
        licenciaEstado: 'activo',
        licenciaFechaFin: null,
      };
      perfilActual = fallbackPerfil;
      return fallbackPerfil;
    }
    return null;
  }
}

export async function guardarPreferenciasUsuario(pref: Partial<PreferenciasUsuario>): Promise<boolean> {
  if (!perfilActual) return false;

  perfilActual.preferencias = {
    ...perfilActual.preferencias,
    ...pref
  };

  try {
    const payload: any = {
      usuario_id: perfilActual.id,
      updated_at: new Date().toISOString()
    };
    if (pref.tema !== undefined) payload.tema = pref.tema;
    if (pref.capaVisual !== undefined) payload.capa_visual = pref.capaVisual;
    if (pref.idioma !== undefined) payload.idioma = pref.idioma;
    if (pref.notificaciones !== undefined) payload.notificaciones = pref.notificaciones;

    const { error } = await supabase
      .from('preferencias_usuario')
      .upsert(payload, { onConflict: 'usuario_id' });

    if (error) {
      console.warn('No se pudo guardar en preferencias_usuario en BD:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Error guardando preferencias:', e);
    return false;
  }
}

export function getPerfil(): PerfilUsuario | null {
  return perfilActual;
}

export function can(clave: string): boolean {
  if (!perfilActual) return false;
  if (perfilActual.esDeveloper) return true;
  return perfilActual.permisos.includes(clave);
}

export function hasRole(rolNombre: string): boolean {
  if (!perfilActual) return false;
  if (perfilActual.esDeveloper) return true;
  return perfilActual.rol === rolNombre;
}

export function tieneLicenciaValida(): boolean {
  if (!perfilActual) return false;
  if (perfilActual.esDeveloper) return true; // desarrollador siempre tiene acceso
  const estado = perfilActual.licenciaEstado;
  if (!estado) return false; // sin licencia
  if (estado === 'bloqueado' || estado === 'inactivo') return false;
  if (estado === 'activo') return true;
  if (estado === 'prueba') {
    if (perfilActual.licenciaFechaFin) {
      const now = new Date();
      const fin = new Date(perfilActual.licenciaFechaFin);
      return fin > now;
    }
    return true; // si no hay fecha, consideramos válida
  }
  return false;
}
