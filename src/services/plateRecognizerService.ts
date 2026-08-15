/**
 * Servicio centralizado para OCR de matrículas mediante Plate Recognizer.
 *
 * REGLAS:
 * - Plate Recognizer es el proveedor exclusivo de OCR de matrículas.
 * - CameraModal y otros componentes NO deben llamar directamente a la API.
 * - La API Key se obtiene desde la configuración/localStorage.
 * - Si el OCR falla, la aplicación devuelve un error comprensible
 *   y permite continuar con introducción manual.
 */

import type { PlateRecognizerConfig } from '../lib/types'
import { extractMatricula } from '../lib/metisAiEngine'

export interface PlateRecognitionResult {
  success: boolean
  matricula?: string
  matricula_normalizada?: string
  confidence?: number
  fecha_hora: string
  image_ref?: string
  error_message?: string
}

const DEFAULT_ENDPOINT =
  'https://api.platerecognizer.com/v1/plate-reader/'

/**
 * Obtiene la configuración actual de Plate Recognizer.
 */
export function getPlateRecognizerConfig(): PlateRecognizerConfig {
  const saved = localStorage.getItem(
    'gestarian_plate_recognizer_config'
  )

  if (saved) {
    try {
      const parsed = JSON.parse(saved)

      return {
        provider: 'plate_recognizer',
        api_key:
          parsed.api_key ||
          localStorage.getItem('gestarian_plate_recognizer_key') ||
          '',
        endpoint_url:
          parsed.endpoint_url || DEFAULT_ENDPOINT,
        status: parsed.status || 'disconnected',
      }
    } catch {
      // Si la configuración almacenada está dañada,
      // se utiliza la configuración por defecto.
    }
  }

  const apiKey =
    localStorage.getItem('gestarian_plate_recognizer_key') || ''

  return {
    provider: 'plate_recognizer',
    api_key: apiKey,
    endpoint_url: DEFAULT_ENDPOINT,
    status: apiKey ? 'connected' : 'disconnected',
  }
}

/**
 * Guarda la configuración de Plate Recognizer.
 */
export function savePlateRecognizerConfig(
  config: PlateRecognizerConfig
): void {
  localStorage.setItem(
    'gestarian_plate_recognizer_config',
    JSON.stringify(config)
  )

  if (config.api_key) {
    localStorage.setItem(
      'gestarian_plate_recognizer_key',
      config.api_key
    )
  }
}

/**
 * Normaliza una matrícula eliminando espacios y caracteres extraños.
 *
 * Ejemplo:
 * "1234-bbb" -> "1234 BBB"
 */
export function normalizeSpanishPlate(rawPlate: string): string {
  if (!rawPlate) return ''

  try {
    const extracted = extractMatricula(rawPlate)

    if (extracted) {
      return extracted
    }
  } catch {
    // Si extractMatricula falla continuamos
    // con la normalización local.
  }

  const clean = rawPlate
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')

  /*
   * Matrícula española moderna:
   * 1234 ABC
   */
  const modernMatch = clean.match(/^(\d{4})([A-Z]{3})$/)

  if (modernMatch) {
    return `${modernMatch[1]} ${modernMatch[2]}`
  }

  /*
   * Si tiene al menos 7 caracteres,
   * intentamos aplicar formato visual.
   */
  if (clean.length >= 7) {
    return `${clean.slice(0, 4)} ${clean.slice(4, 7)}`
  }

  return clean
}

/**
 * Convierte una matrícula a formato interno para búsquedas
 * y almacenamiento.
 *
 * Ejemplo:
 * "1234 BBB" -> "1234BBB"
 */
export function cleanPlateForStorage(
  plate: string
): string {
  return plate
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
}

/**
 * Comprueba si una matrícula tiene una estructura española moderna válida.
 *
 * Ejemplo válido:
 * 1234 BBB
 */
export function isValidSpanishPlate(
  plate: string
): boolean {
  const clean = cleanPlateForStorage(plate)

  return /^\d{4}[A-Z]{3}$/.test(clean)
}

/**
 * Prueba la conexión con Plate Recognizer.
 *
 * Plate Recognizer puede responder 405 a una petición GET,
 * por lo que solamente consideramos error de autenticación
 * los códigos 401 y 403.
 */
