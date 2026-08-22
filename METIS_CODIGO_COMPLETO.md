# METIS - Codigo Completo del Asistente IA (GESTARIAN)

Generado: 2026-08-22 12:11
Proyecto: GESTARIAN (Vite + React + TypeScript)
Ruta base: c:\Users\Administrador\Desktop\JUANI\VS CODE

> Documento de referencia en Markdown (legible por cualquier IDE / agente IA). Contiene el codigo integro de los archivos del nucleo METIS (secciones A-D).
> La seccion E (paginas consumidoras: BalancesPage, InicioPage, FacturasPage, PresupuestosPage, PresupuestoHibridoPage) queda EXCLUIDA por decision del usuario.

## Inventario
| # | Ruta | KB |
|---|------|-----|
| 1 | `src/ai/metisTools.ts` | 0.8 |
| 2 | `src/ai/metisActions.ts` | 4 |
| 3 | `src/ai/metisWorkshopCase.ts` | 4.5 |
| 4 | `src/ai/metisKnowledge.ts` | 24.2 |
| 5 | `src/Metis/executeMetisAction.ts` | 0.1 |
| 6 | `src/Metis/metisWorkshopCase.ts` | 0.1 |
| 7 | `src/lib/metisAiEngine.ts` | 54 |
| 8 | `src/lib/geminiCompat.ts` | 0.8 |
| 9 | `src/services/aiProviderService.ts` | 9 |
| 10 | `src/lib/useVoice.ts` | 21.4 |
| 11 | `src/lib/useSpeechSynthesis.ts` | 8.1 |
| 12 | `src/components/MetisAssistant.tsx` | 24.2 |
| 13 | `src/components/MetisFiscalAdvisor.tsx` | 6.5 |
| 14 | `src/components/MetisAlertsSection.tsx` | 4.8 |
| 15 | `src/components/MetisButtonSnippet.tsx` | 0.8 |
| 16 | `src/components/Navigation.tsx` | 29.3 |
| 17 | `src/components/UI.tsx` | 7 |
| 18 | `src/lib/cronFiscalService.ts` | 4.8 |
| 19 | `src/services/gestoriaExportService.ts` | 4 |
| 20 | `src/services/plateRecognizerService.ts` | 9.5 |
| 21 | `src/lib/uiStateContext.ts` | 0.6 |
| 22 | `src/App.tsx` | 14.6 |

## A. Motor IA METIS (nucleo)

### src/ai/metisTools.ts

```ts
export type MetisTool =
  | 'search_clients'
  | 'get_client'
  | 'search_vehicles'
  | 'get_vehicle'
  | 'search_quotes'
  | 'get_quote'
  | 'search_repairs'
  | 'get_repair'
  | 'search_invoices'
  | 'get_invoice'
  | 'search_supplier_invoices'
  | 'get_supplier_invoice'
  | 'search_incidents'
  | 'get_incident'
  | 'search_appointments'
  | 'search_communications'
  | 'search_accounting_reports'
  | 'get_workshop_case'

export interface MetisAction {
  type: MetisTool
  params: Record<string, unknown>
}

export interface MetisResponse {
  message: string

  actions?: MetisAction[]

  openEntity?: {
    type:
      | 'client'
      | 'vehicle'
      | 'quote'
      | 'repair'
      | 'invoice'
      | 'supplier_invoice'
      | 'incident'
    id: string
  }
}
```

### src/ai/metisActions.ts

```ts
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
```

### src/ai/metisWorkshopCase.ts

```ts
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
```

### src/ai/metisKnowledge.ts

```ts
/**
 * Base de Conocimiento del Taller y Manual de Flujo Operativo para METIS.
 * Proporciona el contexto maestro de dominio para GESTARIAN y el taller piloto DM CAR.
 */

export const METIS_WORKSHOP_KNOWLEDGE = `
GUÍA DE LA APLICACIÓN GESTARIAN (QUÉ ES, CÓMO SE USA Y QUÉ PUEDES HACER TÚ):
- GESTARIAN es un ERP/plataforma web integral para talleres mecánicos y de chapa/pintura. Se usa en PC, tablet y móvil (disponible online en https://gestarian2.web.app y también por WiFi local en el taller). Todo se guarda en una base de datos en la nube (Supabase/PostgreSQL).
- MÓDULOS DEL MENÚ (rutas reales de la app, úsalas para navegar):
  * Inicio (ruta '/') — Panel de resumen y acceso rápido al taller.
  * Expedientes (ruta '/expedientes') — Búsqueda rápida por cliente o matrícula y álbum de fotografías ANTES/DURANTE/DESPUÉS de cada vehículo. El detalle de un expediente está en '/expediente/:vehiculoId'.
  * Clientes (ruta '/clientes') — Base de datos de clientes con sus vehículos, historial de presupuestos, facturas y edición de datos. La ficha de un cliente está en '/cliente-admin/:id'.
  * Presupuestos (ruta '/presupuestos') — Confección de presupuestos en hoja A4 (ruta '/presupuesto-hibrido'), historial con códigos de color y envío por WhatsApp/Email con PDF adjunto. La ficha de un vehículo está en '/vehiculo-admin/:id'.
  * Citas (ruta '/citas') — Calendario de citas, recepción de vehículos y asignación de cita (ruta '/asignar-cita').
  * Reparaciones (ruta '/reparaciones') — Órdenes de reparación, estados del vehículo en taller y enlace directo al presupuesto A4 vinculado (botón azul "P").
  * Facturación (ruta '/facturas') — Emisión de facturas oficiales, conversión de presupuesto aceptado en factura, control de cobros (pagada/parcial/pendiente/impagada) y escáner OCR de facturas/albaranes de proveedores.
  * Balances (ruta '/balances') — Métricas financieras del taller: ingresos, gastos, beneficios e impuestos (IVA) por trimestres.
  * Proveedores (ruta '/proveedores') — Gestión de proveedores y facturas recibidas (gastos del taller).
  * Incidencias (ruta '/incidencias') — Registro y control de incidencias.
  * Usuarios (ruta '/usuarios') — Gestión de usuarios y permisos.
  * Configuración (ruta '/configuracion') — Datos del taller (nombre, CIF, dirección), configuración de IA (proveedor: Gemini por defecto, con fallback OpenRouter/Groq; claves API), OCR documental y reconocimiento de matrículas (Plate Recognizer).
  * Hay además un portal del cliente en la ruta '/cliente/:token'.
- FUNCIONES CLAVE DE LA APP QUE DEBES CONOCER:
  * Dictado por voz (micrófono) para crear presupuestos y capturar conceptos y precios hablando.
  * OCR: lectura automática de facturas y albaranes de proveedores (Tesseract) y lectura de matrículas con la cámara (Plate Recognizer).
  * Generación de PDF A4 vectorial (jsPDF) de presupuestos y facturas y envío directo por WhatsApp o Email al cliente.
  * Expediente Integral 360°: fotos, peritaje, presupuestos, reparaciones, facturas y cobros de un vehículo unificados.
  * Modo móvil: barra inferior con cámara, menú y micrófono; soporte multi-dispositivo por red WiFi local.
  * El usuario accede a la app desde el navegador; no necesita instalar nada.
- MODELO DE DATOS (tablas principales de la base de datos):
  * clientes: id, numero, nombre, dni, telefono, email, direccion, localidad.
  * vehiculos: id, cliente_id, matricula, marca, modelo, codigo_color, vin. (Atención: el color es un CÓDIGO de pintura del fabricante, no un nombre de color.)
  * presupuestos: id, numero (ej. PAA-1234), cliente_id, vehiculo_id, total (IVA incl.), base_imponible, estado (borrador/pendiente/enviado/aceptado/rechazado), fecha, conceptos [{descripcion, cantidad, precio unitario sin IVA}], observaciones.
  * facturas: id, numero (ej. FAC-0001), cliente_id, vehiculo_id, total, base_imponible, estado_cobro (pagada/parcial/pendiente/impagada), conceptos.
  * cobros: id, factura_id, importe, fecha. (Cada abono o pago parcial se registra aquí.)
  * citas: id, cliente_id, vehiculo_id, fecha, hora, estado, observaciones.
  * reparaciones: id, vehiculo_id, cliente_id, estado (pendiente/en_curso/finalizada/entregado), fecha_entrada, fecha_estimada_entrega, descripcion.
  * facturas_recibidas y proveedores: gastos del taller (recambios, pintura, suministros).
  * expediente_imagenes: fotografías por vehículo con contexto (ANTES/DURANTE/DESPUES).
  * configuracion: datos fiscales del taller (nombre_empresa, cif, direccion, telefono, email).
- REGLAS DE NEGOCIO QUE SIEMPRE SE CUMPLEN EN LA APP:
  * IVA general del 21% sobre toda reparación, recambio y mano de obra. Los precios de los conceptos se guardan SIN IVA y el total final lleva el 21% (base_imponible + IVA = total).
  * Ciclo del presupuesto: borrador -> pendiente/enviado -> aceptado o rechazado.
  * Un presupuesto aceptado se puede convertir en factura; de la factura se registran cobros (pago total, señal o abonos parciales).
  * Modelos tributarios trimestrales en España: 1T (Ene-Mar), 2T (Abr-Jun), 3T (Jul-Sep), 4T (Oct-Dic).
- QUÉ PUEDES HACER TÚ, METIS, DENTRO DE LA APP (tu catálogo de acciones):
  * Crear, actualizar, eliminar o aceptar presupuestos (create_presupuesto, update_presupuesto, delete_presupuesto, accept_presupuesto).
  * Programar citas (create_cita), iniciar reparaciones (start_reparacion), crear facturas (create_factura) y registrar cobros (register_cobro).
  * Navegar a cualquier módulo usando las rutas reales listadas arriba (actionResult.navigationPath).
  * Consultar y cruzar datos de clientes, vehículos, presupuestos, facturas, cobros, citas y reparaciones, y responder con precisión.
  * Cuando el jefe de taller te pregunte cómo funciona algo de la app, explícale el módulo correspondiente, dónde está en el menú y cómo se usa. Si te pide ir a una pantalla, navega con la ruta correcta.
  * Cuando pregunte "¿qué puedes hacer?" o "¿cómo funciona la aplicación?", resume esta guía de forma breve y natural (sin listas técnicas largas, pensando en que tu respuesta se leerá por voz).

  * Si pregunta "¿cómo se hace X en la app?" o "¿dónde hago Y?", usa la guía de ACCIONES PÁGINA POR PÁGINA de más abajo: indica en qué pantalla está, qué botón pulsar y qué pasos seguir, y navega a la ruta correcta si te lo pide.

- ACCIONES DE CADA PANTALLA (página por página, qué se puede hacer en cada módulo):
  * INICIO (ruta '/'):
    - Ver los KPIs del taller: ingresos del trimestre y del mes (tocar la tarjeta → /balances), citas programadas de hoy (tocar → /citas) y vehículos en taller / reparaciones en curso (tocar → /reparaciones).
    - Consultar los avisos y alertas de METIS publicados en el panel de control.
    - En móvil, barra inferior con 3 iconos: CÁMARA (abre el flujo de captura/matrícula), MENÚ (navegación completa) y MIC (dictado a METIS).
  * EXPEDIENTES (ruta '/expedientes'):
    - Buscar expediente por número, cliente o matrícula (icono lupa).
    - Crear un nuevo expediente con el botón NUEVO EXPEDIENTE (redirige a /clientes para dar de alta al cliente).
    - Desplegar una tarjeta de expediente para ver el ROADMAP del flujo: Presupuesto → Cita → Reparación → Factura → Cobro. La fase se ve en el borde: naranja = En Proceso, azul = Cobro Parcial, verde = Completado.
    - Avanzar el flujo desde el propio roadmap según la fase: Aceptar presupuesto, Crear cita, Confirmar cita, Enviar a taller (abre la reparación), Finalizar reparación, Generar factura o Ver factura.
    - Accesos directos de cada expediente: ficha del cliente, vehículos del cliente, presupuestos del cliente, facturas del cliente e imágenes del expediente (visor con cámara).
    - Eliminar un expediente manteniendo pulsada la tarjeta y confirmando.
  * DETALLE DE EXPEDIENTE (ruta '/expediente/:vehiculoId'):
    - Ver el roadmap completo y las ACCIONES DISPONIBLES según la fase: Crear Presupuesto, Ver Presupuesto, Crear Cita, Abrir/Gestionar Reparación, Generar Factura o Ver Factura.
    - Consultar los datos del cliente (nombre, teléfono, email) y del vehículo (matrícula, marca/modelo, VIN) e ir a su ficha (Cliente → /cliente-admin/:id, Vehículo → /vehiculo-admin/:id).
    - Ver, añadir y borrar fotografías del expediente.
  * CLIENTES (ruta '/clientes'):
    - Buscar clientes por nombre, DNI, teléfono, dirección o matrícula.
    - NUEVO CLIENTE: nombre (obligatorio), DNI/NIF, teléfono, email, dirección y código postal (autocompleta la localidad); opcionalmente el primer vehículo (matrícula, marca, modelo, código de color, VIN). Dos botones: "Guardar Cliente" o "Guardar Cliente y generar presupuesto".
    - Al desplegar un cliente salen 8 accesos: 1) Nuevo presupuesto (abre /presupuestos con el formulario), 2) Expedientes del cliente, 3) Editar datos del cliente (nombre, DNI, teléfono, email, dirección + Guardar cambios), 4) Llamar (marca el teléfono), 5) Historial de presupuestos, 6) WhatsApp del cliente, 7) Vehículos y 8) Facturas.
    - Subpanel Vehículos: Añadir vehículo (matrícula obligatoria, marca, modelo, código de color, VIN), ver imágenes del vehículo y Eliminar vehículo con confirmación.
    - Subpanel Presupuestos: ver un presupuesto (abre la hoja A4), Aceptar presupuesto, y desde el visor Enviar por Email, enviar por WhatsApp o Imprimir/PDF.
    - Subpanel Facturas: Nueva factura (botón +F → /facturas) y ver facturas del cliente por número.
  * FICHAS DE CLIENTE Y VEHÍCULO (rutas '/cliente-admin/:id' y '/vehiculo-admin/:id'):
    - Portal de seguimiento con pestañas: Seguimiento, Fotos, Presupuestos, Facturas, Notas y Citas.
    - Solicitar una cita nueva (fecha deseada, hora preferida y motivo/observaciones) y ver el estado de las citas (pendiente/confirmada/completada/cancelada).
    - Ver el estado de la reparación, las fotos del vehículo, las notas visibles del taller y descargar/imprimir presupuestos y facturas.
  * PRESUPUESTOS (ruta '/presupuestos'):
    - Buscar presupuestos por número, cliente o matrícula.
    - Crear un presupuesto en hoja A4: seleccionar cliente y vehículo, añadir líneas de concepto (descripción, cantidad y precio), observar el total con IVA 21% (conmutable), añadir observaciones, borrar líneas y dictar conceptos por voz (micrófono).
    - GUARDAR el presupuesto (genera número tipo PAA-XXXX y el número de expediente).
    - Enviar por EMAIL, enviar por WHATSAPP (con PDF adjunto), IMPRIMIR.
    - Ver imágenes del expediente (añadir fotos al presupuesto) y abrir el expediente completo / roadmap.
    - Editar un presupuesto guardado pulsando el icono de la hoja (P). Colores de estado: naranja = pendiente, azul = enviado, verde = aceptado.
  * PRESUPUESTO HÍBRIDO (ruta '/presupuesto-hibrido'):
    - Capturar la matrícula con la cámara (OCR de matrículas) o escribirla manualmente.
    - Confirmar la matrícula: comprueba en la base de datos si el vehículo/cliente ya existe.
    - Captura continua de fotos: "Tomar Foto del Trabajo" y "Capturar Permiso / Ficha Técnica" (OCR de documentos).
    - Si el cliente no existe, alta rápida (nombre, teléfono, email, dirección, CP) y "Guardar y Abrir Presupuesto A4" (crea el cliente y abre el presupuesto con las fotos).

  * CITAS (ruta '/citas'):
    - Crear la cita desde un presupuesto aceptado (propone fecha y hora, saltando fines de semana, con modal de confirmación).
    - Ver el expediente, los presupuestos del cliente y las imágenes de la cita.
    - Eliminar una cita manteniéndola pulsada 3 segundos y confirmando.
  * ASIGNAR CITA (ruta '/asignar-cita'):
    - Elegir día en el calendario mensual, navegar entre meses y seleccionar hora en la rueda de 15 minutos (07:00 a 21:00), con botón ASIGNAR CITA.
  * REPARACIONES (ruta '/reparaciones'):
    - Ver las órdenes de reparación con su estado (borde ámbar = pendiente, azul = en proceso, verde = finalizada).
    - Accesos directos: expediente, presupuesto vinculado (o presupuestos del cliente) e imágenes de la reparación.
    - Eliminar una reparación manteniéndola pulsada 3 segundos y confirmando. (El avance de estados se hace desde el roadmap del expediente.)
  * FACTURACIÓN (ruta '/facturas'):
    - Pestañas EMITIDAS y RECIBIDAS. Filtrar por trimestre y por estado (pagada, pago parcial, impagada, sin enviar, enviada). Buscar facturas.
    - Generar factura desde una reparación finalizada o presupuesto: se crea un borrador FAC-XXXX editable (conceptos, cantidades, precios, observaciones) y se CONFIRMA para guardarla en el sistema.
    - Control de cobro: registrar un ABONO PARCIAL (importe), ABONAR TODO (saldo completo), ver el historial de abonos y el saldo pendiente.
    - Enviar la factura por EMAIL, por WHATSAPP (PDF adjunto) o IMPRIMIR; ver imágenes del expediente y el expediente/roadmap.
    - Registro de Facturas: modal que lista todas las facturas para abrirlas.
    - Facturas Recibidas (proveedores): nueva factura con OCR (escáner), número, proveedor, fecha, estado (pendiente/pagada/vencida), base imponible e IVA; marcar como pagada y eliminar.
  * BALANCES (ruta '/balances'):
    - Ver los últimos 4 trimestres: ingresos, gastos, beneficio, IVA repercutido, IVA soportado y diferencia de IVA, con gráfico de barras.
    - Cambiar el tipo de empresa: autónomo (20%) o sociedad limitada (25%) para estimar el importe fiscal.
    - ENVIAR INFORME A GESTORÍA (al email configurado en /configuracion).
    - Exportación contable avanzada: fichero EXCEL (CSV), A3 Software o SAGE 50 / Contaplus, por trimestre y con opción de excluir los 10 primeros días.
    - Ver facturas emitidas y recibidas por trimestre, e ir a Facturas Recibidas.
    - Consultar al Asesor Fiscal de METIS.
  * PROVEEDORES (ruta '/proveedores'):
    - Añadir proveedor (nombre obligatorio, CIF, contacto, teléfono, email, dirección), buscar y eliminar proveedores.
  * INCIDENCIAS (ruta '/incidencias'):
    - Registrar una incidencia (título obligatorio, descripción, prioridad baja/media/alta/urgente, asignado a y cliente/vehículo opcionales).
    - Filtrar por estado y prioridad, ver contadores de abiertas y urgentes, iniciarla (abierta → en proceso), resolverla (guardar resolución → resuelta) y eliminarla.
  * USUARIOS (ruta '/usuarios'):
    - Crear usuarios (nombre y email obligatorios) con rol operario/jefe/admin y permisos: puede editar precios en presupuestos y puede enviar informes a gestoría.
    - Activar o quitar permisos desde la lista y eliminar usuarios.
  * CONFIGURACIÓN (ruta '/configuracion'):
    - Datos fiscales del taller: nombre de la empresa, CIF/NIF, dirección, teléfono y email.
    - Ayudante IA GESTARIAN: proveedor (Gemini/Groq/OpenAI), modelo, clave API, probar conexión y guardar.
    - OCR de facturas y documentos: proveedor (Gemini/Tesseract), modelo, clave API y prueba.
    - OCR de matrículas: Plate Recognizer (clave API, endpoint y prueba).
    - Almacenamiento de fotos y documentos: Supabase Storage (bucket gestarian-files), estructura clientes/cliente_id/vehiculo_id/expediente_id.
    - Proveedor IA alternativo/fallback: OpenRouter (gratuito, DeepSeek/Llama) o Groq; activar el interruptor, clave API y prueba.
    - Personalización de la interfaz: colores de texto (títulos, principales, inputs, secundarios, tarjetas) y presets visuales (clásico, profesional, oscuro, azul, verde, naranja, premium).
    - Comunicaciones y Gestoría: email de gestoría y modal de Historial de Envíos.
    - Administración: acceso directo a la gestión de Usuarios.
    - Zona de Peligro: borrado de datos (exige escribir RESET).
  * PORTAL DEL CLIENTE (ruta '/cliente/:token'):
    - El cliente puede ver el seguimiento de su vehículo (estado de la reparación), fotos, presupuestos, facturas, notas del taller visibles y sus citas, solicitar cita (fecha, hora, motivo) y descargar/imprimir sus documentos.

MANUAL DE DOMINIO, PEDAGOGÍA DE TALLER Y REGLAS DE LENGUAJE PARA METIS (GESTARIAN / DM CAR):

1. IDENTIDAD LINGÜÍSTICA Y PEDAGÓGICA:
   - Idioma: Español de España (Castellano de Castilla / Valladolid / Madrid) impecable, culto, natural y directo.
   - Trato: Profesional, cercano, con la autoridad y seguridad de un jefe de taller veterano y un maestro de gestión empresarial.
   - Pronunciación y Voz: Frases fluidas, claras, sin tecnicismos informáticos innecesarios, sin listas de símbolos raros para que el motor de voz (TTS) hable de forma completamente humana y natural.
   - Capacidad Pedagógica: Cuando se le pregunte sobre el funcionamiento de una pieza, un proceso de reparación, una duda contable o un trámite fiscal, explica con total claridad el porqué de cada cosa, dando consejos prácticos de taller.

2. FLUJO COMPLETO DE OPERACIONES EN GESTARIAN (TALLER PILOTO DM CAR):
   - FASE 1: RECEPCIÓN Y ENTRADA DE VEHÍCULO
     * Recepción con cita previa o entrada directa por avería/accidente.
     * Identificación rápida por matrícula mediante OCR (Plate Recognizer) o búsqueda en base de datos.
     * Si es cliente nuevo: alta del titular (Nombre completo, DNI/CIF, Teléfono, Dirección) y registro del vehículo (Matrícula, Marca, Modelo, Código de Color de pintura, VIN/Bastidor).
   
   - FASE 2: PERITACIÓN Y PRESUPUESTO (HOJA DE TRABAJO A4)
     * Documentación visual: fotografías de los daños, estado general del coche y permiso de circulación o ficha técnica.
     * Desglose técnico de conceptos:
       - Chapa y Pintura: Mano de obra de conformado/desabollado, desmontaje/montaje de guarnecidos, masillado, imprimación y aplicación de pintura y barniz bicapa/tricapa (Capó, Paragolpes delantero y trasero, Aletas, Puertas, Techo, Portón, Molduras, Espejos).
       - Mecánica y Mantenimiento: Sustitución de aceite de motor y filtros (aceite, aire, habitáculo, combustible), sistema de frenado (pastillas, discos, líquido de frenos), kit de distribución con bomba de agua, kit de embrague, amortiguadores y alineación de dirección.
     * Ciclo del Presupuesto: 'borrador' -> 'enviado' (por WhatsApp con PDF adjunto o Email) -> 'aceptado' o 'rechazado'.

   - FASE 3: ORDEN DE REPARACIÓN Y SEGUIMIENTO TÉCNICO
     * Al aprobarse el presupuesto, se genera la Orden de Reparación vinculada al expediente.
     * Estados de Reparación:
       - 'pendiente': Esperando llegada de recambios o hueco en cabina/elevador.
       - 'en_curso': Vehículo en bancada, preparación, cabina de pintura o montaje.
       - 'finalizada': Trabajo completado, control de calidad y limpieza del vehículo.
       - 'entregado': Vehículo entregado al cliente con conformidad.
     * Registro fotográfico del proceso intermedio para garantía y transparencia ante el cliente.

   - FASE 4: FACTURACIÓN, VENCIMIENTOS Y CONTROL DE COBRO
     * Emisión de Factura legal con número correlativo (ej: FAC-0001), fecha y desglose de Base Imponible + IVA (21%).
     * Control exhaustivo de Cobro:
       - 'pagada': Cobro íntegro liquidado (efectivo, tarjeta o transferencia).
       - 'parcial': Entrega a cuenta o señal recibida, registrando los abonos y calculando el saldo pendiente.
       - 'pendiente': Factura emitida sin cobro registrado.
       - 'impagada': Alerta cuando supera el plazo de cortesía (7 a 30 días tras emisión o entrega).
     * Facturas Recibidas (Gastos): Registro y lectura OCR con Gemini Multimodal de albaranes y facturas de distribuidores de pintura, recambios y suministros de taller.

3. COMPRENSIÓN TOTAL DEL ESPAÑOL DE ANDALUCÍA Y ANDALUZ PROFUNDO:
   - El usuario o jefe de taller puede dictar u ordenar en andaluz cerrado, rápido o coloquial. METIS debe descifrar e interpretar la intención con un 100% de precisión:
     * Ceceo y Seseo: Intercambio de 's' y 'c/z' (ej: "haser un presupueshto", "er coche de Manolo", "sieca/cieca").
     * Aspiración y pérdida de 's' y consonantes finales: 'loh frenoh' (los frenos), 'to' (todo/todos), 'pa' (para), 'la ruah' (las ruedas), 'er capó' (el capó).
     * Elisiones y contracciones habituales:
       - "vi a mirá" -> Voy a mirar.
       - "pár coche" o "par buga" -> Para el coche / vehículo.
       - "man dicho" -> Me han dicho.
       - "endeluego" -> Desde luego.
       - "illo / pisha / quillo" -> Vocativo de confianza (ignorar o tratar con cercanía).
       - "ar favó de mirá" -> Haz el favor de mirar.
       - "ar talleh" -> Al taller.
       - "arreglá er parachoques/paragorpe" -> Reparar/Pintar paragolpes.
       - "cambiá er aseite y loh filtroh" -> Mantenimiento de aceite y filtros.
       - "cuánto le cobramo ar gachó/ar Manolo" -> Cuánto se le cobró al cliente.
     * Pérdida de la 'd' intervocálica: "pintao" (pintado), "terminao" (terminado), "cobrao" (cobrado), "reparao" (reparado), "abonao" (abonado).
     * Interpretación Fonética del Dictado por Voz (STT): Los reconocedores de voz a menudo transcriben fonéticamente palabras deformadas. METIS debe reconstruir la frase lógica en el contexto del taller sin confundirse ni pedir aclaraciones obvias.

4. CONOCIMIENTOS FISCALES Y DE GESTORÍA EN ESPAÑA:
   - IVA general del 21% en todas las reparaciones, recambios y mano de obra.
   - Modelos tributarios: Trimestres 1T (Enero-Marzo), 2T (Abril-Junio), 3T (Julio-Septiembre), 4T (Octubre-Diciembre).
   - Exportación automatizada a Gestoría en formatos compatibles con A3, SAGE y Excel.

