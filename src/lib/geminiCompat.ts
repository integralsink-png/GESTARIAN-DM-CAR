/**
 * Compatibilidad con modelos Gemini.
 *
 * Los modelos Gemini 1.0 (gemini-pro, gemini-pro-vision, gemini-1.0-*) NO
 * soportan los campos `systemInstruction` ni `responseMimeType`: si se envían,
 * el API responde HTTP 400 y METIS / el Ayudante IA dejan de responder (o caen
 * al motor básico). Esta función indica si un modelo soporta esos campos para
 * poder enviarlos o, en su lugar, incrustar la instrucción de sistema dentro del
 * mensaje de usuario (formato legacy que funciona en todos los modelos).
 */
export function geminiSupportsSystemInstruction(model: string): boolean {
  const m = (model || '').toLowerCase().trim()
  if (!m) return true // sin modelo configurado: asumir soporte
  if (m === 'gemini-pro' || m === 'gemini-pro-vision') return false
  if (m.startsWith('gemini-1.0')) return false
  return true
}
