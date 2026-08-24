import { supabase } from '../lib/supabase';
import type { Usuario, Rol, Especialidad, EpigrafeIAE, Permiso } from '../lib/types';

export const usuarioService = {
  // Obtener usuarios del taller (opcionalmente filtrados por taller_id si existe)
  async obtenerUsuarios(tallerId?: string | null): Promise<Usuario[]> {
    let query = supabase
      .from('usuarios')
      .select(`
        *,
        roles:rol_id (id, nombre, descripcion, parent_id),
        especialidades:especialidad_id (id, nombre, descripcion),
        epigrafes_iae:epigrafe_iae_id (id, codigo, descripcion),
        jefe:jefe_id (id, nombre, email)
      `)
      .order('created_at', { ascending: false });

    if (tallerId) {
      query = query.eq('taller_id', tallerId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[usuarioService.obtenerUsuarios Error]:', error);
      // Fallback simple si los joins de claves foráneas no están inicializados
      const { data: simpleData, error: simpleErr } = await supabase
        .from('usuarios')
        .select('*')
        .order('created_at', { ascending: false });
      if (simpleErr) throw simpleErr;
      return (simpleData as Usuario[]) || [];
    }
    return (data as Usuario[]) || [];
  },

  // Obtener un usuario por ID
  async obtenerUsuarioPorId(id: string): Promise<Usuario | null> {
    const { data, error } = await supabase
      .from('usuarios')
      .select(`
        *,
        roles:rol_id (id, nombre, descripcion, parent_id),
        especialidades:especialidad_id (id, nombre, descripcion),
        epigrafes_iae:epigrafe_iae_id (id, codigo, descripcion),
        jefe:jefe_id (id, nombre, email)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      const { data: simpleData, error: simpleErr } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (simpleErr) throw simpleErr;
      return (simpleData as Usuario) || null;
    }
    return (data as Usuario) || null;
  },

  // Crear usuario
  async crearUsuario(datos: Partial<Usuario> & { password?: string }): Promise<Usuario> {
    const payload = { ...datos };
    delete (payload as any).roles;
    delete (payload as any).especialidades;
    delete (payload as any).epigrafes_iae;
    delete (payload as any).jefe;
    delete (payload as any).password;

    const { data, error } = await supabase
      .from('usuarios')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Actualizar usuario
  async actualizarUsuario(id: string, datos: Partial<Usuario>): Promise<Usuario> {
    const payload = { ...datos };
    delete (payload as any).roles;
    delete (payload as any).especialidades;
    delete (payload as any).epigrafes_iae;
    delete (payload as any).jefe;

    const { data, error } = await supabase
      .from('usuarios')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Desactivar / Reactivar usuario
  async toggleActivo(id: string, activo: boolean): Promise<void> {
    const { error } = await supabase
      .from('usuarios')
      .update({ activo })
      .eq('id', id);
    if (error) throw error;
  },

  // Eliminar usuario
  async eliminarUsuario(id: string): Promise<void> {
    const { error } = await supabase
      .from('usuarios')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // Obtener roles disponibles
  async obtenerRoles(): Promise<Rol[]> {
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .order('nombre');
    if (error) {
      console.warn('Error al cargar roles:', error);
      return [];
    }
    return (data as Rol[]) || [];
  },

  // Obtener especialidades
  async obtenerEspecialidades(): Promise<Especialidad[]> {
    const { data, error } = await supabase
      .from('especialidades')
      .select('*')
      .order('nombre');
    if (error) {
      console.warn('Error al cargar especialidades:', error);
      return [];
    }
    return (data as Especialidad[]) || [];
  },

  // Obtener epígrafes IAE
  async obtenerEpigrafesIAE(): Promise<EpigrafeIAE[]> {
    const { data, error } = await supabase
      .from('epigrafes_iae')
      .select('*')
      .order('codigo');
    if (error) {
      console.warn('Error al cargar epígrafes IAE:', error);
      return [];
    }
    return (data as EpigrafeIAE[]) || [];
  },

  // Obtener todos los permisos disponibles del sistema
  async obtenerTodosPermisos(): Promise<Permiso[]> {
    const { data, error } = await supabase
      .from('permisos')
      .select('*')
      .order('clave');
    if (error) {
      console.warn('Error al cargar permisos:', error);
      return [];
    }
    return (data as Permiso[]) || [];
  },

  // Asignar permisos específicos a un usuario
  async asignarPermisos(usuarioId: string, permisosIds: string[]): Promise<void> {
    // 1. Eliminar permisos existentes
    const { error: delError } = await supabase
      .from('usuario_permisos')
      .delete()
      .eq('usuario_id', usuarioId);
    if (delError) console.warn('Aviso eliminando usuario_permisos previos:', delError);

    // 2. Insertar nuevos
    if (permisosIds.length > 0) {
      const rows = permisosIds.map((permisoId) => ({
        usuario_id: usuarioId,
        permiso_id: permisoId
      }));
      const { error: insError } = await supabase
        .from('usuario_permisos')
        .insert(rows);
      if (insError) throw insError;
    }
  },

  // Obtener IDs de permisos de un usuario
  async obtenerPermisos(usuarioId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('usuario_permisos')
      .select('permiso_id')
      .eq('usuario_id', usuarioId);
    if (error) {
      console.warn('Error al obtener usuario_permisos:', error);
      return [];
    }
    return data ? data.map((row: any) => row.permiso_id) : [];
  },

  // Obtener estado del plan y límites de usuarios del taller
  async obtenerPlanTaller(tallerId?: string | null): Promise<{
    esPro: boolean;
    limiteUsuarios: number;
    totalUsuarios: number;
    puedeCrearUsuario: boolean;
  }> {
    try {
      // 1. Obtener configuración del taller
      const { data: config } = await supabase
        .from('configuracion')
        .select('pro_activo, limite_usuarios_free')
        .eq('id', 1)
        .maybeSingle();

      const esPro = Boolean(config?.pro_activo);
      const limiteUsuarios = config?.limite_usuarios_free ?? 3;

      // 2. Contar usuarios actuales
      let query = supabase.from('usuarios').select('id', { count: 'exact', head: true });
      if (tallerId) {
        query = query.eq('taller_id', tallerId);
      }
      const { count } = await query;
      const totalUsuarios = count ?? 0;

      const puedeCrearUsuario = esPro || totalUsuarios < limiteUsuarios;

      return {
        esPro,
        limiteUsuarios,
        totalUsuarios,
        puedeCrearUsuario
      };
    } catch (err) {
      console.error('[usuarioService.obtenerPlanTaller Error]:', err);
      return {
        esPro: false,
        limiteUsuarios: 3,
        totalUsuarios: 0,
        puedeCrearUsuario: true
      };
    }
  }
};
