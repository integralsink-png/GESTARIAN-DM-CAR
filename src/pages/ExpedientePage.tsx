import { useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { ArrowLeft, User, Car, Users, UserPlus, Check, Wrench, Sparkles, X, Briefcase } from 'lucide-react'

import { supabase } from '../lib/supabase'
import { PageHeader, Card, ActionMenu, TimelineVisual, MatriculaBadge } from '../components/UI'
import { GlobalImageViewer } from '../components/GlobalImageViewer'
import { fetchExpedienteFotos, saveExpedienteFoto } from '../lib/expedienteService'
import type {
  Vehiculo,
  Cliente,
  Presupuesto,
  Cita,
  Reparacion,
  Factura,
  Usuario
} from '../lib/types'
import { useToast } from '../lib/ToastContext'
import { useGoBack } from '../lib/useGoBack'
import { playSuccessChime } from '../lib/sound'
import { buildRoadmap, type ExpedienteData, type RoadmapActions } from '../lib/roadmapEngine'
import { notificarCambioEstado } from '../services/notificationService'
import { usuarioService } from '../services/usuarioService'

export function ExpedientePage() {
  const { vehiculoId } = useParams<{ vehiculoId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const goBack = useGoBack('/clientes')
  const { showToast } = useToast()

  const [vehiculo, setVehiculo] = useState<Vehiculo | null>(null)
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [presupuesto, setPresupuesto] = useState<Presupuesto | null>(null)
  const [cita, setCita] = useState<Cita | null>(null)
  const [reparacion, setReparacion] = useState<Reparacion | null>(null)
  const [factura, setFactura] = useState<Factura | null>(null)
  const [ultimoCobro, setUltimoCobro] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [expedienteFotos, setExpedienteFotos] = useState<string[]>([])

  // Gestión de Personal Autorizado (Operarios / Mecánicos adjudicados)
  const [listaOperarios, setListaOperarios] = useState<Usuario[]>([])
  const [operariosSeleccionados, setOperariosSeleccionados] = useState<string[]>([])
  const [modalAsignarOpen, setModalAsignarOpen] = useState(false)
  const [guardandoAsignacion, setGuardandoAsignacion] = useState(false)

  useEffect(() => {
    if (viewerOpen && vehiculo) {
      fetchExpedienteFotos(cliente?.id, vehiculo.id, vehiculo.fotos || []).then(setExpedienteFotos)
    }
  }, [viewerOpen, cliente?.id, vehiculo?.id])

  const loadExpediente = async (showLoading = true) => {
    if (!vehiculoId) {
      setLoading(false)
      return
    }

    try {
      if (showLoading) setLoading(true)

      // ------------------------------------------------------------
      // 1. VEHÍCULO
      // ------------------------------------------------------------
      const { data: vData, error: vError } = await supabase
        .from('vehiculos')
        .select('*')
        .eq('id', vehiculoId)
        .maybeSingle()

      if (vError) console.error('Error loading vehiculo:', vError)

      if (!vData) {
        setVehiculo(null)
        setCliente(null)
        setLoading(false)
        return
      }

      setVehiculo(vData)

      // ------------------------------------------------------------
      // 2. CLIENTE
      // ------------------------------------------------------------
      const { data: cData, error: cError } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', vData.cliente_id)
        .maybeSingle()

      if (cError) console.error('Error loading cliente:', cError)

      setCliente(cData)

      // ------------------------------------------------------------
      // 3. ÚLTIMO PRESUPUESTO
      //
      // 3. PRESUPUESTO DEL EXPEDIENTE
      let pData: Presupuesto | null = null
      const targetPresupuestoId = (location.state as any)?.presupuestoId
      if (targetPresupuestoId) {
        const { data, error: pError } = await supabase
          .from('presupuestos')
          .select('*')
          .eq('id', targetPresupuestoId)
          .maybeSingle()
        if (pError) throw pError
        pData = data
      } else {
        const { data, error: pError } = await supabase
          .from('presupuestos')
          .select('*')
          .eq('vehiculo_id', vehiculoId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (pError) throw pError
        pData = data
      }

      setPresupuesto(pData)

      // 4. CITA VINCULADA AL PRESUPUESTO
      let ciData: Cita | null = null
      if (pData?.id) {
        const { data, error: ciError } = await supabase
          .from('citas')
          .select('*')
          .eq('presupuesto_id', pData.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (ciError) throw ciError
        ciData = data
      }

      setCita(ciData)

      // 5. REPARACIÓN VINCULADA A LA CITA
      let rData: Reparacion | null = null
      if (ciData?.id) {
        const { data, error: rError } = await supabase
          .from('reparaciones')
          .select('*')
          .eq('cita_id', ciData.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (rError) throw rError
        rData = data
      }

      setReparacion(rData)

      // 6. FACTURA VINCULADA ESTRICTAMENTE A LA REPARACIÓN DE ESTE EXPEDIENTE
      let fData: Factura | null = null
      if (rData?.id) {
        const { data, error: fError } = await supabase
          .from('facturas')
          .select('*')
          .eq('reparacion_id', rData.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (fError) throw fError
        fData = data
      }

      setFactura(fData)

      // 7. COBROS
      if (fData?.id) {
        const { data: cobrosData } = await supabase
          .from('cobros')
          .select('*')
          .eq('factura_id', fData.id)
          .order('created_at', { ascending: false })
          .limit(1)

        setUltimoCobro(cobrosData?.[0] || null)
      } else {
        setUltimoCobro(null)
      }

      // 8. Cargar empleados/operarios autorizados y sincronizar asignados
      try {
        const users = await usuarioService.obtenerUsuarios()
        setListaOperarios(users.filter(u => u.activo))
        
        // Recuperar asignados del presupuesto o reparación (o backup local)
        const asignadosActuales = pData?.operarios_asignados || rData?.operarios_asignados || []
        const localAsig = localStorage.getItem(`gestarian_asig_exp_${vehiculoId}`)
        if (localAsig) {
          try {
            const parsed = JSON.parse(localAsig)
            setOperariosSeleccionados(Array.from(new Set([...asignadosActuales, ...parsed])))
          } catch (e) {
            setOperariosSeleccionados(asignadosActuales)
          }
        } else {
          setOperariosSeleccionados(asignadosActuales)
        }
      } catch (e) {
        console.warn('Aviso cargando operarios:', e)
      }
    } catch (err: any) {
      console.error('Error cargando expediente:', err)
      showToast('Error al cargar expediente', 'error')
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  // Guardar adjudicación de operarios a la orden de trabajo / expediente
  const guardarAsignacionOperarios = async (nuevosOperarios: string[]) => {
    setGuardandoAsignacion(true)
    try {
      const nombres = listaOperarios
        .filter(op => nuevosOperarios.includes(op.id))
        .map(op => op.nombre)

      // Guardar en localStorage para disponibilidad instantánea
      localStorage.setItem(`gestarian_asig_exp_${vehiculoId}`, JSON.stringify(nuevosOperarios))
      localStorage.setItem(`gestarian_asig_nombres_${vehiculoId}`, JSON.stringify(nombres))

      // Guardar en Supabase si hay presupuesto activo
      if (presupuesto?.id) {
        await supabase.from('presupuestos').update({
          operarios_asignados: nuevosOperarios,
          operarios_nombres: nombres
        }).eq('id', presupuesto.id).catch(() => {})
      }

      // Guardar en Supabase si hay reparación activa
      if (reparacion?.id) {
        await supabase.from('reparaciones').update({
          operarios_asignados: nuevosOperarios,
          operarios_nombres: nombres
        }).eq('id', reparacion.id).catch(() => {})
      }

      setOperariosSeleccionados(nuevosOperarios)
      setModalAsignarOpen(false)
      playSuccessChime()
      showToast('Orden de trabajo adjudicada a los operarios seleccionados ✓', 'success')
    } catch (e: any) {
      showToast('Error al adjudicar orden de trabajo', 'error')
    } finally {
      setGuardandoAsignacion(false)
    }
  }

  useEffect(() => {
    loadExpediente(true)
  }, [vehiculoId, showToast, location.key])

  // ------------------------------------------------------------
  // ESTADOS DE CARGA
  // ------------------------------------------------------------

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400">
        Cargando expediente...
      </div>
    )
  }

  if (!vehiculo || !cliente) {
    return (
      <div className="p-8 text-center text-rose-400">
        Expediente no encontrado.
      </div>
    )
  }

  // ------------------------------------------------------------
  // ROADMAP
  // ------------------------------------------------------------

  const expData: ExpedienteData = {
    clienteId: cliente.id,
    vehiculoId: vehiculo.id,
    presupuesto,
    cita,
    reparacion,
    factura,
    ultimoCobro
  }

  const onRefresh = () => {
    loadExpediente(false)
  }

  const roadmapActions: RoadmapActions = {
    onNavigateCliente: (clienteId) => navigate(`/cliente-admin/${clienteId}`),
    onCrearPresupuesto: (_vehiculoId, _clienteId) => navigate('/presupuestos'),
    onVerPresupuesto: (presupuestoId) => navigate('/presupuestos', { state: { presupuestoId, openForm: false } }),
    onAceptarPresupuesto: async (presupuestoId) => {
      const { error } = await supabase.from('presupuestos').update({ estado: 'aceptado' }).eq('id', presupuestoId)
      if (!error) {
        onRefresh()
      } else {
        showToast('Error al aceptar presupuesto', 'error')
      }
    },
    onCrearCita: (vehiculoId, clienteId, presupuestoId) => navigate('/asignar-cita', { state: { vehiculoId, clienteId, presupuestoId } }),
    onVerCita: (citaId) => navigate('/citas', { state: { citaId } }),
    onConfirmarCita: async (citaId) => {
      const { error } = await supabase.from('citas').update({ estado: 'confirmada' }).eq('id', citaId)
      if (!error) {
        playSuccessChime()
        showToast('CITA CONFIRMADA', 'success')
        onRefresh()
      } else {
        showToast('Error al confirmar cita', 'error')
      }
    },
    onEnviarTaller: async (vehiculoId, clienteId, citaId) => {
      const { data: newRep, error: repError } = await supabase.from('reparaciones').insert({
        vehiculo_id: vehiculoId,
        cliente_id: clienteId,
        cita_id: citaId,
        estado: 'en_proceso'
      }).select().maybeSingle()
      if (!repError) {
        if (citaId) {
          await supabase.from('citas').update({ estado: 'confirmada' }).eq('id', citaId)
        }
        if (newRep?.id) {
          void notificarCambioEstado(newRep.id, 'en_proceso')
        }
        playSuccessChime()
        showToast('ENVIADO A TALLER', 'success')
        onRefresh()
      } else {
        showToast('Error al enviar al taller', 'error')
      }
    },
    onGestionarReparacion: (reparacionId) => navigate('/reparaciones', { state: { reparacionId } }),
    onFinalizarReparacion: async (reparacionId) => {
      const { error } = await supabase.from('reparaciones').update({ estado: 'finalizado' }).eq('id', reparacionId)
      if (!error) {
        void notificarCambioEstado(reparacionId, 'finalizado')
        playSuccessChime()
        showToast('REPARACIÓN FINALIZADA', 'success')
        onRefresh()
      } else {
        showToast('Error al finalizar reparación', 'error')
      }
    },
    onGenerarFactura: (vehiculoId, clienteId, reparacionId) => {
      navigate('/facturas', {
        state: {
          vehiculoId,
          clienteId,
          reparacionId,
          presupuestoId: presupuesto?.id,
          clienteNombre: cliente?.nombre,
          matricula: vehiculo?.matricula,
        },
      })
    },
    onVerFactura: (numero, mode) => navigate('/facturas', { state: { facturaNumero: numero, mode } })
  }

  const steps = buildRoadmap(expData, roadmapActions)



  // ------------------------------------------------------------
  // ACCIONES DISPONIBLES
  // ------------------------------------------------------------

  const actions = []

  if (!presupuesto) {
    actions.push({
      label: 'Crear Presupuesto',
      onClick: () =>
        navigate('/presupuestos', {
          state: {
            vehiculoId,
            clienteId: cliente.id,
          },
        }),
    })
  } else if (presupuesto.estado === 'pendiente') {
    actions.push({
      label: 'Ver Presupuesto',
      onClick: () =>
        navigate('/presupuestos', {
          state: {
            vehiculoId,
            clienteId: cliente.id,
          },
        }),
    })
  } else if (presupuesto.estado === 'aceptado' && !cita) {
    actions.push({
      label: 'Crear Cita',
      onClick: () =>
        navigate('/citas', {
          state: {
            vehiculoId,
            clienteId: cliente.id,
            presupuestoId: presupuesto.id,
          },
        }),
    })
  } else if (
    cita &&
    (
      cita.estado === 'confirmada' ||
      cita.estado === 'pendiente'
    ) &&
    !reparacion
  ) {
    actions.push({
      label: 'Abrir Reparación',
      onClick: () =>
        navigate('/reparaciones', {
          state: {
            vehiculoId,
            clienteId: cliente.id,
          },
        }),
    })
  }

  if (
    reparacion &&
    reparacion.estado === 'en_proceso'
  ) {
    actions.push({
      label: 'Gestionar Reparación',
      onClick: () =>
        navigate('/reparaciones', {
          state: {
            vehiculoId,
            clienteId: cliente.id,
          },
        }),
    })
  } else if (
    reparacion &&
    reparacion.estado === 'finalizado' &&
    !factura
  ) {
    actions.push({
      label: 'Generar Factura',
      variant: 'success' as const,
      onClick: () =>
        navigate('/facturas', {
          state: {
            vehiculoId,
            clienteId: cliente.id,
            reparacionId: reparacion.id,
          },
        }),
    })
  }

  if (factura) {
    actions.push({
      label: 'Ver Factura',
      onClick: () =>
        navigate('/facturas', {
          state: {
            vehiculoId,
            clienteId: cliente.id,
          },
        }),
    })
  }

  // ------------------------------------------------------------
  // RENDER
  // ------------------------------------------------------------

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-24">

      <PageHeader title="EXPEDIENTE">
        <button
          onClick={goBack}
          className="
            w-[60px] h-[60px]
            rounded-2xl
            bg-slate-800/80
            text-white
            border border-white/20
            flex items-center justify-center
            hover:bg-slate-700
            transition-transform
            active:scale-95
            shrink-0
            shadow-[0_0_15px_rgba(255,255,255,0.1)]
          "
          title="Volver"
        >
          <ArrowLeft className="w-7 h-7" />
        </button>
      </PageHeader>

      {/* CABECERA DEL EXPEDIENTE */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">

        <div>
          <h2 className="text-2xl font-bold text-white">
            {vehiculo.marca} {vehiculo.modelo}
          </h2>

          <div className="flex flex-wrap items-center gap-2 text-slate-400 mt-1">

            <MatriculaBadge matricula={vehiculo.matricula} />

            <span className="mx-1">•</span>

            <User className="w-4 h-4" />

            <span>
              {cliente.nombre}
            </span>

          </div>
        </div>

        {actions.length > 0 && (
          <ActionMenu
            actions={actions}
            triggerLabel="ACCIONES DISPONIBLES ▼"
          />
        )}

      </div>

      {/* ROADMAP */}
      <section className="w-full">
        <div className="mb-3">
          <h3 className="text-lg font-bold text-white">
            ROADMAP DEL EXPEDIENTE
          </h3>

          <p className="text-sm text-slate-400">
            Estado actual del flujo de trabajo
          </p>
        </div>

        <div className="w-full overflow-x-auto">
          <TimelineVisual steps={steps} />
        </div>
      </section>

      {/* DATOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* CLIENTE */}
        <Card>
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-emerald-400" />
            Datos del Cliente
          </h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => navigate(`/cliente-admin/${cliente.id}`)}
              className="flex-1 flex flex-col items-center justify-center p-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5 hover:bg-cyan-500/10 transition group"
            >
              <User className="w-6 h-6 text-cyan-400 mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium text-white">Cliente</span>
              <span className="text-xs text-white/40 mt-1">Ver ficha</span>
            </button>

            <button
              onClick={() => navigate(`/vehiculo-admin/${vehiculo.id}`)}
              className="flex-1 flex flex-col items-center justify-center p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 transition group"
            >
              <Car className="w-6 h-6 text-blue-400 mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium text-white">Vehículo</span>
              <span className="text-xs text-white/40 mt-1">Historial y más</span>
            </button>
          </div>

          <div className="space-y-3 text-sm mt-4">

            <div className="flex justify-between gap-4 border-b border-white/10 pb-2">
              <span className="text-slate-400">
                Nombre:
              </span>

              <span className="font-medium text-white text-right">
                {cliente.nombre}
              </span>
            </div>

            {cliente.telefono && (
              <div className="flex justify-between gap-4 border-b border-white/10 pb-2">
                <span className="text-slate-400">
                  Teléfono:
                </span>

                <span className="font-medium text-white text-right">
                  {cliente.telefono}
                </span>
              </div>
            )}

            {cliente.email && (
              <div className="flex justify-between gap-4 border-b border-white/10 pb-2">
                <span className="text-slate-400">
                  Email:
                </span>

                <span className="font-medium text-white text-right break-all">
                  {cliente.email}
                </span>
              </div>
            )}

          </div>
        </Card>

        {/* VEHÍCULO */}
        <Card>
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Car className="w-5 h-5 text-blue-400" />
            Datos del Vehículo
          </h3>

          <div className="space-y-3 text-sm">

            <div className="flex justify-between gap-4 border-b border-white/10 pb-2">
              <span className="text-slate-400">
                Matrícula:
              </span>

              <span className="font-mono font-medium text-white bg-slate-800 px-2 rounded">
                {vehiculo.matricula}
              </span>
            </div>

            <div className="flex justify-between gap-4 border-b border-white/10 pb-2">
              <span className="text-slate-400">
                Marca/Modelo:
              </span>

              <span className="font-medium text-white text-right">
                {vehiculo.marca} {vehiculo.modelo}
              </span>
            </div>

            {vehiculo.vin && (
              <div className="flex justify-between gap-4 border-b border-white/10 pb-2">
                <span className="text-slate-400">
                  VIN:
                </span>

                <span className="font-mono font-medium text-white text-right break-all">
                  {vehiculo.vin}
                </span>
              </div>
            )}

          </div>
        </Card>

      </div>

      {/* ── SECCIÓN DE ADJUDICACIÓN DE ÓRDENES DE TRABAJO A OPERARIOS AUTORIZADOS ── */}
      <Card className="p-6 border-2 border-indigo-500/30 bg-gradient-to-br from-indigo-950/20 via-slate-900 to-bg-800 shadow-xl rounded-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-indigo-500/20 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                PERSONAL AUTORIZADO ADJUDICADO (ORDEN DE TRABAJO)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Mecánicos y operarios encargados de ejecutar y materializar la reparación de este vehículo
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setModalAsignarOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider transition-all active:scale-95 shadow-[0_0_15px_rgba(99,102,241,0.3)] cursor-pointer self-start sm:self-auto shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Adjudicar Operarios</span>
          </button>
        </div>

        {/* Lista de operarios asignados */}
        {operariosSeleccionados.length === 0 ? (
          <div className="p-6 text-center rounded-xl bg-slate-950/40 border border-slate-800">
            <Users className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-300">No hay operarios adjudicados a este expediente todavía</p>
            <p className="text-xs text-slate-500 mt-1">
              Pulsa en <strong>"Adjudicar Operarios"</strong> para pasar la orden de trabajo a uno o varios mecánicos.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {operariosSeleccionados.map((opId) => {
              const op = listaOperarios.find(u => u.id === opId)
              const nombre = op?.nombre || opId
              const rol = op?.roles?.nombre || op?.rol || 'Mecánico'
              const especialidad = op?.especialidades?.nombre || null

              return (
                <div
                  key={opId}
                  className="p-3.5 rounded-xl bg-slate-900/80 border border-indigo-500/40 flex items-center justify-between gap-3 shadow-md"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center font-bold text-sm shrink-0">
                      {nombre.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">{nombre}</p>
                      <p className="text-[11px] text-indigo-300/80 truncate">
                        {rol} {especialidad ? `• ${especialidad}` : ''}
                      </p>
                    </div>
                  </div>

                  <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    En Orden
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* ── MODAL FLOTANTE DE ADJUDICACIÓN DE OPERARIOS ── */}
      {modalAsignarOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border-2 border-indigo-500 rounded-2xl p-6 shadow-[0_0_40px_rgba(99,102,241,0.3)] space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-400" />
                <h3 className="text-lg font-black text-white uppercase tracking-wider">
                  Adjudicar Orden de Trabajo
                </h3>
              </div>
              <button
                onClick={() => setModalAsignarOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Selecciona los operarios o mecánicos autorizados que ejecutarán la reparación para el vehículo{' '}
              <strong className="text-cyan-400">{vehiculo.matricula} ({vehiculo.marca} {vehiculo.modelo})</strong>.
            </p>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {listaOperarios.length === 0 ? (
                <div className="p-4 text-center text-slate-500 text-xs">
                  No hay operarios registrados. Puedes crearlos en <strong>Personal Autorizado</strong>.
                </div>
              ) : (
                listaOperarios.map((op) => {
                  const isChecked = operariosSeleccionados.includes(op.id)

                  return (
                    <div
                      key={op.id}
                      onClick={() => {
                        if (isChecked) {
                          setOperariosSeleccionados(prev => prev.filter(id => id !== op.id))
                        } else {
                          setOperariosSeleccionados(prev => [...prev, op.id])
                        }
                      }}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        isChecked
                          ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${
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
                          Adjudicado
                        </span>
                      )}
                    </div>
                  )
                })
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setModalAsignarOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={guardandoAsignacion}
                onClick={() => guardarAsignacionOperarios(operariosSeleccionados)}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-wider transition-all active:scale-95 shadow cursor-pointer"
              >
                {guardandoAsignacion ? 'Guardando...' : 'Guardar y Asignar Orden'}
              </button>
            </div>
          </div>
        </div>
      )}

      {vehiculo && (
        <GlobalImageViewer
          isOpen={viewerOpen}
          matricula={vehiculo.matricula}
          title={`Vehículo ${vehiculo.matricula}`}
          images={expedienteFotos}
          onAddImage={async (dataUrl) => {
            await saveExpedienteFoto(dataUrl, cliente?.id, vehiculo.id)
            setExpedienteFotos((prev) => [...prev, dataUrl])
          }}
          onDeleteImage={async (index) => {
            setExpedienteFotos((prev) => prev.filter((_, i) => i !== index))
          }}
          onClose={() => setViewerOpen(false)}
        />
      )}
    </div>
  )
}
