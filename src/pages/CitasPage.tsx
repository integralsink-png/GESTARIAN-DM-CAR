import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Cita, Cliente, Vehiculo, Presupuesto } from '../lib/types'
import { PageHeader, EmptyState, MatriculaBadge } from '../components/UI'
import { Calendar, ArrowLeft, ImageIcon, Trash2, CalendarClock } from 'lucide-react'
import { GlobalImageViewer } from '../components/GlobalImageViewer'
import { fetchExpedienteFotos, saveExpedienteFoto } from '../lib/expedienteService'
import { getExpediente } from '../lib/utils'
import { ExpedienteFolderIcon, PresupuestoIcon } from '../components/CustomIcons'

export function CitasPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const navState = location.state as { presupuestoId?: string; clienteId?: string; vehiculoId?: string; citaId?: string } | null

  const [citas, setCitas] = useState<Cita[]>([])
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [vehiculos, setVehiculos] = useState<Record<string, Vehiculo>>({})
  const [loading, setLoading] = useState(true)
  const [showFechaModal, setShowFechaModal] = useState(false)
  const [fechaPropuesta, setFechaPropuesta] = useState('')
  const [horaPropuesta, setHoraPropuesta] = useState('09:00')

  const [viewerMatricula, setViewerMatricula] = useState<string | null>(null)
  const [expedienteFotos, setExpedienteFotos] = useState<string[]>([])
  const [showExpedienteViewer, setShowExpedienteViewer] = useState(false)
  const [expedienteViewerTitle, setExpedienteViewerTitle] = useState("Fotos del Expediente")

  const [deleteModalCita, setDeleteModalCita] = useState<Cita | null>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressTriggered = useRef(false)

  useEffect(() => {
    loadCitas()
    loadPresupuestos()
    loadClientes()
    loadVehiculos()
  }, [])

  async function loadPresupuestos() {
    const { data } = await supabase.from('presupuestos').select('*')
    setPresupuestos(data ?? [])
  }

  async function loadCitas() {
    setLoading(true)
    const { data } = await supabase.from('citas').select('*').order('fecha', { ascending: false }).order('hora', { ascending: false })
    setCitas(data ?? [])
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

  function proponerFecha() {
    const manana = new Date()
    manana.setDate(manana.getDate() + 1)
    manana.setHours(9, 0, 0, 0)
    // Saltar fines de semana
    while (manana.getDay() === 0 || manana.getDay() === 6) {
      manana.setDate(manana.getDate() + 1)
    }
    setFechaPropuesta(manana.toISOString().split('T')[0])
    setHoraPropuesta('09:00')
    setShowFechaModal(true)
  }

  async function crearCitaDesdePresupuesto(fecha: string, hora: string) {
    if (!navState?.clienteId) return
    await supabase.from('citas').insert({
      presupuesto_id: navState.presupuestoId ?? null,
      cliente_id: navState.clienteId,
      vehiculo_id: navState.vehiculoId ?? null,
      fecha,
      hora,
      estado: 'pendiente',
    })
    setShowFechaModal(false)
    navigate('/citas', { replace: true })
    loadCitas()
  }

  useEffect(() => {
    if (navState?.presupuestoId) {
      proponerFecha()
    }
  }, [navState?.presupuestoId])

  function clienteNombre(id: string) {
    return clientes.find((c) => c.id === id)?.nombre ?? '—'
  }

  const startLongPress = (cita: Cita) => {
    longPressTriggered.current = false
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true
      setDeleteModalCita(cita)
    }, 3000)
  }

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  function getBorderColor(cita: Cita) {
    if (cita.estado === 'confirmada' || cita.estado === 'completada') {
      return 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
    }
    if (cita.estado === 'citado' || (cita.fecha && cita.hora && cita.estado !== 'pendiente')) {
      return 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.2)]'
    }
    return 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
  }

  return (
    <div>
      <PageHeader title="CITAS">
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
      ) : citas.length === 0 ? (
        <EmptyState icon={<Calendar className="w-12 h-12" />} title="No hay citas" subtitle="Las citas se crean desde presupuestos aceptados" />
      ) : (
        <div className="space-y-3.5">
          {citas.map((cita) => {
            const p = presupuestos.find((x) => x.id === cita.presupuesto_id)
            const cli = clientes.find((c) => c.id === cita.cliente_id)
            const v = cita.vehiculo_id ? vehiculos[cita.vehiculo_id] : null
            const expNum = p ? getExpediente(p, cli, clientes) : 'S/N'
            const presNum = p?.numero || 'S/N'
            const borderClass = getBorderColor(cita)

            return (
              <div
                key={cita.id}
                onMouseDown={() => startLongPress(cita)}
                onMouseUp={cancelLongPress}
                onMouseLeave={cancelLongPress}
                onTouchStart={() => startLongPress(cita)}
                onTouchEnd={cancelLongPress}
                className={`relative p-4 sm:p-5 rounded-2xl border-[3px] bg-bg-800/90 transition-all select-none ${borderClass}`}
              >
                {/* LÍNEA 1: Nombre del titular + Botón de acción a la derecha */}
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-xl sm:text-2xl font-black text-white capitalize tracking-wide truncate flex-1 min-w-0">
                    {clienteNombre(cita.cliente_id).toLowerCase()}
                  </h2>

                  {/* Botón de acción según estado */}
                  {(cita.estado === 'confirmada' || cita.estado === 'completada') ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate('/asignar-cita', {
                          state: {
                            vehiculoId: cita.vehiculo_id,
                            clienteId: cita.cliente_id,
                            presupuestoId: cita.presupuesto_id,
                            citaId: cita.id,
                            clienteNombre: clienteNombre(cita.cliente_id),
                            matricula: v?.matricula,
                          }
                        })
                      }}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/60 text-xs font-black uppercase tracking-wider hover:bg-cyan-500/30 transition-all active:scale-95 shadow-[0_0_10px_rgba(6,182,212,0.25)]"
                    >
                      <CalendarClock className="w-3.5 h-3.5" />
                      MODIFICAR
                    </button>
                  ) : (cita.fecha && cita.hora) ? (
                    <span className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/60 text-xs font-black uppercase tracking-wider shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                      <CalendarClock className="w-3.5 h-3.5" />
                      PENDIENTE
                    </span>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate('/asignar-cita', {
                          state: {
                            vehiculoId: cita.vehiculo_id,
                            clienteId: cita.cliente_id,
                            presupuestoId: cita.presupuesto_id,
                            citaId: cita.id,
                            clienteNombre: clienteNombre(cita.cliente_id),
                            matricula: v?.matricula,
                          }
                        })
                      }}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/60 text-xs font-black uppercase tracking-wider hover:bg-emerald-500/30 transition-all active:scale-95 shadow-[0_0_10px_rgba(16,185,129,0.25)]"
                    >
                      <CalendarClock className="w-3.5 h-3.5" />
                      ASIGNAR
                    </button>
                  )}
                </div>

                {/* LÍNEA 2: Número de expediente flotante (x1.5), Fecha y Hora repartidas equitativamente */}
                <div className="flex items-center justify-between gap-3 mt-2.5">
                  <div
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate('/expedientes', {
                        state: {
                          search: v?.matricula || expNum,
                          expandPresupuestoId: p?.id,
                          expandVehiculoId: cita.vehiculo_id,
                          expandExpedienteId: expNum,
                          expandCitaId: cita.id,
                        },
                      })
                    }}
                    className="cursor-pointer hover:brightness-125 transition-all shrink-0"
                    title="Ver Expediente"
                  >
                    <span className="text-xl sm:text-2xl font-mono text-cyan-400 font-black tracking-wider">
                      {expNum}
                    </span>
                  </div>

                  <div className="flex items-center justify-center flex-1 text-center font-bold text-sm sm:text-base text-slate-300">
                    <span>
                      {new Date(cita.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </span>
                  </div>

                  <div className="flex items-center justify-end shrink-0 font-black text-sm sm:text-base text-amber-400">
                    <span>
                      {cita.hora ? cita.hora.substring(0, 5) : '09:00'}
                    </span>
                  </div>
                </div>

                {/* LÍNEA 3: Marca y Modelo a la izquierda, Matrícula a la derecha */}
                <div className="flex items-center justify-between gap-3 mt-2.5">
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

                {/* LÍNEA 4: Número de presupuesto (x2 tamaño) seguido de iconos flotantes centrados en el espacio restante */}
                <div className="flex items-center justify-between gap-3 mt-3 pt-2.5 border-t border-white/10">
                  {/* Número de Presupuesto flotante a la izquierda (x2 tamaño) */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate('/presupuestos', { state: { clienteId: cita.cliente_id, openForm: false } })
                    }}
                    className="cursor-pointer hover:brightness-125 transition-all shrink-0"
                    title="Ver Presupuestos del Cliente"
                  >
                    <span className="text-2xl sm:text-3xl font-mono text-cyan-400 font-black tracking-wider leading-none">
                      {presNum}
                    </span>
                  </div>

                  {/* Iconos flotantes centrados en el espacio restante */}
                  <div className="flex-1 flex items-center justify-center gap-5 sm:gap-8 ml-2 sm:ml-4" onClick={(e) => e.stopPropagation()}>
                    {/* 1. Icono flotante Expediente (carpeta con E dentro) */}
                    <button
                      onClick={() =>
                        navigate('/expedientes', {
                          state: {
                            search: v?.matricula || expNum,
                            expandPresupuestoId: p?.id,
                            expandVehiculoId: cita.vehiculo_id,
                            expandExpedienteId: expNum,
                            expandCitaId: cita.id,
                          },
                        })
                      }
                      className="text-yellow-500 hover:text-yellow-400 transition-all hover:scale-125 active:scale-95 bg-transparent border-0 p-0 outline-none flex items-center justify-center drop-shadow-[0_0_8px_rgba(234,179,8,0.5)] cursor-pointer"
                      title="Expediente"
                      aria-label="Expediente"
                    >
                      <ExpedienteFolderIcon className="w-10 h-10 sm:w-11 sm:h-11" />
                    </button>

                    {/* 2. Icono flotante Presupuesto (hoja A4 con P dentro) */}
                    <button
                      onClick={() => navigate('/presupuestos', { state: { clienteId: cita.cliente_id, openForm: false } })}
                      className="text-cyan-400 hover:text-cyan-300 transition-all hover:scale-125 active:scale-95 bg-transparent border-0 p-0 outline-none flex items-center justify-center drop-shadow-[0_0_8px_rgba(6,182,212,0.5)] cursor-pointer"
                      title="Presupuestos del cliente"
                      aria-label="Presupuestos"
                    >
                      <PresupuestoIcon className="w-10 h-10 sm:w-11 sm:h-11" />
                    </button>

                    {/* 3. Icono flotante Imágenes (abre el visor único con fotos del expediente) */}
                    <button
                      onClick={async () => {
                        const fotos = await fetchExpedienteFotos(cita.cliente_id, cita.vehiculo_id, cita.fotos || [], {
                          citaId: cita.id,
                          presupuestoId: p?.id
                        })
                        setExpedienteFotos(fotos)
                        setViewerMatricula(v?.matricula || null)
                        setExpedienteViewerTitle(`Cita ${expNum}`)
                        setShowExpedienteViewer(true)
                      }}
                      className="text-violet-400 hover:text-violet-300 transition-all hover:scale-125 active:scale-95 bg-transparent border-0 p-0 outline-none flex items-center justify-center drop-shadow-[0_0_8px_rgba(167,139,250,0.5)] cursor-pointer"
                      title="Ver Imágenes de la Cita"
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
      {deleteModalCita && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-bg-900 border-2 border-red-500 rounded-2xl p-6 shadow-[0_0_30px_rgba(239,68,68,0.4)] text-center space-y-4">
            <Trash2 className="w-12 h-12 text-red-500 mx-auto stroke-[1.5]" />
            <h3 className="text-xl font-bold text-white">¿Eliminar cita?</h3>
            <p className="text-sm text-slate-300">
              Esta acción eliminará la cita de <strong>{clienteNombre(deleteModalCita.cliente_id)}</strong>.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeleteModalCita(null)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold border border-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  const id = deleteModalCita.id
                  setDeleteModalCita(null)
                  await supabase.from('citas').delete().eq('id', id)
                  loadCitas()
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold shadow-lg shadow-red-600/30 transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: proponer fecha y hora */}
      {showFechaModal && (
        <div className="fixed inset-0 bg-bg-950/80 z-50 flex items-start justify-center pt-[100px] px-4 overflow-y-auto" onClick={() => setShowFechaModal(false)}>
          <div className="w-full max-w-md p-6 shadow-2xl border border-bg-700 bg-bg-900 rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-white mb-4">Programar cita</h2>
            <p className="text-sm text-slate-500 mb-4">
              Cliente: <span className="text-white">{clientes.find((c) => c.id === navState?.clienteId)?.nombre ?? '—'}</span>
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Fecha propuesta</label>
                <input
                  type="date"
                  value={fechaPropuesta}
                  onChange={(e) => setFechaPropuesta(e.target.value)}
                  className="w-full bg-bg-700 border border-bg-600 rounded-lg px-4 py-2.5 text-white text-sm focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Hora</label>
                <input
                  type="time"
                  value={horaPropuesta}
                  onChange={(e) => setHoraPropuesta(e.target.value)}
                  className="w-full bg-bg-700 border border-bg-600 rounded-lg px-4 py-2.5 text-white text-sm focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => crearCitaDesdePresupuesto(fechaPropuesta, horaPropuesta)} 
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-sm font-semibold transition-all bg-bg-800 text-cyan-400 border-bg-700 hover:bg-bg-700 hover:border-cyan-500/60 shadow-lg cursor-pointer"
              >
                Asignar cita
              </button>
              <button 
                onClick={() => setShowFechaModal(false)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-sm font-semibold transition-all bg-bg-800 text-slate-300 border-bg-700 hover:bg-bg-700 hover:text-white shadow-lg cursor-pointer"
              >
                Cancelar cita
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Visor Global de Imágenes */}
      <GlobalImageViewer
        isOpen={showExpedienteViewer || !!viewerMatricula}
        onClose={() => {
          setShowExpedienteViewer(false)
          setViewerMatricula(null)
        }}
        matricula={viewerMatricula || undefined}
        images={expedienteFotos}
        onAddImage={async (dataUrl) => {
          await saveExpedienteFoto(dataUrl)
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
