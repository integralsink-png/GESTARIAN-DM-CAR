import { PageHeader, Card, EmptyState, Button, Badge, Input } from '../components/UI'
import { OcrInvoiceScanner } from '../components/OcrInvoiceScanner'
import { Receipt, Truck, AlertTriangle, UserCog, Plus, X, Trash2, Search, Save, ArrowLeft, Camera, Check, Mail, Phone, MessageCircle, Edit2, ChevronDown, ChevronUp } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useToast } from '../lib/ToastContext'
import type { Usuario, RolUsuario, Proveedor, FacturaRecibida, PagoRecibida, Concepto, Incidencia, PrioridadIncidencia, EstadoIncidencia, Cliente, Vehiculo, Presupuesto } from '../lib/types'

export { ClienteAdminPage } from './ClienteAdminPage'
export { VehiculoAdminPage } from './VehiculoAdminPage'
export { ExpedientePage } from './ExpedientePage'

import { NuevaFacturaRecibidaIcon } from '../components/CustomIcons'

/* ──────────────── Facturas Recibidas (RFP) ──────────────── */
export function FacturasRecibidasPage() {
  const { showToast } = useToast()
  const [facturas, setFacturas] = useState<FacturaRecibida[]>([])
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([])
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [showSearchInput, setShowSearchInput] = useState(false)
  const [selectedFactura, setSelectedFactura] = useState<FacturaRecibida | null>(null)
  const [nuevoAbono, setNuevoAbono] = useState('')
  const [metodoPago, setMetodoPago] = useState('Transferencia')
  const [reciboFotoPreview, setReciboFotoPreview] = useState<string | null>(null)
  const [viewerFoto, setViewerFoto] = useState<string | null>(null)
  const receiptFileInputRef = useRef<HTMLInputElement>(null)
  const formReceiptFileInputRef = useRef<HTMLInputElement>(null)

  // Estados para búsqueda rápida y creación de proveedor en el modal
  const [showProveedorSearch, setShowProveedorSearch] = useState(false)
  const [proveedorSearchText, setProveedorSearchText] = useState('')
  const [showNuevoProveedorModal, setShowNuevoProveedorModal] = useState(false)
  const [nuevoProveedorNombre, setNuevoProveedorNombre] = useState('')
  const [nuevoProveedorCif, setNuevoProveedorCif] = useState('')
  const [nuevoProveedorTelefono, setNuevoProveedorTelefono] = useState('')

  // Estados para vincular/buscar presupuesto relacionado desde Datos del Documento
  const [showVincularPresupuestoModal, setShowVincularPresupuestoModal] = useState(false)
  const [presupuestoSearchText, setPresupuestoSearchText] = useState('')

  const [form, setForm] = useState({
    numero: '',
    numero_registro: '',
    proveedor_id: '',
    presupuesto_id: '',
    fecha: new Date().toISOString().slice(0, 10),
    base_imponible: 0,
    iva: 21,
    estado: 'pendiente',
    metodo_pago: 'Transferencia',
    recibo_foto: null as string | null,
    conceptos: [] as Concepto[],
    archivo_url: null as string | null,
  })

  // Función para calcular el número de registro correlativo FRXTAA1234
  function calcularNumeroRegistro(fechaStr: string, facturasList: FacturaRecibida[]): string {
    const d = new Date(fechaStr || new Date().toISOString().slice(0, 10))
    const mes = d.getMonth() + 1 // 1 a 12
    const trimestre = Math.ceil(mes / 3) // 1, 2, 3 o 4
    const año2Digitos = d.getFullYear().toString().slice(-2)

    const prefixYear = `${año2Digitos}`
    const correlativos = facturasList
      .map((f) => {
        const num = (f as any).numero_registro || f.numero || ''
        const match = num.match(/^FR[1-4]T(\d{2})(\d{4})$/)
        if (match && match[1] === prefixYear) {
          return parseInt(match[2], 10)
        }
        return 0
      })
      .filter((n) => n > 0)

    const maxCorrelativo = correlativos.length > 0 ? Math.max(...correlativos) : 0
    const nextCorrelativo = String(maxCorrelativo + 1).padStart(4, '0')

    return `FR${trimestre}T${año2Digitos}${nextCorrelativo}`
  }

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const [{ data: fac }, { data: prov }, { data: pres }, { data: cli }, { data: veh }] = await Promise.all([
      supabase.from('facturas_recibidas').select('*').order('created_at', { ascending: false }),
      supabase.from('proveedores').select('*').order('nombre'),
      supabase.from('presupuestos').select('*').order('created_at', { ascending: false }),
      supabase.from('clientes').select('*').order('nombre'),
      supabase.from('vehiculos').select('*'),
    ])
    
    // Combinar con localStorage para los campos que aún no están en Supabase (pagos, fotos_recibos)
    const facturasList = (fac ?? []).map((f) => {
      try {
        const storedPagos = localStorage.getItem(`factura_recibida_${f.id}_pagos`)
        const storedFotos = localStorage.getItem(`factura_recibida_${f.id}_fotos`)
        const storedTotal = localStorage.getItem(`factura_recibida_${f.id}_total_pagado`)
        
        let merged = { ...f }
        if (storedPagos) merged.pagos = JSON.parse(storedPagos)
        if (storedFotos) merged.fotos_recibos = JSON.parse(storedFotos)
        
        // Fix: f.total_pagado might be null or undefined
        if (storedTotal && (!f.total_pagado || f.total_pagado === 0)) {
           merged.total_pagado = parseFloat(storedTotal)
           // If it's fully paid based on stored total, also update estado in memory
           if (merged.total_pagado >= merged.total - 0.01) {
             merged.estado = 'pagada'
           } else if (merged.total_pagado > 0) {
             merged.estado = 'parcial'
           }
        }
        return merged
      } catch (e) {
        return f
      }
    })
    
    setFacturas(facturasList)
    setProveedores(prov ?? [])
    setPresupuestos(pres ?? [])
    setClientes(cli ?? [])
    setVehiculos(veh ?? [])
  }

  function handleOpenForm() {
    const hoy = new Date().toISOString().slice(0, 10)
    const nextReg = calcularNumeroRegistro(hoy, facturas)
    setForm({
      numero: '',
      numero_registro: nextReg,
      proveedor_id: '',
      presupuesto_id: '',
      fecha: hoy,
      base_imponible: 0,
      iva: 21,
      estado: 'pendiente',
      metodo_pago: 'Transferencia',
      recibo_foto: null,
      conceptos: [],
      archivo_url: null,
    })
    setShowProveedorSearch(false)
    setProveedorSearchText('')
    setShowForm(true)
  }

  async function handleCrearProveedorRapido() {
    if (!nuevoProveedorNombre.trim()) {
      alert('Por favor indica el nombre del proveedor')
      return
    }
    const { data, error } = await supabase.from('proveedores').insert({
      nombre: nuevoProveedorNombre.trim(),
      cif: nuevoProveedorCif.trim() || null,
      telefono: nuevoProveedorTelefono.trim() || null,
    }).select().single()

    if (error) {
      alert('Error creando proveedor: ' + error.message)
      return
    }

    await load()
    if (data) {
      setForm((prev) => ({ ...prev, proveedor_id: data.id }))
    }
    setNuevoProveedorNombre('')
    setNuevoProveedorCif('')
    setNuevoProveedorTelefono('')
    setShowNuevoProveedorModal(false)
  }

  function handleFechaChange(nuevaFecha: string) {
    const nextReg = calcularNumeroRegistro(nuevaFecha, facturas)
    setForm((prev) => ({
      ...prev,
      fecha: nuevaFecha,
      numero_registro: nextReg,
    }))
  }

  const total = form.base_imponible * (1 + form.iva / 100)

  async function handleSave() {
    if (!form.numero.trim() || !form.proveedor_id) {
      alert('Por favor, indica el número de factura del proveedor y selecciona un proveedor.')
      return
    }

    const pagosIniciales: PagoRecibida[] = []
    let totalPagadoInicial = 0
    if (form.estado === 'pagada') {
      totalPagadoInicial = total
      pagosIniciales.push({
        id: crypto.randomUUID(),
        importe: total,
        fecha: new Date().toISOString(),
        metodo_pago: form.metodo_pago,
        recibo_foto: form.recibo_foto || undefined,
      })
    }

    const payload: any = {
      numero: form.numero_registro ? `${form.numero_registro} - ${form.numero}` : form.numero,
      proveedor_id: form.proveedor_id,
      presupuesto_id: form.presupuesto_id || null,
      fecha: form.fecha,
      base_imponible: form.base_imponible,
      iva: form.base_imponible * (form.iva / 100),
      total,
      total_pagado: totalPagadoInicial,
      estado: form.estado,
      conceptos: form.conceptos,
      archivo_url: form.archivo_url,
      pagos: pagosIniciales,
      fotos_recibos: form.recibo_foto ? [form.recibo_foto] : [],
    }

    payload.numero_registro = form.numero_registro

    let { error } = await supabase.from('facturas_recibidas').insert(payload)
    if (error && (error.code === 'PGRST204' || error.message?.includes('column'))) {
      delete payload.numero_registro
      delete payload.presupuesto_id
      delete payload.total_pagado
      delete payload.pagos
      delete payload.fotos_recibos
      const res = await supabase.from('facturas_recibidas').insert(payload)
      error = res.error
    }

    if (error) {
      console.error('Error al guardar factura recibida:', error)
      alert('Error al guardar: ' + error.message)
      return
    }

    setForm({
      numero: '',
      numero_registro: '',
      proveedor_id: '',
      fecha: new Date().toISOString().slice(0, 10),
      base_imponible: 0,
      iva: 21,
      estado: 'pendiente',
      metodo_pago: 'Transferencia',
      recibo_foto: null,
      conceptos: [],
      archivo_url: null,
    })
    setShowForm(false)
    load()
  }

  async function deleteFactura(id: string) {
    if (!confirm('¿Eliminar esta factura recibida?')) return
    await supabase.from('facturas_recibidas').delete().eq('id', id)
    if (selectedFactura?.id === id) setSelectedFactura(null)
    load()
  }

  const handleCaptureReceiptPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setReciboFotoPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleFormCaptureReceiptPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setForm((prev) => ({ ...prev, recibo_foto: reader.result as string }))
    }
    reader.readAsDataURL(file)
  }

  async function registrarAbonoRecibida(e?: React.MouseEvent) {
    if (e) e.preventDefault()
    if (!selectedFactura || !nuevoAbono) return
    const rawImporte = parseFloat(nuevoAbono)
    if (isNaN(rawImporte) || rawImporte <= 0) return

    const totalPagadoPrev = selectedFactura.total_pagado ?? 0
    const saldoPendiente = Math.max(0, selectedFactura.total - totalPagadoPrev)
    if (saldoPendiente <= 0) return

    // Clamp al saldo pendiente: nunca puede superar el importe restante
    const importe = Math.min(rawImporte, saldoPendiente)

    const nuevoTotalPagado = Math.min(selectedFactura.total, totalPagadoPrev + importe)
    const nuevoEstado = nuevoTotalPagado >= selectedFactura.total - 0.01 ? 'pagada' : 'parcial'

    // Use fallback for crypto.randomUUID to avoid secure context issues on HTTP
    const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)
    const nuevoPago: PagoRecibida = {
      id: newId,
      importe,
      fecha: new Date().toISOString(),
      metodo_pago: metodoPago,
      recibo_foto: reciboFotoPreview || undefined,
    }

    const pagosActuales = selectedFactura.pagos ?? []
    const nuevosPagos = [nuevoPago, ...pagosActuales]
    const nuevasFotos = reciboFotoPreview
      ? [reciboFotoPreview, ...(selectedFactura.fotos_recibos ?? [])]
      : selectedFactura.fotos_recibos ?? []

    const updated: FacturaRecibida = {
      ...selectedFactura,
      total_pagado: nuevoTotalPagado,
      estado: nuevoEstado as 'pendiente' | 'parcial' | 'pagada',
      pagos: nuevosPagos,
      fotos_recibos: nuevasFotos,
    }

    try {
      // Persistir localmente para fallback inmediato
      localStorage.setItem(`factura_recibida_${selectedFactura.id}_pagos`, JSON.stringify(nuevosPagos))
      localStorage.setItem(`factura_recibida_${selectedFactura.id}_total_pagado`, nuevoTotalPagado.toString())

      // Actualizar estado activo inmediatamente
      setSelectedFactura(updated)
      setFacturas((prev) => prev.map((f) => (f.id === selectedFactura.id ? updated : f)))
      setNuevoAbono('')
      setReciboFotoPreview(null)

      const { error } = await supabase.from('facturas_recibidas').update({
        estado: nuevoEstado,
      } as any).eq('id', selectedFactura.id)

      if (error) throw error

      await load()

      showToast(
        `Abono de ${importe.toFixed(2)} € registrado. Total abonado: ${nuevoTotalPagado.toFixed(2)} € | Resto Abono: ${Math.max(0, selectedFactura.total - nuevoTotalPagado).toFixed(2)} €`,
        nuevoEstado === 'pagada' ? 'success' : 'info'
      )
    } catch (err: any) {
      console.error("Error al registrar abono:", err)
      showToast("Error al registrar el abono: " + (err.message || "Error desconocido"), "error")
    }
  }

  async function abonarTodoRecibida(e?: React.MouseEvent) {
    if (e) e.preventDefault()
    if (!selectedFactura) return
    const totalPagadoPrev = selectedFactura.total_pagado ?? 0
    const saldoPendiente = Math.max(0, selectedFactura.total - totalPagadoPrev)
    if (saldoPendiente <= 0) return

    // Cumplimenta automáticamente el input de importe a pagar
    setNuevoAbono(saldoPendiente.toFixed(2))

    const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)
    const nuevoPago: PagoRecibida = {
      id: newId,
      importe: saldoPendiente,
      fecha: new Date().toISOString(),
      metodo_pago: metodoPago,
      recibo_foto: reciboFotoPreview || undefined,
    }

    const pagosActuales = selectedFactura.pagos ?? []
    const nuevosPagos = [nuevoPago, ...pagosActuales]
    const nuevasFotos = reciboFotoPreview
      ? [reciboFotoPreview, ...(selectedFactura.fotos_recibos ?? [])]
      : selectedFactura.fotos_recibos ?? []

    const updated: FacturaRecibida = {
      ...selectedFactura,
      total_pagado: selectedFactura.total,
      estado: 'pagada',
      pagos: nuevosPagos,
      fotos_recibos: nuevasFotos,
    }

    try {
      localStorage.setItem(`factura_recibida_${selectedFactura.id}_pagos`, JSON.stringify(nuevosPagos))
      localStorage.setItem(`factura_recibida_${selectedFactura.id}_total_pagado`, selectedFactura.total.toString())

      setSelectedFactura(updated)
      setFacturas((prev) => prev.map((f) => (f.id === selectedFactura.id ? updated : f)))
      setNuevoAbono('')
      setReciboFotoPreview(null)

      const { error } = await supabase.from('facturas_recibidas').update({
        estado: 'pagada',
      } as any).eq('id', selectedFactura.id)

      if (error) throw error

      await load()

      showToast(
        `Factura ${selectedFactura.numero_registro || ''} liquidada al 100% por ${selectedFactura.total.toFixed(2)} € (ABONADA).`,
        'success'
      )
    } catch (err: any) {
      console.error("Error al liquidar abono:", err)
      showToast("Error al liquidar la factura: " + (err.message || "Error desconocido"), "error")
    }
  }

  async function vincularPresupuestoAFactura(presupuestoId: string | null) {
    if (!selectedFactura) return
    const updated = { ...selectedFactura, presupuesto_id: presupuestoId }

    await supabase.from('facturas_recibidas').update({
      presupuesto_id: presupuestoId,
    } as any).eq('id', selectedFactura.id)

    setSelectedFactura(updated)
    setShowVincularPresupuestoModal(false)
    setPresupuestoSearchText('')
    load()

    showToast(
      presupuestoId ? 'Presupuesto emitido vinculado correctamente.' : 'Presupuesto desvinculado.',
      'success'
    )
  }

  const proveedorNombre = (id: string | null) => proveedores.find((p) => p.id === id)?.nombre ?? '—'

  const facturasFiltradas = facturas.filter((f) => {
    const numReg = (f as any).numero_registro || ''
    const q = search.toLowerCase()
    return (
      f.numero.toLowerCase().includes(q) ||
      numReg.toLowerCase().includes(q) ||
      proveedorNombre(f.proveedor_id).toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-4">
      {/* ── CABECERA: LUPA A LA IZQUIERDA (EXPANSIBLE AL PULSAR), TÍTULO MORADO CENTRADO Y +F A LA DERECHA ── */}
      <div className="relative flex items-center justify-between min-h-[64px] mb-4 pb-2 border-b border-purple-900/40">
        {/* Izquierda: Lupa flotante que abre input al pulsar */}
        <div className="flex items-center gap-2 z-10">
          {showSearchInput ? (
            <div className="relative flex items-center gap-2 animate-in fade-in duration-150">
              <input
                type="text"
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar recibidas..."
                className="w-44 sm:w-60 bg-bg-800 border-2 border-purple-500/50 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-purple-400 shadow-inner"
              />
              <button
                onClick={() => {
                  setShowSearchInput(false)
                  setSearch('')
                }}
                className="text-slate-400 hover:text-white p-1"
                title="Cerrar búsqueda"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowSearchInput(true)}
              className="w-12 h-12 flex items-center justify-center text-purple-400 hover:text-purple-300 hover:scale-105 active:scale-95 transition-all bg-purple-500/10 rounded-2xl border border-purple-500/30 shrink-0 cursor-pointer shadow-[0_0_10px_rgba(168,85,247,0.2)]"
              title="Buscar facturas recibidas"
              aria-label="Buscar"
            >
              <Search className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* Centro: Título morado con subtexto */}
        <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center justify-center pointer-events-none text-center">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-wider text-purple-400 drop-shadow-[0_0_12px_rgba(168,85,247,0.4)] whitespace-nowrap">
            RECIBIDAS
          </h2>
          <p className="text-[10px] sm:text-xs text-purple-300/80 font-bold uppercase tracking-wider whitespace-nowrap">
            Control y Gestión de Gastos
          </p>
        </div>

        {/* Derecha: Icono flotante sin recuadro de +F */}
        <div className="flex items-center gap-2 z-10 ml-auto">
          <button
            onClick={handleOpenForm}
            className="w-14 h-14 rounded-2xl bg-purple-500/10 hover:bg-purple-500/25 border-0 outline-none flex items-center justify-center transition-transform active:scale-95 shrink-0 shadow-[0_0_15px_rgba(168,85,247,0.3)] cursor-pointer"
            title="Nueva Factura Recibida (+F)"
            aria-label="Nueva Factura Recibida"
          >
            <NuevaFacturaRecibidaIcon className="w-10 h-10 text-purple-400 drop-shadow-[0_0_10px_rgba(192,132,252,0.8)]" />
          </button>
        </div>
      </div>

      {/* ── VISOR DE DETALLE Y CONTROL DE PAGO SI HAY UNA FACTURA SELECCIONADA ── */}
      {selectedFactura ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Panel de Control de Pagos y Roadmap */}
            <Card className="p-5 space-y-4 border-2 border-purple-500/40 bg-bg-900/90 shadow-[0_0_20px_rgba(168,85,247,0.15)]">
              <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                <h3 className="text-sm font-black text-purple-300 uppercase tracking-wider flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-purple-400" /> Control de Pago de Proveedor
                </h3>
                <Badge
                  text={
                    selectedFactura.estado === 'pagada'
                      ? 'Totalmente Pagada'
                      : selectedFactura.estado === 'parcial'
                      ? 'Parcialmente Pagada'
                      : 'Pendiente de Pago'
                  }
                  color={
                    selectedFactura.estado === 'pagada'
                      ? 'green'
                      : selectedFactura.estado === 'parcial'
                      ? 'blue'
                      : 'yellow'
                  }
                />
              </div>

              {/* ROADMAP VISUAL DE PAGOS (Píldoras Rectangulares con esquinas redondeadas y texto centrado) */}
              <div className="py-2">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">Roadmap de Pagos</p>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {/* Estado 1: Pendiente */}
                  <div
                    className={`py-2.5 px-3 rounded-xl border flex flex-col items-center justify-center text-center transition-all shadow-md ${
                      selectedFactura.estado === 'pendiente' || selectedFactura.estado === 'parcial' || selectedFactura.estado === 'pagada'
                        ? 'bg-purple-600/30 border-purple-400 text-purple-200 shadow-purple-900/30 font-bold'
                        : 'bg-slate-800/60 border-slate-700 text-slate-400 font-medium'
                    }`}
                  >
                    <span className="text-xs uppercase tracking-wider font-extrabold">1. Pendiente</span>
                  </div>

                  {/* Estado 2: Parcial */}
                  <div
                    className={`py-2.5 px-3 rounded-xl border flex flex-col items-center justify-center text-center transition-all shadow-md ${
                      selectedFactura.estado === 'parcial' || selectedFactura.estado === 'pagada'
                        ? 'bg-blue-600/30 border-blue-400 text-blue-200 shadow-blue-900/30 font-bold'
                        : 'bg-slate-800/60 border-slate-700 text-slate-400 font-medium'
                    }`}
                  >
                    <span className="text-xs uppercase tracking-wider font-extrabold">2. Parcial</span>
                  </div>

                  {/* Estado 3: Pagada / Liquidada */}
                  <div
                    className={`py-2.5 px-3 rounded-xl border flex flex-col items-center justify-center text-center transition-all shadow-md ${
                      selectedFactura.estado === 'pagada'
                        ? 'bg-emerald-600/30 border-emerald-400 text-emerald-200 shadow-[0_0_12px_rgba(16,185,129,0.3)] font-bold'
                        : 'bg-slate-800/60 border-slate-700 text-slate-400 font-medium'
                    }`}
                  >
                    <span className="text-xs uppercase tracking-wider font-extrabold">3. Liquidada ✓</span>
                  </div>
                </div>
              </div>

              {/* Métricas de Importe, Saldo y Último Abono (Tamaño x 1.5) */}
              {(() => {
                const totalPagado = selectedFactura.total_pagado ?? (selectedFactura.estado === 'pagada' ? selectedFactura.total : 0)
                const saldoPendiente = Math.max(0, selectedFactura.total - totalPagado)
                const ultPago = (selectedFactura.pagos && selectedFactura.pagos.length > 0)
                  ? selectedFactura.pagos[0] // Primer elemento es el más reciente
                  : null

                return (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-bg-800/90 p-4 rounded-xl border border-slate-700">
                      <div>
                        <span className="text-sm sm:text-base text-slate-400 block font-bold mb-0.5">Total Factura</span>
                        <span className="text-2xl sm:text-3xl font-black text-white">{selectedFactura.total.toFixed(2)} €</span>
                      </div>
                      <div>
                        <span className="text-sm sm:text-base text-slate-400 block font-bold mb-0.5">Total Abonado</span>
                        <span className="text-2xl sm:text-3xl font-black text-purple-300">{totalPagado.toFixed(2)} €</span>
                      </div>
                      <div className="text-left sm:text-right col-span-2 sm:col-span-1">
                        <span className="text-sm sm:text-base text-blue-400 block font-black mb-0.5">Resto Abono</span>
                        <span className="text-2xl sm:text-3xl font-black text-blue-400">
                          {saldoPendiente.toFixed(2)} €
                        </span>
                      </div>
                    </div>

                    {/* Ultimo abono */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-purple-950/30 border border-purple-500/30 text-sm sm:text-base">
                      <span className="text-purple-300 font-bold">Ultimo abono:</span>
                      {ultPago ? (
                        <span className="font-mono font-bold text-white">
                          {new Date(ultPago.fecha).toLocaleDateString('es-ES')} {new Date(ultPago.fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                          <span className="text-emerald-400 ml-1.5 font-black">(+{ultPago.importe.toFixed(2)} €)</span>
                        </span>
                      ) : (
                        <span className="text-slate-500 italic text-xs sm:text-sm">Sin abonos registrados</span>
                      )}
                    </div>

                    {/* Formulario de Abono si queda saldo */}
                    {saldoPendiente > 0 && (
                      <div className="space-y-3 pt-2">
                        {/* Línea de porcentaje de pago dinámica interactiva */}
                        <div className="space-y-1.5 bg-purple-950/20 p-2.5 rounded-xl border border-purple-500/30">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-[11px] font-bold text-purple-300 uppercase tracking-wider">
                              Porcentaje de Pago
                            </span>
                            <span className="font-mono font-black text-purple-200">
                              {(() => {
                                const val = parseFloat(nuevoAbono) || 0
                                const pct = Math.min(100, Math.max(0, (val / saldoPendiente) * 100))
                                return `${pct.toFixed(0)}% (${val.toFixed(2)} €)`
                              })()}
                            </span>
                          </div>

                          <div className="relative flex items-center py-1">
                            <input
                              type="range"
                              min="0"
                              max={saldoPendiente}
                              step="0.01"
                              value={Math.min(saldoPendiente, Math.max(0, parseFloat(nuevoAbono) || 0))}
                              onChange={(e) => {
                                const v = parseFloat(e.target.value) || 0
                                setNuevoAbono(v > 0 ? v.toFixed(2) : '')
                              }}
                              className="w-full h-2.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500 hover:accent-purple-400 transition-all"
                            />
                          </div>

                          <div className="flex justify-between text-[10px] font-bold text-slate-400 px-0.5">
                            <span role="button" onClick={() => setNuevoAbono('')} className="cursor-pointer hover:text-purple-300">0%</span>
                            <span role="button" onClick={() => setNuevoAbono((saldoPendiente * 0.25).toFixed(2))} className="cursor-pointer hover:text-purple-300">25%</span>
                            <span role="button" onClick={() => setNuevoAbono((saldoPendiente * 0.5).toFixed(2))} className="cursor-pointer hover:text-purple-300">50%</span>
                            <span role="button" onClick={() => setNuevoAbono((saldoPendiente * 0.75).toFixed(2))} className="cursor-pointer hover:text-purple-300">75%</span>
                            <span role="button" onClick={() => setNuevoAbono(saldoPendiente.toFixed(2))} className="cursor-pointer hover:text-emerald-400">100%</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                              Importe de abono a pagar (€) *
                            </label>
                            <input
                              type="number"
                              value={nuevoAbono}
                              onChange={(e) => {
                                const typed = parseFloat(e.target.value)
                                if (isNaN(typed)) {
                                  setNuevoAbono('')
                                } else if (typed > saldoPendiente) {
                                  setNuevoAbono(saldoPendiente.toFixed(2))
                                } else if (typed < 0) {
                                  setNuevoAbono('0')
                                } else {
                                  setNuevoAbono(e.target.value)
                                }
                              }}
                              placeholder={`Máx ${saldoPendiente.toFixed(2)}`}
                              max={saldoPendiente}
                              min="0"
                              step="0.01"
                              className="w-full bg-bg-800 border-2 border-purple-500/40 rounded-xl px-3 py-2 text-white text-sm focus:border-purple-400 focus:outline-none tabular-nums font-bold"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                              Medio de Pago
                            </label>
                            <select
                              value={metodoPago}
                              onChange={(e) => setMetodoPago(e.target.value)}
                              className="w-full bg-bg-800 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm focus:border-purple-400 focus:outline-none"
                            >
                              <option value="Transferencia">Transferencia bancaria</option>
                              <option value="Tarjeta">Tarjeta bancaria / TPV</option>
                              <option value="Efectivo">Efectivo</option>
                              <option value="Domiciliación">Domiciliación / Recibo SEPA</option>
                              <option value="Bizum">Bizum</option>
                              <option value="Pagaré">Pagaré</option>
                            </select>
                          </div>
                        </div>

                        {/* Botón de Cámara para comprobante / ticket de pago */}
                        <div>
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            ref={receiptFileInputRef}
                            onChange={handleCaptureReceiptPhoto}
                          />
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => receiptFileInputRef.current?.click()}
                              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/40 text-xs font-bold flex items-center gap-2 active:scale-95 transition-all"
                            >
                              <Camera className="w-4 h-4 text-purple-400" />
                              <span>{reciboFotoPreview ? 'Foto de recibo añadida ✓' : 'Añadir foto de recibo / ticket'}</span>
                            </button>
                            {reciboFotoPreview && (
                              <button
                                type="button"
                                onClick={() => setViewerFoto(reciboFotoPreview)}
                                className="text-xs text-cyan-400 underline font-bold"
                              >
                                Ver foto
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Botones de acción de abono: ABONO PARCIAL y ABONO TOTAL */}
                        <div className="grid grid-cols-2 gap-3 pt-2">
                          <button
                            onClick={registrarAbonoRecibida}
                            disabled={!nuevoAbono || parseFloat(nuevoAbono) <= 0}
                            className="py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-blue-950/50 flex items-center justify-center gap-1.5 transition-all active:scale-95 border border-blue-400/40"
                          >
                            <Save className="w-4 h-4" /> Abono Parcial
                          </button>
                          <button
                            onClick={abonarTodoRecibida}
                            className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-1.5 transition-all active:scale-95 border border-emerald-400/40"
                          >
                            <Check className="w-4 h-4" /> Abono Total
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Historial de Abonos / Pagos */}
                    <div className="pt-3 border-t border-slate-700">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                        Historial de Pagos Realizados ({(selectedFactura.pagos ?? []).length})
                      </p>
                      {(selectedFactura.pagos ?? []).length === 0 ? (
                        <p className="text-xs text-slate-500 italic">No hay pagos registrados aún para esta factura.</p>
                      ) : (
                        <div className="space-y-2">
                          {(selectedFactura.pagos ?? []).map((pago, idx) => (
                            <div
                              key={pago.id || idx}
                              className="flex items-center justify-between p-2.5 rounded-lg bg-bg-800 text-xs border border-slate-700"
                            >
                              <div>
                                <span className="font-bold text-white mr-2">{pago.metodo_pago || 'Pago'}</span>
                                <span className="text-slate-400">
                                  {new Date(pago.fecha).toLocaleDateString('es-ES')} {new Date(pago.fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-emerald-400">+{pago.importe.toFixed(2)} €</span>
                                {pago.recibo_foto && (
                                  <button
                                    onClick={() => setViewerFoto(pago.recibo_foto!)}
                                    className="p-1 text-purple-300 hover:text-white"
                                    title="Ver comprobante"
                                  >
                                    <Camera className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })()}
            </Card>

            {/* Ficha resumen de la Factura Recibida */}
            <Card className="p-5 space-y-4 border border-slate-700 bg-bg-900/80">
              <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Datos del Documento</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-purple-300 bg-purple-950/60 px-2.5 py-1 rounded-md border border-purple-500/40 font-bold">
                    {selectedFactura.numero_registro || 'FR'}
                  </span>
                  <button
                    onClick={() => setSelectedFactura(null)}
                    className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all border border-slate-700"
                    title="Cerrar detalle"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Nº Factura Proveedor:</span>
                  <span className="font-bold text-white">{selectedFactura.numero}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Proveedor:</span>
                  <span className="font-bold text-purple-300">{proveedorNombre(selectedFactura.proveedor_id)}</span>
                </div>
                <div className="py-2 border-b border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Presupuesto Relacionado:</span>
                    <button
                      onClick={() => setShowVincularPresupuestoModal(true)}
                      className="px-2.5 py-1 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-500/40 text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all shadow"
                    >
                      <Search className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{selectedFactura.presupuesto_id ? 'Cambiar / Buscar' : 'Buscar Presupuesto'}</span>
                    </button>
                  </div>

                  {selectedFactura.presupuesto_id ? (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-cyan-950/30 border border-cyan-500/30 text-xs">
                      <div className="font-bold text-cyan-300">
                        <span className="text-white mr-1.5">
                          {presupuestos.find(p => p.id === selectedFactura.presupuesto_id)?.numero || 'Presupuesto'}
                        </span>
                        {(() => {
                          const pObj = presupuestos.find(p => p.id === selectedFactura.presupuesto_id)
                          const cObj = clientes.find(c => c.id === pObj?.cliente_id)
                          const vObj = vehiculos.find(v => v.id === pObj?.vehiculo_id)
                          return (
                            <span className="text-slate-300 font-normal block sm:inline">
                              {cObj ? `• ${cObj.nombre}` : ''} {vObj ? `• ${vObj.matricula} (${vObj.marca} ${vObj.modelo})` : ''}
                            </span>
                          )
                        })()}
                      </div>
                      <button
                        onClick={() => vincularPresupuestoAFactura(null)}
                        className="text-slate-500 hover:text-red-400 p-1 font-bold text-[11px]"
                        title="Desvincular presupuesto"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Buscar por Nº, matrícula, marca, cliente..."
                        readOnly
                        onClick={() => setShowVincularPresupuestoModal(true)}
                        className="w-full bg-bg-800/80 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-400 cursor-pointer hover:border-cyan-500/50"
                      />
                    </div>
                  )}
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Fecha Factura:</span>
                  <span className="font-semibold text-white">{new Date(selectedFactura.fecha).toLocaleDateString('es-ES')}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Ultimo abono:</span>
                  <span className="font-semibold text-purple-300">
                    {selectedFactura.pagos && selectedFactura.pagos.length > 0
                      ? `${new Date(selectedFactura.pagos[0].fecha).toLocaleDateString('es-ES')} (${selectedFactura.pagos[0].importe.toFixed(2)} €)`
                      : '—'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Base Imponible:</span>
                  <span className="font-semibold text-white">{(selectedFactura.base_imponible || (selectedFactura.total / 1.21) || 0).toFixed(2)} €</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">IVA (21%):</span>
                  <span className="font-semibold text-white">
                    {(() => {
                      const base = selectedFactura.base_imponible || (selectedFactura.total / 1.21) || 0
                      return (base * 0.21).toFixed(2)
                    })()} €
                  </span>
                </div>
                <div className="flex justify-between py-1.5 font-bold text-base border-t border-slate-700">
                  <span className="text-purple-300">TOTAL FACTURA:</span>
                  <span className="text-white font-black">{selectedFactura.total.toFixed(2)} €</span>
                </div>
              </div>

              {/* Botón Eliminar Factura */}
              <div className="pt-4 flex justify-end">
                <button
                  onClick={() => deleteFactura(selectedFactura.id)}
                  className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1.5 p-2 rounded-lg hover:bg-red-500/10 transition-all font-semibold"
                >
                  <Trash2 className="w-4 h-4" /> Eliminar Factura
                </button>
              </div>
            </Card>
          </div>
        </div>
      ) : (
        /* ── LISTADO DE TARJETAS DE FACTURAS RECIBIDAS (ESTILO EMITIDAS CON ROADMAP Y EXP/FAC) ── */
        <div className="space-y-3">
          {facturasFiltradas.length === 0 ? (
            <EmptyState
              icon={<Receipt className="w-12 h-12 text-purple-400" />}
              title="No hay facturas recibidas"
              subtitle="Pulsa el botón +F para registrar facturas de gastos y compras"
            />
          ) : (
            facturasFiltradas.map((f) => {
              const numReg = (f as any).numero_registro || 'FR'
              const totalPagado = f.total_pagado ?? (f.estado === 'pagada' || f.estado === 'abonada' ? f.total : 0)
              const saldoPendiente = Math.max(0, f.total - totalPagado)
              const isAbonada = f.estado === 'pagada' || f.estado === 'abonada' || saldoPendiente <= 0.01
              const isParcial = (f.estado === 'parcial' || totalPagado > 0) && !isAbonada

              // Contornos distintivos según estado: abonada (3px verde), parcial (3px azul), pendiente (3px naranja)
              let borderClass = 'border-[3px] border-orange-500 hover:border-orange-400 bg-orange-950/10 shadow-[0_0_15px_rgba(249,115,22,0.2)]'
              let estadoTexto = 'PENDIENTE'
              let estadoColor: 'yellow' | 'blue' | 'green' = 'yellow'

              if (isAbonada) {
                borderClass = 'border-[3px] border-emerald-500 hover:border-emerald-400 bg-emerald-950/15 shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                estadoTexto = 'ABONADA'
                estadoColor = 'green'
              } else if (isParcial) {
                borderClass = 'border-[3px] border-blue-500 hover:border-blue-400 bg-blue-950/15 shadow-[0_0_15px_rgba(59,130,246,0.25)]'
                estadoTexto = 'PARCIAL'
                estadoColor = 'blue'
              }

              const presRel = f.presupuesto_id ? presupuestos.find((p) => p.id === f.presupuesto_id) : null
              const clienteRel = presRel ? clientes.find((c) => c.id === presRel.cliente_id) : null

              return (
                <div
                  key={f.id}
                  className={`rounded-2xl p-4 transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-lg ${borderClass}`}
                >
                  {/* Panel de Información de la Factura Recibida */}
                  <div className="flex-1 min-w-0 space-y-2.5">
                    {/* Línea 1: REGISTRO (Morado) y FACTURA PROVEEDOR (16px) */}
                    <div className="flex items-center justify-between w-full font-mono tracking-wider font-extrabold uppercase" style={{ fontSize: '16px' }}>
                      <span className="text-purple-400 font-black flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs">
                          {numReg}
                        </span>
                      </span>
                      <span className="text-slate-400 font-bold truncate max-w-[50%] text-right">
                        FAC: {f.numero}
                      </span>
                    </div>

                    {/* Línea 2: Proveedor centrado en mayúsculas (18px) */}
                    <div className="text-white font-black uppercase truncate leading-none w-full text-center block" style={{ fontSize: '18px', textAlign: 'center' }}>
                      {proveedorNombre(f.proveedor_id)}
                    </div>

                    {/* Línea 3: Estado de pago, badge y Presupuesto Relacionado */}
                    <div className="flex items-center justify-between w-full text-xs flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 font-semibold">Estado:</span>
                        <Badge
                          text={estadoTexto}
                          color={estadoColor}
                        />
                      </div>

                      {presRel && (
                        <div className="flex items-center gap-1 bg-cyan-950/40 px-2 py-0.5 rounded-md border border-cyan-500/30 text-[11px] font-bold text-cyan-300">
                          <span>Presupuesto:</span>
                          <span className="text-white">{presRel.numero}</span>
                          {clienteRel && <span className="text-cyan-400/80">({clienteRel.nombre})</span>}
                        </div>
                      )}

                      {f.fotos_recibos && f.fotos_recibos.length > 0 && (
                        <span className="text-purple-300 flex items-center gap-1 text-[11px] font-bold">
                          <Camera className="w-3.5 h-3.5" /> {f.fotos_recibos.length} comprobante(s)
                        </span>
                      )}
                    </div>

                    {/* Línea 4: Fecha a la izquierda y Total / Pendiente a la derecha (20px) */}
                    <div className="flex items-center justify-between w-full text-slate-400 font-bold uppercase tracking-wider" style={{ fontSize: '18px' }}>
                      <span className="text-sm font-semibold">{new Date(f.fecha).toLocaleDateString('es-ES')}</span>
                      <div className="flex items-center gap-3">
                        {saldoPendiente > 0 && isParcial && (
                          <span className="text-xs text-blue-400 font-black">
                            Resto Abono: {saldoPendiente.toFixed(2)} €
                          </span>
                        )}
                        <span className="text-white font-black tabular-nums">{f.total.toFixed(2)} €</span>
                      </div>
                    </div>
                  </div>

                  {/* Panel de Botones de Acción */}
                  <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                    <button
                      onClick={() => setSelectedFactura(f)}
                      className="px-4 py-2.5 rounded-xl bg-purple-900/30 text-purple-200 border border-purple-500/40 hover:bg-purple-800/40 hover:text-purple-100 text-xs font-extrabold tracking-wider uppercase transition-all flex-1 sm:flex-initial text-center shadow"
                    >
                      Control de Pago
                    </button>
                    <button
                      onClick={() => deleteFactura(f.id)}
                      className="p-2.5 rounded-xl bg-slate-800 hover:bg-red-950/40 text-slate-400 hover:text-red-400 border border-slate-700 transition-all"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* ── MODAL NUEVA FACTURA RECIBIDA CON OCR AL TOPE ── */}
      {showForm && (
        <div className="fixed inset-0 bg-bg-950/80 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={() => setShowForm(false)}>
          <Card className="w-full max-w-lg p-6 my-8 max-h-[90vh] overflow-y-auto">
            <div onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-purple-900/40">
                <div className="flex items-center gap-2">
                  <NuevaFacturaRecibidaIcon className="w-7 h-7 text-purple-400" />
                  <h2 className="text-lg font-black text-white uppercase tracking-wider">Nueva Factura Recibida</h2>
                </div>
                <button onClick={() => setShowForm(false)} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
              </div>

              {/* OCR ARRIBA DEL TODO PARA CAPTURAR AUTOMÁTICAMENTE */}
              <div className="mb-4">
                <OcrInvoiceScanner 
                  title="Escanear con Cámara / OCR Automático"
                  onScan={(data) => {
                    const fFecha = data.fecha || form.fecha
                    const fReg = calcularNumeroRegistro(fFecha, facturas)
                    setForm({
                      ...form,
                      numero: data.numero || form.numero,
                      numero_registro: fReg,
                      fecha: fFecha,
                      base_imponible: data.base_imponible || form.base_imponible,
                      iva: data.iva || form.iva,
                    })
                  }} 
                />
              </div>

              <div className="space-y-3.5">
                {/* Campo autoreellenable con número correlativo FRXTAA1234 */}
                <div>
                  <label className="block text-xs font-bold text-purple-400 uppercase mb-1">
                    Nº Registro Interno (Autoreellenable)
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={form.numero_registro}
                    className="w-full bg-purple-950/40 border-2 border-purple-500/60 rounded-xl px-4 py-2 text-purple-200 font-black text-sm tracking-wider shadow-inner cursor-not-allowed select-none"
                    placeholder="FR1T260001"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Formato: FR (Factura Recibida) + Trimestre (T) + Año + Correlativo</p>
                </div>

                <Input
                  label="Número de Factura del Proveedor *"
                  value={form.numero}
                  onChange={(v) => setForm({ ...form, numero: v })}
                  placeholder="Ej: F-2024-001 / B-98765"
                />

                {/* CAMPO PROVEEDOR CON SELECTOR Y DOS BOTONES DE IGUAL TAMAÑO: BUSCAR Y NUEVO PROVEEDOR */}
                <div>
                  <label className="block text-sm text-white/70 font-semibold mb-1">Proveedor *</label>
                  <select
                    value={form.proveedor_id}
                    onChange={(e) => setForm({ ...form, proveedor_id: e.target.value })}
                    className="w-full gestarian-field rounded-lg px-4 py-2.5 text-sm focus:outline-none mb-2 font-bold text-white"
                  >
                    <option value="">Seleccionar proveedor...</option>
                    {proveedores.map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>

                  {/* Dos botones de igual tamaño con idéntico relleno y línea de contorno */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setShowProveedorSearch(!showProveedorSearch)}
                      className="py-2.5 px-3 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border-2 border-purple-500/40 text-xs font-black flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow"
                    >
                      <Search className="w-4 h-4 text-purple-400" />
                      <span>Buscar proveedor</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowNuevoProveedorModal(true)}
                      className="py-2.5 px-3 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border-2 border-purple-500/40 text-xs font-black flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow"
                    >
                      <Plus className="w-4 h-4 text-purple-400 font-black" />
                      <span>Proveedor</span>
                    </button>
                  </div>

                  {/* Campo de búsqueda rápida si se despliega */}
                  {showProveedorSearch && (
                    <div className="mt-2 space-y-1.5 bg-bg-800/90 p-3 rounded-xl border border-purple-500/30 animate-in fade-in duration-150">
                      <input
                        type="text"
                        autoFocus
                        value={proveedorSearchText}
                        onChange={(e) => setProveedorSearchText(e.target.value)}
                        placeholder="Filtrar por nombre o CIF..."
                        className="w-full bg-bg-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-400"
                      />
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {proveedores
                          .filter(p => p.nombre.toLowerCase().includes(proveedorSearchText.toLowerCase()) || (p.cif && p.cif.toLowerCase().includes(proveedorSearchText.toLowerCase())))
                          .map(p => (
                            <div
                              key={p.id}
                              onClick={() => {
                                setForm((prev) => ({ ...prev, proveedor_id: p.id }))
                                setShowProveedorSearch(false)
                                setProveedorSearchText('')
                              }}
                              className="px-2 py-1.5 rounded text-xs hover:bg-purple-900/40 cursor-pointer flex justify-between text-slate-200"
                            >
                              <span className="font-semibold">{p.nombre}</span>
                              <span className="text-[10px] text-slate-400">{p.cif || ''}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* CAMPO RELACIONAR CON PRESUPUESTO EMITIDO */}
                <div>
                  <label className="block text-sm text-white/70 font-semibold mb-1">
                    Relacionar con Presupuesto Emitido (Opcional)
                  </label>
                  <select
                    value={form.presupuesto_id}
                    onChange={(e) => setForm({ ...form, presupuesto_id: e.target.value })}
                    className="w-full gestarian-field rounded-lg px-4 py-2.5 text-sm focus:outline-none font-semibold text-white"
                  >
                    <option value="">— Sin presupuesto relacionado —</option>
                    {presupuestos.map((p) => {
                      const cli = clientes.find((c) => c.id === p.cliente_id)
                      return (
                        <option key={p.id} value={p.id}>
                          {p.numero} - {cli?.nombre || 'Cliente'} ({p.total.toFixed(2)} €)
                        </option>
                      )
                    })}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-white/70 font-semibold mb-1">Fecha</label>
                    <input
                      type="date"
                      value={form.fecha}
                      onChange={(e) => handleFechaChange(e.target.value)}
                      className="w-full gestarian-field rounded-lg px-4 py-2.5 text-sm focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white/70 font-semibold mb-1">Estado de Pago</label>
                    <select
                      value={form.estado}
                      onChange={(e) => setForm({ ...form, estado: e.target.value })}
                      className="w-full gestarian-field rounded-lg px-4 py-2.5 text-sm focus:outline-none"
                    >
                      <option value="pendiente">Pendiente de pago</option>
                      <option value="parcial">Parcialmente pagada</option>
                      <option value="pagada">Totalmente pagada</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-white/70 font-semibold mb-1">Base imponible (€)</label>
                    <input
                      type="number"
                      value={form.base_imponible || ''}
                      onChange={(e) => setForm({ ...form, base_imponible: parseFloat(e.target.value) || 0 })}
                      className="w-full gestarian-field rounded-lg px-4 py-2.5 text-sm focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white/70 font-semibold mb-1">IVA (%)</label>
                    <input
                      type="number"
                      value={form.iva}
                      onChange={(e) => setForm({ ...form, iva: parseFloat(e.target.value) || 0 })}
                      className="w-full gestarian-field rounded-lg px-4 py-2.5 text-sm focus:outline-none"
                    />
                  </div>
                </div>

                {/* SECCIÓN DE MEDIO DE PAGO Y CÁMARA PARA CAPTURAR COMPROBANTE */}
                <div className="p-3 bg-bg-800/80 rounded-xl border border-purple-500/30 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-purple-300 uppercase mb-1">
                        Método de Abono / Pago
                      </label>
                      <select
                        value={form.metodo_pago}
                        onChange={(e) => setForm({ ...form, metodo_pago: e.target.value })}
                        className="w-full bg-bg-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400"
                      >
                        <option value="Transferencia">Transferencia bancaria</option>
                        <option value="Tarjeta">Tarjeta bancaria / TPV</option>
                        <option value="Efectivo">Efectivo</option>
                        <option value="Domiciliación">Domiciliación / Recibo SEPA</option>
                        <option value="Bizum">Bizum</option>
                        <option value="Pagaré">Pagaré</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-purple-300 uppercase mb-1">
                        Comprobante / Ticket de Pago
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        ref={formReceiptFileInputRef}
                        onChange={handleFormCaptureReceiptPhoto}
                      />
                      <button
                        type="button"
                        onClick={() => formReceiptFileInputRef.current?.click()}
                        className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/40 text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95"
                      >
                        <Camera className="w-4 h-4 text-purple-400" />
                        <span>{form.recibo_foto ? 'Recibo capturado ✓' : 'Capturar con cámara'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between text-sm pt-3 border-t border-slate-700">
                  <span className="text-purple-300 font-bold uppercase">Total Factura:</span>
                  <span className="font-black text-white text-lg">{total.toFixed(2)} €</span>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button onClick={handleSave} className="flex-1">Guardar Factura</Button>
                <Button variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Modal Crear Nuevo Proveedor Rápido */}
      {showNuevoProveedorModal && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4" onClick={() => setShowNuevoProveedorModal(false)}>
          <Card className="w-full max-w-sm p-5 border-2 border-purple-500/80 bg-bg-900 shadow-2xl">
            <div onClick={(e) => e.stopPropagation()} className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-purple-900/40">
                <h3 className="text-sm font-black text-white uppercase tracking-wider">+ Nuevo Proveedor</h3>
                <button onClick={() => setShowNuevoProveedorModal(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
              <Input label="Nombre o Razón Social *" value={nuevoProveedorNombre} onChange={setNuevoProveedorNombre} placeholder="Ej: Recambios Norte S.L." />
              <Input label="CIF / NIF" value={nuevoProveedorCif} onChange={setNuevoProveedorCif} placeholder="B-12345678" />
              <Input label="Teléfono" value={nuevoProveedorTelefono} onChange={setNuevoProveedorTelefono} placeholder="600000000" />
              <div className="flex gap-2 pt-2">
                <Button onClick={handleCrearProveedorRapido} className="flex-1">Añadir Proveedor</Button>
                <Button variant="secondary" onClick={() => setShowNuevoProveedorModal(false)}>Cancelar</Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Modal Vincular / Buscar Presupuesto Emitido */}
      {showVincularPresupuestoModal && (
        <div
          className="fixed inset-0 bg-black/80 z-[65] flex items-center justify-center p-4"
          onClick={() => setShowVincularPresupuestoModal(false)}
        >
          <Card className="w-full max-w-lg p-5 border-2 border-cyan-500/80 bg-bg-900 shadow-2xl max-h-[85vh] flex flex-col">
            <div onClick={(e) => e.stopPropagation()} className="flex flex-col h-full space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-cyan-900/50">
                <div className="flex items-center gap-2">
                  <Search className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    Vincular Presupuesto Emitido
                  </h3>
                </div>
                <button
                  onClick={() => setShowVincularPresupuestoModal(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Buscador interactivo por Nº, Matrícula, Marca, Modelo o Cliente */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400 pointer-events-none" />
                <input
                  type="text"
                  value={presupuestoSearchText}
                  onChange={(e) => setPresupuestoSearchText(e.target.value)}
                  placeholder="Buscar por Nº, matrícula, marca, modelo o cliente..."
                  className="w-full bg-cyan-950/20 border-2 border-cyan-500/40 rounded-xl pl-9 pr-8 py-2.5 text-xs text-white placeholder:text-cyan-300/40 focus:outline-none focus:border-cyan-400"
                  autoFocus
                />
                {presupuestoSearchText && (
                  <button
                    onClick={() => setPresupuestoSearchText('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Lista filtrada de presupuestos */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[50vh]">
                {(() => {
                  const q = presupuestoSearchText.toLowerCase().trim()
                  const filtradosPresupuestos = presupuestos.filter((pres) => {
                    if (!q) return true
                    const cli = clientes.find((c) => c.id === pres.cliente_id)
                    const veh = vehiculos.find((v) => v.id === pres.vehiculo_id)

                    const matchNum = pres.numero.toLowerCase().includes(q)
                    const matchId = pres.id.toLowerCase().includes(q)
                    const matchCliente = (cli?.nombre ?? '').toLowerCase().includes(q) || (cli?.telefono ?? '').toLowerCase().includes(q)
                    const matchMatricula = (veh?.matricula ?? '').toLowerCase().includes(q)
                    const matchMarca = (veh?.marca ?? '').toLowerCase().includes(q)
                    const matchModelo = (veh?.modelo ?? '').toLowerCase().includes(q)

                    return matchNum || matchId || matchCliente || matchMatricula || matchMarca || matchModelo
                  })

                  if (filtradosPresupuestos.length === 0) {
                    return (
                      <div className="py-8 text-center text-xs text-slate-500">
                        No se encontraron presupuestos que coincidan con la búsqueda.
                      </div>
                    )
                  }

                  return filtradosPresupuestos.slice(0, 30).map((pres) => {
                    const cli = clientes.find((c) => c.id === pres.cliente_id)
                    const veh = vehiculos.find((v) => v.id === pres.vehiculo_id)
                    const isSelected = selectedFactura?.presupuesto_id === pres.id

                    return (
                      <div
                        key={pres.id}
                        onClick={() => vincularPresupuestoAFactura(pres.id)}
                        className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-cyan-950/60 border-cyan-400 text-white shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                            : 'bg-bg-800/80 border-slate-700 hover:border-cyan-500/50 hover:bg-cyan-950/20 text-slate-300'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/30">
                              {pres.numero}
                            </span>
                            {cli && (
                              <span className="font-semibold text-white">
                                {cli.nombre}
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-slate-400 flex items-center gap-2">
                            {veh && (
                              <span className="text-cyan-400/90 font-medium">
                                🚗 {veh.matricula} ({veh.marca} {veh.modelo})
                              </span>
                            )}
                            <span>• {new Date(pres.fecha).toLocaleDateString('es-ES')}</span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="block font-black text-white text-sm">
                            {pres.total.toFixed(2)} €
                          </span>
                          <span className="text-[10px] text-cyan-400 font-bold uppercase">
                            {isSelected ? '✓ Seleccionado' : 'Vincular'}
                          </span>
                        </div>
                      </div>
                    )
                  })
                })()}
              </div>

              {/* Botón de desvincular o cerrar */}
              <div className="flex gap-2 pt-2 border-t border-slate-800">
                {selectedFactura?.presupuesto_id && (
                  <Button
                    variant="danger"
                    onClick={() => vincularPresupuestoAFactura(null)}
                    className="text-xs"
                  >
                    Desvincular
                  </Button>
                )}
                <Button
                  variant="secondary"
                  onClick={() => setShowVincularPresupuestoModal(false)}
                  className="flex-1 text-xs"
                >
                  Cerrar
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Visor de Comprobante / Foto de Recibo */}
      {viewerFoto && (
        <div
          className="fixed inset-0 bg-black/90 z-[70] flex items-center justify-center p-4"
          onClick={() => setViewerFoto(null)}
        >
          <div className="relative max-w-xl max-h-[85vh] p-2 bg-slate-900 border-2 border-purple-500 rounded-2xl overflow-hidden shadow-2xl">
            <button
              onClick={() => setViewerFoto(null)}
              className="absolute top-4 right-4 text-white bg-black/70 p-2 rounded-full z-10"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={viewerFoto}
              alt="Comprobante de pago"
              className="max-h-[75vh] w-auto mx-auto object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  )
}

/* ──────────────── Proveedores ──────────────── */
export function ProveedoresPage() {
  const navigate = useNavigate()
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [facturasRecibidas, setFacturasRecibidas] = useState<FacturaRecibida[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ nombre: '', cif: '', direccion: '', telefono: '', email: '', contacto: '' })
  const [selectedProveedorFacturas, setSelectedProveedorFacturas] = useState<Proveedor | null>(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const [{ data: prov }, { data: fac }] = await Promise.all([
      supabase.from('proveedores').select('*').order('nombre'),
      supabase.from('facturas_recibidas').select('*').order('created_at', { ascending: false }),
    ])
    setProveedores(prov ?? [])
    setFacturasRecibidas(fac ?? [])
  }

  function handleOpenCreate() {
    setEditingId(null)
    setForm({ nombre: '', cif: '', direccion: '', telefono: '', email: '', contacto: '' })
    setShowForm(true)
  }

  function handleOpenEdit(p: Proveedor, e?: React.MouseEvent) {
    e?.stopPropagation()
    setEditingId(p.id)
    setForm({
      nombre: p.nombre,
      cif: p.cif || '',
      direccion: p.direccion || '',
      telefono: p.telefono || '',
      email: p.email || '',
      contacto: p.contacto || '',
    })
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.nombre.trim()) return
    const payload = {
      nombre: form.nombre.trim(),
      cif: form.cif.trim() || null,
      direccion: form.direccion.trim() || null,
      telefono: form.telefono.trim() || null,
      email: form.email.trim() || null,
      contacto: form.contacto.trim() || null,
    }

    if (editingId) {
      await supabase.from('proveedores').update(payload).eq('id', editingId)
    } else {
      await supabase.from('proveedores').insert(payload)
    }

    setForm({ nombre: '', cif: '', direccion: '', telefono: '', email: '', contacto: '' })
    setEditingId(null)
    setShowForm(false)
    load()
  }

  async function deleteProveedor(id: string, e?: React.MouseEvent) {
    e?.stopPropagation()
    if (!confirm('¿Eliminar este proveedor?')) return
    await supabase.from('proveedores').delete().eq('id', id)
    if (expandedId === id) setExpandedId(null)
    load()
  }

  const filtrados = proveedores.filter((p) =>
    p.nombre.toLowerCase().includes(search.toLowerCase()) ||
    (p.cif ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (p.contacto ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const facturasDelProveedor = selectedProveedorFacturas
    ? facturasRecibidas.filter((f) => f.proveedor_id === selectedProveedorFacturas.id)
    : []

  return (
    <div>
      <PageHeader title="Proveedores">
        <button
          onClick={() => navigate(-1)}
          className="w-[60px] h-[60px] rounded-2xl bg-slate-800/80 text-white border border-white/20 flex items-center justify-center hover:bg-slate-700 transition-transform active:scale-95 shrink-0 shadow-[0_0_15px_rgba(255,255,255,0.1)]"
          title="Volver"
          aria-label="Volver"
        >
          <ArrowLeft className="w-7 h-7" />
        </button>
      </PageHeader>
      
      {/* Fila única: Buscar Proveedor a la izquierda y Botón + Proveedor con Camión a la derecha */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar proveedor..."
            className="w-full bg-purple-950/20 border-2 border-purple-500/40 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-purple-300/50 focus:outline-none focus:border-purple-400 shadow-inner"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-5 py-3 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border-2 border-purple-500/60 font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-95 shrink-0 shadow-[0_0_12px_rgba(168,85,247,0.25)]"
          title="Nuevo Proveedor"
        >
          <Plus className="w-5 h-5 text-purple-400 font-black" />
          <Truck className="w-5 h-5 text-purple-400" />
          <span className="hidden sm:inline">Proveedor</span>
        </button>
      </div>

      {filtrados.length === 0 ? (
        <EmptyState icon={<Truck className="w-12 h-12" />} title="No hay proveedores" subtitle="Añade tus proveedores para gestionar facturas recibidas" />
      ) : (
        <div className="space-y-3">
          {filtrados.map((p) => {
            const facCount = facturasRecibidas.filter((f) => f.proveedor_id === p.id).length
            const isExpanded = expandedId === p.id

            // Formatear teléfono limpio para WhatsApp y Llamadas
            const cleanPhone = (p.telefono || '').replace(/\D/g, '')

            return (
              <Card
                key={p.id}
                onClick={() => setExpandedId(isExpanded ? null : p.id)}
                className={`p-4 border-2 transition-all bg-bg-900/90 shadow-md cursor-pointer ${
                  isExpanded
                    ? 'border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.25)]'
                    : 'border-purple-500/30 hover:border-purple-500/60'
                }`}
              >
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2">
                      <Truck className="w-5 h-5 text-purple-400" />
                      <span className="font-bold text-white text-base">{p.nombre}</span>
                      {p.cif && (
                        <span className="text-xs text-purple-300 font-mono bg-purple-950/60 px-2 py-0.5 rounded border border-purple-500/30">
                          {p.cif}
                        </span>
                      )}
                    </div>

                    {/* Resumen básico visible siempre */}
                    <div className="text-xs text-slate-400 mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                      {p.contacto && <p><span className="text-slate-500">Contacto:</span> {p.contacto}</p>}
                      {p.telefono && <p><span className="text-slate-500">Tel:</span> {p.telefono}</p>}
                      {p.email && <p className="text-purple-300/80 truncate max-w-xs">{p.email}</p>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    {/* Botón +FP (Ver Facturas del Proveedor) */}
                    <button
                      onClick={() => setSelectedProveedorFacturas(p)}
                      className="px-3.5 py-2 rounded-xl bg-purple-500/15 hover:bg-purple-500/30 text-purple-300 border-2 border-purple-500/50 font-black text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow"
                      title="Ver todas las facturas de este proveedor"
                    >
                      <Receipt className="w-4 h-4 text-purple-400" />
                      <span>+FP</span>
                      <span className="bg-purple-500/40 px-1.5 py-0.2 rounded-full text-[10px] text-white">
                        {facCount}
                      </span>
                    </button>

                    {/* Botón Editar Proveedor */}
                    <button
                      onClick={(e) => handleOpenEdit(p, e)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-purple-900/40 text-purple-300 border border-purple-500/30 transition-all"
                      title="Editar proveedor"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    {/* Botón Eliminar Proveedor */}
                    <button
                      onClick={(e) => deleteProveedor(p.id, e)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-red-950/40 text-slate-400 hover:text-red-400 border border-slate-700 transition-colors"
                      title="Eliminar proveedor"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    {/* Icono indicador de expansión */}
                    <div className="text-slate-500 pl-1">
                      {isExpanded ? <ChevronUp className="w-5 h-5 text-purple-400" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>
                </div>

                {/* ── SECCIÓN EXPANDIBLE HACIA ABAJO CON DATOS EXTENDIDOS Y ACCIONES DIRECTAS DE CONTACTO ── */}
                {isExpanded && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="mt-4 pt-3.5 border-t border-purple-900/50 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-bg-950/50 p-3.5 rounded-xl border border-purple-500/20">
                      <div>
                        <span className="text-slate-500 block font-semibold">Persona / Contacto:</span>
                        <span className="text-white font-medium">{p.contacto || '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block font-semibold">CIF / NIF:</span>
                        <span className="text-purple-300 font-mono font-medium">{p.cif || '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block font-semibold">Dirección Fiscal / Entrega:</span>
                        <span className="text-white font-medium">{p.direccion || '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block font-semibold">Facturas Emitidas por Proveedor:</span>
                        <span className="text-cyan-400 font-bold">{facCount} facturas registradas</span>
                      </div>
                    </div>

                    {/* BOTONES DE CONTACTO DIRECTO (EMAIL, TELÉFONO Y WHATSAPP) */}
                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      {/* Botón Teléfono (Llamar) */}
                      {p.telefono ? (
                        <a
                          href={`tel:${p.telefono}`}
                          className="flex-1 min-w-[120px] py-2 px-3 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 text-center"
                        >
                          <Phone className="w-4 h-4 text-blue-400" />
                          <span>Llamar</span>
                        </a>
                      ) : (
                        <div className="flex-1 min-w-[120px] py-2 px-3 rounded-xl bg-slate-800/40 text-slate-500 border border-slate-700/50 text-xs font-bold flex items-center justify-center gap-2 cursor-not-allowed text-center">
                          <Phone className="w-4 h-4" />
                          <span>Sin Teléfono</span>
                        </div>
                      )}

                      {/* Botón WhatsApp */}
                      {cleanPhone ? (
                        <a
                          href={`https://wa.me/${cleanPhone.startsWith('34') ? cleanPhone : `34${cleanPhone}`}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 min-w-[120px] py-2 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 text-center"
                        >
                          <MessageCircle className="w-4 h-4 text-emerald-400" />
                          <span>WhatsApp</span>
                        </a>
                      ) : (
                        <div className="flex-1 min-w-[120px] py-2 px-3 rounded-xl bg-slate-800/40 text-slate-500 border border-slate-700/50 text-xs font-bold flex items-center justify-center gap-2 cursor-not-allowed text-center">
                          <MessageCircle className="w-4 h-4" />
                          <span>Sin WhatsApp</span>
                        </div>
                      )}

                      {/* Botón Email */}
                      {p.email ? (
                        <a
                          href={`mailto:${p.email}`}
                          className="flex-1 min-w-[120px] py-2 px-3 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 text-center"
                        >
                          <Mail className="w-4 h-4 text-purple-400" />
                          <span>Enviar Email</span>
                        </a>
                      ) : (
                        <div className="flex-1 min-w-[120px] py-2 px-3 rounded-xl bg-slate-800/40 text-slate-500 border border-slate-700/50 text-xs font-bold flex items-center justify-center gap-2 cursor-not-allowed text-center">
                          <Mail className="w-4 h-4" />
                          <span>Sin Email</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal Ver Todas las Facturas del Proveedor (+FP) */}
      {selectedProveedorFacturas && (
        <div
          className="fixed inset-0 bg-bg-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setSelectedProveedorFacturas(null)}
        >
          <Card className="w-full max-w-2xl p-5 my-8 max-h-[85vh] overflow-y-auto border-2 border-purple-500 bg-bg-900 shadow-2xl">
            <div onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-purple-900/50">
                <div className="flex items-center gap-2">
                  <Receipt className="w-6 h-6 text-purple-400" />
                  <div>
                    <h3 className="text-base font-black text-white uppercase tracking-wider">
                      Facturas: {selectedProveedorFacturas.nombre}
                    </h3>
                    <p className="text-xs text-purple-300 font-semibold">
                      Total Facturas Registradas: {facturasDelProveedor.length}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedProveedorFacturas(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {facturasDelProveedor.length === 0 ? (
                <EmptyState
                  icon={<Receipt className="w-12 h-12 text-purple-400" />}
                  title="Sin facturas registradas"
                  subtitle="No se han registrado facturas recibidas para este proveedor."
                />
              ) : (
                <div className="space-y-3">
                  {facturasDelProveedor.map((f) => {
                    const totalPagado = f.total_pagado ?? (f.estado === 'pagada' || f.estado === 'abonada' ? f.total : 0)
                    const saldoPendiente = Math.max(0, f.total - totalPagado)
                    const isAbonada = f.estado === 'pagada' || f.estado === 'abonada' || saldoPendiente <= 0.01
                    const isParcial = (f.estado === 'parcial' || totalPagado > 0) && !isAbonada

                    let borderClass = 'border-[3px] border-orange-500 bg-orange-950/10'
                    let estadoTexto = 'PENDIENTE'
                    let estadoColor: 'yellow' | 'blue' | 'green' = 'yellow'

                    if (isAbonada) {
                      borderClass = 'border-[3px] border-emerald-500 bg-emerald-950/15'
                      estadoTexto = 'ABONADA'
                      estadoColor = 'green'
                    } else if (isParcial) {
                      borderClass = 'border-[3px] border-blue-500 bg-blue-950/15'
                      estadoTexto = 'PARCIAL'
                      estadoColor = 'blue'
                    }

                    return (
                      <div
                        key={f.id}
                        className={`rounded-2xl p-4 transition-all shadow-md ${borderClass} space-y-2`}
                      >
                        <div className="flex items-center justify-between text-xs font-mono font-bold">
                          <span className="text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-500/40">
                            {(f as any).numero_registro || 'FR'}
                          </span>
                          <span className="text-slate-300">FAC: {f.numero}</span>
                        </div>

                        <div className="flex items-center justify-between text-xs pt-1">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 font-semibold">Estado:</span>
                            <Badge text={estadoTexto} color={estadoColor} />
                          </div>
                          <span className="text-slate-400 font-semibold">
                            {new Date(f.fecha).toLocaleDateString('es-ES')}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-sm pt-2 border-t border-slate-700/60 font-black">
                          <span className="text-slate-400 text-xs">Total Factura:</span>
                          <div className="flex items-center gap-2">
                            {saldoPendiente > 0 && isParcial && (
                              <span className="text-xs text-blue-400 font-black">
                                Resto Abono: {saldoPendiente.toFixed(2)} €
                              </span>
                            )}
                            <span className="text-white text-base">{f.total.toFixed(2)} €</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="mt-5 flex justify-end">
                <Button variant="secondary" onClick={() => setSelectedProveedorFacturas(null)}>
                  Cerrar
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Modal Crear / Editar Proveedor */}
      {showForm && (
        <div className="fixed inset-0 bg-bg-950/80 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <Card className="w-full max-w-md p-6">
            <div onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">
                  {editingId ? 'Editar Proveedor' : 'Nuevo Proveedor'}
                </h2>
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
                <Button onClick={handleSave} className="flex-1">
                  {editingId ? 'Guardar Cambios' : 'Crear Proveedor'}
                </Button>
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