6. ESPECIALIZACIÓN MAESTRA EN ELABORACIÓN DE PRESUPUESTOS Y DICTADO INTELIGENTE:
   - REGLAS DE SENTIDO COMÚN Y LÓGICA DE TALLER:
     * PINTADO COMPLETO DEL VEHÍCULO:
       - Si el usuario dice "pintar el coche entero", la cantidad es SIEMPRE 1 unidad. No se pregunta jamás cuántos coches son.
       - Concepto: "Pintado completo de vehículo (desmontaje, preparación y aplicación de pintura bicapa)".
     * NEUMÁTICOS Y RUEDAS:
       - Si el usuario pide sustituir neumáticos sin especificar cantidad, METIS DEBE PREGUNTAR amablemente si son 2 (eje delantero / eje trasero) o los 4 neumáticos, y la medida o marca si la conoce.
       - Si especifica precio por unidad, desglosa: "Neumático (Unidades: X, Precio/ud: Y€)".
     * PASTILLAS Y DISCOS DE FRENO:
       - Especificar si es juego delantero o juego trasero.
     * DISTRIBUCIÓN Y EMBRAGUE:
       - Siempre 1 kit (Kit de distribución con bomba de agua / Kit de embrague bimasa o monomasa).
     * ACEITE Y FILTROS:
       - 1 servicio de mantenimiento o desglose de filtro de aceite, filtro de aire, filtro de polen y litros de lubricante sintético.

   - COLOCACIÓN DE CONCEPTOS Y PRECIOS:
     * Estructura cada concepto con: "descripcion" clara y profesional, "cantidad" (número entero o decimal) y "precio" (precio unitario sin IVA).
     * Si el usuario proporciona un precio total cerrado (ej: "por 1300 euros"), METIS asigna la base imponible adecuada o el concepto principal con ese importe exacto para que el total coincida a la perfección.
     * Si faltan datos clave (ej: precio no mencionado o unidades dudosas en piezas múltiples), METIS crea el presupuesto con lo disponible o pregunta de forma concisa y rápida al jefe de taller para afinar el número exacto.
7. CAPACIDAD VISIONARIA, RITMO DE TRABAJO Y PREVENCIÓN DE RETRASOS EN TALLER:
   - MONITORIZACIÓN ACTIVA DE AGENDA Y CITAS:
     * METIS sabe en todo momento qué coches tienen cita hoy o en los próximos días, a qué hora llegan y qué motivo de avería/revisión tienen registrado.
     * Si el jefe de taller pregunta por la jornada ("¿Cómo tenemos el día hoy?"), METIS hace un resumen conciso: horas de entrada de vehículos, clientes citados y disponibilidad de elevadores/cabina.

   - CONTROL DEL RITMO Y PREVENCIÓN DE SATURACIÓN:
     * Si hay más de 5-6 reparaciones activas o cabinas comprometidas para la misma fecha, METIS aconseja visionariamente escalonar las nuevas citas o dar fecha con 24-48 horas de margen para evitar cuellos de botella y coches parados en patio.
   
   - DETECCIÓN Y AVISO DE VEHÍCULOS ESTANCADOS (CUELLOS DE BOTELLA):
     * Criterio de Alerta:
       - Mecánica rápida (mantenimiento/frenos): Más de 2 días en taller -> Alerta por posible falta de recambio.
       - Chapa y Pintura ligera (paragolpes/aletas): Más de 3-4 días en taller -> Alerta de preparación/secado.
       - Golpe estructural / Pintura completa: Más de 7-10 días -> Alerta de seguimiento con perito o desmontaje.
     * METIS avisa de forma preventiva al jefe de taller para que contacte al perito, reclame la pieza al distribuidor o informe al cliente antes de que este llame preocupado.
`

export function getMetisKnowledgePrompt(): string {
  return METIS_WORKSHOP_KNOWLEDGE.trim()
}
```

### src/Metis/executeMetisAction.ts

```ts
export { executeMetisAction } from '../ai/metisActions'
```

### src/Metis/metisWorkshopCase.ts

```ts
export { getWorkshopCase } from '../ai/metisWorkshopCase'
export type { WorkshopCaseResult } from '../ai/metisWorkshopCase'
```

### src/lib/metisAiEngine.ts

````ts
import { supabase } from './supabase'
import { parseVoiceToConceptos } from './useVoice'
import type { Concepto } from './types'
import { geminiSupportsSystemInstruction } from './geminiCompat'
import OpenAI from 'openai'

export interface MetisContext {
  tipo: 'presupuesto' | 'cita' | 'reparacion' | 'factura' | 'cliente' | 'vehiculo'
  id?: string
  numero?: string
  matricula?: string
  cliente_nombre?: string
  data?: any
}

export interface MetisActionResult {
  type: 'presupuesto_creado' | 'presupuesto_actualizado' | 'presupuesto_aceptado' | 'cita_creada' | 'reparacion_actualizada' | 'busqueda_realizada' | 'info'
  title: string
  details: string
  item?: any
  navigationPath?: string
  actions?: { label: string; onClickEvent: string; payload?: any }[]
}

export interface MetisResponse {
  text: string
  actionResult?: MetisActionResult
}

export function extractMatricula(text: string): string | null {
  const clean = text.toUpperCase().replace(/\s+/g, ' ')
  const matchStandard = clean.match(/\b(\d{4})\s*([B-DF-HJ-NP-TV-Z]{3})\b/)
  if (matchStandard) return `${matchStandard[1]}${matchStandard[2]}`
  const matchProv = clean.match(/\b([A-Z]{1,2})\s*(\d{4})\s*([A-Z]{1,2})\b/)
  if (matchProv) return `${matchProv[1]}${matchProv[2]}${matchProv[3]}`
  const matchLoose = clean.match(/MATR[IÍ]CULA\s*([A-Z0-9\s]{4,10})/i)
  if (matchLoose) {
    const raw = matchLoose[1].replace(/\s+/g, '')
    if (raw.length >= 6) return raw.slice(0, 7)
  }
  return null
}

function extractConceptosFromParagraph(text: string): Concepto[] {
  const simpleParsed = parseVoiceToConceptos(text)
  if (simpleParsed.length > 0 && simpleParsed.some(c => c.precio > 0)) return simpleParsed

  const conceptos: Concepto[] = []
  const lower = text.toLowerCase()
  const wordToNum: Record<string, number> = {
    cien: 100, ciento: 100, doscientos: 200, trescientos: 300, cuatrocientos: 400, quinientos: 500,
    diez: 10, veinte: 20, treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90,
    'ciento veinte': 120, 'ciento cincuenta': 150, 'ciento ochenta': 180, 'doscientos cincuenta': 250
  }
  const items = lower.split(/(?:,|\by\b|\btambién\b|\bademás\b)/)
  for (const part of items) {
    const trimmed = part.trim()
    if (!trimmed) continue
    let price = 0
    const digitMatch = trimmed.match(/(\d+(?:[.,]\d+)?)\s*(?:euros?|€)?/)
    if (digitMatch) {
      price = parseFloat(digitMatch[1].replace(',', '.'))
    } else {
      for (const [w, val] of Object.entries(wordToNum)) {
        if (trimmed.includes(w)) { price = val; break }
      }
    }
    let desc = trimmed
      .replace(/\b(le vamos a cobrar|vamos a cobrar|cobrar|euros?|€|por|el|la|los|las|un|una|para|pintar|reparar|cambiar)\b/gi, ' ')
      .replace(/\d+/g, '')
      .replace(/\s+/g, ' ')
      .trim()

    if (trimmed.includes('capó')) desc = 'Pintar capó'
    else if (trimmed.includes('paragolpes delantero') || trimmed.includes('parachoques delantero')) desc = 'Pintar paragolpes delantero'
    else if (trimmed.includes('paragolpes trasero') || trimmed.includes('parachoques trasero')) desc = 'Pintar paragolpes trasero'
    else if (trimmed.includes('aleta')) desc = 'Reparar/Pintar aleta'
    else if (trimmed.includes('puerta')) desc = 'Reparar/Pintar puerta'
    else if (trimmed.includes('aceite')) desc = 'Cambio de aceite y filtro'
    else if (trimmed.includes('frenos')) desc = 'Sustitución de frenos'
    else if (desc.length > 2) desc = desc.charAt(0).toUpperCase() + desc.slice(1)

    if (desc && price > 0) conceptos.push({ descripcion: desc, cantidad: 1, precio: price })
  }
  if (conceptos.length === 0) {
    const numbers = text.match(/\d+/g)
    if (numbers && numbers.length > 0) conceptos.push({ descripcion: 'Trabajo de taller', cantidad: 1, precio: parseFloat(numbers[0]) })
  }
  return conceptos
}

import { getMetisKnowledgePrompt } from '../ai/metisKnowledge'
import { getWorkshopCase } from '../ai/metisWorkshopCase'

// Obtener snapshot completo de datos del taller piloto para consulta cruzada de METIS
async function getFullWorkshopSnapshot(userText?: string): Promise<string> {
  try {
    // Si la pregunta incluye una matrícula o nombre, enriquecer con el caso específico
    let specificCaseInfo = ''
    if (userText) {
      const mat = extractMatricula(userText)
      const caseData = await getWorkshopCase(mat || userText)
      if (caseData) {
        specificCaseInfo = `\n--- DETALLE PROFUNDO DEL CASO CONSULTADO ---\n${caseData.resumenTexto}\n`
      }
    }

    const [
      { data: clientes },
      { data: vehiculos },
      { data: presupuestos },
      { data: facturas },
      { data: cobros },
      { data: citas },
      { data: reparaciones },
      { data: config }
    ] = await Promise.all([
      supabase.from('clientes').select('id, numero, nombre, dni, telefono, email, direccion, localidad').limit(50),
      supabase.from('vehiculos').select('id, cliente_id, matricula, marca, modelo, codigo_color, vin').limit(50),
      supabase.from('presupuestos').select('id, numero, cliente_id, vehiculo_id, total, base_imponible, estado, fecha, conceptos, observaciones, created_at').order('created_at', { ascending: false }).limit(40),
      supabase.from('facturas').select('id, numero, cliente_id, vehiculo_id, total, base_imponible, estado_cobro, fecha, conceptos, created_at').order('created_at', { ascending: false }).limit(40),
      supabase.from('cobros').select('id, factura_id, importe, fecha').order('fecha', { ascending: false }).limit(30),
      supabase.from('citas').select('id, cliente_id, vehiculo_id, fecha, hora, estado, observaciones').order('fecha', { ascending: true }).limit(30),
      supabase.from('reparaciones').select('id, vehiculo_id, cliente_id, estado, fecha_entrada, fecha_estimada_entrega, descripcion, created_at').in('estado', ['pendiente', 'en_curso']).limit(30),
      supabase.from('configuracion').select('nombre_empresa, cif, direccion, telefono, email').eq('id', 1).maybeSingle()
    ])

    // Análisis del ritmo de taller y vehículos retrasados
    const now = new Date()
    const reparacionesRetrasadas = (reparaciones || []).map(r => {
      const entrada = new Date(r.fecha_entrada || r.created_at)
      const diasEnTaller = Math.floor((now.getTime() - entrada.getTime()) / (1000 * 60 * 60 * 24))
      return { ...r, diasEnTaller }
    }).filter(r => r.diasEnTaller >= 4) // alerta si lleva 4 o más días

    return `
${getMetisKnowledgePrompt()}

--- BASE DE DATOS Y ESTADO OPERATIVO DEL TALLER (DM CAR / GESTARIAN) ---
TALLER: ${config?.nombre_empresa || 'DM CAR'} (CIF: ${config?.cif || '—'}, Dir: ${config?.direccion || '—'})
${specificCaseInfo}
CAPACIDAD Y RITMO ACTUAL:
- Vehículos actualmente en reparación activa: ${reparaciones?.length || 0}
- Citas próximas agendadas: ${citas?.length || 0}
${reparacionesRetrasadas.length > 0 ? `ALERTA DE RETRASO EN TALLER:\n${reparacionesRetrasadas.map(r => `* Reparación #${r.id} (VehID: ${r.vehiculo_id}) lleva ${r.diasEnTaller} DÍAS en taller (${r.descripcion || 'Sin descripción'}).`).join('\n')}` : 'Todos los vehículos en taller están dentro del plazo normal.'}

CITAS AGENDADAS (${citas?.length || 0}):
${(citas || []).map(ct => `- Cita [ClienteID: ${ct.cliente_id}, VehID: ${ct.vehiculo_id}]: Fecha: ${ct.fecha} ${ct.hora || ''}, Estado: ${ct.estado}, Obs: ${ct.observaciones || '—'}`).join('\n')}

REPARACIONES EN CURSO (${reparaciones?.length || 0}):
${(reparaciones || []).map(r => `- Reparación #${r.id} [VehID: ${r.vehiculo_id}]: Estado: ${r.estado}, Entrada: ${r.fecha_entrada || r.created_at}, Descr: ${r.descripcion || '—'}`).join('\n')}

CLIENTES REGISTRADOS (${clientes?.length || 0}):
${(clientes || []).map(c => `- Cliente #${c.numero} [ID: ${c.id}]: "${c.nombre}", Tel: ${c.telefono || '—'}, DNI: ${c.dni || '—'}, Dir/Loc: ${c.direccion || ''} ${c.localidad || ''}`).join('\n')}

VEHÍCULOS (${vehiculos?.length || 0}):
${(vehiculos || []).map(v => `- Vehículo [ID: ${v.id}, ClienteID: ${v.cliente_id}]: Matrícula: ${v.matricula}, ${v.marca || ''} ${v.modelo || ''}, Color: ${v.codigo_color || '—'}, VIN: ${v.vin || '—'}`).join('\n')}

PRESUPUESTOS RECIENTES (${presupuestos?.length || 0}):
${(presupuestos || []).map(p => `- Presupuesto ${p.numero} [ClienteID: ${p.cliente_id}, VehID: ${p.vehiculo_id}]: Fecha: ${p.fecha || p.created_at}, Total: ${p.total}€, Estado: ${p.estado}. Conceptos: ${JSON.stringify(p.conceptos || [])}`).join('\n')}

FACTURAS EMITIDAS Y COBROS (${facturas?.length || 0}):
${(facturas || []).map(f => {
      const facCobros = (cobros || []).filter(c => c.factura_id === f.id)
      const totalCobrado = facCobros.reduce((acc, c) => acc + (Number(c.importe) || 0), 0)
      return `- Factura ${f.numero} [ClienteID: ${f.cliente_id}, VehID: ${f.vehiculo_id}]: Fecha: ${f.fecha || f.created_at}, Total: ${f.total}€ (Cobrado: ${totalCobrado}€ - Estado: ${f.estado_cobro}). Conceptos: ${JSON.stringify(f.conceptos || [])}`
    }).join('\n')}
------------------------------------------------------------
`
  } catch (e) {
    console.warn('No se pudo cargar el snapshot completo de la BD para METIS:', e)
    return '--- Base de datos no disponible temporalmente ---'
  }
}

// ── NORMALIZADOR DE HABLA ANDALUZA ──
const MAPAS_ANDALUZ: [RegExp, string][] = [
  // Acortamientos típicos del andaluz
  [/\bpo\b/gi, 'pues'],
  [/\bpa\b/gi, 'para'],
  [/\bto\b/gi, 'todo'], [/\bna\b/gi, 'nada'], [/\bmu\b/gi, 'muy'],
  [/\bto[áa]v[ií]a\b/gi, 'todavía'], [/\btav[ií]a\b/gi, 'todavía'], [/\baluego\b/gi, 'luego'],
  [/\bande\b/gi, 'donde'], [/\bas[ií]n\b/gi, 'así'],
  [/\b(?:quillo|quilla|illo|pisha|mijo|mija|compare|compadre)\b/gi, ''],
  // Verbos y participios con sílaba comida
  [/\bhas[ií]o\b/gi, 'hecho'], [/\bhas[ae]\b/gi, 'hace'], [/\bhasen\b/gi, 'hacen'], [/\bhaser\b/gi, 'hacer'],
  [/\bpintao\b/gi, 'pintado'], [/\barreglao\b/gi, 'arreglado'], [/\bcambiao\b/gi, 'cambiado'],
  [/\bterminao\b/gi, 'terminado'], [/\bdao\b/gi, 'dado'], [/\bcurao\b/gi, 'curado'], [/\bparao\b/gi, 'parado'], [/\bperdao\b/gi, 'perdido'],
  // Ceceo (c por s) y s aspirada/caída
  [/\bdocientos\b/gi, 'doscientos'], [/\bdocientas\b/gi, 'doscientas'], [/\bdocientoc\b/gi, 'doscientos'],
  [/\btrec\b/gi, 'tres'], [/\bseih\b/gi, 'seis'], [/\bdoh\b/gi, 'dos'], [/\bseic\b/gi, 'seis'], [/\bhaserle\b/gi, 'hacerle'],
  [/\bgraciac\b/gi, 'gracias'], [/\bgracioh\b/gi, 'gracias'], [/\bloh\b/gi, 'los'], [/\blah\b/gi, 'las'],
  [/\behto\b/gi, 'esto'], [/\behta\b/gi, 'esta'], [/\behtos\b/gi, 'estos'], [/\behtas\b/gi, 'estas'],
  [/\bnojotr[oa]\b/gi, 'nosotros'], [/\bvojotr[oa]\b/gi, 'vosotros'],
  // Palabras del taller con pronunciación andaluza
  [/\bparagorpe\b/gi, 'paragolpes'], [/\bparagolpeh\b/gi, 'paragolpes'],
  [/\baceiteh\b/gi, 'aceite'], [/\baceit\b/gi, 'aceite'], [/\bfrenoh\b/gi, 'frenos'], [/\bfiltroh\b/gi, 'filtros'],
  [/\bmatricla\b/gi, 'matrícula'], [/\bmatr[íi]cula\b/gi, 'matrícula'], [/\bveiculo\b/gi, 'vehículo'],
  // Ceceo genérico: "c" final de palabra -> "s" (cocheC -> cocheS). Mín. 4 letras + c para NO tocar matrículas tipo "ABC"
  [/\b([a-záéíóúñü]{4,})c\b/gi, '$1s'],
]

export function normalizeAndaluz(text: string): string {
  let out = text
  for (const [re, to] of MAPAS_ANDALUZ) out = out.replace(re, to)
  return out.replace(/\s{2,}/g, ' ').trim()
}

// ── GUARDIA ANTI-IDIOMAS: detecta respuestas fuera del español ──
const RE_CARACTERES_NO_LATINOS = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af\u0400-\u04ff]/
const PALABRAS_INGLESAS = new Set(['the', 'and', 'you', 'your', 'please', 'thank', 'what', 'how', 'this', 'that', 'with', 'have', 'will', 'would', 'should', 'could', 'need', 'make', 'here', 'there', 'from', 'for', 'are', 'was', 'were', 'can', 'about', 'into', 'after', 'before', 'more', 'than', 'just', 'also', 'these', 'those', 'because', 'when', 'where', 'which', 'while', 'their', 'they', 'them', 'then', 'some', 'such', 'only', 'very', 'each', 'may', 'must', 'shall', 'not', 'but', 'has', 'had', 'been', 'being', 'does', 'did', 'all', 'any', 'one', 'two', 'three'])

function esTextoNoEspanol(texto: string): boolean {
  if (!texto) return false
  if (RE_CARACTERES_NO_LATINOS.test(texto)) return true
  const palabras = texto.toLowerCase().split(/[^a-záéíóúñü]+/i).filter(w => w.length > 3)
  if (palabras.length < 4) return false
  const inglesas = palabras.filter(w => PALABRAS_INGLESAS.has(w)).length
  return inglesas / palabras.length > 0.4
}

async function ejecutarConGuardia(
  engine: (u: string) => Promise<MetisResponse>,
  textoLimpio: string
): Promise<MetisResponse | null> {
  try {
    const resp = await engine(textoLimpio)
    if (!esTextoNoEspanol(resp.text)) return resp
    // La IA respondió en un idioma no español: un único reintento pidiendo español
    try {
      const resp2 = await engine(`${textoLimpio}\n[IMPORTANTE: La respuesta anterior no estaba en español de España. Responde de nuevo ÚNICAMENTE en español de España.]`)
      if (!esTextoNoEspanol(resp2.text)) return resp2
      // El modelo insiste en responder fuera del español: devolver una respuesta de seguridad en castellano
      console.warn('[METIS] Respuesta fuera del español en ambos intentos:', resp2.text.slice(0, 160))
      return { text: 'Perdona, se me ha ido el idioma. ¿Me repites la pregunta para responderte en castellano?' }
    } catch (e) { return resp }
  } catch (e: any) {
    console.error('Error en motor IA:', e)
    return null
  }
}


// MAIN ENTRY POINT
export async function processMetisMessage(
  userText: string,
  context?: MetisContext
): Promise<MetisResponse> {
  const textoLimpio = normalizeAndaluz(userText)

  // 1. Google Gemini API key if configured
  const geminiKey = localStorage.getItem('gestarian_gemini_api_key')?.trim()
  if (geminiKey) {
    const r = await ejecutarConGuardia((u) => processWithGemini(geminiKey, u, context), textoLimpio)
    if (r) return r
  }

  // 2. Hugging Face Inference API if configured
  const hfKey = localStorage.getItem('gestarian_hf_api_key')?.trim()
  if (hfKey) {
    const r = await ejecutarConGuardia((u) => processWithHuggingFace(hfKey, u, context), textoLimpio)
    if (r) return r
  }

  // 🕳️ HUECO RESERVADO PARA NUEVA IA ALTERNATIVA
  // Antes aquí estaba Groq (llama-3.3-70b-versatile), fuera de servicio.
  // Para añadir otra IA: usa la función processWithGroq como plantilla
  // (cambia URL/clave/modelo) y añade aquí su bloque igual que Gemini/HF.

  return processWithBasicEngine(textoLimpio, context)
}

// ── GEMINI INFERENCE ENGINE ──
async function processWithGemini(apiKey: string, userText: string, context?: MetisContext): Promise<MetisResponse> {
  const dbSnapshot = await getFullWorkshopSnapshot(userText)

  const systemInstruction = `Eres METIS, el cerebro de inteligencia artificial y asistente experto de GESTARIAN para el taller piloto DM CAR.
Tienes acceso directo y en tiempo real a toda la base de datos operativa del taller (clientes, vehículos, presupuestos, facturas, cobros, citas e histórico de reparaciones).
Conoces a fondo cómo funciona la aplicación GESTARIAN (módulos, rutas reales de navegación, modelo de datos, reglas de negocio y tu propio catálogo de acciones) porque tienes esa guía incluida más abajo. Úsala SIEMPRE: cuando te pregunten cómo funciona la app, cuando te pidan ir a una pantalla y para decidir qué acción ejecutar.

REGLAS DE IDIOMA (INFRANQUEABLES):
- Responde SIEMPRE en Español de España (castellano). NUNCA en inglés, chino ni ningún otro idioma, aunque el usuario hable en otro idioma o con errores de transcripción de voz.
- El usuario puede hablar ANDALUZ: sílabas omitidas ("pa" por "para", "po" por "pues", "to" por "todo"), ceceo (dice "c" en vez de "s") y participios recortados ("hasio" por "hecho"). Interpreta la intención según el contexto del taller y responde SIEMPRE en español normativo y profesional, sin imitar el andaluz.

PERSONALIDAD Y VOZ:
- Hablas un Español de España impecable, natural, fluido y castizo (como alguien culto y directo de Valladolid o Madrid). Nada de tono robótico, nada de "¡Hola! ¿En qué puedo ayudarte hoy?". Ve directo al grano, con seguridad técnica y amabilidad profesional de taller.
- Tu respuesta en el campo "text" será reproducida POR VOZ ALTA con síntesis de voz humana. Por ello, redacta frases naturales, fáciles de escuchar, sin listas de asteriscos, sin código JSON ni signos raros en el texto hablado.
- CRUCE INTELIGENTE DE DATOS: Cuando te pregunten cosas como "¿Cuánto se le cobró por pintar el coche a Manolo el de Fuengirola la semana pasada?", busca en el snapshot de clientes (Manolo/Manuel, Fuengirola), localiza su vehículo, sus facturas o presupuestos y los conceptos de pintura, calcula los importes exactos y responde con total precisión: "A Manolo de Fuengirola se le cobraron 240 euros el martes pasado por el pintado del capó y aleta en la factura FAC-0012."
- Si el usuario te pide crear un presupuesto, cita o navegar, genera la respuesta con el formato JSON:
{
  "text": "Respuesta explicativa en perfecto español de España para ser leída por voz.",
  "actionResult": {
    "type": "presupuesto_creado" | "cita_creada" | "busqueda_realizada" | "info",
    "title": "Título de la acción",
    "details": "Detalles relevantes",
    "navigationPath": "/" | "/presupuestos" | "/presupuesto-hibrido" | "/citas" | "/clientes" | "/cliente-admin/:id" | "/vehiculo-admin/:id" | "/expedientes" | "/expediente/:vehiculoId" | "/reparaciones" | "/facturas" | "/balances" | "/proveedores" | "/incidencias" | "/usuarios" | "/configuracion" | "/asignar-cita" | "/cliente/:token"
- Si es una consulta o conversación, devuelve el JSON con "text" respondiendo directamente con la información cruzada de la base de datos.`

  const aiConfig = localStorage.getItem('gestarian_ai_assistant_config')
  let selectedModel = 'gemini-2.0-flash'
  if (aiConfig) {
    try {
      const parsed = JSON.parse(aiConfig)
      if (parsed.model) selectedModel = parsed.model
    } catch (e) { }
  }

  // La instrucción de sistema se envía en el campo oficial "systemInstruction" de Gemini
  // (NUNCA mezclada dentro del texto del usuario) para que el modelo cumpla siempre
  // el idioma y el formato. Además se refuerza el español justo antes de responder.
  // OJO: los modelos Gemini 1.0 (gemini-pro, gemini-1.0-*) NO soportan ese campo ni
  // responseMimeType: si se envían, el API responde HTTP 400. Para ellos se incrusta
  // la instrucción al inicio del mensaje y se omite responseMimeType (formato legacy).
  const soportaSystem = geminiSupportsSystemInstruction(selectedModel)

  const mensajeUsuarioLegacy = `INSTRUCCIONES DEL SISTEMA (cúmplelas siempre): ${systemInstruction}\n\n---\n\n${dbSnapshot}\n\nContexto UI actual: ${JSON.stringify(context || {})}\n\nPregunta / Orden del jefe de taller: "${userText}"\n\nIMPORTANTE (última instrucción antes de responder): Respóndeme ÚNICAMENTE en español de España (castellano), con frases naturales y breves para ser leídas por voz.`

  const mensajeUsuario = soportaSystem
    ? `${dbSnapshot}\n\nContexto UI actual: ${JSON.stringify(context || {})}\n\nPregunta / Orden del jefe de taller: "${userText}"\n\nIMPORTANTE (última instrucción antes de responder): Respóndeme ÚNICAMENTE en español de España (castellano), con frases naturales y breves para ser leídas por voz.`
    : mensajeUsuarioLegacy

  const bodyGemini: Record<string, any> = {
    contents: [
      { role: 'user', parts: [{ text: mensajeUsuario }] }
    ],
    generationConfig: {
      temperature: 0.2
    }
  }
  if (soportaSystem) {
    bodyGemini.systemInstruction = { parts: [{ text: systemInstruction }] }
    bodyGemini.generationConfig.responseMimeType = 'application/json'
  }

  const urlGemini = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`

  let response = await fetch(urlGemini, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bodyGemini)
  })

  // Si un modelo "compatible" rechaza los campos nuevos (variantes del API),
  // reintentar una vez con el formato legacy incrustado en el mensaje de usuario.
  if (!response.ok && soportaSystem) {
    response = await fetch(urlGemini, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: mensajeUsuarioLegacy }] }],
        generationConfig: { temperature: 0.2 }
      })
    })
  }

  if (!response.ok) {
    const errTxt = await response.text()
    throw new Error(`Gemini API error ${response.status}: ${errTxt}`)
  }

  const data = await response.json()
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  const cleanJsonText = rawText.replace(/```json/g, '').replace(/```/g, '').trim()

  try {
    const parsed = JSON.parse(cleanJsonText)
    // Si el JSON no trae campo "text" ni "respuesta", NUNCA leer el JSON crudo en voz alta:
    // devolver un mensaje corto en castellano.
    let text = parsed.text || parsed.respuesta || 'Hecho, ¿algo más?'
    // Antieco: si Gemini devuelve el prompt/guía completo, recortar a una respuesta breve y natural
    if (typeof text === 'string' && text.length > 6000) {
      text = text.split(/\s+/).slice(0, 400).join(' ') + '...'
    }
    let actionResult = parsed.actionResult

    // Si Gemini generó una acción de creación de presupuesto o similar, ejecutarla en Base de Datos
    if (parsed.action && typeof parsed.action === 'object') {
      const act = parsed.action
      if (act.type === 'create_presupuesto' || act.type === 'presupuesto_creado') {
        // 1. Buscar o vincular cliente
        let targetClienteId: string | null = null
        let targetVehiculoId: string | null = null

        // Buscar por nombre si viene en la orden
        if (act.cliente_nombre || userText) {
          const searchName = act.cliente_nombre || userText.match(/(?:para|a|de)\s+([a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+?)(?:\s+por|\s+pa|\s+con|\s+el|\s+un|\s*\d|$)/i)?.[1]?.trim()
          if (searchName) {
            const { data: matchedClis } = await supabase.from('clientes').select('id, nombre').ilike('nombre', `%${searchName}%`).limit(1)
            if (matchedClis && matchedClis.length > 0) {
              targetClienteId = matchedClis[0].id
            }
          }
        }

        // Si no se encontró por nombre, buscar vehículo
        if (act.matricula || userText) {
          const mat = act.matricula || extractMatricula(userText)
          if (mat) {
            const { data: matchedVehs } = await supabase.from('vehiculos').select('id, cliente_id').ilike('matricula', `%${mat}%`).limit(1)
            if (matchedVehs && matchedVehs.length > 0) {
              targetVehiculoId = matchedVehs[0].id
              if (!targetClienteId) targetClienteId = matchedVehs[0].cliente_id
            }
          }
        }

        // Si aún no hay cliente, usar el primero disponible o crear
        if (!targetClienteId) {
          const { data: firstCli } = await supabase.from('clientes').select('id').limit(1).maybeSingle()
          targetClienteId = firstCli?.id || null
        }

        if (targetClienteId && !targetVehiculoId) {
          const { data: vehList } = await supabase.from('vehiculos').select('id').eq('cliente_id', targetClienteId).limit(1)
          if (vehList && vehList.length > 0) targetVehiculoId = vehList[0].id
        }

        // 2. Extraer conceptos e importes
        let conceptosList = act.conceptos || []
        if (!conceptosList.length) {
          // Extraer precio del texto si no vino estructurado
          const priceMatch = userText.match(/(\d+(?:[.,]\d+)?)\s*(?:€|euro|euros)/i)
          const precio = priceMatch ? parseFloat(priceMatch[1].replace(',', '.')) : 0
          const descMatch = userText.match(/(?:pa|para|de)\s+([a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+?)(?:,\s*el|\s+el|\s*\d|$)/i)
          const descripcion = descMatch ? descMatch[1].trim() : 'Trabajo de chapa y pintura'
          conceptosList = [{ descripcion, cantidad: 1, precio }]
        }

        const subtotal = conceptosList.reduce((acc: number, c: any) => acc + ((Number(c.cantidad) || 1) * (Number(c.precio) || 0)), 0)
        const total = Math.round(subtotal * 1.21 * 100) / 100
        const nextNum = `PAA${Math.floor(1000 + Math.random() * 9000)}`

        const { data: newPres, error: presErr } = await supabase.from('presupuestos').insert({
          numero: nextNum,
          cliente_id: targetClienteId,
          vehiculo_id: targetVehiculoId,
          estado: 'pendiente',
          conceptos: conceptosList.map((c: any) => ({ descripcion: c.descripcion, cantidad: c.cantidad || 1, precio: c.precio || 0 })),
          total,
          base_imponible: subtotal,
          observaciones: act.observaciones || 'Presupuesto generado automáticamente por METIS'
        }).select().single()

        if (!presErr && newPres) {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('gestarian-db-updated', { detail: { type: 'presupuestos' } }))
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('gestarian-open-document', { detail: { id: newPres.id, tipo: 'presupuesto' } }))
            }, 300)
          }

          actionResult = {
            type: 'presupuesto_creado',
            title: `Presupuesto ${nextNum} Creado`,
            details: `Importe Total: ${total.toFixed(2)} € (IVA incl.)`,
            item: newPres,
            navigationPath: '/presupuestos'
          }
        }
      }
    }

    return { text, actionResult }
  } catch (e) {
    return { text: rawText || 'Instrucción procesada con éxito.' }
  }
}


