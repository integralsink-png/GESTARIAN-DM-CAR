import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Cliente, Vehiculo, Reparacion, Presupuesto, Factura, NotaVehiculo, Cita } from '../lib/types'
import { Car, FileText, Receipt, Image as ImageIcon, StickyNote, Download, CheckCircle, Clock, AlertCircle, Loader2, Calendar } from 'lucide-react'

type EstadoReparacion = 'pendiente' | 'en_proceso' | 'completada' | 'entregado'

const ESTADO_INFO: Record<EstadoReparacion, { label: string; color: string; icon: typeof Clock }> = {
  pendiente: { label: 'Pendiente', color: 'text-amber-400', icon: Clock },
  en_proceso: { label: 'En proceso', color: 'text-cyan-400', icon: Loader2 },
  completada: { label: 'Completada', color: 'text-green-400', icon: CheckCircle },
  entregado: { label: 'Entregado', color: 'text-green-400', icon: CheckCircle },
}

export function VehiculoAdminPage() {
  const { id } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [vehiculo, setVehiculo] = useState<Vehiculo | null>(null)
  const [reparaciones, setReparaciones] = useState<Reparacion[]>([])
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([])
  const [facturas, setFacturas] = useState<Factura[]>([])
  const [notas, setNotas] = useState<NotaVehiculo[]>([])
  const [citas, setCitas] = useState<Cita[]>([])
  const [tab, setTab] = useState<'seguimiento' | 'fotos' | 'presupuestos' | 'facturas' | 'notas' | 'citas'>('seguimiento')
  
  const [bookingDate, setBookingDate] = useState('')
  const [bookingTime, setBookingTime] = useState('')
  const [bookingNotes, setBookingNotes] = useState('')
  const [bookingLoading, setBookingLoading] = useState(false)

  useEffect(() => {
    if (!id) return
    loadData()
  }, [id])

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const { data: veh } = await supabase.from('vehiculos').select('*').eq('id', id).maybeSingle()

      if (!veh) {
        setError('No se encontraron los datos del vehículo.')
        setLoading(false)
        return
      }

      setVehiculo(veh)

      const { data: cli } = await supabase.from('clientes').select('*').eq('id', veh.cliente_id).maybeSingle()
      setCliente(cli)

      const [reps, pres, facs, nts, cts] = await Promise.all([
        supabase.from('reparaciones').select('*').eq('vehiculo_id', veh.id).order('created_at', { ascending: false }),
        supabase.from('presupuestos').select('*').eq('vehiculo_id', veh.id).order('created_at', { ascending: false }),
        supabase.from('facturas').select('*').eq('cliente_id', cli.id).order('created_at', { ascending: false }),
        supabase.from('notas_vehiculo').select('*').eq('vehiculo_id', veh.id).eq('visible_cliente', true).order('created_at', { ascending: false }),
        supabase.from('citas').select('*').eq('cliente_id', cli.id).order('fecha', { ascending: false }),
      ])

      setReparaciones(reps.data ?? [])
      setPresupuestos(pres.data ?? [])
      setFacturas(facs.data ?? [])
      setNotas(nts.data ?? [])
      setCitas(cts.data ?? [])
    } catch {
      setError('Error al cargar los datos. Inténtalo más tarde.')
    } finally {
      setLoading(false)
    }
  }

  async function handleBookAppointment(e: React.FormEvent) {
    e.preventDefault()
    if (!cliente || !vehiculo || !bookingDate) return
    setBookingLoading(true)
    try {
      const newCita = {
        id: crypto.randomUUID(),
        cliente_id: cliente.id,
        vehiculo_id: vehiculo.id,
        fecha: bookingDate,
        hora: bookingTime || null,
        estado: 'pendiente',
        observaciones: bookingNotes,
        created_at: new Date().toISOString()
      }
      const { error } = await supabase.from('citas').insert([newCita])
      if (error) throw error
      alert('Cita solicitada correctamente. Te confirmaremos lo antes posible.')
      setCitas([newCita as Cita, ...citas])
      setBookingDate('')
      setBookingTime('')
      setBookingNotes('')
    } catch (err: any) {
      alert('Error al solicitar cita: ' + err.message)
    } finally {
      setBookingLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg-950">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-3" />
          <p className="text-white/50 text-sm">Cargando información de tu vehículo...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg-950 p-4">
        <div className="text-center max-w-sm">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-red-400 text-sm mb-4">{error}</p>
          <p className="text-white/40 text-xs">Si el problema persiste, contacta con DM CAR.</p>
        </div>
      </div>
    )
  }

  const tabs = [
    { key: 'seguimiento' as const, label: 'Seguimiento', icon: Car },
    { key: 'fotos' as const, label: 'Fotos', icon: ImageIcon },
    { key: 'presupuestos' as const, label: 'Presupuestos', icon: FileText },
    { key: 'facturas' as const, label: 'Facturas', icon: Receipt },
    { key: 'notas' as const, label: 'Notas', icon: StickyNote },
    { key: 'citas' as const, label: 'Citas', icon: Calendar },
  ]

  return (
    <div className="min-h-screen bg-bg-950">
      {/* Header */}
      <div className="bg-bg-900/80 backdrop-blur-md border-b border-bg-700 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto p-4">
          <div className="flex items-center gap-3 mb-2">
            <img src="/images/logos/logo.jpg" alt="DM CAR" className="w-10 h-10 rounded-lg object-cover" />
            <div>
              <h1 className="text-lg font-bold text-white">DM CAR</h1>
              <p className="text-xs text-white/40">Portal del cliente</p>
            </div>
          </div>
          {vehiculo && (
            <div className="flex items-center gap-2 text-sm">
              <Car className="w-4 h-4 text-cyan-400/60" />
              <span className="text-white font-medium">{vehiculo.marca} {vehiculo.modelo}</span>
              <span className="text-white/40">·</span>
              <span className="text-cyan-400 font-mono">{vehiculo.matricula}</span>
              {vehiculo.anio && <span className="text-white/40">· {vehiculo.anio}</span>}
            </div>
          )}
          {cliente && (
            <p className="text-xs text-white/40 mt-1">Hola, {cliente.nombre}</p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-3xl mx-auto px-4 pt-4">
        <div className="flex gap-1 overflow-x-auto pb-2 border-b border-bg-700">
          {tabs.map((t) => {
            const Icon = t.icon
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  tab === t.key
                    ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                    : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto p-4 pb-12">
        {tab === 'seguimiento' && (
          <div className="space-y-3">
            {reparaciones.length === 0 ? (
              <div className="text-center py-12">
                <Car className="w-10 h-10 text-white/20 mx-auto mb-3" />
                <p className="text-white/50 text-sm">No hay reparaciones registradas para tu vehículo.</p>
              </div>
            ) : (
              reparaciones.map((r) => {
                const estado = (r.estado as EstadoReparacion) || 'pendiente'
                const info = ESTADO_INFO[estado] ?? ESTADO_INFO.pendiente
                const EstadoIcon = info.icon
                return (
                  <div key={r.id} className="bg-bg-900/80 border border-bg-700 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <EstadoIcon className={`w-4 h-4 ${info.color} ${estado === 'en_proceso' ? 'animate-spin' : ''}`} />
                          <span className={`text-sm font-semibold ${info.color}`}>{info.label}</span>
                        </div>
                        <p className="text-xs text-white/40 mt-1">
                          {new Date(r.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    {r.descripcion && (
                      <p className="text-sm text-white/70 mt-2">{r.descripcion}</p>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}

        {tab === 'fotos' && (
          <div className="space-y-6">
            {reparaciones.length === 0 ? (
              <div className="text-center py-12">
                <ImageIcon className="w-10 h-10 text-white/20 mx-auto mb-3" />
                <p className="text-white/50 text-sm">No hay fotos disponibles.</p>
              </div>
            ) : (
              reparaciones.map((r) => {
                const fotos = (r.fotos as string[]) || []
                if (fotos.length === 0) return null
                return (
                  <div key={r.id}>
                    <p className="text-xs text-white/40 uppercase font-semibold mb-2">
                      {r.descripcion || 'Reparación'} · {new Date(r.created_at).toLocaleDateString('es-ES')}
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {fotos.map((entry, i) => {
                        const url = entry.includes(':') ? entry.substring(entry.indexOf(':') + 1) : entry
                        return (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block group">
                            <div className="aspect-square rounded-lg overflow-hidden border border-bg-700 group-hover:border-cyan-500/40 transition-colors">
                              <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                            </div>
                          </a>
                        )
                      })}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {tab === 'presupuestos' && (
          <div className="space-y-3">
            {presupuestos.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-10 h-10 text-white/20 mx-auto mb-3" />
                <p className="text-white/50 text-sm">No hay presupuestos disponibles.</p>
              </div>
            ) : (
              presupuestos.map((p) => (
                <div key={p.id} className="bg-bg-900/80 border border-bg-700 rounded-xl p-4">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div>
                      <span className="font-medium text-white text-sm">{p.numero}</span>
                      <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                        p.estado === 'aceptado' ? 'bg-green-500/15 text-green-400' :
                        p.estado === 'rechazado' ? 'bg-red-500/15 text-red-400' :
                        'bg-amber-500/15 text-amber-400'
                      }`}>
                        {p.estado}
                      </span>
                    </div>
                    <span className="text-lg font-bold text-white">{p.total.toFixed(2)} €</span>
                  </div>
                  {(p.conceptos ?? []).length > 0 && (
                    <div className="text-xs text-white/50 space-y-0.5 mt-2 mb-3">
                      {(p.conceptos ?? []).slice(0, 5).map((c, i) => (
                        <div key={i} className="flex justify-between">
                          <span>{c.descripcion}</span>
                          <span>{(c.cantidad * c.precio).toFixed(2)} €</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => window.print()}
                    className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" /> Descargar / Imprimir
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'facturas' && (
          <div className="space-y-3">
            {facturas.length === 0 ? (
              <div className="text-center py-12">
                <Receipt className="w-10 h-10 text-white/20 mx-auto mb-3" />
                <p className="text-white/50 text-sm">No hay facturas disponibles.</p>
              </div>
            ) : (
              facturas.map((f) => (
                <div key={f.id} className="bg-bg-900/80 border border-bg-700 rounded-xl p-4">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div>
                      <span className="font-medium text-white text-sm">{f.numero}</span>
                      <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                        f.estado_cobro === 'pagada' ? 'bg-green-500/15 text-green-400' :
                        f.estado_cobro === 'parcial' ? 'bg-amber-500/15 text-amber-400' :
                        'bg-red-500/15 text-red-400'
                      }`}>
                        {f.estado_cobro}
                      </span>
                    </div>
                    <span className="text-lg font-bold text-white">{f.total.toFixed(2)} €</span>
                  </div>
                  <p className="text-xs text-white/40">{new Date(f.fecha).toLocaleDateString('es-ES')}</p>
                  <button
                    onClick={() => window.print()}
                    className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 mt-2"
                  >
                    <Download className="w-3 h-3" /> Descargar / Imprimir
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'notas' && (
          <div className="space-y-3">
            {notas.length === 0 ? (
              <div className="text-center py-12">
                <StickyNote className="w-10 h-10 text-white/20 mx-auto mb-3" />
                <p className="text-white/50 text-sm">No hay notas del taller para tu vehículo.</p>
              </div>
            ) : (
              notas.map((n) => (
                <div key={n.id} className="bg-bg-900/80 border border-bg-700 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <StickyNote className="w-4 h-4 text-amber-400/60" />
                    <span className="text-xs text-white/40">
                      {n.autor} · {new Date(n.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <p className="text-sm text-white/80">{n.texto}</p>
                </div>
              ))
            )}
          </div>
        )}
        {tab === 'citas' && (
          <div className="space-y-4 pb-8">
            <div className="bg-bg-900/80 border border-bg-700 rounded-xl p-4">
              <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-cyan-400" /> Solicitar Nueva Cita
              </h3>
              <form onSubmit={handleBookAppointment} className="space-y-3">
                <div>
                  <label className="block text-xs text-white/60 mb-1">Fecha deseada</label>
                  <input
                    type="date"
                    required
                    value={bookingDate}
                    onChange={e => setBookingDate(e.target.value)}
                    className="w-full bg-bg-800 border border-bg-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/60 mb-1">Hora preferida (Opcional)</label>
                  <input
                    type="time"
                    value={bookingTime}
                    onChange={e => setBookingTime(e.target.value)}
                    className="w-full bg-bg-800 border border-bg-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/60 mb-1">Motivo / Observaciones</label>
                  <textarea
                    rows={2}
                    value={bookingNotes}
                    onChange={e => setBookingNotes(e.target.value)}
                    placeholder="Ej. Revisión anual, cambio de aceite..."
                    className="w-full bg-bg-800 border border-bg-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={bookingLoading}
                  className="w-full bg-cyan-500 hover:bg-cyan-600 text-bg-950 font-medium py-2 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {bookingLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                  Solicitar Cita
                </button>
              </form>
            </div>

            <div className="space-y-3 mt-6">
              <h3 className="text-sm font-medium text-white/80">Mis Citas</h3>
              {citas.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-white/40 text-xs">No tienes citas programadas.</p>
                </div>
              ) : (
                citas.map((cita) => (
                  <div key={cita.id} className="bg-bg-900/80 border border-bg-700 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white font-medium">
                        {new Date(cita.fecha).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </p>
                      <p className="text-xs text-white/50 mt-0.5">
                        {cita.hora ? `Hora: ${cita.hora}` : 'Hora a confirmar'}
                      </p>
                      {cita.observaciones && <p className="text-xs text-white/70 mt-1 italic">{cita.observaciones}</p>}
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      cita.estado === 'confirmada' ? 'bg-green-500/15 text-green-400' :
                      cita.estado === 'completada' ? 'bg-gray-500/15 text-gray-400' :
                      cita.estado === 'cancelada' ? 'bg-red-500/15 text-red-400' :
                      'bg-amber-500/15 text-amber-400'
                    }`}>
                      {cita.estado}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
