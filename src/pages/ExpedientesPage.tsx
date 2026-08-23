import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { PageHeader, EmptyState, MatriculaBadge } from '../components/UI'
import { TimelineVisual } from '../components/TimelineVisual'
import { getExpediente } from '../lib/utils'
import { GlobalImageViewer } from '../components/GlobalImageViewer'
import { fetchExpedienteFotos, saveExpedienteFoto } from '../lib/expedienteService'
import {
  FolderOpen,
  ArrowLeft,
  Search,
  Plus,
  User,
  Car as CarIcon,
  Image as ImageIcon,
  Trash2,
  X,
} from 'lucide-react'
import { useGoBack } from '../lib/useGoBack'
import { useToast } from '../lib/ToastContext'
import { playSuccessChime } from '../lib/sound'
import { buildRoadmap, type ExpedienteData, type RoadmapActions } from '../lib/roadmapEngine'
import { PresupuestoIcon, FacturaIcon } from '../components/CustomIcons'

// ── Types ─────────────────────────────────────────────────────

interface ExpRow {
  vehiculoId: string
  expedienteId: string
  clienteId: string
  clienteNombre: string
  matricula: string
  marca: string | null
  modelo: string | null
  fecha: string
  borderColor: string
  fase: string
  // Datos crudos para roadmapEngine
  presupuesto: { id: string; estado: string } | null
  cita: { id: string; estado: string } | null
  reparacion: { id: string; estado: string } | null
  factura: { 
    numero: string, 
    estado_cobro: string, 
    fecha?: string,
    enviado_email_at?: string | null, 
    enviado_whatsapp_at?: string | null 
  } | null
  ultimoCobro: { created_at: string } | null
}

// ── Helpers ────────────────────────────────────────────────────

// (helpers eliminados o movidos a utils)

function fase(
  r: ExpRow
): { label: string; borderColor: string } {
  const fac = r.factura

  // 1. Línea de contorno VERDE solo cuando la factura ha sido abonada completamente en el panel de control de cobros
  if (fac?.estado_cobro === 'pagada') {
    return { label: 'Completado', borderColor: 'border-emerald-500' }
  }

  // 2. Línea de contorno AZUL cuando el abono en el panel de control de cobros es parcial
  if (fac?.estado_cobro === 'parcial') {
    return { label: 'Cobro Parcial', borderColor: 'border-blue-500' }
  }

  // 3. En el resto de casos la línea de contorno de las tarjetas de expedientes es NARANJA (amber-500)
  return { label: 'En Proceso', borderColor: 'border-amber-500' }
}



function fmtFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  })
}

// ── Tarjeta expediente ────────────────────────────────────────

