import QRCode from 'qrcode'
import type { Factura, Configuracion } from './types'

export interface VerifactuInfo {
  url: string
  qrDataUrl: string
  legalText: string
  normativa: string
  emisorNif: string
  numero: string
  fecha: string
  total: number
}

export const VERIFACTU_NORMATIVA_TEXT =
  'Factura verificable en la sede electrónica de la AEAT / Sistema VERI*FACTU conforme al Real Decreto 1007/2023, de 5 de diciembre y Orden HAC/1177/2024.'

/**
 * Construye la URL reglamentaria de verificación para el sistema VERI*FACTU de la AEAT
 */
export function buildVerifactuUrl(
  factura: Partial<Factura>,
  config?: Configuracion | null
): string {
  const emisorNif = (config?.cif || 'B12345678').trim().toUpperCase()
  const numero = (factura.numero || 'FAC-0001').trim()
  const rawDate = factura.fecha ? new Date(factura.fecha) : new Date()
  const dd = String(rawDate.getDate()).padStart(2, '0')
  const mm = String(rawDate.getMonth() + 1).padStart(2, '0')
  const yyyy = rawDate.getFullYear()
  const fecha = `${dd}-${mm}-${yyyy}`
  const total = Number(factura.total || 0).toFixed(2)

  // Formato oficial de URL de cotejo de facturas de la Agencia Tributaria (Veri*factu)
  return `https://sede.agenciatributaria.gob.es/Sede/procedimientoini/ZZ01.shtml?nif=${encodeURIComponent(
    emisorNif
  )}&numserie=${encodeURIComponent(numero)}&fecha=${encodeURIComponent(
    fecha
  )}&importe=${encodeURIComponent(total)}`
}

/**
 * Genera el QR de VERIFACTU en formato DataURL Base64
 */
export async function generateVerifactuQRDataUrl(
  factura: Partial<Factura>,
  config?: Configuracion | null
): Promise<string> {
  const url = buildVerifactuUrl(factura, config)
  try {
    return await QRCode.toDataURL(url, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 256,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    })
  } catch (err) {
    console.error('Error generando QR VERIFACTU:', err)
    // Fallback dataURL si falla
    return ''
  }
}

/**
 * Versión síncrona / canvas si se ejecuta en navegador
 */
export function generateVerifactuQRDataUrlSync(
  factura: Partial<Factura>,
  config?: Configuracion | null
): string {
  const url = buildVerifactuUrl(factura, config)
  // Generar con QRCode toString o canvas si es posible
  let dataUrl = ''
  QRCode.toDataURL(
    url,
    {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 256,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    },
    (err, result) => {
      if (!err && result) {
        dataUrl = result
      }
    }
  )
  return dataUrl
}
