import { supabase } from '../lib/supabase'
import type { Cliente } from '../lib/types'

/**
 * Normaliza un número de teléfono eliminando caracteres no numéricos
 * y añadiendo el prefijo internacional de España (34) si tiene 9 dígitos.
 */
export function normalizePhone(rawPhone?: string | null): string {
  if (!rawPhone) return ''
  let cleaned = rawPhone.replace(/\D/g, '')
  if (!cleaned) return ''
  // Si el número tiene 9 dígitos (ej. 612345678), añadir prefijo España +34 -> 34612345678
  if (cleaned.length === 9) {
    cleaned = `34${cleaned}`
  }
  return cleaned
}

/**
 * Acorta una URL utilizando la API gratuita de TinyURL.
 * Si falla, devuelve la URL original.
 */
async function shortenUrl(longUrl: string): Promise<string> {
  try {
    const res = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`)
    if (res.ok) {
      return await res.text()
    }
  } catch (err) {
    console.warn('[shortenUrl Error]', err)
  }
  return longUrl
}

/**
 * Sube un PDF Blob a Supabase Storage y genera una URL HTTPS accesible (Signed URL o Public URL).
 */
export async function getDocumentoPdfUrl(
  tipo: 'presupuesto' | 'factura',
  numero: string,
  pdfBlob: Blob
): Promise<string | null> {
  try {
    const bucketName = 'documentos'
    const sanitizeNum = (numero || 'DOC-0001').replace(/[^a-zA-Z0-9_-]/g, '_')
    const fileName = `${tipo === 'presupuesto' ? 'PRESUPUESTO' : 'FACTURA'}_${sanitizeNum}.pdf`
    const folder = tipo === 'presupuesto' ? 'presupuestos' : 'facturas'
    const filePath = `${folder}/${fileName}`

    // 1. Subir/actualizar el archivo en el bucket 'documentos'
    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, pdfBlob, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadError) {
      console.warn('[Supabase Storage Upload Warning]', uploadError)
      // Si el bucket no existe, intentar crearlo con acceso público
      if (uploadError.message?.includes('bucket not found') || (uploadError as any).status === 404) {
        try {
          await supabase.storage.createBucket(bucketName, { public: true })
          await supabase.storage.from(bucketName).upload(filePath, pdfBlob, {
            contentType: 'application/pdf',
            upsert: true,
          })
        } catch (bucketErr: any) {
          console.error('[Supabase Storage Create Bucket Error]', bucketErr)
          alert('Error creando el bucket de documentos: ' + bucketErr.message)
        }
      } else {
        alert('Error subiendo PDF a Supabase Storage: ' + uploadError.message)
      }
    }

    // 2. Intentar obtener Signed URL con 30 días de caducidad
    const { data: signedData } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(filePath, 60 * 60 * 24 * 30)

    if (signedData?.signedUrl) {
      return signedData.signedUrl
    }

    // 3. Fallback: Obtener Public URL
    const { data: publicData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath)

    if (publicData?.publicUrl) {
      return publicData.publicUrl
    }

    return null
  } catch (e) {
    console.error('[getDocumentoPdfUrl Exception]', e)
    if (e instanceof Error) {
      alert('Error de Supabase (Storage): ' + e.message)
    }
    return null
  }
}

/**
 * Función reutilizable central para enviar un Presupuesto o Factura por WhatsApp mediante URL HTTPS pública al PDF.
 */
export async function shareDocumentoViaWhatsApp(options: {
  tipo: 'presupuesto' | 'factura'
  numero: string
  pdfBlob: Blob
  cliente?: Cliente | null
  matricula?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Obtener la URL HTTPS real del PDF en Supabase Storage
    const pdfUrl = await getDocumentoPdfUrl(options.tipo, options.numero, options.pdfBlob)

    if (!pdfUrl) {
      return { success: false, error: 'No se obtuvo URL HTTPS de Storage' }
    }

    // Acortar la URL para que quede bonita en el mensaje de WhatsApp
    const shortUrl = await shortenUrl(pdfUrl)

    // 2. Preparar el mensaje y destinatario
    const rawPhone = options.cliente?.telefono
    const phone = normalizePhone(rawPhone)

    const isPresupuesto = options.tipo === 'presupuesto'
    const docLabel = isPresupuesto ? 'el presupuesto' : 'la factura'
    const matriculaText = options.matricula ? ` (${options.matricula})` : ''
    
    const message = `Hola, te enviamos ${docLabel} correspondiente a la reparación de tu vehículo${matriculaText}. Gracias por confiar en nosotros.\n\nPuedes acceder al documento PDF pulsando el siguiente enlace:\n${shortUrl}`

    // 3. Abrir WhatsApp según exista o no el teléfono del cliente
    if (phone) {
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank')
    } else {
      alert('El cliente no tiene un número de teléfono registrado. Puedes abrir WhatsApp y seleccionar el contacto manualmente.')
      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank')
    }

    return { success: true }
  } catch (err: any) {
    console.error('[shareDocumentoViaWhatsApp Error]', err)
    alert('No se ha podido preparar el documento para WhatsApp.')
    return { success: false, error: err.message }
  }
}
