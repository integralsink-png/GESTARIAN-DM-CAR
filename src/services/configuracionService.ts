import { supabase } from '../lib/supabase';
import type { Configuracion } from '../lib/types';

export const configuracionService = {
  // Obtener configuración global del taller (registro con ID 1) con fallback local
  async obtenerConfiguracion(): Promise<Configuracion | null> {
    let configData: any = null;

    try {
      const { data, error } = await supabase
        .from('configuracion')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      if (!error && data) {
        configData = data;
      }
    } catch (e) {
      console.warn('[configuracionService] Error conectando con Supabase:', e);
    }

    // Combinar con tarifas guardadas localmente
    const localTarifas = localStorage.getItem('gestarian_tarifas_config');
    if (localTarifas) {
      try {
        const parsed = JSON.parse(localTarifas);
        configData = { ...(configData || { id: 1 }), ...parsed };
      } catch (e) {}
    }

    return configData ? (configData as Configuracion) : {
      id: 1,
      nombre_empresa: '',
      cif: '',
      direccion: '',
      telefono: '',
      email: '',
      email_gestoria: '',
      tipo_empresa: 'empresa',
      precio_pro_mensual: 29.90,
      precio_pro_anual: 299.00,
      precio_enterprise_mensual: 79.90,
      precio_enterprise_anual: 799.00,
      dias_prueba_pro: 30,
      limite_usuarios_free: 3,
      plan_activo: 'FREE',
      pro_activo: false
    } as any;
  },

  // Actualizar datos de configuración y planes de forma perpetua y resiliente
  async actualizarConfiguracion(datos: Partial<Configuracion>): Promise<void> {
    // 1. Guardar siempre en localStorage para persistencia garantizada
    try {
      const prev = localStorage.getItem('gestarian_tarifas_config');
      const merged = { ...(prev ? JSON.parse(prev) : {}), ...datos };
      localStorage.setItem('gestarian_tarifas_config', JSON.stringify(merged));
    } catch (e) {
      console.warn('[configuracionService] Error guardando en localStorage:', e);
    }

    // 2. Guardar en Supabase con upsert para id: 1
    try {
      const { error } = await supabase
        .from('configuracion')
        .upsert({ id: 1, ...datos });

      if (error) {
        console.warn('[configuracionService] Supabase upsert error:', error);
        try {
          await supabase.from('configuracion').update(datos).eq('id', 1);
        } catch (e) {}
      }
    } catch (err) {
      console.warn('[configuracionService] Error de red en Supabase:', err);
      // No re-lanzar error si ya quedó guardado en local
    }
  }
};

