import { supabase } from '../lib/supabase'

export interface WorkshopCaseResult {
  cliente: any
  vehiculo: any
  presupuestos: any[]
  reparaciones: any[]
  facturas: any[]
  cobros: any[]
  citas: any[]
  fotos: any[]
  resumenTexto: string
}

/**
 * Reconstruye el caso de taller completo (Expediente Integral 360°)
 * a partir de una matrícula, nombre de cliente o ID.
 */
export const getWorkshopCase = async (query: string): Promise<WorkshopCaseResult | null> => {
  if (!query || !query.trim()) return null
  const clean = query.trim().toUpperCase().replace(/\s+/g, '')

  try {
    // 1. Intentar buscar vehículo por matrícula
    let vehiculo: any = null
    let cliente: any = null

    const { data: vehs } = await supabase
      .from('vehiculos')
      .select('*, clientes(*)')
      .or(`matricula.ilike.%${clean}%,marca.ilike.%${clean}%,modelo.ilike.%${clean}%`)
      .limit(1)

    if (vehs && vehs.length > 0) {
      vehiculo = vehs[0]
      cliente = (vehiculo as any).clientes || null
    }

    // 2. Si no se encontró por vehículo, buscar por cliente
    if (!cliente) {
      const { data: clis } = await supabase
        .from('clientes')
        .select('*')
        .or(`nombre.ilike.%${query.trim()}%,dni.ilike.%${clean}%,telefono.ilike.%${clean}%`)
        .limit(1)

      if (clis && clis.length > 0) {
        cliente = clis[0]
        if (!vehiculo) {
          const { data: vList } = await supabase.from('vehiculos').select('*').eq('cliente_id', cliente.id).limit(1)
          if (vList && vList.length > 0) vehiculo = vList[0]
        }
      }
    }

    if (!cliente && !vehiculo) return null

    const clienteId = cliente?.id
    const vehiculoId = vehiculo?.id

    // 3. Consultar en paralelo todo el historial
    const [
      { data: presupuestos },
      { data: reparaciones },
      { data: facturas },
      { data: citas },
      { data: fotos }
    ] = await Promise.all([
      clienteId ? supabase.from('presupuestos').select('*').eq('cliente_id', clienteId).order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
      vehiculoId ? supabase.from('reparaciones').select('*').eq('vehiculo_id', vehiculoId).order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
      clienteId ? supabase.from('facturas').select('*').eq('cliente_id', clienteId).order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
      clienteId ? supabase.from('citas').select('*').eq('cliente_id', clienteId).order('fecha', { ascending: false }) : Promise.resolve({ data: [] }),
      vehiculoId ? supabase.from('expediente_imagenes').select('*').eq('vehiculo_id', vehiculoId).order('created_at', { ascending: false }) : Promise.resolve({ data: [] })
    ])

    const facIds = (facturas || []).map((f: any) => f.id)
    let cobrosList: any[] = []
    if (facIds.length > 0) {
      const { data: cobrosData } = await supabase.from('cobros').select('*').in('factura_id', facIds)
      cobrosList = cobrosData || []
    }

    const totalFacturado = (facturas || []).reduce((acc: number, f: any) => acc + (Number(f.total) || 0), 0)
    const totalCobrado = cobrosList.reduce((acc: number, c: any) => acc + (Number(c.importe) || 0), 0)
    const saldoPendiente = Math.max(0, totalFacturado - totalCobrado)

    const resumenTexto = `
CASO DE TALLER: ${cliente ? cliente.nombre : 'Cliente Desconocido'} | Matrícula: ${vehiculo ? vehiculo.matricula : 'S/N'} (${vehiculo?.marca || ''} ${vehiculo?.modelo || ''})
- Teléfono: ${cliente?.telefono || '—'}, DNI: ${cliente?.dni || '—'}
- Presupuestos (${presupuestos?.length || 0}): ${(presupuestos || []).map((p: any) => `${p.numero} (${p.total}€ - ${p.estado})`).join(', ') || 'Ninguno'}
- Reparaciones (${reparaciones?.length || 0}): ${(reparaciones || []).map((r: any) => `${r.id} (${r.estado})`).join(', ') || 'Ninguna'}
- Facturas (${facturas?.length || 0}): ${(facturas || []).map((f: any) => `${f.numero} (${f.total}€ - Cobro: ${f.estado_cobro})`).join(', ') || 'Ninguna'}
- Balance Financiero: Facturado: ${totalFacturado.toFixed(2)}€ | Cobrado: ${totalCobrado.toFixed(2)}€ | Pendiente: ${saldoPendiente.toFixed(2)}€
- Fotos en Expediente: ${fotos?.length || 0} imágenes registradas.
`.trim()

    return {
      cliente,
      vehiculo,
      presupuestos: presupuestos || [],
      reparaciones: reparaciones || [],
      facturas: facturas || [],
      cobros: cobrosList,
      citas: citas || [],
      fotos: fotos || [],
      resumenTexto
    }
  } catch (err) {
    console.error('Error al obtener Workshop Case para METIS:', err)
    return null
  }
}