function TarjetaExpediente({
  row,
  isOpen,
  onToggle,
  onDelete,
  onRefresh,
}: {
  row: ExpRow
  isOpen: boolean
  onToggle: () => void
  onDelete: (row: ExpRow) => void
  onRefresh: () => void
}) {
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [imgOpen, setImgOpen] = useState(false)
  const [expedienteFotos, setExpedienteFotos] = useState<string[]>([])
  const [deleteVisible, setDeleteVisible] = useState(false)
  const cardRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (imgOpen) {
      fetchExpedienteFotos(row.clienteId, row.vehiculoId, [], {
        presupuestoId: row.presupuesto?.id,
        citaId: row.cita?.id,
        reparacionId: row.reparacion?.id
      }).then(setExpedienteFotos)
    }
  }, [imgOpen, row.clienteId, row.vehiculoId, row.presupuesto?.id, row.cita?.id, row.reparacion?.id])

  useEffect(() => {
    if (isOpen && cardRef.current) {
      setTimeout(() => {
        cardRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
      }, 80)
    }
  }, [isOpen])

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressTriggered = useRef(false)

  const expData: ExpedienteData = {
    clienteId: row.clienteId,
    vehiculoId: row.vehiculoId,
    presupuesto: row.presupuesto,
    cita: row.cita,
    reparacion: row.reparacion,
    factura: row.factura,
    ultimoCobro: row.ultimoCobro
  }

  const actions: RoadmapActions = {
    onNavigateCliente: (clienteId) => navigate('/clientes', { state: { expandClienteId: clienteId, openSubpanel: 'editar' } }),
    onCrearPresupuesto: (_vehiculoId, _clienteId) => navigate('/presupuestos'),
    onVerPresupuesto: (_presupuestoId) => navigate('/presupuestos', { state: { clienteId: row.clienteId, openForm: false } }),
    onAceptarPresupuesto: async (presupuestoId) => {
      const { error } = await supabase.from('presupuestos').update({ estado: 'aceptado' }).eq('id', presupuestoId)
      if (!error) {
        showToast('PRESUPUESTO ACEPTADO', 'success')
        onRefresh()
      } else {
        showToast('Error al aceptar presupuesto', 'error')
      }
    },
    onCrearCita: (vehiculoId, clienteId, presupuestoId) => {
      navigate('/asignar-cita', {
        state: {
          vehiculoId,
          clienteId,
          presupuestoId,
          expedienteId: row.expedienteId,
          clienteNombre: row.clienteNombre,
          matricula: row.matricula,
        },
      });
    },
    onVerCita: (citaId) => navigate('/citas', { state: { citaId } }),
    onConfirmarCita: async (citaId) => {
      const { error } = await supabase.from('citas').update({ estado: 'confirmada' }).eq('id', citaId)
      if (!error) {
        playSuccessChime()
        showToast('CITA CONFIRMADA', 'success')
        onRefresh()
      } else {
        showToast('Error al confirmar cita', 'error')
      }
    },
    onEnviarTaller: async (vehiculoId, clienteId, citaId) => {
      const { error: repError } = await supabase.from('reparaciones').insert({
        vehiculo_id: vehiculoId,
        cliente_id: clienteId,
        cita_id: citaId,
        estado: 'en_proceso'
      })
      if (!repError) {
        if (citaId) {
          await supabase.from('citas').update({ estado: 'confirmada' }).eq('id', citaId)
        }
        playSuccessChime()
        showToast('ENVIADO A TALLER', 'success')
        onRefresh()
      } else {
        showToast('Error al enviar al taller', 'error')
      }
    },
    onGestionarReparacion: (_reparacionId) => navigate('/reparaciones'),
    onFinalizarReparacion: async (reparacionId) => {
      const { error } = await supabase.from('reparaciones').update({ estado: 'finalizado' }).eq('id', reparacionId)
      if (!error) {
        playSuccessChime()
        showToast('REPARACIÓN FINALIZADA', 'success')
        onRefresh()
      } else {
        showToast('Error al finalizar reparación', 'error')
      }
    },
    onGenerarFactura: (vehiculoId, clienteId, reparacionId) => {
      navigate('/facturas', {
        state: {
          vehiculoId,
          clienteId,
          reparacionId,
          presupuestoId: row.presupuesto?.id,
          expedienteId: row.expedienteId,
          clienteNombre: row.clienteNombre,
          matricula: row.matricula,
        },
      })
    },
    onVerFactura: (numero, mode) => navigate('/facturas', { state: { facturaNumero: numero, mode, clienteId: row.clienteId } })
  }

  const steps = buildRoadmap(expData, actions)

  const startLongPress = (e?: React.TouchEvent | React.MouseEvent) => {
    longPressTriggered.current = false

    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
    }

    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true
      if (row.factura) {
        showToast('No se puede eliminar un expediente con factura emitida.', 'error')
      } else {
        setDeleteVisible(true)
      }
    }, 600)
  }

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  const handleCardClick = () => {
    if (longPressTriggered.current) {
      longPressTriggered.current = false
      return
    }

    if (deleteVisible) {
      setDeleteVisible(false)
      return
    }

    onToggle()
  }

  return (
    <>
      <div
        ref={cardRef}
        className={`relative rounded-2xl border-[3px] transition-all duration-300 overflow-hidden ${
          isOpen
            ? 'border-yellow-400 bg-bg-800 shadow-[0_0_20px_rgba(250,204,21,0.25)]'
            : row.borderColor
            ? `${row.borderColor} bg-bg-800/80 hover:brightness-110`
            : 'border-slate-700 bg-bg-800/80 hover:border-slate-600'
        }`}
      >
        {/* Cabecera de la tarjeta */}
        <div
          onClick={handleCardClick}
          onMouseDown={startLongPress}
          onMouseUp={cancelLongPress}
          onMouseLeave={cancelLongPress}
          onTouchStart={startLongPress}
          onTouchEnd={cancelLongPress}
          onTouchMove={cancelLongPress}
          className="p-3 sm:p-4 cursor-pointer select-none"
        >
          {/* Fila 1: EXP a la izquierda, Fecha a la derecha */}
          <div className="flex items-center justify-between text-xs sm:text-sm font-black font-mono uppercase tracking-wider mb-2">
            <span className="text-cyan-400 truncate">
              {row.expedienteId}
            </span>
            <span className="text-slate-400 shrink-0 ml-2">
              {fmtFecha(row.fecha)}
            </span>
          </div>

          {/* Fila 2: Nombre del cliente centrado (text-xl sm:text-2xl) */}
          <div className="text-center font-black uppercase text-xl sm:text-2xl text-white truncate py-1">
            {row.clienteNombre}
          </div>

          {/* Fila 3: Matrícula oficial a la izquierda, Marca y Modelo centrados */}
          <div className="flex items-center justify-between gap-3 mt-2">
            <div className="shrink-0">
              <MatriculaBadge matricula={row.matricula} />
            </div>

            <div className="flex-1 text-center font-bold text-slate-300 text-sm sm:text-base truncate">
              {row.marca || row.modelo ? (
                <span>
                  {row.marca} {row.modelo}
                </span>
              ) : (
                <span className="text-slate-500 italic">Sin datos vehículo</span>
              )}
            </div>
          </div>
        </div>

        {/* Botón flotante de eliminar (aparece con long-press) */}
        <AnimatePresence>
          {deleteVisible && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute inset-0 bg-bg-950/80 backdrop-blur-sm flex items-center justify-center gap-4 z-20"
            >
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setDeleteVisible(false)
                }}
                className="px-4 py-2 rounded-xl bg-slate-700 text-white font-bold text-xs flex items-center gap-2 hover:bg-slate-600 transition-colors"
              >
                <X className="w-4 h-4" /> Cancelar
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setDeleteVisible(false)
                  onDelete(row)
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs flex items-center gap-2 hover:bg-rose-500 shadow-lg shadow-rose-600/30 transition-colors"
              >
                <Trash2 className="w-4 h-4" /> Eliminar Expediente
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Contenido desplegable: Roadmap y acciones */}
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden border-t border-white/10 bg-bg-900/60"
            >
              <div className="p-3 sm:p-4 space-y-4">
                {/* Visualización del Roadmap de paradas */}
                <div data-roadmap className="gestarian-roadmap-open overflow-x-auto" data-roadmap-open="true">
                  <TimelineVisual steps={steps} />
                </div>

                {/* Botones inferiores: Solo iconos flotantes transparentes de altura idéntica (x2 tamaño) */}
                <div className="flex items-center justify-center gap-3 sm:gap-6 flex-wrap pt-4 pb-2 border-t border-white/10 mt-2">

                  {/* 1. CLIENTE: Redirige a la ficha específica del cliente */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate('/clientes', { state: { expandClienteId: row.clienteId, openSubpanel: 'editar' } })
                    }}
                    className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center p-0 transition-all hover:scale-125 active:scale-95 cursor-pointer bg-transparent border-0 outline-none shrink-0"
                    title="Ficha del Cliente"
                    aria-label="Ficha del Cliente"
                  >
                    <User className="w-12 h-12 sm:w-14 sm:h-14 text-cyan-400 drop-shadow-[0_0_12px_rgba(6,182,212,0.8)]" />
                  </button>

                  {/* 2. VEHÍCULO: Redirige a la ficha de vehículos del cliente del expediente */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate('/clientes', { state: { expandClienteId: row.clienteId, openSubpanel: 'vehiculos' } })
                    }}
                    className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center p-0 transition-all hover:scale-125 active:scale-95 cursor-pointer bg-transparent border-0 outline-none shrink-0"
                    title="Vehículos del Cliente"
                    aria-label="Vehículos del Cliente"
                  >
                    <CarIcon className="w-12 h-12 sm:w-14 sm:h-14 text-blue-400 drop-shadow-[0_0_12px_rgba(59,130,246,0.8)]" />
                  </button>

                  {/* 3. PRESUPUESTO: Muestra únicamente los presupuestos del cliente relacionado */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate('/presupuestos', { state: { clienteId: row.clienteId, openForm: false } })
                    }}
                    className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center p-0 transition-all hover:scale-125 active:scale-95 cursor-pointer bg-transparent border-0 outline-none shrink-0"
                    title="Presupuestos del Cliente"
                    aria-label="Presupuestos del Cliente"
                  >
                    <PresupuestoIcon className="w-12 h-12 sm:w-14 sm:h-14 text-cyan-400 drop-shadow-[0_0_12px_rgba(6,182,212,0.8)]" />
                  </button>

                  {/* 4. FACTURA: Redirige a las facturas del cliente relacionado mostrando todas sus facturas */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate('/facturas', { state: { clienteId: row.clienteId } })
                    }}
                    className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center p-0 transition-all hover:scale-125 active:scale-95 cursor-pointer bg-transparent border-0 outline-none shrink-0"
                    title="Facturas del Cliente"
                    aria-label="Facturas del Cliente"
                  >
                    <FacturaIcon className="w-12 h-12 sm:w-14 sm:h-14 text-emerald-400 drop-shadow-[0_0_12px_rgba(16,185,129,0.8)]" />
                  </button>

                  {/* 5. IMÁGENES: Muestra exclusivamente las imágenes del expediente en concreto */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setImgOpen(true)
                    }}
                    className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center p-0 transition-all hover:scale-125 active:scale-95 cursor-pointer bg-transparent border-0 outline-none shrink-0"
                    title="Imágenes del Expediente"
                    aria-label="Imágenes del Expediente"
                  >
                    <ImageIcon className="w-12 h-12 sm:w-14 sm:h-14 text-violet-400 drop-shadow-[0_0_12px_rgba(139,92,246,0.8)]" />
                  </button>

                  {/* 6. CERRAR ROADMAP */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggle()
                    }}
                    className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center p-0 transition-all hover:scale-125 active:scale-95 cursor-pointer bg-transparent border-0 outline-none shrink-0"
                    title="Cerrar Roadmap"
                    aria-label="Cerrar Roadmap"
                  >
                    <ArrowLeft className="w-12 h-12 sm:w-14 sm:h-14 text-rose-400 drop-shadow-[0_0_12px_rgba(244,63,94,0.8)]" />
                  </button>

                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Visor global único de imágenes */}
      <GlobalImageViewer
        isOpen={imgOpen}
        matricula={row.matricula}
        title={`Expediente ${row.expedienteId}`}
        images={expedienteFotos}
        onAddImage={async (dataUrl) => {
          if (row.presupuesto?.id) {
            const { data: p } = await supabase.from('presupuestos').select('fotos').eq('id', row.presupuesto.id).maybeSingle()
            const cur: string[] = p?.fotos && Array.isArray(p.fotos) ? p.fotos : []
            if (!cur.includes(dataUrl)) {
              await supabase.from('presupuestos').update({ fotos: [...cur, dataUrl] }).eq('id', row.presupuesto.id)
            }
          }
          await saveExpedienteFoto(dataUrl, row.clienteId, row.vehiculoId)
          setExpedienteFotos((prev) => [...prev, dataUrl])
        }}
        onDeleteImage={async (index) => {
          setExpedienteFotos((prev) => prev.filter((_, i) => i !== index))
        }}
        onClose={() => setImgOpen(false)}
      />
    </>
  )
}