// ── HUGGING FACE INFERENCE ENGINE ──
async function processWithHuggingFace(apiKey: string, userText: string, context?: MetisContext): Promise<MetisResponse> {
  // Choose a sensible default model that is widely available on Hugging Face.
  // `meta-llama/Llama-2-7b-chat` is a high quality open-source chat model (may require acceptance of license on HF).
  // If you prefer a smaller model, override via `gestarian_hf_model` in localStorage.
  const defaultModel = localStorage.getItem('gestarian_hf_model') || 'meta-llama/Llama-2-7b-chat'

  const systemInstruction = `Eres METIS, un asistente experto en gestión empresarial y fiscalidad en España. Responde siempre en español de España y, cuando proceda, produce una salida JSON con la estructura esperada por la app (campo "text" y opcional "action"). Sé conciso, directo y profesional. IMPORTANTE: El usuario puede hablar español de Andalucía. Interpreta el lenguaje coloquial andaluz y sus particularidades fonéticas. No confundas una pronunciación relajada, pérdida o aspiración de sonidos, contracciones o palabras parcialmente pronunciadas con una palabra diferente cuando el contexto permita determinar la intención. Deduce el significado correcto apoyándote en el contexto del taller.`

  // Build a compact prompt combining system + UI context + user text
  const matriculaDetected = extractMatricula(userText) || context?.matricula
  const dbInfoParts: string[] = []
  if (matriculaDetected) dbInfoParts.push(`Matrícula detectada: ${matriculaDetected}`)
  if (context) dbInfoParts.push(`Contexto UI: ${JSON.stringify(context)}`)
  const prompt = `${systemInstruction}\n\n${getMetisKnowledgePrompt()}\n\n${dbInfoParts.join(' | ')}\n\nUsuario: ${userText}`

  const url = `https://api-inference.huggingface.co/models/${defaultModel}`
  const body = {
    inputs: prompt,
    parameters: { max_new_tokens: 512, temperature: 0.2 },
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`Hugging Face API error: ${res.status} ${txt}`)
  }

  const data = await res.json()
  // HF can respond with an array or object; try the common fields
  let textOutput = ''
  if (Array.isArray(data) && data.length > 0 && data[0].generated_text) {
    textOutput = data[0].generated_text
  } else if (data.generated_text) {
    textOutput = data.generated_text
  } else if (typeof data === 'string') {
    textOutput = data
  } else if (Array.isArray(data) && data[0]?.body) {
    textOutput = data[0].body
  } else {
    textOutput = JSON.stringify(data)
  }

  // Try to parse a JSON response from the model; otherwise return plain text
  let parsed: any
  try {
    parsed = JSON.parse(textOutput)
  } catch (e) {
    // If the model didn't return JSON, wrap the reply as text
    return { text: textOutput }
  }

  const text = parsed.text || parsed.respuesta || parsed.mensaje || (typeof parsed === 'string' ? parsed : '')
  const action = parsed.action
  if (action && action.type === 'navigate' && typeof window !== 'undefined' && action.navigationPath) {
    window.dispatchEvent(new CustomEvent('metis-navigate', { detail: { path: action.navigationPath } }))
  }
  return { text: text || (typeof parsed === 'string' ? parsed : 'Entendido.'), actionResult: parsed.actionResult }
}

// ── GROQ ADVANCED ENGINE (Llama 3) ──
// Mantenida como PLANTILLA para futuras IAs alternativas (ver HUECO RESERVADO
// en processMetisMessage). Se exporta para que el compilador no la marque como
// código muerto; cuando se reutilice, puede volver a ser local.
export async function processWithGroq(apiKey: string, userText: string, context?: MetisContext): Promise<MetisResponse> {
  const openai = new OpenAI({
    apiKey: apiKey,
    baseURL: "https://api.groq.com/openai/v1",
    dangerouslyAllowBrowser: true
  })

  const systemInstruction = `Eres METIS, un asistente experto en gestión empresarial, fiscalidad, contabilidad e impuestos en España. Tienes un dominio absoluto de la legislación fiscal, la creación de presupuestos, balances y gestión de autónomos y pymes en España. Eres la inteligencia artificial avanzada de GESTARIAN.

REGLAS DE ORO (ESTRICTAS):
1. Responde con precisión técnica cuando se trate de negocios, fiscalidad, contabilidad o la app, pero mantén un trato fluido, natural y capaz de adaptarte a cualquier otro contexto que el usuario requiera.
2. PROTEGE EL NEGOCIO. Si el usuario pide un descuento abusivo (mayor al 15%), borrar datos masivamente, o acciones financieras perjudiciales, RECHAZA LA ACCIÓN y advierte de que no es beneficioso. Explica por qué.
3. El usuario puede pedirte avanzar en el flujo de trabajo:
   - Crear un presupuesto -> Aceptarlo -> Dar cita -> Comenzar reparación -> Facturar -> Cobrar.
   - Entiende en qué punto está y avanza al siguiente paso si te lo piden (ej: "Pasa esto a reparación", "Crea la factura", "Ha pagado 100€").
4. El usuario puede pedirte abrir un documento (ej: "Abre el presupuesto de la matrícula 1234ABC"). Si es así, responde con action.type = "navigate" y usa targetId si lo tienes.
5. El usuario puede pedir modificar un documento (ej: "modifica pintar techo por pintar capó por 100€"). Aplica el cambio en los conceptos usando "action": "update".
6. DEBES responder SIEMPRE EN ESPAÑOL DE ESPAÑA (CASTELLANO). NUNCA respondas en inglés, chino u otro idioma.
7. DEBES responder SIEMPRE con un JSON VÁLIDO. No incluyas markdown, solo el objeto JSON crudo.
8. ADAPTACIÓN AL HABLA ANDALUZA: El usuario puede hablar español de Andalucía. Interpreta el lenguaje coloquial andaluz y sus particularidades fonéticas. No confundas una pronunciación relajada, pérdida o aspiración de sonidos, contracciones o palabras parcialmente pronunciadas con una palabra diferente cuando el contexto de GESTARIAN permita determinar la intención. Deduce el significado real a partir del contexto (nombres, matrículas, vehículos, piezas, facturación) frente a posibles errores fonéticos en la transcripción de voz.

Estructura del JSON obligatoria:
{
  "text": "Tu respuesta hablada. Debe ser concisa, profesional y directa. Aquí darás la explicación si te niegas a hacer algo.",
  "action": {
    "type": "create_presupuesto" | "update_presupuesto" | "delete_presupuesto" | "accept_presupuesto" | "create_cita" | "start_reparacion" | "create_factura" | "register_cobro" | "navigate" | "none",
    "conceptos": [{"descripcion": "string", "precio": 0, "action": "add" | "update" | "remove"}],
    "matricula": "string (la que encuentres en el texto o contexto)",
    "targetId": "string (el ID del documento a actualizar, eliminar o abrir, si lo conoces)",
    "navigationPath": "string (ej: /presupuestos)",
    "observations": "string",
    "cita_details": {"fecha": "YYYY-MM-DD", "hora": "HH:MM"},
    "cobro_details": {"importe": 0, "metodo": "efectivo" | "tarjeta" | "transferencia"}
  }
}`

  // DB lookup to enrich context
  let dbInfo = ""
  const matriculaDetected = extractMatricula(userText) || context?.matricula
  let vehiculoId: string | null = null
  let clienteId: string | null = null
  let presupuestoActivo = null

  if (matriculaDetected) {
    const { data: veh } = await supabase.from('vehiculos').select('id, matricula, cliente_id, clientes(id, nombre)').ilike('matricula', `%${matriculaDetected}%`).maybeSingle()
    if (veh) {
      vehiculoId = veh.id
      clienteId = veh.cliente_id
      dbInfo += `Vehículo encontrado en DB: Matrícula ${veh.matricula}, Cliente: ${(veh as any).clientes?.nombre}. `
    }
  }

  // Fetch presupuestos for this vehicle if found
  if (vehiculoId) {
    const { data: pres } = await supabase.from('presupuestos').select('*').eq('vehiculo_id', vehiculoId).order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (pres) {
      presupuestoActivo = pres
      dbInfo += `\nÚltimo presupuesto para este vehículo en DB: ID ${pres.id}, Nro ${pres.numero}, Conceptos: ${JSON.stringify(pres.conceptos)}.`
    }
  }

  if (context?.id && context?.tipo === 'presupuesto') {
    const { data: pres } = await supabase.from('presupuestos').select('*').eq('id', context.id).maybeSingle()
    if (pres) {
      presupuestoActivo = pres
      dbInfo += `\nEl usuario tiene ABIERTO en pantalla el presupuesto: ID ${pres.id}, Nro ${pres.numero}, Conceptos: ${JSON.stringify(pres.conceptos)}.`
    }
  }

  const prompt = `Contexto de la interfaz (lo que el usuario está viendo o tocando): ${JSON.stringify(context || 'Ninguno')}
Datos extraídos de la Base de Datos: ${dbInfo || 'No hay datos relevantes previos.'}

Mensaje del usuario: "${userText}"`

  const response = await openai.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: systemInstruction },
      { role: "user", content: prompt }
    ],
    response_format: { type: "json_object" }
  })

  const textOutput = response.choices[0].message.content || "{}"

  let parsed: any
  try {
    parsed = JSON.parse(textOutput)
  } catch (e) {
    console.error("Failed to parse Groq output", textOutput)
    return { text: textOutput.replace(/```json/g, '').replace(/```/g, '').trim() || "Ha ocurrido un error al interpretar la respuesta." }
  }

  // Extract text from text, respuesta, mensaje, or raw object
  const text = parsed.text || parsed.respuesta || parsed.mensaje || (typeof parsed === 'string' ? parsed : "Entendido. ¿En qué más puedo ayudarte?")
  const action = parsed.action
  const actionType = (typeof action === 'object' && action?.type) ? action.type : (typeof action === 'string' ? action : 'none')

  // REJECT / GENERAL CONVERSATION ACTION
  if (actionType === 'none' || !['navigate', 'delete_presupuesto', 'update_presupuesto', 'create_presupuesto', 'accept_presupuesto', 'create_cita', 'start_reparacion', 'create_factura', 'register_cobro'].includes(actionType)) {
    return { text }
  }

  // DISPATCH NAVIGATION / OPEN DOCUMENT
  if (action.type === 'navigate') {
    if (typeof window !== 'undefined') {
      if (action.navigationPath) {
        window.dispatchEvent(new CustomEvent('metis-navigate', { detail: { path: action.navigationPath } }))
      }
      const target = action.targetId || presupuestoActivo?.id
      if (target) {
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('gestarian-open-document', { detail: { id: target, tipo: 'presupuesto' } }))
        }, 300)
      }
    }
    return { text, actionResult: { type: 'info', title: 'Navegación', details: 'Abriendo documento...', navigationPath: action.navigationPath } }
  }

  // DELETE
  if (action.type === 'delete_presupuesto') {
    const pId = action.targetId || presupuestoActivo?.id || context?.id
    if (pId) {
      await supabase.from('presupuestos').delete().eq('id', pId)
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('gestarian-db-updated', { detail: { type: 'presupuestos' } }))
      return { text, actionResult: { type: 'info', title: 'Eliminado', details: 'Presupuesto borrado.', navigationPath: '/presupuestos' } }
    }
    return { text: "No he encontrado el presupuesto a eliminar en la base de datos." }
  }

  // UPDATE
  if (action.type === 'update_presupuesto') {
    const pId = action.targetId || presupuestoActivo?.id || context?.id
    if (pId) {
      const { data: existing } = await supabase.from('presupuestos').select('*').eq('id', pId).maybeSingle()
      if (existing) {
        let nuevos = existing.conceptos || []

        if (action.conceptos && Array.isArray(action.conceptos)) {
          for (const c of action.conceptos) {
            if (c.action === 'add') {
              nuevos.push({ descripcion: c.descripcion, cantidad: 1, precio: c.precio || 0 })
            } else if (c.action === 'remove') {
              nuevos = nuevos.filter((nc: any) => !nc.descripcion.toLowerCase().includes(c.descripcion.toLowerCase()))
            } else if (c.action === 'update') {
              const match = nuevos.find((nc: any) => nc.descripcion.toLowerCase().includes(c.descripcion.toLowerCase()) || c.descripcion.toLowerCase().includes(nc.descripcion.toLowerCase()))
              if (match) {
                match.descripcion = c.descripcion
                if (c.precio > 0) match.precio = c.precio
              } else {
                nuevos.push({ descripcion: c.descripcion, cantidad: 1, precio: c.precio || 0 })
              }
            } else {
              nuevos.push({ descripcion: c.descripcion, cantidad: 1, precio: c.precio || 0 })
            }
          }
        }

        const subtotal = nuevos.reduce((acc: number, c: any) => acc + c.cantidad * c.precio, 0)
        const total = Math.round((subtotal * 1.21) * 100) / 100

        const { data: updated } = await supabase.from('presupuestos').update({
          conceptos: nuevos,
          total,
          observaciones: action.observations || existing.observaciones
        }).eq('id', pId).select().single()

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('gestarian-db-updated', { detail: { type: 'presupuestos' } }))
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('gestarian-open-document', { detail: { id: pId, tipo: 'presupuesto' } }))
          }, 300)
        }

        return {
          text,
          actionResult: {
            type: 'presupuesto_actualizado',
            title: `Presupuesto ${existing.numero} Actualizado`,
            details: `Nuevo total: ${total} €`,
            item: updated,
            navigationPath: '/presupuestos'
          }
        }
      }
    }
    return { text: "No he encontrado el presupuesto para modificar." }
  }

  // CREATE
  if (action.type === 'create_presupuesto') {
    let cId = clienteId
    if (!cId) {
      const { data: firstCliente } = await supabase.from('clientes').select('id, nombre').limit(1).maybeSingle()
      cId = firstCliente?.id
    }

    const subtotal = (action.conceptos || []).reduce((acc: number, c: any) => acc + (1 * c.precio), 0)
    const total = Math.round((subtotal * 1.21) * 100) / 100
    const nextNum = `PAA${Math.floor(1000 + Math.random() * 9000)}`

    const { data } = await supabase.from('presupuestos').insert({
      numero: nextNum,
      cliente_id: cId,
      vehiculo_id: vehiculoId,
      estado: 'pendiente',
      conceptos: (action.conceptos || []).map((c: any) => ({ descripcion: c.descripcion, cantidad: 1, precio: c.precio || 0 })),
      total,
      observaciones: action.observations || 'Generado por METIS'
    }).select().single()

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gestarian-db-updated', { detail: { type: 'presupuestos' } }))
      if (data?.id) {
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('gestarian-open-document', { detail: { id: data.id, tipo: 'presupuesto' } }))
        }, 300)
      }
    }

    return {
      text,
      actionResult: {
        type: 'presupuesto_creado', title: `Presupuesto ${nextNum}`, details: `Total: ${total} €`, item: data, navigationPath: '/presupuestos'
      }
    }
  }

  // ACCEPT PRESUPUESTO
  if (action.type === 'accept_presupuesto') {
    const pId = action.targetId || presupuestoActivo?.id || context?.id
    if (pId) {
      const { data: updated } = await supabase.from('presupuestos').update({ estado: 'aceptado' }).eq('id', pId).select().single()
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('gestarian-db-updated', { detail: { type: 'presupuestos' } }))
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('gestarian-open-document', { detail: { id: pId, tipo: 'presupuesto' } }))
        }, 300)
      }
      return {
        text,
        actionResult: {
          type: 'presupuesto_aceptado',
          title: 'Presupuesto Aceptado',
          details: updated ? `Nro: ${updated.numero}` : '',
          item: updated,
          navigationPath: '/presupuestos'
        }
      }
    }
    return { text: "No he encontrado el presupuesto para aceptar." }
  }

  // CREATE CITA
  if (action.type === 'create_cita') {
    let cId = clienteId
    if (!cId && presupuestoActivo?.cliente_id) cId = presupuestoActivo.cliente_id
    if (!cId) {
      const { data: firstCliente } = await supabase.from('clientes').select('id, nombre').limit(1).maybeSingle()
      cId = firstCliente?.id
    }

    const fecha = action.cita_details?.fecha || new Date().toISOString().split('T')[0]
    const hora = action.cita_details?.hora || '09:00'
    const pId = action.targetId || presupuestoActivo?.id || context?.id || null

    const { data } = await supabase.from('citas').insert({
      cliente_id: cId,
      vehiculo_id: vehiculoId || (presupuestoActivo?.vehiculo_id) || null,
      presupuesto_id: pId,
      fecha: fecha,
      hora: hora,
      estado: 'pendiente',
      observaciones: action.observations || 'Cita programada por METIS'
    }).select().single()

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gestarian-db-updated', { detail: { type: 'citas' } }))
    }

    return {
      text,
      actionResult: {
        type: 'cita_creada',
        title: 'Cita Programada',
        details: `${fecha} a las ${hora}`,
        item: data,
        navigationPath: '/citas'
      }
    }
  }

  // START REPARACION
  if (action.type === 'start_reparacion') {
    let cId = clienteId
    if (!cId && presupuestoActivo?.cliente_id) cId = presupuestoActivo.cliente_id
    if (!cId) {
      const { data: firstCliente } = await supabase.from('clientes').select('id, nombre').limit(1).maybeSingle()
      cId = firstCliente?.id
    }

    const { data } = await supabase.from('reparaciones').insert({
      cliente_id: cId,
      vehiculo_id: vehiculoId || (presupuestoActivo?.vehiculo_id) || null,
      cita_id: context?.tipo === 'cita' ? context.id : null,
      estado: 'en_proceso',
      descripcion: action.observations || 'Iniciada por METIS'
    }).select().single()

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gestarian-db-updated', { detail: { type: 'reparaciones' } }))
    }

    return {
      text,
      actionResult: {
        type: 'info',
        title: 'Reparación Iniciada',
        details: 'En proceso',
        item: data,
        navigationPath: '/reparaciones'
      }
    }
  }

  // CREATE FACTURA
  if (action.type === 'create_factura') {
    let cId = clienteId || presupuestoActivo?.cliente_id
    if (!cId) {
      const { data: firstCliente } = await supabase.from('clientes').select('id').limit(1).maybeSingle()
      cId = firstCliente?.id
    }
    const conceptos = action.conceptos && action.conceptos.length > 0 ? action.conceptos : (presupuestoActivo?.conceptos || [])
    const subtotal = conceptos.reduce((acc: number, c: any) => acc + (c.cantidad * c.precio), 0)
    const total = Math.round((subtotal * 1.21) * 100) / 100

    const year = new Date().getFullYear()
    const prefix = `FAC-${year}-`
    const { data: allFacs } = await supabase.from('facturas').select('numero').like('numero', `${prefix}%`)
    let maxNum = 0
      ; (allFacs || []).forEach((f: any) => {
        const parts = f.numero.split('-')
        if (parts.length === 3) {
          const num = parseInt(parts[2], 10)
          if (!isNaN(num) && num > maxNum) maxNum = num
        }
      })
    const newNum = `${prefix}${(maxNum + 1).toString().padStart(4, '0')}`

    const { data } = await supabase.from('facturas').insert({
      numero: newNum,
      cliente_id: cId,
      vehiculo_id: vehiculoId || (presupuestoActivo?.vehiculo_id) || null,
      conceptos,
      total,
      total_abonado: 0,
      estado_cobro: 'pendiente',
      fecha: new Date().toISOString().split('T')[0]
    }).select().single()

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gestarian-db-updated', { detail: { type: 'facturas' } }))
    }

    return {
      text,
      actionResult: {
        type: 'info',
        title: `Factura ${newNum}`,
        details: `Total: ${total} €`,
        item: data,
        navigationPath: '/facturas'
      }
    }
  }

  // REGISTER COBRO
  if (action.type === 'register_cobro') {
    const importe = action.cobro_details?.importe || 0
    const metodo = action.cobro_details?.metodo || 'efectivo'
    const fId = action.targetId || (context?.tipo === 'factura' ? context.id : null)
    if (fId && importe > 0) {
      const { data: factura } = await supabase.from('facturas').select('*').eq('id', fId).maybeSingle()
      if (factura) {
        const nuevoAbonado = (factura.total_abonado || 0) + importe
        const estadoCobro = nuevoAbonado >= factura.total ? 'pagada' : 'parcial'
        await supabase.from('cobros').insert({
          factura_id: fId,
          importe,
          fecha: new Date().toISOString().split('T')[0],
          metodo
        })
        const { data: updated } = await supabase.from('facturas').update({ total_abonado: nuevoAbonado, estado_cobro: estadoCobro }).eq('id', fId).select().single()

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('gestarian-db-updated', { detail: { type: 'facturas' } }))
          window.dispatchEvent(new CustomEvent('gestarian-db-updated', { detail: { type: 'cobros' } }))
        }
        return {
          text,
          actionResult: {
            type: 'info',
            title: 'Cobro Registrado',
            details: `${importe} € (${metodo})`,
            item: updated,
            navigationPath: '/facturas'
          }
        }
      }
    }
    return { text: "No he encontrado la factura para registrar el cobro, o el importe no es válido." }
  }

  return { text }
}


