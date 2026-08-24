import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Car, FileText, Receipt, Image as ImageIcon, StickyNote, Download, CheckCircle, Clock, AlertCircle, Loader2, Calendar, Mail, Send, User, Save } from 'lucide-react'
import { enviarInvitacion } from '../services/notificationService'
import { useToast } from '../lib/ToastContext'

type EstadoReparacion = 'pendiente' | 'en_proceso' | 'completada' | 'entregado'

const ESTADO_INFO: Record<EstadoReparacion, { label: string; color: string; icon: typeof Clock }> = {
  pendiente: { label: 'Pendiente', color: 'text-amber-400', icon: Clock },
  en_proceso: { label: 'En proceso', color: 'text-cyan-400', icon: Loader2 },
  completada: { label: 'Completada', color: 'text-green-400', icon: CheckCircle },
  entregado: { label: 'Entregado', color: 'text-green-400', icon: CheckCircle },
}

export function ClienteAdminPage() {
  const { id } = useParams<{ id: string }>()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [vehiculo, setVehiculo] = useState<Vehiculo | null>(null)
  const [reparaciones, setReparaciones] = useState<Reparacion[]>([])
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([])
  const [facturas, setFacturas] = useState<Factura[]>([])
  const [notas, setNotas] = useState<NotaVehiculo[]>([])
  const [citas, setCitas] = useState<Cita[]>([])
  const [tab, setTab] = useState<'datos' | 'seguimiento' | 'fotos' | 'presupuestos' | 'facturas' | 'notas' | 'citas'>('datos')
  
  const [bookingDate, setBookingDate] = useState('')
  const [bookingTime, setBookingTime] = useState('')
  const [bookingNotes, setBookingNotes] = useState('')
  const [bookingLoading, setBookingLoading] = useState(false)

  const [sendingInvite, setSendingInvite] = useState(false)
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null)

  // Estados de edición del cliente y detección de cambios para auto-invitación
  const [initialEmail, setInitialEmail] = useState('')
  const [initialTelefono, setInitialTelefono] = useState('')
  const [editNombre, setEditNombre] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editTelefono, setEditTelefono] = useState('')
  const [editDni, setEditDni] = useState('')
  const [editDireccion, setEditDireccion] = useState('')
  const [savingCliente, setSavingCliente] = useState(false)
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null)

  async function handleSendEmailInvitation() {
    if (!cliente) return
    setSendingInvite(true)
    setInviteSuccess(null)
    try {
      const res = await enviarInvitacion(cliente.id, null, ['email'])
      if (res.success) {
        const msg = 'Invitación enviada por email con éxito'
        setInviteSuccess('¡Invitación enviada por email con éxito!')
        showToast(msg, 'success')
        setTimeout(() => setInviteSuccess(null), 4000)
      } else {
        showToast(res.error || 'Error al enviar invitación.', 'error')
      }
    } catch (e: any) {
      showToast('Error al enviar invitación: ' + e?.message, 'error')
    } finally {
      setSendingInvite(false)
    }
  }

  async function handleSaveClienteData(e: React.FormEvent) {
    e.preventDefault()
    if (!cliente) return
    setSavingCliente(true)
    setSaveSuccessMsg(null)
    try {
      const { error: updateErr } = await supabase
        .from('clientes')
        .update({
          nombre: editNombre,
          email: editEmail || null,
          telefono: editTelefono || null,
          dni: editDni || null,
          direccion: editDireccion || null
        })
        .eq('id', cliente.id)

      if (updateErr) throw updateErr

      // Verificar si hubo cambios en email o teléfono
      const emailCambio = editEmail.trim().toLowerCase() !== initialEmail.trim().toLowerCase() && editEmail.trim() !== ''
      const telefonoCambio = editTelefono.trim() !== initialTelefono.trim() && editTelefono.trim() !== ''

      if (emailCambio || telefonoCambio) {
        console.log(`[Auto-Invitación] Cambios detectados en cliente (Email: ${emailCambio}, Tel: ${telefonoCambio}). Disparando invitación...`)
        const inviteRes = await enviarInvitacion(cliente.id, null, ['email'])
        const msg = 'Datos actualizados e invitación enviada'
        setSaveSuccessMsg(msg)
        showToast(msg, 'success')
      } else {
        const msg = 'Datos del cliente actualizados'
        setSaveSuccessMsg(msg)
        showToast(msg, 'success')
      }

      // Actualizar valores iniciales y estado cliente
      setInitialEmail(editEmail)
      setInitialTelefono(editTelefono)
      setCliente({
        ...cliente,
        nombre: editNombre,
        email: editEmail,
        telefono: editTelefono,
        dni: editDni,
        direccion: editDireccion
      })

      setTimeout(() => setSaveSuccessMsg(null), 4000)
    } catch (err: any) {
      showToast('Error al guardar datos: ' + err.message, 'error')
    } finally {
      setSavingCliente(false)
    }
  }

  useEffect(() => {
    if (!id) return
    loadData()
  }, [id])

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const { data: cli } = await supabase.from('clientes').select('*').eq('id', id).maybeSingle()

      if (!cli) {
        setError('No se encontraron los datos del cliente.')
        setLoading(false)
        return
      }

      setCliente(cli)
      setEditNombre(cli.nombre || '')
      setEditEmail(cli.email || '')
      setEditTelefono(cli.telefono || '')
      setEditDni(cli.dni || '')
      setEditDireccion(cli.direccion || '')
      setInitialEmail(cli.email || '')
      setInitialTelefono(cli.telefono || '')

      // Get first vehicle for now, or you could list them all
      const { data: vehs } = await supabase.from('vehiculos').select('*').eq('cliente_id', cli.id)
      const veh = vehs && vehs.length > 0 ? vehs[0] : null
      setVehiculo(veh)

      const [reps, pres, facs, nts, cts] = await Promise.all([
        veh ? supabase.from('reparaciones').select('*').eq('vehiculo_id', veh.id).order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
        veh ? supabase.from('presupuestos').select('*').eq('vehiculo_id', veh.id).order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
        supabase.from('facturas').select('*').eq('cliente_id', cli.id).order('created_at', { ascending: false }),
        veh ? supabase.from('notas_vehiculo').select('*').eq('vehiculo_id', veh.id).eq('visible_cliente', true).order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
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
    { key: 'datos' as const, label: 'Datos Cliente', icon: User },
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
            <div className="flex flex-wrap items-center justify-between gap-3 mt-3 pt-3 border-t border-white/10">
              <div>
                <p className="text-xs text-white/70">Hola, <span className="text-white font-bold">{cliente.nombre}</span> ({cliente.email || 'Sin email'})</p>
                {inviteSuccess && (
                  <p className="text-[11px] text-emerald-400 font-semibold mt-0.5">{inviteSuccess}</p>
                )}
              </div>

              <button
                type="button"
                onClick={handleSendEmailInvitation}
                disabled={sendingInvite || !cliente.email}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:hover:bg-cyan-600"
              >
                {sendingInvite ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {sendingInvite ? 'Enviando...' : 'Enviar invitación por email'}
              </button>
            </div>
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
        {tab === 'datos' && (
          <div className="bg-bg-900/80 border border-bg-700 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-bg-700 pb-3">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Ficha de Datos del Cliente</h3>
              </div>
              <span className="text-[11px] text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-full border border-cyan-500/20">
                Auto-invitación activa al modificar email o teléfono
              </span>
            </div>

            {saveSuccessMsg && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs font-bold text-emerald-400">
                ✓ {saveSuccessMsg}
              </div>
            )}

            <form onSubmit={handleSaveClienteData} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-white/60 mb-1">Nombre Completo</label>
                  <input
                    type="text"
                    required
                    value={editNombre}
                    onChange={(e) => setEditNombre(e.target.value)}
                    className="w-full bg-bg-800 border border-bg-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-white/60 mb-1">DNI / NIF</label>
                  <input
                    type="text"
                    value={editDni}
                    onChange={(e) => setEditDni(e.target.value)}
                    placeholder="12345678X"
                    className="w-full bg-bg-800 border border-bg-700 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-white/60 mb-1">Correo Electrónico (Email)</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="cliente@ejemplo.com"
                    className="w-full bg-bg-800 border border-bg-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-cyan-300 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-white/60 mb-1">Teléfono Móvil (WhatsApp)</label>
                  <input
                    type="tel"
                    value={editTelefono}
                    onChange={(e) => setEditTelefono(e.target.value)}
                    placeholder="600123456"
                    className="w-full bg-bg-800 border border-bg-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-emerald-300 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-white/60 mb-1">Dirección</label>
                <input
                  type="text"
                  value={editDireccion}
                  onChange={(e) => setEditDireccion(e.target.value)}
                  placeholder="Calle / Avenida..."
                  className="w-full bg-bg-800 border border-bg-700 rounded-xl px-3.5 py-2.5 text-xs font-medium text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end pt-2">
                {(() => {
                  const huboCambioContacto = (editEmail.trim().toLowerCase() !== initialEmail.trim().toLowerCase() && editEmail.trim() !== '') ||
                                             (editTelefono.trim() !== initialTelefono.trim() && editTelefono.trim() !== '')
                  return (
                    <button
                      type="submit"
                      disabled={savingCliente}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50 ${
                        huboCambioContacto
                          ? 'bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white shadow-cyan-500/20 animate-pulse'
                          : 'bg-cyan-600 hover:bg-cyan-500 text-white'
                      }`}
                    >
                      {savingCliente ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      {savingCliente
                        ? 'Guardando...'
                        : huboCambioContacto
                        ? 'Guardar y enviar nueva invitación'
                        : 'Guardar cambios'}
                    </button>
                  )
                })()}
              </div>
            </form>
          </div>
        )}

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
