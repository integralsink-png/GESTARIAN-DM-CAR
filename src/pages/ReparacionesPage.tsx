import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Reparacion, Cliente, Vehiculo } from '../lib/types'
import { Wrench, ImageIcon, Trash2, ArrowLeft } from 'lucide-react'
import { getExpediente } from '../lib/utils'
import { PageHeader, EmptyState, MatriculaBadge } from '../components/UI'
import { GlobalImageViewer } from '../components/GlobalImageViewer'
import { fetchExpedienteFotos } from '../lib/expedienteService'
import { ExpedienteFolderIcon, PresupuestoIcon } from '../components/CustomIcons'

export function ReparacionesPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const navState = location.state as { citaId?: string; clienteId?: string; vehiculoId?: string; reparacionId?: string } | null

  const [reparaciones, setReparaciones] = useState<Reparacion[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [vehiculos, setVehiculos] = useState<Record<string, Vehiculo>>({})
  const [citas, setCitas] = useState<any[]>([])
  const [presupuestos, setPresupuestos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [viewerMatricula, setViewerMatricula] = useState<string | null>(null)
  const [expedienteFotos, setExpedienteFotos] = useState<string[]>([])
  const [showExpedienteViewer, setShowExpedienteViewer] = useState(false)
  const [expedienteViewerTitle, setExpedienteViewerTitle] = useState("Fotos del Expediente")

  useEffect(() => {
    loadReparaciones()
    loadClientes()
    loadVehiculos()
    loadCitasYPresupuestos()
  }, [])

  async function loadCitasYPresupuestos() {
    const { data: cData } = await supabase.from('citas').select('*')
    if (cData) setCitas(cData)
    const { data: pData } = await supabase.from('presupuestos').select('*')
    if (pData) setPresupuestos(pData)
  }

  async function loadReparaciones() {
    setLoading(true)
    const { data } = await supabase.from('reparaciones').select('*').order('created_at', { ascending: false })
    setReparaciones(data ?? [])
    setLoading(false)
  }

  async function loadClientes() {
    const { data } = await supabase.from('clientes').select('*').order('nombre')
    setClientes(data ?? [])
  }

  async function loadVehiculos() {
    const { data } = await supabase.from('vehiculos').select('*')
    const map: Record<string, Vehiculo> = {}
    ;(data ?? []).forEach((v: Vehiculo) => { map[v.id] = v })
    setVehiculos(map)
  }

  function clienteNombre(id: string) {
    return clientes.find((c) => c.id === id)?.nombre ?? '—'
  }

  const [deleteModalRep, setDeleteModalRep] = useState<Reparacion | null>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressTriggered = useRef(false)

  const startLongPress = (rep: Reparacion) => {
    longPressTriggered.current = false
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true
      setDeleteModalRep(rep)
    }, 3000)
  }

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  function getBorderColor(rep: Reparacion) {
    if (rep.estado === 'finalizado') {
      return 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
    }
    if (rep.estado === 'en_proceso') {
      return 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.2)]'
    }
    return 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
  }

  return (
    <div>
      <PageHeader title="REPARACIONES">
        <button
          onClick={() => navigate(-1)}
          className="w-[60px] h-[60px] rounded-2xl bg-slate-800/80 text-white border border-white/20 flex items-center justify-center hover:bg-slate-700 transition-transform active:scale-95 shrink-0 shadow-[0_0_15px_rgba(255,255,255,0.1)]"
          title="Volver"
          aria-label="Volver"
        >
          <ArrowLeft className="w-7 h-7" />
        </button>
      </PageHeader>

      {loading ? (
        <div className="text-center py-16 text-slate-500">Cargando...</div>
      ) : reparaciones.length === 0 ? (
        <EmptyState icon={<Wrench className="w-12 h-12" />} title="No hay reparaciones" subtitle="Las reparaciones se inician al confirmar llegada de citas" />
      ) : (
        <div className="space-y-3.5">
          {reparaciones.map((rep) => {
            const v = rep.vehiculo_id ? vehiculos[rep.vehiculo_id] : null
            const cli = clientes.find((c) => c.id === rep.cliente_id)
            const cita = citas.find((c) => c.id === rep.cita_id)
            const p = cita ? presupuestos.find((p) => p.id === cita.presupuesto_id) : null
            const expNum = p ? getExpediente(p, cli, clientes) : 'S/N'
            const borderClass = getBorderColor(rep)

            return (
              <div
                key={rep.id}
                onMouseDown={() => startLongPress(rep)}
                onMouseUp={cancelLongPress}
                onMouseLeave={cancelLongPress}
                onTouchStart={() => startLongPress(rep)}
                onTouchEnd={cancelLongPress}
                className={`relative p-4 sm:p-5 rounded-2xl border-[3px] bg-bg-800/90 transition-all select-none ${borderClass}`}
              >
                {/* LÍNEA 1: Nombre del cliente (x1.5 tamaño, sin rectángulo de estado) */}
                <div className="flex items-center justify-between">
                  <h2 className="text-xl sm:text-2xl font-black text-white capitalize tracking-wide truncate">
                    {clienteNombre(rep.cliente_id).toLowerCase()}
                  </h2>
                </div>

                {/* LÍNEA 2: Marca y Modelo a la izquierda, Matrícula a la derecha (preferencia matrícula) */}
                <div className="flex items-center justify-between gap-3 mt-2">
                  <div className="font-semibold text-slate-300 text-sm sm:text-base uppercase truncate flex-1 min-w-0">
                    {v ? (
                      <span>
                        {v.marca || ''} {v.modelo || ''}
                      </span>
                    ) : (
                      <span className="text-slate-500 italic">Sin datos vehículo</span>
                    )}
                  </div>

                  {v?.matricula && (
                    <div className="shrink-0 scale-100 sm:scale-105 origin-right">
                      <MatriculaBadge matricula={v.matricula} size="md" />
                    </div>
                  )}
                </div>

                {/* LÍNEA 3: Número de expediente flotante a la izquierda, Iconos de acción repartiéndose el espacio restante (x1.2) */}
                <div className="flex items-center justify-between gap-3 mt-3 pt-2.5 border-t border-white/10">
                  {/* Número de Expediente flotante (x1.5) sin recuadro */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate('/expedientes', { state: { search: v?.matricula || expNum } })
                    }}
                    className="cursor-pointer hover:brightness-125 transition-all shrink-0"
                    title="Ver Expediente"
                  >
                    <span className="text-lg sm:text-xl font-mono text-cyan-400 font-black tracking-wide">
                      {expNum}
                    </span>
                  </div>

                  {/* Iconos flotantes sin texto repartiéndose el espacio restante (tamaño x1.2) */}
                  <div className="flex-1 flex items-center justify-around sm:justify-end sm:gap-6 ml-2 sm:ml-4" onClick={(e) => e.stopPropagation()}>
                    {/* 1. Icono flotante Expediente (carpeta con E dentro) */}
                    <button
                      onClick={() => navigate('/expedientes', { state: { search: v?.matricula || expNum } })}
                      className="text-yellow-500 hover:text-yellow-400 transition-all hover:scale-125 active:scale-95 bg-transparent border-0 p-0 outline-none flex items-center justify-center drop-shadow-[0_0_8px_rgba(234,179,8,0.5)] cursor-pointer"
                      title="Expediente"
                      aria-label="Expediente"
                    >
                      <ExpedienteFolderIcon className="w-10 h-10 sm:w-11 sm:h-11" />
                    </button>

                    {/* 2. Icono flotante Presupuesto (hoja A4 con P dentro) */}
                    <button
                      onClick={() => {
                        if (p) {
                          navigate('/presupuestos', { state: { presupuestoId: p.id } })
                        } else {
                          navigate('/presupuestos', { state: { clienteId: rep.cliente_id, openForm: false } })
                        }
                      }}
                      className="text-cyan-400 hover:text-cyan-300 transition-all hover:scale-125 active:scale-95 bg-transparent border-0 p-0 outline-none flex items-center justify-center drop-shadow-[0_0_8px_rgba(6,182,212,0.5)] cursor-pointer"
                      title={p ? "Ver Presupuesto del Expediente" : "Presupuestos del cliente"}
                      aria-label="Presupuestos"
                    >
                      <PresupuestoIcon className="w-10 h-10 sm:w-11 sm:h-11" />
                    </button>

                    {/* 3. Icono flotante Imágenes (abre el visor único con fotos de la reparación) */}
                    <button
                      onClick={async () => {
                        const fotos = await fetchExpedienteFotos(rep.cliente_id, rep.vehiculo_id, rep.fotos || [], {
                          reparacionId: rep.id,
                          citaId: rep.cita_id,
                          presupuestoId: p?.id
                        })
                        setExpedienteFotos(fotos)
                        setViewerMatricula(v?.matricula || null)
                        setExpedienteViewerTitle(`Reparación ${expNum}`)
                        setShowExpedienteViewer(true)
                      }}
                      className="text-violet-400 hover:text-violet-300 transition-all hover:scale-125 active:scale-95 bg-transparent border-0 p-0 outline-none flex items-center justify-center drop-shadow-[0_0_8px_rgba(167,139,250,0.5)] cursor-pointer"
                      title="Ver Imágenes de la Reparación"
                      aria-label="Imágenes"
                    >
                      <ImageIcon className="w-10 h-10 sm:w-11 sm:h-11 stroke-[1.5]" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal flotante de confirmación tras pulsación larga de 3 segundos */}
      {deleteModalRep && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-bg-900 border-2 border-red-500 rounded-2xl p-6 shadow-[0_0_30px_rgba(239,68,68,0.4)] text-center space-y-4">
            <Trash2 className="w-12 h-12 text-red-500 mx-auto stroke-[1.5]" />
            <h3 className="text-xl font-bold text-white">¿Eliminar reparación?</h3>
            <p className="text-sm text-slate-300">
              Esta acción eliminará la reparación de <strong>{clienteNombre(deleteModalRep.cliente_id)}</strong>.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeleteModalRep(null)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold border border-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  const id = deleteModalRep.id
                  setDeleteModalRep(null)
                  await supabase.from('reparaciones').delete().eq('id', id)
                  loadReparaciones()
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold shadow-lg shadow-red-600/30 transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Visor Global único de Imágenes */}
      <GlobalImageViewer
        isOpen={showExpedienteViewer || !!viewerMatricula}
        onClose={() => {
          setShowExpedienteViewer(false)
          setViewerMatricula(null)
        }}
        matricula={viewerMatricula || undefined}
        images={expedienteFotos}
        onAddImage={async (dataUrl) => {
          setExpedienteFotos((prev) => [...prev, dataUrl])
        }}
        onDeleteImage={async (index) => {
          setExpedienteFotos((prev) => prev.filter((_, i) => i !== index))
        }}
        title={expedienteViewerTitle}
      />
    </div>
  )
}
