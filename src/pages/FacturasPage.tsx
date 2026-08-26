import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import type { Factura, Cliente, Cobro, Concepto, Configuracion, Presupuesto, Vehiculo } from '../lib/types'
import { Trash2, Edit3, Image as ImageIcon, Send, ArrowLeft, Camera, FileText, Printer, Mail, Save, X, Check, Calendar, Download, MessageCircle, Search, CheckCircle2, Plus, FolderOpen } from 'lucide-react'
import { ExpedienteFolderIcon } from '../components/CustomIcons'
import { Card, Badge, PageHeader, EmptyState, MetisRowButton, MatriculaBadge } from '../components/UI'
import { GlobalImageViewer } from '../components/GlobalImageViewer'
import { sendFacturaByEmail, downloadFacturaPDF, generateFacturaPDF } from '../lib/pdfGenerator'
import { getExpediente } from '../lib/utils'
import { fetchExpedienteFotos, saveExpedienteFoto } from '../lib/expedienteService'
import { shareDocumentoViaWhatsApp } from '../services/documentShareService'
import { playSuccessChime } from '../lib/sound'
import { useToast } from '../lib/ToastContext'
import { FacturasRecibidasPage } from './Pages'
import { generateVerifactuQRDataUrlSync, VERIFACTU_NORMATIVA_TEXT } from '../lib/verifactuService'


const IVA_RATE = 0.21

