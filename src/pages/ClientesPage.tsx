import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import type { Cliente, Vehiculo, Presupuesto, Factura, Configuracion } from '../lib/types'
import { PageHeader, Card, Button, Badge, EmptyState, Input, MatriculaBadge } from '../components/UI'
import {
  Search, Phone, MessageCircle, Edit3, Car, Check,
  X, Plus, Trash2, Printer, Mail, ArrowLeft, Image as ImageIcon, Users, Save
} from 'lucide-react'
import { sendPresupuestoByEmail, downloadPresupuestoPDF } from '../lib/pdfGenerator'
import { GlobalImageViewer } from '../components/GlobalImageViewer'
import { fetchExpedienteFotos, saveExpedienteFoto } from '../lib/expedienteService'
import { FacturaIcon, NuevoPresupuestoA4Icon, ExpedienteFolderIcon, HistorialPresupuestoA4Icon, WhatsAppWithPhoneIcon, NuevoVehiculoPlusIcon } from '../components/CustomIcons'
import { getDropdownStaggerVariants, dropdownItemVariants, dropdownPanelVariants } from '../lib/dropdownAnimations'
import { getExpediente } from '../lib/utils'

export function ClientesPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [showNuevoClienteModal, setShowNuevoClienteModal] = useState(false)
  const [vehiculos, setVehiculos] = useState<Record<string, Vehiculo[]>>({})
  const [search, setSearch] = useState('')
  const [showSearchInput, setShowSearchInput] = useState(false)
  const [loading, setLoading] = useState(true)
  const [expandedClienteId, setExpandedClienteId] = useState<string | null>(location.state?.expandClienteId ?? null)
  const [showNuevoExpedienteInfo, setShowNuevoExpedienteInfo] = useState<boolean>(!!location.state?.fromNuevoExpediente)
  const infoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (location.state?.openNewModal) {
      setShowNuevoClienteModal(true)
    }
  }, [location.state?.openNewModal])
  useEffect(() => {
    if (location.state?.fromNuevoExpediente) {
      setShowNuevoExpedienteInfo(true)
      if (infoTimerRef.current) clearTimeout(infoTimerRef.current)
      infoTimerRef.current = setTimeout(() => {
        setShowNuevoExpedienteInfo(false)
      }, 6000)
    }
    return () => {
      if (infoTimerRef.current) clearTimeout(infoTimerRef.current)
    }
  }, [location.state?.fromNuevoExpediente])

  useEffect(() => {
    if (location.state?.expandClienteId) {
      const cId = location.state.expandClienteId
      setExpandedClienteId(cId)
      if (location.state?.openSubpanel) {
        const sub = location.state.openSubpanel as 'editar' | 'vehiculos' | 'presupuestos' | 'facturas'
        setActiveSubpanel({ [cId]: sub })
        if (sub === 'vehiculos') {
          loadVehiculosCliente(cId)
        } else if (sub === 'presupuestos') {
          loadPresupuestosCliente(cId)
        } else if (sub === 'facturas') {
          loadFacturasCliente(cId)
        } else if (sub === 'editar') {
          const cli = clientes.find(c => c.id === cId)
          if (cli) setEditForm({ ...cli })
        }
      }

      setTimeout(() => {
        const el = document.getElementById(`cliente-${cId}`)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 150)
    }
  }, [location.state, clientes])

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('gestarian-toggle-footer', { detail: { hide: showNuevoClienteModal } }))
    return () => {
      window.dispatchEvent(new CustomEvent('gestarian-toggle-footer', { detail: { hide: false } }))
    }
  }, [showNuevoClienteModal])

  // Subpaneles por cliente
  const [activeSubpanel, setActiveSubpanel] = useState<Record<string, 'editar' | 'vehiculos' | 'presupuestos' | 'facturas' | null>>({})

  // Estado formulario edición cliente
  const [editForm, setEditForm] = useState<Partial<Cliente>>({})

  // Presupuestos y facturas por cliente
  const [presupuestosCliente, setPresupuestosCliente] = useState<Record<string, Presupuesto[]>>({})
  const [facturasCliente, setFacturasCliente] = useState<Record<string, Factura[]>>({})

  // Vista individual de Presupuesto
  const [viewPresupuesto, setViewPresupuesto] = useState<{ presup: Presupuesto; cliente: Cliente; vehiculo: Vehiculo | null } | null>(null)
  const [config, setConfig] = useState<Configuracion | null>(null)

  // Estado selección de vehículos y fotos
  const [viewingVehFotos, setViewingVehFotos] = useState<{ vehId: string; matricula: string } | null>(null)
  const [confirmDeleteVehId, setConfirmDeleteVehId] = useState<string | null>(null)
  const [expedienteFotos, setExpedienteFotos] = useState<string[]>([])
  const [clienteGuardadoId, setClienteGuardadoId] = useState<string | null>(null)

  useEffect(() => {
    if (viewingVehFotos) {
      let cId: string | undefined
      let vFotos: string[] = []
      for (const id in vehiculos) {
        const found = vehiculos[id].find(v => v.id === viewingVehFotos.vehId)
        if (found) {
          cId = id
          vFotos = found.fotos || []
          break
        }
      }
      fetchExpedienteFotos(cId, viewingVehFotos.vehId, vFotos).then(setExpedienteFotos)
    } else {
      setExpedienteFotos([])
    }
  }, [viewingVehFotos, vehiculos])

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
    const { data } = await supabase.from('clientes').select('*').order('created_at', { ascending: true })
    if (data) {
      // Si la columna numero ya existe en DB, la usamos; si no, la calculamos como ordinal
      const clientesConNumero = data.map((c: Cliente, idx: number) => ({
        ...c,
        numero: c.numero ?? (idx + 1)
      }))
      // Ordenar por número de cliente en orden decreciente
      const sorted = [...clientesConNumero].sort((a, b) => (b.numero ?? 0) - (a.numero ?? 0))
      setClientes(sorted)

      // Cargar vehículos de todos los clientes
      const vehiculoMap: Record<string, Vehiculo[]> = {}
      for (const c of data) {
        const { data: vehs } = await supabase.from('vehiculos').select('*').eq('cliente_id', c.id)
        vehiculoMap[c.id] = vehs ?? []
      }
      setVehiculos(vehiculoMap)

      // Cargar todos los presupuestos de todos los clientes en bloque
      const { data: allPresups } = await supabase.from('presupuestos').select('*').order('created_at', { ascending: false })
      if (allPresups) {
        const pMap: Record<string, Presupuesto[]> = {}
        for (const p of allPresups) {
          if (p.cliente_id) {
            if (!pMap[p.cliente_id]) pMap[p.cliente_id] = []
            pMap[p.cliente_id].push(p as Presupuesto)
          }
        }
        setPresupuestosCliente(pMap)
      }

      // Cargar todas las facturas de todos los clientes en bloque
      const { data: allFacts } = await supabase.from('facturas').select('*').order('created_at', { ascending: false })
      if (allFacts) {
        const fMap: Record<string, Factura[]> = {}
        for (const f of allFacts) {
          if (f.cliente_id) {
            if (!fMap[f.cliente_id]) fMap[f.cliente_id] = []
            fMap[f.cliente_id].push(f as Factura)
          }
        }
        setFacturasCliente(fMap)
      }
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
      setActiveSubpanel(prev => ({ ...prev, [cliente.id]: null }))
    } else {
      setExpandedClienteId(cliente.id)
      setEditForm(cliente)
      setActiveSubpanel(prev => ({ ...prev, [cliente.id]: 'vehiculos' }))
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



  // Estados de formularios y ventanas emergentes (Pop-up)
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
  async function handleGuardarNuevoCliente(generarPresupuesto: boolean = false) {
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

    // Calcular el numero correlativo máximo para asignarlo al nuevo cliente
    const { data: allClientes } = await supabase.from('clientes').select('numero').order('numero', { ascending: false }).limit(1)
    const maxNumero = allClientes?.[0]?.numero ?? 0
    clientePayload.numero = maxNumero + 1

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

      let nuevoVehiculoId: string | null = null

      if (clienteId && nuevoVehFormModal.matricula.trim()) {
        const vehPayload: any = {
          cliente_id: clienteId,
          matricula: nuevoVehFormModal.matricula.toUpperCase(),
          marca: nuevoVehFormModal.marca || null,
          modelo: nuevoVehFormModal.modelo || null,
          vin: nuevoVehFormModal.vin || null,
        }
        if (nuevoVehFormModal.codigo_color) vehPayload.codigo_color = nuevoVehFormModal.codigo_color
        
        let vehRes = await supabase.from('vehiculos').insert(vehPayload).select().maybeSingle()
        if (vehRes.error && vehRes.error.message.includes('column')) {
          delete vehPayload.codigo_color
          vehRes = await supabase.from('vehiculos').insert(vehPayload).select().maybeSingle()
        }
        nuevoVehiculoId = vehRes.data?.id || null
      }

      setClienteGuardadoId(clienteId || null)
      await loadClientes()
      setClientePopup(true)
      setTimeout(() => setClientePopup(false), 3000)

      // Si se solicita generar presupuesto o se rellenó matrícula
      if (clienteId && (generarPresupuesto || nuevoVehFormModal.matricula.trim())) {
        navigate('/presupuestos', { state: { clienteId, vehiculoId: nuevoVehiculoId, openForm: true } })
        setShowNuevoClienteModal(false)
        setNuevoClienteForm({ nombre: '', dni: '', telefono: '', email: '', direccion: '', cp: '', localidad: '' })
        setNuevoVehFormModal({ matricula: '', marca: '', modelo: '', codigo_color: '', vin: '' })
      } else {
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
      {/* Pop-up informativo al llegar desde NUEVO EXPEDIENTE (Globo estático no animado, centrado en pantalla, 80% de ancho, 5s de duración, fade-off) */}
      <AnimatePresence>
        {showNuevoExpedienteInfo && (
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] bg-slate-900/95 backdrop-blur-md border-2 border-cyan-400 text-white p-6 sm:p-8 rounded-3xl shadow-[0_0_50px_rgba(6,182,212,0.5)] flex flex-col sm:flex-row items-center justify-between gap-5 text-center sm:text-left select-none w-[80%] max-w-2xl"
          >
            <p className="flex-1 text-2xl sm:text-3xl md:text-4xl font-extrabold text-white leading-relaxed tracking-wide">
              Crea un nuevo cliente, busca usando la lupa o selecciónalo del listado.
            </p>
            <button
              onClick={() => setShowNuevoExpedienteInfo(false)}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/50 flex items-center justify-center shrink-0 transition-all active:scale-95 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
              title="Cerrar"
              aria-label="Cerrar aviso"
            >
              <X className="w-8 h-8 stroke-[2.5]" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

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
      <PageHeader title="CLIENTES" doubleTitleSize={true}>
        <button
          onClick={() => navigate(-1)}
          className="w-[60px] h-[60px] rounded-2xl bg-slate-800/80 text-white border border-white/20 flex items-center justify-center hover:bg-slate-700 transition-transform active:scale-95 shrink-0 shadow-[0_0_15px_rgba(255,255,255,0.1)]"
          title="Volver"
          aria-label="Volver"
        >
          <ArrowLeft className="w-7 h-7" />
        </button>
      </PageHeader>

      {/* Recuadro de búsqueda con botón + (se Oculta al estar dentro de la ficha de un cliente expandido) */}
      {!expandedClienteId && (
        <div className="flex gap-4 items-center w-full">
          {showSearchInput ? (
            <div className="relative flex-1 flex items-center gap-2">
              <input
                type="text"
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar cliente..."
                className="flex-1 bg-bg-800 border border-bg-600 rounded-xl px-4 py-3 text-sm text-white focus:border-cyan-500 focus:outline-none transition-colors shadow-inner"
              />
              <button
                onClick={() => {
                  setShowSearchInput(false)
                  setSearch('')
                }}
                className="text-slate-400 hover:text-white p-2 shrink-0"
                title="Cerrar búsqueda"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => setShowSearchInput(true)}
                className="w-12 h-12 flex items-center justify-center text-slate-450 hover:text-white shrink-0 transition-transform active:scale-95 bg-transparent border-0 outline-none p-0"
                title="Buscar"
              >
                <Search className="w-8 h-8" />
              </button>
              <button
                onClick={() => setShowNuevoClienteModal(true)}
                className="flex-1 h-12 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/60 flex items-center justify-center hover:bg-cyan-500/30 transition-transform active:scale-95 font-extrabold shadow-[0_0_12px_rgba(8,145,178,0.3)] gap-1.5 uppercase text-sm tracking-wider"
                title="Añadir nuevo cliente"
                aria-label="Añadir nuevo cliente"
              >
                <Plus className="w-5 h-5" /> NUEVO CLIENTE
              </button>
            </>
          )}
        </div>
      )}

      {/* Listado de clientes por filas */}
      {loading ? (
        <div className="text-center py-12 text-slate-500">Cargando clientes...</div>
      ) : filteredClientes.length === 0 ? (
        <EmptyState icon={<Users className="w-10 h-10 text-cyan-400" />} title="No se encontraron clientes" subtitle="Utiliza el buscador o añade un cliente" />
      ) : (
        <motion.div layout className="space-y-4 mx-[-1rem] sm:mx-[-1.5rem] lg:mx-[-2rem]">
          {filteredClientes.map((cliente) => {
            const isExpanded = expandedClienteId === cliente.id
            const subpanel = activeSubpanel[cliente.id]
            const clientVehs = vehiculos[cliente.id] ?? []
            const clientFacts = facturasCliente[cliente.id] ?? []

            return (
              <motion.div
                layout
                key={cliente.id}
                id={`cliente-${cliente.id}`}
                transition={{ layout: { duration: 0.28, ease: "easeInOut" } }}
                className={`rounded-2xl border transition-all duration-300 w-[98%] mx-auto shadow-md ${
                  isExpanded
                    ? 'border-cyan-500/60 bg-bg-800 ring-1 ring-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.15)] z-10'
                    : expandedClienteId
                    ? 'border-bg-700/60 bg-bg-800/70 opacity-70 brightness-[0.70]'
                    : 'border-bg-700 bg-bg-800/80 hover:border-bg-600'
                }`}
              >
                {/* Fila principal del cliente — Justificación izquierda */}
                <div
                  onClick={() => toggleCliente(cliente)}
                  className="flex flex-col items-start justify-center py-3 px-1.5 cursor-pointer hover:bg-bg-700/50 transition-colors w-full"
                >
                  {/* Número y Nombre en una línea justificada a la izquierda, tamaño x0.8 (text-2xl) */}
                  <div className="w-[98%] mx-auto flex items-center px-1 overflow-hidden">
                    <span className="text-cyan-400 font-medium text-2xl shrink-0 mr-3">
                      {cliente.numero ?? '?'}
                    </span>
                    <span className="font-semibold text-white text-2xl truncate text-left flex-1 pr-1">
                      {cliente.nombre}
                    </span>
                  </div>
                </div>

                {/* Panel desplegable con botones de subsecciones */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      key="dropdown-panel"
                      initial="hidden"
                      animate="show"
                      exit="exit"
                      variants={dropdownPanelVariants}
                      className="overflow-hidden border-t border-bg-700 bg-bg-900/60"
                    >
                      <div className="px-4 pb-4 pt-4 space-y-4">
                        {/* Fila de 8 botones principales con animación escalonada (1.5s total del primero al último) */}
                        <motion.div
                          initial="hidden"
                          animate="show"
                          exit="exit"
                          variants={getDropdownStaggerVariants(8, 1.5)}
                          className="grid grid-cols-4 sm:grid-cols-8 gap-4 w-[98%] mx-auto justify-items-center py-4 border-b border-bg-800 pb-5"
                        >
                          {/* 1. Nuevo Presupuesto */}
                          <motion.div
                            variants={dropdownItemVariants}
                            className="flex flex-col items-center justify-center w-full"
                          >
                            <button
                              onClick={() => navigate('/presupuestos', { state: { clienteId: cliente.id, openForm: true } })}
                              className="text-cyan-400 hover:text-cyan-300 transition-all hover:scale-110 active:scale-95 bg-transparent border-0 p-0 outline-none"
                              title="Nuevo Presupuesto"
                            >
                              <NuevoPresupuestoA4Icon className="w-[60px] h-[60px]" />
                            </button>
                          </motion.div>

                          {/* 2. Expedientes */}
                          <motion.div
                            variants={dropdownItemVariants}
                            className="flex flex-col items-center justify-center w-full"
                          >
                            <button
                              onClick={() => navigate('/expedientes', { state: { search: cliente.nombre } })}
                              className="text-yellow-500 hover:text-yellow-400 transition-all hover:scale-110 active:scale-95 bg-transparent border-0 p-0 outline-none"
                              title="Expedientes"
                            >
                              <ExpedienteFolderIcon className="w-[60px] h-[60px]" />
                            </button>
                          </motion.div>

                          {/* 3. Editar */}
                          <motion.div
                            variants={dropdownItemVariants}
                            className="flex flex-col items-center justify-center w-full"
                          >
                            <button
                              onClick={() => toggleSubpanel(cliente.id, 'editar')}
                              className={`transition-all hover:scale-110 active:scale-95 bg-transparent border-0 p-0 outline-none ${
                                subpanel === 'editar' ? 'text-cyan-300 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]' : 'text-cyan-500 hover:text-cyan-400'
                              }`}
                              title="Editar"
                            >
                              <Edit3 className="w-[60px] h-[60px]" strokeWidth={1} />
                            </button>
                          </motion.div>

                          {/* 4. Teléfono */}
                          <motion.div
                            variants={dropdownItemVariants}
                            className="flex flex-col items-center justify-center w-full"
                          >
                            {cliente.telefono ? (
                              <a
                                href={`tel:${cliente.telefono.replace(/\s/g, '')}`}
                                className="text-indigo-400 hover:text-indigo-300 transition-all hover:scale-110 active:scale-95 bg-transparent border-0 p-0 outline-none"
                                title="Llamar"
                              >
                                <Phone className="w-[60px] h-[60px]" strokeWidth={1} />
                              </a>
                            ) : (
                              <div className="text-slate-650 opacity-40 cursor-not-allowed">
                                <Phone className="w-[60px] h-[60px]" strokeWidth={1} />
                              </div>
                            )}
                          </motion.div>

                          {/* 5. Historial de Presupuestos (Justo debajo de Nuevo Presupuesto, sin +) */}
                          <motion.div
                            variants={dropdownItemVariants}
                            className="flex flex-col items-center justify-center w-full"
                          >
                            <button
                              onClick={() => toggleSubpanel(cliente.id, 'presupuestos')}
                              className={`relative transition-all hover:scale-110 active:scale-95 bg-transparent border-0 p-0 outline-none ${
                                subpanel === 'presupuestos' ? 'text-cyan-300 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]' : 'text-cyan-400 hover:text-cyan-300'
                              }`}
                              title="Historial de Presupuestos"
                            >
                              <HistorialPresupuestoA4Icon className="w-[60px] h-[60px]" />
                              <span className="absolute -top-1.5 -right-2 min-w-[20px] h-5 px-1.5 rounded-full bg-cyan-600 text-white text-[11px] font-bold flex items-center justify-center shadow">
                                {(presupuestosCliente[cliente.id] ?? []).length}
                              </span>
                            </button>
                          </motion.div>

                          {/* 6. WhatsApp con teléfono dibujado dentro (A la derecha de Historial Presupuestos) */}
                          <motion.div
                            variants={dropdownItemVariants}
                            className="flex flex-col items-center justify-center w-full"
                          >
                            {cliente.telefono ? (
                              <a
                                href={`https://wa.me/${cliente.telefono.replace(/\s/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-green-400 hover:text-green-300 transition-all hover:scale-110 active:scale-95 bg-transparent border-0 p-0 outline-none"
                                title="WhatsApp"
                              >
                                <WhatsAppWithPhoneIcon className="w-[60px] h-[60px]" />
                              </a>
                            ) : (
                              <div className="text-slate-650 opacity-40 cursor-not-allowed">
                                <WhatsAppWithPhoneIcon className="w-[60px] h-[60px]" />
                              </div>
                            )}
                          </motion.div>

                          {/* 7. Vehículos */}
                          <motion.div
                            variants={dropdownItemVariants}
                            className="flex flex-col items-center justify-center w-full"
                          >
                            <button
                              onClick={() => toggleSubpanel(cliente.id, 'vehiculos')}
                              className={`relative transition-all hover:scale-110 active:scale-95 bg-transparent border-0 p-0 outline-none ${
                                subpanel === 'vehiculos' ? 'text-cyan-300 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]' : 'text-cyan-500 hover:text-cyan-400'
                              }`}
                              title="Vehículos"
                            >
                              <Car className="w-[60px] h-[60px]" strokeWidth={1} />
                              <span className="absolute -top-1.5 -right-2 min-w-[20px] h-5 px-1.5 rounded-full bg-cyan-600 text-white text-[11px] font-bold flex items-center justify-center shadow">
                                {clientVehs.length}
                              </span>
                            </button>
                          </motion.div>

                          {/* 8. Facturas */}
                          <motion.div
                            variants={dropdownItemVariants}
                            className="flex flex-col items-center justify-center w-full"
                          >
                            <button
                              onClick={() => toggleSubpanel(cliente.id, 'facturas')}
                              className={`relative transition-all hover:scale-110 active:scale-95 bg-transparent border-0 p-0 outline-none ${
                                subpanel === 'facturas' ? 'text-green-300 drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'text-green-500 hover:text-green-400'
                              }`}
                              title="Facturas"
                            >
                              <FacturaIcon className="w-[60px] h-[60px]" />
                              <span className="absolute -top-1.5 -right-2 min-w-[20px] h-5 px-1.5 rounded-full bg-green-600 text-white text-[11px] font-bold flex items-center justify-center shadow">
                                {clientFacts.length}
                              </span>
                            </button>
                          </motion.div>
                        </motion.div>

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

                    {/* SUBPANEL VEHÍCULOS (FLOTANTE SIN TARJETA, EXTENDIDO Y CON TIPOGRAFÍA GRANDE) */}
                    {subpanel === 'vehiculos' && (
                      <div className="py-2 px-1 space-y-4 w-full">
                        {clientVehs.length === 0 ? (
                          <div className="flex items-center justify-between py-3 px-2">
                            <p className="text-sm text-slate-400 italic">Sin vehículos registrados para este cliente.</p>
                            <button
                              onClick={() => setShowNuevoVehiculoModal(cliente.id)}
                              className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 hover:bg-cyan-500/30 flex items-center gap-1.5 text-xs font-bold transition-all active:scale-95 shadow-[0_0_10px_rgba(6,182,212,0.3)] uppercase"
                              title="Añadir vehículo"
                            >
                              <Plus className="w-4 h-4" />
                              <Car className="w-5 h-5" />
                              <span>Añadir vehículo</span>
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-4 w-full">
                            {clientVehs.map((v) => {
                              const isConfirmingDelete = confirmDeleteVehId === v.id

                              return (
                                <div key={v.id} className="relative py-3 border-b border-white/10 last:border-0">
                                  {/* Línea 1: Matrícula a la izquierda (x1.3) y a la derecha iconos de acciones */}
                                  <div className="flex items-center justify-between gap-3 mb-1.5">
                                    {/* Matrícula (x1.3) */}
                                    <div className="scale-110 sm:scale-125 origin-left shrink-0 py-0.5">
                                      <MatriculaBadge matricula={v.matricula} size="md" />
                                    </div>

                                    {/* Iconos de acciones flotantes a la derecha (sin recuadros, tamaño x3) */}
                                    <div className="flex items-center gap-4 sm:gap-5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                      {/* Icono Añadir vehículo (coche con + adentro, flotante sin recuadro, tamaño x3) */}
                                      <button
                                        onClick={() => setShowNuevoVehiculoModal(cliente.id)}
                                        className="text-cyan-400 hover:text-cyan-300 transition-all hover:scale-125 active:scale-95 bg-transparent border-0 p-0 outline-none flex items-center justify-center drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]"
                                        title="Añadir vehículo"
                                      >
                                        <NuevoVehiculoPlusIcon className="w-12 h-12 sm:w-14 sm:h-14" />
                                      </button>

                                      {/* Icono Imágenes del vehículo (flotante sin recuadro, tamaño x3) */}
                                      <button
                                        onClick={() => setViewingVehFotos({ vehId: v.id, matricula: v.matricula })}
                                        className="text-violet-400 hover:text-violet-300 transition-all hover:scale-125 active:scale-95 bg-transparent border-0 p-0 outline-none flex items-center justify-center drop-shadow-[0_0_8px_rgba(167,139,250,0.6)]"
                                        title={`Imágenes del vehículo (${v.fotos?.length ?? 0})`}
                                      >
                                        <ImageIcon className="w-11 h-11 sm:w-13 sm:h-13 stroke-[1.2]" />
                                      </button>

                                      {/* Icono Papelera roja (flotante sin recuadro, tamaño x3) */}
                                      <button
                                        onClick={() => setConfirmDeleteVehId(v.id)}
                                        className="text-red-500 hover:text-red-400 transition-all hover:scale-125 active:scale-95 bg-transparent border-0 p-0 outline-none flex items-center justify-center drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]"
                                        title="Eliminar vehículo"
                                      >
                                        <Trash2 className="w-11 h-11 sm:w-13 sm:h-13 stroke-[1.2]" />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Línea 2: Marca y modelo justo debajo (x1.6 de tipografía) */}
                                  <div className="flex items-center justify-between pt-1">
                                    <p className="text-[21px] sm:text-[23px] font-bold text-slate-200 tracking-wide">
                                      {v.marca || 'Sin marca'} {v.modelo ? `· ${v.modelo}` : ''}
                                    </p>
                                  </div>

                                  {/* Globo estático no animado de confirmación para eliminar */}
                                  {isConfirmingDelete && (
                                    <div className="mt-3 p-3.5 rounded-2xl bg-slate-900 border-2 border-red-500/80 shadow-[0_0_20px_rgba(239,68,68,0.35)] flex flex-col sm:flex-row items-center justify-between gap-3">
                                      <span className="text-sm sm:text-base font-bold text-white text-center sm:text-left">
                                        ¿Eliminar vehículo <strong className="text-red-400">{v.matricula}</strong>?
                                      </span>
                                      <div className="flex items-center gap-2 shrink-0">
                                        <button
                                          onClick={() => setConfirmDeleteVehId(null)}
                                          className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm font-bold border border-slate-700 transition-colors"
                                        >
                                          Cancelar
                                        </button>
                                        <button
                                          onClick={async () => {
                                            setConfirmDeleteVehId(null)
                                            await supabase.from('vehiculos').delete().eq('id', v.id)
                                            const { data: vehs } = await supabase.from('vehiculos').select('*').eq('cliente_id', cliente.id)
                                            setVehiculos(prev => ({ ...prev, [cliente.id]: vehs ?? [] }))
                                          }}
                                          className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs sm:text-sm font-bold shadow transition-colors"
                                        >
                                          Eliminar
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )}


                    {/* SUBPANEL PRESUPUESTOS */}
                    {subpanel === 'presupuestos' && (
                      <div className="p-4 bg-bg-800 rounded-xl border border-bg-700 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-widest">HISTORIAL DE PRESUPUESTOS</h4>
                        </div>

                        <div className="space-y-2">
                          {(presupuestosCliente[cliente.id] ?? []).length === 0 ? (
                            <div className="text-center py-6 text-slate-400 bg-bg-900/40 rounded-xl border border-bg-700/50">
                              <p className="text-sm font-semibold">Sin presupuestos registrados</p>
                            </div>
                          ) : (
                            (presupuestosCliente[cliente.id] ?? []).map((p) => {
                              const v = (vehiculos[cliente.id] ?? []).find(veh => veh.id === p.vehiculo_id) || null
                              const expNum = getExpediente(p, cliente, clientes)
                              const isSent = !!(p.enviado_email_at || p.enviado_whatsapp_at || (p.estado as string) === 'enviado' || (p as any).enviado)
                              
                              let borderClass = 'border-[3px] border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                              if (p.estado === 'aceptado') {
                                borderClass = 'border-[3px] border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                              } else if (isSent) {
                                borderClass = 'border-[3px] border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.2)]'
                              }

                              return (
                                <div
                                  key={p.id}
                                  onClick={() => navigate('/presupuestos', { state: { presupuestoId: p.id, clienteId: cliente.id, openForm: true } })}
                                  className={`bg-bg-900 p-3.5 rounded-xl text-xs cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] group shadow space-y-2 ${borderClass}`}
                                >
                                  {/* Línea 1: Número de presupuesto a la izquierda (celeste) y matrícula a la derecha */}
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-extrabold text-cyan-400 text-sm font-mono tracking-wide">
                                      {p.numero}
                                    </span>
                                    {v?.matricula && (
                                      <div className="shrink-0">
                                        <MatriculaBadge matricula={v.matricula} size="sm" />
                                      </div>
                                    )}
                                  </div>

                                  {/* Línea 2: Número de expediente a la izquierda (naranja) e importe a la derecha */}
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-bold text-amber-500 text-sm font-mono tracking-wide">
                                      {expNum}
                                    </span>
                                    <div className="text-slate-400">
                                      Total: <strong className="text-white text-sm">{p.total?.toFixed(2) ?? '0.00'} €</strong>
                                    </div>
                                  </div>
                                </div>
                              )
                            })
                          )}
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
                            return (
                              <div
                                key={f.id}
                                onClick={() => navigate('/facturas', { state: { facturaNumero: f.numero } })}
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
                </motion.div>
              )}
            </AnimatePresence>
              </motion.div>
            )
          })}
        </motion.div>
      )}

      {/* MODAL FORMULARIO NUEVO CLIENTE */}
      {showNuevoClienteModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-start justify-center p-2 sm:p-4 overflow-y-auto" onClick={() => setShowNuevoClienteModal(false)}>
          <Card className="w-full max-w-lg p-6 sm:p-8 mt-4 sm:mt-12 mb-8 max-h-[92vh] overflow-y-auto scrollbar-thin">
            <div onClick={(e) => e.stopPropagation()} className="space-y-5 pb-44 sm:pb-6">
              <div className="flex items-center justify-between border-b border-bg-700 pb-4 sticky top-0 bg-bg-800 z-10 pt-1">
                <h2 className="text-3xl sm:text-4xl font-black text-sky-400 tracking-wide">Nuevo Cliente</h2>
                <button onClick={() => setShowNuevoClienteModal(false)} className="text-slate-400 hover:text-white p-1"><X className="w-7 h-7" /></button>
              </div>

              <div className="space-y-5">
                <Input
                  label="Nombre completo *"
                  labelClassName="text-lg sm:text-2xl font-bold text-white/90"
                  inputClassName="text-2xl sm:text-3xl py-4 px-5 font-bold"
                  value={nuevoClienteForm.nombre}
                  onChange={(v) => setNuevoClienteForm({ ...nuevoClienteForm, nombre: v })}
                  placeholder="Ej: Juan Pérez"
                  enterKeyHint="next"
                />
                <Input
                  label="DNI / NIF"
                  labelClassName="text-lg sm:text-2xl font-bold text-white/90"
                  inputClassName="text-2xl sm:text-3xl py-4 px-5 uppercase font-bold"
                  value={nuevoClienteForm.dni}
                  onChange={(v) => setNuevoClienteForm({ ...nuevoClienteForm, dni: v })}
                  placeholder="12345678A"
                  inputMode="numeric"
                  enterKeyHint="next"
                />
                <Input
                  label="Teléfono"
                  labelClassName="text-lg sm:text-2xl font-bold text-white/90"
                  inputClassName="text-2xl sm:text-3xl py-4 px-5 font-bold"
                  value={nuevoClienteForm.telefono}
                  onChange={(v) => setNuevoClienteForm({ ...nuevoClienteForm, telefono: v })}
                  placeholder="600000000"
                  type="tel"
                  inputMode="numeric"
                  enterKeyHint="next"
                />
                <Input
                  label="Email"
                  labelClassName="text-lg sm:text-2xl font-bold text-white/90"
                  inputClassName="text-2xl sm:text-3xl py-4 px-5 font-bold"
                  value={nuevoClienteForm.email}
                  onChange={(v) => setNuevoClienteForm({ ...nuevoClienteForm, email: v })}
                  placeholder="cliente@email.com"
                  type="email"
                  inputMode="email"
                  enterKeyHint="next"
                />
                <Input
                  label="Dirección"
                  labelClassName="text-lg sm:text-2xl font-bold text-white/90"
                  inputClassName="text-2xl sm:text-3xl py-4 px-5 font-bold"
                  value={nuevoClienteForm.direccion}
                  onChange={(v) => setNuevoClienteForm({ ...nuevoClienteForm, direccion: v })}
                  placeholder="Calle..."
                  enterKeyHint="next"
                />
                
                {/* Código Postal y Localidad autocompletada por API */}
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Código Postal (CP)"
                    labelClassName="text-base sm:text-xl font-bold text-white/90"
                    inputClassName="text-2xl sm:text-3xl py-4 px-5 font-bold"
                    value={nuevoClienteForm.cp}
                    onChange={(v) => handleCPChange(v)}
                    placeholder="29001"
                    inputMode="numeric"
                    enterKeyHint="next"
                  />
                  <Input
                    label={buscandoCP ? "Localidad (buscando...)" : "Localidad"}
                    labelClassName="text-base sm:text-xl font-bold text-white/90"
                    inputClassName="text-2xl sm:text-3xl py-4 px-5 font-bold"
                    value={nuevoClienteForm.localidad}
                    onChange={(v) => setNuevoClienteForm({ ...nuevoClienteForm, localidad: v })}
                    placeholder="Málaga"
                    enterKeyHint="next"
                  />
                </div>
              </div>

              {/* Opcional: datos primer vehículo con campos requeridos */}
              <div className="pt-4 border-t border-bg-700 space-y-4">
                <p className="text-base sm:text-lg font-extrabold text-amber-400 uppercase tracking-widest flex items-center gap-2">
                  <Car className="w-6 h-6" /> Datos del vehículo (Opcional)
                </p>
                <Input
                  label="Matrícula"
                  labelClassName="text-lg sm:text-2xl font-bold text-white/90"
                  inputClassName="text-2xl sm:text-3xl py-4 px-5 uppercase font-mono font-black"
                  value={nuevoVehFormModal.matricula}
                  onChange={(v) => setNuevoVehFormModal({ ...nuevoVehFormModal, matricula: v })}
                  placeholder="1234ABC"
                  inputMode="numeric"
                  enterKeyHint="next"
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Marca"
                    labelClassName="text-base sm:text-xl font-bold text-white/90"
                    inputClassName="text-2xl sm:text-3xl py-4 px-5 font-bold"
                    value={nuevoVehFormModal.marca}
                    onChange={(v) => setNuevoVehFormModal({ ...nuevoVehFormModal, marca: v })}
                    placeholder="Volkswagen"
                    enterKeyHint="next"
                  />
                  <Input
                    label="Modelo"
                    labelClassName="text-base sm:text-xl font-bold text-white/90"
                    inputClassName="text-2xl sm:text-3xl py-4 px-5 font-bold"
                    value={nuevoVehFormModal.modelo}
                    onChange={(v) => setNuevoVehFormModal({ ...nuevoVehFormModal, modelo: v })}
                    placeholder="Golf"
                    enterKeyHint="next"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Código Color"
                    labelClassName="text-base sm:text-xl font-bold text-white/90"
                    inputClassName="text-2xl sm:text-3xl py-4 px-5 font-bold"
                    value={nuevoVehFormModal.codigo_color}
                    onChange={(v) => setNuevoVehFormModal({ ...nuevoVehFormModal, codigo_color: v })}
                    placeholder="Ej: LY9B"
                    enterKeyHint="next"
                  />
                  <Input
                    label="VIN / Bastidor"
                    labelClassName="text-base sm:text-xl font-bold text-white/90"
                    inputClassName="text-2xl sm:text-3xl py-4 px-5 font-bold"
                    value={nuevoVehFormModal.vin}
                    onChange={(v) => setNuevoVehFormModal({ ...nuevoVehFormModal, vin: v })}
                    placeholder="Opcional"
                    enterKeyHint="done"
                  />
                </div>
              </div>

              {/* Botón ancho completo: Guardar Cliente y generar presupuesto */}
              <div className="pt-4 space-y-3">
                <button
                  onClick={() => handleGuardarNuevoCliente(true)}
                  className="w-full py-4 px-5 rounded-2xl bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border border-cyan-500/60 transition-transform active:scale-95 font-extrabold text-base sm:text-lg uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                >
                  <Plus className="w-5 h-5" /> Guardar Cliente y generar presupuesto
                </button>

                {/* Botones inferiores: Guardar Cliente y Cancelar */}
                <div className="flex gap-3">
                  <Button onClick={() => handleGuardarNuevoCliente(false)} size="md" className="flex-1 text-lg sm:text-xl font-bold py-4">
                    Guardar Cliente
                  </Button>
                  <Button variant="secondary" size="md" className="text-lg font-bold px-6 py-4" onClick={() => {
                    setShowNuevoClienteModal(false)
                    setClienteGuardadoId(null)
                  }}>
                    Cancelar
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* MODAL FORMULARIO NUEVO VEHÍCULO (POSICIONADO ARRIBA PEGADO AL HEADER) */}
      {showNuevoVehiculoModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-start justify-center p-3 sm:p-4 pt-3 sm:pt-6 overflow-y-auto" onClick={() => setShowNuevoVehiculoModal(null)}>
          <Card className="w-full max-w-md p-5 sm:p-6 mt-1 mb-auto max-h-[90vh] overflow-y-auto scrollbar-thin border-2 border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.25)]">
            <div onClick={(e) => e.stopPropagation()} className="space-y-4 pb-2">
              <div className="flex items-center justify-between border-b border-bg-700 pb-3 sticky top-0 bg-bg-800 z-10 pt-1">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Plus className="w-5 h-5 text-amber-400" /> <Car className="w-5 h-5 text-amber-400" /> Añadir Vehículo
                </h2>
                <button onClick={() => setShowNuevoVehiculoModal(null)} className="text-slate-400 hover:text-white p-1"><X className="w-5 h-5" /></button>
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
        matricula={viewingVehFotos?.matricula}
        images={expedienteFotos}
        onAddImage={async (dataUrl) => {
          if (!viewingVehFotos) return
          await saveExpedienteFoto(dataUrl, null, viewingVehFotos.vehId)
          setExpedienteFotos(prev => [...prev, dataUrl])
        }}
        onDeleteImage={async (index) => {
          setExpedienteFotos(prev => prev.filter((_, i) => i !== index))
        }}
      />
    </div>
  )
}