// ── FALLBACK RULE-BASED ENGINE ──
async function processWithBasicEngine(userText: string, context?: MetisContext): Promise<MetisResponse> {
  const lower = userText.toLowerCase().trim()
  const matriculaDetected = extractMatricula(userText) || context?.matricula

  const isDelete = lower.includes('eliminar') || lower.includes('borrar')
  const isEdit = lower.includes('editar') || lower.includes('modificar') || lower.includes('actualizar') || lower.includes('añadir') || lower.includes('cambiar')

  if (
    lower.includes('presupuesto') ||
    lower.includes('presupuestar') ||
    lower.includes('cotización') ||
    lower.includes('cobrar') ||
    lower.includes('pintar') ||
    lower.includes('reparar') ||
    context?.tipo === 'presupuesto'
  ) {
    if (isDelete && context?.id) {
      await supabase.from('presupuestos').delete().eq('id', context.id)
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('gestarian-db-updated', { detail: { type: 'presupuestos' } }))
      return { text: `Presupuesto eliminado correctamente.`, actionResult: { type: 'info', title: 'Eliminado', details: 'Presupuesto borrado.', navigationPath: '/presupuestos' } }
    }

    const conceptos = extractConceptosFromParagraph(userText)

    if ((isEdit || context?.id) && context?.id && !isDelete) {
      const { data: existing } = await supabase.from('presupuestos').select('*').eq('id', context.id).maybeSingle()
      if (existing) {
        let nuevosConceptos = existing.conceptos || []
        if (conceptos.length > 0) nuevosConceptos = [...nuevosConceptos, ...conceptos]
        const subtotal = nuevosConceptos.reduce((acc: number, c: any) => acc + c.cantidad * c.precio, 0)
        const total = Math.round((subtotal * 1.21) * 100) / 100
        const { data: updated } = await supabase.from('presupuestos').update({ conceptos: nuevosConceptos, total, observaciones: existing.observaciones }).eq('id', context.id).select().single()
        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('gestarian-db-updated', { detail: { type: 'presupuestos' } }))
        return { text: `Presupuesto actualizado. Total: ${total} €.`, actionResult: { type: 'presupuesto_actualizado', title: 'Actualizado', details: `Total: ${total} €`, item: updated, navigationPath: '/presupuestos' } }
      }
    }

    const mat = matriculaDetected || '1234ABC'
    let clienteId = null; let vehiculoId = null
    if (mat) {
      const { data: veh } = await supabase.from('vehiculos').select('id, cliente_id').ilike('matricula', `%${mat}%`).maybeSingle()
      if (veh) { vehiculoId = veh.id; clienteId = veh.cliente_id }
    }
    if (!clienteId) {
      const { data: firstCliente } = await supabase.from('clientes').select('id').limit(1).maybeSingle()
      if (firstCliente) clienteId = firstCliente.id
    }

    const subtotal = conceptos.reduce((acc, c) => acc + c.cantidad * c.precio, 0)
    const total = Math.round((subtotal * 1.21) * 100) / 100
    const nextNum = `PAA${Math.floor(1000 + Math.random() * 9000)}`

    let createdItem = null
    if (clienteId) {
      const { data } = await supabase.from('presupuestos').insert({ numero: nextNum, cliente_id: clienteId, vehiculo_id: vehiculoId, estado: 'pendiente', conceptos, total, observaciones: 'Por voz' }).select().single()
      createdItem = data
    }
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('gestarian-db-updated', { detail: { type: 'presupuestos' } }))
    return { text: `Presupuesto ${nextNum} creado.`, actionResult: { type: 'presupuesto_creado', title: 'Creado', details: `Total: ${total} €`, item: createdItem, navigationPath: '/presupuestos' } }
  }

  if (lower.includes('cita')) return { text: "Cita creada.", actionResult: { type: 'cita_creada', title: "Nueva cita", details: "Pendiente", navigationPath: '/citas' } }
  if (lower.includes('reparación')) return { text: "Reparación en proceso.", actionResult: { type: 'reparacion_actualizada', title: "Estado", details: "En proceso", navigationPath: '/reparaciones' } }
  if (lower.includes('buscar')) return { text: "Buscando...", actionResult: { type: 'busqueda_realizada', title: "Búsqueda", details: "Redirigiendo", navigationPath: '/clientes' } }

  return { text: `Hola, soy METIS. He escuchado: "${userText}". Para acciones complejas debes configurar la API Key en Configuración.` }
}

export async function generateFinancialReport(datosTrimestrales: any[], maxTokens: number = 2000): Promise<string> {
  const { data: config } = await supabase.from('configuracion').select('api_key').eq('id', 1).maybeSingle()
  const apiKey = config?.api_key || localStorage.getItem('groq_api_key')

  if (!apiKey) {
    return "## Error\\n\\nNo se ha configurado la API Key de Groq en la sección de Configuración. No puedo generar el informe."
  }

  const groq = new OpenAI({
    apiKey,
    baseURL: 'https://api.groq.com/openai/v1',
    dangerouslyAllowBrowser: true,
  })

  const systemPrompt = `Eres METIS, el analista financiero experto de GESTARIAN. Se te proporcionará un resumen de los últimos 4 trimestres fiscales del taller.
Tu objetivo es escribir un breve informe ejecutivo en formato Markdown. Analiza los ingresos, gastos, beneficios e IVA.
Destaca:
1. Tendencia de ingresos y gastos.
2. Salud financiera (márgenes).
3. Recomendaciones fiscales u operativas prácticas.
Usa listas y negritas para mejorar la legibilidad. Sé muy profesional, directo y conciso.
REGLA DE ORO: Responde SIEMPRE en Español de España. NUNCA respondas en otro idioma.`

  const prompt = `Estos son los datos trimestrales:\\n${JSON.stringify(datosTrimestrales, null, 2)}\\n\\nGenera el informe.`

  try {
    const res = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      max_tokens: maxTokens,
      temperature: 0.3
    })

    return res.choices[0]?.message?.content || "No se pudo generar el informe."
  } catch (err: any) {
    console.error("METIS AI Engine error:", err)
    return `## Error en la generación\\nOcurrió un error al contactar con el modelo de IA: ${err.message}`
  }
}
````

### src/lib/geminiCompat.ts

```ts
/**
 * Compatibilidad con modelos Gemini.
 *
 * Los modelos Gemini 1.0 (gemini-pro, gemini-pro-vision, gemini-1.0-*) NO
 * soportan los campos `systemInstruction` ni `responseMimeType`: si se envían,
 * el API responde HTTP 400 y METIS / el Ayudante IA dejan de responder (o caen
 * al motor básico). Esta función indica si un modelo soporta esos campos para
 * poder enviarlos o, en su lugar, incrustar la instrucción de sistema dentro del
 * mensaje de usuario (formato legacy que funciona en todos los modelos).
 */
export function geminiSupportsSystemInstruction(model: string): boolean {
  const m = (model || '').toLowerCase().trim()
  if (!m) return true // sin modelo configurado: asumir soporte
  if (m === 'gemini-pro' || m === 'gemini-pro-vision') return false
  if (m.startsWith('gemini-1.0')) return false
  return true
}
```

### src/services/aiProviderService.ts

```ts
/**
 * Capa de Abstracción Centralizada para el Ayudante IA de GESTARIAN.
 * Permite cambiar dinámicamente de proveedor (Gemini, Groq, etc.) desde CONFIGURACIÓN
 * sin modificar ninguna página ni componente visual del taller.
 */

import type { AiAssistantConfig, FallbackAiConfig } from '../lib/types';
import { getMetisKnowledgePrompt } from '../ai/metisKnowledge';
import { geminiSupportsSystemInstruction } from '../lib/geminiCompat';

export interface AIResponse {
  text: string;
  structuredIntent?: {
    action: string;
    target: string;
    params: Record<string, any>;
  };
}

export function getAiConfig(): AiAssistantConfig {
  const saved = localStorage.getItem('gestarian_ai_assistant_config');
  if (saved) {
    try { return JSON.parse(saved); } catch (e) { /* fallback */ }
  }
  return {
    provider: 'gemini',
    model: localStorage.getItem('gestarian_gemini_model') || 'gemini-2.0-flash',
    api_key: localStorage.getItem('gestarian_gemini_api_key') || '',
    status: 'disconnected'
  };
}

export function getFallbackConfig(): FallbackAiConfig {
  const saved = localStorage.getItem('gestarian_fallback_ai_config');
  if (saved) {
    try { return JSON.parse(saved); } catch (e) { /* fallback */ }
  }
  return {
    provider: 'openrouter',
    model: 'deepseek/deepseek-chat:free',
    api_key: localStorage.getItem('gestarian_openrouter_api_key') || localStorage.getItem('gestarian_fallback_api_key') || '',
    enabled: false,
    status: 'disconnected'
  };
}

export async function testAiConnection(config: AiAssistantConfig | FallbackAiConfig): Promise<{ success: boolean; message: string }> {
  if (!config.api_key || config.api_key.trim() === '') {
    return { success: false, message: 'La Clave API no está configurada.' };
  }

  try {
    if (config.provider === 'gemini') {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${config.model || 'gemini-1.5-flash'}:generateContent?key=${config.api_key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Responde OK si la conexión es exitosa.' }] }]
          })
        }
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return { success: false, message: errorData.error?.message || `Error HTTP ${response.status}` };
      }
      return { success: true, message: 'Conexión con Gemini verificada correctamente.' };
    }

    if (config.provider === 'openrouter') {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.api_key}`,
          'HTTP-Referer': 'https://gestarian.app',
          'X-Title': 'GESTARIAN Taller'
        },
        body: JSON.stringify({
          model: config.model || 'deepseek/deepseek-chat:free',
          messages: [{ role: 'user', content: 'Ping de conexión' }],
          max_tokens: 10
        })
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return { success: false, message: errorData.error?.message || `Error HTTP ${response.status} en OpenRouter` };
      }
      return { success: true, message: 'Conexión con OpenRouter (Modelos Gratuitos) verificada correctamente.' };
    }

    if (config.provider === 'groq') {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.api_key}`
        },
        body: JSON.stringify({
          model: config.model || 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: 'Ping' }],
          max_tokens: 10
        })
      });
      if (!response.ok) {
        return { success: false, message: `Error HTTP ${response.status} en Groq` };
      }
      return { success: true, message: 'Conexión con Groq verificada correctamente.' };
    }

    return { success: true, message: 'Conexión verificada.' };
  } catch (error: any) {
    return { success: false, message: error?.message || 'Error de red al probar conexión.' };
  }
}

/**
 * Procesa instrucciones en lenguaje coloquial en español enviadas al Asistente IA de GESTARIAN
 */
export async function processAiInstruction(userMessage: string, contextData?: any): Promise<AIResponse> {
  const config = getAiConfig();
  const fallback = getFallbackConfig();

  // Prompt del sistema para la comprensión coloquial en español de España y dialecto andaluz en GESTARIAN
  const systemPrompt = `Eres el Ayudante IA oficial de GESTARIAN, un software para gestión de talleres mecánicos y de chapa/pintura.
Hablas y comprendes perfectamente el español de España y expresiones coloquiales y dialectales (incluyendo andaluz y jerga de taller como 'cambiale el aceite a ese coche', 'ponle dos horas de chapa', 'mira la bujía', 'quillo', 'illo', 'vamos a meterle mano a este buga').
Tu tarea es comprender la instrucción y responder de forma profesional, concisa y servicial.
Conoces a fondo cómo funciona la aplicación GESTARIAN: módulos, rutas de navegación, modelo de datos, reglas de negocio (IVA 21%, ciclos de presupuesto/factura/cobro) y funciones clave (dictado por voz, OCR, PDF por WhatsApp/Email, expedientes 360°, balances).
Usa este conocimiento para responder a preguntas sobre el funcionamiento de la app.
\n\n${getMetisKnowledgePrompt()}`;

  try {
    if (config.provider === 'gemini' && config.api_key) {
      const model = config.model || 'gemini-1.5-flash';
      // Los modelos Gemini 1.0 no soportan systemInstruction (HTTP 400): para
      // ellos se incrusta la instrucción en el mensaje de usuario.
      const soportaSystem = geminiSupportsSystemInstruction(model);
      const userContent = soportaSystem
        ? `Contexto: ${JSON.stringify(contextData || {})}\n\nInstrucción del usuario: ${userMessage}\n\nIMPORTANTE: Responde ÚNICAMENTE en español de España (castellano), de forma breve y natural.`
        : `INSTRUCCIONES DEL SISTEMA: ${systemPrompt}\n\n---\n\nContexto: ${JSON.stringify(contextData || {})}\n\nInstrucción del usuario: ${userMessage}\n\nIMPORTANTE: Responde ÚNICAMENTE en español de España (castellano), de forma breve y natural.`;
      const body: Record<string, any> = {
        contents: [{ role: 'user', parts: [{ text: userContent }] }],
        generationConfig: { temperature: 0.2 }
      };
      if (soportaSystem) body.systemInstruction = { parts: [{ text: systemPrompt }] };
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.api_key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        }
      );
      if (response.ok) {
        const data = await response.json();
        let text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Instrucción procesada correctamente.';
        // Si Gemini devolvió JSON estructurado, extraer el campo "text"
        try {
          const parsed = JSON.parse(text);
          if (parsed && parsed.text) text = parsed.text;
        } catch (e) { /* texto plano */ }
        return { text };
      }
    }
  } catch (e) {
    console.warn('Fallo en proveedor primario IA, intentando fallback...', e);
  }

  // Fallback a OpenRouter / Groq si está habilitado
  if (fallback.enabled && fallback.api_key) {
    try {
      const endpoint = fallback.provider === 'openrouter'
        ? 'https://openrouter.ai/api/v1/chat/completions'
        : 'https://api.groq.com/openai/v1/chat/completions';

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${fallback.api_key}`
      };

      if (fallback.provider === 'openrouter') {
        headers['HTTP-Referer'] = 'https://gestarian.app';
        headers['X-Title'] = 'GESTARIAN Taller';
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: fallback.model || (fallback.provider === 'openrouter' ? 'deepseek/deepseek-chat:free' : 'llama-3.3-70b-versatile'),
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
          ]
        })
      });
      if (response.ok) {
        const data = await response.json();
        return { text: data.choices?.[0]?.message?.content || 'Procesado vía Fallback.' };
      }
    } catch (e) {
      console.error('Fallo en fallback IA:', e);
    }
  }

  return { text: 'He recibido tu instrucción. El servicio IA está procesando los datos de GESTARIAN.' };
}
```

## B. Voz y sintesis de voz

### src/lib/useVoice.ts

```ts
import { useState, useRef, useCallback, useEffect } from 'react'

interface SpeechRecognitionResultItem {
  transcript: string
}

interface SpeechRecognitionResult {
  length: number
  [index: number]: SpeechRecognitionResultItem
  isFinal: boolean
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number
  results: {
    length: number
    [index: number]: SpeechRecognitionResult
  }
}

interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start: () => void
  stop: () => void
  abort: () => void
  onstart: (() => void) | null
  onresult: ((e: SpeechRecognitionEvent) => void) | null
  onend: (() => void) | null
  onerror: ((e: any) => void) | null
}

function getRecognition(): SpeechRecognitionLike | null {
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  return SR ? new SR() : null
}

export type MicPermission = 'granted' | 'denied' | 'unknown'

function describeRecognitionError(code: string): string {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'No tengo permiso para usar el micrófono: el navegador lo ha bloqueado. Pulsa el botón "Activar micrófono" para abrir los ajustes y permitirlo.'
    case 'audio-capture':
      return 'No se ha encontrado ningún micrófono. Comprueba que tienes uno conectado, activado y sin cubrir.'
    case 'network':
      return 'El reconocimiento de voz necesita conexión a internet. Revisa tu red e inténtalo de nuevo.'
    case 'no-speech':
      return 'No he detectado ninguna voz. Acércate al micrófono y vuelve a intentarlo.'
    case 'aborted':
      return 'Reconocimiento de voz cancelado.'
    default:
      return `El micrófono ha fallado (${code}). Usa Google Chrome, Edge o Safari y comprueba que la página se sirve por HTTPS.`
  }
}

/**
 * Detección real de soporte de getUserMedia en el navegador.
 * Se usa typeof en vez de una referencia directa para que el compilador no
 * marque la condición como "siempre true" y para que falle limpio en
 * navegadores antiguos/WebViews sin mediaDevices.
 */
function canRequestMicPermission(): boolean {
  return typeof navigator !== 'undefined' &&
    typeof navigator.mediaDevices?.getUserMedia === 'function'
}

/**
 * Devuelve la URL de ajustes más adecuada para activar el micrófono según
 * el sistema operativo / navegador. Se usa cuando el permiso está bloqueado
 * para llevar al usuario directo a la pantalla donde puede activarlo.
 * Devuelve '' cuando no existe un enlace directo (p. ej. iOS).
 */
export function getMicSettingsUrl(): string {
  if (typeof navigator === 'undefined') return 'chrome://settings/content/microphone'
  const ua = navigator.userAgent
  if (/Windows/i.test(ua)) return 'ms-settings:privacy-microphone'
  if (/Macintosh|Mac OS X/i.test(ua)) return 'x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone'
  if (/Android/i.test(ua)) return 'chrome://settings/content/microphone'
  if (/iPhone|iPad|iPod/i.test(ua)) return ''
  if (/Edg\//i.test(ua)) return 'edge://settings/content/microphone'
  if (/Firefox/i.test(ua)) return 'about:preferences#privacy'
  return 'chrome://settings/content/microphone'
}

export function useVoice() {
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interim, setInterim] = useState('')
  const [supported, setSupported] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [permissionDenied, setPermissionDenied] = useState(false)
  // true mientras se está pidiendo el permiso de micrófono (pregunta del navegador en pantalla)
  const [pending, setPending] = useState(false)
  const pendingRef = useRef(false)
  const setPendingState = useCallback((v: boolean) => {
    pendingRef.current = v
    setPending(v)
  }, [])
  const recRef = useRef<SpeechRecognitionLike | null>(null)
  const finalRef = useRef('')
  // Evita que dos clics/eventos arranquen el reconocedor a la vez (bug de Chrome:
  // un start() doble deja el reconocedor "colgado" sin emitir ningún evento)
  const startingRef = useRef(false)
  // Vigilancia de silencio: contador para no quedarnos "escuchando" eternamente
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { setSupported(false) }
  }, [])

  const initRecognition = useCallback((): SpeechRecognitionLike | null => {
    // Reutilizamos la misma instancia para evitar condiciones de carrera
    if (recRef.current) return recRef.current

    const r = getRecognition()
    if (!r) { setSupported(false); return null }
    r.lang = 'es-ES'
    // En móviles (iOS Safari / Android Chrome), continuous: true a veces cuelga el reconocedor o no emite eventos
    const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    r.continuous = !isMobile
    r.interimResults = true
    r.maxAlternatives = 1

    r.onstart = () => setListening(true)

    r.onresult = (e: SpeechRecognitionEvent) => {
      let interimTranscript = ''
      let finalTranscript = finalRef.current

      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i]
        const text = result[0]?.transcript || ''
        if (result.isFinal) {
          finalTranscript = `${finalTranscript}${finalTranscript ? ' ' : ''}${text}`.trim()
          finalRef.current = finalTranscript
        } else {
          interimTranscript += text
        }
      }

      setTranscript(`${finalTranscript}${interimTranscript ? ' ' + interimTranscript : ''}`.trim())
      setInterim(interimTranscript.trim())
    }
    r.onend = () => {
      setListening(false)
      setInterim('')
      setTranscript(finalRef.current)
    }
    r.onerror = (e: any) => {
      setListening(false)
      setInterim('')
      const code = e?.error || 'unknown'
      if (code === 'not-allowed' || code === 'service-not-allowed') {
        setPermissionDenied(true)
      }
      setError(describeRecognitionError(code))
    }
    recRef.current = r
    return r
  }, [])

  /**
   * Pide permiso de micrófono de forma explícita mediante la API nativa del
   * navegador (getUserMedia). Así aparece la pregunta "¿Permitir usar el
   * micrófono?" con los botones Permitir/Bloquear. Si ya está concedido,
   * vuelve al instante sin molestar.
   */
  const requestPermission = useCallback(async (): Promise<MicPermission> => {
    if (!canRequestMicPermission()) {
      setError('Este navegador no permite pedir permiso de micrófono desde la página. Usa Google Chrome, Edge o Safari por HTTPS.')
      setPermissionDenied(false)
      return 'unknown'
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      // Solo nos interesaba el permiso: soltamos el micrófono para que lo use el reconocedor de voz
      stream.getTracks().forEach(t => t.stop())
      setPermissionDenied(false)
      setError(null)
      return 'granted'
    } catch (err: any) {
      const name = err?.name || ''
      if (/NotAllowedError|PermissionDeniedError/i.test(name)) {
        setPermissionDenied(true)
        setError('No tengo permiso para usar el micrófono: el navegador lo ha bloqueado. Pulsa el botón "Activar micrófono" para abrir los ajustes y permitirlo.')
        return 'denied'
      }
      if (/NotFoundError|DevicesNotFoundError/i.test(name)) {
        setError('No se ha encontrado ningún micrófono. Comprueba que tienes uno conectado, activado y sin cubrir.')
        return 'unknown'
      }
      if (/NotReadableError|TrackStartError/i.test(name)) {
        setError('El micrófono está bloqueado o siendo usado por otra aplicación. Ciérralo y vuelve a intentarlo, o revisa los ajustes de privacidad del sistema.')
        return 'unknown'
      }
      setError('No se ha podido acceder al micrófono. Pulsa el botón "Activar micrófono" para abrir los ajustes.')
      return 'unknown'
    }
  }, [])

  const start = useCallback(async () => {
    // Evita arranques dobles mientras se pide permiso o ya se está iniciando
    if (startingRef.current) return
    startingRef.current = true
    try {
      finalRef.current = ''
      setTranscript('')
      setInterim('')
      setError(null)
      setPermissionDenied(false)

      const r = initRecognition()
      if (!r) {
        setError('El reconocimiento de voz no está soportado en este navegador. Usa Google Chrome, Edge o Safari.')
        return
      }

      setPendingState(true)
      try {
        if (canRequestMicPermission()) {
          const perm = await requestPermission()
          if (perm !== 'granted') return
        }

        try {
          r.start()
          setListening(true)
        } catch (err: any) {
          setListening(false)
          setError(
            err?.name === 'InvalidStateError'
              ? 'El micrófono ya estaba activo. Espera un segundo y vuelve a pulsar.'
              : describeRecognitionError(err?.message || 'unknown')
          )
        }
      } finally {
        setPendingState(false)
      }
    } finally {
      startingRef.current = false
    }
  }, [initRecognition, requestPermission, setPendingState])

  // Vigilancia de silencio: Chrome a veces deja el reconocedor "escuchando" sin
  // devolver nada (micrófono mudo, servidor de voz inaccesible, permiso en modo
  // raro...). Para no quedarnos con el micrófono "conectado" eternamente, si en
  // 8 segundos no llega ni un carácter de transcripción, paramos y avisamos.
  useEffect(() => {
    if (!listening) {
      if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null }
      return
    }
    silenceTimerRef.current = setTimeout(() => {
      if (recRef.current) {
        try { recRef.current.stop() } catch {}
      }
      setListening(false)
      setInterim('')
      setError('No te estoy oyendo nada. Comprueba que el micrófono está activo y que el navegador tiene permiso (candado de la barra de direcciones → Micrófono → Permitir). Pulsa de nuevo el micrófono cuando estés listo.')
    }, 8000)
    return () => {
      if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null }
    }
  }, [listening, transcript, interim])

  const stop = useCallback(() => {
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null }
    if (!recRef.current) { setListening(false); return }
    try { recRef.current.stop() } catch {}
    setListening(false)
  }, [])

  /**
   * Apagado forzoso y limpio del micrófono: aborta el reconocedor y destruye la
   * instancia para que el siguiente arranque cree una nueva (evita el bug de
   * Chrome en el que un start() repetido se queda "colgado" sin emitir eventos).
   */
  const dispose = useCallback(() => {
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null }
    if (recRef.current) {
      try { recRef.current.abort() } catch {}
      recRef.current = null
    }
    finalRef.current = ''
    setListening(false)
    setTranscript('')
    setInterim('')
  }, [])

  const reset = useCallback(() => {
    finalRef.current = ''
    setTranscript('')
    setInterim('')
    setError(null)
  }, [])

  return { listening, transcript, interim, supported, error, permissionDenied, pending, start, stop, reset, dispose, requestPermission }
}

const WORD_NUMBERS: Record<string, number> = {
  cero: 0, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5,
  seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12,
  trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17,
  dieciocho: 18, diecinueve: 19, veinte: 20, treinta: 30, cuarenta: 40,
  cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90,
  cien: 100, doscientos: 200, doscientas: 200, trescientos: 300, trescientas: 300,
  cuatrocientos: 400, cuatrocientas: 400, quinientos: 500, quinientas: 500,
  seiscientos: 600, seiscientas: 600, setecientos: 700, setecientas: 700,
  ochocientos: 800, ochocientas: 800, novecientos: 900, novecientas: 900,
  mil: 1000,
}

/**
 * Parse a voice transcript into presupuesto conceptos.
 * Examples it understands (Spanish, spoken):
 *   "cambio de aceite 50 euros"
 *   "frenos delanteros doscientos"
 *   "mano de obra 30 por hora 2 unidades 60"
 *   "diagnóstico 35, revisión general 80"
 * Returns an array of { descripcion, cantidad, precio }.
 */
export function parseVoiceToConceptos(text: string): { descripcion: string; cantidad: number; precio: number }[] {
  if (!text.trim()) return []

  function parseNumber(s: string): number | null {
    s = s.trim().toLowerCase()
    if (!s) return null
    if (/^\d+([.,]\d+)?$/.test(s)) return parseFloat(s.replace(',', '.'))
    let total = 0
    let current = 0
    let found = false
    for (const w of s.split(/\s+/)) {
      if (w in WORD_NUMBERS) {
        const n = WORD_NUMBERS[w]
        if (n === 1000) { current = (current || 1) * 1000; }
        else if (n === 100) { current = (current || 1) * 100; }
        else current += n
        found = true
      } else {
        const m = w.match(/(\d+)/)
        if (m) { current += parseInt(m[1]); found = true }
      }
    }
    total += current
    return found ? total : null
  }

  const cleaned = text
    .replace(/\beuros?\b/gi, '€')
    .replace(/\beuros?\b/gi, '€')
    .replace(/\bpor\b/gi, 'x')
    .replace(/\bunidades?\b/gi, 'u')
    .replace(/\bhora\b/gi, 'h')
    .replace(/\bcon\b/gi, '€ con')

  const lines = cleaned.split(/(?:\by\b|,|;|\.|\n| entonces | también | más | suma | añade | agrega )/i)
    const conceptos: { descripcion: string; cantidad: number; precio: number }[] = []

  for (let line of lines) {
    line = line.trim()
    if (!line) continue

    const priceMatch = line.match(/(-?\d+(?:[.,]\d+)?)\s*€/)
    let precio = 0
    let desc = line

    if (priceMatch) {
      precio = parseFloat(priceMatch[1].replace(',', '.'))
      desc = line.replace(priceMatch[0], '').replace(/€/g, '').trim()
    } else {
      const words = line.split(/\s+/)
      const lastTwo = words.slice(-2).join(' ')
      const lastThree = words.slice(-3).join(' ')
      const pn = parseNumber(lastTwo) ?? parseNumber(lastThree)
      if (pn !== null && words.length > 2) {
        precio = pn
        desc = words.slice(0, -2).join(' ').trim() || words.slice(0, -1).join(' ').trim()
      }
    }

    desc = desc
      .replace(/\s+x\s*\d*\s*$/i, '')
      .replace(/\s+u\s*$/i, '')
      .replace(/\s+h\s*$/i, '')
      .replace(/\s+/g, ' ')
      .trim()

    if (!desc) continue

    const qtyMatch = line.match(/x\s*(\d+(?:[.,]\d+)?)\b/) || line.match(/(\d+(?:[.,]\d+)?)\s*u\b/)
    const cantidad = qtyMatch ? parseFloat(qtyMatch[1].replace(',', '.')) : 1

    conceptos.push({ descripcion: desc, cantidad, precio })
  }

  return conceptos.filter((c) => c.descripcion.length > 1)
}

