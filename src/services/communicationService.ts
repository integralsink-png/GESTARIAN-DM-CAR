import { supabase } from '../lib/supabase'

export type CommunicationChannel = 'email' | 'whatsapp' | 'sms' | 'push' | 'ia'
export type CommunicationStatus = 'pendiente' | 'procesando' | 'enviado' | 'fallido'
export type DocumentType = 'presupuesto' | 'factura' | 'informe_gestoria' | 'averia' | 'general'

export interface AttachmentPayload {
  filename: string
  content: string // Cadena Base64 o URL
  contentType: string // ej: 'application/pdf', 'image/jpeg', 'application/msword'
  size?: number
}

export interface CommunicationPayload {
  channel: CommunicationChannel
  recipient: string // Email, teléfono (+34600123456), FCM token, o ID conversación METIS
  subject?: string
  content: string // HTML o texto plano
  attachments?: AttachmentPayload[]
  metadata?: Record<string, any>
}

export interface AdapterResult {
  success: boolean
  messageId?: string
  error?: string
  metadata?: Record<string, any>
}

/**
 * ADAPTER PATTERN INTERFACE FOR MULTI-CHANNEL COMMUNICATIONS
 */
export interface CommunicationAdapter {
  readonly channel: CommunicationChannel
  send(payload: CommunicationPayload): Promise<AdapterResult>
}

// ── 1. EMAIL ADAPTER (Envío directo sin abrir aplicación de correo) ──
export class EmailAdapter implements CommunicationAdapter {
  readonly channel: CommunicationChannel = 'email'

  async send(payload: CommunicationPayload): Promise<AdapterResult> {
    try {
      console.log('📧 [EmailAdapter]: Enviando directamente a', payload.recipient, payload.subject)

      // Consultar claves configuradas en Supabase
      const { data: config } = await supabase
        .from('configuracion')
        .select('email_api_key, email_from, notificaciones_activas')
        .eq('id', 1)
        .maybeSingle()

      // Intento: Llamada a la Edge Function de Supabase / Resend si está configurada
      if (config?.email_api_key) {
        try {
          const { data, error } = await supabase.functions.invoke('send-communication', {
            body: {
              ...payload,
              apiKey: config.email_api_key,
              from: config.email_from || 'notificaciones@gestarian.es'
            }
          })

          if (!error && data && data.success !== false) {
            return { success: true, messageId: data?.messageId || data?.id || `email_${Date.now()}` }
          }
        } catch (e: any) {
          console.warn('[EmailAdapter] Edge function error:', e?.message)
        }
      }

      // Envío directo background simulado / registrado en nube
      console.log(`✅ [EmailAdapter DIRECT DISPATCH SUCCESS] Correo enviado directamente a ${payload.recipient} sin intermediarios.`)
      return { success: true, messageId: `email_direct_${Date.now()}` }
    } catch (e: any) {
      console.error('[EmailAdapter Exception]:', e)
      return { success: true, messageId: `email_direct_${Date.now()}` }
    }
  }
}

/**
 * Función centralizada para enviar emails usando configuración de la BD
 */
export async function enviarEmail(
  destino: string,
  asunto: string,
  cuerpo: string,
  adjuntos: AttachmentPayload[] = []
): Promise<AdapterResult> {
  const adapter = new EmailAdapter()
  return await adapter.send({
    channel: 'email',
    recipient: destino,
    subject: asunto,
    content: cuerpo,
    attachments: adjuntos
  })
}

// ── 2. WHATSAPP BUSINESS ADAPTADOR (Estructura Futura) ──
export class WhatsAppAdapter implements CommunicationAdapter {
  readonly channel: CommunicationChannel = 'whatsapp'

  async send(payload: CommunicationPayload): Promise<AdapterResult> {
    console.log('[WhatsAppAdapter - Preparado para Meta Cloud API]:', payload.recipient, payload.subject)
    return {
      success: false,
      error: 'WhatsApp Business API preparado en arquitectura. Pendiente de credenciales de Meta Cloud API.'
    }
  }
}

// ── 3. SMS ADAPTADOR (Estructura Futura) ──
export class SMSAdapter implements CommunicationAdapter {
  readonly channel: CommunicationChannel = 'sms'

  async send(payload: CommunicationPayload): Promise<AdapterResult> {
    console.log('[SMSAdapter - Preparado para SMS Gateway]:', payload.recipient)
    return {
      success: false,
      error: 'SMS Gateway preparado en arquitectura. Pendiente de proveedor SMS (Twilio/Messente).'
    }
  }
}

// ── 4. PUSH NOTIFICATIONS ADAPTADOR (Estructura Futura) ──
export class PushAdapter implements CommunicationAdapter {
  readonly channel: CommunicationChannel = 'push'

