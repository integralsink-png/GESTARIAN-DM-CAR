import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Manejo de preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const rawBody = await req.json()
    const body = rawBody.payload || rawBody

    const recipient = body.recipient || body.to || body.destinatario_email
    const subject = body.subject || body.asunto || 'Documento DM CAR'
    const content = body.content || body.htmlBody || body.cuerpo_html || '<p>Le adjuntamos su documento.</p>'
    const rawAttachments = body.attachments || body.adjuntos || []

    if (!recipient) {
      return new Response(
        JSON.stringify({ success: false, error: 'Destinatario (recipient / to) no especificado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      console.warn('RESEND_API_KEY no configurada en Supabase Secrets.')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Falta configurar RESEND_API_KEY en Supabase Secrets.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // Reconstrucción de adjuntos Base64 para Resend API (Sanitizado estricto según especificación de Resend)
    const resendAttachments = rawAttachments.map((att: any, idx: number) => {
      const rawLength = (att.content || '').length
      let base64Content = att.content || ''
      if (base64Content.includes(',')) {
        base64Content = base64Content.split(',')[1]
      }
      // Eliminar saltos de línea (\n, \r) y espacios que corrompen el Base64 en la API de Resend
      base64Content = base64Content.replace(/[\r\n\s]/g, '')
      const sanitizedLength = base64Content.length

      console.log(`[INSTRUMENTATION EdgeFunction attachment ${idx}]`, {
        filename: att.filename || att.nombre,
        rawContentLength: rawLength,
        sanitizedContentLength: sanitizedLength
      })

      const item: any = {
        filename: att.filename || att.nombre || 'documento.pdf',
        content: base64Content
      }
      if (att.contentType) {
        item.contentType = att.contentType
      }
      return item
    })

    const resendPayload = {
      from: 'DM CAR <onboarding@resend.dev>',
      to: [recipient],
      subject: subject,
      html: content,
      attachments: resendAttachments
    }

    console.log('[DEBUG EDGE FUNCTION] Enviando a Resend API:', {
      to: recipient,
      subject,
      attachmentsCount: resendAttachments.length,
      attachmentsSample: resendAttachments.map((a: any) => ({ filename: a.filename, contentLength: a.content?.length || 0 }))
    })

    // Petición a la API REST oficial de Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(resendPayload)
    })

    const rawResponseText = await resendResponse.text()
    console.log(`[DEBUG RESEND RESPONSE] Status Code: ${resendResponse.status}, Body: ${rawResponseText}`)

    let resendData: any = {}
    try {
      resendData = JSON.parse(rawResponseText)
    } catch (e) {
      resendData = { rawText: rawResponseText }
    }

    if (!resendResponse.ok) {
      const errMessage = resendData.message || resendData.name || resendData.rawText || `HTTP ${resendResponse.status} Error en Resend`
      console.error('[RESEND ERROR DETECTADO]:', errMessage)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Resend API (HTTP ${resendResponse.status}): ${errMessage}` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const now = new Date()
    const fecha = now.toISOString().split('T')[0]
    const hora = now.toTimeString().split(' ')[0]

    return new Response(
      JSON.stringify({
        success: true,
        messageId: resendData.id,
        id: resendData.id,
        fecha,
        hora
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (err: any) {
    console.error('Excepción en Edge Function send-communication:', err)
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Error interno en Edge Function Deno' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