export function FacturasPage() {
  const { showToast } = useToast()
  const location = useLocation()
  const navigate = useNavigate()
  const navState = location.state as { 
    reparacionId?: string; 
    clienteId?: string; 
    vehiculoId?: string; 
    facturaNumero?: string;
    presupuestoId?: string;
    mode?: string;
  } | null

  const [activeTab, setActiveTab] = useState<'emitidas' | 'recibidas'>('emitidas')
  const [facturas, setFacturas] = useState<Factura[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([])
  const [citas, setCitas] = useState<any[]>([])
  const [presupuestos, setPresupuestos] = useState<any[]>([])
  const [config, setConfig] = useState<Configuracion | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedFactura, setSelectedFactura] = useState<Factura | null>(null)
  const [isEditingDraft, setIsEditingDraft] = useState(false)
  const [hasPendingChanges, setHasPendingChanges] = useState(false)
  const [showExitConfirmModal, setShowExitConfirmModal] = useState(false)

  const handleVolver = () => {
    if (selectedFactura?.id === 'draft' || hasPendingChanges || isEditingDraft) {
      setShowExitConfirmModal(true)
    } else {
      if (navState) {
        navigate(-1)
      } else {
        setSelectedFactura(null)
      }
    }
  }

  const salirDirecto = () => {
    setShowExitConfirmModal(false)
    setIsEditingDraft(false)
    setHasPendingChanges(false)
    if (navState) {
      navigate(-1)
    } else {
      setSelectedFactura(null)
    }
  }
  const [cobros, setCobros] = useState<Cobro[]>([])
  const [showRegistro, setShowRegistro] = useState(false)
  const [trimestreFilter, setTrimestreFilter] = useState('')
  const [viewerMatricula, setViewerMatricula] = useState<string | null>(null)
  const [fotosExpandida, setFotosExpandida] = useState<string | null>(null)
  const [expedienteFotos, setExpedienteFotos] = useState<string[]>([])
  const [showExpedienteViewer, setShowExpedienteViewer] = useState(false)
  const [expedienteViewerTitle, setExpedienteViewerTitle] = useState("Fotos del Expediente")
  const [expandedClienteId, setExpandedClienteId] = useState<string | null>(null)
  const [escaneandoOCR, setEscaneandoOCR] = useState(false)

  const [activeTooltip, setActiveTooltip] = useState<'pagada' | 'parcial' | 'impagada' | 'enviada' | 'emitida' | null>(null)
  const [showSearchInput, setShowSearchInput] = useState(false)
  const [globalSearchText, setGlobalSearchText] = useState('')
  const [estadoFilter, setEstadoFilter] = useState('')

  const defaultFacturaObs = "Puede acceder al seguimiento de su reparación en tiempo real online a través de nuestra aplicación donde también podrá descargar documentos.\n\n";
  const [observaciones, setObservaciones] = useState(defaultFacturaObs);
  const [showCobroPanel, setShowCobroPanel] = useState(false);
  const [nuevoAbono, setNuevoAbono] = useState('');
  const [modalEnvioOpen, setModalEnvioOpen] = useState(false);



  useEffect(() => {
    loadFacturas()
    loadClientes()
    loadVehiculos()
    loadConfig()
    loadCitasYPresupuestos()
  }, [])

  async function loadCitasYPresupuestos() {
    const { data: cData } = await supabase.from('citas').select('*')
    if (cData) setCitas(cData)
    const { data: pData } = await supabase.from('presupuestos').select('*')
    if (pData) setPresupuestos(pData)
  }

  useEffect(() => {
    if (navState?.facturaNumero && facturas.length > 0 && !selectedFactura) {
      const f = facturas.find(f => f.numero === navState.facturaNumero)
      if (f) {
        setSelectedFactura(f)
      }
    }
  }, [navState?.facturaNumero, facturas, selectedFactura])

  async function loadFacturas() {
    setLoading(true)
    const { data } = await supabase.from('facturas').select('*').order('created_at', { ascending: false })
    setFacturas((data ?? []).map(f => ({
      ...f,
      observaciones: (f as any).observaciones || localStorage.getItem(`factura_${f.id}_observaciones`) || undefined,
      enviado_email_at: (f as any).enviado_email_at || localStorage.getItem(`factura_${f.id}_email_at`),
      enviado_email_2_at: (f as any).enviado_email_2_at || localStorage.getItem(`factura_${f.id}_email_2_at`),
      enviado_whatsapp_at: (f as any).enviado_whatsapp_at || localStorage.getItem(`factura_${f.id}_wa_at`),
      enviado_whatsapp_2_at: (f as any).enviado_whatsapp_2_at || localStorage.getItem(`factura_${f.id}_wa_2_at`)
    })))
    setLoading(false)
  }

  function getTrimestres(): { label: string; value: string; start: string; end: string }[] {
    const y = new Date().getFullYear()
    return [
      { label: `1T ${y}`, value: `${y}-1`, start: `${y}-01-01`, end: `${y}-03-31` },
      { label: `2T ${y}`, value: `${y}-2`, start: `${y}-04-01`, end: `${y}-06-30` },
      { label: `3T ${y}`, value: `${y}-3`, start: `${y}-07-01`, end: `${y}-09-30` },
      { label: `4T ${y}`, value: `${y}-4`, start: `${y}-10-01`, end: `${y}-12-31` },
    ]
  }

  const trimestres = getTrimestres()
  const clienteIdFromNav = navState?.clienteId

  const facturasFiltradas = useMemo(() => {
    // Facturación limpia: solo facturas cerradas (100% abonadas)
    let result = facturas.filter(f => f.estado_cobro === 'pagada' || (f.total_abonado >= f.total && f.total > 0))

    // Si viene desde el roadmap para ver todas las facturas del cliente
    if (clienteIdFromNav) {
      result = facturas.filter(f => f.cliente_id === clienteIdFromNav)
    }

    if (trimestreFilter) {
      result = result.filter((f) => {
        const t = trimestres.find((t) => t.value === trimestreFilter)
        return t && f.fecha >= t.start && f.fecha <= t.end
      })
    } else if (!clienteIdFromNav) {
      const now = new Date()
      const month = now.getMonth()
      const y = now.getFullYear()
      let start: string, end: string
      if (month <= 2) { start = `${y}-01-01`; end = `${y}-03-31` }
      else if (month <= 5) { start = `${y}-04-01`; end = `${y}-06-30` }
      else if (month <= 8) { start = `${y}-07-01`; end = `${y}-09-30` }
      else { start = `${y}-10-01`; end = `${y}-12-31` }
      result = result.filter((f) => f.fecha >= start && f.fecha <= end)
    }

    if (estadoFilter) {
      result = result.filter(f => {
        const isEnviado = !!(f.enviado_email_at || f.enviado_whatsapp_at)
        const envioFecha = f.enviado_email_at || f.enviado_whatsapp_at
        const ultimoCobro = localStorage.getItem(`factura_${f.id}_ultimo_cobro`) || f.updated_at
        const fechaEmision = f.fecha || envioFecha || f.created_at

        const isParcialAndLate = f.estado_cobro === 'parcial' && ultimoCobro && (Date.now() - new Date(ultimoCobro).getTime() > 30 * 24 * 60 * 60 * 1000)
        const isPendienteSentAndLate = f.estado_cobro === 'pendiente' && (Date.now() - new Date(fechaEmision).getTime() > 7 * 24 * 60 * 60 * 1000)
        const isImpagada = isParcialAndLate || isPendienteSentAndLate

        if (estadoFilter === 'pagada') return f.estado_cobro === 'pagada'
        if (estadoFilter === 'parcial') return f.estado_cobro === 'parcial' && !isParcialAndLate
        if (estadoFilter === 'impagada') return isImpagada
        if (estadoFilter === 'sin_enviar') return !isEnviado && f.estado_cobro !== 'pagada'
        if (estadoFilter === 'enviada') return isEnviado && f.estado_cobro !== 'pagada'
        return true
      })
    }

    if (globalSearchText.trim()) {
      const q = globalSearchText.toLowerCase()
      result = result.filter(f => {
        const client = clientes.find(c => c.id === f.cliente_id)
        const veh = vehiculos.find(v => v.id === f.vehiculo_id)
        return (
          f.numero.toLowerCase().includes(q) ||
          (client && client.nombre.toLowerCase().includes(q)) ||
          (veh && veh.matricula.toLowerCase().includes(q))
        )
      })
    }
    return result
  }, [facturas, trimestreFilter, trimestres, globalSearchText, clientes, vehiculos, estadoFilter, clienteIdFromNav])

  function toggleFotos(id: string) {
    if (fotosExpandida === id) {
      setFotosExpandida(null)
    } else {
      setFotosExpandida(id)
    }
  }

  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  async function handleScanOCR(e: React.ChangeEvent<HTMLInputElement>, id: string) {
    if (!e.target.files || e.target.files.length === 0) return
    setEscaneandoOCR(true)
    try {
      const file = e.target.files[0]
      const dataUrl = await fileToDataUrl(file)
      
      const { extractTextFromImage } = await import('../lib/ocrService')
      const text = await extractTextFromImage(dataUrl)
      
      if (text.trim()) {
        const f = facturas.find(x => x.id === id)
        if (f) {
          alert(`OCR Detectado en factura:\n\n${text}\n\nNota: La inserción automática de conceptos vía METIS está optimizada para presupuestos actualmente.`);
        }
      }
    } catch (err) {
      console.error(err)
      alert('Error al escanear OCR. Puede que Tesseract tarde un poco en cargar.')
    } finally {
      setEscaneandoOCR(false)
    }
  }

  async function loadClientes() {
    const { data } = await supabase.from('clientes').select('*').order('nombre')
    if (data) {
      const activeEmail = (localStorage.getItem('gestarian_test_user') || '').toLowerCase().trim()
      const userClientsKey = `gestarian_taller_clientes_${activeEmail || 'default'}`
      const rawUserClients = localStorage.getItem(userClientsKey)
      let userClientsIds: string[] = []
      try {
        if (rawUserClients) userClientsIds = JSON.parse(rawUserClients)
      } catch (e) {}

      if (userClientsIds.length > 0) {
        setClientes(data.filter(c => userClientsIds.includes(c.id)))
      } else {
        setClientes([])
      }
    } else {
      setClientes([])
    }
  }

  async function loadVehiculos() {
    const { data } = await supabase.from('vehiculos').select('*')
    setVehiculos(data ?? [])
  }

  async function loadConfig() {
    const { data } = await supabase.from('configuracion').select('*').eq('id', 1).maybeSingle()
    setConfig(data)
  }

  async function crearFacturaDesdeReparacion() {
    const cId = navState?.clienteId
    const vId = navState?.vehiculoId
    const rId = navState?.reparacionId
    const pId = (navState as any)?.presupuestoId

    if (!cId && !vId && !rId && !pId) return

    let finalClienteId = cId || ''
    let finalVehiculoId = vId || null
    let finalReparacionId = rId || null

    // Buscar el presupuesto asociado para copiar los conceptos
    let conceptos: Concepto[] = []
    let total = 0
    let obs = ''

    if (pId) {
      const { data: presup } = await supabase.from('presupuestos').select('*').eq('id', pId).maybeSingle() as { data: Presupuesto | null }
      if (presup) {
        conceptos = (presup as any).conceptos ?? []
        total = (presup as any).total ?? 0
        obs = (presup as any).observaciones ?? ''
        if (!finalClienteId && presup.cliente_id) finalClienteId = presup.cliente_id
        if (!finalVehiculoId && presup.vehiculo_id) finalVehiculoId = presup.vehiculo_id
      }
      
      // Auto-descubrir la reparación vinculada a este presupuesto si no venía explícitamente
      if (!finalReparacionId) {
        const { data: cita } = await supabase.from('citas').select('id').eq('presupuesto_id', pId).maybeSingle()
        if (cita) {
          const { data: rep } = await supabase.from('reparaciones').select('id').eq('cita_id', cita.id).maybeSingle()
          if (rep) finalReparacionId = rep.id
        }
      }
    } else if (rId) {
      // Buscar la cita asociada a esta reparación
      const { data: rep } = await supabase.from('reparaciones').select('cita_id, cliente_id, vehiculo_id').eq('id', rId).maybeSingle()
      if (rep) {
        if (!finalClienteId && rep.cliente_id) finalClienteId = rep.cliente_id
        if (!finalVehiculoId && rep.vehiculo_id) finalVehiculoId = rep.vehiculo_id
        if (rep.cita_id) {
          const { data: cita } = await supabase.from('citas').select('presupuesto_id').eq('id', rep.cita_id).maybeSingle()
          if (cita?.presupuesto_id) {
            const { data: presup } = await supabase.from('presupuestos').select('*').eq('id', cita.presupuesto_id).maybeSingle() as { data: Presupuesto | null }
            if (presup) {
              conceptos = (presup as any).conceptos ?? []
              total = (presup as any).total ?? 0
              obs = (presup as any).observaciones ?? ''
            }
          }
        }
      }
    }

    // Comprobar si ya existe una factura para esta reparación (una vez tenemos el ID final)
    if (finalReparacionId) {
      const { data: existing } = await supabase.from('facturas').select('*').eq('reparacion_id', finalReparacionId).maybeSingle()
      if (existing) {
        selectFactura(existing as Factura)
        return
      }
    }

    // Prefijo con año de 2 dígitos: F26, F27, etc.
    const yearSuffix = String(new Date().getFullYear()).slice(-2)
    const prefix = `F${yearSuffix}`

    // Buscar la última factura del año en curso (prefijo exacto del año)
    const { data: todasFacturasAnio } = await supabase
      .from('facturas')
      .select('numero')
      .like('numero', `${prefix}%`)
      .order('numero', { ascending: false })

    // Encontrar el número correlativo más alto del año actual
    let maxNum = 0
    if (todasFacturasAnio && todasFacturasAnio.length > 0) {
      for (const f of todasFacturasAnio) {
        if (f.numero && f.numero.startsWith(prefix)) {
          const numPart = parseInt(f.numero.substring(prefix.length), 10)
          if (!isNaN(numPart) && numPart > maxNum) {
            maxNum = numPart
          }
        }
      }
    }

    const count = maxNum + 1
    // Formato: F26 + número de 4 dígitos → F260001, F260002...
    const numero = `${prefix}${String(count).padStart(4, '0')}`

    const draftFactura: Factura = {
      id: 'draft',
      numero,
      reparacion_id: finalReparacionId,
      cliente_id: finalClienteId,
      vehiculo_id: finalVehiculoId,
      conceptos,
      total,
      total_abonado: 0,
      estado_cobro: 'pendiente',
      fecha: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    setSelectedFactura(draftFactura)
    if (obs) setObservaciones(obs)
  }

  const isFacturaBloqueada = (f: Factura | null): boolean => {
    if (!f) return false
    return !!(f.enviado_email_at || f.enviado_whatsapp_at)
  }

  async function confirmarFactura() {
    if (!selectedFactura) return
    // Si estaba editando, validar y cerrar modo edición
    if (isEditingDraft) {
      setIsEditingDraft(false)
      setHasPendingChanges(true)
      showToast("Ha modificado la factura, pulse GUARDAR para actualizar", 'info', { duration: 4000, disableBounce: true })
      setTimeout(() => {
        const btnGuardar = document.getElementById('btn-guardar-a4')
        if (btnGuardar) btnGuardar.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 200)
      return
    }

    if (selectedFactura.id === 'draft') {
      showToast("Borrador revisado. Pulse GUARDAR para registrar en BD", 'info', { duration: 3500, disableBounce: true })
      setTimeout(() => {
        const btnGuardar = document.getElementById('btn-guardar-a4')
        if (btnGuardar) btnGuardar.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 200)
    } else {
      showToast("Factura revisada", 'info', { duration: 2500, disableBounce: true })
    }
  }

  async function registrarFactura() {
    if (!selectedFactura) return

    // Caso 1: Factura en Borrador -> Insertar en BD
    if (selectedFactura.id === 'draft') {
      if (selectedFactura.reparacion_id) {
        const { data: existing } = await supabase.from('facturas').select('*').eq('reparacion_id', selectedFactura.reparacion_id).maybeSingle()
        if (existing) {
          setSelectedFactura(existing as Factura)
          setIsEditingDraft(false)
          setHasPendingChanges(false)
          showToast("La factura ya estaba guardada", 'info', { disableBounce: true })
          return
        }
      }

      const yearSuffix = String(new Date().getFullYear()).slice(-2)
      const prefix = `F${yearSuffix}`
      const { data: todas } = await supabase.from('facturas').select('numero').like('numero', `${prefix}%`)
      let maxNum = 0
      for (const f of (todas || [])) {
        if (f.numero && f.numero.startsWith(prefix)) {
          const numPart = parseInt(f.numero.substring(prefix.length), 10)
          if (!isNaN(numPart) && numPart > maxNum) maxNum = numPart
        }
      }
      const finalNumero = `${prefix}${String(maxNum + 1).padStart(4, '0')}`

      const { data, error } = await supabase.from('facturas').insert({
        numero: finalNumero,
        reparacion_id: selectedFactura.reparacion_id,
        cliente_id: selectedFactura.cliente_id,
        vehiculo_id: selectedFactura.vehiculo_id,
        conceptos: selectedFactura.conceptos,
        total: selectedFactura.total,
        total_abonado: 0,
        estado_cobro: selectedFactura.total <= 0 ? 'pagada' : 'pendiente',
        fecha: selectedFactura.fecha
      }).select().single()

      if (error) {
        alert('Error al guardar factura: ' + error.message)
        return
      }

      if (data?.id && observaciones) {
        localStorage.setItem(`factura_${data.id}_observaciones`, observaciones)
      }

      await loadFacturas()
      setSelectedFactura({ ...(data as Factura), observaciones })
      setIsEditingDraft(false)
      setHasPendingChanges(false)
      playSuccessChime()
      showToast("FACTURA GENERADA Y GUARDADA", 'success')
      return
    }

    // Caso 2: Factura Existente -> Actualizar en BD
    const { data: updated, error } = await supabase.from('facturas').update({
      conceptos: selectedFactura.conceptos,
      total: selectedFactura.total
    } as any).eq('id', selectedFactura.id).select().single()

    if (error) {
      alert('Error al actualizar factura: ' + error.message)
      return
    }

    if (selectedFactura.id && observaciones) {
      localStorage.setItem(`factura_${selectedFactura.id}_observaciones`, observaciones)
    }

    await loadFacturas()
    if (updated) setSelectedFactura({ ...(updated as Factura), observaciones })
    setIsEditingDraft(false)
    setHasPendingChanges(false)
    playSuccessChime()
    showToast("EXPEDIENTE ACTUALIZADO", 'success')
  }

  async function guardarYSalir() {
    await registrarFactura()
    salirDirecto()
  }

  useEffect(() => {
    if (navState?.reparacionId || (navState as any)?.presupuestoId || (navState as any)?.openForm) {
      if (!navState?.facturaNumero && !selectedFactura) {
        crearFacturaDesdeReparacion()
      }
    }
  }, [navState])

  useEffect(() => {
    if (navState?.facturaNumero && facturas.length > 0) {
      const f = facturas.find(x => x.numero === navState.facturaNumero);
      if (f) {
        selectFactura(f);
        if (navState.mode === 'scrollToSend') {
          setTimeout(() => {
            const footerEl = document.getElementById('botonera-envio-factura') || document.getElementById('factura-a4');
            if (footerEl) {
              footerEl.scrollIntoView({ behavior: 'smooth', block: 'end' });
            }
          }, 300);
          showToast("Revise la factura antes de enviar", 'info', { duration: 3000, disableBounce: true });
        } else {
          setTimeout(() => document.getElementById('control-cobro')?.scrollIntoView({ behavior: 'smooth' }), 300);
        }
      }
    }
  }, [navState?.facturaNumero, navState?.mode, facturas.length])

  async function selectFactura(f: Factura) {
    setSelectedFactura(f)
    setObservaciones(f.observaciones || defaultFacturaObs)
    const { data } = await supabase.from('cobros').select('*').eq('factura_id', f.id).order('created_at', { ascending: false })
    setCobros(data ?? [])
    setShowCobroPanel(f.estado_cobro === 'parcial' || f.estado_cobro === 'pendiente')
    setNuevoAbono('')
  }

  async function registrarAbono() {
    if (!selectedFactura || !nuevoAbono) return
    const importe = parseFloat(nuevoAbono)
    if (isNaN(importe) || importe <= 0) return

    await supabase.from('cobros').insert({ factura_id: selectedFactura.id, importe })

    const nuevoTotalAbonado = selectedFactura.total_abonado + importe
    const nuevoEstado = nuevoTotalAbonado >= selectedFactura.total ? 'pagada' : 'parcial'
    const nowIso = new Date().toISOString()
    localStorage.setItem(`factura_${selectedFactura.id}_ultimo_cobro`, nowIso)

    await supabase.from('facturas').update({
      total_abonado: nuevoTotalAbonado,
      estado_cobro: nuevoEstado,
    }).eq('id', selectedFactura.id)

    setNuevoAbono('')
    setShowCobroPanel(false)
    loadFacturas()
    const updated: Factura = { ...selectedFactura, total_abonado: nuevoTotalAbonado, estado_cobro: nuevoEstado as Factura['estado_cobro'] }
    setSelectedFactura(updated)
    const { data } = await supabase.from('cobros').select('*').eq('factura_id', selectedFactura.id).order('created_at', { ascending: false })
    setCobros(data ?? [])

    playSuccessChime()
    if (nuevoEstado === 'pagada') {
      showToast("FACTURA ABONADA", 'success')
    } else {
      showToast("COBRO PARCIAL REGISTRADO", 'success')
    }
  }

  async function abonarTodo() {
    if (!selectedFactura || saldoPendiente <= 0) return
    const importe = saldoPendiente
    await supabase.from('cobros').insert({ factura_id: selectedFactura.id, importe })
    const nuevoTotalAbonado = selectedFactura.total
    const nuevoEstado = 'pagada' as Factura['estado_cobro']
    const nowIso = new Date().toISOString()
    localStorage.setItem(`factura_${selectedFactura.id}_ultimo_cobro`, nowIso)

    await supabase.from('facturas').update({
      total_abonado: nuevoTotalAbonado,
      estado_cobro: nuevoEstado,
    }).eq('id', selectedFactura.id)

    setShowCobroPanel(false)
    loadFacturas()
    const updated: Factura = { ...selectedFactura, total_abonado: nuevoTotalAbonado, estado_cobro: nuevoEstado }
    setSelectedFactura(updated)
    const { data } = await supabase.from('cobros').select('*').eq('factura_id', selectedFactura.id).order('created_at', { ascending: false })
    setCobros(data ?? [])

    playSuccessChime()
    showToast("FACTURA ABONADA", 'success')
  }

  async function eliminarFactura(id: string) {
    if (!confirm('¿Eliminar esta factura? Esta acción no se puede deshacer.')) return
    await supabase.from('cobros').delete().eq('factura_id', id)
    await supabase.from('facturas').delete().eq('id', id)
    setSelectedFactura(null)
    loadFacturas()
  }

  function descargarPDF() {
    if (!selectedFactura) return
    const cliente = clienteData(selectedFactura.cliente_id)
    const base = selectedFactura.total / (1 + IVA_RATE)
    const iva = selectedFactura.total - base
    const rows = (selectedFactura.conceptos ?? []).map(c =>
      `<tr><td>${c.descripcion}</td><td style="text-align:center">${c.cantidad}</td><td style="text-align:right">${c.precio.toFixed(2)} €</td><td style="text-align:right">${(c.cantidad * c.precio).toFixed(2)} €</td></tr>`
    ).join('')
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${selectedFactura.numero}</title>
    <style>body{font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:40px;color:#111}
    h1{font-size:28px;font-weight:bold;text-transform:uppercase;letter-spacing:2px;color:#111}
    .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #111;padding-bottom:20px;margin-bottom:24px}
    .empresa{font-size:18px;font-weight:bold} .meta{text-align:right}
    .cliente-box{margin-bottom:24px;padding:14px;background:#f8f8f8;border-radius:6px}
    table{width:100%;border-collapse:collapse;margin-bottom:20px}
    th{background:#111;color:#fff;padding:8px;text-align:left;font-size:12px;text-transform:uppercase}
    td{padding:8px;border-bottom:1px solid #e5e5e5;font-size:13px}
    .totales{display:flex;justify-content:flex-end}
    .totales-box{width:260px}
    .total-row{display:flex;justify-content:space-between;padding:4px 0;font-size:13px;color:#555}
    .total-final{display:flex;justify-content:space-between;padding:8px 0;font-size:16px;font-weight:bold;border-top:2px solid #111;margin-top:4px}
    .footer{margin-top:32px;padding-top:16px;border-top:1px solid #e5e5e5;font-size:11px;color:#888}
    @media print{body{padding:20px}}</style></head><body>
    <div class="header">
      <div><div class="empresa">${config?.nombre_empresa ?? 'DM CAR'}</div>
      <div style="font-size:12px;color:#666;margin-top:4px">${config?.cif ?? ''}</div>
      <div style="font-size:12px;color:#666">${config?.direccion ?? ''}</div>
      ${config?.telefono ? `<div style="font-size:12px;color:#666">Tel: ${config.telefono}</div>` : ''}</div>
      <div class="meta"><h1>Factura</h1><div style="font-size:14px;color:#555">${selectedFactura.numero}</div>
      <div style="font-size:12px;color:#888">${new Date(selectedFactura.fecha).toLocaleDateString('es-ES')}</div></div>
    </div>
    <div class="cliente-box"><div style="font-size:11px;color:#888;text-transform:uppercase;font-weight:bold;margin-bottom:4px">Facturar a:</div>
      <div style="font-size:15px;font-weight:bold">${cliente?.nombre ?? '—'}</div>
      ${cliente?.dni ? `<div style="font-size:12px;color:#555">DNI: ${cliente.dni}</div>` : ''}
      ${cliente?.direccion ? `<div style="font-size:12px;color:#555">${cliente.direccion}</div>` : ''}
      ${cliente?.telefono ? `<div style="font-size:12px;color:#555">Tel: ${cliente.telefono}</div>` : ''}</div>
    <table><thead><tr><th>Descripción</th><th style="text-align:center">Cant.</th><th style="text-align:right">Precio</th><th style="text-align:right">Importe</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="4" style="text-align:center;color:#888">Sin conceptos</td></tr>'}</tbody></table>
    <div class="totales"><div class="totales-box">
      <div class="total-row"><span>Base imponible</span><span>${base.toFixed(2)} €</span></div>
      <div class="total-row"><span>IVA (21%)</span><span>${iva.toFixed(2)} €</span></div>
      <div class="total-final"><span>TOTAL</span><span>${selectedFactura.total.toFixed(2)} €</span></div></div></div>
    <div class="footer">Estado de cobro: ${selectedFactura.estado_cobro.toUpperCase()} · Abonado: ${selectedFactura.total_abonado.toFixed(2)} € · Resto Abono: ${(selectedFactura.total - selectedFactura.total_abonado).toFixed(2)} €</div>
    </body></html>`
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedFactura.numero}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function enviarEmail() {
    if (!selectedFactura) return
    const cliente = clienteData(selectedFactura.cliente_id)
    const vehiculo = selectedFactura.vehiculo_id ? vehiculos.find(v => v.id === selectedFactura.vehiculo_id) : null
    sendFacturaByEmail({ ...selectedFactura, observaciones }, cliente, vehiculo, config)
    const nowIso = new Date().toISOString()

    const isSecond = !!selectedFactura.enviado_email_at

    if (selectedFactura.id && observaciones) {
      localStorage.setItem(`factura_${selectedFactura.id}_observaciones`, observaciones)
    }

    if (isSecond) {
      localStorage.setItem(`factura_${selectedFactura.id}_email_2_at`, nowIso)
      setSelectedFactura({ ...selectedFactura, enviado_email_2_at: nowIso, observaciones } as any)
      if (selectedFactura.id !== 'draft') {
        await supabase.from('facturas').update({
          enviado_email_2_at: nowIso
        } as any).eq('id', selectedFactura.id)
      }
    } else {
      localStorage.setItem(`factura_${selectedFactura.id}_email_at`, nowIso)
      setSelectedFactura({ ...selectedFactura, enviado_email_at: nowIso, observaciones } as any)
      if (selectedFactura.id !== 'draft') {
        await supabase.from('facturas').update({
          enviado_email_at: nowIso
        } as any).eq('id', selectedFactura.id)
      }
    }

    loadFacturas()
    playSuccessChime()
    showToast(isSecond ? "SEGUNDO ENVÍO POR EMAIL REGISTRADO Y GUARDADO" : "FACTURA ENVIADA POR EMAIL Y GUARDADA", 'success')
    setModalEnvioOpen(true)
  }

  function clienteNombre(id: string) {
    return clientes.find((c) => c.id === id)?.nombre ?? '—'
  }

  function clienteData(id: string) {
    return clientes.find((c) => c.id === id)
  }

  const getEstadoVisual = (f: Factura): { text: string, color: 'yellow' | 'green' | 'red' | 'gray' } => {
    if (f.total <= 0 || f.estado_cobro === 'pagada' || (f.total_abonado >= f.total && f.total > 0)) {
      return { text: 'ABONADA', color: 'green' }
    }
    if (f.estado_cobro === 'parcial' || f.total_abonado > 0) return { text: 'COBRO PARCIAL', color: 'yellow' }
    
    const isEnviada = !!(f.enviado_email_at || f.enviado_whatsapp_at)
    if (isEnviada) return { text: 'IMPAGADA', color: 'red' }
    
    return { text: 'PENDIENTE', color: 'yellow' }
  }

  const saldoPendiente = selectedFactura ? selectedFactura.total - selectedFactura.total_abonado : 0
  const baseImponible = selectedFactura ? selectedFactura.total / (1 + IVA_RATE) : 0
  const ivaAmount = selectedFactura ? selectedFactura.total - baseImponible : 0

  return (
    <div className="relative">
      {/* Cabecera Fija */}
      <div className="sticky top-0 bg-bg-950/95 backdrop-blur-md z-30 pb-4 border-b border-slate-800/80 -mx-4 px-4 sm:-mx-6 sm:px-6">
        <PageHeader title="FACTURACIÓN">
          <button
            onClick={() => {
              if (activeTab === 'recibidas') {
                setActiveTab('emitidas')
              } else if (selectedFactura) {
                setSelectedFactura(null)
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

        {/* Dos filas de píldoras informativas de estados (solo cuando estamos en emitidas y sin factura seleccionada) */}
        {activeTab === 'emitidas' && !selectedFactura && (
          <div className="mt-3 space-y-2.5 relative">
            {/* Fila 1: Enviada (Naranja), Pagada (Verde), Impagada (Rojo) */}
            <div className="w-[98%] mx-auto flex gap-2 justify-between">
              <button
                onClick={() => setActiveTooltip(activeTooltip === 'enviada' ? null : 'enviada')}
                className="flex-1 px-2 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-black uppercase tracking-wider hover:bg-amber-500/20 transition-all text-center justify-center"
                style={{ fontSize: '12px' }}
              >
                ENVIADA
              </button>
              <button
                onClick={() => setActiveTooltip(activeTooltip === 'pagada' ? null : 'pagada')}
                className="flex-1 px-2 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-black uppercase tracking-wider hover:bg-emerald-500/20 transition-all text-center justify-center"
                style={{ fontSize: '12px' }}
              >
                PAGADA
              </button>
              <button
                onClick={() => setActiveTooltip(activeTooltip === 'impagada' ? null : 'impagada')}
                className="relative flex-1 px-2 py-2 rounded-xl bg-red-500/10 text-red-400 font-black uppercase tracking-wider hover:bg-red-500/20 transition-all overflow-hidden text-center justify-center"
                style={{ fontSize: '12px' }}
              >
                <span className="absolute inset-0 border-[2px] border-red-500 rounded-xl animate-pulse"></span>
                <span className="relative z-10">IMPAGADA</span>
              </button>
            </div>

            {/* Fila 2: Sin enviar (Amarilla), Pago parcial (Azul) */}
            <div className="w-[98%] mx-auto flex gap-2 justify-between">
              <button
                onClick={() => setActiveTooltip(activeTooltip === 'emitida' ? null : 'emitida')}
                className="relative flex-1 px-2 py-2 rounded-xl bg-yellow-500/10 text-yellow-400 font-black uppercase tracking-wider hover:bg-yellow-500/20 transition-all overflow-hidden text-center justify-center"
                style={{ fontSize: '12px' }}
              >
                <span className="absolute inset-0 border-[2px] border-yellow-400 rounded-xl animate-pulse"></span>
                <span className="relative z-10">SIN ENVIAR</span>
              </button>
              <button
                onClick={() => setActiveTooltip(activeTooltip === 'parcial' ? null : 'parcial')}
                className="flex-1 px-2 py-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 font-black uppercase tracking-wider hover:bg-blue-500/20 transition-all text-center justify-center"
                style={{ fontSize: '12px' }}
              >
                PAGO PARCIAL
              </button>
            </div>

            {/* Globo explicativo contextual */}
            {activeTooltip && (
              <div className="absolute top-24 left-0 right-0 bg-slate-900 border border-slate-700/80 rounded-2xl p-4 shadow-2xl z-40 text-sm text-slate-200 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-1">
                      {activeTooltip === 'enviada' && 'Factura Enviada'}
                      {activeTooltip === 'pagada' && 'Factura Pagada'}
                      {activeTooltip === 'impagada' && 'Factura Impagada'}
                      {activeTooltip === 'emitida' && 'Factura Emitida sin enviar'}
                      {activeTooltip === 'parcial' && 'Pago Parcial'}
                    </h4>
                    <p className="leading-relaxed text-slate-300">
                      {activeTooltip === 'enviada' && 'Factura que ha sido enviada al cliente por Email o WhatsApp.'}
                      {activeTooltip === 'pagada' && 'Factura cobrada en su totalidad.'}
                      {activeTooltip === 'impagada' && 'Factura enviada o impresa que lleva más de una semana sin abonarse, o parcial que lleva más de 6 meses en ese estado.'}
                      {activeTooltip === 'emitida' && 'Vaya a la tarjeta de la factura sin enviar y pulse VER para acceder a la factura, baje hasta el final del documento y envíela pulsando el icono de Email o Watsapp.'}
                      {activeTooltip === 'parcial' && 'Factura con algún abono registrado pero que aún no está liquidada por completo.'}
                    </p>
                  </div>
                  <button onClick={() => setActiveTooltip(null)} className="text-slate-400 hover:text-white p-1">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Contenido con Scroll (Pasa por debajo) */}
      <div className="pt-4 px-1">
        {/* Selector de pestañas: EMITIDAS / LUPA / RECIBIDAS (solo visible en emitidas o según contexto) */}
        {activeTab === 'emitidas' && (
          <div className="flex flex-col gap-3 mb-4 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setActiveTab('emitidas'); setSelectedFactura(null); }}
                className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all border-[2px] ${
                  activeTab === 'emitidas'
                    ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/60 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                    : 'bg-slate-800/60 text-white/50 border-transparent hover:text-white hover:bg-slate-700'
                }`}
              >
                EMITIDAS
              </button>

              {/* Icono de Lupa */}
              <button
                onClick={() => setShowSearchInput(!showSearchInput)}
                className={`p-2.5 rounded-xl transition-all border-[2px] flex items-center justify-center ${
                  showSearchInput
                    ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/60 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                    : 'bg-slate-800/60 text-white/50 border-transparent hover:text-white hover:bg-slate-700'
                }`}
                title="Buscar facturas"
              >
                <Search className="w-5 h-5" />
              </button>

              <button
                onClick={() => { setActiveTab('recibidas'); setSelectedFactura(null); }}
                className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all border-[2px] ${
                  activeTab === 'recibidas'
                    ? 'bg-purple-500/20 text-purple-400 border-purple-500/60 shadow-[0_0_12px_rgba(168,85,247,0.3)]'
                    : 'bg-slate-800/60 text-white/50 border-transparent hover:text-white hover:bg-slate-700'
                }`}
              >
                RECIBIDAS
              </button>
            </div>

            {/* Campo de búsqueda global */}
            {showSearchInput && (
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="text"
                  value={globalSearchText}
                  onChange={(e) => setGlobalSearchText(e.target.value)}
                  placeholder="Buscar por cliente, matrícula o nº factura..."
                  className="w-full bg-bg-700 border border-bg-600 rounded-xl px-4 py-2.5 text-white text-sm focus:border-cyan-500 focus:outline-none"
                />
                {globalSearchText && (
                  <button
                    onClick={() => setGlobalSearchText('')}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition-all"
                  >
                    Limpiar
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'recibidas' ? (
          <FacturasRecibidasPage />
        ) : (
          <>
            {/* Filtros: Trimestre (50%) y Estado (50%) en la misma línea */}
            {!selectedFactura && (
              <div className="w-full flex gap-3 mb-4">
                <select
                  value={trimestreFilter}
                  onChange={(e) => setTrimestreFilter(e.target.value)}
                  className="w-1/2 bg-bg-700 border border-bg-600 rounded-lg px-4 py-2.5 text-white text-sm focus:border-cyan-500 focus:outline-none"
                >
                  <option value="">Último trimestre</option>
                  {trimestres.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>

                <select
                  value={estadoFilter}
                  onChange={(e) => setEstadoFilter(e.target.value)}
                  className="w-1/2 bg-bg-700 border border-bg-600 rounded-lg px-4 py-2.5 text-white text-sm focus:border-cyan-500 focus:outline-none"
                >
                  <option value="">Todos los estados</option>
                  <option value="pagada">PAGADA</option>
                  <option value="parcial">PAGO PARCIAL</option>
                  <option value="impagada">IMPAGADA</option>
                  <option value="sin_enviar">SIN ENVIAR</option>
                  <option value="enviada">ENVIADA</option>
                </select>
              </div>
            )}

        {loading ? (
          <div className="text-center py-16 text-slate-500">Cargando...</div>
        ) : facturas.length === 0 && !selectedFactura ? (
          <EmptyState icon={<FileText className="w-12 h-12" />} title="No hay facturas" subtitle="Las facturas se generan desde reparaciones finalizadas" />
        ) : selectedFactura ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Panel izquierdo: control de cobro + acciones */}
          <div className="space-y-4" id="control-cobro">
            {selectedFactura.id === 'draft' ? (
              !isEditingDraft && (
                <div className="bg-amber-900/20 border-[3px] border-amber-500/60 rounded-2xl p-6 text-center shadow-[0_0_20px_rgba(245,158,11,0.15)]">
                  <h3 className="text-xl font-bold text-amber-400 mb-2 uppercase tracking-widest">Borrador de Factura</h3>
                  <p className="text-sm text-amber-200/70 mb-6">Esta factura aún no se ha guardado en el sistema.</p>
                  <div className="flex flex-col gap-4 max-w-sm mx-auto">
                    <button
                      onClick={confirmarFactura}
                      className="relative w-full py-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-black text-lg tracking-widest uppercase shadow-lg shadow-emerald-900/50 transition-all active:scale-95 flex items-center justify-center gap-2 overflow-hidden"
                    >
                      {/* Animación SOLO de la línea de borde blanco del botón confirmar */}
                      <span className="absolute inset-0 border-[2px] border-white rounded-xl animate-pulse pointer-events-none"></span>
                      <Check className="w-6 h-6 relative z-10" />
                      <span className="relative z-10">CONFIRMAR</span>
                    </button>

                    {/* Botón EDITAR en la tarjeta (al pulsar desaparece la tarjeta y toma el control GUARDAR) */}
                    <button
                      onClick={() => {
                        setIsEditingDraft(true)
                        setTimeout(() => {
                          const a4El = document.getElementById('factura-a4')
                          if (a4El) {
                            const y = a4El.getBoundingClientRect().top + window.scrollY - 80
                            window.scrollTo({ top: y, behavior: 'smooth' })
                          }
                        }, 100)
                      }}
                      className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold tracking-widest uppercase border border-cyan-900/50 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                      <Edit3 className="w-5 h-5" />
                      EDITAR
                    </button>

                    <button
                      onClick={handleVolver}
                      className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 font-bold tracking-widest uppercase border border-slate-800 transition-all active:scale-95"
                    >
                      VOLVER
                    </button>
                  </div>
                </div>
              )
            ) : (
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Control de Cobro</h3>
              
              {/* Información de la factura */}
              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between"><span className="text-slate-500">Factura:</span><span className="text-white font-medium">{selectedFactura.numero}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Fecha emisión:</span><span className="text-white font-medium">{new Date(selectedFactura.fecha).toLocaleDateString('es-ES')}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Cliente:</span><span className="text-white font-medium">{clienteNombre(selectedFactura.cliente_id)}</span></div>
                {selectedFactura.vehiculo_id && (
                  <div className="flex justify-between"><span className="text-slate-500">Vehículo:</span><span className="text-white font-medium">{vehiculos.find(v => v.id === selectedFactura.vehiculo_id)?.matricula || '—'}</span></div>
                )}
              </div>

              {/* ── Cuadro de control de importes ── */}
              <div className="rounded-xl border border-bg-600 overflow-hidden mb-4">
                {/* Total factura */}
                <div className="flex items-center justify-between px-4 py-3 bg-bg-700/60 border-b border-bg-600">
                  <span className="text-sm font-semibold uppercase tracking-widest text-slate-400">Total factura</span>
                  <span className="text-xl font-bold text-white tabular-nums">{selectedFactura.total.toFixed(2)} €</span>
                </div>

                {/* Abonado */}
                <div className="flex items-center justify-between px-4 py-3 bg-emerald-950/20 border-b border-bg-600">
                  <span className="text-sm font-semibold uppercase tracking-widest text-emerald-400/70">ABONADO</span>
                  <span className="text-lg font-bold text-emerald-400 tabular-nums">+ {selectedFactura.total_abonado.toFixed(2)} €</span>
                </div>

                {/* Saldo pendiente actual */}
                <div className="flex items-center justify-between px-4 py-3 bg-amber-950/20 border-b border-bg-600">
                  <span className="text-sm font-semibold uppercase tracking-widest text-amber-400/70">PENDIENTE</span>
                  <span className={`text-lg font-bold tabular-nums ${saldoPendiente <= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>{saldoPendiente.toFixed(2)} €</span>
                </div>

                {/* Preview: pendiente tras el abono parcial introducido */}
                {saldoPendiente > 0 && nuevoAbono !== '' && parseFloat(nuevoAbono) > 0 && (
                  <div className="flex items-center justify-between px-4 py-3 bg-cyan-950/30 border-b border-bg-600">
                    <span className="text-sm font-semibold uppercase tracking-widest text-cyan-400">Restante tras abono</span>
                    <span className="text-lg font-bold tabular-nums text-cyan-400">
                      {Math.max(0, saldoPendiente - parseFloat(nuevoAbono)).toFixed(2)} €
                    </span>
                  </div>
                )}

                {/* Barra de progreso de cobro */}
                <div className="px-4 py-3 bg-bg-800/40">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                    <span>Progreso de cobro</span>
                    <span className="font-semibold text-emerald-400">
                      {selectedFactura.total > 0 ? ((selectedFactura.total_abonado / selectedFactura.total) * 100).toFixed(1) : '0'}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-bg-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, selectedFactura.total > 0 ? (selectedFactura.total_abonado / selectedFactura.total) * 100 : 0)}%` }}
                    />
                  </div>
                  {/* Preview de la barra si hay importe parcial */}
                  {saldoPendiente > 0 && nuevoAbono !== '' && parseFloat(nuevoAbono) > 0 && (
                    <>
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5 mt-2">
                        <span className="text-cyan-400/70">Progreso tras abono</span>
                        <span className="font-semibold text-cyan-400">
                          {Math.min(100, selectedFactura.total > 0 ? ((selectedFactura.total_abonado + parseFloat(nuevoAbono)) / selectedFactura.total) * 100 : 0).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-bg-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, selectedFactura.total > 0 ? ((selectedFactura.total_abonado + parseFloat(nuevoAbono)) / selectedFactura.total) * 100 : 0)}%` }}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Estado badge */}
              <div className="mb-4"><Badge text={getEstadoVisual(selectedFactura).text} color={getEstadoVisual(selectedFactura).color} /></div>

              {/* ── Zona de abono ── */}
              {saldoPendiente > 0 && (
                <div className="space-y-3">
                  {/* Input de abono parcial */}
                  <div className="p-4 bg-bg-700/60 rounded-xl border border-bg-600">
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Importe a abonar</label>
                    <div className="flex gap-2">
                        <input
                          type="number"
                          value={nuevoAbono}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val !== '' && parseFloat(val) > saldoPendiente) {
                              setNuevoAbono(saldoPendiente.toString());
                            } else {
                              setNuevoAbono(val);
                            }
                          }}
                          placeholder="0.00"
                          min="0.01"
                          max={saldoPendiente}
                          step="0.01"
                          className="flex-1 bg-bg-800 border border-bg-600 rounded-lg px-3 py-2.5 text-white text-sm focus:border-cyan-500 focus:outline-none tabular-nums"
                        />
                        <span className="flex items-center text-slate-400 text-sm font-medium pr-1">€</span>
                      </div>
                    {nuevoAbono !== '' && parseFloat(nuevoAbono) > saldoPendiente && (
                      <p className="text-xs text-red-400 mt-1.5">⚠ El importe supera el saldo pendiente ({saldoPendiente.toFixed(2)} €)</p>
                    )}
                  </div>

                  {/* Botones de acción */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={registrarAbono}
                      disabled={!nuevoAbono || parseFloat(nuevoAbono) <= 0 || parseFloat(nuevoAbono) > saldoPendiente}
                      className="flex flex-col items-center justify-center gap-1 px-4 py-3 rounded-xl bg-cyan-500/10 border border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/20 active:scale-[0.98] transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none"
                    >
                      <Save className="w-4 h-4" />
                      <span className="text-xs font-semibold">Abono parcial</span>
                      {nuevoAbono && parseFloat(nuevoAbono) > 0 && parseFloat(nuevoAbono) <= saldoPendiente && (
                        <span className="text-xs tabular-nums text-cyan-300">{parseFloat(nuevoAbono).toFixed(2)} €</span>
                      )}
                    </button>
                    <button
                      onClick={abonarTodo}
                      className="flex flex-col items-center justify-center gap-1 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/20 active:scale-[0.98] transition-all duration-150"
                    >
                      <Check className="w-4 h-4" />
                      <span className="text-xs font-semibold">Abonar todo</span>
                      <span className="text-xs tabular-nums text-emerald-300">{saldoPendiente.toFixed(2)} €</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Factura completamente pagada */}
              {saldoPendiente <= 0 && (
                <div className="flex items-center justify-center gap-2 py-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  <Check className="w-5 h-5" />
                  <span className="font-semibold text-sm">Factura completamente pagada</span>
                </div>
              )}

              {/* Historial de abonos */}
              {cobros.length > 0 && (
                <div className="mt-4 pt-4 border-t border-bg-600">
                  <p className="text-xs text-slate-500 mb-2 font-semibold uppercase tracking-widest">Historial de abonos ({cobros.length})</p>
                  <div className="space-y-1.5">
                    {cobros.map((c) => (
                      <div key={c.id} className="flex justify-between text-xs items-center bg-bg-700/30 rounded-lg px-3 py-2">
                        <span className="text-slate-500">
                          {new Date(c.fecha).toLocaleDateString('es-ES')} {new Date(c.fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="text-emerald-400 font-semibold tabular-nums">+{c.importe.toFixed(2)} €</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 text-xs text-slate-400 flex justify-between">
                    <span>Total abonado</span>
                    <span className="font-semibold text-emerald-400 tabular-nums">
                      {selectedFactura.total_abonado.toFixed(2)} € ({selectedFactura.total > 0 ? ((selectedFactura.total_abonado / selectedFactura.total) * 100).toFixed(1) : '0'}%)
                    </span>
                  </div>
                </div>
              )}
            </Card>
            )}
          </div>

          {/* Panel derecho: vista A4 de factura */}
          <div id="factura-a4" className="gestarian-paper rounded-lg shadow-2xl p-8 sm:p-12 print:shadow-none relative">
            <div className="flex justify-between items-start mb-6 pb-4 border-b-2 border-gray-800">
              <div className="flex items-center gap-3">
                {config?.logo_bn ? (
                  <img src={config.logo_bn} alt="Logo" className="w-16 h-16 rounded-lg object-cover bg-gray-100 p-1 hidden md:block" />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-gray-800 hidden md:flex items-center justify-center text-white font-bold text-lg">{config?.nombre_empresa?.charAt(0) ?? 'D'}</div>
                )}
                <div>
                  <h2 className="text-xl font-bold">{config?.nombre_empresa ?? 'DM CAR'}</h2>
                  <p className="text-xs text-gray-500">{config?.cif ?? 'B-12345678'}</p>
                  <p className="text-xs text-gray-500">{config?.direccion ?? ''}</p>
                  {config?.telefono && <p className="text-xs text-gray-500">Tel: {config.telefono}</p>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* Botón Ver Expediente */}
                {(() => {
                  const clienteObj = clienteData(selectedFactura.cliente_id)
                  const vehObj = vehiculos.find(v => v.id === selectedFactura.vehiculo_id)
                  return (
                    <motion.button
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.92 }}
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate('/expedientes', { state: { search: clienteObj?.nombre || vehObj?.matricula || '' } })
                      }}
                      className="bg-transparent border-0 p-0 outline-none flex items-center justify-center shrink-0 text-yellow-500 hover:text-yellow-400 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)] cursor-pointer"
                      title="Ver Expediente"
                      aria-label="Ver Expediente"
                    >
                      <ExpedienteFolderIcon className="w-12 h-12 sm:w-14 sm:h-14" />
                    </motion.button>
                  )
                })()}

                <div className="text-right">
                  <h3 className="text-lg md:text-2xl font-bold uppercase tracking-wide">Factura</h3>
                  <p className="text-sm text-gray-600 mt-1">{selectedFactura.numero}</p>
                  <p className="text-xs text-gray-500">{new Date(selectedFactura.fecha).toLocaleDateString('es-ES')}</p>
                </div>
              </div>
            </div>

            {/* Datos del Titular + Botón flotante GUARDAR animado a su derecha */}
            <div className="mb-6 pb-4 border-b border-gray-200 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Facturar a:</p>
                <p className="font-semibold">{clienteNombre(selectedFactura.cliente_id)}</p>
                {(() => {
                  const c = clienteData(selectedFactura.cliente_id)
                  return c ? (
                    <div className="text-sm text-gray-600">
                      {c.direccion && <p>{c.direccion}</p>}
                      {c.dni && <p>DNI: {c.dni}</p>}
                      {c.telefono && <p>Tel: {c.telefono}</p>}
                    </div>
                  ) : null
                })()}
              </div>

              {/* Botón CONFIRMAR flotante que aparece junto al titular al estar en modo edición */}
              {isEditingDraft && (
                <motion.button
                  layoutId="draft-edit-save-button"
                  initial={{ opacity: 0, scale: 0.8, x: 20 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  onClick={confirmarFactura}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm tracking-wider uppercase shadow-xl shadow-emerald-900/40 border-2 border-emerald-400 flex items-center justify-center gap-2 active:scale-95 shrink-0"
                >
                  <Check className="w-5 h-5" />
                  CONFIRMAR
                </motion.button>
              )}
            </div>

            <table className="w-full text-sm mb-4">
              <thead>
                <tr className="border-b-2 border-gray-800 text-left text-xs uppercase text-gray-600">
                  <th className="py-2">Descripción</th>
                  <th className="py-2 text-center w-20">Cant.</th>
                  <th className="py-2 text-right w-24">Precio</th>
                  <th className="py-2 text-right w-24">Importe</th>
                  {isEditingDraft && <th className="py-2 text-center w-10"></th>}
                </tr>
              </thead>
              <tbody>
                {(selectedFactura.conceptos ?? []).length === 0 ? (
                  <tr><td colSpan={isEditingDraft ? 5 : 4} className="py-4 text-center text-gray-400">Sin conceptos</td></tr>
                ) : (
                  (selectedFactura.conceptos ?? []).map((c, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="py-2">
                        {isEditingDraft ? (
                          <input
                            type="text"
                            value={c.descripcion}
                            onChange={(e) => {
                              setHasPendingChanges(true)
                              const newConceptos = [...(selectedFactura.conceptos ?? [])]
                              newConceptos[i] = { ...c, descripcion: e.target.value }
                              const newTotal = newConceptos.reduce((acc, curr) => acc + (curr.cantidad * curr.precio), 0)
                              setSelectedFactura({ ...selectedFactura, conceptos: newConceptos, total: newTotal })
                            }}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm bg-white text-gray-900 font-medium focus:border-cyan-600 focus:outline-none"
                            placeholder="Descripción del concepto..."
                          />
                        ) : (
                          c.descripcion
                        )}
                      </td>
                      <td className="py-2 text-center">
                        {isEditingDraft ? (
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={c.cantidad}
                            onChange={(e) => {
                              setHasPendingChanges(true)
                              const qty = Math.max(1, parseFloat(e.target.value) || 1)
                              const newConceptos = [...(selectedFactura.conceptos ?? [])]
                              newConceptos[i] = { ...c, cantidad: qty }
                              const newTotal = newConceptos.reduce((acc, curr) => acc + (curr.cantidad * curr.precio), 0)
                              setSelectedFactura({ ...selectedFactura, conceptos: newConceptos, total: newTotal })
                            }}
                            className="w-16 border border-gray-300 rounded px-2 py-1 text-sm text-center bg-white text-gray-900 font-medium focus:border-cyan-600 focus:outline-none"
                          />
                        ) : (
                          c.cantidad
                        )}
                      </td>
                      <td className="py-2 text-right">
                        {isEditingDraft ? (
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={c.precio}
                            onChange={(e) => {
                              setHasPendingChanges(true)
                              const pr = Math.max(0, parseFloat(e.target.value) || 0)
                              const newConceptos = [...(selectedFactura.conceptos ?? [])]
                              newConceptos[i] = { ...c, precio: pr }
                              const newTotal = newConceptos.reduce((acc, curr) => acc + (curr.cantidad * curr.precio), 0)
                              setSelectedFactura({ ...selectedFactura, conceptos: newConceptos, total: newTotal })
                            }}
                            className="w-20 border border-gray-300 rounded px-2 py-1 text-sm text-right bg-white text-gray-900 font-medium focus:border-cyan-600 focus:outline-none"
                          />
                        ) : (
                          `${c.precio.toFixed(2)} €`
                        )}
                      </td>
                      <td className="py-2 text-right font-medium">
                        {(c.cantidad * c.precio).toFixed(2)} €
                      </td>
                      {isEditingDraft && (
                        <td className="py-2 text-center">
                          <button
                            onClick={() => {
                              setHasPendingChanges(true)
                              const newConceptos = (selectedFactura.conceptos ?? []).filter((_, idx) => idx !== i)
                              const newTotal = newConceptos.reduce((acc, curr) => acc + (curr.cantidad * curr.precio), 0)
                              setSelectedFactura({ ...selectedFactura, conceptos: newConceptos, total: newTotal })
                            }}
                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                            title="Eliminar concepto"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Añadir fila de concepto en modo edición */}
            {isEditingDraft && (
              <div className="mb-4">
                <button
                  onClick={() => {
                    setHasPendingChanges(true)
                    const newConceptos = [...(selectedFactura.conceptos ?? []), { descripcion: '', cantidad: 1, precio: 0 }]
                    setSelectedFactura({ ...selectedFactura, conceptos: newConceptos })
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg border border-slate-300 flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Añadir Concepto
                </button>
              </div>
            )}

            {/* Sección Inferior: QR VERIFACTU (Izquierda) + Totales (Derecha) */}
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-6 border-t border-gray-200 pt-4">
              {/* Bloque QR VERIFACTU */}
              <div className="flex items-start gap-3 max-w-sm">
                <div className="w-20 h-20 bg-white border border-gray-300 rounded-lg p-1 shrink-0 flex items-center justify-center shadow-sm">
                  {(() => {
                    const qrUrl = generateVerifactuQRDataUrlSync(selectedFactura, config)
                    return qrUrl ? (
                      <img src={qrUrl} alt="QR VERIFACTU AEAT" className="w-full h-full object-contain" />
                    ) : (
                      <div className="text-[9px] text-gray-400 text-center font-mono">QR VERIFACTU</div>
                    )
                  })()}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-black tracking-wider text-slate-800 uppercase bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                      VERI*FACTU
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">Cotejo AEAT</span>
                  </div>
                  <p className="text-[8pt] italic text-slate-500 leading-snug">
                    {VERIFACTU_NORMATIVA_TEXT}
                  </p>
                </div>
              </div>

              {/* Totales */}
              <div className="w-full sm:w-64 space-y-1.5 text-sm self-end sm:self-auto">
                <div className="flex justify-between"><span className="text-gray-500">Base imponible</span><span className="font-medium">{baseImponible.toFixed(2)} €</span></div>
                <div className="flex justify-between"><span className="text-gray-500">IVA (21%)</span><span className="font-medium">{ivaAmount.toFixed(2)} €</span></div>
                <div className="flex justify-between font-bold text-base border-t-2 border-gray-800 pt-1.5"><span>TOTAL</span><span>{selectedFactura.total.toFixed(2)} €</span></div>
              </div>
            </div>

            <div className="text-xs text-gray-400 border-t border-gray-200 pt-4 space-y-0.5 mb-6">
              <p>Estado de cobro: {selectedFactura.estado_cobro.toUpperCase()}</p>
              {selectedFactura.total_abonado > 0 && <p>Abonado: {selectedFactura.total_abonado.toFixed(2)} € · <span className="text-blue-500 font-bold">Resto Abono: {saldoPendiente.toFixed(2)} €</span></p>}
            </div>

            {/* Observaciones */}
            <div className="mb-6">
              <p className="text-xs text-gray-500 uppercase font-semibold mb-1">
                Observaciones
              </p>
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Notas internas..."
                rows={2}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-gray-800 focus:outline-none"
              />
            </div>

            {/* ── BOTONERA UNIFICADA DE ACCIONES A4 FACTURAS ── */}
            <div id="botonera-envio-factura" className="border-t-2 border-gray-800 pt-6 space-y-6">
              {(() => {
                const cliente = clienteData(selectedFactura.cliente_id)
                const veh = selectedFactura.vehiculo_id ? vehiculos.find(v => v.id === selectedFactura.vehiculo_id) : null

                const emailSentAt = (selectedFactura as any).enviado_email_at
                const emailSent2At = (selectedFactura as any).enviado_email_2_at
                const whatsappSentAt = (selectedFactura as any).enviado_whatsapp_at
                const whatsappSent2At = (selectedFactura as any).enviado_whatsapp_2_at

                const formatSentDate = (isoStr: string) => {
                  try {
                    const d = new Date(isoStr)
                    return `${d.toLocaleDateString('es-ES')} A LAS ${d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`
                  } catch {
                    return isoStr
                  }
                }

                return (
                  <div className="space-y-6">
                    {/* DOS LÍNEAS DE ACCIONES CENTRADAS */}
                    <div className="space-y-4">
                      {/* LÍNEA 1: EMAIL | IMÁGENES | EXPEDIENTE (EN EL CENTRO) | IMPRIMIR | WHATSAPP */}
                      <div className="flex items-center justify-center gap-2 sm:gap-3 flex-nowrap">
                        {/* 1. EMAIL */}
                        {!emailSentAt && (
                          <button
                            onClick={enviarEmail}
                            className="p-1 hover:scale-110 transition-transform active:scale-95 shrink-0"
                            title="ENVIAR POR EMAIL"
                            aria-label="ENVIAR POR EMAIL"
                          >
                            <svg className="w-14 h-14 sm:w-16 sm:h-16 text-[#ea4335] drop-shadow-md" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                              <polyline points="22,6 12,13 2,6" />
                            </svg>
                          </button>
                        )}

                        {/* 2. IMÁGENES */}
                        <button
                          onClick={async () => {
                            const cId = selectedFactura?.cliente_id
                            const vId = selectedFactura?.vehiculo_id
                            const eFotos = selectedFactura?.fotos || []
                            const fotos = await fetchExpedienteFotos(cId, vId, eFotos)
                            setExpedienteFotos(fotos)
                            setExpedienteViewerTitle(`Expediente Factura ${selectedFactura?.numero || ''}`)
                            setShowExpedienteViewer(true)
                          }}
                          className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gray-500/85 hover:bg-gray-500 text-amber-400 border border-gray-400/60 flex items-center justify-center shadow-md transition-all active:scale-95 shrink-0"
                          title="IMÁGENES DEL EXPEDIENTE"
                          aria-label="IMÁGENES DEL EXPEDIENTE"
                        >
                          <ImageIcon className="w-7 h-7 sm:w-8 sm:h-8 text-amber-400" />
                        </button>

                        {/* 3. EXPEDIENTE EN EL CENTRO */}
                        <button
                          onClick={() => {
                            navigate('/expedientes', {
                              state: {
                                expandFacturaId: selectedFactura?.id,
                                expandVehiculoId: selectedFactura?.vehiculo_id,
                                clienteId: selectedFactura?.cliente_id
                              }
                            });
                          }}
                          className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gray-500/85 hover:bg-gray-500 text-amber-400 border border-gray-400/60 flex items-center justify-center shadow-md transition-all active:scale-95 shrink-0"
                          title="VER EXPEDIENTE COMPLETO / ROADMAP"
                          aria-label="EXPEDIENTE"
                        >
                          <FolderOpen className="w-7 h-7 sm:w-8 sm:h-8 text-amber-400 fill-amber-400/30" />
                        </button>

                        {/* 4. IMPRIMIR */}
                        <button
                          onClick={() => window.print()}
                          className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gray-500/85 hover:bg-gray-500 text-white border border-gray-400/60 flex items-center justify-center shadow-md transition-all active:scale-95 shrink-0"
                          title="IMPRIMIR"
                          aria-label="IMPRIMIR"
                        >
                          <Printer className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                        </button>

                        {/* 5. WHATSAPP (Bocadillo verde) */}
                        {!whatsappSent2At && (
                          <button
                            onClick={async () => {
                              try {
                                const numStr = selectedFactura.numero || 'FAC-0001'
                                const doc = generateFacturaPDF({ ...selectedFactura, observaciones }, cliente, veh, config)
                                const pdfBlob = doc.output('blob')

                                const res = await shareDocumentoViaWhatsApp({
                                  tipo: 'factura',
                                  numero: numStr,
                                  pdfBlob,
                                  cliente,
                                  matricula: veh?.matricula,
                                })

                                if (res.success) {
                                  if (selectedFactura.id && observaciones) {
                                    localStorage.setItem(`factura_${selectedFactura.id}_observaciones`, observaciones)
                                  }

                                  const nowIso = new Date().toISOString()
                                  const isSecond = !!selectedFactura.enviado_whatsapp_at

                                  if (isSecond) {
                                    localStorage.setItem(`factura_${selectedFactura.id}_wa_2_at`, nowIso)
                                    setSelectedFactura({ ...selectedFactura, enviado_whatsapp_2_at: nowIso, observaciones } as any)
                                    if (selectedFactura.id !== 'draft') {
                                      await supabase.from('facturas').update({
                                        enviado_whatsapp_2_at: nowIso
                                      } as any).eq('id', selectedFactura.id)
                                    }
                                  } else {
                                    localStorage.setItem(`factura_${selectedFactura.id}_wa_at`, nowIso)
                                    setSelectedFactura({ ...selectedFactura, enviado_whatsapp_at: nowIso, observaciones } as any)
                                    if (selectedFactura.id !== 'draft') {
                                      await supabase.from('facturas').update({
                                        enviado_whatsapp_at: nowIso
                                      } as any).eq('id', selectedFactura.id)
                                    }
                                  }

                                  loadFacturas()
                                  playSuccessChime()
                                  showToast(isSecond ? "SEGUNDO ENVÍO POR WHATSAPP REGISTRADO Y GUARDADO" : "FACTURA ENVIADA POR WHATSAPP Y GUARDADA", 'success')
                                  setModalEnvioOpen(true)
                                }
                              } catch (e: any) {
                                console.error('[WhatsApp Factura Error]', e)
                                alert('No se ha podido preparar el documento para WhatsApp: ' + e.message)
                              }
                            }}
                            className="hover:scale-110 transition-transform active:scale-95 shrink-0"
                            title="ENVIAR POR WHATSAPP"
                            aria-label="ENVIAR POR WHATSAPP"
                          >
                            <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center">
                              <svg className="w-full h-full drop-shadow-md" viewBox="0 0 48 48" fill="none">
                                <path
                                  d="M24 4C12.95 4 4 12.95 4 24C4 27.84 5.08 31.43 6.96 34.5L4 44L13.82 41.13C16.76 42.97 20.26 44 24 44C35.05 44 44 35.05 44 24C44 12.95 35.05 4 24 4Z"
                                  fill="#25D366"
                                />
                              </svg>
                              <svg viewBox="0 0 24 24" fill="currentColor" className="absolute inset-0 m-auto w-8 h-8 sm:w-10 sm:h-10 text-white">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                              </svg>
                            </div>
                          </button>
                        )}
                      </div>
                      
                      {/* ESTADOS DE ENVÍO */}
                      {(emailSentAt || whatsappSentAt || emailSent2At || whatsappSent2At) && (
                        <div className="flex flex-col items-center justify-center gap-2 mt-4">
                          {whatsappSentAt && (
                            <div className="w-full max-w-sm text-center font-bold text-green-400 bg-green-500/10 px-4 py-3 rounded-xl border-2 border-green-500 shadow-sm uppercase">
                              ENVIADO POR WHATSAPP EL {formatSentDate(whatsappSentAt)}
                            </div>
                          )}
                          {whatsappSent2At && (
                            <div className="w-full max-w-sm text-center font-bold text-emerald-300 bg-emerald-500/20 px-4 py-3 rounded-xl border-2 border-emerald-400 shadow-sm uppercase">
                              SEGUNDO ENVÍO POR WHATSAPP EL {formatSentDate(whatsappSent2At)}
                            </div>
                          )}
                          {emailSentAt && (
                            <div className="w-full max-w-sm text-center font-bold text-green-400 bg-green-500/10 px-4 py-3 rounded-xl border-2 border-green-500 shadow-sm uppercase">
                              ENVIADO POR EMAIL EL {formatSentDate(emailSentAt)}
                            </div>
                          )}
                          {emailSent2At && (
                            <div className="w-full max-w-sm text-center font-bold text-emerald-300 bg-emerald-500/20 px-4 py-3 rounded-xl border-2 border-emerald-400 shadow-sm uppercase">
                              SEGUNDO ENVÍO POR EMAIL EL {formatSentDate(emailSent2At)}
                            </div>
                          )}
                        </div>
                      )}

                      {/* LÍNEA 2: GUARDAR | EDITAR | VOLVER */}
                      <div className="flex items-center justify-center gap-3 pt-1">
                        <button
                          id="btn-guardar-a4"
                          onClick={registrarFactura}
                          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs tracking-wider uppercase shadow transition-all active:scale-95 flex items-center gap-1.5"
                        >
                          <Save className="w-4 h-4" />
                          GUARDAR
                        </button>

                        {!isFacturaBloqueada(selectedFactura) && (
                          <button
                            onClick={() => {
                              setIsEditingDraft(true)
                              setTimeout(() => {
                                const firstInput = document.querySelector('.gestarian-paper input') as HTMLInputElement
                                if (firstInput) firstInput.focus()
                              }, 150)
                            }}
                            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 shadow transition-all active:scale-95 flex items-center justify-center"
                            title="EDITAR"
                            aria-label="EDITAR"
                          >
                            <Edit3 className="w-5 h-5 text-cyan-400" />
                          </button>
                        )}

                        <button
                          onClick={handleVolver}
                          className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-bold text-xs tracking-wider uppercase shadow transition-all active:scale-95"
                        >
                          VOLVER
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {facturasFiltradas.length === 0 ? (
            <EmptyState icon={<FileText className="w-12 h-12" />} title="No hay facturas" subtitle="No hay facturas en el trimestre seleccionado" />
          ) : (
            facturasFiltradas.map(f => {
              const cliente = clientes.find(c => c.id === f.cliente_id);
              const vehiculo = vehiculos.find(v => v.id === f.vehiculo_id);
              const p = presupuestos.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).find(pr => pr.vehiculo_id === f.vehiculo_id);
              const expId = p && cliente ? getExpediente(p, cliente, clientes) : 'S/N';
              
              // Border and bg classes based on status
              let borderClass = 'border-orange-500 hover:border-orange-400 bg-orange-950/10 shadow-[0_0_15px_rgba(249,115,22,0.2)]';
              if (f.estado_cobro === 'pagada') {
                borderClass = 'border-emerald-500 hover:border-emerald-400 bg-emerald-950/15 shadow-[0_0_15px_rgba(16,185,129,0.25)]';
              } else {
                // Check for Impago
                const ultimoCobro = localStorage.getItem(`factura_${f.id}_ultimo_cobro`) || f.updated_at;
                const isParcialAndLate = f.estado_cobro === 'parcial' && ultimoCobro && (Date.now() - new Date(ultimoCobro).getTime() > 30 * 24 * 60 * 60 * 1000);
                
                const isEnviado = !!(f.enviado_email_at || f.enviado_whatsapp_at);
                const envioFecha = f.enviado_email_at || f.enviado_whatsapp_at;
                const fechaEmision = f.fecha || envioFecha || f.created_at;
                const isPendienteSentAndLate = f.estado_cobro === 'pendiente' && (Date.now() - new Date(fechaEmision).getTime() > 7 * 24 * 60 * 60 * 1000);

                if (isParcialAndLate || isPendienteSentAndLate) {
                  borderClass = 'border-red-500 hover:border-red-400 bg-red-950/10 shadow-[0_0_15px_rgba(239,68,68,0.25)]';
                } else if (f.estado_cobro === 'parcial') {
                  borderClass = 'border-blue-500 hover:border-blue-400 bg-blue-950/15 shadow-[0_0_15px_rgba(59,130,246,0.25)]';
                } else if (!isEnviado) {
                  borderClass = 'border-yellow-400 hover:border-yellow-300 bg-yellow-950/10 animated-contour-border shadow-[0_0_15px_rgba(250,204,21,0.25)]';
                } else {
                  borderClass = 'border-orange-500 hover:border-orange-400 bg-orange-950/10 shadow-[0_0_15px_rgba(249,115,22,0.2)]';
                }
              }

              return (
                <div 
                  key={f.id} 
                  className={`rounded-2xl border-[3px] p-4 transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${borderClass}`}
                >
                  {/* Info Panel */}
                  <div className="flex-1 min-w-0 space-y-2.5">
                    {/* Line 1: EXP and FAC filling full width (16px) */}
                    <div className="flex items-center justify-between w-full font-mono tracking-wider font-extrabold uppercase" style={{ fontSize: '16px' }}>
                      <span className="text-cyan-400">EXP: {expId}</span>
                      <span className="text-slate-400">FAC: {f.numero}</span>
                    </div>

                    {/* Line 2: Client name centered (18px) */}
                    {cliente && (
                      <div className="text-white font-black uppercase truncate leading-none w-full text-center block" style={{ fontSize: '18px', textAlign: 'center' }}>
                        {cliente.nombre.toLowerCase()}
                      </div>
                    )}

                    {/* Line 3: Matricula left aligned and brand & model centered in remaining space */}
                    <div className="flex items-center w-full text-slate-300 font-semibold">
                      <MatriculaBadge matricula={vehiculo?.matricula} />
                      {vehiculo ? (
                        <span className="flex-1 text-center truncate px-2" style={{ fontSize: '21px' }}>{vehiculo.marca} {vehiculo.modelo}</span>
                      ) : (
                        <span className="flex-1 text-center text-slate-500 px-2" style={{ fontSize: '21px' }}>— Sin vehículo —</span>
                      )}
                    </div>

                    {/* Line 4: Date left, total amount right (20px) */}
                    <div className="flex items-center justify-between w-full text-slate-400 font-bold uppercase tracking-wider" style={{ fontSize: '20px' }}>
                      <span>{new Date(f.fecha).toLocaleDateString('es-ES')}</span>
                      <span className="text-white tabular-nums">{f.total.toFixed(2)} €</span>
                    </div>
                  </div>

                  {/* Actions Panel */}
                  <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFactura(f);
                        setShowRegistro(false);
                        setTimeout(() => document.getElementById('control-cobro')?.scrollIntoView({ behavior: 'smooth' }), 100);
                      }}
                      className="px-4 py-2.5 rounded-xl bg-cyan-900/30 text-cyan-200 border border-cyan-500/30 hover:bg-cyan-800/40 hover:text-cyan-100 text-xs font-bold transition-all text-center"
                      style={{ flex: '1.55' }}
                    >
                      Control de cobro
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFactura(f);
                        setShowRegistro(false);
                        setTimeout(() => document.getElementById('factura-a4')?.scrollIntoView({ behavior: 'smooth' }), 100);
                      }}
                      className="px-4 py-2.5 rounded-xl bg-slate-700/80 text-white border border-slate-600 hover:bg-slate-600 text-xs font-bold transition-all text-center"
                      style={{ flex: '0.45' }}
                    >
                      VER
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
      </>
      )}
      </div>

      {/* Modal Registro de Facturas */}
      {showRegistro && (
        <div className="fixed inset-0 bg-bg-950/80 z-50 flex items-center justify-center p-4" onClick={() => setShowRegistro(false)}>
          <Card className="w-full max-w-2xl p-6 max-h-[80vh] overflow-y-auto">
            <div onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Registro de Facturas</h2>
                <button onClick={() => setShowRegistro(false)} className="text-slate-500 hover:text-white text-sm">Cerrar</button>
              </div>
              <div className="space-y-2">
                {facturas.length === 0 ? (
                  <p className="text-center text-slate-500 py-8">No hay facturas registradas</p>
                ) : (
                  facturas.map((f) => (
                    <div key={f.id} className="flex items-center justify-between p-3 bg-bg-700 rounded-lg">
                      <div>
                        <div className="flex items-center gap-2"><span className="font-medium text-white text-sm">{f.numero}</span><Badge text={getEstadoVisual(f).text} color={getEstadoVisual(f).color} /></div>
                        <p className="text-xs text-slate-500 mt-1">{clienteNombre(f.cliente_id)} · {f.total.toFixed(2)} € · {new Date(f.fecha).toLocaleDateString('es-ES')}</p>
                      </div>
                      <button 
                        onClick={() => { selectFactura(f); setShowRegistro(false) }}
                        className="flex items-center justify-center gap-2 py-1.5 px-4 rounded-xl border text-xs font-semibold bg-bg-800 text-slate-300 border-bg-700 hover:bg-bg-700 hover:text-emerald-400 hover:border-emerald-500/60 transition-all active:scale-95"
                      >
                        Ver
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Card>
        </div>
      )}

      <GlobalImageViewer
        isOpen={showExpedienteViewer || !!viewerMatricula}
        onClose={() => {
          setShowExpedienteViewer(false)
          setViewerMatricula(null)
        }}
        matricula={viewerMatricula || (selectedFactura?.vehiculo_id ? vehiculos.find(v => v.id === selectedFactura.vehiculo_id)?.matricula : undefined)}
        images={expedienteFotos}
        onAddImage={async (dataUrl) => {
          const cId = selectedFactura?.cliente_id
          const vId = selectedFactura?.vehiculo_id
          await saveExpedienteFoto(dataUrl, cId, vId)
          setExpedienteFotos((prev) => [...prev, dataUrl])
        }}
        onDeleteImage={async (index) => {
          setExpedienteFotos((prev) => prev.filter((_, i) => i !== index))
        }}
        title={expedienteViewerTitle}
      />

      {/* Modal Informativo de Envío Directo con botones grandes */}
      {modalEnvioOpen && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all duration-300">
          <AnimatePresence mode="wait">
            <motion.div
              key="expanded-globo"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              className="bg-slate-900 border-[3px] border-emerald-500 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-[0_25px_60px_rgba(0,0,0,0.9),0_0_30px_rgba(16,185,129,0.3)] text-center text-white"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center mx-auto mb-5 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)]">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-wider text-white mb-6">
                FACTURA ENVIADA CORRECTAMENTE
              </h3>

              <div className="flex flex-col gap-3">
                {/* Botón VER EXPEDIENTE */}
                <button
                  onClick={() => {
                    setModalEnvioOpen(false);
                    const vId = selectedFactura?.vehiculo_id;
                    const cId = selectedFactura?.cliente_id;
                    const p = presupuestos.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).find(pr => pr.vehiculo_id === vId);
                    const veh = vehiculos.find(v => v.id === vId);
                    const cli = clientes.find(c => c.id === cId);
                    navigate('/expedientes', {
                      state: {
                        expandPresupuestoId: p?.id,
                        expandVehiculoId: vId,
                        clienteId: cId,
                        search: veh?.matricula || cli?.nombre || ''
                      }
                    });
                  }}
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-black text-xl sm:text-2xl leading-none border-2 border-amber-300 shadow-[0_0_25px_rgba(245,158,11,0.4)] transition-all active:scale-95 flex items-center justify-center gap-3 uppercase tracking-wider"
                >
                  <FolderOpen className="w-6 h-6 sm:w-7 sm:h-7 text-amber-200 fill-amber-200/40 shrink-0" />
                  <span>VER EXPEDIENTE</span>
                </button>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      setModalEnvioOpen(false);
                      handleVolver();
                    }}
                    className="py-3.5 sm:py-4 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-black text-lg sm:text-xl leading-none border border-slate-700 hover:border-slate-600 transition-all active:scale-95 shadow-md flex items-center justify-center gap-2 uppercase tracking-wider"
                  >
                    VOLVER
                  </button>
                  <button
                    onClick={() => {
                      setModalEnvioOpen(false);
                    }}
                    className="py-3.5 sm:py-4 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-lg sm:text-xl leading-none border-2 border-emerald-400/80 shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all active:scale-95 flex items-center justify-center gap-2 uppercase tracking-wider"
                  >
                    ACEPTAR
                  </button>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>,
        document.body
      )}

      {/* Modal Confirmación Salida sin Guardar */}
      {showExitConfirmModal && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm transition-all duration-300">
          <AnimatePresence mode="wait">
            <motion.div
              key="exit-confirm-modal"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="bg-slate-900 border-[3px] border-amber-500 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-[0_25px_60px_rgba(0,0,0,0.9),0_0_30px_rgba(245,158,11,0.25)] text-center text-white"
            >
              <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center mx-auto mb-5 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                <FileText className="w-8 h-8" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-white mb-3">
                {selectedFactura?.id === 'draft' ? "FACTURA NO GUARDADA" : "CAMBIOS PENDIENTES"}
              </h3>
              <p className="text-sm text-slate-300 mb-8 leading-relaxed">
                {selectedFactura?.id === 'draft' 
                  ? "Esta factura está en borrador y no se ha guardado en la base de datos. ¿Deseas guardarla antes de salir?"
                  : "Hay modificaciones sin guardar en la factura. ¿Deseas guardarlas antes de salir?"}
              </p>

              <div className="flex flex-col gap-3">
                <button
                  onClick={guardarYSalir}
                  className="w-full py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-lg leading-none border-2 border-emerald-400/80 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all active:scale-95 flex items-center justify-center gap-2 uppercase tracking-wider"
                >
                  <Save className="w-5 h-5" />
                  GUARDAR Y SALIR
                </button>
                <div className="grid grid-cols-2 gap-3 mt-1">
                  <button
                    onClick={() => setShowExitConfirmModal(false)}
                    className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm border border-slate-700 transition-all active:scale-95 uppercase tracking-wide"
                  >
                    CONTINUAR EDITANDO
                  </button>
                  <button
                    onClick={salirDirecto}
                    className="py-3 px-4 rounded-xl bg-red-950/60 hover:bg-red-900/80 text-red-300 font-bold text-sm border border-red-800/60 transition-all active:scale-95 uppercase tracking-wide"
                  >
                    SALIR SIN GUARDAR
                  </button>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>,
        document.body
      )}

    </div>
  )
}
