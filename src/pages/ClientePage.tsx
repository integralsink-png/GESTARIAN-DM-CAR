import React, { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import type { Cliente, Vehiculo, Presupuesto, Factura, Cobro, Configuracion, Cita } from '../lib/types'
import {
  Image as ImageIcon,
  Heart,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Download,
  Send,
  Printer,
  X,
  FileText,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Euro,
  Check,
  Calendar,
  Clock,
  CalendarClock,
  PlusCircle,
  Upload,
  Trash2,
  FileSpreadsheet
} from 'lucide-react'
import { MatriculaBadge } from '../components/MatriculaBadge'
import { PresupuestoIcon, FacturaIcon } from '../components/CustomIcons'
import { getExpediente } from '../lib/utils'
import { fetchExpedienteFotos } from '../lib/expedienteService'
import { uploadFileToStorage } from '../services/storageService'
import {
  generatePresupuestoPDF,
  generateFacturaPDF,
  downloadPresupuestoPDF,
  downloadFacturaPDF,
  sendPresupuestoByEmail,
  sendFacturaByEmail
} from '../lib/pdfGenerator'
import { notificarCitaSolicitadaAlTaller, notificarSolicitudPresupuestoAlTaller } from '../services/notificationService'
import { useToast } from '../lib/ToastContext'
import { playSuccessChime, playTimepickerTickSound } from '../lib/sound'

interface ExpedienteGroup {
  id: string
  presupuesto: Presupuesto
  factura?: Factura | null
  cita?: Cita | null
}

// Intervalos de 15 min de 07:00 a 21:00
const TIME_SLOTS: string[] = []
for (let h = 7; h <= 21; h++) {
  for (let m = 0; m < 60; m += 15) {
    if (h === 21 && m > 0) break
    TIME_SLOTS.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
  }
}
const DEFAULT_12_INDEX = TIME_SLOTS.indexOf('12:00') !== -1 ? TIME_SLOTS.indexOf('12:00') : 20

const MESES = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
]
const DIAS_SEMANA = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

