import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Cita, Cliente, Vehiculo, Presupuesto } from '../lib/types'
import { PageHeader, Card, Badge, EmptyState } from '../components/UI'
import { Calendar, ArrowLeft, ImageIcon, Trash2 } from 'lucide-react'
import { ImageViewer } from '../components/ImageViewer'
import { GlobalImageViewer } from '../components/GlobalImageViewer'
import { fetchExpedienteFotos, saveExpedienteFoto } from '../lib/expedienteService'
import { getExpediente } from '../lib/utils'


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
  const [expandedCita, setExpandedCita] = useState<string | null>(null)

  useEffect(() => {
    loadCitas()
    loadPresupuestos()
    loadClientes()
    loadVehiculos()
    if (navState?.citaId) {
      setExpandedCita(navState.citaId)
    }
  }, [navState?.citaId])

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

  async function cambiarEstado(id: string, estado: 'pendiente' | 'confirmada' | 'completada' | 'cancelada') {
    await supabase.from('citas').update({ estado }).eq('id', id)
    loadCitas()
  }

  async function eliminarCita(id: string) {
    if (!confirm('¿Eliminar esta cita? Esta acción no se puede deshacer.')) return
    await supabase.from('citas').delete().eq('id', id)
    loadCitas()
  }

  function clienteNombre(id: string) {
    return clientes.find((c) => c.id === id)?.nombre ?? '—'
  }



  const estadoColor = (e: string): 'yellow' | 'green' | 'red' | 'blue' => {
    if (e === 'pendiente') return 'yellow'
    if (e === 'confirmada') return 'blue'
    if (e === 'completada') return 'green'
    return 'red'
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
        <div className="space-y-2">
          {citas.map((cita) => {
            const p = presupuestos.find(x => x.id === cita.presupuesto_id);
            const isExpanded = expandedCita === cita.id;

            return (
            <Card key={cita.id} className="overflow-hidden p-0">
              <div 
                className="p-4 cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() => setExpandedCita(isExpanded ? null : cita.id)}
              >
                {/* LÍNEA 1: CLIENTE y ESTADO CITA */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-bold text-white text-base truncate">{clienteNombre(cita.cliente_id)}</span>
                  <div onClick={(e) => e.stopPropagation()}>
                    <Badge 
                      text={cita.estado === 'pendiente' ? 'Pendiente' : cita.estado === 'confirmada' ? 'Confirmada' : cita.estado} 
                      color={estadoColor(cita.estado)} 
                      onClick={() => cambiarEstado(cita.id, cita.estado === 'pendiente' ? 'confirmada' : 'pendiente')}
                    />
                  </div>
                </div>

                  {/* LÍNEA 2: EXPEDIENTE | FECHA | HORA */}
                  <div className="flex items-center justify-between w-[95%] text-sm font-semibold mt-1">
                    <span className="text-cyan-400 font-mono text-[15px] bg-cyan-900/30 px-1 rounded border border-cyan-500/20">
                      {p ? getExpediente(p, clientes.find(c => c.id === cita.cliente_id), clientes) : 'S/N'}
                    </span>
                    <span className="text-slate-300">
                      {new Date(cita.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </span>
                    {cita.hora && (
                      <span className="text-amber-400">
                        {cita.hora.substring(0, 5)}
                      </span>
                    )}
                  </div>
                  
                  {/* LÍNEA 3: MARCA Y MODELO | MATRÍCULA */}
                  {(() => {
                    const v = cita.vehiculo_id ? vehiculos[cita.vehiculo_id] : null;
                    if (!v) return null;
                    return (
                      <div className="flex items-center justify-between mt-1 w-[95%]">
                        <span className="text-xs text-slate-400 uppercase font-medium">
                          {v.marca} {v.modelo}
                        </span>
                        <span className="text-xs font-bold text-emerald-400 text-right">
                          {v.matricula}
                        </span>
                      </div>
                    );
                  })()}
              </div>

              {/* EXPANDED AREA */}
              {isExpanded && (
                <div className="p-4 border-t border-white/10 bg-black/20 flex flex-wrap gap-2 items-center justify-end">
                    {/* Botón Imágenes */}
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        const fotos = await fetchExpedienteFotos(cita.cliente_id, cita.vehiculo_id, cita.fotos || []);
                        setExpedienteFotos(fotos);
                        setExpedienteViewerTitle(`Fotos Expediente Cita`);
                        setShowExpedienteViewer(true);
                      }}
                      className="flex items-center justify-center h-[54px] w-[54px] rounded-lg transition-colors relative bg-transparent hover:bg-white/5 text-amber-400"
                      title="Imágenes del Expediente"
                    >
                      <ImageIcon className="w-[40px] h-[40px]" />
                    </button>

                    {/* Botón Ver Presupuesto */}
                    {p && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate('/presupuestos', { state: { clienteId: cita.cliente_id } });
                          }}
                          className="flex items-center justify-center h-[54px] w-[54px] rounded-lg bg-transparent hover:bg-white/5 text-cyan-400 transition-colors"
                          title="Ver Presupuesto"
                        >
                        <svg className="w-[40px] h-[40px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                          {/* P letter inside */}
                          <path d="M12 16v-4h2.5a1.5 1.5 0 0 1 0 3H12"></path>
                        </svg>
                      </button>
                    )}

                    {/* Botón Enviar a Taller */}
                    {cita.estado !== 'completada' && (
                        <button 
                          onClick={async (e) => {
                            e.stopPropagation();
                            await cambiarEstado(cita.id, 'completada');
                            
                            // Crear reparación aquí para evitar duplicados por StrictMode o renderizados dobles
                            const { data: existing } = await supabase.from('reparaciones').select('id').eq('cita_id', cita.id).maybeSingle();
                            if (!existing) {
                              await supabase.from('reparaciones').insert({
                                cita_id: cita.id,
                                cliente_id: cita.cliente_id,
                                vehiculo_id: cita.vehiculo_id ?? null,
                                estado: 'en_proceso',
                              });
                            }
                            
                            navigate('/reparaciones');
                          }} 
                          className="flex flex-col items-center justify-center gap-0.5 py-1 px-1 rounded-xl border text-[13px] font-bold bg-bg-800 text-slate-300 border-bg-700 hover:bg-bg-700 hover:text-emerald-400 hover:border-emerald-500/60 transition-all active:scale-95 h-[54px] w-[80px]"
                        >
                          <span>A TALLER</span>
                          <svg width="40" height="10" viewBox="0 0 40 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mt-1.5">
                            <line x1="2" y1="5" x2="38" y2="5"></line>
                            <polyline points="34 1 38 5 34 9"></polyline>
                          </svg>
                        </button>
                    )}

                    {/* Botón Eliminar Cita */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          eliminarCita(cita.id);
                        }}
                        className="flex items-center justify-center h-[54px] w-[54px] rounded-lg bg-transparent hover:bg-white/5 text-red-400 ml-auto transition-colors"
                        title="Eliminar cita"
                      >
                      <Trash2 className="w-[40px] h-[40px]" />
                    </button>
                </div>
              )}
            </Card>
          );})}
        </div>
      )}

        {/* Modal: proponer fecha y hora */}
        {showFechaModal && (
          <div className="fixed inset-0 bg-bg-950/80 z-50 flex items-start justify-center pt-[100px] px-4 overflow-y-auto" onClick={() => setShowFechaModal(false)}>
            <Card className="w-full max-w-md p-6 shadow-2xl border border-bg-700">
              <div onClick={(e) => e.stopPropagation()}>
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
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-sm font-semibold transition-all bg-bg-800 text-cyan-400 border-bg-700 hover:bg-bg-700 hover:border-cyan-500/60 shadow-lg"
                  >
                    Asignar cita
                  </button>
                  <button 
                    onClick={() => setShowFechaModal(false)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-sm font-semibold transition-all bg-bg-800 text-slate-300 border-bg-700 hover:bg-bg-700 hover:text-white shadow-lg"
                  >
                    Cancelar cita
                  </button>
                </div>
              </div>
            </Card>
          </div>
        )}

      <ImageViewer open={!!viewerMatricula} matricula={viewerMatricula ?? ''} onClose={() => setViewerMatricula(null)} />

      <GlobalImageViewer
        isOpen={showExpedienteViewer}
        onClose={() => setShowExpedienteViewer(false)}
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
