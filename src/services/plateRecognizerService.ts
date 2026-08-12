/**
 * Capa de Servicio dedicada para OCR de Matrículas mediante PLATE RECOGNIZER.
 * 
 * REGLA ESTRICTA DE OBJETIVO 1.3:
 * - Se utiliza Plate Recognizer como proveedor exclusivo para matrículas.
 * - NO se utiliza Gemini ni Groq para OCR de matrículas mientras Plate Recognizer esté configurado.
 * - Si falla, muestra un error comprensible y permite introducción manual sin bloquear.
 */

import type { PlateRecognizerConfig } from '../lib/types';
import { extractMatricula } from '../lib/metisAiEngine';

export interface PlateRecognitionResult {
  success: boolean;
  matricula?: string;
  matricula_normalizada?: string;
  confidence?: number;
  fecha_hora: string;
  image_ref?: string;
  error_message?: string;
}

export function getPlateRecognizerConfig(): PlateRecognizerConfig {
  const saved = localStorage.getItem('gestarian_plate_recognizer_config');
  if (saved) {
    try { return JSON.parse(saved); } catch (e) { /* fallback */ }
  }
  return {
    provider: 'plate_recognizer',
    api_key: localStorage.getItem('gestarian_plate_recognizer_key') || '',
    endpoint_url: 'https://api.platerecognizer.com/v1/plate-reader/',
    status: 'disconnected'
  };
}

/**
 * Normaliza cualquier texto de matrícula al formato estándar español (ej. "1234BBB" o "1234 BBB")
 */
export function normalizeSpanishPlate(rawPlate: string): string {
  const extracted = extractMatricula(rawPlate);
  if (extracted) return extracted;

  const clean = rawPlate.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (clean.length >= 7) {
    return `${clean.slice(0, 4)} ${clean.slice(4, 7)}`;
  }
  return clean;
}

export async function testPlateRecognizerConnection(config: PlateRecognizerConfig): Promise<{ success: boolean; message: string }> {
  if (!config.api_key || config.api_key.trim() === '') {
    return { success: false, message: 'Se requiere la API Key de Plate Recognizer.' };
  }

  try {
    const response = await fetch(config.endpoint_url || 'https://api.platerecognizer.com/v1/plate-reader/', {
      method: 'GET',
      headers: {
        'Authorization': `Token ${config.api_key}`
      }
    });
    
    // Plate recognizer devuelve 405 en GET pero confirma validez del token si no es 401/403
    if (response.status === 401 || response.status === 403) {
      return { success: false, message: 'API Key no válida o cuota agotada en Plate Recognizer.' };
    }

    return { success: true, message: 'Conexión con Plate Recognizer verificada correctamente.' };
  } catch (error: any) {
    return { success: false, message: error?.message || 'Error al conectar con Plate Recognizer.' };
  }
}

/**
 * Reconoce la matrícula de un vehículo mediante fotografía enviada a Plate Recognizer
 */
export async function recognizeVehiclePlate(imageBlobOrUrl: Blob | string): Promise<PlateRecognitionResult> {
  const config = getPlateRecognizerConfig();
  const timestamp = new Date().toISOString();

  if (!config.api_key) {
    return {
      success: false,
      fecha_hora: timestamp,
      error_message: 'Plate Recognizer no está configurado. Introduce la matrícula manualmente.'
    };
  }

  try {
    const formData = new FormData();
    if (imageBlobOrUrl instanceof Blob) {
      formData.append('upload', imageBlobOrUrl, 'vehiculo.jpg');
    } else {
      formData.append('upload_url', imageBlobOrUrl);
    }
    formData.append('regions', 'es'); // Región España

    const response = await fetch(config.endpoint_url || 'https://api.platerecognizer.com/v1/plate-reader/', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${config.api_key}`
      },
      body: formData
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      return {
        success: false,
        fecha_hora: timestamp,
        error_message: errJson.detail || `Error Plate Recognizer (HTTP ${response.status}). Permite entrada manual.`
      };
    }

    const data = await response.json();
    const result = data.results?.[0];

    if (!result || !result.plate) {
      return {
        success: false,
        fecha_hora: timestamp,
        error_message: 'No se detectó ninguna matrícula clara en la fotografía.'
      };
    }

    const rawPlate = result.plate.toUpperCase();
    const normalized = normalizeSpanishPlate(rawPlate);

    return {
      success: true,
      matricula: rawPlate,
      matricula_normalizada: normalized,
      confidence: Math.round((result.score || 0) * 100),
      fecha_hora: timestamp
    };
  } catch (error: any) {
    console.error('Plate Recognizer error:', error);
    return {
      success: false,
      fecha_hora: timestamp,
      error_message: 'Error de comunicación con Plate Recognizer. Puedes escribir la matrícula manualmente.'
    };
  }
}