export async function testPlateRecognizerConnection(
  config: PlateRecognizerConfig
): Promise<{
  success: boolean
  message: string
}> {
  if (!config.api_key?.trim()) {
    return {
      success: false,
      message:
        'Se requiere la API Key de Plate Recognizer.',
    }
  }

  try {
    const response = await fetch(
      config.endpoint_url || DEFAULT_ENDPOINT,
      {
        method: 'GET',
        headers: {
          Authorization: `Token ${config.api_key}`,
        },
      }
    )

    if (
      response.status === 401 ||
      response.status === 403
    ) {
      return {
        success: false,
        message:
          'La API Key de Plate Recognizer no es válida o no tienes permisos para utilizar el servicio.',
      }
    }

    return {
      success: true,
      message:
        'Conexión con Plate Recognizer verificada correctamente.',
    }
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : 'Error desconocido al conectar con Plate Recognizer.'

    return {
      success: false,
      message,
    }
  }
}

/**
 * Reconoce una matrícula a partir de una imagen.
 *
 * Acepta:
 * - Blob
 * - URL de imagen
 * - Data URL (base64)
 */
export async function recognizeVehiclePlate(
  imageBlobOrUrl: Blob | string
): Promise<PlateRecognitionResult> {
  const config = getPlateRecognizerConfig()
  const timestamp = new Date().toISOString()

  if (!config.api_key?.trim()) {
    return {
      success: false,
      fecha_hora: timestamp,
      error_message:
        'Plate Recognizer no está configurado. Puedes introducir la matrícula manualmente.',
    }
  }

  try {
    const formData = new FormData()

    if (imageBlobOrUrl instanceof Blob) {
      formData.append(
        'upload',
        imageBlobOrUrl,
        'vehiculo.jpg'
      )
    } else if (
      imageBlobOrUrl.startsWith('data:')
    ) {
      /*
       * Convierte Data URL a Blob.
       */
      const imageResponse = await fetch(imageBlobOrUrl)
      const imageBlob = await imageResponse.blob()

      formData.append(
        'upload',
        imageBlob,
        'vehiculo.jpg'
      )
    } else {
      /*
       * Si es una URL normal.
       */
      formData.append(
        'upload_url',
        imageBlobOrUrl
      )
    }

    /*
     * Priorizamos España.
     */
    formData.append('regions', 'es')

    const response = await fetch(
      config.endpoint_url || DEFAULT_ENDPOINT,
      {
        method: 'POST',
        headers: {
          Authorization: `Token ${config.api_key}`,
        },
        body: formData,
      }
    )

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => null)

      let errorMessage =
        `Error Plate Recognizer (HTTP ${response.status}).`

      if (
        errorData &&
        typeof errorData === 'object'
      ) {
        if (
          typeof errorData.detail === 'string'
        ) {
          errorMessage = errorData.detail
        } else if (
          typeof errorData.message === 'string'
        ) {
          errorMessage = errorData.message
        }
      }

      if (
        response.status === 401 ||
        response.status === 403
      ) {
        errorMessage =
          'La API Key de Plate Recognizer no es válida o no tienes permisos.'
      }

      if (response.status === 429) {
        errorMessage =
          'Se ha alcanzado el límite de uso de Plate Recognizer. Puedes introducir la matrícula manualmente.'
      }

      return {
        success: false,
        fecha_hora: timestamp,
        error_message: errorMessage,
      }
    }

    const data = await response.json()

    const results = Array.isArray(data?.results)
      ? data.results
      : []

    if (results.length === 0) {
      return {
        success: false,
        fecha_hora: timestamp,
        error_message:
          'No se detectó ninguna matrícula clara en la fotografía. Puedes repetir la foto o introducirla manualmente.',
      }
    }

    /*
     * Elegimos el resultado con mayor puntuación.
     */
    const bestResult = results.reduce(
      (
        best: {
          plate?: string
          score?: number
        },
        current: {
          plate?: string
          score?: number
        }
      ) => {
        return (current.score || 0) >
          (best.score || 0)
          ? current
          : best
      }
    )

    if (!bestResult?.plate) {
      return {
        success: false,
        fecha_hora: timestamp,
        error_message:
          'No se pudo obtener una matrícula válida de la imagen.',
      }
    }

    const rawPlate = bestResult.plate
      .toUpperCase()
      .replace(/\s/g, '')

    const normalizedPlate =
      normalizeSpanishPlate(rawPlate)

    return {
      success: true,
      matricula: rawPlate,
      matricula_normalizada: normalizedPlate,
      confidence: Math.round(
        (bestResult.score || 0) * 100
      ),
      fecha_hora: timestamp,
    }
  } catch (error: unknown) {
    console.error(
      'Plate Recognizer error:',
      error
    )

    const message =
      error instanceof Error
        ? error.message
        : ''

    return {
      success: false,
      fecha_hora: timestamp,
      error_message:
        message
          ? `Error de comunicación con Plate Recognizer: ${message}. Puedes introducir la matrícula manualmente.`
          : 'Error de comunicación con Plate Recognizer. Puedes introducir la matrícula manualmente.',
    }
  }
}