// ── Página principal ──────────────────────────────────────────

export function ExpedientesPage() {
  const navigate = useNavigate()
  const goBack = useGoBack('/')

  const [rows, setRows] = useState<ExpRow[]>([])
  const [loading, setLoading] = useState(true)
  const location = useLocation()
  const [search, setSearch] = useState(location.state?.search ?? '')
  const [showSearchInput, setShowSearchInput] = useState(false)
  const [openId, setOpenId] = useState<string | null>(
    location.state?.expandPresupuestoId ?? location.state?.expandExpedienteId ?? location.state?.expandVehiculoId ?? location.state?.expandCitaId ?? null
  )

  useEffect(() => {
    const targetId = location.state?.expandPresupuestoId ?? location.state?.expandExpedienteId ?? location.state?.expandVehiculoId ?? location.state?.expandCitaId
    if (targetId) {
      setOpenId(targetId)
    }
  }, [location.state?.expandPresupuestoId, location.state?.expandExpedienteId, location.state?.expandVehiculoId, location.state?.expandCitaId])

  const load = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true)

    const fechaLimite = new Date()
    fechaLimite.setMonth(fechaLimite.getMonth() - 3)

    const { data: pData, error } = await supabase
      .from('presupuestos')
      .select(`
        id,
        numero,
        estado,
        created_at,
        vehiculo_id,
        vehiculos:vehiculo_id (
          id,
          matricula,
          marca,
          modelo,
          cliente_id,
          clientes:cliente_id (
            id,
            nombre,
            numero
          )
        )
      `)
      .gte(
        'created_at',
        fechaLimite.toISOString()
      )
      .order('created_at', {
        ascending: false,
      })

    if (error || !pData) {
      setLoading(false)
      return
    }

    const [
      { data: citasD },
      { data: repsD },
      { data: facD },
    ] = await Promise.all([
      supabase
        .from('citas')
        .select('id, vehiculo_id, presupuesto_id, cliente_id, estado, created_at')
        .order('created_at', { ascending: false }),

      supabase
        .from('reparaciones')
        .select('id, vehiculo_id, cita_id, cliente_id, estado, created_at')
        .order('created_at', { ascending: false }),

      supabase
        .from('facturas')
        .select('id, numero, vehiculo_id, reparacion_id, cliente_id, total, total_abonado, estado_cobro, fecha, created_at')
        .order('created_at', { ascending: false }),
    ])

    // Consulta separada de cobros para evitar join que puede fallar
    const facturaIds = (facD || []).filter(f => f?.id).map((f: any) => f.id)
    const { data: cobrosD } = facturaIds.length > 0
      ? await supabase.from('cobros').select('factura_id, created_at').in('factura_id', facturaIds).order('created_at', { ascending: false })
      : { data: [] as any[] }

    // Mapa: factura_id -> fecha del cobro más reciente
    const ultimoCobroByFac: Record<string, string> = {}
    for (const c of cobrosD || []) {
      if (c.factura_id && !ultimoCobroByFac[c.factura_id]) {
        ultimoCobroByFac[c.factura_id] = c.created_at
      }
    }

    const seen = new Set<string>()
    const result: ExpRow[] = []

    for (const p of pData as any[]) {
      const veh = p.vehiculos
      if (!veh) continue

      const vid = veh.id as string
      if (seen.has(p.id)) continue
      seen.add(p.id)

      const cliente = Array.isArray(veh.clientes)
        ? veh.clientes[0]
        : veh.clientes

      if (!cliente) continue

      // Vinculación estricta al pipeline único del presupuesto de este expediente
      const cita = (citasD || []).find((c: any) => c.presupuesto_id === p.id) ?? null
      const rep = cita ? ((repsD || []).find((r: any) => r.cita_id === cita.id) ?? null) : null
      const fac = rep ? ((facD || []).find((f: any) => f.reparacion_id === rep.id) ?? null) : null

      // Obtener fecha del último cobro de la factura encontrada
      let ultimoCobroFecha: string | null = null;
      if (fac?.id) {
        ultimoCobroFecha = ultimoCobroByFac[fac.id] ?? null;
      }

      const expId = getExpediente(p, cliente, [])

      const emailSentAt = fac?.id 
        ? localStorage.getItem(`factura_${fac.id}_email_at`) 
        : null
      const whatsappSentAt = fac?.id 
        ? localStorage.getItem(`factura_${fac.id}_wa_at`) 
        : null

      const row: ExpRow = {
        vehiculoId: vid,
        expedienteId: expId,
        clienteId: cliente.id,
        clienteNombre: cliente.nombre ?? '—',
        matricula: veh.matricula ?? '—',
        marca: veh.marca ?? null,
        modelo: veh.modelo ?? null,
        fecha: p.created_at,
        borderColor: '',
        fase: '',
        presupuesto: p ? { id: p.id, estado: p.estado } : null,
        cita: cita ? { id: cita.id, estado: cita.estado } : null,
        reparacion: rep ? { id: rep.id, estado: rep.estado } : null,
        factura: fac ? {
          numero: fac.numero,
          estado_cobro: fac.estado_cobro,
          fecha: fac.fecha,
          enviado_email_at: emailSentAt,
          enviado_whatsapp_at: whatsappSentAt
        } : null,
        ultimoCobro: ultimoCobroFecha ? { created_at: ultimoCobroFecha } : null
      }

      const f = fase(row)

      row.fase = f.label
      row.borderColor = f.borderColor

      result.push(row)
    }

    setRows(result)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Recargar datos cada vez que React Router navega a esta página
  useEffect(() => {
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key])

  // ── Eliminar únicamente de la lista actual ──────────────────

  const handleDelete = (row: ExpRow) => {
    setRows((current) =>
      current.filter(
        (item) => item.vehiculoId !== row.vehiculoId
      )
    )

    setOpenId((current) =>
      current === row.vehiculoId ? null : current
    )
  }

  const filtered = rows.filter((r) => {
    if (!search.trim()) return true

    const q = search.toLowerCase()

    return (
      r.expedienteId
        .toLowerCase()
        .includes(q) ||
      r.clienteNombre
        .toLowerCase()
        .includes(q) ||
      r.matricula
        .toLowerCase()
        .includes(q) ||
      (r.marca ?? '')
        .toLowerCase()
        .includes(q) ||
      (r.modelo ?? '')
        .toLowerCase()
        .includes(q)
    )
  })

  return (
    <div className="space-y-4 pb-24 animate-fade-in">

      {/* Cabecera con título x1.2 y subtítulo */}
      <PageHeader
        title="EXPEDIENTES"
        subtitle="Todo empieza aquí..."
        titleClassName="text-[22px] md:text-[26px] font-bold"
      >

        <button
          onClick={goBack}
          className="
            w-[60px]
            h-[60px]
            rounded-2xl
            bg-slate-800/80
            text-white
            border
            border-white/20
            flex
            items-center
            justify-center
            hover:bg-slate-700
            transition-transform
            active:scale-95
            shrink-0
            shadow-[0_0_15px_rgba(255,255,255,0.1)]
          "
          title="Volver"
          aria-label="Volver"
        >
          <ArrowLeft className="w-7 h-7" />
        </button>

      </PageHeader>

      {/* Buscador flotante a la izquierda + Botón NUEVO EXPEDIENTE centrado en pantalla */}
      <div className="relative flex items-center justify-center w-full min-h-[48px]">
        {showSearchInput ? (
          <div className="relative flex-1 flex items-center gap-2 w-full">
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar expediente (ID, cliente, matrícula)…"
              className="flex-1 bg-bg-800 border border-bg-600 rounded-xl px-4 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none transition-colors shadow-inner"
            />
            <button
              onClick={() => {
                setShowSearchInput(false)
                setSearch('')
              }}
              className="text-slate-400 hover:text-white p-2 shrink-0"
              title="Cerrar búsqueda"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        ) : (
          <>
            {/* Lupa flotante a la izquierda sin desplazar el centro del botón */}
            <button
              onClick={() => setShowSearchInput(true)}
              className="absolute left-0 w-11 h-11 flex items-center justify-center text-slate-400 hover:text-white shrink-0 transition-transform active:scale-95 bg-transparent border-0 outline-none p-0 z-10"
              title="Buscar expediente"
            >
              <Search className="w-7 h-7" />
            </button>

            {/* Botón NUEVO EXPEDIENTE centrado en el ancho de pantalla (ancho x0.85 actual, texto x1.2 actual) */}
            <button
              onClick={() => navigate('/clientes', { state: { fromNuevoExpediente: true } })}
              className="w-[72%] sm:w-[65%] max-w-sm h-11 sm:h-12 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/60 flex items-center justify-center hover:bg-cyan-500/30 transition-transform active:scale-95 font-extrabold shadow-[0_0_12px_rgba(8,145,178,0.3)] gap-2 uppercase text-[15px] sm:text-base tracking-wider"
              title="Añadir nuevo expediente"
              aria-label="Añadir nuevo expediente"
            >
              <Plus className="w-5 h-5" /> NUEVO EXPEDIENTE
            </button>
          </>
        )}
      </div>

      {/* Contador */}
      {!loading && (
        <p className="text-xs text-slate-500 px-1">
          {filtered.length} expediente
          {filtered.length !== 1 ? 's' : ''} —
          últimos 3 meses
        </p>
      )}

      {/* Listado */}
      {loading ? (

        <div className="py-16 text-center text-slate-500 text-sm">
          Cargando expedientes…
        </div>

      ) : filtered.length === 0 ? (

        <EmptyState
          icon={
            <FolderOpen className="w-12 h-12" />
          }
          title="Sin expedientes recientes"
          subtitle="No hay expedientes en los últimos 3 meses"
        />

      ) : (

        <div className="space-y-4">

          {filtered.map((row) => {
            const cardUniqueId = row.presupuesto?.id ?? row.expedienteId
            const isCardOpen =
              openId === cardUniqueId ||
              openId === row.expedienteId ||
              openId === row.vehiculoId ||
              (!!row.cita?.id && openId === row.cita.id)

            return (
              <TarjetaExpediente
                key={cardUniqueId}
                row={row}
                isOpen={isCardOpen}
                onToggle={() =>
                  setOpenId((prev) =>
                    prev === cardUniqueId ||
                    prev === row.expedienteId ||
                    prev === row.vehiculoId ||
                    (!!row.cita?.id && prev === row.cita.id)
                      ? null
                      : cardUniqueId
                  )
                }
                onDelete={handleDelete}
                onRefresh={() => load(false)}
              />
            )
          })}

        </div>

      )}

    </div>
  )
}