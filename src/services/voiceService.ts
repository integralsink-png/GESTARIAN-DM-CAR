/**
 * Servicio Centralizado de Síntesis de Voz en Español (es-ES) para GESTARIAN.
 * Garantiza pronunciación 100% nativa en castellano de España en móviles (Android Chrome, iOS Safari) y PC.
 * Resuelve el fallo en móviles donde se cargaban voces multilingües erróneas o con fonemas en chino/inglés.
 */

let cachedSpanishVoice: SpeechSynthesisVoice | null = null
let isVoicesLoaded = false
const voiceLoadListeners: Array<(voice: SpeechSynthesisVoice | null) => void> = []

// Filtro estricto para descartar voces asiáticas o anglosajonas que tengan "es" accidental
function isStrictlySpanishVoice(v: SpeechSynthesisVoice): boolean {
  const lang = (v.lang || '').toLowerCase().replace(/_/g, '-')
  const name = (v.name || '').toLowerCase()

  // Descartar explícitamente idiomas no españoles
  if (
    lang.startsWith('en') ||
    lang.startsWith('zh') ||
    lang.startsWith('ja') ||
    lang.startsWith('ko') ||
    lang.startsWith('de') ||
    lang.startsWith('fr') ||
    lang.startsWith('it') ||
    lang.startsWith('ru') ||
    lang.startsWith('ar')
  ) {
    return false
  }

  // Comprobar coincidencia positiva de español
  const isEsLang = lang.startsWith('es') || lang.includes('es-') || lang.includes('spa')
  const isEsName =
    name.includes('español') ||
    name.includes('spanish') ||
    name.includes('castellano') ||
    name.includes('spain') ||
    name.includes('monica') ||
    name.includes('mónica') ||
    name.includes('jorge') ||
    name.includes('helena') ||
    name.includes('laura') ||
    name.includes('alvaro') ||
    name.includes('pablo') ||
    name.includes('paulina') ||
    name.includes('lucia') ||
    name.includes('lucía') ||
    name.includes('enrique')

  return isEsLang || isEsName
}

// Cargar y resolver la mejor voz en español de España disponible
export function initSpanishVoice(): Promise<SpeechSynthesisVoice | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      resolve(null)
      return
    }

    const selectBestVoice = (): SpeechSynthesisVoice | null => {
      const voices = window.speechSynthesis.getVoices()
      if (!voices || voices.length === 0) return null

      // 1. Filtrar únicamente voces hispanohablantes válidas
      const spanishVoices = voices.filter(isStrictlySpanishVoice)

      if (spanishVoices.length === 0) {
        return null
      }

      // 2. Jerarquía de selección priorizando Español de España (es-ES)
      const best =
        // Voces de España específicas (Google español España / Microsoft Natural Spain)
        spanishVoices.find(v => {
          const l = (v.lang || '').toLowerCase().replace(/_/g, '-')
          const n = v.name.toLowerCase()
          return (l === 'es-es' || n.includes('spain') || n.includes('españa')) && (n.includes('natural') || n.includes('google') || n.includes('premium'))
        }) ||
        spanishVoices.find(v => {
          const l = (v.lang || '').toLowerCase().replace(/_/g, '-')
          return l === 'es-es'
        }) ||
        spanishVoices.find(v => {
          const n = v.name.toLowerCase()
          return n.includes('google español') || n.includes('google spanish')
        }) ||
        spanishVoices.find(v => {
          const n = v.name.toLowerCase()
          return n.includes('helena') || n.includes('laura') || n.includes('monica') || n.includes('mónica') || n.includes('jorge') || n.includes('alvaro') || n.includes('pablo') || n.includes('paulina')
        }) ||
        // Cualquier voz en español
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

    // Escuchar el evento de carga de voces en móvil (Android / iOS)
    const onVoicesChanged = () => {
      const v = selectBestVoice()
      if (v) {
        cachedSpanishVoice = v
        isVoicesLoaded = true
        resolve(v)
        voiceLoadListeners.forEach(cb => cb(v))
        voiceLoadListeners.length = 0
      }
    }

    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = onVoicesChanged
    }
    window.speechSynthesis.addEventListener?.('voiceschanged', onVoicesChanged)

    // Intentos periódicos en los primeros 1.5s para navegadores móviles con carga asíncrona
    let attempts = 0
    const interval = setInterval(() => {
      attempts++
      const v = selectBestVoice()
      if (v || attempts > 10) {
        clearInterval(interval)
        if (v) {
          cachedSpanishVoice = v
          isVoicesLoaded = true
        }
        resolve(v)
      }
    }, 150)
  })
}

// Inicializar de inmediato al cargar el módulo
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  initSpanishVoice()
}

/**
 * Limpia y formatea el texto para dicción 100% natural en español de España
 */
export function formatTextForSpanishSpeech(text: string): string {
  return text
    .replace(/[*_~#`]/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/•/g, '')
    .replace(/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af]/g, '') // Eliminar caracteres asiáticos si los hubiera
    .replace(/(\d+)[.,](\d+)\s*€/g, '$1 euros con $2 céntimos')
    .replace(/(\d+)\s*€/g, '$1 euros')
    .replace(/([A-Z0-9_-]{4,})/g, (match) => match.split('').join(' ')) // Deletrear matrículas
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

    // 1. Resolver la voz española si aún no está en cache
    let voice = cachedSpanishVoice
    if (!voice) {
      voice = await initSpanishVoice()
    }

    const utterance = new SpeechSynthesisUtterance(cleanText)
    
    // Forzar siempre español de España
    utterance.lang = 'es-ES'
    utterance.rate = options.rate ?? 1.0
    utterance.pitch = options.pitch ?? 1.0
    utterance.volume = options.volume ?? 1.0

    // Solo asignar el objeto voice si está explícitamente verificado como español
    if (voice && isStrictlySpanishVoice(voice)) {
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
      console.warn('[VOICE] Evento de finalización/error TTS:', e)
      options.onError?.(e)
      options.onEnd?.()
    }

    // Workaround para Android Chrome y Safari móvil: reanudar síntesis si está en pausa
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume()
    }

    window.speechSynthesis.speak(utterance)
  } catch (err) {
    console.error('[VOICE] Error en speakSpanish:', err)
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

