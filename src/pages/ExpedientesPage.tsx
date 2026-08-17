import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { PageHeader, EmptyState, MatriculaBadge } from '../components/UI'
import { TimelineVisual } from '../components/TimelineVisual'
import { getExpediente } from '../lib/utils'
import { ImageViewer } from '../components/ImageViewer'
import {
  FolderOpen,
  ArrowLeft,
  Search,
  Plus,
  User,
  Car as CarIcon,
  Image as ImageIcon,
  Trash2,
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
  const rep = r.reparacion
  const cobro = r.ultimoCobro

  if (rep?.estado === 'finalizado' && fac?.estado_cobro === 'pagada') {
    return { label: 'Completado', borderColor: 'border-emerald-500' }
  }

  if (fac) {
    const isEnviada = !!(fac.enviado_email_at || fac.enviado_whatsapp_at)
    const envioFecha = fac.enviado_email_at || fac.enviado_whatsapp_at
    const isPendienteSentAndLate = fac.estado_cobro === 'pendiente' && isEnviada && envioFecha && (Date.now() - new Date(envioFecha).getTime() > 180 * 24 * 60 * 60 * 1000)
    const isParcialAndLate = fac.estado_cobro === 'parcial' && cobro && (Date.now() - new Date(cobro.created_at).getTime() > 180 * 24 * 60 * 60 * 1000)
    
    if (isPendienteSentAndLate || isParcialAndLate) return { label: 'Impago', borderColor: 'border-red-500' }
    if (fac.estado_cobro === 'parcial') return { label: 'Cobro Parcial', borderColor: 'border-blue-500' }
    if (!isEnviada) return { label: 'Factura Sin Enviar', borderColor: 'border-yellow-400' }
  }

  if (rep?.estado === 'finalizado' && !fac) {
    return { label: 'Sin Facturar', borderColor: 'border-amber-500' }
  }

  return { label: 'En Proceso', borderColor: 'border-slate-500' }
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
  const [deleteVisible, setDeleteVisible] = useState(false)
  const cardRef = useRef<HTMLDivElement | null>(null)

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

  const { borderColor } = fase(row)

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
    onNavigateCliente: (clienteId) => navigate('/clientes', { state: { expandClienteId: clienteId } }),
    onCrearPresupuesto: (_vehiculoId, _clienteId) => navigate('/presupuestos'),
    onVerPresupuesto: (_presupuestoId) => navigate('/presupuestos'),
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
    onVerCita: (_citaId) => navigate('/citas'),
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
    onVerFactura: (numero, mode) => navigate('/facturas', { state: { facturaNumero: numero, mode } })
  }

  const steps = buildRoadmap(expData, actions)

  const startLongPress = () => {
    longPressTriggered.current = false

    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
    }

    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true
      setDeleteVisible(true)
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

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()

    const confirmar = window.confirm(
      `¿Quieres ocultar el expediente ${row.expedienteId} de la lista?`
    )

    if (!confirmar) return

    onDelete(row)
  }

  return (
    <>
      <div
        ref={cardRef}
        className={`
          relative
          gestarian-panel
          border-[3px]
          ${borderColor}
          rounded-xl
          overflow-hidden
          cursor-pointer
          transition-all
          duration-200
          hover:shadow-lg
          select-none
          scroll-mt-4
        `}
        onClick={handleCardClick}
        onPointerDown={startLongPress}
        onPointerUp={cancelLongPress}
        onPointerLeave={cancelLongPress}
        onPointerCancel={cancelLongPress}
      >

        {/* Papelera tras pulsación prolongada */}
        <AnimatePresence>
          {deleteVisible && (
            <motion.button
              initial={{
                opacity: 0,
                scale: 0.7,
              }}
              animate={{
                opacity: 1,
                scale: 1,
              }}
              exit={{
                opacity: 0,
                scale: 0.7,
              }}
              transition={{
                duration: 0.18,
              }}
              onClick={handleDelete}
              className="
                absolute
                top-2
                right-2
                z-20
                w-11
                h-11
                rounded-xl
                bg-rose-600
                text-white
                border
                border-rose-300/60
                shadow-[0_0_18px_rgba(244,63,94,0.45)]
                flex
                items-center
                justify-center
                hover:bg-rose-500
                active:scale-90
                transition-all
              "
              title="Eliminar expediente de la lista"
              aria-label="Eliminar expediente"
            >
              <Trash2 className="w-5 h-5" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Línea 1: Matrícula sola centrada x2 con marco gris plata de 1px, fondo blanco y texto negro */}
        <div className="flex justify-center items-center pt-3 pb-1.5 px-3">
          <MatriculaBadge matricula={row.matricula} size="xl" />
        </div>

        {/* Línea 2: Expediente y Fecha con misma tipografía (font-mono), mismo peso (font-bold) y tamaño x1.5 */}
        <div className="flex items-center justify-center gap-8 sm:gap-14 px-3 py-1.5 text-center">
          <span className="font-mono text-[27px] sm:text-3xl font-bold text-cyan-300">
            {row.expedienteId}
          </span>
          <span className="font-mono text-[27px] sm:text-3xl font-bold text-slate-300 tabular-nums">
            {fmtFecha(row.fecha)}
          </span>
        </div>

        {/* Línea 3: Nombre cliente (x0.75) y Marca/Modelo (x1.5) */}
        <div className="px-3 pb-3 text-center">
          <p className="text-[23px] sm:text-[27px] font-bold text-white truncate leading-tight tracking-wide">
            {row.clienteNombre}
          </p>

          {(row.marca || row.modelo) && (
            <p className="text-[21px] font-semibold text-slate-300 truncate mt-1">
              {[row.marca, row.modelo]
                .filter(Boolean)
                .join(' ')}
            </p>
          )}
        </div>

        {/* Expansión */}
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              key="expanded"
              initial={{
                height: 0,
                opacity: 0,
              }}
              animate={{
                height: 'auto',
                opacity: 1,
              }}
              exit={{
                height: 0,
                opacity: 0,
              }}
              transition={{
                duration: 0.28,
                ease: [0.4, 0, 0.2, 1],
              }}
              className="overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >

              <div
                className="
                  px-3
                  pb-4
                  space-y-4
                  border-t
                  border-white/5
                  pt-3
                "
              >

                {/* Roadmap */}
                <div data-roadmap className="gestarian-roadmap-open overflow-x-auto" data-roadmap-open="true">
                  <TimelineVisual steps={steps} />
                </div>

                {/* Botones inferiores: Solo iconos flotantes transparentes de altura idéntica (x2 tamaño) */}
                <div className="flex items-center justify-center gap-3 sm:gap-6 flex-wrap pt-4 pb-2 border-t border-white/10 mt-2">

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate('/clientes', { state: { expandClienteId: row.clienteId } })
                    }}
                    className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center p-0 transition-all hover:scale-125 active:scale-95 cursor-pointer bg-transparent border-0 outline-none shrink-0"
                    title="Ver Cliente"
                    aria-label="Ver Cliente"
                  >
                    <User className="w-12 h-12 sm:w-14 sm:h-14 text-cyan-400 drop-shadow-[0_0_12px_rgba(6,182,212,0.8)]" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate('/clientes', { state: { expandClienteId: row.clienteId } })
                    }}
                    className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center p-0 transition-all hover:scale-125 active:scale-95 cursor-pointer bg-transparent border-0 outline-none shrink-0"
                    title="Ver Vehículo"
                    aria-label="Ver Vehículo"
                  >
                    <CarIcon className="w-12 h-12 sm:w-14 sm:h-14 text-blue-400 drop-shadow-[0_0_12px_rgba(59,130,246,0.8)]" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate('/presupuestos')
                    }}
                    className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center p-0 transition-all hover:scale-125 active:scale-95 cursor-pointer bg-transparent border-0 outline-none shrink-0"
                    title="Ver Presupuesto"
                    aria-label="Ver Presupuesto"
                  >
                    <PresupuestoIcon className="w-12 h-12 sm:w-14 sm:h-14 text-cyan-400 drop-shadow-[0_0_12px_rgba(6,182,212,0.8)]" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (row.factura?.numero) {
                        navigate('/facturas', { state: { facturaNumero: row.factura.numero } })
                      } else {
                        navigate('/facturas')
                      }
                    }}
                    className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center p-0 transition-all hover:scale-125 active:scale-95 cursor-pointer bg-transparent border-0 outline-none shrink-0"
                    title="Ver Factura"
                    aria-label="Ver Factura"
                  >
                    <FacturaIcon className="w-12 h-12 sm:w-14 sm:h-14 text-emerald-400 drop-shadow-[0_0_12px_rgba(16,185,129,0.8)]" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setImgOpen(true)
                    }}
                    className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center p-0 transition-all hover:scale-125 active:scale-95 cursor-pointer bg-transparent border-0 outline-none shrink-0"
                    title="Ver Imágenes"
                    aria-label="Ver Imágenes"
                  >
                    <ImageIcon className="w-12 h-12 sm:w-14 sm:h-14 text-violet-400 drop-shadow-[0_0_12px_rgba(139,92,246,0.8)]" />
                  </button>

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

      {/* Visor de imágenes */}
      <ImageViewer
        open={imgOpen}
        matricula={row.matricula}
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
  const [openId, setOpenId] = useState<string | null>(
    location.state?.expandPresupuestoId ?? location.state?.expandExpedienteId ?? location.state?.expandVehiculoId ?? null
  )

  useEffect(() => {
    const targetId = location.state?.expandPresupuestoId ?? location.state?.expandExpedienteId ?? location.state?.expandVehiculoId
    if (targetId) {
      setOpenId(targetId)
    }
  }, [location.state?.expandPresupuestoId, location.state?.expandExpedienteId, location.state?.expandVehiculoId])

  const load = useCallback(async () => {
    setLoading(true)

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

      {/* Cabecera */}
      <PageHeader title="EXPEDIENTES">

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

      {/* Buscador + Nuevo */}
      <div className="flex gap-2">

        <div className="relative flex-1">

          <Search
            className="
              absolute
              left-3
              top-1/2
              -translate-y-1/2
              w-4
              h-4
              text-slate-500
              pointer-events-none
            "
          />

          <input
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="ID, cliente, matrícula…"
            className="
              w-full
              pl-9
              pr-3
              py-2.5
              bg-bg-800
              border
              border-bg-700
              rounded-xl
              text-sm
              text-white
              placeholder-slate-500
              focus:border-cyan-500
              outline-none
              transition-colors
            "
          />

        </div>

        <button
          onClick={() => navigate('/clientes')}
          className="
            flex
            items-center
            gap-1.5
            px-4
            py-2.5
            rounded-xl
            bg-cyan-600
            hover:bg-cyan-500
            text-white
            text-sm
            font-bold
            transition-colors
            whitespace-nowrap
            active:scale-95
            shrink-0
          "
        >
          <Plus className="w-4 h-4" />
          Nuevo
        </button>

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

        <div className="space-y-2">

          {filtered.map((row) => {
            const cardUniqueId = row.presupuesto?.id ?? row.expedienteId
            const isCardOpen = openId === cardUniqueId || openId === row.expedienteId || openId === row.vehiculoId

            return (
              <TarjetaExpediente
                key={cardUniqueId}
                row={row}
                isOpen={isCardOpen}
                onToggle={() =>
                  setOpenId((prev) =>
                    prev === cardUniqueId || prev === row.expedienteId || prev === row.vehiculoId
                      ? null
                      : cardUniqueId
                  )
                }
                onDelete={handleDelete}
                onRefresh={load}
              />
            )
          })}

        </div>

      )}

    </div>
  )
}