const LETTER_MAP: Record<string, string> = {
  a: 'A', b: 'B', c: 'C', d: 'D', e: 'E', f: 'F', g: 'G', h: 'H',
  i: 'I', j: 'J', k: 'K', l: 'L', m: 'M', n: 'N', ñ: 'Ñ', o: 'O',
  p: 'P', q: 'Q', r: 'R', s: 'S', t: 'T', u: 'U', v: 'V', w: 'W',
  x: 'X', y: 'Y', z: 'Z',
  alfa: 'A', bravo: 'B', charlie: 'C', delta: 'D', eco: 'E', foxtrot: 'F',
  golf: 'G', hotel: 'H', india: 'I', juliet: 'J', kilo: 'K', lima: 'L',
  mike: 'M', november: 'N', oscar: 'O', papa: 'P', quebec: 'Q', romeo: 'R',
  sierra: 'S', tango: 'T', uniform: 'U', victor: 'V', whisky: 'W',
  xray: 'X', yankee: 'Y', zulu: 'Z',
}

const DIGIT_WORDS: Record<string, string> = {
  cero: '0', uno: '1', una: '1', dos: '2', doh: '2', tres: '3', treh: '3', cuatro: '4', cuatroh: '4',
  cinco: '5', seis: '6', seih: '6', siete: '7', sieteh: '7', ocho: '8', ochoh: '8', nueve: '9', nueveh: '9',
  diez: '10', dieh: '10', veinte: '20', treinta: '30', cuarenta: '40', cincuenta: '50',
  sesenta: '60', setenta: '70', ochenta: '80', noventa: '90', cien: '100', ciento: '100',
}

function normalizeAndalusianText(s: string): string {
  return s
    .replace(/\b(er|el)\b/gi, 'el')
    .replace(/\b(pa|par|pa'|pár)\b/gi, 'para')
    .replace(/\b(to|to'|toa|toas|toah)\b/gi, 'todo')
    .replace(/\b(pisha|illo|quillo|quilla|gachó|compare|compadre)\b/gi, '')
    .replace(/\b(aseite|aceit|aseitillo)\b/gi, 'aceite')
    .replace(/\b(filtroh|filtros|firtroh)\b/gi, 'filtros')
    .replace(/\b(frenoh|frenos)\b/gi, 'frenos')
    .replace(/\b(paragorpe|paragolpeh|parachoques|parachoque)\b/gi, 'paragolpes')
    .replace(/\b(pintao|pintaillo)\b/gi, 'pintar')
    .replace(/\b(arreglao|arreglá|reparao)\b/gi, 'reparar')
    .replace(/\b(cambiao|cambiá)\b/gi, 'cambiar')
    .replace(/\b(haser|hacé)\b/gi, 'hacer')
    .replace(/\b(ar)\s+/gi, 'al ')
    .replace(/\s+/g, ' ')
    .trim()
}

function wordsToDigits(s: string): string {
  const norm = normalizeAndalusianText(s)
  return norm
    .toLowerCase()
    .split(/\s+/)
    .map((w) => {
      const clean = w.replace(/[.,;:]/g, '')
      if (clean in DIGIT_WORDS) return DIGIT_WORDS[clean]
      if (/^\d+$/.test(clean)) return clean
      return w
    })
    .join(' ')
}

function extractDigits(s: string): string {
  const spelled = wordsToDigits(s)
  const matches = spelled.match(/\d/g)
  return matches ? matches.join('') : ''
}

function extractLetter(s: string): string {
  const lower = s.toLowerCase()
  for (const [word, letter] of Object.entries(LETTER_MAP)) {
    const re = new RegExp(`\\b${word}\\b`, 'i')
    if (re.test(lower)) return letter
  }
  const m = s.match(/\b([a-zñA-ZÑ])\b/i)
  return m ? m[1].toUpperCase() : ''
}

function parseSpokenNumber(s: string): number | null {
  s = s.trim().toLowerCase()
  if (!s) return null
  if (/^\d+([.,]\d+)?$/.test(s)) return parseFloat(s.replace(',', '.'))
  let current = 0
  let found = false
  for (const w of s.split(/\s+/)) {
    if (w in WORD_NUMBERS) {
      const n = WORD_NUMBERS[w]
      if (n === 1000) { current = (current || 1) * 1000 }
      else if (n === 100) { current = (current || 1) * 100 }
      else current += n
      found = true
    } else {
      const m = w.match(/(\d+)/)
      if (m) { current += parseInt(m[1]); found = true }
    }
  }
  return found ? current : null
}

export interface ClienteVoiceData {
  nombre: string
  dni: string
  telefono: string
  email: string
  direccion: string
}

/**
 * Parse a voice transcript into client data.
 * Understands spoken Spanish, e.g.:
 *   "Pedro Ruiz González DNI 74373332 letra p"
 *   "tres tres dos tres dos seis cuatro ocho b"
 *   "calle Alfredo Kraus número 12 código postal veintinueve 560 Estación de Cártama Málaga"
 *   "teléfono 600123456 email pedro arroba gmail punto com"
 */
export function parseVoiceToCliente(text: string): Partial<ClienteVoiceData> {
  if (!text.trim()) return {}
  const result: Partial<ClienteVoiceData> = {}
  const lower = text.toLowerCase()

  // Email — handle "arroba" and "punto"
  const emailMatch = lower.match(/([\w.+-]+)\s*(?:arroba|@)\s*([\w.+-]+(?:\s*punto\s*[\w-]+)*)/)
  if (emailMatch) {
    const user = emailMatch[1].replace(/\s+/g, '')
    const domain = emailMatch[2].replace(/\s*punto\s*/g, '.').replace(/\s+/g, '')
    result.email = `${user}@${domain}`
  } else {
    const plainEmail = text.match(/[\w.+-]+@[\w.-]+\.\w+/)
    if (plainEmail) result.email = plainEmail[0]
  }

  // Phone — look for "teléfono" or a sequence of 9 digits
  const phoneSection = lower.match(/tel[ée]fono\s*[:\s]*([\d\s\w]{5,40})/)
  if (phoneSection) {
    const digits = extractDigits(phoneSection[1])
    if (digits.length >= 9) result.telefono = digits.slice(0, 9)
  }
  if (!result.telefono) {
    const digits = extractDigits(text)
    if (digits.length >= 9) result.telefono = digits.slice(0, 9)
  }

  // DNI — look for "DNI" keyword or "letra" pattern
  const dniSection = lower.match(/dni\s*[:\s]*([\d\s\w]{5,30})/)
  if (dniSection) {
    const digits = extractDigits(dniSection[1])
    const letter = extractLetter(dniSection[1])
    if (digits.length >= 7) {
      result.dni = digits.slice(0, 8) + (letter || '')
    }
  }
  if (!result.dni) {
    const letraMatch = lower.match(/letra\s+([a-zñ])/i)
    const digits = extractDigits(text)
    if (digits.length >= 7 && letraMatch) {
      result.dni = digits.slice(0, 8) + letraMatch[1].toUpperCase()
    }
  }

  // Address — look for "calle", "avenida", "plaza", "paseo", "dirección"
  const addrMatch = text.match(/(?:calle|avenida|plaza|paseo|carretera|r[úu]a|direcci[óo]n)\s+([^\n,]+(?:,\s*[^\n,]+)*)/i)
  if (addrMatch) {
    let addr = addrMatch[1].trim()
    // Normalize "número" -> "nº", "código postal" -> "CP"
    addr = addr.replace(/\bn[úu]mero\b/gi, 'nº').replace(/\bn\b(\d+)/gi, 'nº $1')
    addr = addr.replace(/\bc[óo]digo postal\b/gi, 'CP')
    // Convert spelled numbers in "CP veintinueve 560" style
    addr = addr.replace(/CP\s+([\w\s]+?)(?=\s+[A-Z]|$)/gi, (m, p1) => {
      const n = parseSpokenNumber(p1)
      return n !== null ? `CP ${n}` : m
    })
    result.direccion = addr
  }

  // Name — everything before "DNI", "teléfono", "dirección", "calle", "email"
  const stopIdx = lower.search(/\b(dni|tel[ée]fono|direcci[óo]n|calle|avenida|plaza|paseo|email|correo)\b/i)
  if (stopIdx > 0) {
    const namePart = text.slice(0, stopIdx).trim()
    if (namePart.length > 2) result.nombre = namePart.replace(/\s+/g, ' ').trim()
  } else if (!stopIdx || stopIdx === -1) {
    // No keywords found — assume the whole thing is a name if short enough
    const words = text.trim().split(/\s+/)
    if (words.length >= 2 && words.length <= 6) {
      result.nombre = text.trim()
    }
  }

  return result
}
```

### src/lib/useSpeechSynthesis.ts

```ts
import { useState, useCallback, useEffect, useRef } from 'react'

export function useSpeechSynthesis() {
  const [speaking, setSpeaking] = useState(false)
  const [supported, setSupported] = useState(true)
  const currentAudioRef = useRef<HTMLAudioElement | null>(null)
  // Resolver de la promesa TTS activa: se invoca con false si se cancela
  // (stop() o nuevo speak()) para que el encadenado de fuentes no se bloquee
  // esperando para siempre un evento que ya no llegará.
  const pendingResolveRef = useRef<((ok: boolean) => void) | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') {
      setSupported(false)
    }
  }, [])

  // Chrome carga la lista de voces de forma asíncrona. Forzamos la carga y nos
  // suscribimos a 'voiceschanged' para tener disponibles las voces es-ES cuando
  // haga falta (sin esto, la primera frase puede salir con la voz por defecto).
  // NOTA: algunos WebViews/navegadores antiguos no implementan addEventListener
  // ni toleran getVoices sin try/catch: sin estas guardias el hook reventaba y
  // rompía METIS entero.
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.getVoices()
        const handler = () => {
          try { window.speechSynthesis.getVoices() } catch (e) { /* ignorar */ }
        }
        if (typeof window.speechSynthesis.addEventListener === 'function') {
          window.speechSynthesis.addEventListener('voiceschanged', handler)
          return () => {
            try {
              if (typeof window.speechSynthesis.removeEventListener === 'function') {
                window.speechSynthesis.removeEventListener('voiceschanged', handler)
              }
            } catch (e) { /* ignorar */ }
          }
        }
      } catch (e) {
        // El navegador no soporta la precarga de voces: se usará la voz por defecto
      }
    }
  }, [])

  // 1. Fallback Web Speech API (Nativo del navegador con filtro estricto es-ES)
  const speakWebSpeech = useCallback((text: string, onEnd?: () => void) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      if (onEnd) onEnd()
      return
    }

    try {
      window.speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'es-ES'
      utterance.rate = 1.0
      utterance.pitch = 1.0
      utterance.volume = 1.0

      const allVoices = window.speechSynthesis.getVoices()
      // Filtrar estrictamente voces en español de España (es-ES) o español
      const spanishVoices = allVoices.filter((v) => {
        const lang = v.lang.toLowerCase()
        const name = v.name.toLowerCase()
        // Excluir cualquier voz asiática o no castellana
        if (name.includes('chinese') || name.includes('mandarin') || name.includes('cantonese') || lang.startsWith('zh') || lang.startsWith('ja') || lang.startsWith('ko')) {
          return false
        }
        return lang.includes('es')
      })

      const bestVoice =
        spanishVoices.find((v) => v.lang.toLowerCase() === 'es-es' || v.lang.toLowerCase() === 'es_es') ||
        spanishVoices.find((v) => {
          const name = v.name.toLowerCase()
          return name.includes('spain') || name.includes('españ') || name.includes('helena') || name.includes('laura') || name.includes('monica') || name.includes('jorge') || name.includes('google español')
        }) ||
        spanishVoices[0]

      if (bestVoice) {
        utterance.voice = bestVoice
      }

      utterance.onstart = () => setSpeaking(true)
      utterance.onend = () => {
        setSpeaking(false)
        if (onEnd) onEnd()
      }
      utterance.onerror = () => {
        setSpeaking(false)
        if (onEnd) onEnd()
      }

      window.speechSynthesis.speak(utterance)
    } catch (e) {
      setSpeaking(false)
      if (onEnd) onEnd()
    }
  }, [])

  // Reproduce un audio TTS devolviendo true si llega al final sin errores
  // (CORS, CAPTCHA, bloqueo de red...). Así podemos encadenar varias fuentes.
  // Incluye un timeout de 12s: si la fuente no arranca ni falla (red colgada,
  // servidor que no responde), se resuelve con false y se prueba la siguiente.
  const playTtsAudio = useCallback((url: string): Promise<boolean> => {
    return new Promise((resolve) => {
      let done = false
      let timeoutId: ReturnType<typeof setTimeout> | undefined

      const finish = (ok: boolean) => {
        if (done) return
        done = true
        if (pendingResolveRef.current === finish) pendingResolveRef.current = null
        if (timeoutId) clearTimeout(timeoutId)
        setSpeaking(false)
        currentAudioRef.current = null
        resolve(ok)
      }

      timeoutId = setTimeout(() => finish(false), 12000)
      // El resolver se guarda para poder cancelar la promesa desde stop()/speak()
      pendingResolveRef.current = finish

      try {
        const audio = new Audio(url)
        currentAudioRef.current = audio
        audio.playbackRate = 1.0
        audio.onplay = () => setSpeaking(true)
        audio.onended = () => finish(true)
        audio.onerror = () => finish(false)
        audio.play().catch(() => finish(false))
      } catch {
        finish(false)
      }
    })
  }, [])

  // 2. Voz Principal: TTS en castellano natural (Google es-ES) con dos fuentes:
  //    - translate.google.com (voz clásica, cada vez más restringida)
  //    - api.streamelements.com (proxy del mismo TTS de Google, voz es-ES-Standard-A)
  //    Si ambas fallan, se usa la Web Speech API nativa con filtro estricto es-ES.
  const speak = useCallback(async (text: string, onEnd?: () => void) => {
    if (typeof window === 'undefined' || !text.trim()) return

    // Detener cualquier reproducción previa
    if (currentAudioRef.current) {
      currentAudioRef.current.pause()
      currentAudioRef.current = null
    }
    // Resolver con false la promesa TTS pendiente para no dejar el flujo esperando
    if (pendingResolveRef.current) {
      pendingResolveRef.current(false)
      pendingResolveRef.current = null
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }

    // Limpiar caracteres especiales y formatear moneda para pronunciación castellana perfecta
    const cleanText = text
      .replace(/[*_~#`]/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/•/g, '')
      .replace(/(\d+)[.,](\d+)\s*€/g, '$1 euros con $2 céntimos')
      .replace(/(\d+)\s*€/g, '$1 euros')
      .trim()

    if (!cleanText) return

    // El TTS de Google tiene un límite de ~200 caracteres: los textos más largos
    // se hablan con el motor Web Speech nativo (sin límite) para no cortarse.
    if (cleanText.length > 200) {
      speakWebSpeech(cleanText, onEnd)
      return
    }

    try {
      const encoded = encodeURIComponent(cleanText)
      const fuentes = [
        `https://translate.google.com/translate_tts?ie=UTF-8&tl=es-ES&client=tw-ob&q=${encoded}`,
        `https://api.streamelements.com/kappa/v2/speech?voice=es-ES-Standard-A&text=${encoded}`
      ]
      for (const url of fuentes) {
        if (await playTtsAudio(url)) {
          onEnd?.()
          return
        }
      }
      // Ninguna fuente externa disponible: motor Web Speech con filtro es-ES
      speakWebSpeech(cleanText, onEnd)
    } catch (err) {
      speakWebSpeech(cleanText, onEnd)
    }
  }, [playTtsAudio, speakWebSpeech])

  const stop = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause()
      currentAudioRef.current = null
    }
    // Cancelar la promesa TTS pendiente (si no, el for de fuentes quedaría
    // esperando un onended que nunca llega tras el pause).
    if (pendingResolveRef.current) {
      pendingResolveRef.current(false)
      pendingResolveRef.current = null
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    setSpeaking(false)
  }, [])

  return { speak, stop, speaking, supported }
}
```

## C. Componentes visuales METIS

### src/components/MetisAssistant.tsx

```tsx
import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Send, Bot, Mic, MicOff, ArrowRight, CheckCircle2, FileText, Power, Settings } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../lib/theme'
import { useVoice, getMicSettingsUrl } from '../lib/useVoice'
import { useSpeechSynthesis } from '../lib/useSpeechSynthesis'
import { processMetisMessage, MetisContext, MetisActionResult } from '../lib/metisAiEngine'

import { CronFiscalService } from '../lib/cronFiscalService'
import { enviarTrimestreGestoriaAutomático } from '../services/gestoriaExportService'

interface Message {
  id: string
  role: 'user' | 'metis'
  text: string
  actionResult?: MetisActionResult
  cronAction?: { avisoId: string }
}

