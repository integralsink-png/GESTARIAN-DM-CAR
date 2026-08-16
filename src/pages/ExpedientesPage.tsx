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
import type { TimelineStep, TimelineColor } from '../components/TimelineVisual'

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
  const { showToast, showActionToast } = useToast()

  const [imgOpen, setImgOpen] = useState(false)
  const [deleteVisible, setDeleteVisible] = useState(false)

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
    onCrearPresupuesto: (vehiculoId, clienteId) => navigate('/presupuestos'),
    onVerPresupuesto: (presupuestoId) => navigate('/presupuestos'),
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
    onVerCita: (citaId) => navigate('/citas'),
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
    onGestionarReparacion: (reparacionId) => navigate('/reparaciones'),
    onFinalizarReparacion: async (reparacionId) => {
      const { error } = await supabase.from('reparaciones').update({ estado: 'finalizado' }).eq('id', reparacionId)
      if (!error) {
        showToast('Reparación finalizada', 'success')
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
    onVerFactura: (numero) => navigate('/facturas')
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
        className={`
          relative
          gestarian-panel
          border
          ${borderColor}
          rounded-xl
          overflow-hidden
          cursor-pointer
          transition-all
          duration-200
          hover:shadow-lg
          select-none
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

        {/* Línea 1: ID | Fecha | Matrícula */}
        <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-1">

          <span
            className="
              font-mono
              text-[18px]
              font-bold
              text-cyan-300
              bg-cyan-500/10
              px-2
              py-0.5
              rounded
              border
              border-cyan-500/20
              shrink-0
            "
          >
            {row.expedienteId}
          </span>

          <span
            className="
              text-[18px]
              text-slate-400
              tabular-nums
            "
          >
            {fmtFecha(row.fecha)}
          </span>

          <MatriculaBadge matricula={row.matricula} />

        </div>

        {/* Línea 2: Nombre cliente */}
        <div className="px-3 pb-3">

          <p
            className="
              text-[21px]
              font-semibold
              text-white
              truncate
            "
          >
            {row.clienteNombre}
          </p>

          {(row.marca || row.modelo) && (
            <p className="text-xs text-slate-500 truncate">
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
                <div className="overflow-x-auto">
                  <TimelineVisual steps={steps} />
                </div>

                {/* Botones inferiores */}
                <div className="grid grid-cols-4 gap-2">

                  <button
                    onClick={() => navigate('/clientes')}
                    className="
                      flex
                      flex-col
                      items-center
                      gap-1
                      py-2
                      rounded-xl
                      bg-slate-800/60
                      border
                      border-white/10
                      hover:border-cyan-500/40
                      hover:bg-cyan-500/10
                      transition-all
                      text-xs
                      text-slate-300
                      active:scale-95
                    "
                  >
                    <User className="w-4 h-4 text-cyan-400" />
                    Cliente
                  </button>

                  <button
                    onClick={() => navigate('/clientes')}
                    className="
                      flex
                      flex-col
                      items-center
                      gap-1
                      py-2
                      rounded-xl
                      bg-slate-800/60
                      border
                      border-white/10
                      hover:border-blue-500/40
                      hover:bg-blue-500/10
                      transition-all
                      text-xs
                      text-slate-300
                      active:scale-95
                    "
                  >
                    <CarIcon className="w-4 h-4 text-blue-400" />
                    Vehículo
                  </button>

                  <button
                    onClick={() => setImgOpen(true)}
                    className="
                      flex
                      flex-col
                      items-center
                      gap-1
                      py-2
                      rounded-xl
                      bg-slate-800/60
                      border
                      border-white/10
                      hover:border-violet-500/40
                      hover:bg-violet-500/10
                      transition-all
                      text-xs
                      text-slate-300
                      active:scale-95
                    "
                  >
                    <ImageIcon className="w-4 h-4 text-violet-400" />
                    Imágenes
                  </button>

                  <button
                    onClick={onToggle}
                    className="
                      flex
                      flex-col
                      items-center
                      gap-1
                      py-2
                      rounded-xl
                      bg-slate-800/60
                      border
                      border-white/10
                      hover:border-rose-500/40
                      hover:bg-rose-500/10
                      transition-all
                      text-xs
                      text-slate-300
                      active:scale-95
                    "
                  >
                    <ArrowLeft className="w-4 h-4 text-rose-400" />
                    Volver
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
  const [openId, setOpenId] = useState<string | null>(location.state?.expandVehiculoId ?? null)

  useEffect(() => {
    if (location.state?.expandVehiculoId) {
      setOpenId(location.state.expandVehiculoId)
    }
  }, [location.state?.expandVehiculoId])

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

    const vIds = [
      ...new Set(
        pData
          .map((p: any) => p.vehiculo_id)
          .filter(Boolean)
      ),
    ] as string[]

    const [
      { data: citasD },
      { data: repsD },
      { data: facD },
    ] = await Promise.all([
      supabase
        .from('citas')
        .select('id, vehiculo_id, presupuesto_id, estado, created_at')
        .in('vehiculo_id', vIds)
        .order('created_at', { ascending: false }),

      supabase
        .from('reparaciones')
        .select('id, vehiculo_id, cita_id, estado, created_at')
        .in('vehiculo_id', vIds)
        .order('created_at', {
          ascending: false,
        }),

      supabase
        .from('facturas')
        .select('id, numero, vehiculo_id, reparacion_id, estado_cobro, fecha, enviado_email_at, enviado_whatsapp_at, created_at')
        .in('vehiculo_id', vIds)
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

      // Vinculación estricta y única por pipeline de este expediente
      const cita = (citasD || []).find((c: any) => c.presupuesto_id === p.id) ?? null
      const rep = cita ? (repsD || []).find((r: any) => r.cita_id === cita.id) ?? null : null
      const fac = rep ? (facD || []).find((f: any) => f.reparacion_id === rep.id) ?? null : null

      // Obtener fecha del último cobro de la factura encontrada
      let ultimoCobroFecha: string | null = null;
      if (fac?.id) {
        ultimoCobroFecha = ultimoCobroByFac[fac.id] ?? null;
      }

      const expId = getExpediente(p, cliente, [], pData as any[]);

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
          enviado_email_at: fac.enviado_email_at,
          enviado_whatsapp_at: fac.enviado_whatsapp_at
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

          {filtered.map((row) => (

            <TarjetaExpediente
              key={row.vehiculoId}
              row={row}
              isOpen={
                openId === row.vehiculoId
              }
              onToggle={() =>
                setOpenId((prev) =>
                  prev === row.vehiculoId
                    ? null
                    : row.vehiculoId
                )
              }
              onDelete={handleDelete}
              onRefresh={load}
            />

          ))}

        </div>

      )}

    </div>
  )
}