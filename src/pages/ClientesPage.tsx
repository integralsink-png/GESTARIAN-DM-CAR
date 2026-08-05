import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Cliente, Vehiculo, Presupuesto, Factura, NotaVehiculo } from '../lib/types'
import { PageHeader, Card, Button, Input, Badge, EmptyState, MetisRowButton } from '../components/UI'
import {
  Plus, Search, FileText, Wrench, Eye, X, Edit3, Save,
  Car, Phone, Mail, MapPin, User, Trash2, Send, Mic, MicOff,
  History, Calendar, Receipt, ClipboardList, StickyNote, Eye as EyeIcon, EyeOff, ImageIcon,
  ArrowLeft,
} from 'lucide-react'
import { OcrScanner } from '../components/OcrScanner'
import { parseVoiceToCliente } from '../lib/useVoice'
import { GlobalImageViewer } from '../components/GlobalImageViewer'

export function ClientesPage() {
  const navigate = useNavigate()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [vehiculos, setVehiculos] = useState<Record<string, Vehiculo[]>>({})
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null)

  const [form, setForm] = useState({ nombre: '', dni: '', telefono: '', email: '', direccion: '' })
  const [vehForm, setVehForm] = useState({ matricula: '', marca: '', modelo: '', anio: '', vin: '' })
  const [listening, setListening] = useState(false)
  const [voiceSupported, setVoiceSupported] = useState(true)
  const recRef = useRef<any>(null)
  const finalRef = useRef('')
  const [interim, setInterim] = useState('')

  useEffect(() => {
    loadClientes()
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { setVoiceSupported(false); return }
    const rec = new SR()
    rec.lang = 'es-ES'
    rec.continuous = true
    rec.interimResults = true
    rec.onresult = (e: any) => {
      let interimText = ''
      let finalText = finalRef.current
      for (let i = 0; i < e.results.length; i++) {
        const res = e.results[i]
        if (res.isFinal) finalText += res[0].transcript
        else interimText += res[0].transcript
      }
      finalRef.current = finalText
      setInterim(interimText)
    }
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)
    recRef.current = rec
    return () => { rec.onresult = null; rec.onend = null; rec.onerror = null }
  }, [])

  const toggleVoice = useCallback(() => {
    if (!recRef.current) return
    if (listening) {
      try { recRef.current.stop() } catch {}
      setListening(false)
      const parsed = parseVoiceToCliente(finalRef.current)
      setForm((prev) => ({
        nombre: parsed.nombre || prev.nombre,
        dni: parsed.dni || prev.dni,
        telefono: parsed.telefono || prev.telefono,
        email: parsed.email || prev.email,
        direccion: parsed.direccion || prev.direccion,
      }))
      finalRef.current = ''
      setInterim('')
    } else {
      finalRef.current = ''
      setInterim('')
      setListening(true)
      try { recRef.current.start() } catch {}
    }
  }, [listening])

  async function loadClientes() {
    setLoading(true)
    const { data } = await supabase.from('clientes').select('*').order('created_at', { ascending: false })
    setClientes(data ?? [])
    if (data && data.length > 0) {
      const vehiculoMap: Record<string, Vehiculo[]> = {}
      for (const c of data) {
        const { data: vehs } = await supabase.from('vehiculos').select('*').eq('cliente_id', c.id)
        vehiculoMap[c.id] = vehs ?? []
      }
      setVehiculos(vehiculoMap)
    }
    setLoading(false)
  }

  async function handleSave() {
    if (!form.nombre.trim()) return
    const { data, error } = await supabase.from('clientes').insert({
      nombre: form.nombre,
      dni: form.dni || null,
      telefono: form.telefono || null,
      email: form.email || null,
      direccion: form.direccion || null,
    }).select().single()
    if (error || !data) { loadClientes(); return }
    if (vehForm.matricula.trim()) {
      await supabase.from('vehiculos').insert({
        cliente_id: data.id,
        matricula: vehForm.matricula.toUpperCase(),
        marca: vehForm.marca || null,
        modelo: vehForm.modelo || null,
        anio: vehForm.anio ? parseInt(vehForm.anio) : null,
        vin: vehForm.vin || null,
      })
    }
    setForm({ nombre: '', dni: '', telefono: '', email: '', direccion: '' })
    setVehForm({ matricula: '', marca: '', modelo: '', anio: '', vin: '' })
    setShowForm(false)
    loadClientes()
  }

  async function addVehiculo(clienteId: string, veh: Omit<Vehiculo, 'id' | 'cliente_id' | 'created_at'>) {
    await supabase.from('vehiculos').insert({ ...veh, cliente_id: clienteId })
    const { data: vehs } = await supabase.from('vehiculos').select('*').eq('cliente_id', clienteId)
    setVehiculos({ ...vehiculos, [clienteId]: vehs ?? [] })
  }

  async function updateVehiculo(id: string, clienteId: string, veh: Partial<Vehiculo>) {
    await supabase.from('vehiculos').update(veh).eq('id', id)
    const { data: vehs } = await supabase.from('vehiculos').select('*').eq('cliente_id', clienteId)
    setVehiculos({ ...vehiculos, [clienteId]: vehs ?? [] })
  }

  async function deleteVehiculo(id: string, clienteId: string) {
    await supabase.from('vehiculos').delete().eq('id', id)
    const { data: vehs } = await supabase.from('vehiculos').select('*').eq('cliente_id', clienteId)
    setVehiculos({ ...vehiculos, [clienteId]: vehs ?? [] })
  }

  async function updateCliente(id: string, data: Partial<Cliente>) {
    await supabase.from('clientes').update(data).eq('id', id)
    setClientes((prev) => prev.map((c) => (c.id === id ? { ...c, ...data } : c)))
    setSelectedCliente((prev) => (prev ? { ...prev, ...data } : prev))
  }

  const filtered = clientes.filter((c) => {
    const s = search.toLowerCase()
    if (!s) return true
    if (c.nombre.toLowerCase().includes(s)) return true
    if (c.dni?.toLowerCase().includes(s)) return true
    if (c.telefono?.includes(s)) return true
    // búsqueda por matrícula de cualquier vehículo del cliente
    const vehs = vehiculos[c.id] ?? []
    if (vehs.some(v => v.matricula.toLowerCase().includes(s))) return true
    return false
  })

  return (
    <div>
      <PageHeader title="Clientes" subtitle="Gestión de clientes y vehículos del taller">
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => navigate('/')}>
            <span className="flex items-center gap-2"><ArrowLeft className="w-4 h-4" /> VOLVER</span>
          </Button>
          <Button onClick={() => setShowForm(true)}>
            <span className="flex items-center gap-2"><Plus className="w-4 h-4" /> Nuevo cliente</span>
          </Button>
        </div>
      </PageHeader>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, DNI, teléfono o matrícula..."
          className="w-full bg-bg-800 border border-bg-600 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none transition-colors"
        />
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-500">Cargando...</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<User className="w-12 h-12" />}
          title="No hay clientes"
          subtitle="Añade tu primer cliente para empezar"
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((cliente) => (
            <Card key={cliente.id} className="p-4 hover:border-bg-500 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setSelectedCliente(cliente)}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-white">{cliente.nombre}</h3>
                    {vehiculos[cliente.id]?.length > 0 && (
                      <Badge text={`${vehiculos[cliente.id].length} vehículo(s)`} color="blue" />
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-500">
                    {cliente.telefono && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{cliente.telefono}</span>}
                    {cliente.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{cliente.email}</span>}
                    {cliente.direccion && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{cliente.direccion}</span>}
                  </div>
                  {vehiculos[cliente.id]?.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {vehiculos[cliente.id].map((v) => (
                        <span key={v.id} className="inline-flex items-center gap-1 text-xs bg-bg-700 px-2 py-1 rounded-md text-slate-400">
                          <Car className="w-3 h-3" />
                          {v.matricula} {v.marca && `· ${v.marca} ${v.modelo ?? ''}`}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-1.5 shrink-0">
                  <Button size="sm" variant="ghost" onClick={() => setSelectedCliente(cliente)}>
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => navigate('/presupuestos', { state: { clienteId: cliente.id } })}
                  >
                    <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> Presupuesto</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => navigate('/reparaciones', { state: { clienteId: cliente.id } })}
                  >
                    <span className="flex items-center gap-1"><Wrench className="w-3.5 h-3.5" /> Reparaciones</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setSelectedCliente(cliente)
                      // Optionally we could add logic to scroll to history, but opening the modal is enough
                    }}
                  >
                    <span className="flex items-center gap-1"><History className="w-3.5 h-3.5" /> Historial</span>
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-bg-950/80 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <Card className="w-full max-w-md p-6 max-h-[85vh] overflow-y-auto">
            <div onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Nuevo cliente</h2>
                <div className="flex items-center gap-2">
                  {voiceSupported && (
                    <button
                      onClick={toggleVoice}
                      className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${
                        listening ? 'bg-red-500/20 text-red-400 animate-pulse' : 'text-cyan-400 hover:bg-cyan-500/10'
                      }`}
                      aria-label="Dictar datos del cliente por voz"
                      title="Dictar datos del cliente por voz"
                    >
                      {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>
                  )}
                  <button onClick={() => setShowForm(false)} className="text-slate-500 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {listening && (
                <div className="mb-3 p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
                    <span className="text-xs text-cyan-400 font-medium">Escuchando... Pulsa el micrófono para terminar</span>
                  </div>
                  {interim && <p className="text-xs text-white/40 italic">{interim}</p>}
                  <p className="text-xs text-white/60 mt-1">
                    Di: nombre, DNI con letra, teléfono, email y dirección.
                    Ej: "Pedro Ruiz González, DNI 74373332 letra P, teléfono 600123456, calle Alfredo Kraus número 12, Málaga"
                  </p>
                </div>
              )}
              <div className="space-y-3">
                <Input label="Nombre *" value={form.nombre} onChange={(v) => setForm({ ...form, nombre: v })} placeholder="Nombre completo" />
                <Input label="DNI / NIF" value={form.dni} onChange={(v) => setForm({ ...form, dni: v })} placeholder="12345678A" />
                <Input label="Teléfono" value={form.telefono} onChange={(v) => setForm({ ...form, telefono: v })} placeholder="600 000 000" />
                <Input label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} type="email" placeholder="cliente@email.com" />
                <Input label="Dirección" value={form.direccion} onChange={(v) => setForm({ ...form, direccion: v })} placeholder="Calle, número, ciudad" />
              </div>

              <div className="pt-3 mt-3 border-t border-bg-600">
                <p className="text-xs text-cyan-400 font-medium mb-3 flex items-center gap-1.5"><Car className="w-3.5 h-3.5" /> Datos del vehículo</p>
                <div className="space-y-3">
                  <Input 
                    label="Matrícula" 
                    value={vehForm.matricula} 
                    onChange={(v) => setVehForm({ ...vehForm, matricula: v })} 
                    placeholder="1234 ABC" 
                    addonRight={<OcrScanner onScan={(t) => setVehForm({ ...vehForm, matricula: t })} />}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input label="Marca" value={vehForm.marca} onChange={(v) => setVehForm({ ...vehForm, marca: v })} placeholder="VW" />
                    <Input label="Modelo" value={vehForm.modelo} onChange={(v) => setVehForm({ ...vehForm, modelo: v })} placeholder="Golf" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input label="Año" value={vehForm.anio} onChange={(v) => setVehForm({ ...vehForm, anio: v })} placeholder="2020" />
                    <Input label="VIN" value={vehForm.vin} onChange={(v) => setVehForm({ ...vehForm, vin: v })} placeholder="Opcional" />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <Button onClick={handleSave} className="flex-1">Guardar</Button>
                <Button variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {selectedCliente && (
        <ClienteDetalle
          cliente={selectedCliente}
          vehiculos={vehiculos[selectedCliente.id] ?? []}
          onClose={() => setSelectedCliente(null)}
          onAddVehiculo={(veh) => addVehiculo(selectedCliente.id, veh)}
          onUpdateVehiculo={(id, veh) => updateVehiculo(id, selectedCliente.id, veh)}
          onDeleteVehiculo={(id) => deleteVehiculo(id, selectedCliente.id)}
          onUpdateCliente={(data) => updateCliente(selectedCliente.id, data)}
          onPresupuesto={() => {
            navigate('/presupuestos', { state: { clienteId: selectedCliente.id } })
            setSelectedCliente(null)
          }}
          onReparaciones={() => {
            navigate('/reparaciones', { state: { clienteId: selectedCliente.id } })
            setSelectedCliente(null)
          }}
        />
      )}
    </div>
  )
}

function InvitarCliente({ cliente, vehiculos }: { cliente: Cliente; vehiculos: Vehiculo[] }) {
  const [selectedVeh, setSelectedVeh] = useState(vehiculos[0]?.id ?? '')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [link, setLink] = useState('')

  async function sendInvitation() {
    if (!selectedVeh) return
    setSending(true)
    const { data } = await supabase
      .from('cliente_invitaciones')
      .insert({ cliente_id: cliente.id, vehiculo_id: selectedVeh, email: cliente.email! })
      .select()
      .maybeSingle()
    if (data) {
      const url = `${window.location.origin}/cliente/${data.token}`
      setLink(url)
      await supabase.from('cliente_invitaciones').update({ enviado: true }).eq('id', data.id)
      setSent(true)
    }
    setSending(false)
  }

  return (
    <div className="mt-4 pt-4 border-t border-bg-600">
      <p className="text-xs text-cyan-400 font-medium mb-2 flex items-center gap-1.5">
        <Send className="w-3.5 h-3.5" /> Invitar al cliente (Modo Cliente)
      </p>
      {vehiculos.length > 1 && (
        <select
          value={selectedVeh}
          onChange={(e) => setSelectedVeh(e.target.value)}
          className="w-full bg-bg-700 border border-bg-600 rounded-lg px-3 py-2 text-xs text-white mb-2 focus:outline-none"
        >
          {vehiculos.map((v) => (
            <option key={v.id} value={v.id}>{v.matricula} · {v.marca} {v.modelo}</option>
          ))}
        </select>
      )}
      {sent ? (
        <div className="space-y-2">
          <p className="text-xs text-green-400">Invitación creada. Comparte este enlace con el cliente:</p>
          <div className="flex gap-2">
            <input
              readOnly
              value={link}
              className="flex-1 bg-bg-800 border border-bg-600 rounded-lg px-3 py-1.5 text-xs text-cyan-400 font-mono"
            />
            <Button size="sm" variant="secondary" onClick={() => navigator.clipboard?.writeText(link)}>Copiar</Button>
          </div>
        </div>
      ) : (
        <Button size="sm" onClick={sendInvitation} disabled={sending}>
          {sending ? 'Generando...' : 'Generar Enlace'}
        </Button>
      )}
    </div>
  )
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function ClienteDetalle({
  cliente,
  vehiculos,
  onClose,
  onAddVehiculo,
  onUpdateVehiculo,
  onDeleteVehiculo,
  onUpdateCliente,
  onPresupuesto,
  onReparaciones,
}: {
  cliente: Cliente
  vehiculos: Vehiculo[]
  onClose: () => void
  onAddVehiculo: (veh: Omit<Vehiculo, 'id' | 'cliente_id' | 'created_at'>) => void
  onUpdateVehiculo: (id: string, veh: Partial<Vehiculo>) => void
  onDeleteVehiculo: (id: string) => void
  onUpdateCliente: (data: Partial<Cliente>) => void
  onPresupuesto: () => void
  onReparaciones: () => void
}) {
  const navigate = useNavigate()
  const [showVehForm, setShowVehForm] = useState(false)
  const [veh, setVeh] = useState({ matricula: '', marca: '', modelo: '', anio: '', vin: '' })
  const [editingCliente, setEditingCliente] = useState(false)
  const [clienteForm, setClienteForm] = useState({
    nombre: cliente.nombre,
    dni: cliente.dni ?? '',
    telefono: cliente.telefono ?? '',
    email: cliente.email ?? '',
    direccion: cliente.direccion ?? '',
  })
  const [editingVehId, setEditingVehId] = useState<string | null>(null)
  const [editVehForm, setEditVehForm] = useState({ matricula: '', marca: '', modelo: '', anio: '', vin: '' })

  // Fotos de vehículo
  const [fotosExpandida, setFotosExpandida] = useState<string | null>(null)
  const [subiendoFoto, setSubiendoFoto] = useState(false)

  // Notas por vehículo
  const [notas, setNotas] = useState<Record<string, NotaVehiculo[]>>({})
  const [notaExpandida, setNotaExpandida] = useState<string | null>(null)
  const [notaTexto, setNotaTexto] = useState('')
  const [notaAutor, setNotaAutor] = useState('')
  const [notaVisible, setNotaVisible] = useState(false)

  async function loadNotas(vehiculoId: string) {
    const { data } = await supabase
      .from('notas_vehiculo')
      .select('*')
      .eq('vehiculo_id', vehiculoId)
      .order('created_at', { ascending: false })
    setNotas(prev => ({ ...prev, [vehiculoId]: (data ?? []) as NotaVehiculo[] }))
  }

  async function addNota(vehiculoId: string) {
    if (!notaTexto.trim()) return
    await supabase.from('notas_vehiculo').insert({
      vehiculo_id: vehiculoId,
      cliente_id: cliente.id,
      texto: notaTexto,
      autor: notaAutor || 'Taller',
      visible_cliente: notaVisible,
    })
    setNotaTexto('')
    setNotaAutor('')
    setNotaVisible(false)
    loadNotas(vehiculoId)
  }

  async function deleteNota(notaId: string, vehiculoId: string) {
    await supabase.from('notas_vehiculo').delete().eq('id', notaId)
    loadNotas(vehiculoId)
  }

  function toggleNotasVehiculo(vehiculoId: string) {
    if (notaExpandida === vehiculoId) {
      setNotaExpandida(null)
    } else {
      setNotaExpandida(vehiculoId)
      setFotosExpandida(null)
      if (!notas[vehiculoId]) loadNotas(vehiculoId)
    }
  }

  function toggleFotosVehiculo(vehiculoId: string) {
    if (fotosExpandida === vehiculoId) {
      setFotosExpandida(null)
    } else {
      setFotosExpandida(vehiculoId)
      setNotaExpandida(null)
    }
  }

  async function handleUploadVehiculoFoto(e: React.ChangeEvent<HTMLInputElement>, vehiculoId: string) {
    const file = e.target.files?.[0]
    if (!file) return
    setSubiendoFoto(true)
    try {
      const dataUrl = await fileToDataUrl(file)
      const veh = vehiculos.find(v => v.id === vehiculoId)
      if (veh) {
        const newFotos = [...(veh.fotos ?? []), dataUrl]
        await supabase.from('vehiculos').update({ fotos: newFotos }).eq('id', vehiculoId)
        onUpdateVehiculo(vehiculoId, { fotos: newFotos })
      }
    } catch (err) {
      console.error(err)
    }
    setSubiendoFoto(false)
  }

  async function handleDeleteVehiculoFoto(vehiculoId: string, index: number) {
    const veh = vehiculos.find(v => v.id === vehiculoId)
    if (veh && veh.fotos) {
      const newFotos = [...veh.fotos]
      newFotos.splice(index, 1)
      await supabase.from('vehiculos').update({ fotos: newFotos }).eq('id', vehiculoId)
      onUpdateVehiculo(vehiculoId, { fotos: newFotos })
    }
  }

  // Historial
  const [historial, setHistorial] = useState<{
    presupuestos: Presupuesto[]
    facturas: Factura[]
    citas: any[]
    reparaciones: any[]
  }>({ presupuestos: [], facturas: [], citas: [], reparaciones: [] })
  const [loadingHist, setLoadingHist] = useState(true)
  const [activeTab, setActiveTab] = useState<'presupuestos' | 'citas' | 'reparaciones' | 'facturas'>('reparaciones')

  useEffect(() => {
    async function loadHistorial() {
      setLoadingHist(true)
      const [{ data: presup }, { data: facts }, { data: citas }, { data: reps }] = await Promise.all([
        supabase.from('presupuestos').select('*').eq('cliente_id', cliente.id).order('created_at', { ascending: false }),
        supabase.from('facturas').select('*').eq('cliente_id', cliente.id).order('created_at', { ascending: false }),
        supabase.from('citas').select('*').eq('cliente_id', cliente.id).order('created_at', { ascending: false }),
        supabase.from('reparaciones').select('*').eq('cliente_id', cliente.id).order('created_at', { ascending: false }),
      ])
      setHistorial({
        presupuestos: (presup ?? []) as Presupuesto[],
        facturas: (facts ?? []) as Factura[],
        citas: citas ?? [],
        reparaciones: reps ?? [],
      })
      setLoadingHist(false)
    }
    loadHistorial()
  }, [cliente.id])

  function saveVeh() {
    if (!veh.matricula.trim()) return
    onAddVehiculo({
      matricula: veh.matricula.toUpperCase(),
      marca: veh.marca || null,
      modelo: veh.modelo || null,
      anio: veh.anio ? parseInt(veh.anio) : null,
      vin: veh.vin || null,
    })
    setVeh({ matricula: '', marca: '', modelo: '', anio: '', vin: '' })
    setShowVehForm(false)
  }

  function saveClienteEdit() {
    if (!clienteForm.nombre.trim()) return
    onUpdateCliente({
      nombre: clienteForm.nombre,
      dni: clienteForm.dni || null,
      telefono: clienteForm.telefono || null,
      email: clienteForm.email || null,
      direccion: clienteForm.direccion || null,
    })
    setEditingCliente(false)
  }

  function startEditVeh(v: Vehiculo) {
    setEditingVehId(v.id)
    setEditVehForm({
      matricula: v.matricula,
      marca: v.marca ?? '',
      modelo: v.modelo ?? '',
      anio: v.anio?.toString() ?? '',
      vin: v.vin ?? '',
    })
  }

  function saveEditVeh() {
    if (!editingVehId) return
    onUpdateVehiculo(editingVehId, {
      matricula: editVehForm.matricula.toUpperCase(),
      marca: editVehForm.marca || null,
      modelo: editVehForm.modelo || null,
      anio: editVehForm.anio ? parseInt(editVehForm.anio) : null,
      vin: editVehForm.vin || null,
    })
    setEditingVehId(null)
  }

  return (
    <div className="fixed inset-0 bg-bg-950/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <Card className="w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div onClick={(e) => e.stopPropagation()} className="min-h-0 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">
              {editingCliente ? 'Editar cliente' : cliente.nombre}
            </h2>
            <div className="flex items-center gap-2">
              {!editingCliente && (
                <button
                  onClick={() => setEditingCliente(true)}
                  className="w-9 h-9 flex items-center justify-center rounded-lg text-cyan-400 hover:bg-cyan-500/10"
                  aria-label="Editar datos del cliente"
                    title="Editar datos del cliente"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              )}
              <button onClick={onClose} className="text-slate-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {editingCliente ? (
            <div className="space-y-3">
              <Input label="Nombre *" value={clienteForm.nombre} onChange={(v) => setClienteForm({ ...clienteForm, nombre: v })} placeholder="Nombre completo" />
              <Input label="DNI / NIF" value={clienteForm.dni} onChange={(v) => setClienteForm({ ...clienteForm, dni: v })} placeholder="12345678A" />
              <Input label="Teléfono" value={clienteForm.telefono} onChange={(v) => setClienteForm({ ...clienteForm, telefono: v })} placeholder="600 000 000" />
              <Input label="Email" value={clienteForm.email} onChange={(v) => setClienteForm({ ...clienteForm, email: v })} type="email" placeholder="cliente@email.com" />
              <Input label="Dirección" value={clienteForm.direccion} onChange={(v) => setClienteForm({ ...clienteForm, direccion: v })} placeholder="Calle, número, ciudad" />
              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={saveClienteEdit} className="flex-1">
                  <span className="flex items-center gap-1.5 justify-center"><Save className="w-3.5 h-3.5" /> Guardar</span>
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setEditingCliente(false)}>Cancelar</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              {cliente.dni && <p className="text-slate-400"><span className="text-slate-600">DNI:</span> {cliente.dni}</p>}
              {cliente.telefono && <p className="text-slate-400"><span className="text-slate-600">Tel:</span> {cliente.telefono}</p>}
              {cliente.email && <p className="text-slate-400"><span className="text-slate-600">Email:</span> {cliente.email}</p>}
              {cliente.direccion && <p className="text-slate-400"><span className="text-slate-600">Dir:</span> {cliente.direccion}</p>}
            </div>
          )}

          {/* Vehículos */}
          <div className="mt-4 pt-4 border-t border-bg-600">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500 font-medium">Vehículos</p>
              <button
                onClick={() => setShowVehForm(!showVehForm)}
                className="flex items-center gap-2 text-lg font-bold text-cyan-400 hover:text-cyan-300"
              >
                <Plus className="w-6 h-6" /> Añadir vehículo
              </button>
            </div>

            {showVehForm && (
              <div className="mb-6 mt-4 p-6 bg-bg-700/80 rounded-2xl space-y-6 w-full max-w-4xl mx-auto border border-cyan-500/30 shadow-lg overflow-y-auto max-h-[60vh]">
                <h3 className="text-2xl sm:text-3xl font-bold text-cyan-400 mb-4 flex items-center gap-3"><Plus className="w-8 h-8" /> Añadir Nuevo Vehículo</h3>
                <Input 
                  label="Matrícula *" 
                  value={veh.matricula} 
                  onChange={(v) => setVeh({ ...veh, matricula: v })} 
                  placeholder="1234 ABC" 
                  inputClassName="text-3xl sm:text-4xl py-6 font-bold uppercase tracking-widest text-center"
                  addonRight={<OcrScanner onScan={(t) => setVeh({ ...veh, matricula: t })} />}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <Input label="Marca" value={veh.marca} onChange={(v) => setVeh({ ...veh, marca: v })} placeholder="VW" inputClassName="text-2xl sm:text-3xl py-6" />
                  <Input label="Modelo" value={veh.modelo} onChange={(v) => setVeh({ ...veh, modelo: v })} placeholder="Golf" inputClassName="text-2xl sm:text-3xl py-6" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <Input label="Año" value={veh.anio} onChange={(v) => setVeh({ ...veh, anio: v })} placeholder="2020" inputClassName="text-2xl sm:text-3xl py-6" />
                  <Input label="VIN" value={veh.vin} onChange={(v) => setVeh({ ...veh, vin: v })} placeholder="Opcional" inputClassName="text-2xl sm:text-3xl py-6" />
                </div>
                <div className="flex flex-col sm:flex-row gap-4 pt-4 mt-8">
                  <Button size="md" className="flex-1 text-2xl py-6 bg-cyan-600 hover:bg-cyan-500 text-white" onClick={saveVeh}>GUARDAR VEHÍCULO</Button>
                  <Button size="md" variant="secondary" className="flex-1 text-2xl py-6" onClick={() => setShowVehForm(false)}>CANCELAR</Button>
                </div>
              </div>
            )}

            {vehiculos.length === 0 && !showVehForm ? (
              <p className="text-xs text-slate-600 py-2">Sin vehículos registrados</p>
            ) : (
              <div className="space-y-1.5">
                {vehiculos.map((v) =>
                  editingVehId === v.id ? (
                    <div key={v.id} className="p-6 bg-bg-700/80 rounded-2xl space-y-6 w-full max-w-4xl mx-auto border border-cyan-500/30 shadow-lg my-6">
                      <h3 className="text-2xl sm:text-3xl font-bold text-cyan-400 mb-4 flex items-center gap-3"><Edit3 className="w-8 h-8" /> Editar Vehículo</h3>
                      <Input 
                        label="Matrícula *" 
                        value={editVehForm.matricula} 
                        onChange={(val) => setEditVehForm({ ...editVehForm, matricula: val })} 
                        placeholder="1234 ABC" 
                        inputClassName="text-3xl sm:text-4xl py-6 font-bold uppercase tracking-widest text-center"
                        addonRight={<OcrScanner onScan={(t) => setEditVehForm({ ...editVehForm, matricula: t })} />}
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <Input label="Marca" value={editVehForm.marca} onChange={(val) => setEditVehForm({ ...editVehForm, marca: val })} placeholder="VW" inputClassName="text-2xl sm:text-3xl py-6" />
                        <Input label="Modelo" value={editVehForm.modelo} onChange={(val) => setEditVehForm({ ...editVehForm, modelo: val })} placeholder="Golf" inputClassName="text-2xl sm:text-3xl py-6" />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <Input label="Año" value={editVehForm.anio} onChange={(val) => setEditVehForm({ ...editVehForm, anio: val })} placeholder="2020" inputClassName="text-2xl sm:text-3xl py-6" />
                        <Input label="VIN" value={editVehForm.vin} onChange={(val) => setEditVehForm({ ...editVehForm, vin: val })} placeholder="Opcional" inputClassName="text-2xl sm:text-3xl py-6" />
                      </div>
                      <div className="flex flex-col sm:flex-row gap-4 pt-4 mt-8">
                        <Button size="md" className="flex-1 text-2xl py-6 bg-cyan-600 hover:bg-cyan-500 text-white" onClick={saveEditVeh}>GUARDAR CAMBIOS</Button>
                        <Button size="md" variant="secondary" className="flex-1 text-2xl py-6" onClick={() => setEditingVehId(null)}>CANCELAR</Button>
                      </div>
                    </div>
                  ) : (
                    <div key={v.id} className="rounded-xl overflow-hidden bg-bg-800/50 p-4 border border-bg-700/50 flex flex-col items-center mb-4">
                      
                      {/* Matrícula (80% ancho, estilo España) */}
                      <div className="w-[80%] bg-white rounded-md border border-gray-400 shadow-sm flex overflow-hidden mb-4 h-12 sm:h-16">
                        <div className="bg-blue-600 text-white flex flex-col items-center justify-between w-10 sm:w-12 py-1 shrink-0">
                          <div className="text-[10px] leading-none mt-1">★</div>
                          <span className="font-bold text-sm sm:text-base">E</span>
                        </div>
                        <div className="flex-1 flex items-center justify-center bg-white">
                          <span className="font-bold text-black text-2xl sm:text-4xl tracking-widest">{v.matricula}</span>
                        </div>
                      </div>

                      {/* Marca y Modelo (grande) */}
                      <div className="text-3xl sm:text-4xl font-bold text-white text-center mb-6">
                        {v.marca} {v.modelo ?? ''}
                        {v.anio && <span className="text-xl sm:text-2xl text-slate-400 ml-2">({v.anio})</span>}
                      </div>

                      {/* Cuatro iconos grandes */}
                      <div className="flex justify-center gap-4 sm:gap-6 w-full">
                        <button
                          onClick={() => toggleNotasVehiculo(v.id)}
                          className={`flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-xl transition-colors relative ${
                            notaExpandida === v.id
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-bg-700 text-slate-400 hover:text-amber-400 hover:bg-bg-600'
                          }`}
                          title="Notas internas"
                        >
                          <StickyNote className="w-8 h-8 sm:w-10 sm:h-10" />
                          {notas[v.id]?.length > 0 && (
                            <span className="absolute -top-2 -right-2 bg-amber-500 text-white text-xs sm:text-sm font-bold w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center">
                              {notas[v.id].length}
                            </span>
                          )}
                        </button>

                        <button
                          onClick={() => setFotosExpandida(v.id)} // Esto abrirá el Visor Global
                          className="flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-xl transition-colors bg-bg-700 text-slate-400 hover:text-cyan-400 hover:bg-bg-600 relative"
                          title="Fotos del vehículo"
                        >
                          <ImageIcon className="w-8 h-8 sm:w-10 sm:h-10" />
                          {(v.fotos ?? []).length > 0 && (
                            <span className="absolute -top-2 -right-2 bg-cyan-500 text-white text-xs sm:text-sm font-bold w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center">
                              {(v.fotos ?? []).length}
                            </span>
                          )}
                        </button>

                        <button
                          onClick={() => startEditVeh(v)}
                          className="flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-bg-700 text-slate-400 hover:text-cyan-400 hover:bg-bg-600 transition-colors"
                          title="Editar vehículo"
                        >
                          <Edit3 className="w-8 h-8 sm:w-10 sm:h-10" />
                        </button>

                        <button
                          onClick={() => onDeleteVehiculo(v.id)}
                          className="flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-bg-700 text-slate-400 hover:text-red-400 hover:bg-bg-600 transition-colors"
                          title="Eliminar vehículo"
                        >
                          <Trash2 className="w-8 h-8 sm:w-10 sm:h-10" />
                        </button>
                      </div>

                      {/* Panel de notas (80% ancho, letras grandes) */}
                      {notaExpandida === v.id && (
                        <div className="w-[80%] mt-6 p-4 bg-amber-500/5 border border-amber-500/15 rounded-xl">
                          <p className="text-sm sm:text-base text-amber-400 font-medium mb-4 flex items-center gap-2">
                            <StickyNote className="w-5 h-5 sm:w-6 sm:h-6" /> Notas internas
                          </p>

                          {/* Lista de notas existentes */}
                          {(notas[v.id] ?? []).length === 0 ? (
                            <p className="text-sm sm:text-base text-slate-600 mb-4">Sin notas todavía</p>
                          ) : (
                            <div className="space-y-3 mb-6">
                              {(notas[v.id] ?? []).map(n => (
                                <div key={n.id} className="flex items-start gap-3 p-3 bg-bg-700 rounded-xl group/nota">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-lg sm:text-2xl text-white/90 leading-tight">{n.texto}</p>
                                    <p className="text-xs sm:text-sm text-slate-500 mt-2">
                                      {n.autor} · {new Date(n.created_at).toLocaleDateString('es-ES')}
                                      {n.visible_cliente && (
                                        <span className="ml-2 text-cyan-500/70 flex items-center gap-1 inline-flex">
                                          <EyeIcon className="w-3 h-3 sm:w-4 sm:h-4" /> visible cliente
                                        </span>
                                      )}
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => deleteNota(n.id, v.id)}
                                    className="text-slate-600 hover:text-red-400 p-2 opacity-0 group-hover/nota:opacity-100 transition-opacity shrink-0"
                                  >
                                    <Trash2 className="w-6 h-6 sm:w-8 sm:h-8" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Formulario nueva nota */}
                          <div className="space-y-3">
                            <textarea
                              value={notaTexto}
                              onChange={e => setNotaTexto(e.target.value)}
                              placeholder="Nueva nota interna..."
                              rows={2}
                              className="w-full bg-bg-700 border border-bg-600 rounded-xl px-4 py-3 text-lg sm:text-2xl text-white focus:border-amber-500/40 focus:outline-none resize-none"
                            />
                            <div className="flex flex-col sm:flex-row items-center gap-3">
                              <input
                                value={notaAutor}
                                onChange={e => setNotaAutor(e.target.value)}
                                placeholder="Autor (opcional)"
                                className="w-full sm:flex-1 bg-bg-700 border border-bg-600 rounded-xl px-4 py-3 text-lg sm:text-xl text-white focus:border-amber-500/40 focus:outline-none"
                              />
                              <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
                                <label className="flex items-center gap-2 text-sm sm:text-lg text-slate-500 cursor-pointer shrink-0">
                                  <input
                                    type="checkbox"
                                    checked={notaVisible}
                                    onChange={e => setNotaVisible(e.target.checked)}
                                    className="accent-cyan-500 w-5 h-5 sm:w-6 sm:h-6"
                                  />
                                  {notaVisible ? <EyeIcon className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400" /> : <EyeOff className="w-5 h-5 sm:w-6 sm:h-6" />}
                                  Cliente
                                </label>
                                <button
                                  onClick={() => addNota(v.id)}
                                  disabled={!notaTexto.trim()}
                                  className="flex items-center gap-2 px-5 py-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-lg sm:text-xl font-bold rounded-xl disabled:opacity-40 transition"
                                >
                                  <Plus className="w-5 h-5 sm:w-6 sm:h-6" /> Añadir
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          {!editingCliente && (
            <>
              <div className="flex gap-2 mt-5">
                <MetisRowButton
                  tipo="cliente"
                  id={cliente.id}
                  cliente_nombre={cliente.nombre}
                  matricula={vehiculos[0]?.matricula}
                  data={cliente}
                />
                <Button onClick={onPresupuesto} className="flex-1">
                  <span className="flex items-center gap-2 justify-center"><FileText className="w-4 h-4" /> Presupuesto</span>
                </Button>
                <Button variant="secondary" onClick={onReparaciones} className="flex-1">
                  <span className="flex items-center gap-2 justify-center"><Wrench className="w-4 h-4" /> Historial</span>
                </Button>
              </div>

              {cliente.email && vehiculos.length > 0 && (
                <InvitarCliente cliente={cliente} vehiculos={vehiculos} />
              )}

              {/* HISTORIAL */}
              <div className="mt-5 pt-4 border-t border-bg-600">
                <div className="flex items-center gap-2 mb-3">
                  <History className="w-4 h-4 text-violet-400" />
                  <p className="text-sm font-semibold text-white">Historial del cliente</p>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 mb-3 bg-bg-700 rounded-lg p-1">
                  {([
                    { key: 'reparaciones', label: 'Reparaciones', icon: Wrench, count: historial.reparaciones.length },
                    { key: 'presupuestos', label: 'Presupuestos', icon: ClipboardList, count: historial.presupuestos.length },
                    { key: 'citas',        label: 'Citas',        icon: Calendar,     count: historial.citas.length },
                    { key: 'facturas',     label: 'Facturas',     icon: Receipt,      count: historial.facturas.length },
                  ] as const).map(({ key, label, icon: Icon, count }) => (
                    <button
                      key={key}
                      onClick={() => setActiveTab(key)}
                      className={`flex-1 flex items-center justify-center gap-1 text-xs py-1.5 rounded-md transition-all ${
                        activeTab === key
                          ? 'bg-bg-600 text-white font-semibold'
                          : 'text-slate-500 hover:text-white'
                      }`}
                    >
                      <Icon className="w-3 h-3" />
                      <span className="hidden sm:inline">{label}</span>
                      {count > 0 && <span className="ml-0.5 text-[10px] text-white/50">({count})</span>}
                    </button>
                  ))}
                </div>

                {loadingHist ? (
                  <p className="text-xs text-slate-500 py-4 text-center">Cargando...</p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {activeTab === 'reparaciones' && (
                      historial.reparaciones.length === 0
                        ? <p className="text-xs text-slate-600 py-2 text-center">Sin reparaciones</p>
                        : historial.reparaciones.map((r: any) => (
                            <button key={r.id} onClick={() => { navigate('/reparaciones'); onClose() }}
                              className="w-full text-left flex items-center gap-2 p-2 bg-bg-700 hover:bg-bg-600 rounded-lg transition">
                              <Wrench className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-white truncate">{r.descripcion || 'Sin descripción'}</p>
                                <p className="text-[10px] text-slate-500">{new Date(r.created_at).toLocaleDateString('es-ES')} · {r.estado}</p>
                              </div>
                            </button>
                          ))
                    )}
                    {activeTab === 'presupuestos' && (
                      historial.presupuestos.length === 0
                        ? <p className="text-xs text-slate-600 py-2 text-center">Sin presupuestos</p>
                        : historial.presupuestos.map((p) => (
                            <button key={p.id} onClick={() => { navigate('/presupuestos'); onClose() }}
                              className="w-full text-left flex items-center gap-2 p-2 bg-bg-700 hover:bg-bg-600 rounded-lg transition">
                              <ClipboardList className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-white">{p.numero} · {p.total.toFixed(2)} €</p>
                                <p className="text-[10px] text-slate-500">{new Date(p.created_at).toLocaleDateString('es-ES')} · {p.estado}</p>
                              </div>
                            </button>
                          ))
                    )}
                    {activeTab === 'citas' && (
                      historial.citas.length === 0
                        ? <p className="text-xs text-slate-600 py-2 text-center">Sin citas</p>
                        : historial.citas.map((c: any) => (
                            <button key={c.id} onClick={() => { navigate('/citas'); onClose() }}
                              className="w-full text-left flex items-center gap-2 p-2 bg-bg-700 hover:bg-bg-600 rounded-lg transition">
                              <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-white">{c.fecha} {c.hora ? `· ${c.hora.slice(0,5)}` : ''}</p>
                                <p className="text-[10px] text-slate-500">{c.estado} {c.observaciones ? `· ${c.observaciones}` : ''}</p>
                              </div>
                            </button>
                          ))
                    )}
                    {activeTab === 'facturas' && (
                      historial.facturas.length === 0
                        ? <p className="text-xs text-slate-600 py-2 text-center">Sin facturas</p>
                        : historial.facturas.map((f) => (
                            <button key={f.id} onClick={() => { navigate('/facturas'); onClose() }}
                              className="w-full text-left flex items-center gap-2 p-2 bg-bg-700 hover:bg-bg-600 rounded-lg transition">
                              <Receipt className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-white">{f.numero} · {f.total.toFixed(2)} €</p>
                                <p className="text-[10px] text-slate-500">{new Date(f.fecha).toLocaleDateString('es-ES')} · {f.estado_cobro}</p>
                              </div>
                            </button>
                          ))
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </Card>

      <GlobalImageViewer
        isOpen={!!fotosExpandida}
        onClose={() => setFotosExpandida(null)}
        images={vehiculos.find(v => v.id === fotosExpandida)?.fotos ?? []}
        onAddImage={async (dataUrl) => {
          if (!fotosExpandida) return;
          const veh = vehiculos.find(v => v.id === fotosExpandida);
          if (veh) {
            const newFotos = [...(veh.fotos ?? []), dataUrl];
            await supabase.from('vehiculos').update({ fotos: newFotos }).eq('id', fotosExpandida);
            onUpdateVehiculo(fotosExpandida, { fotos: newFotos });
          }
        }}
        onDeleteImage={async (index) => {
          if (fotosExpandida) await handleDeleteVehiculoFoto(fotosExpandida, index)
        }}
        title={vehiculos.find(v => v.id === fotosExpandida)?.matricula ?? "Fotos"}
      />
    </div>
  )
}