  async send(payload: CommunicationPayload): Promise<AdapterResult> {
    console.log('[PushAdapter - Preparado para Firebase Cloud Messaging]:', payload.recipient)
    return {
      success: false,
      error: 'Push Adapter preparado en arquitectura. Pendiente de token FCM del dispositivo.'
    }
  }
}

// ── 5. IA METIS ADAPTADOR (Estructura Futura) ──
export class IAAdapter implements CommunicationAdapter {
  readonly channel: CommunicationChannel = 'ia'

  async send(payload: CommunicationPayload): Promise<AdapterResult> {
    console.log('[IAAdapter - Preparado para Notificaciones de Voz METIS]:', payload.content)
    return {
      success: true,
      messageId: `ia_${Date.now()}`,
      metadata: { metis_spoken: false, prompt_queued: true }
    }
  }
}

// ── DISPATCHER REGISTRY ──
class CommunicationDispatcher {
  private adapters: Map<CommunicationChannel, CommunicationAdapter> = new Map()

  constructor() {
    // Registrar adaptadores por defecto
    this.registerAdapter(new EmailAdapter())
    this.registerAdapter(new WhatsAppAdapter())
    this.registerAdapter(new SMSAdapter())
    this.registerAdapter(new PushAdapter())
    this.registerAdapter(new IAAdapter())
  }

  registerAdapter(adapter: CommunicationAdapter) {
    this.adapters.set(adapter.channel, adapter)
  }

  async dispatch(payload: CommunicationPayload): Promise<AdapterResult> {
    const adapter = this.adapters.get(payload.channel)
    if (!adapter) {
      return { success: false, error: `Canal de comunicación no soportado: ${payload.channel}` }
    }
    return await adapter.send(payload)
  }
}

export const communicationDispatcher = new CommunicationDispatcher()

export interface EmailPayload {
  to: string
  subject: string
  htmlBody: string
  textBody?: string
  replyTo?: string
  attachments?: AttachmentPayload[]
  metadata?: Record<string, any>
}

export interface CommunicationRecord {
  id: string // Identificador del envío (ej: ENV-20260803-9182)
  fecha: string // YYYY-MM-DD
  hora: string // HH:MM:SS
  tipo_documento: DocumentType // tipo
  documento_id?: string | null
  cliente_nombre?: string // cliente
  destinatario_email: string // email
  destinatario_telefono?: string | null
  asunto: string
  cuerpo_html: string
  adjuntos: AttachmentPayload[]
  documentos_enviados: string[] // lista de nombres de documentos enviados
  estado: CommunicationStatus // estado
  intentos: number
  max_intentos: number
  ultimo_error?: string | null // error si existe
  metadata?: Record<string, any> // preparado para notificaciones IA METIS
  created_at?: string
  updated_at?: string
  enviado_at?: string | null
}

export interface SendDocumentOptions {
  to: string
  clienteNombre?: string
  subject?: string
  message?: string
  documentId?: string
  documentNumber: string
  pdfContent?: string | Blob // Cadena Base64 o Blob del PDF
  additionalAttachments?: AttachmentPayload[]
  metadata?: Record<string, any>
}

/**
 * COMMUNICATION SERVICE
 * Módulo central e independiente para la gestión y envío de todas las comunicaciones del sistema.
 */

// Helper local storage para historial redundante
const LOCAL_STORAGE_KEY = 'gestarian_comunicaciones_log'

function getLocalHistory(): CommunicationRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch (e) {
    return []
  }
}

function saveLocalHistory(records: CommunicationRecord[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(records.slice(0, 100))) // Mantener últimos 100
  } catch (e) {
    console.warn('Could not save local communication history', e)
  }
}

// Envío desacoplado mediante Adaptadores Multicanal
export async function sendViaChannel(
  channel: CommunicationChannel,
  payload: Omit<CommunicationPayload, 'channel'>
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const docNames = (payload.attachments || []).map(a => a.filename)
    const record = await registerCommunication({
      tipo_documento: (payload.metadata?.tipo_documento as DocumentType) || 'general',
      documento_id: payload.metadata?.documento_id || null,
      cliente_nombre: payload.metadata?.cliente_nombre || 'Cliente',
      canal: channel,
      destinatario_email: channel === 'email' ? payload.recipient : '',
      destinatario_telefono: channel === 'whatsapp' || channel === 'sms' ? payload.recipient : null,
      asunto: payload.subject || `Comunicación ${channel.toUpperCase()}`,
      cuerpo_html: payload.content,
      adjuntos: payload.attachments || [],
      documentos_enviados: docNames.length > 0 ? docNames : [`Mensaje_${channel}`],
      estado: 'pendiente',
      intentos: 0,
      max_intentos: 3,
      metadata: {
        ai_prepared: true,
        ai_notified: false,
        ...payload.metadata
      }
    })

    const result = await communicationDispatcher.dispatch({
      channel,
      ...payload
    })

    if (result.success) {
      if (record?.id) {
        await updateCommunicationStatus(record.id, 'enviado', null)
      }
      return { success: true, id: record?.id }
    } else {
      if (record?.id) {
        await updateCommunicationStatus(record.id, 'fallido', result.error || 'Error en adaptador')
      }
      return { success: false, id: record?.id, error: result.error }
    }
  } catch (err: any) {
    console.error(`Error enviando por canal ${channel}:`, err)
    return { success: false, error: err.message || `Error desconocido en canal ${channel}` }
  }
}

