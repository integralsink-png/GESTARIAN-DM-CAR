import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Reparacion, Cliente, Vehiculo, Usuario } from '../lib/types'
import { Wrench, ImageIcon, Trash2, ArrowLeft, UserCheck, Send, X, Check, FileText } from 'lucide-react'
import { getExpediente } from '../lib/utils'
import { PageHeader, EmptyState, MatriculaBadge } from '../components/UI'
import { GlobalImageViewer } from '../components/GlobalImageViewer'
import { fetchExpedienteFotos } from '../lib/expedienteService'
import { ExpedienteFolderIcon, PresupuestoIcon } from '../components/CustomIcons'
import { usuarioService } from '../services/usuarioService'
import { useToast } from '../lib/ToastContext'
import { playSuccessChime } from '../lib/sound'

export function ReparacionesPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const navState = location.state as { citaId?: string; clienteId?: string; vehiculoId?: string; reparacionId?: string } | null

  const { showToast } = useToast()

  const [reparaciones, setReparaciones] = useState<Reparacion[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [vehiculos, setVehiculos] = useState<Record<string, Vehiculo>>({})
  const [citas, setCitas] = useState<any[]>([])
  const [presupuestos, setPresupuestos] = useState<any[]>([])
  const [operarios, setOperarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [viewerMatricula, setViewerMatricula] = useState<string | null>(null)
  const [expedienteFotos, setExpedienteFotos] = useState<string[]>([])
  const [showExpedienteViewer, setShowExpedienteViewer] = useState(false)
  const [expedienteViewerTitle, setExpedienteViewerTitle] = useState("Fotos del Expediente")

  // Modal de Orden de Trabajo para Operario
  const [modalOrdenRep, setModalOrdenRep] = useState<Reparacion | null>(null)
  const [conceptoOrden, setConceptoOrden] = useState('')
  const [operariosOrden, setOperariosOrden] = useState<string[]>([])
  const [enviandoOrden, setEnviandoOrden] = useState(false)
  
  // Modal de Detalle de Tarjeta de Reparación Emergente y Centrada
  const [selectedRepModal, setSelectedRepModal] = useState<Reparacion | null>(null)
  const [permisosUsuario, setPermisosUsuario] = useState<string[]>([])

  const perfil = (typeof window !== 'undefined') ? JSON.parse(localStorage.getItem('gestarian_perfil') || '{}') : {}
  const testEmail = localStorage.getItem('gestarian_test_user') || ''
  const esDev = perfil?.esDeveloper || testEmail.toLowerCase().includes('iclomsinks') || localStorage.getItem('gestarian_dev_mode') === 'true'

  useEffect(() => {
    loadReparaciones()
    loadClientes()
    loadVehiculos()
    loadCitasYPresupuestos()
    loadOperarios()
    loadPermisosActivos()
  }, [])

  async function loadPermisosActivos() {
    try {
      const uId = localStorage.getItem('gestarian_empleado_activo_id')
      if (uId) {
        const perms = await usuarioService.obtenerPermisos(uId)
        setPermisosUsuario(perms)
      }
    } catch (e) {
      console.warn('Aviso cargando permisos:', e)
    }
  }

  async function loadOperarios() {
    try {
      const users = await usuarioService.obtenerUsuarios()
      setOperarios(users.filter(u => u.activo))
    } catch (e) {
      console.warn('Aviso cargando operarios:', e)
    }
  }

  async function loadCitasYPresupuestos() {
    const activeEmail = (localStorage.getItem('gestarian_test_user') || '').toLowerCase().trim()
    const userClientsKey = `gestarian_taller_clientes_${activeEmail || 'default'}`
    const rawUserClients = localStorage.getItem(userClientsKey)
    let userClientsIds: string[] = []
    try {
      if (rawUserClients) userClientsIds = JSON.parse(rawUserClients)
    } catch (e) {}

    const { data: cData } = await supabase.from('citas').select('*')
    if (cData) {
      setCitas(userClientsIds.length > 0 ? cData.filter(c => userClientsIds.includes(c.cliente_id)) : [])
    }
    const { data: pData } = await supabase.from('presupuestos').select('*')
    if (pData) {
      setPresupuestos(userClientsIds.length > 0 ? pData.filter(p => userClientsIds.includes(p.cliente_id)) : [])
    }
  }

  async function loadReparaciones() {
    setLoading(true)
    const [{ data: repsData }, { data: pData }] = await Promise.all([
      supabase.from('reparaciones').select('*').order('created_at', { ascending: false }),
      supabase.from('presupuestos').select('id, cliente_id')
    ])

    const activeEmail = (localStorage.getItem('gestarian_test_user') || '').toLowerCase().trim()
    const userClientsKey = `gestarian_taller_clientes_${activeEmail || 'default'}`
    const rawUserClients = localStorage.getItem(userClientsKey)
    let userClientsIds: string[] = []
    try {
      if (rawUserClients) userClientsIds = JSON.parse(rawUserClients)
    } catch (e) {}

    const tallerPresupuestosIds = (pData ?? [])
      .filter(p => userClientsIds.includes(p.cliente_id))
      .map(p => p.id)

    let lista = repsData ?? []
    if (userClientsIds.length > 0 && tallerPresupuestosIds.length > 0) {
      lista = lista.filter(r => userClientsIds.includes(r.cliente_id))
    } else {
      lista = []
    }

    // Si es un operario (y no modo desarrollador ni jefe de taller), filtrar únicamente las adjudicadas a él
    const empId = localStorage.getItem('gestarian_empleado_activo_id')
    const empNombre = localStorage.getItem('gestarian_empleado_activo_nombre')
    const rolActual = (perfil?.rol || '').toUpperCase()
    const esOperario = (rolActual.includes('OPERARIO') || rolActual.includes('MECANICO')) && !esDev && !rolActual.includes('JEFE') && !rolActual.includes('ADMIN')

    if (esOperario && (empId || empNombre)) {
      lista = lista.filter(r => {
        const porId = empId && r.operarios_asignados && r.operarios_asignados.includes(empId)
        const porNombre = empNombre && r.operarios_nombres && r.operarios_nombres.some((n: string) => n.toLowerCase() === empNombre.toLowerCase())
        let porVehiculo = false
        if (r.vehiculo_id && empId) {
          try {
            const loc = localStorage.getItem(`gestarian_asig_exp_${r.vehiculo_id}`)
            if (loc && JSON.parse(loc).includes(empId)) porVehiculo = true
          } catch (e) {}
        }
        return porId || porNombre || porVehiculo
      })
    }

    setReparaciones(lista)
    setLoading(false)
  }

  async function loadClientes() {
    const { data } = await supabase.from('clientes').select('*').order('nombre')
    const activeEmail = (localStorage.getItem('gestarian_test_user') || '').toLowerCase().trim()
    const userClientsKey = `gestarian_taller_clientes_${activeEmail || 'default'}`
    const rawUserClients = localStorage.getItem(userClientsKey)
    let userClientsIds: string[] = []
    try {
      if (rawUserClients) userClientsIds = JSON.parse(rawUserClients)
    } catch (e) {}

    let filtered = data ?? []
    if (userClientsIds.length > 0) {
      filtered = filtered.filter(c => userClientsIds.includes(c.id))
    } else {
      filtered = []
    }
    setClientes(filtered)
  }

  async function loadVehiculos() {
    const { data } = await supabase.from('vehiculos').select('*')
    const map: Record<string, Vehiculo> = {}
    ;(data ?? []).forEach((v: Vehiculo) => { map[v.id] = v })
    setVehiculos(map)
  }

  function clienteNombre(id: string) {
    return clientes.find((c) => c.id === id)?.nombre ?? '—'
  }

  const [deleteModalRep, setDeleteModalRep] = useState<Reparacion | null>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressTriggered = useRef(false)

  const startLongPress = (rep: Reparacion) => {
    longPressTriggered.current = false
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true
      setDeleteModalRep(rep)
    }, 3000)
  }

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  function getBorderColor(rep: Reparacion) {
    if (rep.estado === 'finalizado') {
      return 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
    }
    if (rep.estado === 'en_proceso') {
      return 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.2)]'
    }
    return 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
  }

  // Abrir modal de orden de trabajo
  const abrirModalOrden = (rep: Reparacion, p: any, v: any) => {
    setModalOrdenRep(rep)
    
    // Concepto por defecto extraído del presupuesto o descripción actual
    const conceptosTxt = p?.conceptos && Array.isArray(p.conceptos)
      ? p.conceptos.map((c: any) => `• ${c.descripcion || ''}`).join('\n')
      : ''
    
    setConceptoOrden(rep.descripcion || conceptosTxt || '')
    
    // Operarios previamente asignados
    const prevAsig = rep.operarios_asignados || []
    if (prevAsig.length === 0 && rep.vehiculo_id) {
      try {
        const localAsig = localStorage.getItem(`gestarian_asig_exp_${rep.vehiculo_id}`)
        if (localAsig) {
          setOperariosOrden(JSON.parse(localAsig))
          return
        }
      } catch (e) {}
    }
    setOperariosOrden(prevAsig)
  }

  // Enviar orden de trabajo al operario autorizado
  const enviarOrdenDeTrabajo = async () => {
    if (!modalOrdenRep) return
    if (operariosOrden.length === 0) {
      showToast('Selecciona al menos un operario para adjudicar la orden', 'warning')
      return
    }

    setEnviandoOrden(true)
    try {
      const rep = modalOrdenRep
      const v = rep.vehiculo_id ? vehiculos[rep.vehiculo_id] : null
      const cli = clientes.find(c => c.id === rep.cliente_id)
      const cita = citas.find(c => c.id === rep.cita_id)
      const p = cita ? presupuestos.find(pr => pr.id === cita.presupuesto_id) : null
      const expNum = p ? getExpediente(p, cli, clientes) : 'S/N'

      const nombres = operarios
        .filter(op => operariosOrden.includes(op.id))
        .map(op => op.nombre)

      // 1. Guardar en la reparación de Supabase
      try {
        await supabase.from('reparaciones').update({
          descripcion: conceptoOrden,
          operarios_asignados: operariosOrden,
          operarios_nombres: nombres
        }).eq('id', rep.id)
      } catch (e) {}

      // 2. Guardar en el presupuesto si existe
      if (p?.id) {
        try {
          await supabase.from('presupuestos').update({
            operarios_asignados: operariosOrden,
            operarios_nombres: nombres
          }).eq('id', p.id)
        } catch (e) {}
      }

      // 3. Crear o actualizar la Orden de Trabajo persistente para cada operario
      const ordenTrabajoPayload = {
        id: `ot-${rep.id}-${Date.now()}`,
        reparacion_id: rep.id,
        expediente_id: expNum,
        presupuesto_id: p?.id || null,
        vehiculo_id: rep.vehiculo_id,
        matricula: v?.matricula || 'S/M',
        marca: v?.marca || '',
        modelo: v?.modelo || '',
        cliente_nombre: cli?.nombre || 'Cliente',
        cliente_telefono: cli?.telefono || '',
        concepto: conceptoOrden,
        operarios_ids: operariosOrden,
        operarios_nombres: nombres,
        estado: 'en_proceso',
        fecha_emision: new Date().toISOString()
      }

      // Persistir ordenes en localStorage para entrega inmediata a los portales de operarios
      try {
        const prevOTs = localStorage.getItem('gestarian_ordenes_trabajo_empleados')
        const otList: any[] = prevOTs ? JSON.parse(prevOTs) : []
        const existIdx = otList.findIndex(o => o.reparacion_id === rep.id)
        if (existIdx >= 0) {
          otList[existIdx] = { ...otList[existIdx], ...ordenTrabajoPayload }
        } else {
          otList.unshift(ordenTrabajoPayload)
        }
        localStorage.setItem('gestarian_ordenes_trabajo_empleados', JSON.stringify(otList))

        // Almacenar también por vehículo para el expediente
        if (rep.vehiculo_id) {
          localStorage.setItem(`gestarian_asig_exp_${rep.vehiculo_id}`, JSON.stringify(operariosOrden))
          localStorage.setItem(`gestarian_asig_nombres_${rep.vehiculo_id}`, JSON.stringify(nombres))
        }
      } catch (e) {}

      // Actualizar estado local de reparaciones
      const updatedRep = {
        ...rep,
        descripcion: conceptoOrden,
        operarios_asignados: operariosOrden,
        operarios_nombres: nombres
      }
      setReparaciones(prev => prev.map(r => r.id === rep.id ? updatedRep : r))

      setModalOrdenRep(null)
      playSuccessChime()
      showToast(`¡Orden de trabajo adjudicada con éxito a ${nombres.join(', ')}!`, 'success')

      // Centrar automágicamente en la pantalla del dispositivo la tarjeta de la reparación
      setTimeout(() => {
        const el = document.getElementById(`tarjeta-rep-${rep.id}`)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          el.classList.add('ring-4', 'ring-indigo-400', 'shadow-[0_0_40px_rgba(99,102,241,0.6)]')
          setTimeout(() => {
            el.classList.remove('ring-4', 'ring-indigo-400', 'shadow-[0_0_40px_rgba(99,102,241,0.6)]')
          }, 3500)
        }
      }, 100)
    } catch (err: any) {
      console.error('Error enviando orden:', err)
      showToast('Error al enviar orden de trabajo', 'error')
    } finally {
      setEnviandoOrden(false)
    }
  }

  return (
    <div>
      <PageHeader title="REPARACIONES">
        <button
          onClick={() => navigate(-1)}
          className="w-[60px] h-[60px] rounded-2xl bg-slate-800/80 text-white border border-white/20 flex items-center justify-center hover:bg-slate-700 transition-transform active:scale-95 shrink-0 shadow-[0_0_15px_rgba(255,255,255,0.1)]"
          title="Volver"
          aria-label="Volver"
        >
          <ArrowLeft className="w-7 h-7" />
        </button>
      </PageHeader>

      {loading ? (
        <div className="text-center py-16 text-slate-500">Cargando...</div>
      ) : reparaciones.length === 0 ? (
        <EmptyState icon={<Wrench className="w-12 h-12" />} title="No hay reparaciones" subtitle="Las reparaciones se inician al confirmar llegada de citas" />
      ) : (
        <div className="space-y-3.5">
          {reparaciones.map((rep) => {
            const v = rep.vehiculo_id ? vehiculos[rep.vehiculo_id] : null
            const cli = clientes.find((c) => c.id === rep.cliente_id)
            const cita = citas.find((c) => c.id === rep.cita_id)
            const p = cita ? presupuestos.find((p) => p.id === cita.presupuesto_id) : null
            const expNum = p ? getExpediente(p, cli, clientes) : 'S/N'
            const borderClass = getBorderColor(rep)

            // Comprobar si el usuario actual es un operario y qué permisos tiene concedidos
            const rolActual = (perfil?.rol || '').toUpperCase()
            const esOperario = (rolActual.includes('OPERARIO') || rolActual.includes('MECANICO')) && !esDev && !rolActual.includes('JEFE') && !rolActual.includes('ADMIN')
            const tienePermisoExpediente = !esOperario || esDev || permisosUsuario.includes('ver_cliente') || permisosUsuario.includes('ver_vehiculos')
            const tienePermisoPresupuesto = !esOperario || esDev || permisosUsuario.includes('ver_presupuesto')
            const tienePermisoOrden = !esOperario || esDev || permisosUsuario.includes('rellenar_conceptos_presupuesto') || permisosUsuario.includes('enviar_a_reparaciones')

            return (
              <div
                key={rep.id}
                id={`tarjeta-rep-${rep.id}`}
                onClick={() => {
                  if (!longPressTriggered.current) {
                    setSelectedRepModal(rep)
                  }
                }}
                onMouseDown={() => startLongPress(rep)}
                onMouseUp={cancelLongPress}
                onMouseLeave={cancelLongPress}
                onTouchStart={() => startLongPress(rep)}
                onTouchEnd={cancelLongPress}
                className={`relative p-4 sm:p-5 rounded-2xl border-[3px] bg-bg-800/90 transition-all select-none cursor-pointer hover:scale-[1.01] hover:shadow-2xl ${borderClass}`}
              >
                {/* LÍNEA 1: Nombre del cliente (x1.5 tamaño, sin rectángulo de estado) */}
                <div className="flex items-center justify-between">
                  <h2 className="text-xl sm:text-2xl font-black text-white capitalize tracking-wide truncate">
                    {clienteNombre(rep.cliente_id).toLowerCase()}
                  </h2>
                </div>

                {/* LÍNEA 2: Marca y Modelo a la izquierda, Matrícula a la derecha */}
                <div className="flex items-center justify-between gap-3 mt-2">
                  <div className="font-semibold text-slate-300 text-sm sm:text-base uppercase truncate flex-1 min-w-0">
                    {v ? (
                      <span>
                        {v.marca || ''} {v.modelo || ''}
                      </span>
                    ) : (
                      <span className="text-slate-500 italic">Sin datos vehículo</span>
                    )}
                  </div>

                  {v?.matricula && (
                    <div className="shrink-0 scale-100 sm:scale-105 origin-right">
                      <MatriculaBadge matricula={v.matricula} size="md" />
                    </div>
                  )}
                </div>

                {/* Personal Autorizado Adjudicado a la Orden de Trabajo */}
                {(() => {
                  const asigIds: string[] = rep.operarios_asignados || []
                  let nombres = rep.operarios_nombres || []
                  if (nombres.length === 0 && rep.vehiculo_id) {
                    try {
                      const localNombres = localStorage.getItem(`gestarian_asig_nombres_${rep.vehiculo_id}`)
                      if (localNombres) nombres = JSON.parse(localNombres)
                    } catch (e) {}
                  }

                  if (nombres.length === 0 && asigIds.length === 0) return null

                  return (
                    <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-2 border-t border-white/5">
                      <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider">
                        🛠️ Adjudicado a:
                      </span>
                      {nombres.length > 0 ? (
                        nombres.map((nom: string, idx: number) => (
                          <span
                            key={idx}
                            className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-indigo-500/20 text-indigo-200 border border-indigo-500/30"
                          >
                            {nom}
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-indigo-500/20 text-indigo-200 border border-indigo-500/30">
                          {asigIds.length} operario(s)
                        </span>
                      )}
                    </div>
                  )
                })()}

                {/* LÍNEA 3: Número de expediente flotante y botones de acción según permisos */}
                <div className="flex items-center justify-between gap-3 mt-3 pt-2.5 border-t border-white/10">
                  {/* Número de Expediente flotante (x1.5) */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation()
                      if (tienePermisoExpediente) {
                        navigate('/expedientes', { state: { search: v?.matricula || expNum } })
                      }
                    }}
                    className={`shrink-0 ${tienePermisoExpediente ? 'cursor-pointer hover:brightness-125 transition-all' : 'cursor-default'}`}
                    title={tienePermisoExpediente ? 'Ver Expediente' : `Expediente ${expNum}`}
                  >
                    <span className="text-lg sm:text-xl font-mono text-cyan-400 font-black tracking-wide">
                      {expNum}
                    </span>
                  </div>

                  {/* Iconos de acción: Si es modo operario estricto, únicamente aparece el icono de imágenes */}
                  <div className="flex-1 flex items-center justify-around sm:justify-end sm:gap-6 ml-2 sm:ml-4" onClick={(e) => e.stopPropagation()}>
                    {/* 1. Icono flotante Expediente (solo si tiene permiso) */}
                    {tienePermisoExpediente && (
                      <button
                        onClick={() => navigate('/expedientes', { state: { search: v?.matricula || expNum } })}
                        className="text-yellow-500 hover:text-yellow-400 transition-all hover:scale-125 active:scale-95 bg-transparent border-0 p-0 outline-none flex items-center justify-center drop-shadow-[0_0_8px_rgba(234,179,8,0.5)] cursor-pointer"
                        title="Expediente"
                        aria-label="Expediente"
                      >
                        <ExpedienteFolderIcon className="w-10 h-10 sm:w-11 sm:h-11" />
                      </button>
                    )}

                    {/* 2. Icono flotante Presupuesto (solo si tiene permiso) */}
                    {tienePermisoPresupuesto && (
                      <button
                        onClick={() => {
                          if (p) {
                            navigate('/presupuestos', { state: { presupuestoId: p.id } })
                          } else {
                            navigate('/presupuestos', { state: { clienteId: rep.cliente_id, openForm: false } })
                          }
                        }}
                        className="text-cyan-400 hover:text-cyan-300 transition-all hover:scale-125 active:scale-95 bg-transparent border-0 p-0 outline-none flex items-center justify-center drop-shadow-[0_0_8px_rgba(6,182,212,0.5)] cursor-pointer"
                        title={p ? "Ver Presupuesto del Expediente" : "Presupuestos del cliente"}
                        aria-label="Presupuestos"
                      >
                        <PresupuestoIcon className="w-10 h-10 sm:w-11 sm:h-11" />
                      </button>
                    )}

                    {/* 3. Icono flotante Orden de Trabajo (solo si tiene permiso) */}
                    {tienePermisoOrden && (
                      <button
                        onClick={() => abrirModalOrden(rep, p, v)}
                        className="text-indigo-400 hover:text-indigo-300 transition-all hover:scale-125 active:scale-95 bg-transparent border-0 p-0 outline-none flex items-center justify-center drop-shadow-[0_0_8px_rgba(99,102,241,0.6)] cursor-pointer"
                        title="Asignar Operario y Orden de Trabajo"
                        aria-label="Asignar Operario"
                      >
                        <UserCheck className="w-10 h-10 sm:w-11 sm:h-11 stroke-[1.8]" />
                      </button>
                    )}

                    {/* 4. Icono flotante Imágenes (Siempre visible para el operario para añadir/capturar fotos que se guardan automáticamente) */}
                    <button
                      onClick={async () => {
                        const fotos = await fetchExpedienteFotos(rep.cliente_id, rep.vehiculo_id, rep.fotos || [], {
                          reparacionId: rep.id,
                          citaId: rep.cita_id,
                          presupuestoId: p?.id
                        })
                        setExpedienteFotos(fotos)
                        setViewerMatricula(v?.matricula || null)
                        setExpedienteViewerTitle(`Reparación ${expNum}`)
                        setShowExpedienteViewer(true)
                      }}
                      className="text-violet-400 hover:text-violet-300 transition-all hover:scale-125 active:scale-95 bg-transparent border-0 p-0 outline-none flex items-center justify-center drop-shadow-[0_0_12px_rgba(167,139,250,0.7)] cursor-pointer"
                      title="Visor de Imágenes y Captura de Fotos de la Reparación"
                      aria-label="Imágenes de Reparación"
                    >
                      <ImageIcon className="w-11 h-11 sm:w-12 sm:h-12 stroke-[1.8]" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── MODAL DE ORDEN DE TRABAJO Y ASIGNACIÓN DE OPERARIO ── */}
      {modalOrdenRep && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-slate-900 border-2 border-indigo-500 rounded-3xl p-6 sm:p-7 shadow-[0_0_50px_rgba(99,102,241,0.35)] space-y-5 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-indigo-500/20 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-wider">
                    Generar y Enviar Orden de Trabajo
                  </h3>
                  <p className="text-xs text-indigo-300">
                    Pasa el parte de reparación al personal autorizado del taller
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalOrdenRep(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {/* Resumen del Expediente y Vehículo */}
              {(() => {
                const v = modalOrdenRep.vehiculo_id ? vehiculos[modalOrdenRep.vehiculo_id] : null
                const cli = clientes.find(c => c.id === modalOrdenRep.cliente_id)
                const cita = citas.find(c => c.id === modalOrdenRep.cita_id)
                const p = cita ? presupuestos.find(pr => pr.id === cita.presupuesto_id) : null
                const expNum = p ? getExpediente(p, cli, clientes) : 'S/N'

                return (
                  <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-400">Expediente Nº:</span>
                      <span className="font-mono text-cyan-400 font-black text-sm">{expNum}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-400">Cliente:</span>
                      <span className="text-white font-bold text-xs">{cli?.nombre || '—'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-400">Vehículo:</span>
                      <span className="text-white font-bold text-xs">
                        {v ? `${v.marca || ''} ${v.modelo || ''} (${v.matricula})` : '—'}
                      </span>
                    </div>
                  </div>
                )
              })()}

              {/* Campo: Concepto de la Reparación / Instrucciones de Trabajo */}
              <div>
                <label className="block text-xs font-black text-indigo-300 uppercase tracking-wider mb-1.5">
                  Concepto e Instrucciones de Trabajo *
                </label>
                <textarea
                  value={conceptoOrden}
                  onChange={(e) => setConceptoOrden(e.target.value)}
                  rows={4}
                  placeholder="Escribe el concepto, tareas a ejecutar, piezas a sustituir o instrucciones técnicas para el operario..."
                  className="w-full bg-slate-950 border border-indigo-500/40 rounded-2xl p-3.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:border-indigo-400 focus:outline-none leading-relaxed"
                />
              </div>

              {/* Selector: Asignar Operario(s) */}
              <div>
                <label className="block text-xs font-black text-indigo-300 uppercase tracking-wider mb-2">
                  Adjudicar a Personal Autorizado (Mecánicos / Operarios) *
                </label>
                {operarios.length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center text-xs text-slate-400">
                    No hay operarios registrados en el sistema. Puedes crearlos en <strong>Personal Autorizado</strong>.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {operarios.map((op) => {
                      const isChecked = operariosOrden.includes(op.id)
                      return (
                        <div
                          key={op.id}
                          onClick={() => {
                            if (isChecked) {
                              setOperariosOrden(prev => prev.filter(id => id !== op.id))
                            } else {
                              setOperariosOrden(prev => [...prev, op.id])
                            }
                          }}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                            isChecked
                              ? 'bg-indigo-600/30 border-indigo-400 text-white shadow-sm'
                              : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all ${
                              isChecked ? 'bg-indigo-500 border-indigo-400 text-white' : 'border-slate-700 bg-slate-900'
                            }`}>
                              {isChecked && <Check className="w-3.5 h-3.5" />}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-white">{op.nombre}</p>
                              <p className="text-[10px] text-slate-400">
                                {op.roles?.nombre || op.rol || 'Operario'} {op.especialidades?.nombre ? `• ${op.especialidades.nombre}` : ''}
                              </p>
                            </div>
                          </div>

                          {isChecked && (
                            <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider">
                              Asignado
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Botones de acción del modal */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setModalOrdenRep(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={enviandoOrden || operariosOrden.length === 0}
                onClick={enviarOrdenDeTrabajo}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>{enviandoOrden ? 'Enviando Orden...' : 'Enviar Orden de Trabajo'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal flotante de confirmación tras pulsación larga de 3 segundos */}
      {deleteModalRep && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-bg-900 border-2 border-red-500 rounded-2xl p-6 shadow-[0_0_30px_rgba(239,68,68,0.4)] text-center space-y-4">
            <Trash2 className="w-12 h-12 text-red-500 mx-auto stroke-[1.5]" />
            <h3 className="text-xl font-bold text-white">¿Eliminar reparación?</h3>
            <p className="text-sm text-slate-300">
              Esta acción eliminará la reparación de <strong>{clienteNombre(deleteModalRep.cliente_id)}</strong>.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeleteModalRep(null)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold border border-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  const id = deleteModalRep.id
                  setDeleteModalRep(null)
                  await supabase.from('reparaciones').delete().eq('id', id)
                  loadReparaciones()
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold shadow-lg shadow-red-600/30 transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL EMERGENTE CENTRADO: TARJETA DE REPARACIÓN EN VENTANA POPUP CON BOTÓN VOLVER ── */}
      {selectedRepModal && (() => {
        const rep = selectedRepModal
        const v = rep.vehiculo_id ? vehiculos[rep.vehiculo_id] : null
        const cli = clientes.find((c) => c.id === rep.cliente_id)
        const cita = citas.find((c) => c.id === rep.cita_id)
        const p = cita ? presupuestos.find((p) => p.id === cita.presupuesto_id) : null
        const expNum = p ? getExpediente(p, cli, clientes) : 'S/N'
        const borderClass = getBorderColor(rep)

        const tienePermisoExpediente = esDev || permisosUsuario.length === 0 || permisosUsuario.includes('expedientes') || permisosUsuario.includes('ADMIN') || permisosUsuario.includes('ALL')
        const tienePermisoPresupuesto = esDev || permisosUsuario.length === 0 || permisosUsuario.includes('presupuestos') || permisosUsuario.includes('ADMIN') || permisosUsuario.includes('ALL')
        const tienePermisoOrden = esDev || permisosUsuario.length === 0 || permisosUsuario.includes('reparaciones') || permisosUsuario.includes('ADMIN') || permisosUsuario.includes('ALL')

        return (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-xl bg-slate-900 border-2 border-cyan-500 rounded-3xl p-6 sm:p-7 shadow-[0_0_50px_rgba(6,182,212,0.4)] space-y-5 max-h-[90vh] flex flex-col">
              {/* Cabecera del modal con botón VOLVER */}
              <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                    <Wrench className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-wider">
                      Detalle de Reparación
                    </h3>
                    <p className="text-xs text-cyan-300 font-mono">Expediente {expNum}</p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedRepModal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 border border-slate-700 transition-all active:scale-95 shadow cursor-pointer"
                  title="Volver a la lista"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Volver</span>
                </button>
              </div>

              {/* Contenido centrado de la tarjeta */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                <div className={`p-5 rounded-2xl border-[3px] bg-bg-800/95 select-none ${borderClass} space-y-4`}>
                  {/* Cliente */}
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Cliente Titular</span>
                    <h2 className="text-2xl font-black text-white capitalize tracking-wide">
                      {clienteNombre(rep.cliente_id).toLowerCase()}
                    </h2>
                  </div>

                  {/* Vehículo y Matrícula */}
                  <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Vehículo</span>
                      <span className="font-bold text-white text-sm sm:text-base uppercase">
                        {v ? `${v.marca || ''} ${v.modelo || ''}` : 'Sin datos vehículo'}
                      </span>
                    </div>
                    {v?.matricula && (
                      <div className="shrink-0 scale-105">
                        <MatriculaBadge matricula={v.matricula} size="md" />
                      </div>
                    )}
                  </div>

                  {/* Concepto / Instrucciones */}
                  {rep.descripcion && (
                    <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-xs text-slate-200">
                      <span className="text-[11px] font-black text-indigo-300 uppercase tracking-wider block mb-1">
                        🛠️ Concepto e Instrucciones:
                      </span>
                      <p className="whitespace-pre-line leading-relaxed">{rep.descripcion}</p>
                    </div>
                  )}

                  {/* Personal Autorizado Adjudicado */}
                  {(() => {
                    const asigIds: string[] = rep.operarios_asignados || []
                    let nombres = rep.operarios_nombres || []
                    if (nombres.length === 0 && rep.vehiculo_id) {
                      try {
                        const localNombres = localStorage.getItem(`gestarian_asig_nombres_${rep.vehiculo_id}`)
                        if (localNombres) nombres = JSON.parse(localNombres)
                      } catch (e) {}
                    }

                    return (
                      <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-white/10">
                        <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
                          Operarios Adjudicados:
                        </span>
                        {nombres.length > 0 ? (
                          nombres.map((nom: string, idx: number) => (
                            <span
                              key={idx}
                              className="text-xs px-2.5 py-1 rounded-full font-bold bg-indigo-500/20 text-indigo-200 border border-indigo-500/30"
                            >
                              {nom}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400 italic">
                            {asigIds.length > 0 ? `${asigIds.length} operario(s)` : 'Sin operario asignado'}
                          </span>
                        )}
                      </div>
                    )
                  })()}

                  {/* Acciones flotantes integradas según permisos */}
                  <div className="flex items-center justify-around gap-2 pt-3 border-t border-white/10">
                    {/* 1. Expediente */}
                    {tienePermisoExpediente && (
                      <button
                        onClick={() => {
                          setSelectedRepModal(null)
                          navigate('/expedientes', { state: { search: v?.matricula || expNum } })
                        }}
                        className="text-yellow-500 hover:text-yellow-400 transition-all hover:scale-125 active:scale-95 bg-transparent border-0 p-0 outline-none flex items-center justify-center drop-shadow-[0_0_8px_rgba(234,179,8,0.5)] cursor-pointer"
                        title="Abrir Expediente"
                      >
                        <ExpedienteFolderIcon className="w-10 h-10 sm:w-11 sm:h-11" />
                      </button>
                    )}

                    {/* 2. Presupuesto */}
                    {tienePermisoPresupuesto && (
                      <button
                        onClick={() => {
                          setSelectedRepModal(null)
                          navigate('/presupuestos', { state: { presupuestoId: p?.id, matricula: v?.matricula } })
                        }}
                        className="text-cyan-400 hover:text-cyan-300 transition-all hover:scale-125 active:scale-95 bg-transparent border-0 p-0 outline-none flex items-center justify-center drop-shadow-[0_0_8px_rgba(6,182,212,0.5)] cursor-pointer"
                        title="Presupuesto"
                      >
                        <PresupuestoIcon className="w-10 h-10 sm:w-11 sm:h-11" />
                      </button>
                    )}

                    {/* 3. Orden de Trabajo */}
                    {tienePermisoOrden && (
                      <button
                        onClick={() => {
                          setSelectedRepModal(null)
                          abrirModalOrden(rep, p, v)
                        }}
                        className="text-indigo-400 hover:text-indigo-300 transition-all hover:scale-125 active:scale-95 bg-transparent border-0 p-0 outline-none flex items-center justify-center drop-shadow-[0_0_8px_rgba(99,102,241,0.6)] cursor-pointer"
                        title="Asignar Operario y Orden de Trabajo"
                      >
                        <UserCheck className="w-10 h-10 sm:w-11 sm:h-11 stroke-[1.8]" />
                      </button>
                    )}

                    {/* 4. Galería Imágenes */}
                    <button
                      onClick={async () => {
                        const fotos = await fetchExpedienteFotos(rep.cliente_id, rep.vehiculo_id, rep.fotos || [], {
                          reparacionId: rep.id,
                          citaId: rep.cita_id,
                          presupuestoId: p?.id
                        })
                        setExpedienteFotos(fotos)
                        setViewerMatricula(v?.matricula || null)
                        setExpedienteViewerTitle(`Reparación ${expNum}`)
                        setShowExpedienteViewer(true)
                      }}
                      className="text-violet-400 hover:text-violet-300 transition-all hover:scale-125 active:scale-95 bg-transparent border-0 p-0 outline-none flex items-center justify-center drop-shadow-[0_0_12px_rgba(167,139,250,0.7)] cursor-pointer"
                      title="Ver Imágenes y Capturar Fotos"
                    >
                      <ImageIcon className="w-11 h-11 sm:w-12 sm:h-12 stroke-[1.8]" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Visor Global único de Imágenes con Autoguardado */}
      <GlobalImageViewer
        isOpen={showExpedienteViewer || !!viewerMatricula}
        onClose={() => {
          setShowExpedienteViewer(false)
          setViewerMatricula(null)
        }}
        matricula={viewerMatricula || undefined}
        images={expedienteFotos}
        onAddImage={async (dataUrl) => {
          setExpedienteFotos((prev) => [...prev, dataUrl])
          showToast('Imagen guardada automáticamente en la reparación', 'success')
        }}
        onDeleteImage={async (index) => {
          setExpedienteFotos((prev) => prev.filter((_, i) => i !== index))
        }}
        title={expedienteViewerTitle}
      />
    </div>
  )
}
