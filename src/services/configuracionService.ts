import { supabase } from '../lib/supabase';
import type { Configuracion } from '../lib/types';

export const configuracionService = {
  // Obtener configuración global del taller (registro con ID 1)
  async obtenerConfiguracion(): Promise<Configuracion | null> {
    const { data, error } = await supabase
      .from('configuracion')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    if (error) {
      console.error('[configuracionService.obtenerConfiguracion Error]:', error);
      throw error;
    }
    return (data as Configuracion) || null;
  },

  // Actualizar datos de configuración y planes
  async actualizarConfiguracion(datos: Partial<Configuracion>): Promise<void> {
    const { error } = await supabase
      .from('configuracion')
      .update(datos)
      .eq('id', 1);

    if (error) {
      console.error('[configuracionService.actualizarConfiguracion Error]:', error);
      throw error;
    }
  }
};