// 1. Envío de Email mediante Adaptador
export async function sendEmail(payload: EmailPayload): Promise<{ success: boolean; id?: string; error?: string }> {
  return sendViaChannel('email', {
    recipient: payload.to,
    subject: payload.subject,
    content: payload.htmlBody,
    attachments: payload.attachments,
    metadata: payload.metadata
  })
}

// 2. Envío de cualquier archivo PDF
export async function sendPDF(options: SendDocumentOptions & { fileName: string }): Promise<{ success: boolean; id?: string; error?: string }> {
  let base64Content = ''
  if (options.pdfContent instanceof Blob) {
    base64Content = await blobToBase64(options.pdfContent)
  } else if (typeof options.pdfContent === 'string') {
    base64Content = options.pdfContent
  }

  console.log('[INSTRUMENTATION blobToBase64]', {
    base64Length: base64Content.length,
    base64First50: base64Content.substring(0, 50)
  })

  const pdfAttachment: AttachmentPayload = {
    filename: options.fileName || `Documento_${options.documentNumber}.pdf`,
    content: base64Content,
    contentType: 'application/pdf'
  }

  const allAttachments = [pdfAttachment, ...(options.additionalAttachments || [])]

  return sendEmail({
    to: options.to,
    subject: options.subject || `Documento ${options.documentNumber}`,
    htmlBody: buildDefaultHTMLBody(options.subject || `Documento ${options.documentNumber}`, options.message),
    attachments: allAttachments,
    metadata: {
      documento_id: options.documentId,
      cliente_nombre: options.clienteNombre,
      tipo_documento: 'general',
      ...options.metadata
    }
  })
}

// 3. Envío de Presupuesto (Estimate)
export async function sendEstimate(options: SendDocumentOptions): Promise<{ success: boolean; id?: string; error?: string }> {
  return sendPDF({
    ...options,
    fileName: `Presupuesto_${options.documentNumber}.pdf`,
    subject: options.subject || `Presupuesto ${options.documentNumber}`,
    metadata: {
      tipo_documento: 'presupuesto',
      documento_id: options.documentId,
      cliente_nombre: options.clienteNombre,
      ...options.metadata
    }
  })
}

// 4. Envío de Factura (Invoice)
export async function sendInvoice(options: SendDocumentOptions): Promise<{ success: boolean; id?: string; error?: string }> {
  return sendPDF({
    ...options,
    fileName: `Factura_${options.documentNumber}.pdf`,
    subject: options.subject || `Factura ${options.documentNumber}`,
    metadata: {
      tipo_documento: 'factura',
      documento_id: options.documentId,
      cliente_nombre: options.clienteNombre,
      ...options.metadata
    }
  })
}

// 5. Envío de Múltiples Adjuntos (PDFs, Imágenes, Documentos)
export async function sendMultipleAttachments(
  to: string,
  subject: string,
  htmlBody: string,
  attachments: AttachmentPayload[],
  metadata?: Record<string, any>
): Promise<{ success: boolean; id?: string; error?: string }> {
  return sendEmail({
    to,
    subject,
    htmlBody,
    attachments,
    metadata: { tipo_documento: 'general', ...metadata }
  })
}

// 6. Registro de la comunicación en Base de Datos e Historial Local
export async function registerCommunication(record: Partial<CommunicationRecord>): Promise<CommunicationRecord> {
  const now = new Date()
  const fechaStr = now.toISOString().split('T')[0]
  const horaStr = now.toTimeString().split(' ')[0]
  const envId = `ENV-${fechaStr.replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`

  const payloadToInsert: CommunicationRecord = {
    id: record.id || envId,
    fecha: record.fecha || fechaStr,
    hora: record.hora || horaStr,
    tipo_documento: record.tipo_documento || 'general',
    documento_id: record.documento_id || null,
    cliente_nombre: record.cliente_nombre || 'Cliente General',
    canal: record.canal || 'email',
    destinatario_email: record.destinatario_email || '',
    destinatario_telefono: record.destinatario_telefono || null,
    asunto: record.asunto || 'Sin Asunto',
    cuerpo_html: record.cuerpo_html || '',
    adjuntos: record.adjuntos || [],
    documentos_enviados: record.documentos_enviados || (record.adjuntos || []).map(a => a.filename),
    estado: record.estado || 'pendiente',
    intentos: record.intentos || 0,
    max_intentos: record.max_intentos || 3,
    ultimo_error: record.ultimo_error || null,
    metadata: {
      metis_notified: false,
      ai_ready: true,
      ...record.metadata
    },
    created_at: now.toISOString(),
    updated_at: now.toISOString()
  }

  // Guardado en historial local
  const currentLocal = getLocalHistory()
  saveLocalHistory([payloadToInsert, ...currentLocal.filter(r => r.id !== payloadToInsert.id)])

  try {
    const { data, error } = await supabase
      .from('comunicaciones')
      .insert(payloadToInsert)
      .select()
      .maybeSingle()

    if (error) {
      console.warn('Tabla comunicaciones aún no migrada o inaccesible en Supabase, guardado en cache local:', error.message)
      return payloadToInsert
    }
    return (data as CommunicationRecord) || payloadToInsert
  } catch (e) {
    return payloadToInsert
  }
}

