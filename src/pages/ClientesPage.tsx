import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Cliente, Vehiculo, Presupuesto, Factura, Configuracion } from '../lib/types'
import { PageHeader, Card, Button, Badge, EmptyState, Input } from '../components/UI'
import {
  Search, Phone, MessageCircle, Edit3, Car, FileText, Check,
  X, Plus, Trash2, Printer, Mail, ArrowLeft, Image as ImageIcon, Users, Save
} from 'lucide-react'
import { sendFacturaByEmail, downloadFacturaPDF, sendPresupuestoByEmail, downloadPresupuestoPDF } from '../lib/pdfGenerator'
import { GlobalImageViewer } from '../components/GlobalImageViewer'

export function ClientesPage() {
  const navigate = useNavigate()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [vehiculos, setVehiculos] = useState<Record<string, Vehiculo[]>>({})
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [expandedClienteId, setExpandedClienteId] = useState<string | null>(null)

  // Subpaneles por cliente
  const [activeSubpanel, setActiveSubpanel] = useState<Record<string, 'editar' | 'vehiculos' | 'presupuestos' | 'facturas' | null>>({})

  // Estado formulario edición cliente
  const [editForm, setEditForm] = useState<Partial<Cliente>>({})

  // Estado formulario vehículo
  const [newVehForm, setNewVehForm] = useState({ matricula: '', marca: '', modelo: '', anio: '', vin: '' })

  // Presupuestos y facturas por cliente
  const [presupuestosCliente, setPresupuestosCliente] = useState<Record<string, Presupuesto[]>>({})
  const [facturasCliente, setFacturasCliente] = useState<Record<string, Factura[]>>({})

  // Vista individual de Presupuesto o Factura
  const [viewPresupuesto, setViewPresupuesto] = useState<{ presup: Presupuesto; cliente: Cliente; vehiculo: Vehiculo | null } | null>(null)
  const [viewFactura, setViewFactura] = useState<{ factura: Factura; cliente: Cliente; vehiculo: Vehiculo | null } | null>(null)
  const [cobrosFactura, setCobrosFactura] = useState<any[]>([])
  const [nuevoAbono, setNuevoAbono] = useState('')
  const [config, setConfig] = useState<Configuracion | null>(null)

  // Estado selección de presupuestos y vehículos
  const [selectedVehDetailId, setSelectedVehDetailId] = useState<string | null>(null)
  const [viewingVehFotos, setViewingVehFotos] = useState<{ vehId: string; matricula: string } | null>(null)
  const [clienteGuardadoId, setClienteGuardadoId] = useState<string | null>(null)

  useEffect(() => {
    loadClientes()
    loadConfig()
  }, [])

  async function loadConfig() {
    const { data } = await supabase.from('configuracion').select('*').eq('id', 1).maybeSingle()
    setConfig(data)
  }

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

  async function loadPresupuestosCliente(clienteId: string) {
    const { data } = await supabase.from('presupuestos').select('*').eq('cliente_id', clienteId).order('created_at', { ascending: false })
    setPresupuestosCliente(prev => ({ ...prev, [clienteId]: (data ?? []) as Presupuesto[] }))
  }

  async function loadFacturasCliente(clienteId: string) {
    const { data } = await supabase.from('facturas').select('*').eq('cliente_id', clienteId).order('created_at', { ascending: false })
    setFacturasCliente(prev => ({ ...prev, [clienteId]: (data ?? []) as Factura[] }))
  }

  function toggleCliente(cliente: Cliente) {
    if (expandedClienteId === cliente.id) {
      setExpandedClienteId(null)
    } else {
      setExpandedClienteId(cliente.id)
      setEditForm(cliente)
      loadPresupuestosCliente(cliente.id)
      loadFacturasCliente(cliente.id)
    }
  }

  function toggleSubpanel(clienteId: string, panel: 'editar' | 'vehiculos' | 'presupuestos' | 'facturas') {
    setActiveSubpanel(prev => ({
      ...prev,
      [clienteId]: prev[clienteId] === panel ? null : panel
    }))
  }

  // Guardar datos editados del cliente
  async function handleSaveCliente(clienteId: string) {
    await supabase.from('clientes').update({
      nombre: editForm.nombre,
      dni: editForm.dni || null,
      telefono: editForm.telefono || null,
      email: editForm.email || null,
      direccion: editForm.direccion || null,
    }).eq('id', clienteId)
    loadClientes()
  }

  // Eliminar vehículo
  async function handleDeleteVehiculo(vehId: string, clienteId: string) {
    if (!confirm('¿Eliminar este vehículo?')) return
    await supabase.from('vehiculos').delete().eq('id', vehId)
    const { data: vehs } = await supabase.from('vehiculos').select('*').eq('cliente_id', clienteId)
    setVehiculos(prev => ({ ...prev, [clienteId]: vehs ?? [] }))
  }

  // Aceptar presupuesto
  async function handleAceptarPresupuesto(presupId: string, clienteId: string) {
    await supabase.from('presupuestos').update({ estado: 'aceptado' }).eq('id', presupId)
    loadPresupuestosCliente(clienteId)
    if (viewPresupuesto) {
      setViewPresupuesto({ ...viewPresupuesto, presup: { ...viewPresupuesto.presup, estado: 'aceptado' } })
    }
  }

  // Cargar cobros de factura
  async function openFacturaDetail(factura: Factura, cliente: Cliente, vehiculo: Vehiculo | null) {
    const { data } = await supabase.from('cobros').select('*').eq('factura_id', factura.id).order('created_at', { ascending: false })
    setCobrosFactura(data ?? [])
    setViewFactura({ factura, cliente, vehiculo })
  }

  // Registrar abono en factura vista
  async function handleRegistrarAbono() {
    if (!viewFactura || !nuevoAbono) return
    const importe = parseFloat(nuevoAbono)
    const saldoPend = viewFactura.factura.total - viewFactura.factura.total_abonado
    if (isNaN(importe) || importe <= 0 || importe > saldoPend) return

    await supabase.from('cobros').insert({ factura_id: viewFactura.factura.id, importe })
    const nuevoTotalAbonado = viewFactura.factura.total_abonado + importe
    const nuevoEstado = nuevoTotalAbonado >= viewFactura.factura.total ? 'pagada' : 'parcial'

    await supabase.from('facturas').update({
      total_abonado: nuevoTotalAbonado,
      estado_cobro: nuevoEstado,
    }).eq('id', viewFactura.factura.id)

    setNuevoAbono('')
    const { data } = await supabase.from('cobros').select('*').eq('factura_id', viewFactura.factura.id).order('created_at', { ascending: false })
    setCobrosFactura(data ?? [])
    setViewFactura({
      ...viewFactura,
      factura: { ...viewFactura.factura, total_abonado: nuevoTotalAbonado, estado_cobro: nuevoEstado as any }
    })
    loadFacturasCliente(viewFactura.cliente.id)
  }

  async function handleAbonarTodo() {
    if (!viewFactura) return
    const saldoPend = viewFactura.factura.total - viewFactura.factura.total_abonado
    if (saldoPend <= 0) return

    await supabase.from('cobros').insert({ factura_id: viewFactura.factura.id, importe: saldoPend })
    const nuevoTotalAbonado = viewFactura.factura.total
    const nuevoEstado = 'pagada'

    await supabase.from('facturas').update({
      total_abonado: nuevoTotalAbonado,
      estado_cobro: nuevoEstado,
    }).eq('id', viewFactura.factura.id)

    const { data } = await supabase.from('cobros').select('*').eq('factura_id', viewFactura.factura.id).order('created_at', { ascending: false })
    setCobrosFactura(data ?? [])
    setViewFactura({
      ...viewFactura,
      factura: { ...viewFactura.factura, total_abonado: nuevoTotalAbonado, estado_cobro: nuevoEstado as any }
    })
    loadFacturasCliente(viewFactura.cliente.id)
  }

  const filteredClientes = clientes.filter((c) => {
    const s = search.toLowerCase()
    if (!s) return true
    if (c.nombre?.toLowerCase().includes(s)) return true
    if (c.dni?.toLowerCase().includes(s)) return true
    if (c.telefono?.includes(s)) return true
    const vehs = vehiculos[c.id] ?? []
    if (vehs.some(v => v.matricula?.toLowerCase().includes(s))) return true
    return false
  })

  // ── Vista individual de PRESUPUESTO ──
  if (viewPresupuesto) {
    const { presup, cliente, vehiculo } = viewPresupuesto
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => setViewPresupuesto(null)}>
          <span className="flex items-center gap-2"><ArrowLeft className="w-4 h-4" /> VOLVER</span>
        </Button>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-bg-600">
            <div>
              <h2 className="text-xl font-bold text-white">Presupuesto {presup.numero}</h2>
              <p className="text-xs text-slate-400">Cliente: {cliente.nombre} · Vehículo: {vehiculo?.matricula ?? '—'}</p>
            </div>
            <Badge text={presup.estado} color={presup.estado === 'aceptado' ? 'green' : presup.estado === 'rechazado' ? 'red' : 'yellow'} />
          </div>

          {/* Tabla conceptos */}
          <div className="space-y-2 mb-6">
            {(presup.conceptos ?? []).map((c, i) => (
              <div key={i} className="flex justify-between items-center bg-bg-800 p-3 rounded-lg text-sm">
                <span className="text-white font-medium">{c.descripcion}</span>
                <span className="text-slate-400">{c.cantidad} x {c.precio.toFixed(2)} € = <strong className="text-white">{(c.cantidad * c.precio).toFixed(2)} €</strong></span>
              </div>
            ))}
            <div className="flex justify-between items-center pt-3 border-t border-bg-600 font-bold text-lg text-white">
              <span>Total</span>
              <span>{presup.total.toFixed(2)} €</span>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex flex-wrap gap-3 pt-4 border-t border-bg-600">
            {presup.estado !== 'aceptado' && (
              <Button onClick={() => handleAceptarPresupuesto(presup.id, cliente.id)}>
                <span className="flex items-center gap-2"><Check className="w-4 h-4" /> Aceptar presupuesto</span>
              </Button>
            )}
            <Button variant="secondary" onClick={() => sendPresupuestoByEmail(presup, cliente, vehiculo, config)}>
              <span className="flex items-center gap-2"><Mail className="w-4 h-4" /> Email</span>
            </Button>
            <Button variant="secondary" onClick={() => {
              const msg = `Hola ${cliente.nombre}, le enviamos el presupuesto ${presup.numero} por un total de ${presup.total.toFixed(2)}€. Saludos, DM CAR.`
              const phone = cliente.telefono?.replace(/\s/g, '') || ''
              if (phone) window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank')
            }}>
              <span className="flex items-center gap-2"><MessageCircle className="w-4 h-4 text-green-400" /> WhatsApp</span>
            </Button>
            <Button variant="secondary" onClick={() => downloadPresupuestoPDF(presup, cliente, vehiculo, config)}>
              <span className="flex items-center gap-2"><Printer className="w-4 h-4" /> Imprimir</span>
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  // ── Vista individual de FACTURA ──
  if (viewFactura) {
    const { factura, cliente, vehiculo } = viewFactura
    const saldoPend = factura.total - factura.total_abonado

    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => setViewFactura(null)}>
          <span className="flex items-center gap-2"><ArrowLeft className="w-4 h-4" /> VOLVER</span>
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Panel control de cobros */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Control de Cobro</h3>

            <div className="rounded-xl border border-bg-600 overflow-hidden mb-4">
              <div className="flex items-center justify-between px-4 py-3 bg-bg-700/60 border-b border-bg-600">
                <span className="text-xs font-semibold uppercase text-slate-400">Total factura</span>
                <span className="text-lg font-bold text-white">{factura.total.toFixed(2)} €</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3 bg-emerald-950/20 border-b border-bg-600">
                <span className="text-xs font-semibold uppercase text-emerald-400">Ya abonado</span>
                <span className="text-base font-bold text-emerald-400">+ {factura.total_abonado.toFixed(2)} €</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3 bg-amber-950/20 border-b border-bg-600">
                <span className="text-xs font-semibold uppercase text-amber-400">Pendiente actual</span>
                <span className={`text-base font-bold ${saldoPend <= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>{saldoPend.toFixed(2)} €</span>
              </div>
            </div>

            {saldoPend > 0 && (
              <div className="space-y-3 mb-4">
                <div className="p-3 bg-bg-700 rounded-xl border border-bg-600 flex gap-2">
                  <input
                    type="number"
                    value={nuevoAbono}
                    onChange={(e) => setNuevoAbono(e.target.value)}
                    placeholder="Importe parcial €"
                    className="flex-1 bg-bg-800 border border-bg-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
                  />
                  <Button size="sm" onClick={handleRegistrarAbono}>Abono parcial</Button>
                </div>
                <Button size="sm" className="w-full" onClick={handleAbonarTodo}>Abonar todo ({saldoPend.toFixed(2)} €)</Button>
              </div>
            )}

            {/* Acciones */}
            <div className="flex flex-col gap-2 pt-4 border-t border-bg-600">
              <Button variant="secondary" onClick={() => sendFacturaByEmail(factura, cliente, vehiculo, config)}>
                <span className="flex items-center gap-2"><Mail className="w-4 h-4" /> Enviar por email</span>
              </Button>
              <Button variant="secondary" onClick={() => {
                const msg = `Hola ${cliente.nombre}, factura ${factura.numero} por total ${factura.total.toFixed(2)}€. Pendiente: ${saldoPend.toFixed(2)}€. Saludos, DM CAR.`
                const phone = cliente.telefono?.replace(/\s/g, '') || ''
                if (phone) window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank')
              }}>
                <span className="flex items-center gap-2"><MessageCircle className="w-4 h-4 text-green-400" /> Enviar por WhatsApp</span>
              </Button>
              <Button variant="secondary" onClick={() => downloadFacturaPDF(factura, cliente, vehiculo, config)}>
                <span className="flex items-center gap-2"><Printer className="w-4 h-4" /> Imprimir / PDF</span>
              </Button>
            </div>
          </Card>

          {/* Resumen Factura */}
          <Card className="p-6">
            <h3 className="text-lg font-bold text-white mb-4">Factura {factura.numero}</h3>
            <p className="text-xs text-slate-400 mb-4">Fecha: {new Date(factura.fecha).toLocaleDateString('es-ES')}</p>
            <div className="space-y-2 mb-6">
              {(factura.conceptos ?? []).map((c, i) => (
                <div key={i} className="flex justify-between text-sm bg-bg-800 p-2.5 rounded">
                  <span className="text-white">{c.descripcion}</span>
                  <span className="text-slate-300">{(c.cantidad * c.precio).toFixed(2)} €</span>
                </div>
              ))}
            </div>
            <div className="text-right font-bold text-xl text-white pt-3 border-t border-bg-600">
              Total: {factura.total.toFixed(2)} €
            </div>
          </Card>
        </div>
      </div>
    )
  }

  // Estados de formularios y ventanas emergentes (Pop-up)
  const [showNuevoClienteModal, setShowNuevoClienteModal] = useState(false)
  const [showNuevoVehiculoModal, setShowNuevoVehiculoModal] = useState<string | null>(null)
  const [clientePopup, setClientePopup] = useState(false)
  const [vehiculoPopup, setVehiculoPopup] = useState(false)

  const [nuevoClienteForm, setNuevoClienteForm] = useState({ nombre: '', dni: '', telefono: '', email: '', direccion: '', cp: '', localidad: '' })
  const [nuevoVehFormModal, setNuevoVehFormModal] = useState({ matricula: '', marca: '', modelo: '', codigo_color: '', vin: '' })
  const [buscandoCP, setBuscandoCP] = useState(false)

  // API para autocompletar localidad según el Código Postal (CP de España)
  async function handleCPChange(cpValue: string) {
    setNuevoClienteForm(prev => ({ ...prev, cp: cpValue }))
    const cleanCP = cpValue.trim()
    if (cleanCP.length === 5 && /^\d+$/.test(cleanCP)) {
      setBuscandoCP(true)
      try {
        const res = await fetch(`https://api.zippopotam.us/es/${cleanCP}`)
        if (res.ok) {
          const data = await res.json()
          const place = data.places?.[0]
          if (place && place['place name']) {
            setNuevoClienteForm(prev => ({ ...prev, localidad: place['place name'] }))
          }
        }
      } catch (e) {
        console.error('Error buscando localidad por CP', e)
      } finally {
        setBuscandoCP(false)
      }
    }
  }

  // Guardar nuevo cliente desde el formulario modal dedicado
  async function handleGuardarNuevoCliente() {
    if (!nuevoClienteForm.nombre.trim()) return
    
    // Objeto payload base de cliente
    const clientePayload: any = {
      nombre: nuevoClienteForm.nombre,
      dni: nuevoClienteForm.dni || null,
      telefono: nuevoClienteForm.telefono || null,
      email: nuevoClienteForm.email || null,
      direccion: nuevoClienteForm.direccion || null,
    }

    if (nuevoClienteForm.cp) clientePayload.cp = nuevoClienteForm.cp
    if (nuevoClienteForm.localidad) clientePayload.localidad = nuevoClienteForm.localidad

    let { data, error } = await supabase.from('clientes').insert(clientePayload).select().maybeSingle()

    // Si fallara la consulta select/single por restricciones de RLS o columnas opcionales
    if (error && (error.code === 'PGRST204' || error.message.includes('column'))) {
      delete clientePayload.cp
      delete clientePayload.localidad
      const res = await supabase.from('clientes').insert(clientePayload).select().maybeSingle()
      data = res.data
      error = res.error
    }

    if (data || !error) {
      const clienteId = data?.id || (await supabase.from('clientes').select('id').eq('nombre', nuevoClienteForm.nombre).order('created_at', { ascending: false }).limit(1).single()).data?.id

      if (clienteId && nuevoVehFormModal.matricula.trim()) {
        const vehPayload: any = {
          cliente_id: clienteId,
          matricula: nuevoVehFormModal.matricula.toUpperCase(),
          marca: nuevoVehFormModal.marca || null,
          modelo: nuevoVehFormModal.modelo || null,
          vin: nuevoVehFormModal.vin || null,
        }
        if (nuevoVehFormModal.codigo_color) vehPayload.codigo_color = nuevoVehFormModal.codigo_color
        
        const vehRes = await supabase.from('vehiculos').insert(vehPayload)
        if (vehRes.error && vehRes.error.message.includes('column')) {
          delete vehPayload.codigo_color
          await supabase.from('vehiculos').insert(vehPayload)
        }
      }

      setClienteGuardadoId(clienteId || null)
      await loadClientes()
      setClientePopup(true)
      setTimeout(() => setClientePopup(false), 3000)

      // Si se rellenó vehículo o si el usuario quiere generar presupuesto directo, cerramos modal e iremos a presupuestos
      if (clienteId && nuevoVehFormModal.matricula.trim()) {
        // Redirigir a presupuestos
        navigate('/presupuestos', { state: { clienteId, openForm: true } })
        setShowNuevoClienteModal(false)
        setNuevoClienteForm({ nombre: '', dni: '', telefono: '', email: '', direccion: '', cp: '', localidad: '' })
        setNuevoVehFormModal({ matricula: '', marca: '', modelo: '', codigo_color: '', vin: '' })
      }
    } else {
      console.error('Error insertando cliente en Supabase:', error)
      alert('Hubo un error al guardar el cliente en la base de datos: ' + (error?.message || 'Error desconocido'))
    }
  }

  const [vehiculoDuplicadoMsg, setVehiculoDuplicadoMsg] = useState<string | null>(null)

  // Añadir vehículo (vincular vehículo) al cliente sin cerrar modal obligatoriamente si desea agregar más
  async function handleAñadirVehiculoModal(clienteId?: string) {
    const cleanMatricula = nuevoVehFormModal.matricula.trim().toUpperCase()
    if (!cleanMatricula) {
      alert('Debes ingresar la matrícula del vehículo para poder añadirlo.')
      return
    }

    const targetClienteId = clienteId || showNuevoVehiculoModal
    if (!targetClienteId) return

    // 1. Comprobar si el vehículo con esa matrícula ya existe en la base de datos
    const { data: vehExistente } = await supabase
      .from('vehiculos')
      .select('id, cliente_id, clientes(nombre)')
      .eq('matricula', cleanMatricula)
      .maybeSingle()

    if (vehExistente) {
      const clienteOwner = (vehExistente as any)?.clientes?.nombre || 'otro cliente'
      setVehiculoDuplicadoMsg(`El vehículo con matrícula ${cleanMatricula} ya está registrado a nombre de ${clienteOwner}.`)
      setTimeout(() => setVehiculoDuplicadoMsg(null), 5000)
      return
    }

    // 2. Insertar nuevo vehículo
    const vehPayload: any = {
      cliente_id: targetClienteId,
      matricula: cleanMatricula,
      marca: nuevoVehFormModal.marca || null,
      modelo: nuevoVehFormModal.modelo || null,
      vin: nuevoVehFormModal.vin || null,
    }
    if (nuevoVehFormModal.codigo_color) vehPayload.codigo_color = nuevoVehFormModal.codigo_color

    let { error } = await supabase.from('vehiculos').insert(vehPayload)
    if (error && error.message.includes('column')) {
      delete vehPayload.codigo_color
      const res = await supabase.from('vehiculos').insert(vehPayload)
      error = res.error
    }

    if (!error) {
      setNuevoVehFormModal({ matricula: '', marca: '', modelo: '', codigo_color: '', vin: '' })
      const { data: vehs } = await supabase.from('vehiculos').select('*').eq('cliente_id', targetClienteId)
      setVehiculos(prev => ({ ...prev, [targetClienteId]: vehs ?? [] }))
      setVehiculoPopup(true)
      setTimeout(() => setVehiculoPopup(false), 3500)
    } else {
      console.error('Error al guardar vehículo:', error)
      alert('Error al guardar el vehículo: ' + error.message)
    }
  }

  // ── Vista principal de CLIENTES ──
  return (
    <div className="space-y-4">
      {/* Pop-up de confirmación Cliente Guardado (z-[100] para estar por encima de modales z-50) */}
      {clientePopup && (
        <div className="fixed top-6 right-6 z-[100] bg-emerald-500 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-2 font-bold animate-bounce border-2 border-white">
          <Check className="w-6 h-6" /> Cliente guardado correctamente
        </div>
      )}

      {/* Pop-up de confirmación Vehículo Guardado (z-[100]) */}
      {vehiculoPopup && (
        <div className="fixed top-6 right-6 z-[100] bg-emerald-500 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-2 font-bold animate-bounce border-2 border-white">
          <Check className="w-6 h-6" /> Vehículo guardado correctamente
        </div>
      )}

      {/* Pop-up de aviso Vehículo Duplicado (z-[100]) */}
      {vehiculoDuplicadoMsg && (
        <div className="fixed top-6 right-6 z-[100] bg-amber-500 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-2 font-bold border-2 border-white max-w-sm">
          <X className="w-6 h-6 shrink-0" /> {vehiculoDuplicadoMsg}
        </div>
      )}

      {/* Título centrado con botón VOLVER a la derecha (navega a la pantalla anterior) */}
      <PageHeader title="CLIENTES">
        <button
          onClick={() => {
            if (expandedClienteId) {
              setExpandedClienteId(null)
            } else {
              navigate(-1)
            }
          }}
          className="w-[60px] h-[60px] rounded-2xl bg-slate-800/80 text-white border border-white/20 flex items-center justify-center hover:bg-slate-700 transition-transform active:scale-95 shrink-0 shadow-[0_0_15px_rgba(255,255,255,0.1)]"
          title="Volver"
          aria-label="Volver"
        >
          <ArrowLeft className="w-7 h-7" />
        </button>
      </PageHeader>

      {/* Recuadro de búsqueda con botón + (se Oculta al estar dentro de la ficha de un cliente expandido) */}
      {!expandedClienteId && (
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar cliente..."
              className="w-full bg-bg-800 border border-bg-600 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:border-cyan-500 focus:outline-none transition-colors shadow-inner"
            />
          </div>
          <button
            onClick={() => setShowNuevoClienteModal(true)}
            className="w-12 h-12 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/60 flex items-center justify-center hover:bg-cyan-500/30 transition-transform active:scale-95 shrink-0 shadow-[0_0_12px_rgba(8,145,178,0.3)]"
            title="Añadir nuevo cliente"
            aria-label="Añadir nuevo cliente"
          >
            <Plus className="w-7 h-7" />
          </button>
        </div>
      )}

      {/* Listado de clientes por filas */}
      {loading ? (
        <div className="text-center py-12 text-slate-500">Cargando clientes...</div>
      ) : filteredClientes.length === 0 ? (
        <EmptyState icon={<Users className="w-10 h-10 text-cyan-400" />} title="No se encontraron clientes" subtitle="Utiliza el buscador o añade un cliente" />
      ) : (
        <div className="space-y-2.5">
          {filteredClientes.map((cliente) => {
            const isExpanded = expandedClienteId === cliente.id
            const subpanel = activeSubpanel[cliente.id]
            const clientVehs = vehiculos[cliente.id] ?? []
            const clientFacts = facturasCliente[cliente.id] ?? []

            // Formatear el nombre en 2 líneas si consta de varias palabras
            const nombreStr = cliente.nombre ? cliente.nombre.trim() : ''
            const nombreWords = nombreStr.split(' ')
            const line1 = nombreWords.slice(0, Math.ceil(nombreWords.length / 2)).join(' ')
            const line2 = nombreWords.slice(Math.ceil(nombreWords.length / 2)).join(' ')

            return (
              <div key={cliente.id} className="rounded-2xl border border-bg-700 bg-bg-800/80 overflow-hidden transition-all duration-200">
                {/* Fila principal del cliente — Ajustada exactamente al contenido */}
                <div
                  onClick={() => toggleCliente(cliente)}
                  className="flex items-center justify-between px-3.5 py-2.5 cursor-pointer hover:bg-bg-700/50 transition-colors gap-3"
                >
                  {/* Nombre en dos líneas con interlineado mínimo (leading-none/tight) */}
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="font-semibold text-white text-base leading-tight">
                      <div>{line1}</div>
                      {line2 && <div className="text-slate-300">{line2}</div>}
                    </div>
                  </div>

                  {/* Iconos de Teléfono y WhatsApp a la derecha multiplicados x2 (w-8 h-8 -> contenedor w-12 h-12) */}
                  <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {cliente.telefono ? (
                      <>
                        <a
                          href={`tel:${cliente.telefono.replace(/\s/g, '')}`}
                          className="w-12 h-12 rounded-2xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/40 flex items-center justify-center transition-transform active:scale-95 shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                          title="Llamar"
                        >
                          <Phone className="w-7 h-7" />
                        </a>
                        <a
                          href={`https://wa.me/${cliente.telefono.replace(/\s/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="w-12 h-12 rounded-2xl bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/40 flex items-center justify-center transition-transform active:scale-95 shadow-[0_0_10px_rgba(34,197,94,0.3)]"
                          title="WhatsApp"
                        >
                          <MessageCircle className="w-7 h-7" />
                        </a>
                      </>
                    ) : (
                      <span className="text-xs text-slate-500 italic">Sin tel.</span>
                    )}
                  </div>
                </div>

                {/* Panel desplegable con botones de subsecciones */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 border-t border-bg-700 bg-bg-900/60 space-y-4">
                    {/* Fila de botones principales */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {/* Botón Editar */}
                      <button
                        onClick={() => toggleSubpanel(cliente.id, 'editar')}
                        className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all ${
                          subpanel === 'editar' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/60' : 'bg-bg-800 text-slate-300 border-bg-700 hover:bg-bg-700'
                        }`}
                      >
                        <Edit3 className="w-4 h-4 text-cyan-400" /> Editar
                      </button>

                      {/* Botón Vehículos (Icono coche) */}
                      <button
                        onClick={() => toggleSubpanel(cliente.id, 'vehiculos')}
                        className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all ${
                          subpanel === 'vehiculos' ? 'bg-amber-500/20 text-amber-400 border-amber-500/60' : 'bg-bg-800 text-slate-300 border-bg-700 hover:bg-bg-700'
                        }`}
                      >
                        <Car className="w-4 h-4 text-amber-400" /> Vehículos ({clientVehs.length})
                      </button>

                      {/* Botón Presupuestos -> Navega directamente al listado de presupuestos del cliente en la página PRESUPUESTOS */}
                      <button
                        onClick={() => navigate('/presupuestos', { state: { clienteId: cliente.id } })}
                        className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-semibold bg-bg-800 text-slate-300 border-bg-700 hover:bg-bg-700 hover:text-cyan-400 hover:border-cyan-500/60 transition-all"
                      >
                        <FileText className="w-4 h-4 text-violet-400" /> Presupuestos
                      </button>

                      {/* Botón Facturas */}
                      <button
                        onClick={() => toggleSubpanel(cliente.id, 'facturas')}
                        className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all ${
                          subpanel === 'facturas' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/60' : 'bg-bg-800 text-slate-300 border-bg-700 hover:bg-bg-700'
                        }`}
                      >
                        <FileText className="w-4 h-4 text-emerald-400" /> Facturas
                      </button>
                    </div>

                    {/* SUBPANEL EDITAR */}
                    {subpanel === 'editar' && (
                      <div className="p-4 bg-bg-800 rounded-xl border border-bg-700 space-y-3">
                        <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-2">Editar datos del cliente</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <Input label="Nombre" value={editForm.nombre || ''} onChange={(v) => setEditForm({ ...editForm, nombre: v })} />
                          <Input label="DNI" value={editForm.dni || ''} onChange={(v) => setEditForm({ ...editForm, dni: v })} />
                          <Input label="Teléfono" value={editForm.telefono || ''} onChange={(v) => setEditForm({ ...editForm, telefono: v })} />
                          <Input label="Email" value={editForm.email || ''} onChange={(v) => setEditForm({ ...editForm, email: v })} />
                          <Input label="Dirección" value={editForm.direccion || ''} onChange={(v) => setEditForm({ ...editForm, direccion: v })} />
                        </div>
                        <Button size="sm" onClick={() => handleSaveCliente(cliente.id)}>
                          <span className="flex items-center gap-1.5"><Save className="w-3.5 h-3.5" /> Guardar cambios</span>
                        </Button>
                      </div>
                    )}

                    {/* SUBPANEL VEHÍCULOS */}
                    {subpanel === 'vehiculos' && (
                      <div className="p-4 bg-bg-800 rounded-xl border border-bg-700 space-y-3">
                        <h4 className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-2">Vehículos del cliente</h4>
                        <div className="space-y-2">
                          {clientVehs.length === 0 ? (
                            <p className="text-xs text-slate-500 italic">Sin vehículos registrados.</p>
                          ) : clientVehs.map((v) => {
                            const isSelectedVeh = selectedVehDetailId === v.id
                            return (
                              <div key={v.id} className="bg-bg-900 rounded-xl border border-bg-700 overflow-hidden transition-all">
                                {/* Línea principal del vehículo */}
                                <div
                                  onClick={() => setSelectedVehDetailId(isSelectedVeh ? null : v.id)}
                                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-bg-800/80 transition-colors"
                                >
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <Car className="w-4 h-4 text-amber-400" />
                                      <span className="font-bold text-white text-sm">{v.matricula}</span>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                      {v.marca || 'Sin marca'} {v.modelo ? `· ${v.modelo}` : ''}
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                    <button
                                      onClick={() => setViewingVehFotos({ vehId: v.id, matricula: v.matricula })}
                                      className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 hover:bg-cyan-500/30 flex items-center gap-1 text-xs font-medium transition-colors"
                                      title="Imágenes del vehículo"
                                    >
                                      <ImageIcon className="w-4 h-4" />
                                      <span>Imágenes ({v.fotos?.length ?? 0})</span>
                                    </button>

                                    <button onClick={() => handleDeleteVehiculo(v.id, cliente.id)} className="p-2 text-red-400 hover:text-red-300">
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>

                                {/* Desplegable con los datos detallados del vehículo */}
                                {isSelectedVeh && (
                                  <div className="p-3 bg-bg-950/70 border-t border-bg-800 text-xs space-y-2">
                                    <div className="grid grid-cols-2 gap-2 text-slate-300">
                                      <div><span className="text-slate-500 font-medium">Matrícula:</span> <strong className="text-white">{v.matricula}</strong></div>
                                      <div><span className="text-slate-500 font-medium">Marca:</span> {v.marca || '—'}</div>
                                      <div><span className="text-slate-500 font-medium">Modelo:</span> {v.modelo || '—'}</div>
                                      <div><span className="text-slate-500 font-medium">Código Color:</span> {v.codigo_color || '—'}</div>
                                      <div className="col-span-2"><span className="text-slate-500 font-medium">VIN / Bastidor:</span> {v.vin || '—'}</div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>

                        {/* Formulario / Botón para añadir vehículo */}
                        <div className="pt-3 border-t border-bg-700">
                          <Button size="sm" onClick={() => setShowNuevoVehiculoModal(cliente.id)}>
                            <span className="flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> <Car className="w-4 h-4" /> Añadir vehículo</span>
                          </Button>
                        </div>
                      </div>
                    )}


                    {/* SUBPANEL FACTURAS */}
                    {subpanel === 'facturas' && (
                      <div className="p-4 bg-bg-800 rounded-xl border border-bg-700 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Facturas del cliente</h4>
                          {/* Botón Nueva Factura: icono + con dibujo de F (líneas blancas transparente) */}
                          <button
                            onClick={() => navigate('/facturas', { state: { clienteId: cliente.id } })}
                            className="p-2.5 rounded-xl bg-white/10 text-white border border-white/30 hover:bg-white/20 flex items-center justify-center transition-all active:scale-95 shadow-[0_0_10px_rgba(255,255,255,0.15)]"
                            title="Nueva Factura"
                            aria-label="Nueva Factura"
                          >
                            <div className="flex items-center gap-1">
                              <Plus className="w-5 h-5" />
                              <div className="relative w-6 h-6 border-2 border-white/80 rounded flex items-center justify-center bg-white/10">
                                <span className="text-xs font-extrabold text-white leading-none">F</span>
                              </div>
                            </div>
                          </button>
                        </div>

                        <div className="space-y-2">
                          {clientFacts.length === 0 ? (
                            <div className="text-center py-6 text-slate-400 bg-bg-900/40 rounded-xl border border-bg-700/50">
                              <p className="text-sm font-semibold">Sin facturas registradas</p>
                              <p className="text-xs text-slate-500 mt-1">Genera una factura usando el botón superior</p>
                            </div>
                          ) : clientFacts.map((f) => {
                            const veh = clientVehs.find(v => v.id === f.vehiculo_id)
                            return (
                              <div
                                key={f.id}
                                onClick={() => openFacturaDetail(f, cliente, veh ?? null)}
                                className="flex items-center justify-between bg-bg-900 p-3.5 rounded-xl border border-bg-700 text-xs hover:border-emerald-500/50 cursor-pointer transition-colors"
                              >
                                <div>
                                  <span className="font-bold text-white text-sm mr-2">{f.numero}</span>
                                  <span className="text-slate-400">Total: <strong className="text-white">{f.total.toFixed(2)} €</strong></span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge text={f.estado_cobro} color={f.estado_cobro === 'pagada' ? 'green' : f.estado_cobro === 'parcial' ? 'yellow' : 'red'} />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* MODAL FORMULARIO NUEVO CLIENTE */}
      {showNuevoClienteModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto" onClick={() => setShowNuevoClienteModal(false)}>
          <Card className="w-full max-w-md p-5 sm:p-6 my-auto max-h-[92vh] overflow-y-auto scrollbar-thin">
            <div onClick={(e) => e.stopPropagation()} className="space-y-4 pb-44 sm:pb-6">
              <div className="flex items-center justify-between border-b border-bg-700 pb-3 sticky top-0 bg-bg-800 z-10 pt-1">
                <h2 className="text-lg font-bold text-white">Nuevo Cliente</h2>
                <button onClick={() => setShowNuevoClienteModal(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>

              <div className="space-y-3">
                <Input label="Nombre completo *" value={nuevoClienteForm.nombre} onChange={(v) => setNuevoClienteForm({ ...nuevoClienteForm, nombre: v })} placeholder="Ej: Juan Pérez" />
                <Input label="DNI / NIF" value={nuevoClienteForm.dni} onChange={(v) => setNuevoClienteForm({ ...nuevoClienteForm, dni: v })} placeholder="12345678A" />
                <Input label="Teléfono" value={nuevoClienteForm.telefono} onChange={(v) => setNuevoClienteForm({ ...nuevoClienteForm, telefono: v })} placeholder="600000000" />
                <Input label="Email" value={nuevoClienteForm.email} onChange={(v) => setNuevoClienteForm({ ...nuevoClienteForm, email: v })} placeholder="cliente@email.com" />
                <Input label="Dirección" value={nuevoClienteForm.direccion} onChange={(v) => setNuevoClienteForm({ ...nuevoClienteForm, direccion: v })} placeholder="Calle..." />
                
                {/* Código Postal y Localidad autocompletada por API */}
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    label="Código Postal (CP)"
                    value={nuevoClienteForm.cp}
                    onChange={(v) => handleCPChange(v)}
                    placeholder="29001"
                  />
                  <Input
                    label={buscandoCP ? "Localidad (buscando...)" : "Localidad"}
                    value={nuevoClienteForm.localidad}
                    onChange={(v) => setNuevoClienteForm({ ...nuevoClienteForm, localidad: v })}
                    placeholder="Málaga"
                  />
                </div>
              </div>

              {/* Opcional: datos primer vehículo con campos requeridos */}
              <div className="pt-3 border-t border-bg-700 space-y-2">
                <p className="text-xs font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1.5"><Car className="w-4 h-4" /> Datos del vehículo (Opcional)</p>
                <Input label="Matrícula" value={nuevoVehFormModal.matricula} onChange={(v) => setNuevoVehFormModal({ ...nuevoVehFormModal, matricula: v })} placeholder="1234ABC" />
                <div className="grid grid-cols-2 gap-2">
                  <Input label="Marca" value={nuevoVehFormModal.marca} onChange={(v) => setNuevoVehFormModal({ ...nuevoVehFormModal, marca: v })} placeholder="Volkswagen" />
                  <Input label="Modelo" value={nuevoVehFormModal.modelo} onChange={(v) => setNuevoVehFormModal({ ...nuevoVehFormModal, modelo: v })} placeholder="Golf" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input label="Código Color" value={nuevoVehFormModal.codigo_color} onChange={(v) => setNuevoVehFormModal({ ...nuevoVehFormModal, codigo_color: v })} placeholder="Ej: LY9B" />
                  <Input label="VIN / Bastidor" value={nuevoVehFormModal.vin} onChange={(v) => setNuevoVehFormModal({ ...nuevoVehFormModal, vin: v })} placeholder="Opcional" />
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <Button onClick={handleGuardarNuevoCliente} className="flex-1">
                  {nuevoVehFormModal.matricula.trim() || clienteGuardadoId ? 'Generar Presupuesto' : 'Guardar Cliente'}
                </Button>
                <Button variant="secondary" onClick={() => {
                  setShowNuevoClienteModal(false)
                  setClienteGuardadoId(null)
                }}>Cancelar</Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* MODAL FORMULARIO NUEVO VEHÍCULO */}
      {showNuevoVehiculoModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto" onClick={() => setShowNuevoVehiculoModal(null)}>
          <Card className="w-full max-w-md p-5 sm:p-6 my-auto max-h-[92vh] overflow-y-auto scrollbar-thin">
            <div onClick={(e) => e.stopPropagation()} className="space-y-4 pb-44 sm:pb-6">
              <div className="flex items-center justify-between border-b border-bg-700 pb-3 sticky top-0 bg-bg-800 z-10 pt-1">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Plus className="w-5 h-5 text-amber-400" /> <Car className="w-5 h-5 text-amber-400" /> Añadir Vehículo
                </h2>
                <button onClick={() => setShowNuevoVehiculoModal(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>

              <div className="space-y-3">
                <Input label="Matrícula *" value={nuevoVehFormModal.matricula} onChange={(v) => setNuevoVehFormModal({ ...nuevoVehFormModal, matricula: v })} placeholder="1234ABC" />
                <div className="grid grid-cols-2 gap-2">
                  <Input label="Marca" value={nuevoVehFormModal.marca} onChange={(v) => setNuevoVehFormModal({ ...nuevoVehFormModal, marca: v })} placeholder="Volkswagen" />
                  <Input label="Modelo" value={nuevoVehFormModal.modelo} onChange={(v) => setNuevoVehFormModal({ ...nuevoVehFormModal, modelo: v })} placeholder="Golf" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input label="Código Color" value={nuevoVehFormModal.codigo_color} onChange={(v) => setNuevoVehFormModal({ ...nuevoVehFormModal, codigo_color: v })} placeholder="Ej: LY9B / Rojo" />
                  <Input label="VIN / Bastidor" value={nuevoVehFormModal.vin} onChange={(v) => setNuevoVehFormModal({ ...nuevoVehFormModal, vin: v })} placeholder="Opcional" />
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  onClick={() => handleAñadirVehiculoModal(showNuevoVehiculoModal)}
                  className="flex-1 py-3 px-4 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/60 hover:bg-amber-500/30 flex items-center justify-center transition-all active:scale-95 shadow-[0_0_12px_rgba(245,158,11,0.3)]"
                  title="Añadir Vehículo"
                  aria-label="Añadir Vehículo"
                >
                  <div className="flex items-center justify-center gap-2 font-bold text-sm">
                    <Car className="w-6 h-6" />
                    <Plus className="w-5 h-5 -ml-1" />
                  </div>
                </button>
                <Button variant="ghost" onClick={() => setShowNuevoVehiculoModal(null)} className="px-6">
                  <span className="flex items-center gap-1.5"><ArrowLeft className="w-4 h-4" /> Volver</span>
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* VISOR GLOBAL DE IMÁGENES DE VEHÍCULO CON BOTÓN DE CÁMARA */}
      <GlobalImageViewer
        isOpen={!!viewingVehFotos}
        onClose={() => setViewingVehFotos(null)}
        title={viewingVehFotos ? `Vehículo ${viewingVehFotos.matricula}` : "Imágenes"}
        images={(() => {
          if (!viewingVehFotos) return []
          for (const cId in vehiculos) {
            const found = vehiculos[cId].find(v => v.id === viewingVehFotos.vehId)
            if (found) return found.fotos ?? []
          }
          return []
        })()}
        onAddImage={async (dataUrl) => {
          if (!viewingVehFotos) return
          for (const cId in vehiculos) {
            const found = vehiculos[cId].find(v => v.id === viewingVehFotos.vehId)
            if (found) {
              const nuevasFotos = [...(found.fotos ?? []), dataUrl]
              await supabase.from('vehiculos').update({ fotos: nuevasFotos }).eq('id', found.id)
              const { data: vehs } = await supabase.from('vehiculos').select('*').eq('cliente_id', cId)
              setVehiculos(prev => ({ ...prev, [cId]: vehs ?? [] }))
              break
            }
          }
        }}
        onDeleteImage={async (index) => {
          if (!viewingVehFotos) return
          for (const cId in vehiculos) {
            const found = vehiculos[cId].find(v => v.id === viewingVehFotos.vehId)
            if (found && found.fotos) {
              const nuevasFotos = [...found.fotos]
              nuevasFotos.splice(index, 1)
              await supabase.from('vehiculos').update({ fotos: nuevasFotos }).eq('id', found.id)
              const { data: vehs } = await supabase.from('vehiculos').select('*').eq('cliente_id', cId)
              setVehiculos(prev => ({ ...prev, [cId]: vehs ?? [] }))
              break
            }
          }
        }}
      />
    </div>
  )
}
