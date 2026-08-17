import type { TimelineStep } from '../components/TimelineVisual'

export interface ExpedienteData {
  clienteId: string
  vehiculoId: string
  presupuesto?: { id: string, estado: string } | null
  cita?: { id: string, estado: string } | null
  reparacion?: { id: string, estado: string } | null
  factura?: { 
    numero: string, 
    estado_cobro: string, 
    fecha?: string,
    created_at?: string,
    enviado_email_at?: string | null, 
    enviado_whatsapp_at?: string | null 
  } | null
  ultimoCobro?: { created_at: string } | null
}

export interface RoadmapActions {
  onNavigateCliente: (clienteId: string) => void
  onCrearPresupuesto: (vehiculoId: string, clienteId: string) => void
  onVerPresupuesto: (presupuestoId: string) => void
  onAceptarPresupuesto: (presupuestoId: string) => void
  onCrearCita: (vehiculoId: string, clienteId: string, presupuestoId: string) => void
  onVerCita: (citaId: string) => void
  onConfirmarCita: (citaId: string) => void
  onEnviarTaller: (vehiculoId: string, clienteId: string, citaId: string) => void
  onGestionarReparacion: (reparacionId: string) => void
  onFinalizarReparacion: (reparacionId: string) => void
  onGenerarFactura: (vehiculoId: string, clienteId: string, reparacionId?: string) => void
  onVerFactura: (numero: string, mode?: 'view' | 'scrollToSend') => void
}

export function buildRoadmap(data: ExpedienteData, actions: RoadmapActions): TimelineStep[] {
  const steps: TimelineStep[] = []

  // ── 1. RECEPCIÓN ──
  steps.push({
    id: 'recepcion',
    title: 'Recepción',
    color: 'emerald',
    action: { onClick: () => actions.onNavigateCliente(data.clienteId) }
  })

  // ── 2. PRESUPUESTO ──
  const pres = data.presupuesto

  if (!pres) {
    steps.push({
      id: 'presupuesto',
      title: 'Presupuesto Pendiente',
      color: 'amber',
      action: { onClick: () => actions.onCrearPresupuesto(data.vehiculoId, data.clienteId) }
    })
  } else if (pres.estado === 'pendiente') {
    steps.push({
      id: 'presupuesto',
      title: 'Presupuesto Pendiente',
      color: 'amber',
      animatedBorder: true,
      action: { onClick: () => actions.onAceptarPresupuesto(pres.id) }
    })
  } else if (pres.estado === 'aceptado') {
    steps.push({
      id: 'presupuesto',
      title: 'Presupuesto Aceptado',
      color: 'emerald',
      action: { onClick: () => actions.onVerPresupuesto(pres.id) }
    })
  } else {
    steps.push({
      id: 'presupuesto',
      title: 'Presupuesto Rechazado',
      color: 'red',
      action: { onClick: () => actions.onVerPresupuesto(pres.id) }
    })
  }

  // ── 3. CITA ──
  const cita = data.cita
  const presAceptado = pres?.estado === 'aceptado'

  if (!presAceptado) {
    steps.push({ id: 'cita', title: 'Generar Cita', color: 'slate' })
  } else if (!cita) {
    steps.push({
      id: 'cita',
      title: 'Generar Cita',
      color: 'amber',
      animatedBorder: true,
      action: { onClick: () => actions.onCrearCita(data.vehiculoId, data.clienteId, pres.id) }
    })
  } else if (cita.estado === 'confirmada' || cita.estado === 'completada' || data.reparacion) {
    steps.push({
      id: 'cita',
      title: 'Cita Confirmada',
      color: 'emerald',
      action: { onClick: () => actions.onVerCita(cita.id) }
    })
  } else {
    steps.push({
      id: 'cita',
      title: 'Cita Asignada',
      color: 'blue',
      action: { onClick: () => actions.onVerCita(cita.id) }
    })
  }

  // ── 4. REPARACIÓN ──
  const rep = data.reparacion
  const citaAsignada = !!cita

  if (!citaAsignada) {
    steps.push({ id: 'reparacion', title: 'Reparación', color: 'slate' })
  } else if (!rep) {
    if (cita.estado === 'pendiente') {
      steps.push({
        id: 'reparacion',
        title: 'Confirmar Cita',
        color: 'blue',
        animatedBorder: true,
        action: { onClick: () => actions.onConfirmarCita(cita.id) }
      })
    } else {
      steps.push({
        id: 'reparacion',
        title: 'Enviar a Taller',
        color: 'amber',
        animatedBorder: true,
        action: { onClick: () => actions.onEnviarTaller(data.vehiculoId, data.clienteId, cita.id) }
      })
    }
  } else if (rep.estado === 'en_proceso') {
    steps.push({
      id: 'reparacion',
      title: 'Finalizar Reparación',
      color: 'amber',
      animatedBorder: true,
      action: { onClick: () => actions.onFinalizarReparacion(rep.id) }
    })
  } else if (rep.estado === 'finalizado') {
    steps.push({
      id: 'reparacion',
      title: 'Reparación Finalizada',
      color: 'emerald',
      action: { onClick: () => actions.onGestionarReparacion(rep.id) }
    })
  } else {
    steps.push({ id: 'reparacion', title: 'Reparación', color: 'slate' })
  }

  // ── 5. FACTURA ──
  const fac = data.factura
  const repFinalizada = rep?.estado === 'finalizado'

  if (fac) {
    const isEnviada = !!(fac.enviado_email_at || fac.enviado_whatsapp_at)
    steps.push({
      id: 'factura',
      title: isEnviada ? 'Factura Enviada' : 'Factura Generada',
      color: isEnviada ? 'emerald' : 'amber',
      action: { onClick: () => actions.onVerFactura(fac.numero, 'view') }
    })
  } else if (repFinalizada) {
    steps.push({
      id: 'factura',
      title: 'Generar Factura',
      color: 'amber',
      animatedBorder: true,
      action: { onClick: () => actions.onGenerarFactura(data.vehiculoId, data.clienteId, rep?.id) }
    })
  } else {
    steps.push({ id: 'factura', title: 'Factura', color: 'slate' })
  }

  // ── 6. COBRO ──
  if (!fac) {
    steps.push({ id: 'cobro', title: 'Cobro', color: 'slate' })
  } else {
    const isEnviada = !!(fac.enviado_email_at || fac.enviado_whatsapp_at)

    if (!isEnviada) {
      steps.push({
        id: 'cobro',
        title: 'Enviar Factura al Cliente',
        color: 'yellow',
        animatedBorder: true,
        action: { onClick: () => actions.onVerFactura(fac.numero, 'scrollToSend') }
      })
    } else if (fac.estado_cobro === 'pagada') {
      // Abono total -> verde y texto FACTURA ABONADA
      steps.push({
        id: 'cobro',
        title: 'Factura Abonada',
        color: 'emerald',
        action: { onClick: () => actions.onVerFactura(fac.numero) }
      })
    } else if (fac.estado_cobro === 'parcial') {
      // Abono parcial -> azul y texto COBRO PARCIAL
      steps.push({
        id: 'cobro',
        title: 'Cobro Parcial',
        color: 'blue',
        action: { onClick: () => actions.onVerFactura(fac.numero) }
      })
    } else {
      // Factura enviada sin abonar -> rojo FACTURA IMPAGADA
      steps.push({
        id: 'cobro',
        title: 'Factura Impagada',
        color: 'red',
        action: { onClick: () => actions.onVerFactura(fac.numero) }
      })
    }
  }

  return steps
}
