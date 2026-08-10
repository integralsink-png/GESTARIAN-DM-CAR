import { PageHeader, Card, EmptyState, Button, Badge, Input } from '../components/UI'
import { OcrInvoiceScanner } from '../components/OcrInvoiceScanner'
import { Receipt, Truck, AlertTriangle, UserCog, Plus, X, Trash2, Search, Save, ArrowLeft } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Usuario, RolUsuario, Proveedor, FacturaRecibida, Concepto, Incidencia, PrioridadIncidencia, EstadoIncidencia, Cliente, Vehiculo } from '../lib/types'

/* ──────────────── Facturas Recibidas (RFP) ──────────────── */
export function FacturasRecibidasPage() {
  const [facturas, setFacturas] = useState<FacturaRecibida[]>([])
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({
    numero: '',
    proveedor_id: '',
    fecha: new Date().toISOString().slice(0, 10),
    base_imponible: 0,
    iva: 21,
    estado: 'pendiente',
    conceptos: [] as Concepto[],
  })

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const [{ data: fac }, { data: prov }] = await Promise.all([
      supabase.from('facturas_recibidas').select('*').order('created_at', { ascending: false }),
      supabase.from('proveedores').select('*').order('nombre'),
    ])
    setFacturas(fac ?? [])
    setProveedores(prov ?? [])
  }

  const total = form.base_imponible * (1 + form.iva / 100)

  async function handleSave() {
    if (!form.numero.trim() || !form.proveedor_id) return
    await supabase.from('facturas_recibidas').insert({
      numero: form.numero,
      proveedor_id: form.proveedor_id,
      fecha: form.fecha,
      base_imponible: form.base_imponible,
      iva: form.base_imponible * (form.iva / 100),
      total,
      estado: form.estado,
      conceptos: form.conceptos,
    })
    setForm({ numero: '', proveedor_id: '', fecha: new Date().toISOString().slice(0, 10), base_imponible: 0, iva: 21, estado: 'pendiente', conceptos: [] })
    setShowForm(false)
    load()
  }

  async function deleteFactura(id: string) {
    if (!confirm('¿Eliminar esta factura recibida?')) return
    await supabase.from('facturas_recibidas').delete().eq('id', id)
    load()
  }

  async function cambiarEstado(id: string, estado: string) {
    await supabase.from('facturas_recibidas').update({ estado }).eq('id', id)
    load()
  }

  const proveedorNombre = (id: string | null) => proveedores.find((p) => p.id === id)?.nombre ?? '—'

  const facturasFiltradas = facturas.filter((f) =>
    f.numero.toLowerCase().includes(search.toLowerCase()) ||
    proveedorNombre(f.proveedor_id).toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <PageHeader title="Facturas Recibidas" subtitle="Facturas de proveedores registradas">
        <Button onClick={() => setShowForm(true)}>
          <span className="flex items-center gap-2"><Plus className="w-4 h-4" /> Nueva factura</span>
        </Button>
      </PageHeader>

      {facturas.length > 0 && (
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por número o proveedor..."
            className="w-full gestarian-field rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none"
          />
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-bg-950/80 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <Card className="w-full max-w-lg p-6">
            <div onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Nueva factura recibida</h2>
                <button onClick={() => setShowForm(false)} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
              </div>

              <OcrInvoiceScanner 
                onScan={(data) => {
                  setForm({
                    ...form,
                    numero: data.numero || form.numero,
                    fecha: data.fecha || form.fecha,
                    base_imponible: data.base_imponible || form.base_imponible,
                    iva: data.iva || form.iva,
                  })
                }} 
              />

              <div className="space-y-3">
                <Input label="Número de factura" value={form.numero} onChange={(v) => setForm({ ...form, numero: v })} placeholder="F-2024-001" />
                <div>
                  <label className="block text-sm text-white/50 mb-1">Proveedor</label>
                  <select
                    value={form.proveedor_id}
                    onChange={(e) => setForm({ ...form, proveedor_id: e.target.value })}
                    className="w-full gestarian-field rounded-lg px-4 py-2.5 text-sm focus:outline-none"
                  >
                    <option value="">Seleccionar proveedor...</option>
                    {proveedores.map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Fecha" value={form.fecha} onChange={(v) => setForm({ ...form, fecha: v })} type="date" />
                  <div>
                    <label className="block text-sm text-white/50 mb-1">Estado</label>
                    <select
                      value={form.estado}
                      onChange={(e) => setForm({ ...form, estado: e.target.value })}
                      className="w-full gestarian-field rounded-lg px-4 py-2.5 text-sm focus:outline-none"
                    >
                      <option value="pendiente">Pendiente</option>
                      <option value="pagada">Pagada</option>
                      <option value="vencida">Vencida</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-white/50 mb-1">Base imponible (€)</label>
                    <input
                      type="number"
                      value={form.base_imponible || ''}
                      onChange={(e) => setForm({ ...form, base_imponible: parseFloat(e.target.value) || 0 })}
                      className="w-full gestarian-field rounded-lg px-4 py-2.5 text-sm focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white/50 mb-1">IVA (%)</label>
                    <input
                      type="number"
                      value={form.iva}
                      onChange={(e) => setForm({ ...form, iva: parseFloat(e.target.value) || 0 })}
                      className="w-full gestarian-field rounded-lg px-4 py-2.5 text-sm focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-bg-700">
                  <span className="text-white/50">Total:</span>
                  <span className="font-bold text-white">{total.toFixed(2)} €</span>
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

      {facturasFiltradas.length === 0 ? (
        <EmptyState icon={<Receipt className="w-12 h-12" />} title="No hay facturas recibidas" subtitle="Registra facturas de tus proveedores" />
      ) : (
        <div className="space-y-2">
          {facturasFiltradas.map((f) => (
            <Card key={f.id} className="p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{f.numero}</span>
                    <Badge text={f.estado} color={f.estado === 'pagada' ? 'green' : f.estado === 'vencida' ? 'red' : 'yellow'} />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {proveedorNombre(f.proveedor_id)} · {f.total.toFixed(2)} € · {new Date(f.fecha).toLocaleDateString('es-ES')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {f.estado === 'pendiente' && (
                    <Button size="sm" variant="secondary" onClick={() => cambiarEstado(f.id, 'pagada')}>Marcar pagada</Button>
                  )}
                  <button onClick={() => deleteFactura(f.id)} className="text-slate-600 hover:text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

/* ──────────────── Proveedores ──────────────── */
export function ProveedoresPage() {
  const navigate = useNavigate()
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ nombre: '', cif: '', direccion: '', telefono: '', email: '', contacto: '' })

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const { data } = await supabase.from('proveedores').select('*').order('nombre')
    setProveedores(data ?? [])
  }

  async function handleSave() {
    if (!form.nombre.trim()) return
    await supabase.from('proveedores').insert({
      nombre: form.nombre,
      cif: form.cif || null,
      direccion: form.direccion || null,
      telefono: form.telefono || null,
      email: form.email || null,
      contacto: form.contacto || null,
    })
    setForm({ nombre: '', cif: '', direccion: '', telefono: '', email: '', contacto: '' })
    setShowForm(false)
    load()
  }

  async function deleteProveedor(id: string) {
    if (!confirm('¿Eliminar este proveedor?')) return
    await supabase.from('proveedores').delete().eq('id', id)
    load()
  }

  const filtrados = proveedores.filter((p) =>
    p.nombre.toLowerCase().includes(search.toLowerCase()) ||
    (p.cif ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (p.contacto ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <PageHeader title="Proveedores" subtitle="Gestión de proveedores y contactos">
        <button
          onClick={() => navigate(-1)}
          className="w-[60px] h-[60px] rounded-2xl bg-slate-800/80 text-white border border-white/20 flex items-center justify-center hover:bg-slate-700 transition-transform active:scale-95 shrink-0 shadow-[0_0_15px_rgba(255,255,255,0.1)]"
          title="Volver"
          aria-label="Volver"
        >
          <ArrowLeft className="w-7 h-7" />
        </button>
      </PageHeader>
      
      <div className="mb-4 flex justify-center">
        <button onClick={() => setShowForm(true)} className="flex items-center justify-center gap-3 text-cyan-400 hover:text-cyan-300 font-semibold transition-colors bg-bg-800 border border-bg-700 rounded-2xl px-8 py-4">
          <Plus className="w-8 h-8" /> <Truck className="w-8 h-8" />
        </button>
      </div>

      {proveedores.length > 0 && (
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar proveedor..."
            className="w-full gestarian-field rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none"
          />
        </div>
      )}

      {filtrados.length === 0 ? (
        <EmptyState icon={<Truck className="w-12 h-12" />} title="No hay proveedores" subtitle="Añade tus proveedores para gestionar facturas recibidas" />
      ) : (
        <div className="space-y-2">
          {filtrados.map((p) => (
            <Card key={p.id} className="p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-cyan-400/60" />
                    <span className="font-medium text-white">{p.nombre}</span>
                    {p.cif && <span className="text-xs text-slate-500">{p.cif}</span>}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                    {p.contacto && <p>Contacto: {p.contacto}</p>}
                    {p.telefono && <p>Tel: {p.telefono}</p>}
                    {p.email && <p>{p.email}</p>}
                    {p.direccion && <p>{p.direccion}</p>}
                  </div>
                </div>
                <button onClick={() => deleteProveedor(p.id)} className="text-slate-600 hover:text-red-400">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-bg-950/80 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <Card className="w-full max-w-md p-6">
            <div onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Nuevo proveedor</h2>
                <button onClick={() => setShowForm(false)} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-3">
                <Input label="Nombre *" value={form.nombre} onChange={(v) => setForm({ ...form, nombre: v })} />
                <Input label="CIF / NIF" value={form.cif} onChange={(v) => setForm({ ...form, cif: v })} />
                <Input label="Contacto" value={form.contacto} onChange={(v) => setForm({ ...form, contacto: v })} />
                <Input label="Teléfono" value={form.telefono} onChange={(v) => setForm({ ...form, telefono: v })} />
                <Input label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} type="email" />
                <Input label="Dirección" value={form.direccion} onChange={(v) => setForm({ ...form, direccion: v })} />
              </div>
              <div className="flex gap-3 mt-5">
                <Button onClick={handleSave} className="flex-1">Guardar</Button>
                <Button variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

/* ──────────────── Incidencias ──────────────── */
export function IncidenciasPage() {
  const navigate = useNavigate()
  const [incidencias, setIncidencias] = useState<Incidencia[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState<Incidencia | null>(null)
  const [filtroEstado, setFiltroEstado] = useState<EstadoIncidencia | 'todas'>('todas')
  const [filtroPrioridad, setFiltroPrioridad] = useState<PrioridadIncidencia | 'todas'>('todas')
  const [resolucionText, setResolucionText] = useState('')
  const [form, setForm] = useState({
    titulo: '',
    descripcion: '',
    prioridad: 'media' as PrioridadIncidencia,
    cliente_id: '',
    vehiculo_id: '',
    asignado_a: '',
  })

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: inc }, { data: cli }, { data: veh }] = await Promise.all([
      supabase.from('incidencias').select('*').order('created_at', { ascending: false }),
      supabase.from('clientes').select('*').order('nombre'),
      supabase.from('vehiculos').select('*').order('matricula'),
    ])
    setIncidencias((inc ?? []) as Incidencia[])
    setClientes((cli ?? []) as Cliente[])
    setVehiculos((veh ?? []) as Vehiculo[])
    setLoading(false)
  }

  async function handleSave() {
    if (!form.titulo.trim()) return
    await supabase.from('incidencias').insert({
      titulo: form.titulo,
      descripcion: form.descripcion || null,
      prioridad: form.prioridad,
      estado: 'abierta',
      cliente_id: form.cliente_id || null,
      vehiculo_id: form.vehiculo_id || null,
      asignado_a: form.asignado_a || null,
    })
    setForm({ titulo: '', descripcion: '', prioridad: 'media', cliente_id: '', vehiculo_id: '', asignado_a: '' })
    setShowForm(false)
    load()
  }

  async function cambiarEstado(id: string, estado: EstadoIncidencia) {
    await supabase.from('incidencias').update({ estado, updated_at: new Date().toISOString() }).eq('id', id)
    if (selected?.id === id) setSelected({ ...selected, estado })
    load()
  }

  async function guardarResolucion() {
    if (!selected) return
    await supabase.from('incidencias').update({
      resolucion: resolucionText,
      estado: 'resuelta',
      updated_at: new Date().toISOString(),
    }).eq('id', selected.id)
    setSelected({ ...selected, resolucion: resolucionText, estado: 'resuelta' })
    load()
  }

  async function eliminarIncidencia(id: string) {
    if (!confirm('¿Eliminar esta incidencia?')) return
    await supabase.from('incidencias').delete().eq('id', id)
    if (selected?.id === id) setSelected(null)
    load()
  }

  const prioridadColor = (p: PrioridadIncidencia): 'gray' | 'yellow' | 'red' | 'blue' => {
    if (p === 'baja') return 'gray'
    if (p === 'media') return 'blue'
    if (p === 'alta') return 'yellow'
    return 'red'
  }

  const estadoColor = (e: EstadoIncidencia): 'yellow' | 'blue' | 'green' | 'gray' => {
    if (e === 'abierta') return 'yellow'
    if (e === 'en_proceso') return 'blue'
    if (e === 'resuelta') return 'green'
    return 'gray'
  }

  const clienteNombre = (id: string | null) => clientes.find(c => c.id === id)?.nombre ?? '—'
  const vehiculoMatricula = (id: string | null) => vehiculos.find(v => v.id === id)?.matricula

  const filtradas = incidencias.filter(i => {
    if (filtroEstado !== 'todas' && i.estado !== filtroEstado) return false
    if (filtroPrioridad !== 'todas' && i.prioridad !== filtroPrioridad) return false
    return true
  })

  const counts = {
    abiertas: incidencias.filter(i => i.estado === 'abierta').length,
    urgentes: incidencias.filter(i => i.prioridad === 'urgente' && i.estado !== 'cerrada').length,
  }

  return (
    <div>
      <PageHeader title="Incidencias" subtitle="Seguimiento y resolución de incidencias del taller">
        <button
          onClick={() => navigate(-1)}
          className="w-[60px] h-[60px] rounded-2xl bg-slate-800/80 text-white border border-white/20 flex items-center justify-center hover:bg-slate-700 transition-transform active:scale-95 shrink-0 shadow-[0_0_15px_rgba(255,255,255,0.1)]"
          title="Volver"
          aria-label="Volver"
        >
          <ArrowLeft className="w-7 h-7" />
        </button>
      </PageHeader>
      
      <div className="mb-4 flex justify-center">
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 font-semibold transition-colors bg-bg-800 border border-bg-700 rounded-xl px-4 py-2">
          <Plus className="w-4 h-4" /> Nueva incidencia
        </button>
      </div>

      {incidencias.length > 0 && (
        <div className="flex gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-xs text-yellow-400 font-medium">{counts.abiertas} abiertas</span>
          </div>
          {counts.urgentes > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              <span className="text-xs text-red-400 font-medium">{counts.urgentes} urgentes</span>
            </div>
          )}
        </div>
      )}

      {incidencias.length > 0 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          <select
            value={filtroEstado}
            onChange={e => setFiltroEstado(e.target.value as any)}
            className="gestarian-field rounded-lg px-3 py-1.5 text-xs focus:outline-none"
          >
            <option value="todas">Todos los estados</option>
            <option value="abierta">Abierta</option>
            <option value="en_proceso">En proceso</option>
            <option value="resuelta">Resuelta</option>
            <option value="cerrada">Cerrada</option>
          </select>
          <select
            value={filtroPrioridad}
            onChange={e => setFiltroPrioridad(e.target.value as any)}
            className="gestarian-field rounded-lg px-3 py-1.5 text-xs focus:outline-none"
          >
            <option value="todas">Todas las prioridades</option>
            <option value="urgente">Urgente</option>
            <option value="alta">Alta</option>
            <option value="media">Media</option>
            <option value="baja">Baja</option>
          </select>
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-slate-500">Cargando...</div>
      ) : filtradas.length === 0 ? (
        <EmptyState icon={<AlertTriangle className="w-12 h-12" />} title="No hay incidencias" subtitle="Registra incidencias para hacer seguimiento de problemas del taller" />
      ) : (
        <div className="space-y-2">
          {filtradas.map(inc => (
            <Card
              key={inc.id}
              className={`p-4 cursor-pointer hover:border-bg-500 transition-colors ${selected?.id === inc.id ? 'border-cyan-500/40' : ''}`}
              onClick={() => { setSelected(inc); setResolucionText(inc.resolucion ?? '') }}
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-white">{inc.titulo}</span>
                    <Badge text={inc.prioridad} color={prioridadColor(inc.prioridad)} />
                    <Badge text={inc.estado.replace('_', ' ')} color={estadoColor(inc.estado)} />
                  </div>
                  {inc.descripcion && <p className="text-xs text-slate-500 mt-1 truncate">{inc.descripcion}</p>}
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-[11px] text-slate-600">
                    {inc.cliente_id && <span>Cliente: {clienteNombre(inc.cliente_id)}</span>}
                    {inc.vehiculo_id && <span>Vehículo: {vehiculoMatricula(inc.vehiculo_id)}</span>}
                    {inc.asignado_a && <span>Asignado: {inc.asignado_a}</span>}
                    <span>{new Date(inc.created_at).toLocaleDateString('es-ES')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {inc.estado === 'abierta' && (
                    <Button size="sm" variant="secondary" onClick={() => cambiarEstado(inc.id, 'en_proceso')}>
                      <span className="text-xs">Iniciar</span>
                    </Button>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); eliminarIncidencia(inc.id) }}
                    className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20"
                    title="Eliminar incidencia"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-bg-950/80 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <Card className="w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-white">{selected.titulo}</h2>
                <div className="flex gap-2 mt-1">
                  <Badge text={selected.prioridad} color={prioridadColor(selected.prioridad)} />
                  <Badge text={selected.estado.replace('_', ' ')} color={estadoColor(selected.estado)} />
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              {selected.descripcion && (
                <div className="p-3 bg-bg-700 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Descripción</p>
                  <p className="text-white/80">{selected.descripcion}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 text-xs">
                {selected.cliente_id && (
                  <div><span className="text-slate-500">Cliente: </span><span className="text-white">{clienteNombre(selected.cliente_id)}</span></div>
                )}
                {selected.vehiculo_id && (
                  <div><span className="text-slate-500">Vehículo: </span><span className="text-white">{vehiculoMatricula(selected.vehiculo_id)}</span></div>
                )}
                {selected.asignado_a && (
                  <div><span className="text-slate-500">Asignado a: </span><span className="text-white">{selected.asignado_a}</span></div>
                )}
                <div><span className="text-slate-500">Creada: </span><span className="text-white">{new Date(selected.created_at).toLocaleDateString('es-ES')}</span></div>
              </div>

              <div className="pt-3 border-t border-bg-600">
                <p className="text-xs text-slate-500 mb-2">Cambiar estado</p>
                <div className="flex gap-2 flex-wrap">
                  {(['abierta', 'en_proceso', 'resuelta', 'cerrada'] as EstadoIncidencia[]).map(e => (
                    <button
                      key={e}
                      onClick={() => cambiarEstado(selected.id, e)}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                        selected.estado === e
                          ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300 font-semibold'
                          : 'bg-bg-700 border-bg-600 text-slate-400 hover:text-white'
                      }`}
                    >
                      {e.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-bg-600">
                <p className="text-xs text-slate-500 mb-2">Nota de resolución</p>
                <textarea
                  value={resolucionText}
                  onChange={e => setResolucionText(e.target.value)}
                  placeholder="Describe cómo se resolvió la incidencia..."
                  rows={3}
                  className="w-full bg-bg-700 border border-bg-600 rounded-lg px-3 py-2 text-white text-sm focus:border-cyan-500 focus:outline-none"
                />
                <Button size="sm" className="mt-2" onClick={guardarResolucion}>
                  <span className="flex items-center gap-1.5"><Save className="w-3.5 h-3.5" /> Guardar resolución y marcar resuelta</span>
                </Button>
              </div>

              <div className="pt-3 border-t border-bg-600">
                <Button variant="danger" size="sm" onClick={() => eliminarIncidencia(selected.id)}>
                  <span className="flex items-center gap-2"><Trash2 className="w-3.5 h-3.5" /> Eliminar incidencia</span>
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-bg-950/80 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <Card className="w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Nueva incidencia</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <Input label="Título *" value={form.titulo} onChange={v => setForm({ ...form, titulo: v })} placeholder="Descripción breve del problema" />
              <div>
                <label className="block text-sm text-white/50 mb-1">Descripción detallada</label>
                <textarea
                  value={form.descripcion}
                  onChange={e => setForm({ ...form, descripcion: e.target.value })}
                  placeholder="Más detalles sobre la incidencia..."
                  rows={3}
                  className="w-full gestarian-field rounded-lg px-3 py-2 text-white text-sm focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-white/50 mb-1">Prioridad</label>
                  <select
                    value={form.prioridad}
                    onChange={e => setForm({ ...form, prioridad: e.target.value as PrioridadIncidencia })}
                    className="w-full gestarian-field rounded-lg px-3 py-2.5 text-sm focus:outline-none"
                  >
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-white/50 mb-1">Asignado a</label>
                  <input
                    value={form.asignado_a}
                    onChange={e => setForm({ ...form, asignado_a: e.target.value })}
                    placeholder="Nombre del responsable"
                    className="w-full gestarian-field rounded-lg px-3 py-2.5 text-sm focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-white/50 mb-1">Cliente (opcional)</label>
                <select
                  value={form.cliente_id}
                  onChange={e => setForm({ ...form, cliente_id: e.target.value, vehiculo_id: '' })}
                  className="w-full gestarian-field rounded-lg px-3 py-2.5 text-sm focus:outline-none"
                >
                  <option value="">Sin cliente</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              {form.cliente_id && (
                <div>
                  <label className="block text-sm text-white/50 mb-1">Vehículo (opcional)</label>
                  <select
                    value={form.vehiculo_id}
                    onChange={e => setForm({ ...form, vehiculo_id: e.target.value })}
                    className="w-full gestarian-field rounded-lg px-3 py-2.5 text-sm focus:outline-none"
                  >
                    <option value="">Sin vehículo</option>
                    {vehiculos.filter(v => v.cliente_id === form.cliente_id).map(v => (
                      <option key={v.id} value={v.id}>{v.matricula} {v.marca} {v.modelo}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-5">
              <Button onClick={handleSave} className="flex-1">Crear incidencia</Button>
              <Button variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

/* ──────────────── Usuarios ──────────────── */
export function UsuariosPage() {
  const navigate = useNavigate()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ nombre: '', email: '', rol: 'operario' as RolUsuario, puede_editar_precios: false, puede_enviar_gestoria: false })

  useEffect(() => {
    loadUsuarios()
  }, [])

  async function loadUsuarios() {
    const { data } = await supabase.from('usuarios').select('*').order('created_at', { ascending: false })
    setUsuarios(data ?? [])
  }

  async function handleSave() {
    if (!form.nombre.trim() || !form.email.trim()) return
    await supabase.from('usuarios').insert({
      nombre: form.nombre,
      email: form.email,
      rol: form.rol,
      puede_editar_precios: form.puede_editar_precios,
      puede_enviar_gestoria: form.puede_enviar_gestoria,
    })
    setForm({ nombre: '', email: '', rol: 'operario', puede_editar_precios: false, puede_enviar_gestoria: false })
    setShowForm(false)
    loadUsuarios()
  }

  async function deleteUsuario(id: string) {
    if (!confirm('¿Eliminar este usuario?')) return
    await supabase.from('usuarios').delete().eq('id', id)
    loadUsuarios()
  }

  async function togglePermiso(id: string, campo: 'puede_editar_precios' | 'puede_enviar_gestoria', valor: boolean) {
    await supabase.from('usuarios').update({ [campo]: !valor }).eq('id', id)
    loadUsuarios()
  }

  const rolColor = (r: string): 'green' | 'blue' | 'gray' => {
    if (r === 'admin') return 'green'
    if (r === 'jefe') return 'blue'
    return 'gray'
  }

  return (
    <div>
      <PageHeader title="Usuarios" subtitle="Gestión de usuarios, roles y permisos">
        <button
          onClick={() => navigate(-1)}
          className="w-[60px] h-[60px] rounded-2xl bg-slate-800/80 text-white border border-white/20 flex items-center justify-center hover:bg-slate-700 transition-transform active:scale-95 shrink-0 shadow-[0_0_15px_rgba(255,255,255,0.1)]"
          title="Volver"
          aria-label="Volver"
        >
          <ArrowLeft className="w-7 h-7" />
        </button>
      </PageHeader>
      
      <div className="mb-4 flex justify-center">
        <button onClick={() => setShowForm(true)} className="flex items-center justify-center gap-3 text-cyan-400 hover:text-cyan-300 font-semibold transition-colors bg-bg-800 border border-bg-700 rounded-2xl px-8 py-4">
          <Plus className="w-8 h-8" /> <UserCog className="w-8 h-8" />
        </button>
      </div>

      {usuarios.length === 0 ? (
        <EmptyState icon={<UserCog className="w-12 h-12" />} title="No hay usuarios" subtitle="Añade usuarios para gestionar roles y permisos" />
      ) : (
        <div className="space-y-2">
          {usuarios.map((u) => (
            <Card key={u.id} className="p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{u.nombre}</span>
                    <Badge text={u.rol} color={rolColor(u.rol)} />
                    {!u.activo && <Badge text="inactivo" color="gray" />}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{u.email}</p>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => togglePermiso(u.id, 'puede_editar_precios', u.puede_editar_precios)}
                      className={`text-xs px-2 py-0.5 rounded-md transition-colors ${u.puede_editar_precios ? 'bg-green-500/15 text-green-400' : 'bg-bg-700 text-slate-600'}`}
                    >
                      Editar precios
                    </button>
                    <button
                      onClick={() => togglePermiso(u.id, 'puede_enviar_gestoria', u.puede_enviar_gestoria)}
                      className={`text-xs px-2 py-0.5 rounded-md transition-colors ${u.puede_enviar_gestoria ? 'bg-green-500/15 text-green-400' : 'bg-bg-700 text-slate-600'}`}
                    >
                      Enviar gestoría
                    </button>
                  </div>
                </div>
                <button onClick={() => deleteUsuario(u.id)} className="text-slate-600 hover:text-red-400">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-bg-950/80 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <Card className="w-full max-w-md p-6">
            <div onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Nuevo usuario</h2>
                <button onClick={() => setShowForm(false)} className="text-slate-500 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-3">
                <Input label="Nombre *" value={form.nombre} onChange={(v) => setForm({ ...form, nombre: v })} />
                <Input label="Email *" value={form.email} onChange={(v) => setForm({ ...form, email: v })} type="email" />
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Rol</label>
                  <select
                    value={form.rol}
                    onChange={(e) => setForm({ ...form, rol: e.target.value as RolUsuario })}
                    className="w-full bg-bg-700 border border-bg-600 rounded-lg px-4 py-2.5 text-white text-sm focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="operario">Operario</option>
                    <option value="jefe">Jefe / Encargado</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="space-y-2 pt-2">
                  <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.puede_editar_precios}
                      onChange={(e) => setForm({ ...form,puede_editar_precios: e.target.checked })}
                      className="accent-cyan-500"
                    />
                    Puede editar precios en presupuestos
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.puede_enviar_gestoria}
                      onChange={(e) => setForm({ ...form, puede_enviar_gestoria: e.target.checked })}
                      className="accent-cyan-500"
                    />
                    Puede enviar informes a gestoría
                  </label>
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
    </div>
  )
}

/* ──────────────── Datos Empresa ──────────────── */
export function DatosEmpresaPage() {
  return (
    <div>
      <PageHeader title="Datos Empresa" subtitle="Datos fiscales e identidad corporativa" />
      <Card className="p-6">
        <div className="space-y-3 text-sm">
          <div><span className="text-slate-500">Nombre:</span> <span className="text-white">DM CAR</span></div>
          <div><span className="text-slate-500">CIF:</span> <span className="text-white">B-12345678</span></div>
          <div><span className="text-slate-500">Dirección:</span> <span className="text-white">Polígono Industrial, Nave 7</span></div>
          <div><span className="text-slate-500">Teléfono:</span> <span className="text-white">600 000 000</span></div>
          <div><span className="text-slate-500">Email:</span> <span className="text-white">info@dmcar.es</span></div>
        </div>
        <p className="text-xs text-slate-600 mt-4">
          Los datos de la empresa se gestionan desde la página de Configuración.
        </p>
      </Card>
    </div>
  )
}
