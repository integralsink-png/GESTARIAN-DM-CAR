import { supabase } from './supabase'

/**
 * Recopila TODAS las fotos asociadas a un expediente / vehículo / cliente desde el inicio:
 * 1. Fotos propias del presupuesto / factura / cita / reparación.
 * 2. Fotos guardadas en el vehículo (vehiculos.fotos).
 * 3. Imágenes del expediente almacenadas en Supabase (expediente_imagenes).
 */
export async function fetchExpedienteFotos(
  clienteId?: string | null,
  vehiculoId?: string | null,
  entityFotos: string[] = []
): Promise<string[]> {
  const result: string[] = []

  // 1. Fotos directas de la entidad actual
  if (Array.isArray(entityFotos)) {
    entityFotos.forEach((f) => {
      if (f && typeof f === 'string' && !result.includes(f)) {
        result.push(f)
      }
    })
  }

  // 2. Fotos registradas en el vehículo
  if (vehiculoId) {
    try {
      const { data: veh } = await supabase
        .from('vehiculos')
        .select('fotos')
        .eq('id', vehiculoId)
        .maybeSingle()

      if (veh?.fotos && Array.isArray(veh.fotos)) {
        veh.fotos.forEach((f: string) => {
          if (f && typeof f === 'string' && !result.includes(f)) {
            result.push(f)
          }
        })
      }
    } catch (e) {
      console.warn('No se pudieron recuperar las fotos del vehículo:', e)
    }
  }

  // 3. Fotos de todos los vehículos del cliente si no se pasa vehiculoId
  if (clienteId && !vehiculoId) {
    try {
      const { data: vehs } = await supabase
        .from('vehiculos')
        .select('fotos')
        .eq('cliente_id', clienteId)

      if (vehs && Array.isArray(vehs)) {
        vehs.forEach((v) => {
          if (v.fotos && Array.isArray(v.fotos)) {
            v.fotos.forEach((f: string) => {
              if (f && typeof f === 'string' && !result.includes(f)) {
                result.push(f)
              }
            })
          }
        })
      }
    } catch (e) {
      console.warn('No se pudieron recuperar los vehículos del cliente:', e)
    }
  }

  // 4. Fotos en la tabla expediente_imagenes (Presupuesto Híbrido, OCR, Permisos, Trabajos)
  if (vehiculoId || clienteId) {
    try {
      let query = supabase.from('expediente_imagenes').select('url')
      if (vehiculoId) {
        query = query.eq('vehiculo_id', vehiculoId)
      } else if (clienteId) {
        query = query.eq('cliente_id', clienteId)
      }

      const { data: expImgs } = await query
      if (expImgs && Array.isArray(expImgs)) {
        expImgs.forEach((row: any) => {
          if (row.url && typeof row.url === 'string' && !result.includes(row.url)) {
            result.push(row.url)
          }
        })
      }
    } catch (e) {
      console.warn('Tabla expediente_imagenes inaccesible:', e)
    }
  }

  // 5. Fotos acumuladas en presupuestos, facturas, citas, reparaciones
  const tables = ['presupuestos', 'facturas', 'citas', 'reparaciones']
  for (const tbl of tables) {
    if (vehiculoId || clienteId) {
      try {
        let q = supabase.from(tbl).select('fotos')
        if (vehiculoId) {
          q = q.eq('vehiculo_id', vehiculoId)
        } else if (clienteId) {
          q = q.eq('cliente_id', clienteId)
        }
        const { data: rows } = await q
        if (rows && Array.isArray(rows)) {
          rows.forEach((r: any) => {
            if (r.fotos && Array.isArray(r.fotos)) {
              r.fotos.forEach((f: string) => {
                if (f && typeof f === 'string') {
                  const cleanUrl = f.includes(':') ? f.substring(f.indexOf(':') + 1) : f
                  if (cleanUrl && !result.includes(cleanUrl)) {
                    result.push(cleanUrl)
                  }
                }
              })
            }
          })
        }
      } catch (e) {
        // Ignorar si falla alguna tabla secundaria
      }
    }
  }

  return result
}

/**
 * Guarda una nueva imagen en el expediente del vehículo (vehiculos.fotos + expediente_imagenes)
 */
export async function saveExpedienteFoto(
  dataUrl: string,
  clienteId?: string | null,
  vehiculoId?: string | null,
  categoria: 'fotos' | 'documentos' = 'fotos'
): Promise<void> {
  if (!dataUrl) return

  // 1. Guardar en expediente_imagenes
  try {
    await supabase.from('expediente_imagenes').insert({
      cliente_id: clienteId || null,
      vehiculo_id: vehiculoId || null,
      url: dataUrl,
      categoria: categoria
    })
  } catch (e) {
    console.warn('Error registrando en expediente_imagenes:', e)
  }

  // 2. Guardar en vehiculos.fotos
  if (vehiculoId) {
    try {
      const { data: veh } = await supabase.from('vehiculos').select('fotos').eq('id', vehiculoId).maybeSingle()
      const currentFotos: string[] = veh?.fotos && Array.isArray(veh.fotos) ? veh.fotos : []
      if (!currentFotos.includes(dataUrl)) {
        await supabase.from('vehiculos').update({ fotos: [...currentFotos, dataUrl] }).eq('id', vehiculoId)
      }
    } catch (e) {
      console.warn('Error actualizando vehiculos.fotos:', e)
    }
  }
}
