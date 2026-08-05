import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Cita, Cliente, Vehiculo } from '../lib/types'
import { PageHeader, Card, Button, Badge, EmptyState, MetisRowButton } from '../components/UI'
import { Calendar, ArrowRight, ArrowLeft, Clock, Car, ImageIcon, Trash2 } from 'lucide-react'
import { ImageViewer } from '../components/ImageViewer'
import { GlobalImageViewer } from '../components/GlobalImageViewer'


export function CitasPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const navState = location.state as { presupuestoId?: string; clienteId?: string; vehiculoId?: string } | null

  const [citas, setCitas] = useState<Cita[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [vehiculos, setVehiculos] = useState<Record<string, Vehiculo>>({})
  const [loading, setLoading] = useState(true)
  const [showFechaModal, setShowFechaModal] = useState(false)
  const [fechaPropuesta, setFechaPropuesta] = useState('')
  const [horaPropuesta, setHoraPropuesta] = useState('09:00')

  const [viewerMatricula, setViewerMatricula] = useState<string | null>(null)

  useEffect(() => {
    loadCitas()
    loadClientes()
    loadVehiculos()
  }, [])

  async function loadCitas() {
    setLoading(true)
    const { data } = await supabase.from('citas').select('*').order('fecha', { ascending: false })
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

  function vehiculoInfo(id: string | null) {
    if (!id) return null
    const v = vehiculos[id]
    return v ? `${v.matricula} · ${v.marca ?? ''} ${v.modelo ?? ''}` : null
  }

  const estadoColor = (e: string): 'yellow' | 'green' | 'red' | 'blue' => {
    if (e === 'pendiente') return 'yellow'
    if (e === 'confirmada') return 'blue'
    if (e === 'completada') return 'green'
    return 'red'
  }

  const [fotosExpandida, setFotosExpandida] = useState<string | null>(null)
  const [subiendoFoto, setSubiendoFoto] = useState(false)

  const toggleFotos = (id: string) => {
    setFotosExpandida(prev => prev === id ? null : id)
  }

  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  async function handleUploadCitaFoto(e: React.ChangeEvent<HTMLInputElement>, citaId: string) {
    if (!e.target.files || e.target.files.length === 0) return
    setSubiendoFoto(true)
    try {
      const file = e.target.files[0]
      const dataUrl = await fileToDataUrl(file)

      const cita = citas.find(c => c.id === citaId)
      if (!cita) return
      
      const fotosActuales = cita.fotos ?? []
      const nuevasFotos = [...fotosActuales, dataUrl]

      const { error } = await supabase.from('citas').update({ fotos: nuevasFotos }).eq('id', citaId)
      if (error) throw error
      await loadCitas()
    } catch (err) {
      console.error('Error subiendo foto:', err)
      alert('Error subiendo foto. Inténtalo de nuevo.')
    } finally {
      setSubiendoFoto(false)
    }
  }

  async function handleDeleteCitaFoto(citaId: string, index: number) {
    if (!confirm('¿Eliminar esta foto?')) return
    const cita = citas.find(c => c.id === citaId)
    if (!cita) return

    const nuevasFotos = [...(cita.fotos ?? [])]
    nuevasFotos.splice(index, 1)

    try {
      const { error } = await supabase.from('citas').update({ fotos: nuevasFotos }).eq('id', citaId)
      if (error) throw error
      await loadCitas()
    } catch (err) {
      console.error('Error eliminando foto:', err)
    }
  }

  return (
    <div>
      <PageHeader title="Citas" subtitle="Gestión de citas del taller">
        <Button variant="ghost" onClick={() => navigate('/')}>
          <span className="flex items-center gap-2"><ArrowLeft className="w-4 h-4" /> VOLVER</span>
        </Button>
      </PageHeader>

      {loading ? (
        <div className="text-center py-16 text-slate-500">Cargando...</div>
      ) : citas.length === 0 ? (
        <EmptyState icon={<Calendar className="w-12 h-12" />} title="No hay citas" subtitle="Las citas se crean desde presupuestos aceptados" />
      ) : (
        <div className="space-y-2">
          {citas.map((cita) => (
            <Card key={cita.id} className="p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{clienteNombre(cita.cliente_id)}</span>
                    <Badge 
                      text={cita.estado} 
                      color={estadoColor(cita.estado)} 
                      onClick={cita.estado === 'cancelada' ? () => cambiarEstado(cita.id, 'pendiente') : undefined}
                    />
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(cita.fecha).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </span>
                    {cita.hora && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{cita.hora}</span>}
                  </div>
                  {vehiculoInfo(cita.vehiculo_id) && (
                    <p className="flex items-center gap-1 text-xs text-slate-600 mt-1">
                      <Car className="w-3 h-3" />{vehiculoInfo(cita.vehiculo_id)}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <MetisRowButton
                    tipo="cita"
                    id={cita.id}
                    matricula={cita.vehiculo_id ? vehiculos[cita.vehiculo_id]?.matricula : undefined}
                    cliente_nombre={clienteNombre(cita.cliente_id)}
                    data={cita}
                  />
                  <button
                    onClick={() => toggleFotos(cita.id)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      fotosExpandida === cita.id 
                        ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' 
                        : 'bg-bg-700 hover:bg-bg-600 text-cyan-400 border-bg-600'
                    }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5" /> 
                    {fotosExpandida === cita.id ? 'OCULTAR' : 'FOTOS'}
                    {(cita.fotos ?? []).length > 0 && <span className="ml-1 px-1.5 bg-cyan-500/20 rounded-full">{(cita.fotos ?? []).length}</span>}
                  </button>

                  {cita.vehiculo_id && vehiculos[cita.vehiculo_id] && (
                    <button
                      onClick={() => setViewerMatricula(vehiculos[cita.vehiculo_id!]!.matricula)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-bg-700 hover:bg-bg-600 text-slate-400 hover:text-cyan-400 text-xs font-semibold border border-bg-600"
                      title="Fotos del vehículo"
                    >
                      <Car className="w-3.5 h-3.5" /> FOTOS VEHÍCULO
                    </button>
                  )}

                  {cita.estado === 'pendiente' && (
                    <Button size="sm" onClick={() => cambiarEstado(cita.id, 'confirmada')}>Confirmar llegada</Button>
                  )}
                  {cita.estado === 'confirmada' && (
                    <Button size="sm" onClick={() => navigate('/reparaciones', { state: { citaId: cita.id, clienteId: cita.cliente_id, vehiculoId: cita.vehiculo_id } })}>
                      <span className="flex items-center gap-1">Enviar a taller <ArrowRight className="w-3.5 h-3.5" /></span>
                    </Button>
                  )}
                  {cita.estado !== 'completada' && cita.estado !== 'cancelada' && (
                    <Button size="sm" variant="danger" onClick={() => cambiarEstado(cita.id, 'cancelada')}>Cancelar</Button>
                  )}
                  <button
                    onClick={() => eliminarCita(cita.id)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold border border-red-500/20"
                    title="Eliminar cita"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              
              {/* Inline photos block replaced by GlobalImageViewer */}
            </Card>
          ))}
        </div>
      )}

      {/* Modal: proponer fecha y hora */}
      {showFechaModal && (
        <div className="fixed inset-0 bg-bg-950/80 z-50 flex items-center justify-center p-4" onClick={() => setShowFechaModal(false)}>
          <Card className="w-full max-w-md p-6">
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
              <div className="flex gap-3 mt-5">
                <Button onClick={() => crearCitaDesdePresupuesto(fechaPropuesta, horaPropuesta)} className="flex-1">Confirmar cita</Button>
                <Button variant="secondary" onClick={() => setShowFechaModal(false)}>Cancelar</Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      <ImageViewer open={!!viewerMatricula} matricula={viewerMatricula ?? ''} onClose={() => setViewerMatricula(null)} />

      <GlobalImageViewer
        isOpen={!!fotosExpandida}
        onClose={() => setFotosExpandida(null)}
        images={citas.find(c => c.id === fotosExpandida)?.fotos ?? []}
        onAddImage={async (dataUrl) => {
          if (!fotosExpandida) return;
          const c = citas.find(x => x.id === fotosExpandida);
          if (c) {
            const nuevasFotos = [...(c.fotos ?? []), dataUrl];
            await supabase.from('citas').update({ fotos: nuevasFotos }).eq('id', fotosExpandida);
            await loadCitas();
          }
        }}
        onDeleteImage={async (index) => {
          if (fotosExpandida) await handleDeleteCitaFoto(fotosExpandida, index)
        }}
        title="Fotos de la Cita"
      />
    </div>
  )
}
