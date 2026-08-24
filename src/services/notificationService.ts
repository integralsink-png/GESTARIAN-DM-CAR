import { supabase } from '../lib/supabase'
import { enviarEmail } from './communicationService'
import { enviarMensajeWhatsApp } from './whatsappBusinessService'

export interface InvitacionResult {
  success: boolean
  url?: string
  error?: string
}

/**
 * Envía la invitación al portal del cliente por los canales indicados (solo Email activo).
 */
export async function enviarInvitacion(
  clienteId: string,
  token?: string | null,
  canales: ('email' | 'whatsapp')[] = ['email']
): Promise<InvitacionResult> {
  try {
    const { data: cliente, error: cliErr } = await supabase
      .from('clientes')
      .select('id, nombre, email, telefono')
      .eq('id', clienteId)
      .maybeSingle()

    if (cliErr || !cliente) {
      console.error('[NotificationService] Cliente no encontrado:', cliErr)
      return { success: false, error: 'Cliente no encontrado.' }
    }

    // 1. Obtener o crear token de invitación si no se suministró
    let validToken = token
    if (!validToken) {
      const { data: existingInv } = await supabase
        .from('cliente_invitaciones')
        .select('token')
        .eq('cliente_id', clienteId)
        .maybeSingle()

      if (existingInv?.token) {
        validToken = existingInv.token
      } else {
        validToken = 'inv_' + crypto.randomUUID().slice(0, 8)
        await supabase.from('cliente_invitaciones').insert({
          cliente_id: clienteId,
          email: cliente.email || 'cliente@demo.com',
          token: validToken
        })
      }
    }

    const origin = window.location.origin || 'http://localhost:5174'
    const portalUrl = `${origin}/cliente/${validToken}`
    const asunto = 'Invitación para seguir la reparación de tu vehículo en DM CAR'
    const cuerpo = `Hola ${cliente.nombre},\n\nTu taller te ha invitado a seguir el estado de tu vehículo en tiempo real.\n\nPuedes acceder al portal en el siguiente enlace:\n${portalUrl}\n\nGracias por confiar en nosotros.`

    // 1. Canal Email (Activo)
    if (canales.includes('email') && cliente.email) {
      console.log(`📧 [Notificación Invitación] Enviando email a ${cliente.email}`)
      await enviarEmail(cliente.email, asunto, cuerpo)
    }

    // 2. Canal WhatsApp (Preparado pero desactivado para pruebas)
    if (canales.includes('whatsapp') && cliente.telefono) {
      console.log(`💬 [WhatsApp preparado (desactivado)] para ${cliente.telefono}: ${portalUrl}`)
    }

    // Actualizar estado en cliente_invitaciones si existe
    await supabase
      .from('cliente_invitaciones')
      .update({ enviado: true })
      .eq('token', validToken)

    return { success: true, url: portalUrl }
  } catch (error: any) {
    console.error('[NotificationService.enviarInvitacion Error]:', error)
    return { success: false, error: error?.message || 'Error al enviar invitación.' }
  }
}

/**
 * Notifica al taller cuando un cliente solicita un nuevo presupuesto con datos del vehículo y fotos.
 */