export function ClientePage() {
  const { token } = useParams<{ token: string }>()
  const { showToast, showActionToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [vehiculo, setVehiculo] = useState<Vehiculo | null>(null)
  const [allClientes, setAllClientes] = useState<Cliente[]>([])
  const [config, setConfig] = useState<Configuracion | null>(null)

  const [expedientes, setExpedientes] = useState<ExpedienteGroup[]>([])
  const [expandedExpedienteId, setExpandedExpedienteId] = useState<string | null>(null)
  const [isCardExpanded, setIsCardExpanded] = useState<boolean>(false)

  // Modales
  const [modalPresupuesto, setModalPresupuesto] = useState<{ open: boolean; presupuesto: Presupuesto | null; expedienteStr: string }>({
    open: false,
    presupuesto: null,
    expedienteStr: ''
  })
  const [modalFactura, setModalFactura] = useState<{ open: boolean; factura: Factura | null }>({
    open: false,
    factura: null
  })
  const [modalEstadoAbono, setModalEstadoAbono] = useState<{ open: boolean; factura: Factura | null; cobros: Cobro[] }>({
    open: false,
    factura: null,
    cobros: []
  })
  const [modalGaleria, setModalGaleria] = useState<{ open: boolean; imagenes: string[]; activeIndex: number }>({
    open: false,
    imagenes: [],
    activeIndex: 0
  })

  // Modal de Cita (Solicitud/Modificación de fecha y hora de entrega)
  const [modalCita, setModalCita] = useState<{
    open: boolean
    presupuesto: Presupuesto | null
    expedienteStr: string
    citaExistente?: Cita | null
  }>({
    open: false,
    presupuesto: null,
    expedienteStr: '',
    citaExistente: null
  })

  // Modal de SOLICITAR PRESUPUESTO (Nueva ventana con fotos y descripción)
  const [modalSolicitudPresupuesto, setModalSolicitudPresupuesto] = useState(false)
  const [formMarca, setFormMarca] = useState('')
  const [formModelo, setFormModelo] = useState('')
  const [formMatricula, setFormMatricula] = useState('')
  const [formDescripcion, setFormDescripcion] = useState('')
  const [formFotos, setFormFotos] = useState<{ file?: File; preview: string; uploadedUrl?: string }[]>([])
  const [enviandoSolicitud, setEnviandoSolicitud] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Estado del selector de fecha/hora dentro del modal de cita
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [selectedDay, setSelectedDay] = useState<number>(() => {
    const manana = new Date()
    manana.setDate(manana.getDate() + 1)
    return manana.getDate()
  })
  const [selectedTimeIndex, setSelectedTimeIndex] = useState<number>(DEFAULT_12_INDEX)
  const [guardandoCita, setGuardandoCita] = useState(false)

  // Likes en imágenes (URL -> boolean)
  const [likedImages, setLikedImages] = useState<Record<string, boolean>>({})

  // Acciones en progreso
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    if (!token) return
    loadData()
  }, [token])

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      let clienteId: string | null = null
      let vehiculoId: string | null = null

      // Modo Demo / Preview para el Desarrollador
      if (token === 'demo' || token === 'preview' || token === 'desarrollador') {
        const { data: firstVeh } = await supabase.from('vehiculos').select('id, cliente_id').order('created_at', { ascending: false }).limit(1).maybeSingle()
        if (firstVeh) {
          clienteId = firstVeh.cliente_id
          vehiculoId = firstVeh.id
        }
      } else {
        // 1. Invitación por token
        const { data: invitacion, error: invErr } = await supabase
          .from('cliente_invitaciones')
          .select('*')
          .eq('token', token!)
          .maybeSingle()

        if (invErr || !invitacion) {
          setError('Enlace no válido. Contacta con el taller para obtener un enlace nuevo.')
          setLoading(false)
          return
        }

        clienteId = invitacion.cliente_id
        vehiculoId = invitacion.vehiculo_id
      }

      if (!clienteId || !vehiculoId) {
        setError('No se encontraron vehículos o clientes de prueba.')
        setLoading(false)
        return
      }

      // 2. Cliente y Vehículo
      const { data: cli } = await supabase.from('clientes').select('*').eq('id', clienteId).maybeSingle()
      const { data: veh } = await supabase.from('vehiculos').select('*').eq('id', vehiculoId).maybeSingle()
      const { data: conf } = await supabase.from('configuracion').select('*').eq('id', 1).maybeSingle()
      const { data: clientesList } = await supabase.from('clientes').select('*')

      if (!cli || !veh) {
        setError('No se encontraron los datos del cliente o del vehículo.')
        setLoading(false)
        return
      }

      setCliente(cli)
      setVehiculo(veh)
      setConfig(conf || null)
      setAllClientes(clientesList || [])

      // Pre-cargar datos del vehículo en el formulario de solicitud
      setFormMarca(veh.marca || '')
      setFormModelo(veh.modelo || '')
      setFormMatricula(veh.matricula || '')

      // 3. Presupuestos, Facturas y Citas
      const [presRes, facRes, citasRes] = await Promise.all([
        supabase.from('presupuestos').select('*').eq('vehiculo_id', veh.id).order('created_at', { ascending: false }),
        supabase.from('facturas').select('*').eq('vehiculo_id', veh.id).order('created_at', { ascending: false }),
        supabase.from('citas').select('*').eq('vehiculo_id', veh.id).order('created_at', { ascending: false })
      ])

      const presupuestosList: Presupuesto[] = presRes.data ?? []
      const facturasList: Factura[] = facRes.data ?? []
      const citasList: Cita[] = citasRes.data ?? []

      // Mapear expedientes
      const groups: ExpedienteGroup[] = presupuestosList.map((p) => {
        const matchedFactura =
          facturasList.find(
            (f) =>
              f.vehiculo_id === veh.id &&
              (f.numero === p.numero || f.conceptos?.length === p.conceptos?.length)
          ) ||
          facturasList[0] ||
          null

        const matchedCita = citasList.find((c) => c.presupuesto_id === p.id || c.vehiculo_id === veh.id) || null

        return {
          id: p.id,
          presupuesto: p,
          factura: matchedFactura,
          cita: matchedCita
        }
      })

      // Si no hay presupuestos pero sí facturas
      if (groups.length === 0 && facturasList.length > 0) {
        facturasList.forEach((f) => {
          const fakeP: Presupuesto = {
            id: f.id,
            numero: f.numero,
            cliente_id: cli.id,
            vehiculo_id: veh.id,
            estado: 'aceptado',
            conceptos: f.conceptos || [],
            total: f.total || 0,
            observaciones: f.observaciones || '',
            created_at: f.created_at
          }
          groups.push({
            id: f.id,
            presupuesto: fakeP,
            factura: f,
            cita: citasList[0] || null
          })
        })
      }

      // Ordenar expedientes:
      // 1. Prioridad absoluta: IMPAGADOS (Factura emitida y enviada con cobro pendiente/parcial)
      // 2. Expedientes ACTIVOS (aún no cerrados por abono total), los más actuales primero cronológicamente
      // 3. Expedientes CERRADOS (Abono total completado)
      groups.sort((a, b) => {
        const aFac = a.factura
        const bFac = b.factura

        const aImpagado = !!aFac && (!!aFac.enviado_email_at || !!aFac.enviado_whatsapp_at) && aFac.estado_cobro !== 'pagada'
        const bImpagado = !!bFac && (!!bFac.enviado_email_at || !!bFac.enviado_whatsapp_at) && bFac.estado_cobro !== 'pagada'

        if (aImpagado && !bImpagado) return -1
        if (!aImpagado && bImpagado) return 1

        const aActivo = !aFac || aFac.estado_cobro !== 'pagada'
        const bActivo = !bFac || bFac.estado_cobro !== 'pagada'

        if (aActivo && !bActivo) return -1
        if (!aActivo && bActivo) return 1

        // Orden cronológico más actual primero
        const aDate = new Date(a.presupuesto.created_at || 0).getTime()
        const bDate = new Date(b.presupuesto.created_at || 0).getTime()
        return bDate - aDate
      })

      setExpedientes(groups)
      if (groups.length > 0) {
        setExpandedExpedienteId(groups[0].id)
      }

      // Likes mapa desde almacenamiento local
      try {
        const savedLikes = localStorage.getItem(`dm_car_likes_${cli.id}`)
        if (savedLikes) {
          setLikedImages(JSON.parse(savedLikes))
        }
      } catch (e) {
        console.warn('Error leyendo likes locales:', e)
      }

      // Cargar imágenes para galería
      const imgs = await fetchExpedienteFotos(cli.id, veh.id, veh.fotos || [])
      setModalGaleria((prev) => ({ ...prev, imagenes: imgs }))
    } catch (err: any) {
      console.error('Error al cargar datos de cliente:', err)
      setError('Error al cargar los datos. Inténtalo más tarde.')
    } finally {
      setLoading(false)
    }
  }

  // ACEPTAR PRESUPUESTO -> Dispara confirmación en Toast y abre formulario de CITA
  const handleAceptarPresupuestoClick = (p: Presupuesto, expStr: string, citaExistente?: Cita | null) => {
    showActionToast('¿Confirmar aceptación del presupuesto?', async () => {
      try {
        await supabase.from('presupuestos').update({ estado: 'aceptado' }).eq('id', p.id)
        p.estado = 'aceptado'
        setExpedientes((prev) =>
          prev.map((item) => (item.id === p.id ? { ...item, presupuesto: { ...item.presupuesto, estado: 'aceptado' } } : item))
        )
      } catch (e) {
        console.warn('Error actualizando presupuesto:', e)
      }

      playSuccessChime()
      showToast('PRESUPUESTO ACEPTADO', 'success')

      setModalCita({
        open: true,
        presupuesto: p,
        expedienteStr: expStr,
        citaExistente: citaExistente || null
      })
    })
  }

  // CONFIRMAR / ACEPTAR PROPUESTA DE CITA DEL TALLER DIRECTAMENTE
  const handleAceptarPropuestaTaller = async (cita: Cita) => {
    try {
      await supabase.from('citas').update({ estado: 'confirmada' }).eq('id', cita.id)
      playSuccessChime()
      showToast('CITA CONFIRMADA DEFINITIVAMENTE', 'success')
      loadData()
    } catch (e) {
      showToast('Error al confirmar cita', 'error')
    }
  }

  // SOLICITAR O MODIFICAR CITA DESDE EL FORMULARIO
  const handleSolicitarCita = async () => {
    if (!modalCita.presupuesto || !cliente || !vehiculo || guardandoCita) return
    setGuardandoCita(true)

    try {
      const horaStr = TIME_SLOTS[selectedTimeIndex] || '09:00'
      const currentYear = currentDate.getFullYear()
      const monthFormatted = String(currentDate.getMonth() + 1).padStart(2, '0')
      const dayFormatted = String(selectedDay).padStart(2, '0')
      const fechaStr = `${currentYear}-${monthFormatted}-${dayFormatted}`

      const p = modalCita.presupuesto
      const citaId = modalCita.citaExistente?.id

      if (citaId) {
        await supabase
          .from('citas')
          .update({
            fecha: fechaStr,
            hora: horaStr,
            estado: 'pendiente'
          })
          .eq('id', citaId)
      } else {
        await supabase.from('citas').insert({
          presupuesto_id: p.id,
          cliente_id: cliente.id,
          vehiculo_id: vehiculo.id,
          fecha: fechaStr,
          hora: horaStr,
          estado: 'pendiente'
        })
      }

      void notificarCitaSolicitadaAlTaller({
        clienteNombre: cliente.nombre,
        matricula: vehiculo.matricula,
        presupuestoNumero: p.numero,
        presupuestoTotal: p.total,
        fecha: fechaStr,
        hora: horaStr
      })

      playSuccessChime()
      showToast('CITA SOLICITADA Y NOTIFICADA AL TALLER', 'success')
      setModalCita({ open: false, presupuesto: null, expedienteStr: '', citaExistente: null })
      loadData()
    } catch (e: any) {
      console.error('Error solicitando cita:', e)
      showToast('Error al solicitar cita: ' + (e.message || ''), 'error')
    } finally {
      setGuardandoCita(false)
    }
  }

  // MANEJO DE FOTOS PARA LA SOLICITUD DE PRESUPUESTO (MÁXIMO 10 FOTOS)
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const filesArray = Array.from(e.target.files)
    const espacioDisponible = 10 - formFotos.length

    if (espacioDisponible <= 0) {
      showToast('Máximo 10 imágenes permitidas', 'warning')
      return
    }

    const nuevosArchivos = filesArray.slice(0, espacioDisponible).map((file) => ({
      file,
      preview: URL.createObjectURL(file)
    }))

    setFormFotos((prev) => [...prev, ...nuevosArchivos])
    if (filesArray.length > espacioDisponible) {
      showToast(`Solo se añadieron ${espacioDisponible} fotos (límite de 10)`, 'info')
    }
    e.target.value = ''
  }

  const handleRemoveFoto = (index: number) => {
    setFormFotos((prev) => prev.filter((_, i) => i !== index))
  }

  // ENVIAR SOLICITUD DE PRESUPUESTO
  const handleSubmitSolicitudPresupuesto = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cliente || enviandoSolicitud) return

    if (!formDescripcion.trim()) {
      showToast('Por favor describe la reparación o servicio requerido', 'warning')
      return
    }

    setEnviandoSolicitud(true)
    try {
      // 1. Subir imágenes si existen
      const uploadedUrls: string[] = []
      for (const item of formFotos) {
        if (item.file) {
          const uploadRes = await uploadFileToStorage(item.file, item.file.name, {
            clienteId: cliente.id,
            vehiculoId: vehiculo?.id,
            categoria: 'fotos'
          })
          if (uploadRes.success && uploadRes.url) {
            uploadedUrls.push(uploadRes.url)
          } else {
            uploadedUrls.push(item.preview)
          }
        } else if (item.uploadedUrl) {
          uploadedUrls.push(item.uploadedUrl)
        }
      }

      // 2. Generar número correlativo temporal de presupuesto
      const randomPresNum = 'SOL-' + Math.floor(1000 + Math.random() * 9000)

      // 3. Crear registro de presupuesto pendiente con la solicitud
      const { data: newPres, error: presErr } = await supabase
        .from('presupuestos')
        .insert({
          numero: randomPresNum,
          cliente_id: cliente.id,
          vehiculo_id: vehiculo?.id || null,
          estado: 'pendiente',
          conceptos: [
            {
              descripcion: `Solicitud de cliente: ${formDescripcion.trim().slice(0, 100)}...`,
              cantidad: 1,
              precio: 0
            }
          ],
          total: 0,
          observaciones: `[SOLICITUD CLIENTE]\nVehículo: ${formMarca} ${formModelo} (${formMatricula})\nReparación requerida:\n${formDescripcion.trim()}`,
          fotos: uploadedUrls
        })
        .select()
        .single()

      if (presErr) {
        console.warn('Advertencia creando registro de presupuesto:', presErr)
      }

      // 4. Actualizar fotos del vehículo si aplica
      if (vehiculo && uploadedUrls.length > 0) {
        const fotosActuales = vehiculo.fotos || []
        await supabase
          .from('vehiculos')
          .update({
            marca: formMarca || vehiculo.marca,
            modelo: formModelo || vehiculo.modelo,
            matricula: formMatricula || vehiculo.matricula,
            fotos: [...fotosActuales, ...uploadedUrls]
          })
          .eq('id', vehiculo.id)
      }

      // 5. Notificar al Jefe de Taller por Email
      void notificarSolicitudPresupuestoAlTaller({
        clienteNombre: cliente.nombre,
        marca: formMarca || vehiculo?.marca,
        modelo: formModelo || vehiculo?.modelo,
        matricula: formMatricula || vehiculo?.matricula,
        descripcion: formDescripcion,
        totalFotos: uploadedUrls.length
      })

      playSuccessChime()
      showToast('SOLICITUD DE PRESUPUESTO ENVIADA CORRECTAMENTE', 'success')
      setModalSolicitudPresupuesto(false)
      setFormDescripcion('')
      setFormFotos([])
      loadData()
    } catch (err: any) {
      console.error('Error enviando solicitud:', err)
      showToast('Error al enviar solicitud: ' + (err.message || ''), 'error')
    } finally {
      setEnviandoSolicitud(false)
    }
  }

  // Controles de mes
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
    setSelectedDay(1)
  }
  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
    setSelectedDay(1)
  }
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
  const firstDayIndex = (new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay() + 6) % 7

  // Toggle Me Gusta en imagen
  const handleToggleLike = async (imageUrl: string) => {
    if (!cliente || !vehiculo) return
    const currentStatus = !likedImages[imageUrl]

    setLikedImages((prev) => {
      const updated = { ...prev, [imageUrl]: currentStatus }
      try {
        localStorage.setItem(`dm_car_likes_${cliente.id}`, JSON.stringify(updated))
      } catch (e) {
        console.warn('Error guardando like:', e)
      }
      return updated
    })

    showToast(currentStatus ? '¡Guardada en tus favoritos!' : 'Eliminada de favoritos', 'success')
  }

  // Abrir Visor Galería
  const handleOpenGaleria = async (initialIndex = 0) => {
    if (!cliente || !vehiculo) return
    const imgs = await fetchExpedienteFotos(cliente.id, vehiculo.id, vehiculo.fotos || [])
    setModalGaleria({
      open: true,
      imagenes: imgs,
      activeIndex: initialIndex
    })
  }

  // Abrir Estado del Abono
  const handleOpenEstadoAbono = async (fac: Factura) => {
    try {
      const { data: cobrosData } = await supabase
        .from('cobros')
        .select('*')
        .eq('factura_id', fac.id)
        .order('fecha', { ascending: false })

      setModalEstadoAbono({
        open: true,
        factura: fac,
        cobros: cobrosData || []
      })
    } catch (e) {
      setModalEstadoAbono({
        open: true,
        factura: fac,
        cobros: []
      })
    }
  }

  // Acciones Presupuesto (Descargar / Enviar / Imprimir)
  const handleDownloadPresupuesto = (p: Presupuesto, expStr: string) => {
    downloadPresupuestoPDF(p, cliente, vehiculo, config, expStr)
    showToast('Presupuesto descargado en PDF', 'success')
  }

  const handleSendPresupuesto = async (p: Presupuesto, expStr: string) => {
    if (!cliente?.email) {
      alert('No hay un correo electrónico asociado a tu cuenta.')
      return
    }
    setActionLoading(true)
    try {
      const res = await sendPresupuestoByEmail(p, cliente, vehiculo, config, expStr)
      if (res.success) {
        showToast('Presupuesto enviado a tu correo electrónico', 'success')
      } else {
        showToast('No se pudo enviar el correo: ' + (res.error || ''), 'error')
      }
    } finally {
      setActionLoading(false)
    }
  }

  const handlePrintPresupuesto = (p: Presupuesto, expStr: string) => {
    const doc = generatePresupuestoPDF(p, cliente, vehiculo, config, expStr)
    doc.autoPrint()
    const blobUrl = doc.output('bloburl')
    window.open(blobUrl, '_blank')
  }

  // Acciones Factura (Descargar / Enviar / Imprimir)
  const handleDownloadFactura = (f: Factura) => {
    downloadFacturaPDF(f, cliente, vehiculo, config)
    showToast('Factura descargada en PDF', 'success')
  }

  const handleSendFactura = async (f: Factura) => {
    if (!cliente?.email) {
      alert('No hay un correo electrónico asociado a tu cuenta.')
      return
    }
    setActionLoading(true)
    try {
      const res = await sendFacturaByEmail(f, cliente, vehiculo, config)
      if (res.success) {
        showToast('Factura enviada a tu correo electrónico', 'success')
      } else {
        showToast('No se pudo enviar el correo: ' + (res.error || ''), 'error')
      }
    } finally {
      setActionLoading(false)
    }
  }

  const handlePrintFactura = (f: Factura) => {
    const doc = generateFacturaPDF(f, cliente, vehiculo, config)
    doc.autoPrint()
    const blobUrl = doc.output('bloburl')
    window.open(blobUrl, '_blank')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg-950">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mx-auto mb-3" />
          <p className="text-white/60 text-sm font-medium">Cargando área de cliente...</p>
        </div>
      </div>
    )
  }

  if (error || !cliente || !vehiculo) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg-950 p-4">
        <div className="text-center max-w-md bg-bg-900/90 border border-red-500/40 rounded-3xl p-8 shadow-2xl">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-white mb-2">Acceso No Disponible</h2>
          <p className="text-red-300 text-sm mb-6 leading-relaxed">{error || 'No se pudo cargar la información.'}</p>
          <p className="text-white/40 text-xs">Por favor, contacta con DM CAR para recibir un nuevo enlace de acceso.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white selection:bg-cyan-500 selection:text-black">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. CABECERA: LOGO x0.6 (96px x 96px) + TEXTO (Base alineada y 30px de aire) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <header className="w-full px-[30px] pt-6 pb-2 max-w-5xl mx-auto flex items-end justify-between">
        <div className="flex items-end">
          <div className="w-[85px] h-[85px] sm:w-[96px] sm:h-[96px] rounded-2xl overflow-hidden shadow-[0_0_25px_rgba(6,182,212,0.4)] border-2 border-white/20 bg-white shrink-0 hover:scale-105 transition-transform">
            <img src="/images/logos/logo.jpg" alt="DM CAR" className="w-full h-full object-cover" />
          </div>
        </div>

        <div className="flex flex-col items-end justify-end text-right select-none">
          <span
            className="font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-200 to-white tracking-wider leading-none drop-shadow-[0_0_20px_rgba(6,182,212,0.5)]"
            style={{ fontSize: 'clamp(2.8rem, 9vw, 6rem)', lineHeight: '0.85' }}
          >
            DM CAR
          </span>
          <span className="text-xs sm:text-sm font-bold tracking-[0.3em] uppercase text-cyan-400/80 mt-1 leading-none">
            Área de Cliente
          </span>
        </div>
      </header>

      {/* BOTÓN: SOLICITAR NUEVO PRESUPUESTO (DEBAJO DEL LOGO Y MARCA DEL TALLER, DESPLAZADO 10PX MÁS ABAJO) */}
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-8 mt-2.5 mb-5 flex justify-center">
        <button
          onClick={() => setModalSolicitudPresupuesto(true)}
          className="px-6 py-2 rounded-xl bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 hover:from-cyan-500 hover:via-teal-500 hover:to-emerald-500 text-white font-black text-xs sm:text-sm shadow-[0_0_20px_rgba(6,182,212,0.4)] border border-cyan-400 flex items-center justify-center transition-all hover:scale-105 active:scale-95 uppercase tracking-wider whitespace-nowrap cursor-pointer select-none"
          title="Solicitar nuevo presupuesto"
        >
          <span className="text-white font-black whitespace-nowrap">SOLICITAR NUEVO PRESUPUESTO</span>
        </button>
      </div>

      {/* NOMBRE DEL CLIENTE EN GRANDE Y MENSAJE DE BIENVENIDA EN DOS LÍNEAS (TAMAÑO x1.6) */}
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 mb-7 text-center flex flex-col items-center select-none">
        <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold uppercase tracking-wide text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]">
          {cliente.nombre}
        </h1>
        <p className="text-2xl sm:text-3xl md:text-4xl text-cyan-400 font-black mt-2.5 tracking-wide leading-snug sm:leading-tight drop-shadow-[0_0_14px_rgba(6,182,212,0.55)]">
          <span>Bienvenido/a a tu panel</span>
          <span className="block mt-0.5 sm:mt-1 text-teal-300">exclusivo de seguimiento</span>
        </p>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. TARJETA FLOTANTE PRINCIPAL */}
      {/* ───────────────────────────────────────────────────────────── */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pb-20">
        {/* TARJETA PRINCIPAL COLAPSABLE */}
        <div
          onClick={() => setIsCardExpanded((prev) => !prev)}
          className={`relative bg-slate-900/90 backdrop-blur-xl border-2 rounded-3xl p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_30px_rgba(6,182,212,0.2)] transition-all duration-300 cursor-pointer select-none ${
            isCardExpanded
              ? 'border-cyan-400/90 shadow-[0_0_35px_rgba(6,182,212,0.3)]'
              : 'border-cyan-500/40 hover:border-cyan-400/70 hover:scale-[1.01]'
          }`}
        >
          {/* CABECERA VISIBLE SIEMPRE: MATRÍCULA ARRIBA CENTRADA + MARCA Y MODELO CENTRADO DEBAJO */}
          <div className="flex flex-col items-center justify-center text-center">
            {/* 1. Matrícula estándar oficial con dibujo y caracteres negros */}
            <div className="mb-3.5 hover:scale-105 transition-transform">
              <MatriculaBadge matricula={vehiculo.matricula} size="xl" />
            </div>

            {/* 2. Marca y Modelo centrado debajo de la matrícula */}
            <div className="flex items-baseline justify-center flex-wrap gap-x-3 gap-y-1">
              <span className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-wide uppercase drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]">
                {vehiculo.marca || ''} {vehiculo.modelo || ''}
              </span>
              {vehiculo.anio && (
                <span className="text-base sm:text-lg text-slate-400 font-bold">
                  ({vehiculo.anio})
                </span>
              )}
            </div>

            {/* Indicador de pulsar para expandir/colapsar */}
            <div className="mt-4 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest text-cyan-400/90 bg-cyan-950/40 border border-cyan-500/30 px-4 py-1.5 rounded-full">
              <span>{isCardExpanded ? 'Pulsar para plegar' : 'Pulsar para ver detalles y expedientes'}</span>
              {isCardExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4 animate-bounce" />}
            </div>
          </div>

          {/* CONTENIDO DESPLEGABLE (SE EXPANDE HACIA ABAJO AL PULSAR LA TARJETA) */}
          <AnimatePresence>
            {isCardExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.35, ease: 'easeInOut' }}
                className="overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* HISTORIAL DE EXPEDIENTES (IMPAGADOS EN ROJO PRIORIDAD ABSOLUTA, ACTIVOS PRIMERO) */}
                <div className="space-y-4 mt-8 pt-6 border-t border-slate-800">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="text-base sm:text-lg font-black uppercase tracking-widest text-white">
                      HISTORIAL DE EXPEDIENTES
                    </h3>
                    <span className="text-lg sm:text-xl font-black text-cyan-400 tabular-nums">
                      {expedientes.length} {expedientes.length === 1 ? 'expediente' : 'expedientes'}
                    </span>
                  </div>

                  {expedientes.length === 0 ? (
                    <div className="text-center py-10 bg-slate-950/40 rounded-2xl border border-slate-800">
                      <FileText className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                      <p className="text-slate-400 text-sm">No hay expedientes activos para este vehículo.</p>
                    </div>
                  ) : (
                    expedientes.map((exp) => {
                      const expStr = getExpediente(exp.presupuesto, cliente, allClientes)
                      const isExpanded = expandedExpedienteId === exp.id
                      const conceptos = exp.presupuesto.conceptos || []
                      const hasFactura = !!exp.factura
                      const fac = exp.factura
                      const facturaPagada = fac?.estado_cobro === 'pagada'
                      const isImpagado = !!fac && (!!fac.enviado_email_at || !!fac.enviado_whatsapp_at) && fac.estado_cobro !== 'pagada'
                      const isActivo = !fac || fac.estado_cobro !== 'pagada'
                      const presAceptado = exp.presupuesto.estado === 'aceptado'
                      const cita = exp.cita

                      // Cálculos de Base, IVA y Total
                      const totalPresupuesto = exp.presupuesto.total || 0
                      const baseImponible = totalPresupuesto / 1.21
                      const ivaImporte = totalPresupuesto - baseImponible

                      return (
                        <div
                          key={exp.id}
                          className={`rounded-2xl border-2 transition-all duration-300 overflow-hidden ${
                            isImpagado
                              ? isExpanded
                                ? 'border-rose-500 bg-rose-950/60 shadow-[0_0_30px_rgba(244,63,94,0.45)]'
                                : 'border-rose-600/80 bg-rose-950/30 hover:border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.25)]'
                              : isExpanded
                              ? 'border-cyan-400/80 bg-slate-950/90 shadow-[0_0_25px_rgba(6,182,212,0.25)]'
                              : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                          }`}
                        >
                          {/* Fila Encabezado del Expediente (Clic para desplegar) */}
                          <div
                            onClick={() => setExpandedExpedienteId(isExpanded ? null : exp.id)}
                            className="p-4 sm:p-5 flex flex-col gap-3 cursor-pointer select-none"
                          >
                            {/* 1ª LÍNEA: NÚMERO DE EXPEDIENTE A LA IZQUIERDA (x1.5) Y NÚMERO DE PRESUPUESTO A LA DERECHA (x1.5) */}
                            <div className="flex items-center justify-between gap-4">
                              <span className={`font-mono font-black text-lg sm:text-xl tracking-wide ${
                                isImpagado ? 'text-rose-400' : 'text-cyan-400'
                              }`}>
                                EXP: {expStr}
                              </span>

                              <div className="flex items-center gap-3">
                                <span className="font-mono font-black text-lg sm:text-xl text-slate-200">
                                  PRES: {exp.presupuesto.numero}
                                </span>
                                <div className="w-8 h-8 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-400 shrink-0">
                                  {isExpanded ? <ChevronUp className="w-5 h-5 text-cyan-400" /> : <ChevronDown className="w-5 h-5" />}
                                </div>
                              </div>
                            </div>

                            {/* 2ª LÍNEA: FECHA DEL EXPEDIENTE (x2) Y ESTADO (x1.5) */}
                            <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-800/60">
                              <p className="text-sm sm:text-base font-bold text-slate-300">
                                📅 {new Date(exp.presupuesto.created_at).toLocaleDateString('es-ES', {
                                  day: '2-digit',
                                  month: 'long',
                                  year: 'numeric'
                                })}
                              </p>

                              {isImpagado ? (
                                <span className="text-xs sm:text-sm px-3 py-1 rounded-full font-black uppercase tracking-wider bg-rose-500 text-white shadow-[0_0_10px_rgba(244,63,94,0.6)] animate-pulse">
                                  IMPAGADO
                                </span>
                              ) : isActivo ? (
                                <span className="text-xs sm:text-sm px-3 py-1 rounded-full font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                                  ACTIVO
                                </span>
                              ) : (
                                <span className="text-xs sm:text-sm px-3 py-1 rounded-full font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                  CERRADO
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Contenido Desplegado */}
                          {isExpanded && (
                            <div className="p-4 sm:p-6 border-t border-slate-800 bg-slate-900/60 space-y-6 animate-in fade-in duration-200">
                              {/* Tabla de Conceptos */}
                              <div>
                                {conceptos.length === 0 ? (
                                  <p className="text-xs text-slate-500 italic">No se desglosaron conceptos específicos.</p>
                                ) : (
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs sm:text-sm">
                                      <thead>
                                        <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[11px] sm:text-xs">
                                          <th className="pb-2">Descripción</th>
                                          <th className="pb-2 text-center w-16">Cant.</th>
                                          <th className="pb-2 text-right w-24">Precio Unit.</th>
                                          <th className="pb-2 text-right w-24">Importe</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-800/60 text-slate-200 font-medium">
                                        {conceptos.map((c, idx) => (
                                          <tr key={idx} className="hover:bg-white/[0.02]">
                                            <td className="py-2.5 pr-2 font-medium">{c.descripcion}</td>
                                            <td className="py-2.5 text-center text-slate-400 tabular-nums">{c.cantidad}</td>
                                            <td className="py-2.5 text-right text-slate-400 tabular-nums">{c.precio.toFixed(2)} €</td>
                                            <td className="py-2.5 text-right font-bold text-white tabular-nums">
                                              {(c.cantidad * c.precio).toFixed(2)} €
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>

                              {/* BASE IMPONIBLE, IVA Y TOTAL PRESUPUESTO (DESPLEGADO TRAS LOS CONCEPTOS) */}
                              <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-2 shadow-inner">
                                <div className="flex items-center justify-between text-xs text-slate-400">
                                  <span>Base Imponible:</span>
                                  <span className="font-mono font-bold tabular-nums">{baseImponible.toFixed(2)} €</span>
                                </div>
                                <div className="flex items-center justify-between text-xs text-slate-400">
                                  <span>I.V.A. (21%):</span>
                                  <span className="font-mono font-bold tabular-nums">{ivaImporte.toFixed(2)} €</span>
                                </div>
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-slate-800">
                                  <span className="text-sm sm:text-base font-black uppercase tracking-wider text-slate-200">
                                    TOTAL PRESUPUESTO
                                  </span>
                                  <span className="text-2xl sm:text-3xl font-black text-emerald-400 tabular-nums drop-shadow-[0_0_12px_rgba(16,185,129,0.3)]">
                                    {totalPresupuesto.toFixed(2)} €
                                  </span>
                                </div>
                              </div>

                              {/* ───────────────────────────────────────────────────────────── */}
                              {/* BOTÓN: ACEPTAR PRESUPUESTO (x0.7) & ESTADO DE CITA / NEGOCIACIÓN */}
                              {/* ───────────────────────────────────────────────────────────── */}
                              <div className="pt-2 border-t border-slate-800/80 flex flex-col items-center justify-center gap-3">
                                {/* Si el presupuesto NO ha sido aceptado aún */}
                                {!presAceptado && (
                                  <button
                                    onClick={() => handleAceptarPresupuestoClick(exp.presupuesto, expStr, exp.cita)}
                                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm shadow-[0_0_15px_rgba(16,185,129,0.4)] border border-emerald-400 flex items-center justify-center gap-1.5 transition-all hover:scale-[1.02] active:scale-95 uppercase tracking-wider cursor-pointer"
                                    style={{ transform: 'scale(0.95)' }}
                                    title="Aceptar este presupuesto"
                                  >
                                    <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
                                    <span>ACEPTAR PRESUPUESTO</span>
                                  </button>
                                )}

                                {/* Si ya está aceptado pero aún no tiene cita solicitada */}
                                {presAceptado && !cita && (
                                  <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-emerald-950/30 border-2 border-emerald-500/50">
                                    <div className="flex items-center gap-3">
                                      <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                                      <div>
                                        <span className="font-bold text-emerald-400 text-sm block">Presupuesto Aceptado</span>
                                        <span className="text-xs text-slate-300">Solicita fecha y hora para la entrega de tu vehículo.</span>
                                      </div>
                                    </div>
                                    <button
                                      onClick={() =>
                                        setModalCita({
                                          open: true,
                                          presupuesto: exp.presupuesto,
                                          expedienteStr: expStr,
                                          citaExistente: null
                                        })
                                      }
                                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg uppercase tracking-wider flex items-center gap-2 transition-all active:scale-95 shrink-0 cursor-pointer"
                                    >
                                      <Calendar className="w-4 h-4" /> Solicitar Cita
                                    </button>
                                  </div>
                                )}

                                {/* Si hay cita registrada (en negociación o confirmada) */}
                                {cita && (() => {
                                  // Formatear fecha a dd/mm/aa
                                  const d = new Date(cita.fecha)
                                  const dd = String(d.getDate()).padStart(2, '0')
                                  const mm = String(d.getMonth() + 1).padStart(2, '0')
                                  const aa = String(d.getFullYear()).slice(-2)
                                  const fechaShort = `${dd}/${mm}/${aa}`
                                  const horaStr = cita.hora ? cita.hora.substring(0, 5) : '09:00'

                                  const estadoLabel =
                                    cita.estado === 'confirmada'
                                      ? 'CITA CONFIRMADA'
                                      : cita.estado === 'completada'
                                      ? 'COMPLETADA'
                                      : cita.estado === 'cancelada'
                                      ? 'CANCELADA'
                                      : 'PENDIENTE DE CONFIRMACIÓN'

                                  return (
                                    <div
                                      className={`w-full p-5 rounded-2xl border-2 space-y-3.5 ${
                                        cita.estado === 'confirmada'
                                          ? 'bg-emerald-950/40 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.25)]'
                                          : 'bg-slate-900/90 border-amber-500/70 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                                      }`}
                                    >
                                      {/* TÍTULO ARRIBA A LA IZQUIERDA GRANDE: CITA (x2 TAMAÑO) */}
                                      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                                        <h3 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-wider">
                                          CITA
                                        </h3>

                                        {cita.estado !== 'confirmada' && (
                                          <button
                                            onClick={() => handleAceptarPropuestaTaller(cita)}
                                            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                                            title="Aceptar esta fecha asignada por el taller"
                                          >
                                            <Check className="w-3.5 h-3.5" /> Aceptar Fecha
                                          </button>
                                        )}
                                      </div>

                                      {/* SIGUIENTE LÍNEA: DD/MM/AA (TAMAÑO x2) Y HORA 00:00 (TAMAÑO x1.5) SIN 'Fecha:' NI 'h' */}
                                      <div className="flex items-baseline gap-4 text-slate-200 py-1">
                                        <span className="text-white font-mono font-black text-xl sm:text-2xl tracking-wide">
                                          {fechaShort}
                                        </span>
                                        <span className="text-cyan-400 font-mono font-black text-lg sm:text-xl">
                                          {horaStr}
                                        </span>
                                      </div>

                                      {/* SIGUIENTE LÍNEA: SOLO ESTADO ("pendiente", "asignada", "confirmada") Y BOTÓN MODIFICAR */}
                                      <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-800/60">
                                        <span
                                          className={`text-xs px-3.5 py-1 rounded-full font-black uppercase tracking-wider whitespace-nowrap ${
                                            cita.estado === 'confirmada'
                                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/50 animate-pulse'
                                          }`}
                                        >
                                          {cita.estado || estadoLabel}
                                        </span>

                                        <button
                                          onClick={() =>
                                            setModalCita({
                                              open: true,
                                              presupuesto: exp.presupuesto,
                                              expedienteStr: expStr,
                                              citaExistente: cita
                                            })
                                          }
                                          className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-cyan-200 font-black text-xs border border-cyan-500/40 uppercase tracking-wider transition-all active:scale-95 shadow cursor-pointer shrink-0"
                                        >
                                          MODIFICAR
                                        </button>
                                      </div>
                                    </div>
                                  )
                                })()}
                              </div>

                              {/* ───────────────────────────────────────────────────────────── */}
                              {/* ICONOS FLOTANTES DE ACCIÓN DEL EXPEDIENTE */}
                              {/* ───────────────────────────────────────────────────────────── */}
                              <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-center gap-6">
                                {/* 1. Icono Flotante "P" (Abre el Presupuesto Completo en Vista A4) */}
                                <div className="flex flex-col items-center gap-1.5">
                                  <button
                                    onClick={() =>
                                      setModalPresupuesto({
                                        open: true,
                                        presupuesto: exp.presupuesto,
                                        expedienteStr: expStr
                                      })
                                    }
                                    className="w-14 h-14 rounded-full bg-cyan-500/20 hover:bg-cyan-500/30 border-2 border-cyan-400 text-cyan-300 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all hover:scale-110 active:scale-95 group"
                                    title="Ver Presupuesto A4"
                                  >
                                    <span className="text-2xl font-black font-mono leading-none group-hover:scale-110 transition-transform">
                                      P
                                    </span>
                                  </button>
                                  <span className="text-[11px] font-bold text-cyan-300 uppercase tracking-wider">
                                    Presupuesto
                                  </span>
                                </div>

                                {/* 2. Icono de Imágenes (Abre Visor con Likes) */}
                                <div className="flex flex-col items-center gap-1.5">
                                  <button
                                    onClick={() => handleOpenGaleria(0)}
                                    className="w-14 h-14 rounded-full bg-purple-500/20 hover:bg-purple-500/30 border-2 border-purple-400 text-purple-300 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all hover:scale-110 active:scale-95 group"
                                    title="Ver Galería de Fotos"
                                  >
                                    <ImageIcon className="w-6 h-6 group-hover:scale-110 transition-transform" />
                                  </button>
                                  <span className="text-[11px] font-bold text-purple-300 uppercase tracking-wider">
                                    Fotos ({modalGaleria.imagenes.length})
                                  </span>
                                </div>

                                {/* 3. Icono de Factura (Hoja A4 con 'F', verde si existe / gris si no) */}
                                <div className="flex flex-col items-center gap-1.5">
                                  {hasFactura && exp.factura ? (
                                    <button
                                      onClick={() => setModalFactura({ open: true, factura: exp.factura! })}
                                      className={`w-14 h-14 rounded-full border-2 flex items-center justify-center transition-all hover:scale-110 active:scale-95 group ${
                                        facturaPagada
                                          ? 'bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-400 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                                          : 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/60 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                                      }`}
                                      title="Ver Factura A4"
                                    >
                                      <span className="text-2xl font-black font-mono leading-none group-hover:scale-110 transition-transform">
                                        F
                                      </span>
                                    </button>
                                  ) : (
                                    <div
                                      className="w-14 h-14 rounded-full bg-slate-800/40 border-2 border-slate-700 text-slate-500 flex items-center justify-center cursor-not-allowed opacity-60"
                                      title="Factura aún no emitida"
                                    >
                                      <span className="text-2xl font-black font-mono leading-none">F</span>
                                    </div>
                                  )}
                                  <span
                                    className={`text-[11px] font-bold uppercase tracking-wider ${
                                      hasFactura ? 'text-emerald-400' : 'text-slate-500'
                                    }`}
                                  >
                                    {hasFactura ? 'Factura' : 'Sin Factura'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: SOLICITAR NUEVO PRESUPUESTO (VENTANA CON FOTOS + DATOS) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {modalSolicitudPresupuesto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-slate-900 border-2 border-cyan-500 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.9),0_0_35px_rgba(6,182,212,0.35)] overflow-hidden my-auto">
            {/* Header del Modal */}
            <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-emerald-500 flex items-center justify-center text-slate-950 font-black shadow-md">
                  <PlusCircle className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-white uppercase tracking-wider">
                    Solicitar Presupuesto
                  </h3>
                  <p className="text-xs text-cyan-400 font-medium">DM CAR · Presupuesto a medida</p>
                </div>
              </div>
              <button
                onClick={() => setModalSolicitudPresupuesto(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSubmitSolicitudPresupuesto} className="flex-1 flex flex-col overflow-hidden">
              <div className="p-5 sm:p-6 overflow-y-auto flex-1 bg-slate-950/70 space-y-5">
                {/* Datos del Vehículo */}
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-cyan-400 mb-3 flex items-center gap-2">
                    <span>1. Datos del Vehículo</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-bold uppercase text-slate-400 block mb-1">Marca</label>
                      <input
                        type="text"
                        value={formMarca}
                        onChange={(e) => setFormMarca(e.target.value)}
                        placeholder="Ej. Audi"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-semibold focus:border-cyan-400 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase text-slate-400 block mb-1">Modelo</label>
                      <input
                        type="text"
                        value={formModelo}
                        onChange={(e) => setFormModelo(e.target.value)}
                        placeholder="Ej. A4 2.0 TDI"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-semibold focus:border-cyan-400 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase text-slate-400 block mb-1">Matrícula</label>
                      <input
                        type="text"
                        value={formMatricula}
                        onChange={(e) => setFormMatricula(e.target.value.toUpperCase())}
                        placeholder="1234 ABC"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-cyan-300 font-mono font-bold uppercase focus:border-cyan-400 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Subida de Imágenes (Máximo 10) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-black uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                      <span>2. Fotografías de la avería o daño</span>
                    </h4>
                    <span className="text-xs font-bold text-slate-400">
                      {formFotos.length} / 10 imágenes
                    </span>
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept="image/*"
                    multiple
                    className="hidden"
                  />

                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {formFotos.map((foto, idx) => (
                      <div
                        key={idx}
                        className="relative aspect-square rounded-2xl overflow-hidden border-2 border-cyan-500/40 bg-slate-900 group shadow-md"
                      >
                        <img src={foto.preview} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoveFoto(idx)}
                          className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg transition-transform active:scale-90"
                          title="Eliminar foto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}

                    {formFotos.length < 10 && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="aspect-square rounded-2xl border-2 border-dashed border-cyan-500/50 hover:border-cyan-400 bg-slate-900/60 hover:bg-slate-900 text-cyan-400 flex flex-col items-center justify-center gap-1.5 transition-all group active:scale-95 cursor-pointer shadow-inner"
                      >
                        <Upload className="w-6 h-6 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-wider">Añadir Fotos</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Campo Extenso de Reparación Solicitada */}
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-cyan-400 mb-2">
                    3. Descripción de la Reparación o Daño
                  </h4>
                  <textarea
                    rows={4}
                    value={formDescripcion}
                    onChange={(e) => setFormDescripcion(e.target.value)}
                    placeholder="Describe con detalle los trabajos que necesitas realizar en el vehículo (chapa, pintura, mecánica, ruidos extraños, revisión, etc.)..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 text-sm text-white focus:border-cyan-400 outline-none resize-none leading-relaxed shadow-inner"
                    required
                  />
                </div>
              </div>

              {/* Botones del Footer */}
              <div className="p-4 sm:p-5 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalSolicitudPresupuesto(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs sm:text-sm uppercase tracking-wider transition-colors"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={enviandoSolicitud}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 hover:from-cyan-400 hover:via-teal-400 hover:to-emerald-400 text-slate-950 font-black text-xs sm:text-sm shadow-[0_0_20px_rgba(6,182,212,0.5)] border-2 border-white/60 uppercase tracking-wider flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                >
                  {enviandoSolicitud ? <Loader2 className="w-4 h-4 animate-spin text-slate-950" /> : <Send className="w-4 h-4 text-slate-950 stroke-[2.5]" />}
                  <span>{enviandoSolicitud ? 'Enviando...' : 'Solicitar Presupuesto'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: FORMULARIO DE CITA / ENTREGA DE VEHÍCULO (CALENDARIO + HORA) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {modalCita.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border-2 border-cyan-500 rounded-3xl w-full max-w-md max-h-[95vh] flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.9),0_0_30px_rgba(6,182,212,0.3)] overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-cyan-400 font-bold">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-wider">
                    {modalCita.citaExistente ? 'Modificar Fecha de Entrega' : 'Solicitar Fecha de Entrega'}
                  </h3>
                  <p className="text-xs text-cyan-400 font-mono">EXP: {modalCita.expedienteStr}</p>
                </div>
              </div>
              <button
                onClick={() => setModalCita({ open: false, presupuesto: null, expedienteStr: '', citaExistente: null })}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Selector Calendario */}
            <div className="p-4 overflow-y-auto flex-1 bg-slate-950/70 space-y-4">
              <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-lg">
                {/* Cabecera del Mes */}
                <div className="flex items-center justify-between mb-2">
                  <button
                    onClick={handlePrevMonth}
                    className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all active:scale-90"
                  >
                    <ChevronLeft className="w-6 h-6 text-cyan-400" />
                  </button>
                  <span className="font-black text-lg text-white tracking-widest uppercase">
                    {MESES[currentDate.getMonth()]} {currentDate.getFullYear()}
                  </span>
                  <button
                    onClick={handleNextMonth}
                    className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all active:scale-90"
                  >
                    <ChevronRight className="w-6 h-6 text-cyan-400" />
                  </button>
                </div>

                {/* Días de la semana */}
                <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs mb-1 text-slate-400">
                  {DIAS_SEMANA.map((d, i) => (
                    <div key={i} className={d === 'S' ? 'text-blue-400' : d === 'D' ? 'text-rose-500' : ''}>
                      {d}
                    </div>
                  ))}
                </div>

                {/* Grid de días */}
                <div className="grid grid-cols-7 gap-1 text-center">
                  {Array.from({ length: firstDayIndex }).map((_, i) => (
                    <div key={`empty-${i}`} className="h-8" />
                  ))}

                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const dayNum = i + 1
                    const isSelected = selectedDay === dayNum
                    const isToday =
                      dayNum === new Date().getDate() &&
                      currentDate.getMonth() === new Date().getMonth() &&
                      currentDate.getFullYear() === new Date().getFullYear()

                    return (
                      <button
                        key={dayNum}
                        onClick={() => setSelectedDay(dayNum)}
                        className={`h-8 rounded-xl text-sm font-bold flex items-center justify-center transition-all active:scale-90 ${
                          isSelected
                            ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.8)] scale-105 ring-2 ring-white'
                            : isToday
                            ? 'text-cyan-300 font-black border border-cyan-500/40'
                            : 'hover:bg-slate-800 text-slate-300'
                        }`}
                      >
                        {dayNum}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Selector de Hora */}
              <div className="w-full p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-cyan-400" />
                  <span className="font-bold text-sm text-slate-300 uppercase">Hora de Entrega:</span>
                </div>

                <select
                  value={TIME_SLOTS[selectedTimeIndex] || '09:00'}
                  onChange={(e) => {
                    const idx = TIME_SLOTS.indexOf(e.target.value)
                    if (idx !== -1) setSelectedTimeIndex(idx)
                  }}
                  className="bg-slate-950 border border-cyan-500/40 text-cyan-300 font-mono font-black text-base px-3 py-1.5 rounded-xl outline-none focus:border-cyan-400"
                >
                  {TIME_SLOTS.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot} h
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-cyan-950/30 border border-cyan-500/30 rounded-2xl text-xs text-cyan-300 leading-relaxed">
                💡 Al enviar la solicitud, el taller recibirá tu propuesta y te confirmará o propondrá un ajuste si es necesario.
              </div>
            </div>

            {/* Footer de Acciones */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-3">
              <button
                onClick={() => setModalCita({ open: false, presupuesto: null, expedienteStr: '', citaExistente: null })}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider"
              >
                Cancelar
              </button>
              <button
                onClick={handleSolicitarCita}
                disabled={guardandoCita}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-[0_0_15px_rgba(16,185,129,0.5)] border-2 border-emerald-400 uppercase tracking-wider flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
              >
                {guardandoCita ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarClock className="w-4 h-4" />}
                <span>{modalCita.citaExistente ? 'Enviar Modificación' : 'Solicitar Cita'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: VISOR DE PRESUPUESTO (VISTA A4 + ACCIONES) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {modalPresupuesto.open && modalPresupuesto.presupuesto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border-2 border-cyan-500 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Cabecera Modal */}
            <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-cyan-400 font-bold text-xl">
                  P
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    Presupuesto {modalPresupuesto.presupuesto.numero}
                  </h3>
                  <p className="text-xs text-cyan-400 font-mono">
                    EXP: {modalPresupuesto.expedienteStr}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalPresupuesto({ open: false, presupuesto: null, expedienteStr: '' })}
                className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido Visual A4 */}
            <div className="p-6 overflow-y-auto flex-1 bg-slate-950/60 space-y-6">
              <div className="bg-white text-slate-900 p-6 sm:p-8 rounded-2xl shadow-xl space-y-6">
                <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-900">{config?.nombre_empresa || 'DM CAR'}</h2>
                    <p className="text-xs text-slate-500">Taller Mecánico y Chapa</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-400 block uppercase">Presupuesto</span>
                    <span className="text-lg font-black text-cyan-600">{modalPresupuesto.presupuesto.numero}</span>
                    <span className="text-xs text-slate-500 block">
                      {new Date(modalPresupuesto.presupuesto.created_at).toLocaleDateString('es-ES')}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="font-bold text-slate-400 uppercase block">Cliente</span>
                    <p className="font-bold text-slate-900 text-sm">{cliente.nombre}</p>
                    {cliente.dni && <p className="text-slate-600">NIF/CIF: {cliente.dni}</p>}
                    {cliente.telefono && <p className="text-slate-600">Tel: {cliente.telefono}</p>}
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-400 uppercase block">Vehículo</span>
                    <p className="font-bold text-slate-900 text-sm">
                      {vehiculo.marca} {vehiculo.modelo}
                    </p>
                    <p className="text-cyan-700 font-mono font-bold">{vehiculo.matricula}</p>
                  </div>
                </div>

                {/* Conceptos */}
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b-2 border-slate-300 text-slate-700 font-bold uppercase">
                      <th className="pb-2 text-left">Concepto</th>
                      <th className="pb-2 text-center w-12">Cant.</th>
                      <th className="pb-2 text-right w-20">Precio</th>
                      <th className="pb-2 text-right w-20">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800">
                    {(modalPresupuesto.presupuesto.conceptos || []).map((c, i) => (
                      <tr key={i}>
                        <td className="py-2 pr-2">{c.descripcion}</td>
                        <td className="py-2 text-center text-slate-600">{c.cantidad}</td>
                        <td className="py-2 text-right text-slate-600">{c.precio.toFixed(2)} €</td>
                        <td className="py-2 text-right font-semibold">{(c.cantidad * c.precio).toFixed(2)} €</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Totales */}
                <div className="border-t-2 border-slate-300 pt-3 flex justify-end">
                  <div className="text-right space-y-1 w-48">
                    <div className="flex justify-between text-xs text-slate-600">
                      <span>Base:</span>
                      <span className="font-medium">
                        {(
                          (modalPresupuesto.presupuesto.conceptos || []).reduce((acc, c) => acc + c.cantidad * c.precio, 0)
                        ).toFixed(2)}{' '}
                        €
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-600">
                      <span>IVA (21%):</span>
                      <span className="font-medium">
                        {(
                          (modalPresupuesto.presupuesto.conceptos || []).reduce((acc, c) => acc + c.cantidad * c.precio, 0) *
                          0.21
                        ).toFixed(2)}{' '}
                        €
                      </span>
                    </div>
                    <div className="flex justify-between text-base font-black text-slate-900 border-t border-slate-300 pt-1">
                      <span>TOTAL:</span>
                      <span className="text-cyan-700">{modalPresupuesto.presupuesto.total.toFixed(2)} €</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Pie del Modal con Botones de Acción (Descargar / Enviar / Imprimir) */}
            <div className="p-4 sm:p-6 border-t border-slate-800 bg-slate-950 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => handleDownloadPresupuesto(modalPresupuesto.presupuesto!, modalPresupuesto.expedienteStr)}
                className="px-5 py-3 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-sm shadow-[0_0_15px_rgba(6,182,212,0.4)] flex items-center gap-2 transition-all active:scale-95 uppercase tracking-wider"
              >
                <Download className="w-4 h-4" /> Descargar PDF
              </button>

              <button
                onClick={() => handleSendPresupuesto(modalPresupuesto.presupuesto!, modalPresupuesto.expedienteStr)}
                disabled={actionLoading}
                className="px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm border border-slate-700 flex items-center gap-2 transition-all active:scale-95 uppercase tracking-wider disabled:opacity-50"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Enviar por Email
              </button>

              <button
                onClick={() => handlePrintPresupuesto(modalPresupuesto.presupuesto!, modalPresupuesto.expedienteStr)}
                className="px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm border border-slate-700 flex items-center gap-2 transition-all active:scale-95 uppercase tracking-wider"
              >
                <Printer className="w-4 h-4" /> Imprimir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: VISOR DE FACTURA (VISTA A4 + ESTADO DEL ABONO) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {modalFactura.open && modalFactura.factura && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border-2 border-emerald-500 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Cabecera Modal */}
            <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-400 font-bold text-xl">
                  F
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Factura {modalFactura.factura.numero}</h3>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
                      modalFactura.factura.estado_cobro === 'pagada'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : modalFactura.factura.estado_cobro === 'parcial'
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    }`}
                  >
                    {modalFactura.factura.estado_cobro}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setModalFactura({ open: false, factura: null })}
                className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido Visual A4 Factura */}
            <div className="p-6 overflow-y-auto flex-1 bg-slate-950/60 space-y-6">
              <div className="bg-white text-slate-900 p-6 sm:p-8 rounded-2xl shadow-xl space-y-6">
                <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-900">{config?.nombre_empresa || 'DM CAR'}</h2>
                    <p className="text-xs text-slate-500">Factura Oficial</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-400 block uppercase">Nº Factura</span>
                    <span className="text-lg font-black text-emerald-600">{modalFactura.factura.numero}</span>
                    <span className="text-xs text-slate-500 block">
                      {new Date(modalFactura.factura.fecha).toLocaleDateString('es-ES')}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="font-bold text-slate-400 uppercase block">Cliente</span>
                    <p className="font-bold text-slate-900 text-sm">{cliente.nombre}</p>
                    {cliente.dni && <p className="text-slate-600">NIF/CIF: {cliente.dni}</p>}
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-400 uppercase block">Vehículo</span>
                    <p className="font-bold text-slate-900 text-sm">
                      {vehiculo.marca} {vehiculo.modelo}
                    </p>
                    <p className="text-emerald-700 font-mono font-bold">{vehiculo.matricula}</p>
                  </div>
                </div>

                {/* Conceptos */}
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b-2 border-slate-300 text-slate-700 font-bold uppercase">
                      <th className="pb-2 text-left">Concepto</th>
                      <th className="pb-2 text-center w-12">Cant.</th>
                      <th className="pb-2 text-right w-20">Precio</th>
                      <th className="pb-2 text-right w-20">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800">
                    {(modalFactura.factura.conceptos || []).map((c, i) => (
                      <tr key={i}>
                        <td className="py-2 pr-2">{c.descripcion}</td>
                        <td className="py-2 text-center text-slate-600">{c.cantidad}</td>
                        <td className="py-2 text-right text-slate-600">{c.precio.toFixed(2)} €</td>
                        <td className="py-2 text-right font-semibold">{(c.cantidad * c.precio).toFixed(2)} €</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Totales */}
                <div className="border-t-2 border-slate-300 pt-3 flex justify-end">
                  <div className="text-right space-y-1 w-48">
                    <div className="flex justify-between text-base font-black text-slate-900 border-t border-slate-300 pt-1">
                      <span>TOTAL FACTURA:</span>
                      <span className="text-emerald-700">{modalFactura.factura.total.toFixed(2)} €</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Pie del Modal: Botones de Acción + BOTÓN "ESTADO DEL ABONO" */}
            <div className="p-4 sm:p-6 border-t border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={() => handleOpenEstadoAbono(modalFactura.factura!)}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm shadow-[0_0_15px_rgba(245,158,11,0.4)] flex items-center gap-2 transition-all active:scale-95 uppercase tracking-wider"
              >
                <Euro className="w-4 h-4" /> Estado del Abono
              </button>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleDownloadFactura(modalFactura.factura!)}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md flex items-center gap-1.5 transition-all active:scale-95 uppercase tracking-wider"
                >
                  <Download className="w-3.5 h-3.5" /> Descargar PDF
                </button>

                <button
                  onClick={() => handleSendFactura(modalFactura.factura!)}
                  disabled={actionLoading}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 flex items-center gap-1.5 transition-all active:scale-95 uppercase tracking-wider disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Enviar Email
                </button>

                <button
                  onClick={() => handlePrintFactura(modalFactura.factura!)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 flex items-center gap-1.5 transition-all active:scale-95 uppercase tracking-wider"
                >
                  <Printer className="w-3.5 h-3.5" /> Imprimir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: ESTADO DEL ABONO (SOLO LECTURA) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {modalEstadoAbono.open && modalEstadoAbono.factura && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border-2 border-amber-500 rounded-3xl w-full max-w-lg shadow-[0_20px_60px_rgba(0,0,0,0.9),0_0_30px_rgba(245,158,11,0.3)] overflow-hidden">
            <div className="p-5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-400">
                  <Euro className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-wider">
                    Estado del Abono
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">Factura: {modalEstadoAbono.factura.numero}</p>
                </div>
              </div>
              <button
                onClick={() => setModalEstadoAbono({ open: false, factura: null, cobros: [] })}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5 bg-slate-950/80 text-sm">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Factura</span>
                  <span className="text-base font-black text-white tabular-nums">
                    {modalEstadoAbono.factura.total.toFixed(2)} €
                  </span>
                </div>
                <div className="p-3 bg-emerald-950/40 rounded-2xl border border-emerald-500/40">
                  <span className="text-[10px] text-emerald-400 uppercase font-bold block">Abonado</span>
                  <span className="text-base font-black text-emerald-400 tabular-nums">
                    {modalEstadoAbono.factura.total_abonado.toFixed(2)} €
                  </span>
                </div>
                <div className="p-3 bg-rose-950/40 rounded-2xl border border-rose-500/40">
                  <span className="text-[10px] text-rose-400 uppercase font-bold block">Pendiente</span>
                  <span className="text-base font-black text-rose-400 tabular-nums">
                    {Math.max(0, modalEstadoAbono.factura.total - modalEstadoAbono.factura.total_abonado).toFixed(2)} €
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
                <span className="text-xs font-bold text-slate-400 uppercase">Estado Actual</span>
                <span
                  className={`text-xs font-black uppercase px-3 py-1 rounded-full ${
                    modalEstadoAbono.factura.estado_cobro === 'pagada'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                      : modalEstadoAbono.factura.estado_cobro === 'parcial'
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/50'
                  }`}
                >
                  {modalEstadoAbono.factura.estado_cobro === 'pagada'
                    ? 'PAGADA COMPLETA'
                    : modalEstadoAbono.factura.estado_cobro === 'parcial'
                    ? 'PAGO PARCIAL'
                    : 'PENDIENTE DE PAGO'}
                </span>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                  Historial de Pagos Registrados
                </h4>
                {modalEstadoAbono.cobros.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-3 bg-slate-900/50 rounded-xl">
                    No constan abonos registrados aún.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {modalEstadoAbono.cobros.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs"
                      >
                        <div>
                          <span className="font-semibold text-white">
                            {new Date(c.fecha).toLocaleDateString('es-ES', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                          {c.metodo && <span className="text-slate-400 ml-2">({c.metodo})</span>}
                        </div>
                        <span className="font-black text-emerald-400 tabular-nums">+{c.importe.toFixed(2)} €</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setModalEstadoAbono({ open: false, factura: null, cobros: [] })}
                className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: VISOR DE IMÁGENES CON SISTEMA "ME GUSTA" */}
      {/* ───────────────────────────────────────────────────────────── */}
      {modalGaleria.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border-2 border-purple-500 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400 flex items-center justify-center text-purple-400">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white">Galería de Imágenes del Vehículo</h3>
                  <p className="text-xs text-purple-300 font-medium">
                    {modalGaleria.imagenes.length} {modalGaleria.imagenes.length === 1 ? 'fotografía' : 'fotografías'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalGaleria((prev) => ({ ...prev, open: false }))}
                className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-slate-950/80">
              {modalGaleria.imagenes.length === 0 ? (
                <div className="text-center py-16">
                  <ImageIcon className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">No hay imágenes disponibles para este expediente.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                  {modalGaleria.imagenes.map((imgUrl, idx) => {
                    const isLiked = !!likedImages[imgUrl]
                    return (
                      <div
                        key={idx}
                        className="group relative rounded-2xl overflow-hidden border-2 border-slate-800 bg-slate-900 shadow-md transition-all hover:border-purple-500/60"
                      >
                        <div className="aspect-square w-full bg-slate-950 overflow-hidden">
                          <img
                            src={imgUrl}
                            alt={`Foto ${idx + 1}`}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        </div>

                        <div className="p-3 bg-slate-900/90 backdrop-blur-md flex items-center justify-between border-t border-slate-800">
                          <span className="text-xs font-mono text-slate-400 font-semibold">Foto #{idx + 1}</span>

                          <button
                            onClick={() => handleToggleLike(imgUrl)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-90 ${
                              isLiked
                                ? 'bg-rose-500 text-white shadow-[0_0_12px_rgba(244,63,94,0.6)]'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                            }`}
                            title={isLiked ? 'Quitar de favoritos' : 'Me gusta'}
                          >
                            <Heart className={`w-4 h-4 ${isLiked ? 'fill-white text-white' : 'text-slate-400'}`} />
                            <span>{isLiked ? 'Te gusta' : 'Me gusta'}</span>
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setModalGaleria((prev) => ({ ...prev, open: false }))}
                className="px-6 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider transition-colors"
              >
                Cerrar Galería
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
