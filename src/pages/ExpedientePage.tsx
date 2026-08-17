import { useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { ArrowLeft, User, Car } from 'lucide-react'

import { supabase } from '../lib/supabase'
import { PageHeader, Card, ActionMenu, TimelineVisual, MatriculaBadge } from '../components/UI'
import { ImageViewer } from '../components/ImageViewer'
import type {
  Vehiculo,
  Cliente,
  Presupuesto,
  Cita,
  Reparacion,
  Factura,
} from '../lib/types'
import { useToast } from '../lib/ToastContext'
import { useGoBack } from '../lib/useGoBack'
import { playSuccessChime } from '../lib/sound'
import { buildRoadmap, type ExpedienteData, type RoadmapActions } from '../lib/roadmapEngine'

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

  useEffect(() => {
    let cancelled = false

    async function loadExpediente() {
      if (!vehiculoId) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)

        // ------------------------------------------------------------
        // 1. VEHÍCULO
        // ------------------------------------------------------------
        const { data: vData, error: vError } = await supabase
          .from('vehiculos')
          .select('*')
          .eq('id', vehiculoId)
          .maybeSingle()

        if (vError) console.error('Error loading vehiculo:', vError)

        if (cancelled) return

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

        if (cancelled) return

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

        if (cancelled) return
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

        if (cancelled) return
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

        if (cancelled) return
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

        if (cancelled) return
        if (fData) {
          fData = {
            ...fData,
            enviado_email_at: fData.enviado_email_at || localStorage.getItem(`factura_${fData.id}_email_at`),
            enviado_whatsapp_at: fData.enviado_whatsapp_at || localStorage.getItem(`factura_${fData.id}_wa_at`)
          }
        }
        setFactura(fData)

        // ------------------------------------------------------------
        // 7. ÚLTIMO COBRO DE LA FACTURA
        // ------------------------------------------------------------
        if (fData) {
          const { data: cData } = await supabase
            .from('cobros')
            .select('*')
            .eq('factura_id', fData.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
            
          if (!cancelled) setUltimoCobro(cData)
        }

      } catch (err: any) {
        console.error('Error cargando expediente:', err)

        if (!cancelled) {
          showToast('Error cargando expediente', 'error')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadExpediente()

    return () => {
      cancelled = true
    }
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
    window.location.reload()
  }

  const roadmapActions: RoadmapActions = {
    onNavigateCliente: (clienteId) => navigate(`/cliente-admin/${clienteId}`),
    onCrearPresupuesto: (_vehiculoId, _clienteId) => navigate('/presupuestos'),
    onVerPresupuesto: (presupuestoId) => navigate('/presupuestos', { state: { presupuestoId, openForm: false } }),
    onAceptarPresupuesto: async (presupuestoId) => {
      const { error } = await supabase.from('presupuestos').update({ estado: 'aceptado' }).eq('id', presupuestoId)
      if (!error) {
        showToast('PRESUPUESTO ACEPTADO', 'success')
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
      const { error: repError } = await supabase.from('reparaciones').insert({
        vehiculo_id: vehiculoId,
        cliente_id: clienteId,
        cita_id: citaId,
        estado: 'en_proceso'
      })
      if (!repError) {
        if (citaId) {
          await supabase.from('citas').update({ estado: 'confirmada' }).eq('id', citaId)
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

      <ImageViewer
        open={viewerOpen}
        matricula={vehiculo.matricula}
        onClose={() => setViewerOpen(false)}
      />
    </div>
  )
}