export async function notificarSolicitudPresupuestoAlTaller({
  clienteNombre,
  marca,
  modelo,
  matricula,
  descripcion,
  totalFotos
}: {
  clienteNombre: string
  marca?: string
  modelo?: string
  matricula?: string
  descripcion: string
  totalFotos: number
}): Promise<{ success: boolean; error?: string }> {
  try {
    let emailJefe = 'iclomsinks@gmail.com'
    try {
      const { data: jefeUser } = await supabase
        .from('usuarios')
        .select('email, rol, roles:rol_id (nombre)')
        .or('rol.ilike.%jefe%,rol.ilike.%taller_pro%,es_developer.eq.true')
        .eq('activo', true)
        .order('es_developer', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (jefeUser?.email) {
        emailJefe = jefeUser.email
      } else {
        const { data: config } = await supabase.from('configuracion').select('email_from, nombre_empresa').eq('id', 1).maybeSingle()
        if (config?.email_from) emailJefe = config.email_from
      }
    } catch (e) {
      console.warn('Error localizando jefe de taller:', e)
    }

    const asunto = `📋 ¡Nueva Solicitud de Presupuesto! - ${clienteNombre} (${matricula || 'Sin matrícula'})`
    const cuerpo = `Hola Jefe de Taller,\n\nEl cliente ${clienteNombre} ha solicitado un nuevo presupuesto para su vehículo desde el Portal de Cliente:\n\n🚘 Vehículo: ${marca || ''} ${modelo || ''} (Matrícula: ${matricula || 'N/D'})\n📸 Fotografías adjuntas: ${totalFotos}\n\n📝 Descripción de la reparación solicitada:\n"${descripcion}"\n\nPuedes acceder a la sección de PRESUPUESTOS en GESTARIAN para revisar la solicitud y confeccionar el presupuesto.`

    console.log(`📧 [Notificación Solicitud Presupuesto al Jefe] Enviando a ${emailJefe}`)
    await enviarEmail(emailJefe, asunto, cuerpo)
    return { success: true }
  } catch (error: any) {
    console.error('[NotificationService.notificarSolicitudPresupuestoAlTaller Error]:', error)
    return { success: false, error: error?.message }
  }
}

/**
 * Notifica al taller cuando un cliente acepta un presupuesto y solicita cita para entrega del vehículo.
 */
export async function notificarCitaSolicitadaAlTaller({
  clienteNombre,
  matricula,
  presupuestoNumero,
  presupuestoTotal,
  fecha,
  hora
}: {
  clienteNombre: string
  matricula?: string
  presupuestoNumero?: string
  presupuestoTotal?: number
  fecha: string
  hora?: string | null
}): Promise<{ success: boolean; error?: string }> {
  try {
    // Buscar usuario con rol de jefe de taller
    let emailJefe = 'iclomsinks@gmail.com'
    try {
      const { data: jefeUser } = await supabase
        .from('usuarios')
        .select(`
          email,
          rol,
          roles:rol_id (nombre)
        `)
        .or('rol.ilike.%jefe%,rol.ilike.%taller_pro%,es_developer.eq.true')
        .eq('activo', true)
        .order('es_developer', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (jefeUser?.email) {
        emailJefe = jefeUser.email
      } else {
        const { data: config } = await supabase.from('configuracion').select('email_from, nombre_empresa').eq('id', 1).maybeSingle()
        if (config?.email_from) emailJefe = config.email_from
      }
    } catch (e) {
      console.warn('Error localizando usuario jefe de taller:', e)
    }

    const fechaFormateada = new Date(fecha).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const asunto = `🚗 ¡Presupuesto Aceptado y Cita Solicitada! - ${clienteNombre} (${matricula || 'Sin matrícula'})`
    const cuerpo = `¡Buenas noticias!\n\nEl cliente ${clienteNombre} ha aceptado el presupuesto ${presupuestoNumero || ''} (${(presupuestoTotal || 0).toFixed(2)} €) y ha solicitado fecha y hora para la entrega de su vehículo:\n\n📅 Fecha propuesta: ${fechaFormateada}\n⏰ Hora propuesta: ${hora || 'Por concretar'}\n🚘 Vehículo: ${matricula || 'N/D'}\n\nPuedes entrar a la sección de CITAS en GESTARIAN para CONFIRMAR la cita o PROPONER una nueva fecha y hora.`

    console.log(`📧 [Notificación Jefe de Taller] Presupuesto aceptado y cita solicitada a ${emailJefe}`)
    await enviarEmail(emailJefe, asunto, cuerpo)
    return { success: true }
  } catch (error: any) {
    console.error('[NotificationService.notificarCitaSolicitadaAlTaller Error]:', error)
    return { success: false, error: error?.message }
  }
}

/**
 * Notifica al cliente cuando el taller propone una modificación de fecha y hora para la entrega del vehículo.
 */
export async function notificarModificacionCitaAlCliente({
  clienteEmail,
  clienteNombre,
  matricula,
  nuevaFecha,
  nuevaHora,
  token
}: {
  clienteEmail?: string | null
  clienteNombre: string
  matricula?: string
  nuevaFecha: string
  nuevaHora?: string | null
  token?: string | null
}): Promise<{ success: boolean; error?: string }> {
  if (!clienteEmail) return { success: true }
  try {
    const origin = window.location.origin || 'http://localhost:5174'
    const portalUrl = token ? `${origin}/cliente/${token}` : origin
    const fechaFormateada = new Date(nuevaFecha).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const asunto = `Propuesta de fecha/hora para la entrega de tu vehículo - DM CAR`
    const cuerpo = `Hola ${clienteNombre},\n\nEl taller te ha propuesto una nueva fecha y hora para la entrega de tu vehículo (${matricula || ''}):\n\n📅 Fecha: ${fechaFormateada}\n⏰ Hora: ${nuevaHora || '09:00'}\n\nPuedes acceder a tu portal de cliente para ACEPTAR esta fecha o PROPONER otra hora/día diferente:\n${portalUrl}\n\nGracias por confiar en DM CAR.`

    console.log(`📧 [Notificación Modificación Cita Cliente] Enviando a ${clienteEmail}`)
    await enviarEmail(clienteEmail, asunto, cuerpo)
    return { success: true }
  } catch (error: any) {
    console.error('[NotificationService.notificarModificacionCitaAlCliente Error]:', error)
    return { success: false, error: error?.message }
  }
}

/**
 * Notifica automáticamente el cambio de estado de un expediente por Email si notificaciones_activas = true.
 */
export async function notificarCambioEstado(
  expedienteId: string,
  nuevoEstado: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: config } = await supabase
      .from('configuracion')
      .select('notificaciones_activas')
      .eq('id', 1)
      .maybeSingle()

    if (!config?.notificaciones_activas) {
      console.log('[NotificationService] Notificaciones automáticas desactivadas en Configuración.')
      return { success: true }
    }

    const { data: exp, error: expErr } = await supabase
      .from('reparaciones')
      .select(`
        id,
        estado,
        vehiculo_id,
        cliente_id,
        clientes:cliente_id (nombre, email, telefono),
        vehiculos:vehiculo_id (matricula, marca, modelo)
      `)
      .eq('id', expedienteId)
      .maybeSingle()

    if (expErr || !exp) {
      console.warn('[NotificationService] Expediente o cliente no encontrado para notificación:', expErr)
      return { success: false, error: 'Expediente no encontrado.' }
    }

    const cliente = (exp as any).clientes
    const vehiculo = (exp as any).vehiculos

    if (!cliente?.email) {
      console.log('[NotificationService] El cliente no tiene email registrado.')
      return { success: true }
    }

    const estadoLabel = nuevoEstado.replace('_', ' ').toUpperCase()
    const matriculaText = vehiculo?.matricula ? ` (Matrícula: ${vehiculo.matricula})` : ''
    const asunto = `Actualización de estado de tu vehículo${matriculaText} - ${estadoLabel}`
    const cuerpo = `Hola ${cliente.nombre || 'Cliente'},\n\nTe informamos que tu vehículo${matriculaText} ha cambiado al estado: ${estadoLabel}.\n\nPara cualquier consulta, no dudes en contactar con nosotros.\n\nAtentamente,\nEl equipo del taller.`

    console.log(`📧 [Notificación Cambio Estado] Enviando a ${cliente.email} (${estadoLabel})`)
    await enviarEmail(cliente.email, asunto, cuerpo)

    return { success: true }
  } catch (error: any) {
    console.error('[NotificationService.notificarCambioEstado Error]:', error)
    return { success: false, error: error?.message || 'Error al notificar cambio de estado.' }
  }
}
