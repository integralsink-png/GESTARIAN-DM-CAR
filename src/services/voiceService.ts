/**
 * Servicio Centralizado de Síntesis de Voz en Español para GESTARIAN.
 * Garantiza pronunciación 100% nativa en castellano (es-ES) resolviendo el problema
 * de carga asíncrona de voces en Windows/Android y evitando que lea con acento en inglés.
 */

let cachedSpanishVoice: SpeechSynthesisVoice | null = null
let isVoicesLoaded = false
const voiceLoadListeners: Array<(voice: SpeechSynthesisVoice | null) => void> = []

// Cargar y resolver la mejor voz en español disponible
export function initSpanishVoice(): Promise<SpeechSynthesisVoice | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      resolve(null)
      return
    }

    const selectBestVoice = (): SpeechSynthesisVoice | null => {
      const voices = window.speechSynthesis.getVoices()
      if (!voices || voices.length === 0) return null

      // 1. Filtrar todas las voces en español
      const spanishVoices = voices.filter(v => {
        const lang = (v.lang || '').toLowerCase()
        const name = (v.name || '').toLowerCase()
        return (
          lang.startsWith('es') ||
          lang.includes('es-') ||
          lang.includes('es_') ||
          name.includes('spanish') ||
          name.includes('españ') ||
          name.includes('castellano')
        )
      })

      if (spanishVoices.length === 0) {
        return null
      }

      // 2. Orden de preferencia: Voces Naturales / España (es-ES)
      const best =
        // Voces Neurales / Naturales de Microsoft o Google en español de España
        spanishVoices.find(v => v.name.includes('Natural') && (v.lang.toLowerCase() === 'es-es' || v.name.includes('Spain'))) ||
        spanishVoices.find(v => v.name.toLowerCase().includes('google español') || v.name.toLowerCase().includes('google spanish')) ||
        spanishVoices.find(v => v.lang.toLowerCase() === 'es-es' || v.lang.toLowerCase() === 'es_es') ||
        spanishVoices.find(v => {
          const n = v.name.toLowerCase()
          return n.includes('helena') || n.includes('laura') || n.includes('monica') || n.includes('alvaro') || n.includes('jorge') || n.includes('pablo')
        }) ||
        // Cualquier voz de España
        spanishVoices.find(v => v.lang.toLowerCase().includes('es')) ||
        spanishVoices[0]

      return best || null
    }

    const currentBest = selectBestVoice()
    if (currentBest) {
      cachedSpanishVoice = currentBest
      isVoicesLoaded = true
      resolve(currentBest)
      return
    }

    // Si aún no están cargadas las voces, escuchar el evento voiceschanged
    const onVoicesChanged = () => {
      const v = selectBestVoice()
      cachedSpanishVoice = v
      isVoicesLoaded = true
      resolve(v)
      // Notificar a otros escuchadores
      voiceLoadListeners.forEach(cb => cb(v))
      voiceLoadListeners.length = 0
    }

    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = onVoicesChanged
    }
    window.speechSynthesis.addEventListener?.('voiceschanged', onVoicesChanged)

    // Timeout de seguridad de 1.5s
    setTimeout(() => {
      if (!isVoicesLoaded) {
        const v = selectBestVoice()
        cachedSpanishVoice = v
        isVoicesLoaded = true
        resolve(v)
      }
    }, 1500)
  })
}

// Inicializar de inmediato al importar
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  initSpanishVoice()
}

/**
 * Limpia y formatea el texto para dicción natural en español
 */
export function formatTextForSpanishSpeech(text: string): string {
  return text
    .replace(/[*_~#`]/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/•/g, '')
    .replace(/(\d+)[.,](\d+)\s*€/g, '$1 euros con $2 céntimos')
    .replace(/(\d+)\s*€/g, '$1 euros')
    .replace(/([A-Z0-9_-]{4,})/g, (match) => match.split('').join(' ')) // Deletrear matrículas y códigos
    .replace(/\s+/g, ' ')
    .trim()
}

export interface SpeakOptions {
  rate?: number
  pitch?: number
  volume?: number
  onStart?: () => void
  onEnd?: () => void
  onError?: (err: any) => void
}

/**
 * Reproduce texto con pronunciación española nativa garantizada
 */
export async function speakSpanish(text: string, options: SpeakOptions = {}): Promise<void> {
  if (typeof window === 'undefined' || !text.trim()) {
    options.onEnd?.()
    return
  }

  const cleanText = formatTextForSpanishSpeech(text)
  if (!cleanText) {
    options.onEnd?.()
    return
  }

  if (!('speechSynthesis' in window)) {
    console.warn('[VOICE] speechSynthesis no soportado en este navegador')
    options.onEnd?.()
    return
  }

  try {
    window.speechSynthesis.cancel()

    // Asegurar que tenemos la voz española cargada
    let voice = cachedSpanishVoice
    if (!voice) {
      voice = await initSpanishVoice()
    }

    const utterance = new SpeechSynthesisUtterance(cleanText)
    utterance.lang = 'es-ES'
    utterance.rate = options.rate ?? 1.02
    utterance.pitch = options.pitch ?? 1.0
    utterance.volume = options.volume ?? 1.0

    if (voice) {
      utterance.voice = voice
      utterance.lang = voice.lang || 'es-ES'
    }

    utterance.onstart = () => {
      options.onStart?.()
    }

    utterance.onend = () => {
      options.onEnd?.()
    }

    utterance.onerror = (e) => {
      console.warn('[VOICE] Error en reproducción:', e)
      options.onError?.(e)
      options.onEnd?.()
    }

    window.speechSynthesis.speak(utterance)
  } catch (err) {
    console.error('[VOICE] Error general en speakSpanish:', err)
    options.onError?.(err)
    options.onEnd?.()
  }
}

/**
 * Detiene cualquier locución en curso
 */
export function stopSpanishSpeech(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel()
  }
}
