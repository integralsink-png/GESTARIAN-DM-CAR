import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, User, Car, Image as ImageIcon } from 'lucide-react'

import { supabase } from '../lib/supabase'
import { PageHeader, Card, ActionMenu, TimelineVisual } from '../components/UI'
import { ImageViewer } from '../components/ImageViewer'
import type {
  Vehiculo,
  Cliente,
  Presupuesto,
  Cita,
  Reparacion,
  Factura,
} from '../lib/types'
import type { TimelineStep } from '../components/TimelineVisual'
import { useToast } from '../lib/ToastContext'
import { useGoBack } from '../lib/useGoBack'

export function ExpedientePage() {
  const { vehiculoId } = useParams<{ vehiculoId: string }>()
  const navigate = useNavigate()
  const goBack = useGoBack('/clientes')
  const { showToast } = useToast()

  const [vehiculo, setVehiculo] = useState<Vehiculo | null>(null)
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [presupuesto, setPresupuesto] = useState<Presupuesto | null>(null)
  const [cita, setCita] = useState<Cita | null>(null)
  const [reparacion, setReparacion] = useState<Reparacion | null>(null)
  const [factura, setFactura] = useState<Factura | null>(null)
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
          .single()

        if (vError) throw vError

        if (cancelled) return

        if (!vData) {
          setVehiculo(null)
          setCliente(null)
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
          .single()

        if (cError) throw cError

        if (cancelled) return

        setCliente(cData)

        // ------------------------------------------------------------
        // 3. ÚLTIMO PRESUPUESTO
        //
        // IMPORTANTE:
        // Esto mantiene temporalmente la estructura actual.
        // En la siguiente fase lo vincularemos al EXPEDIENTE real.
        // ------------------------------------------------------------
        const { data: pData, error: pError } = await supabase
          .from('presupuestos')
          .select('*')
          .eq('vehiculo_id', vehiculoId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (pError) throw pError

        if (cancelled) return

        setPresupuesto(pData)

        // ------------------------------------------------------------
        // 4. ÚLTIMA CITA
        // ------------------------------------------------------------
        const { data: ciData, error: ciError } = await supabase
          .from('citas')
          .select('*')
          .eq('vehiculo_id', vehiculoId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (ciError) throw ciError

        if (cancelled) return

        setCita(ciData)

        // ------------------------------------------------------------
        // 5. ÚLTIMA REPARACIÓN
        // ------------------------------------------------------------
        const { data: rData, error: rError } = await supabase
          .from('reparaciones')
          .select('*')
          .eq('vehiculo_id', vehiculoId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (rError) throw rError

        if (cancelled) return

        setReparacion(rData)

        // ------------------------------------------------------------
        // 6. ÚLTIMA FACTURA
        // ------------------------------------------------------------
        const { data: fData, error: fError } = await supabase
          .from('facturas')
          .select('*')
          .eq('vehiculo_id', vehiculoId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (fError) throw fError

        if (cancelled) return

        setFactura(fData)
      } catch (error) {
        console.error('Error cargando expediente:', error)

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
  }, [vehiculoId, showToast])

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

  const steps: TimelineStep[] = [
    {
      id: 'recepcion',
      title: 'Recepción',
      status: 'completed',
    },
  ]

  // PRESUPUESTO
  if (presupuesto) {
    steps.push({
      id: 'presupuesto',
      title: 'Presupuesto',
      status:
        presupuesto.estado === 'aceptado'
          ? 'completed'
          : 'pending',
    })
  } else {
    steps.push({
      id: 'presupuesto',
      title: 'Presupuesto',
      status: 'future',
    })
  }

  // CITA
  if (cita) {
    steps.push({
      id: 'cita',
      title: 'Cita',
      status:
        cita.estado === 'completada' ||
        cita.estado === 'confirmada'
          ? 'completed'
          : 'pending',
    })
  } else {
    steps.push({
      id: 'cita',
      title: 'Cita',
      status: 'future',
    })
  }

  // REPARACIÓN
  if (reparacion) {
    steps.push({
      id: 'reparacion',
      title: 'Reparación',
      status:
        reparacion.estado === 'finalizado'
          ? 'completed'
          : 'active',
      action: {
        label: 'Imágenes',
        icon: <ImageIcon className="w-3.5 h-3.5" />,
        onClick: () => setViewerOpen(true)
      }
    })
  } else {
    steps.push({
      id: 'reparacion',
      title: 'Reparación',
      status: 'future',
    })
  }

  // FACTURA
  if (factura) {
    steps.push({
      id: 'factura',
      title: 'Factura',
      status:
        factura.estado_cobro === 'pagada'
          ? 'completed'
          : 'pending',
    })
  } else {
    steps.push({
      id: 'factura',
      title: 'Factura',
      status: 'future',
    })
  }

  // COBRO
  if (factura?.estado_cobro === 'pagada') {
    steps.push({
      id: 'cobro',
      title: 'Cobro',
      status: 'completed',
    })
  } else if (
    factura &&
    (
      factura.estado_cobro === 'pendiente' ||
      factura.estado_cobro === 'parcial'
    )
  ) {
    steps.push({
      id: 'cobro',
      title: 'Cobro',
      status: 'active',
    })
  } else {
    steps.push({
      id: 'cobro',
      title: 'Cobro',
      status: 'future',
    })
  }

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

            <Car className="w-4 h-4" />

            <span className="font-mono bg-slate-800 px-2 py-0.5 rounded text-sm text-white border border-slate-700">
              {vehiculo.matricula}
            </span>

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

          <div className="space-y-3 text-sm">

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
