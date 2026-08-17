import { supabase } from '../lib/supabase'
import type { MetisAction } from './metisTools'
import { getWorkshopCase } from './metisWorkshopCase'

/**
 * Ejecutor de acciones y herramientas de METIS sobre la base de datos de GESTARIAN.
 */
export const executeMetisAction = async (action: MetisAction): Promise<any> => {
  const { type, params } = action

  try {
    switch (type) {
      case 'get_workshop_case': {
        const query = (params.query || params.matricula || params.cliente || '') as string
        return await getWorkshopCase(query)
      }

      case 'search_clients': {
        const q = (params.query || '') as string
        const { data } = await supabase
          .from('clientes')
          .select('*')
          .or(`nombre.ilike.%${q}%,dni.ilike.%${q}%,telefono.ilike.%${q}%`)
          .limit(10)
        return data || []
      }

      case 'get_client': {
        const id = params.id as string
        const { data } = await supabase.from('clientes').select('*, vehiculos(*)').eq('id', id).maybeSingle()
        return data
      }

      case 'search_vehicles': {
        const q = (params.query || params.matricula || '') as string
        const clean = q.replace(/\s+/g, '').toUpperCase()
        const { data } = await supabase
          .from('vehiculos')
          .select('*, clientes(*)')
          .or(`matricula.ilike.%${clean}%,marca.ilike.%${clean}%,modelo.ilike.%${clean}%`)
          .limit(10)
        return data || []
      }

      case 'get_vehicle': {
        const id = params.id as string
        const { data } = await supabase.from('vehiculos').select('*, clientes(*)').eq('id', id).maybeSingle()
        return data
      }

      case 'search_quotes': {
        const estado = params.estado as string
        let req = supabase.from('presupuestos').select('*, clientes(*), vehiculos(*)').order('created_at', { ascending: false }).limit(10)
        if (estado) req = req.eq('estado', estado)
        const { data } = await req
        return data || []
      }

      case 'get_quote': {
        const id = params.id as string
        const { data } = await supabase.from('presupuestos').select('*, clientes(*), vehiculos(*)').eq('id', id).maybeSingle()
        return data
      }

      case 'search_repairs': {
        const estado = params.estado as string
        let req = supabase.from('reparaciones').select('*, clientes(*), vehiculos(*)').order('created_at', { ascending: false }).limit(10)
        if (estado) req = req.eq('estado', estado)
        const { data } = await req
        return data || []
      }

      case 'get_repair': {
        const id = params.id as string
        const { data } = await supabase.from('reparaciones').select('*, clientes(*), vehiculos(*)').eq('id', id).maybeSingle()
        return data
      }

      case 'search_invoices': {
        const cobro = params.estado_cobro as string
        let req = supabase.from('facturas').select('*, clientes(*), vehiculos(*)').order('created_at', { ascending: false }).limit(10)
        if (cobro) req = req.eq('estado_cobro', cobro)
        const { data } = await req
        return data || []
      }

      case 'get_invoice': {
        const id = params.id as string
        const { data } = await supabase.from('facturas').select('*, clientes(*), vehiculos(*)').eq('id', id).maybeSingle()
        return data
      }

      case 'search_supplier_invoices': {
        const { data } = await supabase.from('facturas_recibidas').select('*, proveedores(*)').order('created_at', { ascending: false }).limit(10)
        return data || []
      }

      case 'search_appointments': {
        const { data } = await supabase.from('citas').select('*, clientes(*), vehiculos(*)').order('fecha', { ascending: false }).limit(10)
        return data || []
      }

      default:
        console.warn(`[METIS Tools] Herramienta no implementada o desconocida: ${type}`)
        return null
    }
  } catch (error) {
    console.error(`[METIS Actions Error] Ejecución fallida de ${type}:`, error)
    return { error: (error as any)?.message || 'Error al ejecutar acción' }
  }
}
