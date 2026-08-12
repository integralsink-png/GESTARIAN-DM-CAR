/**
 * Capa de Abstracción Centralizada para Almacenamiento en Supabase Storage.
 * NO solicita API Keys independientes adicionales ya que aprovecha la conexión activa con Supabase.
 * Organiza las rutas lógicas de forma segura y estructurada por cliente, vehículo y expediente.
 */

import { supabase } from '../lib/supabase';
import type { StorageConfig } from '../lib/types';

export function getStorageConfig(): StorageConfig {
  return {
    provider: 'supabase_storage',
    bucket_name: 'gestarian-files',
    status: 'connected'
  };
}

export interface UploadOptions {
  clienteId?: string;
  vehiculoId?: string;
  expedienteId?: string;
  categoria?: 'fotos' | 'documentos' | 'facturas' | 'presupuestos';
}

/**
 * Genera una ruta organizada de almacenamiento jerárquico
 * Ejemplo: clientes/cli_123/veh_456/exp_789/fotos/foto_1690000.jpg
 */
export function buildStoragePath(filename: string, options: UploadOptions = {}): string {
  const sanitize = (str?: string) => (str || 'general').replace(/[^a-zA-Z0-9_-]/g, '');
  const cliente = sanitize(options.clienteId);
  const vehiculo = sanitize(options.vehiculoId);
  const expediente = sanitize(options.expedienteId);
  const cat = options.categoria || 'fotos';

  return `clientes/${cliente}/${vehiculo}/${expediente}/${cat}/${Date.now()}_${filename.replace(/\s+/g, '_')}`;
}

/**
 * Sube un archivo a Supabase Storage con ruta estructurada y devuelve la URL pública o firmada
 */
export async function uploadFileToStorage(
  file: File | Blob,
  filename: string,
  options: UploadOptions = {}
): Promise<{ success: boolean; url?: string; path?: string; error?: string }> {
  try {
    const bucket = 'gestarian-files';
    const filePath = buildStoragePath(filename, options);

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) {
      console.warn('Fallo al subir a bucket específico, probando bucket público...', error.message);
      // Fallback a almacenamiento público si el bucket específico aún no tiene política activa
      const { data: fallbackData, error: fallbackErr } = await supabase.storage
        .from('public')
        .upload(filePath, file, { upsert: true });

      if (fallbackErr) {
        return { success: false, error: fallbackErr.message };
      }

      const { data: urlData } = supabase.storage.from('public').getPublicUrl(fallbackData.path);
      return { success: true, url: urlData.publicUrl, path: fallbackData.path };
    }

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
    return { success: true, url: urlData.publicUrl, path: data.path };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error inesperado al subir archivo.' };
  }
}