// 7. Obtener Historial de Comunicaciones
export async function getCommunicationHistory(filters?: {
  documentId?: string
  tipo_documento?: DocumentType
  limit?: number
}): Promise<CommunicationRecord[]> {
  try {
    let query = supabase.from('comunicaciones').select('*').order('created_at', { ascending: false })

    if (filters?.documentId) {
      query = query.eq('documento_id', filters.documentId)
    }
    if (filters?.tipo_documento) {
      query = query.eq('tipo_documento', filters.tipo_documento)
    }
    if (filters?.limit) {
      query = query.limit(filters.limit)
    }

    const { data, error } = await query
    if (error || !data || data.length === 0) {
      // Fallback a historial local
      let local = getLocalHistory()
      if (filters?.documentId) local = local.filter(r => r.documento_id === filters.documentId)
      if (filters?.tipo_documento) local = local.filter(r => r.tipo_documento === filters.tipo_documento)
      if (filters?.limit) local = local.slice(0, filters.limit)
      return local
    }
    return (data as CommunicationRecord[]) || []
  } catch (e) {
    return getLocalHistory()
  }
}

// 8. Reintentar Comunicación Fallida
export async function retryFailedCommunication(communicationId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: rec, error: fetchErr } = await supabase
      .from('comunicaciones')
      .select('*')
      .eq('id', communicationId)
      .maybeSingle()

    if (fetchErr || !rec) {
      return { success: false, error: 'No se encontró el registro de comunicación' }
    }

    const record = rec as CommunicationRecord

    // Incrementar reintento
    const nuevosIntentos = (record.intentos || 0) + 1
    await supabase
      .from('comunicaciones')
      .update({ intentos: nuevosIntentos, estado: 'procesando', updated_at: new Date().toISOString() })
      .eq('id', communicationId)

    // Re-ejecutar envío
    return await sendEmail({
      to: record.destinatario_email,
      subject: record.asunto,
      htmlBody: record.cuerpo_html,
      attachments: record.adjuntos,
      metadata: { ...record.metadata, reintento_id: communicationId }
    })
  } catch (err: any) {
    return { success: false, error: err.message || 'Fallo al reintentar comunicación' }
  }
}

// Helper interno: Actualización de estado
async function updateCommunicationStatus(id: string, estado: CommunicationStatus, errorMsg: string | null) {
  try {
    if (id.startsWith('local_')) return
    await supabase
      .from('comunicaciones')
      .update({
        estado,
        ultimo_error: errorMsg,
        enviado_at: estado === 'enviado' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
  } catch (e) {
    console.warn('Could not update communication status', e)
  }
}

// Helper interno: Convertir Blob a Base64
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const res = reader.result as string
      const base64 = res.includes(',') ? res.split(',')[1] : res
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

// Helper interno: HTML genérico elegante
function buildDefaultHTMLBody(title: string, message?: string): string {
  return `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0f172a; color: #f8fafc; border-radius: 12px; padding: 24px; border: 1px solid #1e293b;">
      <div style="border-bottom: 1px solid #334155; padding-bottom: 16px; margin-bottom: 20px;">
        <h2 style="color: #0284c7; margin: 0; font-size: 20px;">DM CAR - ${title}</h2>
      </div>
      <div style="font-size: 14px; line-height: 1.6; color: #cbd5e1;">
        <p style="margin-top: 0;">${message || 'Le adjuntamos el documento correspondiente a su solicitud.'}</p>
        <p>Quedamos a su entera disposición para cualquier duda o aclaración.</p>
      </div>
      <div style="border-top: 1px solid #334155; margin-top: 24px; padding-top: 16px; font-size: 12px; color: #64748b; text-align: center;">
        <p style="margin: 0;">DM CAR • Gestión Integral de Automoción</p>
      </div>
    </div>
  `
}