export function MetisAssistant() {
  const { playSound } = useTheme()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [hasUnread, setHasUnread] = useState(false)
  const [activeContext, setActiveContext] = useState<MetisContext | null>(null)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'metis',
      text: 'Hola, soy METIS, tu compañero experto en la oficina de GESTARIAN. Puedes hablarme o escribirme para gestionar presupuestos, citas, reparaciones, clientes y facturas. ¿En qué te ayudo?'
    },
  ])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [voiceInputActive, setVoiceInputActive] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)

  const { listening, transcript, interim, supported, start, stop, reset, dispose, error, permissionDenied, pending, requestPermission } = useVoice()
  const { speak, stop: stopSpeech } = useSpeechSynthesis()

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, typing, interim, transcript])

  // Listen for global custom events (e.g. from row buttons or footer mic button)
  useEffect(() => {
    function handleOpenWithContext(e: Event) {
      const detail = (e as CustomEvent).detail as { context?: MetisContext; autoMic?: boolean } | undefined
      setOpen(true)
      if (detail?.context) {
        setActiveContext(detail.context)
        const ctxMsg = `Contexto fijado en ${detail.context.tipo.toUpperCase()} ${detail.context.numero || detail.context.matricula || ''}. ¿Qué cambio o gestión deseas hacer?`
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'metis', text: ctxMsg }])
        speak(ctxMsg)
      }
      if (detail?.autoMic && supported) {
        setVoiceInputActive(true)
        reset()
        start()
      }
    }

    function handleTriggerMic() {
      setOpen(true)
      setVoiceInputActive(true)
      reset()
      start()
    }
    
    function handleTogglePanel() {
      setOpen(o => {
        if (!o) setHasUnread(false)
        return !o
      })
    }

    window.addEventListener('metis-open-context', handleOpenWithContext)
    window.addEventListener('metis-trigger-mic', handleTriggerMic)
    window.addEventListener('metis-toggle-panel', handleTogglePanel)
    return () => {
      window.removeEventListener('metis-open-context', handleOpenWithContext)
      window.removeEventListener('metis-trigger-mic', handleTriggerMic)
      window.removeEventListener('metis-toggle-panel', handleTogglePanel)
    }
  }, [supported, start, reset, speak])

  // Lógica del calendario fiscal automático
  useEffect(() => {
    let checking = false
    const checkCron = async () => {
      if (checking) return
      checking = true
      try {
        const evento = CronFiscalService.checkCurrentDate()
        if (evento) {
          const avisoId = CronFiscalService.getAvisoId(evento.tipo)
          
          if (evento.tipo === 'envio_10') {
            const exito = await enviarTrimestreGestoriaAutomático()
            CronFiscalService.markAsDone(avisoId)
            const text = exito 
              ? evento.mensaje 
              : "Ha ocurrido un error al intentar enviar el informe trimestral. Por favor, revisa la configuración."
            setMessages(prev => [...prev, { id: avisoId, role: 'metis', text }])
            setHasUnread(true)
            speak(text)
          } else {
            CronFiscalService.markAsDone(avisoId)
            setMessages(prev => [...prev, {
              id: avisoId,
              role: 'metis',
              text: evento.mensaje,
              cronAction: evento.requierePermiso ? { avisoId } : undefined
            }])
            setHasUnread(true)
            speak(evento.mensaje)
          }
        }
      } finally {
        checking = false
      }
    }

    // Comprobar al iniciar y cada 5 minutos
    checkCron()
    const interval = setInterval(checkCron, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [speak])

  const handleCronPermission = async () => {
    CronFiscalService.darPermiso()
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', text: "Sí, tienes mi permiso para enviarlo." }])
    
    // Al dar permiso, enviar automáticamente ya que está cerrado
    const exito = await enviarTrimestreGestoriaAutomático()
    if (exito) {
      const respText = "¡Perfecto! Acabo de enviar los informes del trimestre a la gestoría."
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'metis', text: respText }])
      speak(respText)
    } else {
      const respText = "Hubo un error al intentar enviar los informes. Revisa tu email de gestoría en Configuración."
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'metis', text: respText }])
      speak(respText)
    }
  }

  const [conversationalMode, setConversationalMode] = useState(false)

  // Al cerrar el panel (o desmontar el componente) apagar el micrófono por completo:
  // así nunca se queda el reconocedor "conectado" corriendo en segundo plano ni el
  // estado de voz pillado en "escuchando".
  useEffect(() => {
    if (!open) {
      dispose()
      setVoiceInputActive(false)
      setConversationalMode(false)
    }
  }, [open, dispose])

  useEffect(() => {
    return () => dispose()
  }, [dispose])

  // Process completed voice transcript when user stops speaking or transcript freezes
  const handleSendMessage = useCallback(async (textToSend?: string, isVoice = false) => {
    const text = (textToSend || input).trim()
    if (!text) return

    playSound('click')
    const userMsgId = Date.now().toString()
    setMessages(prev => [...prev, { id: userMsgId, role: 'user', text }])
    setInput('')
    setTyping(true)

    try {
      const response = await processMetisMessage(text, activeContext || undefined)
      setTyping(false)
      const metisMsgId = (Date.now() + 1).toString()
      setMessages(prev => [
        ...prev,
        { id: metisMsgId, role: 'metis', text: response.text, actionResult: response.actionResult }
      ])
      
      setHasUnread(!open)

      // Reproducir voz y si está en modo conversacional continuo, reabrir el micro automáticamente al terminar de hablar
      if (isVoice || voiceInputActive || conversationalMode) {
        speak(response.text, () => {
          if (conversationalMode || voiceInputActive) {
            // Reabrir escucha continua manos libres como ChatGPT Voice o Gemini Live
            setTimeout(() => {
              reset()
              start()
            }, 300)
          }
        })
      }
    } catch {
      setTyping(false)
    }
  }, [input, activeContext, playSound, voiceInputActive, conversationalMode, speak, open, reset, start])

  const toggleMic = useCallback(() => {
    playSound('click')
    // Mientras el navegador muestra la pregunta del permiso no tocar nada
    if (pending) return
    if (listening) {
      stop()
      dispose()
      setVoiceInputActive(false)
      setConversationalMode(false)
      if (transcript.trim()) {
        handleSendMessage(transcript, true)
      }
    } else {
      reset()
      stopSpeech()
      setVoiceInputActive(true)
      setConversationalMode(true) // Activar modo manos libres continuo
      start()
    }
  }, [listening, pending, playSound, stop, dispose, reset, stopSpeech, start, transcript, handleSendMessage])

  // El micrófono no se ha activado por falta de permiso: primero se vuelve a pedir
  // el permiso (mostrará la pregunta del navegador y el usuario pulsa "Permitir");
  // si sigue bloqueado, se abre la pantalla de ajustes del sistema/navegador.
  const handleOpenMicSettings = useCallback(async () => {
    playSound('click')
    // Abrimos los ajustes de forma síncrona para que el navegador no bloquee la ventana
    const url = getMicSettingsUrl()
    const win = url ? window.open(url, '_blank') : null
    // Y reintentamos pedir permiso: si el usuario ya lo ha concedido, arrancamos directamente
    const perm = await requestPermission()
    if (perm === 'granted') {
      if (win) { try { win.close() } catch { /* ignorar */ } }
      reset()
      start()
    }
  }, [playSound, requestPermission, reset, start])

  // Auto-finish listening when transcript stops changing after a pause
  useEffect(() => {
    if (listening && transcript.trim().length > 3) {
      const timer = setTimeout(() => {
        stop()
        setVoiceInputActive(false)
        handleSendMessage(transcript, true)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [listening, transcript, stop, handleSendMessage])

  useEffect(() => {
    if (transcript) {
      setInput(transcript)
    }
  }, [transcript])

  // Handle native end of speech (for Android where it closes aggressively)
  useEffect(() => {
    if (!listening && !pending && voiceInputActive) {
      setVoiceInputActive(false)
      if (transcript.trim()) {
        handleSendMessage(transcript, true)
      }
    }
  }, [listening, pending, voiceInputActive, transcript, handleSendMessage])

  return (
    <>
      {/* Main METIS drawer / panel */}
      <button
        onClick={() => { playSound('click'); setOpen(!open); setHasUnread(false); }}
        className={`hidden lg:flex fixed bottom-4 right-6 z-50 items-center justify-center gap-2 px-5 py-2.5 rounded-md text-xs font-semibold uppercase tracking-widest transition-all backdrop-blur-md cursor-pointer ${
          hasUnread
            ? 'bg-[#1c1c1e]/90 border border-[#f97316] text-[#f97316] shadow-[0_0_15px_rgba(249,115,22,0.9)] animate-pulse'
            : 'bg-[#1c1c1e]/90 border border-[#22c55e] text-[#22c55e] shadow-[0_0_12px_rgba(34,197,94,0.6)] hover:border-[#22c55e] hover:shadow-[0_0_18px_rgba(34,197,94,0.8)]'
        }`}
        title="ON/OFF Avisos METIS"
      >
        <Power className="w-4 h-4" />
        <span>AVISOS METIS</span>
      </button>

      {/* Main METIS drawer / panel */}
      {open && (
        <div className="fixed bottom-0 right-0 sm:bottom-4 sm:right-4 z-50 w-full sm:w-[420px] h-[80vh] sm:h-[560px] bg-bg-900/95 backdrop-blur-xl border border-bg-700 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col gestarian-metis-panel">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-bg-700 bg-bg-900/95">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
                <Bot className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-white text-sm">METIS IA</p>
                  {activeContext && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono">
                      {activeContext.tipo.toUpperCase()} {activeContext.numero || activeContext.matricula || ''}
                    </span>
                  )}
                </div>
                <p className={`text-xs flex items-center gap-1 ${listening ? 'text-red-400' : 'text-white/50'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${listening ? 'bg-red-400 animate-pulse' : 'bg-white/30'}`} />
                  {listening ? 'Escuchando tu voz...' : 'METIS disponible'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={toggleMic}
                className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all ${
                  listening ? 'bg-red-500/30 text-red-400 animate-pulse border border-red-500/50' : 'text-white/60 hover:text-cyan-400 hover:bg-cyan-500/10'
                }`}
                aria-label="Hablar a METIS"
                title={listening ? 'Detener micrófono' : 'Hablar directamente a METIS'}
              >
                {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              <button
                onClick={() => { playSound('click'); stopSpeech(); setOpen(false) }}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Context bar if attached */}
          {activeContext && (
            <div className="bg-cyan-950/95 border-b border-cyan-500/20 px-4 py-1.5 flex items-center justify-between text-xs text-cyan-200">
              <span>Trabajando sobre: <strong>{activeContext.tipo}</strong> {activeContext.numero || activeContext.matricula}</span>
              <button
                onClick={() => setActiveContext(null)}
                className="text-[10px] underline hover:text-white"
              >
                Limpiar contexto
              </button>
            </div>
          )}

          {/* Chat message stream */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m) => (
              <div key={m.id} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div
                  className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm whitespace-pre-line leading-relaxed border ${
                    m.role === 'user'
                      ? 'bg-cyan-500/20 text-cyan-100 border-cyan-500/30'
                      : 'bg-bg-800/80 lg:bg-bg-800 text-white/90 border-bg-700 animate-border-breathe-metis lg:animate-none'
                  }`}
                >
                  {m.text}
                </div>

                {/* Interactive Action Card inside METIS chat */}
                {m.actionResult && (
                  <div className="mt-2.5 max-w-[90%] w-full bg-cyan-950/95 border border-cyan-500/40 rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-green-400" />
                      <span>{m.actionResult.title}</span>
                    </div>
                    <p className="text-xs text-white/70">{m.actionResult.details}</p>

                    <div className="pt-2 flex flex-wrap gap-2">
                      {m.actionResult.navigationPath && (
                        <button
                          onClick={() => {
                            playSound('click')
                            setOpen(false)
                            const item = m.actionResult?.item
                            if (item?.id) {
                              navigate(m.actionResult!.navigationPath!, {
                                state: {
                                  presupuestoId: item.id,
                                  clienteId: item.cliente_id,
                                  vehiculoId: item.vehiculo_id,
                                  openForm: true
                                }
                              })
                              setTimeout(() => {
                                window.dispatchEvent(new CustomEvent('gestarian-open-document', { detail: { id: item.id, tipo: 'presupuesto' } }))
                              }, 150)
                            } else {
                              navigate(m.actionResult!.navigationPath!)
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg bg-cyan-500/80 hover:bg-cyan-400 text-white font-medium text-xs flex items-center gap-1.5 transition-all"
                        >
                          <FileText className="w-3.5 h-3.5" /> Ver en módulo
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Acciones interactivas para el cron fiscal (Permiso) */}
                {m.cronAction && (
                  <div className="mt-2.5 max-w-[90%] w-full bg-cyan-950/95 border border-cyan-500/40 rounded-xl p-3.5 space-y-2">
                    <div className="flex flex-col gap-2 mt-1">
                      <button
                        onClick={handleCronPermission}
                        className="w-full px-3 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-medium text-xs flex justify-center items-center transition-all border border-emerald-500/50"
                      >
                        Sí, enviar trimestre cerrado
                      </button>
                      <button
                        onClick={() => { playSound('click'); setOpen(false) }}
                        className="w-full px-3 py-2 rounded-lg bg-bg-800 hover:bg-bg-700 text-slate-300 font-medium text-xs flex justify-center items-center transition-all border border-bg-600"
                      >
                        Aún no, faltan gastos
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Live speech dictation indicator */}
            {listening && (
              <div className="flex justify-start">
                <div className="bg-bg-800 border border-red-500/40 rounded-2xl px-4 py-3 w-full">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-xs text-red-400 font-semibold">METIS escuchando...</span>
                  </div>
                  {interim && <p className="text-xs text-white/50 italic mb-1">{interim}</p>}
                  {transcript && <p className="text-sm font-medium text-white/90">{transcript}</p>}
                </div>
              </div>
            )}

            {/* Error de micrófono visible para el usuario */}
            {error && !listening && (
              <div className="flex justify-start">
                <div className="bg-red-950/80 border border-red-500/40 rounded-2xl px-4 py-3 w-full space-y-3">
                  <div className="flex items-start gap-2">
                    <MicOff className="w-4 h-4 mt-0.5 text-red-400 shrink-0" />
                    <p className="text-sm text-red-200 whitespace-pre-line">{error}</p>
                  </div>

                  {permissionDenied ? (
                    <>
                      <button
                        onClick={handleOpenMicSettings}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/20 border border-red-500/40 text-red-100 text-xs font-bold hover:bg-red-500/30 transition-colors"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        Activar micrófono (abrir ajustes)
                      </button>
                      <p className="text-[11px] text-red-300/70 leading-relaxed">
                        Se abrirán los ajustes del sistema/navegador. Activa el micrófono y permite el acceso a tu navegador.
                        Si sigue fallando, pulsa el candado de la barra de direcciones → Permisos → Micrófono → Permitir.
                      </p>
                    </>
                  ) : (
                    <button
                      onClick={() => { reset(); start() }}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-bg-800 border border-bg-700 text-white/80 text-xs font-semibold hover:text-white hover:border-cyan-500/40 transition-colors"
                    >
                      <Mic className="w-3.5 h-3.5" />
                      Reintentar
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Typing indicator */}
            {typing && (
              <div className="flex justify-start">
                <div className="bg-bg-800 border border-bg-700 rounded-2xl px-4 py-3 flex gap-1.5">
                  <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
          </div>

          {/* Quick Prompt Chips */}
          {messages.length <= 2 && !listening && (
            <div className="px-4 pb-2 flex flex-wrap gap-2">
              {[
                'Metis, presupuesta capó 100€ y paragolpes 120€ a 1234ABC',
                'Agendar cita para matrícula 5678DEF',
                '¿Cómo facturar un presupuesto?',
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => handleSendMessage(q)}
                  className="text-xs px-3 py-1.5 rounded-full bg-bg-800 border border-bg-700 text-white/70 hover:text-cyan-300 hover:border-cyan-500/40 transition-all text-left"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Indicador de voz activa + transcripción en vivo (feedback de que el micrófono OYE) */}
          {voiceInputActive && (
            <div className="px-4 pt-2 flex items-center gap-2 text-[11px]">
              <span className={`w-2 h-2 rounded-full ${listening ? 'bg-red-400 animate-pulse' : 'bg-amber-400 animate-pulse'}`} />
              <span className={listening ? 'text-red-300' : 'text-amber-300'}>
                {listening ? 'Escuchando... di tu orden a METIS.' : 'Conectando el micrófono...'}
              </span>
              {(interim || transcript) && (
                <span className="text-white/50 italic truncate flex-1 text-right">“{interim || transcript}”</span>
              )}
            </div>
          )}

          {/* Bottom input area */}
          <div className="p-3 pr-16 border-t border-bg-700 flex gap-2 bg-bg-900/80">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage() }}
              placeholder={listening ? 'Escuchando voz...' : 'Habla o escribe tu orden a METIS...'}
              className="flex-1 bg-bg-800 border border-bg-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/50"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!input.trim()}
              className="w-10 h-10 rounded-xl bg-cyan-500/90 hover:bg-cyan-400 text-white flex items-center justify-center disabled:opacity-40 transition-colors shrink-0"
              aria-label="Enviar orden"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
```

### src/components/MetisFiscalAdvisor.tsx

```tsx
import { Calculator, Sparkles, TrendingUp, AlertTriangle } from 'lucide-react'

interface MetisFiscalAdvisorProps {
  beneficioAnual: number;
  tipoEmpresa: 'autonomo' | 'sociedad_limitada' | null;
}

function calcularIRPF(base: number): number {
  let tax = 0;
  let remaining = base;

  if (remaining > 300000) {
    tax += (remaining - 300000) * 0.47;
    remaining = 300000;
  }
  if (remaining > 60000) {
    tax += (remaining - 60000) * 0.45;
    remaining = 60000;
  }
  if (remaining > 35200) {
    tax += (remaining - 35200) * 0.37;
    remaining = 35200;
  }
  if (remaining > 20200) {
    tax += (remaining - 20200) * 0.30;
    remaining = 20200;
  }
  if (remaining > 12450) {
    tax += (remaining - 12450) * 0.24;
    remaining = 12450;
  }
  if (remaining > 0) {
    tax += remaining * 0.19;
  }
  return tax;
}

export function MetisFiscalAdvisor({ beneficioAnual, tipoEmpresa }: MetisFiscalAdvisorProps) {
  if (tipoEmpresa !== 'autonomo' || beneficioAnual <= 0) {
    return null;
  }

  // Estimaciones
  const cuotaAutonomoEstimada = 3600; // ~300€/mes
  const baseIRPF = Math.max(0, beneficioAnual - cuotaAutonomoEstimada);
  const irpfEstimado = calcularIRPF(baseIRPF);
  const totalImpuestosAutonomo = irpfEstimado + cuotaAutonomoEstimada;

  const cuotaAutonomoSocietario = 4500; // ~375€/mes
  const isEstimado = beneficioAnual * 0.25; // 25% Impuesto Sociedades
  const totalImpuestosSL = isEstimado + cuotaAutonomoSocietario;

  const diferencia = totalImpuestosAutonomo - totalImpuestosSL;
  
  // Lógica de avisos
  // Umbral donde suele empezar a compensar (aprox. 40k-50k de beneficio)
  const isRentableSL = diferencia > 0 && beneficioAnual > 45000;
  const isAcercandose = beneficioAnual >= 35000 && beneficioAnual <= 45000;

  if (!isRentableSL && !isAcercandose) {
    return null; // Aún no es relevante
  }

  return (
    <div className={`mt-6 p-5 rounded-xl border relative overflow-hidden ${
      isRentableSL 
        ? 'bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/30' 
        : 'bg-amber-500/10 border-amber-500/30'
    }`}>
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <Sparkles className="w-24 h-24" />
      </div>
      
      <div className="flex items-start gap-4 relative z-10">
        <div className={`p-3 rounded-lg ${isRentableSL ? 'bg-purple-500/20 text-purple-400' : 'bg-amber-500/20 text-amber-400'}`}>
          {isRentableSL ? <TrendingUp className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-white">METIS Insight Fiscal</h3>
            <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold ${
              isRentableSL ? 'bg-purple-500/20 text-purple-400' : 'bg-amber-500/20 text-amber-400'
            }`}>
              {isRentableSL ? 'Recomendación Estratégica' : 'Aviso Preventivo'}
            </span>
          </div>
          
          <p className="text-white/80 text-sm mb-4">
            {isRentableSL 
              ? `Según tus beneficios actuales (${beneficioAnual.toLocaleString('es-ES')} €), te saldría más rentable constituir una Sociedad Limitada (S.L.). Podrías ahorrar aproximadamente ${diferencia.toLocaleString('es-ES', { maximumFractionDigits: 0 })} € anuales en impuestos.`
              : `Tus beneficios netos (${beneficioAnual.toLocaleString('es-ES')} €) se están acercando al umbral donde compensa fiscalmente crear una Sociedad Limitada (S.L.). Te recomendamos empezar a evaluar esta transición.`
            }
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-bg-900/50 p-3 rounded-lg border border-bg-700/50">
              <h4 className="text-xs text-white/50 mb-2 font-medium">ESCENARIO ACTUAL (AUTÓNOMO)</h4>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">IRPF Estimado</span>
                  <span className="text-red-400">{irpfEstimado.toLocaleString('es-ES', { maximumFractionDigits: 0 })} €</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Cuota RETA</span>
                  <span className="text-red-400">{cuotaAutonomoEstimada.toLocaleString('es-ES', { maximumFractionDigits: 0 })} €</span>
                </div>
                <div className="border-t border-bg-700/50 mt-2 pt-2 flex justify-between font-bold">
                  <span className="text-white">Total Carga Fiscal</span>
                  <span className="text-red-500">{totalImpuestosAutonomo.toLocaleString('es-ES', { maximumFractionDigits: 0 })} €</span>
                </div>
              </div>
            </div>

            <div className="bg-bg-900/50 p-3 rounded-lg border border-bg-700/50">
              <h4 className="text-xs text-white/50 mb-2 font-medium">ESCENARIO S.L.</h4>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Impuesto Sociedades (25%)</span>
                  <span className="text-blue-400">{isEstimado.toLocaleString('es-ES', { maximumFractionDigits: 0 })} €</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Cuota Societario</span>
                  <span className="text-blue-400">{cuotaAutonomoSocietario.toLocaleString('es-ES', { maximumFractionDigits: 0 })} €</span>
                </div>
                <div className="border-t border-bg-700/50 mt-2 pt-2 flex justify-between font-bold">
                  <span className="text-white">Total Carga Fiscal</span>
                  <span className="text-blue-400">{totalImpuestosSL.toLocaleString('es-ES', { maximumFractionDigits: 0 })} €</span>
                </div>
              </div>
            </div>
          </div>
          
          <p className="text-xs text-white/40 mt-4 flex items-center gap-1.5">
            <Calculator className="w-3 h-3" />
            Cálculos puramente estimativos basados en tramos generales de IRPF y un 25% de IS. Consulta siempre con tu asesor.
          </p>
        </div>
      </div>
    </div>
  )
}
```

### src/components/MetisAlertsSection.tsx

```tsx
// src/components/MetisAlertsSection.tsx
import React from 'react';
import { FileText, TrendingUp, Users } from 'lucide-react';

interface MetisAlertsSectionProps {
  mostrarAvisos: boolean;
  totalAvisos: number;
  touchSelectable: boolean;
  presupuestosPendientes: number;
  facturasPendienteCobro: number;
  totalClientes: number;
  navigate: (path: string) => void;
}

export const MetisAlertsSection: React.FC<MetisAlertsSectionProps> = ({
  mostrarAvisos,
  totalAvisos,
  touchSelectable,
  presupuestosPendientes,
  facturasPendienteCobro,
  totalClientes,
  navigate,
}) => {
  return (
    <div className="px-2 sm:px-4">
      <div 
        className={`grid transition-all duration-500 ease-in-out overflow-hidden ${
          mostrarAvisos ? 'grid-rows-[1fr] opacity-100 mb-6' : 'grid-rows-[0fr] opacity-0 mb-0'
        }`}
      >
        <div className="overflow-hidden">
          <div 
            className="backdrop-blur-md rounded-2xl p-4 border border-emerald-500/60 border-[2px] space-y-3 shadow-[0_0_25px_rgba(0,0,0,0.4)] transition-colors duration-500 ease-in-out" 
            style={{ backgroundColor: 'rgba(6, 78, 59, 0.5)' }} // Opacidad 0.5 Verde Bosque Oscuro
          >
            <div className="flex items-center justify-center pb-2 border-b border-white/10">
              <h3 className="text-sm font-semibold text-emerald-100 tracking-wide">Avisos y Notificaciones</h3>
            </div>

            <div className="flex items-center justify-center gap-3 pt-1">
              <span className="text-sm font-bold tracking-widest text-[#84cc16] drop-shadow-[0_0_10px_rgba(132,204,22,0.8)]">METIS</span>
              <div className={`px-3 py-1 rounded-xl text-xs font-bold border border-[2px] flex items-center gap-1.5 ${
                totalAvisos > 0 ? 'bg-amber-950/70 text-amber-200 border-amber-500/70' : 'bg-emerald-950/70 text-emerald-300 border-emerald-500/70'
              }`}>
                <span>{totalAvisos}</span>
                <span>Pendientes</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              {/* Presupuestos Pendientes: Ámbar / Naranja Oscuro (Opacidad 0.5) */}
              <div className={!touchSelectable ? 'opacity-50 pointer-events-none' : ''}>
                <AlertCard
                  icon={<FileText className="w-4 h-4" />}
                  label="Presupuestos pendientes"
                  count={presupuestosPendientes}
                  color="text-amber-300"
                  bg="rgba(180, 83, 9, 0.5)"
                  border="border-amber-500/60 border-[2px]"
                  onClick={() => navigate('/presupuestos')}
                />
              </div>

              {/* Facturas sin cobrar (Prioridad alta): Rojo Burdeos Oscuro (Opacidad 0.5) */}
              <div className={!touchSelectable ? 'opacity-50 pointer-events-none' : ''}>
                <AlertCard
                  icon={<TrendingUp className="w-4 h-4" />}
                  label="Facturas sin cobrar (Prioridad)"
                  count={facturasPendienteCobro}
                  color="text-rose-300"
                  bg="rgba(159, 18, 57, 0.5)"
                  border="border-rose-500/60 border-[2px]"
                  onClick={() => navigate('/facturas')}
                />
              </div>

              {/* Total Clientes: Azul Cian Oscuro (Opacidad 0.5) */}
              <div className={!touchSelectable ? 'opacity-50 pointer-events-none' : ''}>
                <AlertCard
                  icon={<Users className="w-4 h-4" />}
                  label="Total clientes"
                  count={totalClientes}
                  color="text-cyan-300"
                  bg="rgba(8, 145, 178, 0.5)"
                  border="border-cyan-500/60 border-[2px]"
                  onClick={() => navigate('/clientes')}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function AlertCard({
  icon, label, count, color, bg, border, onClick
}: {
  icon: React.ReactNode; label: string; count: number
  color: string; bg: string; border: string; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl px-4 py-3 flex items-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 w-full text-left ${border} backdrop-blur-md`}
      style={{ backgroundColor: bg }}
    >
      <span className={`${color} flex-shrink-0 drop-shadow-[0_0_8px_currentColor]`} suppressHydrationWarning>{icon}</span>
      <span className="flex-1 text-sm text-white/90 font-medium">{label}</span>
      <span className={`text-lg font-bold tabular-nums ${color}`}>{count}</span>
    </button>
  );
}
```

### src/components/MetisButtonSnippet.tsx

```tsx
        <button
          onClick={() => {
            playSound('click');
            window.dispatchEvent(new Event('metis-toggle-panel'));
          }}
          className="w-16 h-16 rounded-full bg-transparent text-[#a855f7] shadow-[0_0_10px_rgba(168,85,247,0.9),inset_0_0_5px_rgba(168,85,247,0.9)] border-[1px] border-white flex items-center justify-center transition-all hover:scale-105 flex-shrink-0 relative"
          style={{ filter: 'drop-shadow(0 0 5px #a855f7)' }}
          aria-label="Asistente METIS"
        >
          <span className="font-thin text-[29px] text-white tracking-widest leading-none" style={{ WebkitTextStroke: '0.2px rgba(255, 255, 255, 0.9)' }}>AI</span>
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-green-400 rounded-full border-[2px] border-transparent animate-metis-dot" />
        </button>
```

### src/components/Navigation.tsx

```tsx
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { Menu, X, Camera, Power, Minimize2, Smartphone, Monitor, ChevronLeft, ChevronRight, Plus, UserPlus } from 'lucide-react'
import { useState, useEffect } from 'react'
import { NAV_ITEMS, FOOTER_NAV } from '../lib/navigation'
import { useTheme } from '../lib/theme'
import { useUIState } from '../lib/uiStateContext'
import { useMobileMode } from '../lib/mobileMode'

// Paleta de colores vibrantes para el menú
const MENU_COLORS = [
  '#06b6d4', // Cyan
  '#a855f7', // Purple
  '#3b82f6', // Blue
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#f43f5e', // Rose
  '#f97316', // Orange
  '#84cc16', // Lime
  '#6366f1', // Indigo
  '#14b8a6', // Teal
  '#d946ef', // Fuchsia
  '#eab308', // Yellow
]

/* ── Floating exit-fullscreen button (always visible while in fullscreen) ── */
export function FullscreenExitButton() {
  const { isFullscreen, exitFullscreen } = useUIState()
  const { playSound } = useTheme()
  const [showHint, setShowHint] = useState(false)

  if (!isFullscreen) return null

  const handleExit = () => {
    playSound('click')
    exitFullscreen()
    // Si no había elemento en fullscreen (caso F11 del navegador, que JS no puede
    // cancelar), avisamos de la única forma de salir: la tecla F11.
    if (!document.fullscreenElement) {
      setShowHint(true)
      window.setTimeout(() => setShowHint(false), 4500)
    }
  }

  return (
    <>
      {showHint && (
        <div className="fixed top-12 right-2 z-[70] bg-black/90 text-white text-xs px-3 py-2 rounded-lg border border-white/25 shadow-xl pointer-events-none">
          Pulsa <kbd className="font-bold text-[#40e0d0]">F11</kbd> (o <kbd className="font-bold text-[#40e0d0]">Esc</kbd>) para salir de pantalla completa
        </div>
      )}
      <button
        onClick={handleExit}
        className="fixed top-2 right-2 z-[70] w-10 h-10 flex items-center justify-center rounded-full bg-black/70 text-white border border-white/30 hover:bg-black/90 hover:border-[#40e0d0]/60 shadow-lg transition-all backdrop-blur-md active:scale-95"
        aria-label="Salir de pantalla completa"
        title="Salir de pantalla completa (Esc / F11)"
      >
        <Minimize2 className="w-5 h-5" />
      </button>
    </>
  )
}

/* 📱 Power button (mobile/tablet portrait, all pages, top left) 📱 */
export function PowerButton() {
  return (
    <button
      onClick={() => window.close()}
      className="gestarian-power-btn w-10 h-10 flex items-center justify-center lg:hidden fixed top-4 left-4 z-50 rounded-full border border-gray-600 bg-bg-900/80 backdrop-blur"
      title="Salir de la aplicación"
    >
      <Power className="w-5 h-5 text-red-500" />
    </button>
  )
}

/* ── Desktop header (PC / tablet landscape, auto-show on mouse-near-top) ── */
export function DesktopHeader() {
  const navigate = useNavigate()
  const location = useLocation()
  const { playSound, themeSettings } = useTheme()
  const { setHeaderHover, exitFullscreen } = useUIState()
  const { mobileMode, toggleMobileMode } = useMobileMode()
  const isInicio = location.pathname === '/'

  if (mobileMode && !window.matchMedia('(min-width: 1024px)').matches) return null

  const routes = NAV_ITEMS.filter((n) => n.path !== '/').map((n) => n.path)
  const currentIdx = routes.indexOf(location.pathname)
  const prev = currentIdx > 0 ? routes[currentIdx - 1] : null
  const next = currentIdx >= 0 && currentIdx < routes.length - 1 ? routes[currentIdx + 1] : null

  return (
    <header
      onMouseEnter={() => setHeaderHover(true)}
      onMouseLeave={() => setHeaderHover(false)}
      className="hidden md:flex gestarian-header-bar visible gestarian-panel fixed top-0 left-0 right-0 z-50 items-center gap-2 px-4 py-2.5 border-b border-bg-700"
    >
      {!isInicio && (
        <button
          onClick={() => { playSound('click'); navigate('/') }}
          className="shrink-0"
          aria-label="Inicio"
        >
          <img src={themeSettings.logo_url || "/images/logos/logo.jpg"} alt={themeSettings.commercial_name || "GESTARIAN"} className="w-8 h-8 rounded-lg object-cover" />
        </button>
      )}

      <button
        onClick={() => { if (prev) { playSound('click'); navigate(prev) } }}
        disabled={!prev}
        className="gestarian-nav-btn w-9 h-9 flex items-center justify-center disabled:opacity-30 shrink-0"
        aria-label="Retroceder"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <div className="flex-1 flex items-center gap-1 overflow-x-auto mx-2">
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path
          return (
            <button
              key={item.path}
              onClick={() => { playSound('click'); navigate(item.path) }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
                isActive
                  ? 'bg-[#40e0d0]/20 text-[#40e0d0] border border-[#40e0d0]/40'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/5'
              }`}
            >
              {item.label}
            </button>
          )
        })}
      </div>

      <button
        onClick={() => { playSound('click'); window.location.href = '/' }}
        className="gestarian-power-btn w-9 h-9 flex items-center justify-center shrink-0"
        aria-label="Salir"
      >
        <Power className="w-4 h-4" />
      </button>

      <button
        onClick={() => { playSound('click'); exitFullscreen() }}
        className="gestarian-nav-btn w-9 h-9 flex items-center justify-center shrink-0"
        aria-label="Salir de pantalla completa"
      >
        <Minimize2 className="w-4 h-4" />
      </button>

      <button
        onClick={() => { playSound('click'); toggleMobileMode() }}
        className={`gestarian-nav-btn w-9 h-9 flex items-center justify-center shrink-0 ${mobileMode ? 'text-[#40e0d0]' : ''}`}
        aria-label={mobileMode ? "Vista Escritorio" : "Vista Móvil"}
      >
        {mobileMode ? <Monitor className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
      </button>

      <button
        onClick={() => { if (next) { playSound('click'); navigate(next) } }}
        disabled={!next}
        className="gestarian-nav-btn w-9 h-9 flex items-center justify-center disabled:opacity-30 shrink-0"
        aria-label="Avanzar"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </header>
  )
}

/* ── Mobile/Tablet Portrait footer: Camera, Menu, Mic ── */
export function MobileFooter() {
  const { playSound } = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)
  const [shouldHide, setShouldHide] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const handleToggle = (e: Event) => {
      const detail = (e as CustomEvent).detail
      setShouldHide(!!detail?.hide)
    }
    window.addEventListener('gestarian-toggle-footer', handleToggle)
    return () => window.removeEventListener('gestarian-toggle-footer', handleToggle)
  }, [])

  if (shouldHide) {
    return null
  }

  // Sonido de tap al pulsar botón de menú
  const handleNavClick = (path: string) => {
    // Vibración háptica si el dispositivo lo soporta
    if ('vibrate' in navigator) navigator.vibrate(40)
    playSound('click')
    setMenuOpen(false)
    navigate(path)
  }

  const isA4Document = ['/facturas', '/presupuestos', '/presupuesto-hibrido', '/asignar-cita'].includes(location.pathname)
  if (isA4Document) return null

  return (
    <>
      {location.pathname !== '/' && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/90 via-black/[0.65] to-transparent z-40 pointer-events-none" />
      )}
      <nav className="lg:hidden fixed bottom-6 left-0 right-0 z-50 flex items-center justify-between px-6 gap-2">
        <button
          onClick={() => { playSound('click'); navigate('/presupuesto-hibrido', { state: { startCamera: true } }) }}
          className="w-16 h-16 rounded-full bg-transparent text-[#40e0d0] shadow-[0_0_10px_rgba(64,224,208,0.9),inset_0_0_5px_rgba(64,224,208,0.9)] border-[1px] border-white flex items-center justify-center transition-all hover:scale-105 flex-shrink-0"
          style={{ filter: 'drop-shadow(0 0 5px rgb(64, 224, 157))' }}
          aria-label="Cámara"
        >
          <Camera className="w-7 h-7" strokeWidth={1} color="white" />
        </button>

        <button
          onClick={() => { playSound('click'); setMenuOpen(!menuOpen) }}
          className="w-16 h-16 rounded-full bg-transparent text-[#d3d3d3] shadow-[0_0_10px_rgba(211,211,211,0.9),inset_0_0_5px_rgba(211,211,211,0.9)] border-[1px] border-white flex items-center justify-center transition-all hover:scale-105 flex-shrink-0"
          style={{ filter: 'drop-shadow(0 0 5px #f15b04e7)' }}
          aria-label="Menú"
        >
          {menuOpen ? <X className="w-7 h-7" strokeWidth={1} color="white" /> : <Menu className="w-7 h-7" strokeWidth={1} color="white" />}
        </button>

        <button
          onClick={() => {
            playSound('click');
            window.dispatchEvent(new Event('metis-toggle-panel'));
          }}
         className="w-16 h-16 rounded-full bg-transparent text-white shadow-[0_0_5px_rgba(168,85,247,1)] border-[1px] border-white/50 flex items-center justify-center transition-all hover:scale-105 flex-shrink-0 relative animate-pulse"
          style={{ backgroundColor: 'rgba(0,0,0,0)' }}
          aria-label="Asistente METIS"
        >
          <span className="font-thin text-[36px] text-white tracking-widest drop-shadow-[0_0_5px_rgba(168,85,247,1)]" style={{ WebkitTextStroke: '1px rgba(255, 255, 255, 0.5)' }}>AI</span>
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-green-400 rounded-full border-[2px] border-transparent animate-pulse" />
        </button>
      </nav>

      {menuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-[60] bg-bg-950"
          style={{
            backgroundImage: 'url(/images/backgrounds/background_portrait.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {/* Overlay oscuro semitransparente sobre la imagen */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />

          {/* Botón cerrar */}
          <button
            onClick={() => setMenuOpen(false)}
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white/70 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Bento grid — expandido al máximo con 5px de aire respecto a la pantalla */}
          <div className="relative z-10 w-full min-h-full p-[5px] flex items-center justify-center">
            <div
              className="w-full h-full max-w-none grid"
              style={{
                gridTemplateColumns: 'repeat(12, 1fr)',
                gap: '5px',
              }}
            >
              <style>{`
                @keyframes flyFromLeft {
                  0% { opacity: 0; transform: translate3d(-140px, -60px, 0) scale(0.6) rotate(-8deg); }
                  100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1) rotate(0deg); }
                }
                @keyframes flyFromRight {
                  0% { opacity: 0; transform: translate3d(140px, 60px, 0) scale(0.6) rotate(8deg); }
                  100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1) rotate(0deg); }
                }
                @keyframes flyFromTop {
                  0% { opacity: 0; transform: translate3d(0, -180px, 0) scale(0.5); }
                  100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
                }
                @keyframes flyFromBottom {
                  0% { opacity: 0; transform: translate3d(0, 180px, 0) scale(0.5); }
                  100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
                }
                @keyframes flyFromTopRight {
                  0% { opacity: 0; transform: translate3d(160px, -120px, 0) scale(0.5) rotate(12deg); }
                  100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1) rotate(0deg); }
                }
                @keyframes flyFromBottomLeft {
                  0% { opacity: 0; transform: translate3d(-160px, 120px, 0) scale(0.5) rotate(-12deg); }
                  100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1) rotate(0deg); }
                }
                @keyframes bentoTap {
                  0% { transform: scale(1); }
                  40% { transform: scale(0.93); }
                  100% { transform: scale(1); }
                }
                .bento-btn {
                  position: relative;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  justify-content: center;
                  gap: 3px;
                  border-radius: 12px;
                  border-width: 1px;
                  border-style: solid;
                  overflow: hidden;
                  cursor: pointer;
                  -webkit-tap-highlight-color: transparent;
                  transition: border-color 0.2s ease, box-shadow 0.2s ease;
                  padding: 6px;
                  min-height: 58px;
                  animation-duration: 1.5s;
                  animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
                  animation-fill-mode: backwards;
                  backdrop-filter: blur(12px);
                }
                .bento-btn span {
                  color: #e2e8f0;
                  font-weight: 100;
                  font-size: 0.85rem;
                }
                .bento-btn:active {
                  animation: bentoTap 0.22s cubic-bezier(0.4, 0, 0.2, 1) forwards;
                }
                .bento-btn.active-page {
                  border-width: 2.5px;
                  box-shadow: 0 0 20px rgba(255,255,255,0.3);
                }
              `}</style>

              {/* 1. INICIO */}
              {(() => {
                const item = NAV_ITEMS.find(n => n.path === '/')
                if (!item) return null
                const Icon = item.icon
                const color = MENU_COLORS[0]
                const isActive = location.pathname === item.path
                return (
                  <button
                    key={item.path}
                    className={`bento-btn ${isActive ? 'active-page' : ''}`}
                    style={{ gridColumn: 'span 6', backgroundColor: `${color}28`, borderColor: color, animationName: 'flyFromLeft', animationDelay: '0.05s' }}
                    onClick={() => handleNavClick(item.path)}
                  >
                    <Icon className="w-7 h-7 shrink-0" style={{ color }} strokeWidth={1.8} />
                    <span className="text-white font-bold text-sm truncate">{item.label}</span>
                  </button>
                )
              })()}

              {/* 2. EXPEDIENTES */}
              {(() => {
                const item = NAV_ITEMS.find(n => n.path === '/expedientes')
                if (!item) return null
                const Icon = item.icon
                const color = MENU_COLORS[1]
                const isActive = location.pathname === item.path
                return (
                  <button
                    key={item.path}
                    className={`bento-btn ${isActive ? 'active-page' : ''}`}
                    style={{ gridColumn: 'span 6', backgroundColor: `${color}28`, borderColor: color, animationName: 'flyFromTopRight', animationDelay: '0.12s' }}
                    onClick={() => handleNavClick(item.path)}
                  >
                    <Icon className="w-7 h-7 shrink-0" style={{ color }} strokeWidth={1.8} />
                    <span className="text-white font-bold text-sm truncate">{item.label}</span>
                  </button>
                )
              })()}

              {/* 3. CLIENTES */}
              {(() => {
                const item = NAV_ITEMS.find(n => n.path === '/clientes')
                if (!item) return null
                const Icon = item.icon
                const color = MENU_COLORS[2]
                const isActive = location.pathname === item.path
                return (
                  <button
                    key={item.path}
                    className={`bento-btn ${isActive ? 'active-page' : ''}`}
                    style={{ gridColumn: 'span 8', backgroundColor: `${color}28`, borderColor: color, animationName: 'flyFromBottomLeft', animationDelay: '0.2s' }}
                    onClick={() => handleNavClick(item.path)}
                  >
                    <Icon className="w-7 h-7 shrink-0" style={{ color }} strokeWidth={1.8} />
                    <span className="text-white font-bold text-sm tracking-wide truncate">{item.label}</span>
                  </button>
                )
              })()}

              {/* 4. CITAS */}
              {(() => {
                const item = NAV_ITEMS.find(n => n.path === '/citas')
                if (!item) return null
                const Icon = item.icon
                const color = MENU_COLORS[3]
                const isActive = location.pathname === item.path
                return (
                  <button
                    key={item.path}
                    className={`bento-btn ${isActive ? 'active-page' : ''}`}
                    style={{ gridColumn: 'span 4', backgroundColor: `${color}28`, borderColor: color, animationName: 'flyFromRight', animationDelay: '0.28s' }}
                    onClick={() => handleNavClick(item.path)}
                  >
                    <Icon className="w-6 h-6 shrink-0" style={{ color }} strokeWidth={1.8} />
                    <span className="text-white font-bold text-sm truncate">{item.label}</span>
                  </button>
                )
              })()}

              {/* 5. PRESUPUESTOS */}
              {(() => {
                const item = NAV_ITEMS.find(n => n.path === '/presupuestos')
                if (!item) return null
                const Icon = item.icon
                const color = MENU_COLORS[4]
                const isActive = location.pathname === item.path
                return (
                  <button
                    key={item.path}
                    className={`bento-btn ${isActive ? 'active-page' : ''}`}
                    style={{ gridColumn: 'span 8', backgroundColor: `${color}28`, borderColor: color, animationName: 'flyFromTop', animationDelay: '0.35s' }}
                    onClick={() => handleNavClick(item.path)}
                  >
                    <Icon className="w-7 h-7 shrink-0" style={{ color }} strokeWidth={1.8} />
                    <span className="text-white font-bold text-sm tracking-wide truncate">{item.label}</span>
                  </button>
                )
              })()}

              {/* 6. REPARACIONES */}
              {(() => {
                const item = NAV_ITEMS.find(n => n.path === '/reparaciones')
                if (!item) return null
                const Icon = item.icon
                const color = MENU_COLORS[5]
                const isActive = location.pathname === item.path
                return (
                  <button
                    key={item.path}
                    className={`bento-btn ${isActive ? 'active-page' : ''}`}
                    style={{ gridColumn: 'span 4', backgroundColor: `${color}28`, borderColor: color, animationName: 'flyFromBottom', animationDelay: '0.42s' }}
                    onClick={() => handleNavClick(item.path)}
                  >
                    <Icon className="w-6 h-6 shrink-0" style={{ color }} strokeWidth={1.8} />
                    <span className="text-white font-bold text-sm truncate">{item.label}</span>
                  </button>
                )
              })()}

              {/* 7. FACTURACIÓN */}
              {(() => {
                const item = NAV_ITEMS.find(n => n.path === '/facturas')
                if (!item) return null
                const Icon = item.icon
                const color = MENU_COLORS[6]
                const isActive = location.pathname === item.path
                return (
                  <button
                    key={item.path}
                    className={`bento-btn ${isActive ? 'active-page' : ''}`}
                    style={{ gridColumn: 'span 8', backgroundColor: `${color}28`, borderColor: color, animationName: 'flyFromLeft', animationDelay: '0.5s' }}
                    onClick={() => handleNavClick(item.path)}
                  >
                    <Icon className="w-7 h-7 shrink-0" style={{ color }} strokeWidth={1.8} />
                    <span className="text-white font-bold text-sm tracking-wide truncate">{item.label}</span>
                  </button>
                )
              })()}

              {/* 8. BALANCES */}
              {(() => {
                const item = NAV_ITEMS.find(n => n.path === '/balances')
                if (!item) return null
                const Icon = item.icon
                const color = MENU_COLORS[7]
                const isActive = location.pathname === item.path
                return (
                  <button
                    key={item.path}
                    className={`bento-btn ${isActive ? 'active-page' : ''}`}
                    style={{ gridColumn: 'span 4', backgroundColor: `${color}28`, borderColor: color, animationName: 'flyFromTopRight', animationDelay: '0.58s' }}
                    onClick={() => handleNavClick(item.path)}
                  >
                    <Icon className="w-6 h-6 shrink-0" style={{ color }} strokeWidth={1.8} />
                    <span className="text-white font-bold text-sm truncate">{item.label}</span>
                  </button>
                )
              })()}

              {/* 9. PROVEEDORES */}
              {(() => {
                const item = NAV_ITEMS.find(n => n.path === '/proveedores')
                if (!item) return null
                const Icon = item.icon
                const color = MENU_COLORS[8]
                const isActive = location.pathname === item.path
                return (
                  <button
                    key={item.path}
                    className={`bento-btn ${isActive ? 'active-page' : ''}`}
                    style={{ gridColumn: 'span 6', backgroundColor: `${color}28`, borderColor: color, animationName: 'flyFromBottomLeft', animationDelay: '0.65s' }}
                    onClick={() => handleNavClick(item.path)}
                  >
                    <Icon className="w-7 h-7 shrink-0" style={{ color }} strokeWidth={1.8} />
                    <span className="text-white font-bold text-sm tracking-wide truncate">{item.label}</span>
                  </button>
                )
              })()}

              {/* 10. INCIDENCIAS */}
              {(() => {
                const item = NAV_ITEMS.find(n => n.path === '/incidencias')
                if (!item) return null
                const Icon = item.icon
                const color = MENU_COLORS[9]
                const isActive = location.pathname === item.path
                return (
                  <button
                    key={item.path}
                    className={`bento-btn ${isActive ? 'active-page' : ''}`}
                    style={{ gridColumn: 'span 6', backgroundColor: `${color}28`, borderColor: color, animationName: 'flyFromRight', animationDelay: '0.72s' }}
                    onClick={() => handleNavClick(item.path)}
                  >
                    <Icon className="w-6 h-6 shrink-0" style={{ color }} strokeWidth={1.8} />
                    <span className="text-white font-bold text-sm truncate">{item.label}</span>
                  </button>
                )
              })()}

              {/* 11. USUARIOS */}
              {(() => {
                const item = NAV_ITEMS.find(n => n.path === '/usuarios')
                if (!item) return null
                const Icon = item.icon
                const color = MENU_COLORS[10]
                const isActive = location.pathname === item.path
                return (
                  <button
                    key={item.path}
                    className={`bento-btn ${isActive ? 'active-page' : ''}`}
                    style={{ gridColumn: 'span 6', backgroundColor: `${color}28`, borderColor: color, animationName: 'flyFromBottom', animationDelay: '0.78s' }}
                    onClick={() => handleNavClick(item.path)}
                  >
                    <Icon className="w-6 h-6 shrink-0" style={{ color }} strokeWidth={1.8} />
                    <span className="text-white font-bold text-sm truncate">{item.label}</span>
                  </button>
                )
              })()}

              {/* 12. CONFIGURACIÓN */}
              {(() => {
                const item = NAV_ITEMS.find(n => n.path === '/configuracion')
                if (!item) return null
                const Icon = item.icon
                const color = MENU_COLORS[11]
                const isActive = location.pathname === item.path
                return (
                  <button
                    key={item.path}
                    className={`bento-btn ${isActive ? 'active-page' : ''}`}
                    style={{ gridColumn: 'span 6', backgroundColor: `${color}28`, borderColor: color, animationName: 'flyFromBottom', animationDelay: '0.84s' }}
                    onClick={() => handleNavClick(item.path)}
                  >
                    <Icon className="w-6 h-6 shrink-0" style={{ color }} strokeWidth={1.8} />
                    <span className="text-white font-bold text-sm truncate">{item.label}</span>
                  </button>
                )
              })()}

              {/* 13. NUEVO PRESUPUESTO */}
              {(() => {
                const color = '#06b6d4'
                return (
                  <button
                    key="nuevo-presupuesto"
                    className="bento-btn"
                    style={{ gridColumn: 'span 6', backgroundColor: `${color}28`, borderColor: color, animationName: 'flyFromBottom', animationDelay: '0.90s' }}
                    onClick={() => {
                      playSound('click')
                      setMenuOpen(false)
                      navigate('/presupuestos', { state: { openForm: true } })
                    }}
                  >
                    <Plus className="w-6 h-6 shrink-0" style={{ color }} strokeWidth={1.8} />
                    <span className="text-white font-bold text-sm truncate">Nuevo Presupuesto</span>
                  </button>
                )
              })()}

              {/* 14. NUEVO CLIENTE */}
              {(() => {
                const color = '#10b981'
                return (
                  <button
                    key="nuevo-cliente"
                    className="bento-btn"
                    style={{ gridColumn: 'span 6', backgroundColor: `${color}28`, borderColor: color, animationName: 'flyFromBottom', animationDelay: '0.96s' }}
                    onClick={() => {
                      playSound('click')
                      setMenuOpen(false)
                      navigate('/clientes', { state: { openNewModal: true } })
                    }}
                  >
                    <UserPlus className="w-6 h-6 shrink-0" style={{ color }} strokeWidth={1.8} />
                    <span className="text-white font-bold text-sm truncate">Nuevo Cliente</span>
                  </button>
                )
              })()}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/* ── PC / Tablet Landscape footer: 3x1 text buttons, auto-show, gray bg when not Inicio ── */
export function DesktopFooter() {
  const { playSound } = useTheme()
  const location = useLocation()
  const { footerVisible, setFooterHover } = useUIState()
  const { mobileMode } = useMobileMode()
  const isInicio = location.pathname === '/'
  const isA4Document = ['/facturas', '/presupuestos', '/presupuesto-hibrido', '/asignar-cita'].includes(location.pathname)

  if (mobileMode || isA4Document) return null

  return (
    <div
      onMouseEnter={() => setFooterHover(true)}
      onMouseLeave={() => setFooterHover(false)}
      className={`hidden lg:flex gestarian-footer-bar ${footerVisible ? 'visible' : ''} fixed bottom-0 left-0 right-0 z-40 items-center justify-center gap-2 py-3 ${isInicio ? '' : 'gestarian-footer-gray'}`}
    >
      {FOOTER_NAV.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          end={item.path === '/'}
          onClick={() => playSound('click')}
          className={({ isActive }) =>
            `gestarian-footer-text-btn ${isActive ? 'active' : ''}`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </div>
  )
}
```

### src/components/UI.tsx

```tsx
import type { ReactNode } from 'react'

import { useNavigate } from 'react-router-dom'
export { ActionMenu } from './ActionMenu'
export { TimelineVisual } from './TimelineVisual'
export { MatriculaBadge } from './MatriculaBadge'

export function PageHeader({ title, subtitle, children, doubleTitleSize, titleClassName }: { title: string; subtitle?: string; children?: ReactNode; doubleTitleSize?: boolean; titleClassName?: string }) {
  const navigate = useNavigate()
  return (
    <div className="relative flex items-center justify-between mb-6 w-full px-2 min-h-[60px]">
      {/* Logo corporativo a la izquierda (x1.5 = 60px x 60px) */}
      <button
        onClick={() => navigate('/')}
        className="w-15 h-15 w-[60px] h-[60px] rounded-2xl overflow-hidden border border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.2)] hover:scale-105 transition-transform active:scale-95 shrink-0 bg-white z-10"
        title="Ir a Inicio"
        aria-label="Ir a Inicio"
      >
        <img src="/images/logos/logo.jpg" alt="Logo Corporativo" className="w-full h-full object-cover" />
      </button>

      {/* Título centrado absoluto (escalado x0.8 o x2 o custom) y subtítulo opcional */}
      <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center justify-center pointer-events-none text-center">
        <h1 className={`font-bold uppercase tracking-wider text-[var(--color-texto)] drop-shadow-[0_0_10px_rgba(255,255,255,0.3)] whitespace-nowrap ${titleClassName || (doubleTitleSize ? 'text-3xl md:text-4xl' : 'text-lg')}`}>
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs sm:text-sm text-cyan-400 font-semibold italic tracking-wide mt-0.5 whitespace-nowrap drop-shadow-[0_0_6px_rgba(6,182,212,0.4)]">
            {subtitle}
          </p>
        )}
      </div>

      {/* Elementos a la derecha (Botones de acción) */}
      <div className="flex items-center gap-3 z-10 ml-auto">
        {children}
      </div>
    </div>
  )
}

export function Card({ children, className = '', onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div 
      className={`gestarian-panel border border-bg-700 rounded-custom shadow-[var(--shadow-custom)] ${className} ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      {children}
    </div>
  )

}

export function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled,
  className = '',
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md'
  disabled?: boolean
  className?: string
}) {
  const variants = {
    primary: 'gestarian-btn-primary',
    secondary: 'gestarian-btn-secondary',
    danger: 'gestarian-btn-danger',
    ghost: 'gestarian-btn-ghost',
  }
  const sizes = {
    sm: 'px-5 py-3 text-base',
    md: 'px-6 py-4 text-lg',
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`gestarian-btn font-semibold rounded-custom transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  )
}

export function Input({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  addonRight,
  className = '',
  inputClassName = '',
  labelClassName = '',
  inputMode,
  enterKeyHint,
  autoComplete,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
  addonRight?: ReactNode
  className?: string
  inputClassName?: string
  labelClassName?: string
  inputMode?: 'none' | 'text' | 'decimal' | 'numeric' | 'tel' | 'search' | 'email' | 'url'
  enterKeyHint?: 'enter' | 'done' | 'go' | 'next' | 'previous' | 'search' | 'send'
  autoComplete?: string
}) {
  return (
    <div className={className}>
      {label && <label className={`block text-sm sm:text-lg text-white/50 mb-2 ${labelClassName}`}>{label}</label>}
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          inputMode={inputMode}
          enterKeyHint={enterKeyHint}
          autoComplete={autoComplete}
          className={`w-full gestarian-field rounded-custom px-5 py-4 text-lg focus:outline-none transition-colors ${addonRight ? 'pr-16' : ''} ${inputClassName || ''}`}
        />
        {addonRight && (
          <div className="absolute right-0 top-0 bottom-0 overflow-hidden rounded-r-custom">
            {addonRight}
          </div>
        )}
      </div>
    </div>
  )
}

export function Badge({ text, color, onClick }: { text: string; color: 'yellow' | 'green' | 'red' | 'blue' | 'gray', onClick?: () => void }) {
  const colors = {
    yellow: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    green: 'bg-green-500/15 text-green-400 border-green-500/30',
    red: 'bg-red-500/15 text-red-400 border-red-500/30',
    blue: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    gray: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
  }
  return (
    <span onClick={onClick} className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors[color]} ${onClick ? 'cursor-pointer hover:opacity-80 active:scale-95 transition-all' : ''}`}>
      {text}
    </span>
  )
}

export function EmptyState({ icon: Icon, title, subtitle }: { icon: ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-white/30 mb-3">{Icon}</div>
      <p className="text-white/60 font-medium">{title}</p>
      {subtitle && <p className="text-sm text-white/40 mt-1">{subtitle}</p>}
    </div>
  )
}

export function MetisRowButton({
  tipo,
  id,
  numero,
  matricula,
  cliente_nombre,
  data,
  label = 'IA Metis',
  className = '',
}: {
  tipo: 'presupuesto' | 'cita' | 'reparacion' | 'factura' | 'cliente' | 'vehiculo'
  id?: string
  numero?: string
  matricula?: string
  cliente_nombre?: string
  data?: any
  label?: string
  className?: string
}) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    const event = new CustomEvent('metis-open-context', {
      detail: {
        context: { tipo, id, numero, matricula, cliente_nombre, data },
        autoMic: true,
      },
    })
    window.dispatchEvent(event)
  }

  return (
    <button
      onClick={handleClick}
      title={`Hablar con METIS sobre este expediente (${numero || matricula || tipo})`}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-xs font-semibold transition-all hover:scale-105 ${className}`}
    >
      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
      {label}
    </button>
  )
}
```

## D. Servicios de integracion

### src/lib/cronFiscalService.ts

```ts
export type TipoAvisoFiscal =
  | 'aviso_20'
  | 'aviso_25'
  | 'permiso_30'
  | 'permiso_5'
  | 'aviso_9'
  | 'envio_10'

export interface CronEvent {
  tipo: TipoAvisoFiscal
  mensaje: string
  requierePermiso?: boolean
  fechaDisparo: Date
}

export class CronFiscalService {
  private static KEY = 'gestarian_cron_fiscal_status'

  // Devuelve el estado guardado de los avisos enviados
  static getStatus(): Record<string, boolean> {
    try {
      const data = localStorage.getItem(this.KEY)
      return data ? JSON.parse(data) : {}
    } catch {
      return {}
    }
  }

  static markAsDone(avisoId: string) {
    const status = this.getStatus()
    status[avisoId] = true
    localStorage.setItem(this.KEY, JSON.stringify(status))
  }

  static isDone(avisoId: string): boolean {
    return !!this.getStatus()[avisoId]
  }

  // Comprueba la fecha actual y devuelve el evento correspondiente (si hay alguno pendiente)
  static checkCurrentDate(): CronEvent | null {
    const now = new Date()
    const month = now.getMonth() // 0-11
    const date = now.getDate()
    const year = now.getFullYear()
    
    // Meses pre-cierre (Marzo=2, Junio=5, Septiembre=8, Diciembre=11)
    const isPreCierre = [2, 5, 8, 11].includes(month)
    // Meses de cierre (Abril=3, Julio=6, Octubre=9, Enero=0)
    const isCierre = [3, 6, 9, 0].includes(month)

    const quarter = Math.floor(month / 3) + 1 // Q1, Q2, Q3, Q4
    const idPrefix = `Q${quarter}-${year}`
    const prevQuarter = quarter === 1 ? 4 : quarter - 1
    const prevIdPrefix = quarter === 1 ? `Q4-${year - 1}` : `Q${prevQuarter}-${year}`

    if (isPreCierre) {
      if (date >= 20 && !this.isDone(`${idPrefix}-aviso_20`)) {
        return { tipo: 'aviso_20', mensaje: "Recuerda ir adjuntando las facturas de gastos pendientes, se acerca el cierre trimestral.", fechaDisparo: now }
      }
      if (date >= 25 && !this.isDone(`${idPrefix}-aviso_25`)) {
        return { tipo: 'aviso_25', mensaje: "Recuerda ir adjuntando las facturas de gastos pendientes, se acerca el cierre trimestral.", fechaDisparo: now }
      }
      if (date >= 30 && !this.isDone(`${idPrefix}-permiso_30`)) {
        return { tipo: 'permiso_30', mensaje: "El cierre trimestral está a la vuelta de la esquina. ¿Me das permiso para enviar el trimestre a la gestoría cuando esté listo?", requierePermiso: true, fechaDisparo: now }
      }
    }

    if (isCierre) {
      // Los avisos del mes de cierre corresponden al trimestre anterior
      if (date >= 5 && !this.isDone(`${prevIdPrefix}-permiso_5`) && !this.hasPermiso(prevIdPrefix)) {
        return { tipo: 'permiso_5', mensaje: "Aún no tengo permiso para enviar el informe trimestral a tu gestoría. ¿Me das permiso para enviarlo?", requierePermiso: true, fechaDisparo: now }
      }
      if (date >= 9 && !this.isDone(`${prevIdPrefix}-aviso_9`)) {
        return { tipo: 'aviso_9', mensaje: "Mañana a las 18:00 se enviará el informe trimestral a tu gestoría automáticamente. Si no has incluido alguna factura, no te preocupes, en el próximo trimestre la podrás incluir.", fechaDisparo: now }
      }
      if (date >= 10) {
        // Día 10: si son más de las 18:00 (o días posteriores), forzamos envío si no se ha hecho
        const isPast18 = now.getHours() >= 18 || date > 10
        if (isPast18 && !this.isDone(`${prevIdPrefix}-envio_10`)) {
          return { tipo: 'envio_10', mensaje: "He procedido a enviar automáticamente el informe trimestral a tu gestoría.", fechaDisparo: now }
        }
      }
    }

    return null
  }

  static hasPermiso(idPrefix: string): boolean {
    return !!this.getStatus()[`${idPrefix}-permiso_concedido`]
  }

  static darPermiso() {
    const now = new Date()
    const month = now.getMonth()
    const quarter = Math.floor(month / 3) + 1
    const year = now.getFullYear()
    
    // Si estamos en mes de cierre, el permiso es para el trimestre anterior
    const isCierre = [3, 6, 9, 0].includes(month)
    const targetQuarter = isCierre ? (quarter === 1 ? 4 : quarter - 1) : quarter
    const targetYear = isCierre && quarter === 1 ? year - 1 : year
    
    const idPrefix = `Q${targetQuarter}-${targetYear}`
    const status = this.getStatus()
    status[`${idPrefix}-permiso_concedido`] = true
    localStorage.setItem(this.KEY, JSON.stringify(status))
  }

  static getAvisoId(tipo: TipoAvisoFiscal): string {
    const now = new Date()
    const month = now.getMonth()
    const year = now.getFullYear()
    const quarter = Math.floor(month / 3) + 1
    
    const isCierre = [3, 6, 9, 0].includes(month)
    const targetQuarter = isCierre ? (quarter === 1 ? 4 : quarter - 1) : quarter
    const targetYear = isCierre && quarter === 1 ? year - 1 : year

    return `Q${targetQuarter}-${targetYear}-${tipo}`
  }
}
```

### src/services/gestoriaExportService.ts

```ts
import { supabase } from '../lib/supabase'
import { exportToA3, exportToSAGE, exportToExcel } from '../lib/accountingExporters'

export async function enviarTrimestreGestoriaAutomático() {
  try {
    // 1. Obtener email de la gestoría de configuración
    const { data: config } = await supabase.from('configuracion').select('*').eq('id', 1).maybeSingle()
    const emailGestoria = config?.email_gestoria
    if (!emailGestoria) {
      console.warn("No hay email de gestoría configurado. No se puede enviar el informe.")
      return false
    }

    // 2. Determinar el trimestre a enviar. Si estamos en enero, abril, julio, octubre (meses de cierre), enviamos el anterior.
    const now = new Date()
    const month = now.getMonth() // 0-11
    const year = now.getFullYear()
    const quarter = Math.floor(month / 3) + 1

    const isCierre = [3, 6, 9, 0].includes(month)
    const targetQuarter = isCierre ? (quarter === 1 ? 4 : quarter - 1) : quarter
    const targetYear = isCierre && quarter === 1 ? year - 1 : year

    // Definir fechas inicio y fin del trimestre objetivo
    // Q1 = Ene-Mar (0-2), Q2 = Abr-Jun (3-5), Q3 = Jul-Sep (6-8), Q4 = Oct-Dic (9-11)
    const startMonth = (targetQuarter - 1) * 3
    const endMonth = startMonth + 2
    
    // Fechas en formato YYYY-MM-DD
    const startDate = new Date(targetYear, startMonth, 1)
    const endDate = new Date(targetYear, endMonth + 1, 0) // Último día del mes fin
    
    const startStr = startDate.toISOString().split('T')[0]
    const endStr = endDate.toISOString().split('T')[0]

    // 3. Obtener facturas emitidas y recibidas
    const { data: facturasEmitidas } = await supabase
      .from('facturas')
      .select('*')
      .gte('fecha', startStr)
      .lte('fecha', endStr)

    const { data: facturasRecibidas } = await supabase
      .from('facturas_recibidas')
      .select('*')
      .gte('fecha', startStr)
      .lte('fecha', endStr)

    // 4. Generar archivos (strings en texto plano / CSV)
    const em = facturasEmitidas || []
    const rec = facturasRecibidas || []
    
    const a3Content = exportToA3(em, rec, startStr, endStr, false)
    const sageContent = exportToSAGE(em, rec, startStr, endStr, false)
    const csvContent = exportToExcel(em, rec, startStr, endStr, false)

    // Función helper para convertir string UTF-8 a Base64 sin problemas de tildes
    const toBase64 = (str: string) => {
      const bytes = new TextEncoder().encode(str)
      const binString = String.fromCodePoint(...bytes)
      return btoa(binString)
    }

    // 5. Preparar adjuntos
    const adjuntos = [
      {
        filename: `GESTARIAN_A3_Q${targetQuarter}_${targetYear}.txt`,
        content: toBase64(a3Content),
        contentType: 'text/plain'
      },
      {
        filename: `GESTARIAN_SAGE_Q${targetQuarter}_${targetYear}.txt`,
        content: toBase64(sageContent),
        contentType: 'text/plain'
      },
      {
        filename: `GESTARIAN_EXCEL_Q${targetQuarter}_${targetYear}.csv`,
        content: toBase64(csvContent),
        contentType: 'text/csv'
      }
    ]

    // 6. Enviar vía Edge Function
    const { data: edgeData, error: edgeError } = await supabase.functions.invoke('send-communication', {
      body: {
        to: emailGestoria,
        subject: `Cierre Trimestral Q${targetQuarter} ${targetYear} - GESTARIAN`,
        htmlBody: `<p>Hola,</p><p>Adjuntamos los informes contables correspondientes al cierre del trimestre <strong>Q${targetQuarter} del año ${targetYear}</strong>, generados automáticamente desde GESTARIAN.</p><p>Formatos incluidos: A3, SAGE y CSV.</p><p>Un saludo.</p>`,
        attachments: adjuntos
      }
    })

    if (edgeError || !edgeData?.success) {
      console.error("Error al enviar el trimestre a la gestoría:", edgeError || edgeData)
      return false
    }

    return true
  } catch (error) {
    console.error("Excepción en enviarTrimestreGestoriaAutomático:", error)
    return false
  }
}
```

### src/services/plateRecognizerService.ts

```ts
/**
 * Servicio centralizado para OCR de matrículas mediante Plate Recognizer.
 *
 * REGLAS:
 * - Plate Recognizer es el proveedor exclusivo de OCR de matrículas.
 * - CameraModal y otros componentes NO deben llamar directamente a la API.
 * - La API Key se obtiene desde la configuración/localStorage.
 * - Si el OCR falla, la aplicación devuelve un error comprensible
 *   y permite continuar con introducción manual.
 */

import type { PlateRecognizerConfig } from '../lib/types'
import { extractMatricula } from '../lib/metisAiEngine'

export interface PlateRecognitionResult {
  success: boolean
  matricula?: string
  matricula_normalizada?: string
  confidence?: number
  fecha_hora: string
  image_ref?: string
  error_message?: string
}

const DEFAULT_ENDPOINT =
  'https://api.platerecognizer.com/v1/plate-reader/'

/**
 * Obtiene la configuración actual de Plate Recognizer.
 */
export function getPlateRecognizerConfig(): PlateRecognizerConfig {
  const saved = localStorage.getItem(
    'gestarian_plate_recognizer_config'
  )

  if (saved) {
    try {
      const parsed = JSON.parse(saved)

      return {
        provider: 'plate_recognizer',
        api_key:
          parsed.api_key ||
          localStorage.getItem('gestarian_plate_recognizer_key') ||
          '',
        endpoint_url:
          parsed.endpoint_url || DEFAULT_ENDPOINT,
        status: parsed.status || 'disconnected',
      }
    } catch {
      // Si la configuración almacenada está dañada,
      // se utiliza la configuración por defecto.
    }
  }

  const apiKey =
    localStorage.getItem('gestarian_plate_recognizer_key') || ''

  return {
    provider: 'plate_recognizer',
    api_key: apiKey,
    endpoint_url: DEFAULT_ENDPOINT,
    status: apiKey ? 'connected' : 'disconnected',
  }
}

/**
 * Guarda la configuración de Plate Recognizer.
 */
export function savePlateRecognizerConfig(
  config: PlateRecognizerConfig
): void {
  localStorage.setItem(
    'gestarian_plate_recognizer_config',
    JSON.stringify(config)
  )

  if (config.api_key) {
    localStorage.setItem(
      'gestarian_plate_recognizer_key',
      config.api_key
    )
  }
}

/**
 * Normaliza una matrícula eliminando espacios y caracteres extraños.
 *
 * Ejemplo:
 * "1234-bbb" -> "1234 BBB"
 */
export function normalizeSpanishPlate(rawPlate: string): string {
  if (!rawPlate) return ''

  try {
    const extracted = extractMatricula(rawPlate)

    if (extracted) {
      return extracted
    }
  } catch {
    // Si extractMatricula falla continuamos
    // con la normalización local.
  }

  const clean = rawPlate
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')

  /*
   * Matrícula española moderna:
   * 1234 ABC
   */
  const modernMatch = clean.match(/^(\d{4})([A-Z]{3})$/)

  if (modernMatch) {
    return `${modernMatch[1]} ${modernMatch[2]}`
  }

  /*
   * Si tiene al menos 7 caracteres,
   * intentamos aplicar formato visual.
   */
  if (clean.length >= 7) {
    return `${clean.slice(0, 4)} ${clean.slice(4, 7)}`
  }

  return clean
}

/**
 * Convierte una matrícula a formato interno para búsquedas
 * y almacenamiento.
 *
 * Ejemplo:
 * "1234 BBB" -> "1234BBB"
 */
export function cleanPlateForStorage(
  plate: string
): string {
  return plate
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
}

/**
 * Comprueba si una matrícula tiene una estructura española moderna válida.
 *
 * Ejemplo válido:
 * 1234 BBB
 */
export function isValidSpanishPlate(
  plate: string
): boolean {
  const clean = cleanPlateForStorage(plate)

  return /^\d{4}[A-Z]{3}$/.test(clean)
}

/**
 * Prueba la conexión con Plate Recognizer.
 *
 * Plate Recognizer puede responder 405 a una petición GET,
 * por lo que solamente consideramos error de autenticación
 * los códigos 401 y 403.
 */
export async function testPlateRecognizerConnection(
  config: PlateRecognizerConfig
): Promise<{
  success: boolean
  message: string
}> {
  if (!config.api_key?.trim()) {
    return {
      success: false,
      message:
        'Se requiere la API Key de Plate Recognizer.',
    }
  }

  try {
    const response = await fetch(
      config.endpoint_url || DEFAULT_ENDPOINT,
      {
        method: 'GET',
        headers: {
          Authorization: `Token ${config.api_key}`,
        },
      }
    )

    if (
      response.status === 401 ||
      response.status === 403
    ) {
      return {
        success: false,
        message:
          'La API Key de Plate Recognizer no es válida o no tienes permisos para utilizar el servicio.',
      }
    }

    return {
      success: true,
      message:
        'Conexión con Plate Recognizer verificada correctamente.',
    }
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : 'Error desconocido al conectar con Plate Recognizer.'

    return {
      success: false,
      message,
    }
  }
}

/**
 * Reconoce una matrícula a partir de una imagen.
 *
 * Acepta:
 * - Blob
 * - URL de imagen
 * - Data URL (base64)
 */
export async function recognizeVehiclePlate(
  imageBlobOrUrl: Blob | string
): Promise<PlateRecognitionResult> {
  const config = getPlateRecognizerConfig()
  const timestamp = new Date().toISOString()

  if (!config.api_key?.trim()) {
    return {
      success: false,
      fecha_hora: timestamp,
      error_message:
        'Plate Recognizer no está configurado. Puedes introducir la matrícula manualmente.',
    }
  }

  try {
    const formData = new FormData()

    if (imageBlobOrUrl instanceof Blob) {
      formData.append(
        'upload',
        imageBlobOrUrl,
        'vehiculo.jpg'
      )
    } else if (
      imageBlobOrUrl.startsWith('data:')
    ) {
      /*
       * Convierte Data URL a Blob.
       */
      const imageResponse = await fetch(imageBlobOrUrl)
      const imageBlob = await imageResponse.blob()

      formData.append(
        'upload',
        imageBlob,
        'vehiculo.jpg'
      )
    } else {
      /*
       * Si es una URL normal.
       */
      formData.append(
        'upload_url',
        imageBlobOrUrl
      )
    }

    /*
     * Priorizamos España.
     */
    formData.append('regions', 'es')

    const response = await fetch(
      config.endpoint_url || DEFAULT_ENDPOINT,
      {
        method: 'POST',
        headers: {
          Authorization: `Token ${config.api_key}`,
        },
        body: formData,
      }
    )

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => null)

      let errorMessage =
        `Error Plate Recognizer (HTTP ${response.status}).`

      if (
        errorData &&
        typeof errorData === 'object'
      ) {
        if (
          typeof errorData.detail === 'string'
        ) {
          errorMessage = errorData.detail
        } else if (
          typeof errorData.message === 'string'
        ) {
          errorMessage = errorData.message
        }
      }

      if (
        response.status === 401 ||
        response.status === 403
      ) {
        errorMessage =
          'La API Key de Plate Recognizer no es válida o no tienes permisos.'
      }

      if (response.status === 429) {
        errorMessage =
          'Se ha alcanzado el límite de uso de Plate Recognizer. Puedes introducir la matrícula manualmente.'
      }

      return {
        success: false,
        fecha_hora: timestamp,
        error_message: errorMessage,
      }
    }

    const data = await response.json()

    const results = Array.isArray(data?.results)
      ? data.results
      : []

    if (results.length === 0) {
      return {
        success: false,
        fecha_hora: timestamp,
        error_message:
          'No se detectó ninguna matrícula clara en la fotografía. Puedes repetir la foto o introducirla manualmente.',
      }
    }

    /*
     * Elegimos el resultado con mayor puntuación.
     */
    const bestResult = results.reduce(
      (
        best: {
          plate?: string
          score?: number
        },
        current: {
          plate?: string
          score?: number
        }
      ) => {
        return (current.score || 0) >
          (best.score || 0)
          ? current
          : best
      }
    )

    if (!bestResult?.plate) {
      return {
        success: false,
        fecha_hora: timestamp,
        error_message:
          'No se pudo obtener una matrícula válida de la imagen.',
      }
    }

    const rawPlate = bestResult.plate
      .toUpperCase()
      .replace(/\s/g, '')

    const normalizedPlate =
      normalizeSpanishPlate(rawPlate)

    return {
      success: true,
      matricula: rawPlate,
      matricula_normalizada: normalizedPlate,
      confidence: Math.round(
        (bestResult.score || 0) * 100
      ),
      fecha_hora: timestamp,
    }
  } catch (error: unknown) {
    console.error(
      'Plate Recognizer error:',
      error
    )

    const message =
      error instanceof Error
        ? error.message
        : ''

    return {
      success: false,
      fecha_hora: timestamp,
      error_message:
        message
          ? `Error de comunicación con Plate Recognizer: ${message}. Puedes introducir la matrícula manualmente.`
          : 'Error de comunicación con Plate Recognizer. Puedes introducir la matrícula manualmente.',
    }
  }
}
```

### src/lib/uiStateContext.ts

```ts
import { createContext, useContext } from 'react'

export interface UIStateCtx {
  isFullscreen: boolean
  enterFullscreen: () => void
  exitFullscreen: () => void
  headerVisible: boolean
  footerVisible: boolean
  setHeaderHover: (v: boolean) => void
  setFooterHover: (v: boolean) => void
}

export const UIStateContext = createContext<UIStateCtx>({
  isFullscreen: false,
  enterFullscreen: () => {},
  exitFullscreen: () => {},
  headerVisible: false,
  footerVisible: false,
  setHeaderHover: () => {},
  setFooterHover: () => {},
})

export const useUIState = () => useContext(UIStateContext)
```

### src/App.tsx

```tsx
// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect, useCallback, useRef } from 'react'
import { ThemeProvider } from './lib/theme'
import { MobileModeContext } from './lib/mobileMode'
import { UIStateProvider } from './lib/uiState'
import { supabase } from './lib/supabase'
import { ToastProvider } from './lib/ToastContext'
import { DesktopHeader, MobileFooter, DesktopFooter, FullscreenExitButton } from './components/Navigation'
import { MetisAssistant } from './components/MetisAssistant'
import { CameraModal } from './components/CameraModal'
import { InicioPage } from './pages/InicioPage'
import { ClientePage } from './pages/ClientePage'
import { ClientesPage } from './pages/ClientesPage'
import { PresupuestosPage } from './pages/PresupuestosPage'
import { PresupuestoHibridoPage } from './pages/PresupuestoHibridoPage'
import { CitasPage } from './pages/CitasPage'
import { ReparacionesPage } from './pages/ReparacionesPage'
import { FacturasPage } from './pages/FacturasPage'
import { BalancesPage } from './pages/BalancesPage'
import { ConfiguracionPage } from './pages/ConfiguracionPage'
import { ExpedientesPage } from './pages/ExpedientesPage'
import { AsignarCitaPage } from './pages/AsignarCitaPage'
import { NAV_ITEMS } from './lib/navigation'
import {
  ProveedoresPage,
  IncidenciasPage, UsuariosPage,
  ExpedientePage,
  ClienteAdminPage,
  VehiculoAdminPage
} from './pages/Pages'
import { motion, AnimatePresence } from 'framer-motion'
import { ErrorBoundary } from './components/ErrorBoundary'

// NUEVO IMPORT: Añadimos tu componente de animación
import { IntroAnimation } from './components/IntroAnimation'

function BackgroundImage() {
  const [fondoLandscape, setFondoLandscape] = useState('/images/backgrounds/background_landscape.jpg')
  const [fondoPortrait, setFondoPortrait] = useState('/images/backgrounds/background_portrait.png')

  useEffect(() => {
    supabase.from('configuracion').select('*').eq('id', 1).maybeSingle().then(({ data }) => {
      if (data) {
        if (data.fondo_landscape) setFondoLandscape(data.fondo_landscape)
        if (data.fondo_portrait) setFondoPortrait(data.fondo_portrait)
      }
    })
  }, [])

  return (
    <>
      <img
        src={fondoLandscape}
        alt=""
        className="gestarian-bg-image hidden lg:block"
        aria-hidden
      />
      <img
        src={fondoPortrait}
        alt=""
        className="gestarian-bg-image lg:hidden"
        aria-hidden
      />
    </>
  )
}

function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const isInicio = location.pathname === '/'
  const [cameraOpen, setCameraOpen] = useState(false)
  const [knownMatricula, setKnownMatricula] = useState<string | null>(null)
  const [mobileMode, setMobileMode] = useState(false)
  const [direction, setDirection] = useState(0)
  const lastSwipeTime = useRef(0)

  // Scroll to top on every page change
  useEffect(() => {
    window.scrollTo(0, 0)
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
  }, [location.pathname])

  const swipeRoutes = NAV_ITEMS.map(item => item.path)

  const handleSwipe = useCallback((newDirection: number) => {
    const now = Date.now()
    if (now - lastSwipeTime.current < 350) return
    lastSwipeTime.current = now

    const currentIndex = swipeRoutes.indexOf(location.pathname)
    if (currentIndex !== -1) {
      if (newDirection === 1) {
        if (currentIndex < swipeRoutes.length - 1) {
          setDirection(1)
          navigate(swipeRoutes[currentIndex + 1])
        }
      } else if (newDirection === -1) {
        if (currentIndex > 0) {
          setDirection(-1)
          navigate(swipeRoutes[currentIndex - 1])
        }
      }
    }
  }, [location.pathname, navigate, swipeRoutes])

  const variants = {
    enter: (direction: number) => ({
      x: direction === 0 ? 0 : (direction > 0 ? 25 : -25),
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction === 0 ? 0 : (direction < 0 ? 25 : -25),
      opacity: 0,
    }),
  }

  useEffect(() => {
    function handleCameraEvent(e: Event) {
      const detail = (e as CustomEvent).detail as { matricula?: string } | undefined
      setKnownMatricula(detail?.matricula ?? null)
      setCameraOpen(true)
    }
    window.addEventListener('gestarian-camera-open', handleCameraEvent)
    return () => window.removeEventListener('gestarian-camera-open', handleCameraEvent)
  }, [])

  // Desactivada la pantalla completa automática para permitir la visualización dentro de VS Code o navegador en ventana.


  const toggleMobileMode = useCallback(() => {
    setMobileMode((prev) => {
      const next = !prev
      if (next) {
        const el = document.documentElement
        el.style.overflow = 'hidden'
        if (el.requestFullscreen) el.requestFullscreen().catch(() => {})
      } else {
        document.documentElement.style.overflow = ''
        if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {})
      }
      return next
    })
  }, [])

  const exitMobileMode = useCallback(() => {
    setMobileMode(false)
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {})
  }, [])

  useEffect(() => {
    function handleSwipeEvent(e: Event) {
      const detail = (e as CustomEvent).detail as { direction: number } | undefined
      if (detail?.direction) {
        handleSwipe(detail.direction)
      }
    }
    window.addEventListener('gestarian-swipe-page', handleSwipeEvent)
    return () => window.removeEventListener('gestarian-swipe-page', handleSwipeEvent)
  }, [location.pathname])

  // Rutas principales autorizadas para swipe lateral
  const MAIN_SWIPE_ROUTES = [
    '/',
    '/expedientes',
    '/clientes',
    '/presupuestos',
    '/citas',
    '/reparaciones',
    '/facturas',
    '/proveedores',
    '/incidencias',
    '/configuracion'
  ]

  // ── Global touch swipe detection: EXCLUSIVO para navegar entre páginas principales ──
  // Bloqueado completamente si:
  // 1. La ruta actual no es una de las páginas principales.
  // 2. Se está interactuando con un formulario / input / textarea / select.
  // 3. Hay un modal abierto (nuevo cliente, etc.).
  // 4. Se está viendo un documento (hoja A4 de presupuesto, factura, visor A4, etc.).
  // 5. Se está viendo o interactuando con el Roadmap / Timeline / visor de imágenes.
  useEffect(() => {
    let touchStartX = 0
    let touchStartY = 0
    let dirLocked: 'h' | 'v' | null = null
    let isTouchBlocked = false

    const isSwipeAllowed = (target: HTMLElement | null): boolean => {
      // 1. Verificar si la ruta actual es una página principal permitida
      if (!MAIN_SWIPE_ROUTES.includes(location.pathname)) return false

      // 2. Si hay cualquier input o formulario enfocado actualmente
      const activeEl = document.activeElement
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT')) {
        return false
      }

      // 3. Si el toque se originó en un elemento de formulario o interactivo
      if (target) {
        if (target.closest('input, textarea, select, form, button, [contenteditable="true"]')) return false
        // Bloquear en modales o diálogos emergentes
        if (target.closest('[role="dialog"], .fixed, .modal-content, [data-modal]')) return false
        // Bloquear en documentos A4 (presupuesto A4, factura A4)
        if (target.closest('#factura-a4, #presupuesto-a4, .gestarian-paper, .print-sheet')) return false
        // Bloquear en el Roadmap / Línea temporal de expedientes
        if (target.closest('[data-roadmap], .timeline-container, svg, [draggable="true"]')) return false
      }

      // 4. Si hay documentos A4 activos en el DOM (viendo factura o presupuesto)
      if (document.getElementById('factura-a4') || document.getElementById('presupuesto-a4')) {
        return false
      }

      // 5. Si hay tarjetas de expediente desplegadas mostrando el roadmap
      const openRoadmaps = document.querySelectorAll('.gestarian-roadmap-open, [data-roadmap-open="true"]')
      if (openRoadmaps.length > 0) {
        return false
      }

      return true
    }

    const onTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement | null
      if (!isSwipeAllowed(target)) {
        isTouchBlocked = true
        return
      }

      isTouchBlocked = false
      touchStartX = e.touches[0].clientX
      touchStartY = e.touches[0].clientY
      dirLocked = null
    }

    const onTouchMove = (e: TouchEvent) => {
      if (isTouchBlocked) return

      if (!dirLocked) {
        const dx = Math.abs(e.touches[0].clientX - touchStartX)
        const dy = Math.abs(e.touches[0].clientY - touchStartY)
        if (dx > dy + 10) {
          dirLocked = 'h'
        } else if (dy > dx + 10) {
          dirLocked = 'v'
        }
      }
      // Evitar scroll vertical si se está ejecutando un swipe horizontal válido
      if (dirLocked === 'h' && e.cancelable) {
        e.preventDefault()
      }
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (isTouchBlocked || dirLocked !== 'h') return
      const diffX = e.changedTouches[0].clientX - touchStartX
      const threshold = window.innerWidth * 0.20
      if (Math.abs(diffX) > threshold) {
        handleSwipe(diffX < 0 ? 1 : -1)
      }
    }

    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', onTouchEnd, { passive: true })

    return () => {
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [location.pathname, handleSwipe])

  return (
    <MobileModeContext.Provider value={{ mobileMode, toggleMobileMode, exitMobileMode }}>
      {isInicio && <BackgroundImage />}

      <div className={`relative z-10 min-h-screen ${mobileMode ? 'mobile-mode' : ''}`}>
        <DesktopHeader />
        <FullscreenExitButton />

        <main className="w-full relative min-h-screen">
          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.div
              key={location.pathname}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                duration: 0.16,
                ease: "easeOut",
              }}
              style={{ willChange: 'opacity, transform' }}
              className="w-full min-h-screen p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto pt-3 lg:pt-16 pb-28"
            >
              <ErrorBoundary>
                <Routes location={location} key={location.pathname}>
                  <Route path="/" element={<InicioPage />} />
                  <Route path="/clientes" element={<ClientesPage />} />
                  <Route path="/cliente-admin/:id" element={<ClienteAdminPage />} />
                  <Route path="/vehiculo-admin/:id" element={<VehiculoAdminPage />} />
                  <Route path="/expediente/:vehiculoId" element={<ExpedientePage />} />
                  <Route path="/presupuestos" element={<PresupuestosPage />} />
                  <Route path="/presupuesto-hibrido" element={<PresupuestoHibridoPage />} />
                  <Route path="/citas" element={<CitasPage />} />
                  <Route path="/reparaciones" element={<ReparacionesPage />} />
                  <Route path="/facturas" element={<FacturasPage />} />
                  <Route path="/balances" element={<BalancesPage />} />
                  <Route path="/expedientes" element={<ExpedientesPage />} />
                  <Route path="/asignar-cita" element={<AsignarCitaPage />} />
                  <Route path="/proveedores" element={<ProveedoresPage />} />
                  <Route path="/incidencias" element={<IncidenciasPage />} />
                  <Route path="/usuarios" element={<UsuariosPage />} />
                  <Route path="/configuracion" element={<ConfiguracionPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </ErrorBoundary>
            </motion.div>
          </AnimatePresence>
        </main>

        <MobileFooter />
        <DesktopFooter />
        <MetisAssistant />

        <CameraModal
          open={cameraOpen}
          knownMatricula={knownMatricula}
          onClose={() => { setCameraOpen(false); setKnownMatricula(null) }}
          onMatriculaDetected={(matricula) => {
            navigate('/clientes', { state: { matriculaBuscada: matricula } })
          }}
        />
      </div>
    </MobileModeContext.Provider>
  )
}

export default function App() {
  const [showIntro, setShowIntro] = useState(() => !sessionStorage.getItem('gestarian_intro_shown'))
  const [introState, setIntroState] = useState<'start' | 'grow' | 'fadeOut'>('start')

  // Efecto inicial para automatizar toda la secuencia de la animación en primer arranque
  useEffect(() => {
    if (sessionStorage.getItem('gestarian_intro_shown')) {
      setShowIntro(false)
      return
    }

    const growTimer = setTimeout(() => {
      setIntroState('grow')
    }, 100)

    const fadeOutTimer = setTimeout(() => {
      setIntroState('fadeOut')
    }, 1800)

    const removeTimer = setTimeout(() => {
      sessionStorage.setItem('gestarian_intro_shown', 'true')
      setShowIntro(false)
    }, 2300)

    return () => {
      clearTimeout(growTimer)
      clearTimeout(fadeOutTimer)
      clearTimeout(removeTimer)
    }
  }, [])

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <UIStateProvider>
          <ToastProvider>
            {/* COMPONENTE DE INTRODUCCIÓN AUTOMÁTICO */}
            <IntroAnimation 
              showIntro={showIntro} 
              introState={introState} 
            />

            <BrowserRouter>
              <Routes>
                <Route path="/cliente/:token" element={<ClientePage />} />
                <Route path="/*" element={<Layout />} />
              </Routes>
            </BrowserRouter>
          </ToastProvider>
        </UIStateProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}
```

