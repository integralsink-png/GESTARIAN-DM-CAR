import { useState, useCallback, useEffect, useRef } from 'react'

export function useSpeechSynthesis() {
  const [speaking, setSpeaking] = useState(false)
  const [supported, setSupported] = useState(true)
  const currentAudioRef = useRef<HTMLAudioElement | null>(null)
  // Resolver de la promesa TTS activa: se invoca con false si se cancela
  // (stop() o nuevo speak()) para que el encadenado de fuentes no se bloquee
  // esperando para siempre un evento que ya no llegará.
  const pendingResolveRef = useRef<((ok: boolean) => void) | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') {
      setSupported(false)
    }
  }, [])

  // Chrome carga la lista de voces de forma asíncrona. Forzamos la carga y nos
  // suscribimos a 'voiceschanged' para tener disponibles las voces es-ES cuando
  // haga falta (sin esto, la primera frase puede salir con la voz por defecto).
  // NOTA: algunos WebViews/navegadores antiguos no implementan addEventListener
  // ni toleran getVoices sin try/catch: sin estas guardias el hook reventaba y
  // rompía METIS entero.
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.getVoices()
        const handler = () => {
          try { window.speechSynthesis.getVoices() } catch (e) { /* ignorar */ }
        }
        if (typeof window.speechSynthesis.addEventListener === 'function') {
          window.speechSynthesis.addEventListener('voiceschanged', handler)
          return () => {
            try {
              if (typeof window.speechSynthesis.removeEventListener === 'function') {
                window.speechSynthesis.removeEventListener('voiceschanged', handler)
              }
            } catch (e) { /* ignorar */ }
          }
        }
      } catch (e) {
        // El navegador no soporta la precarga de voces: se usará la voz por defecto
      }
    }
  }, [])

  // 1. Fallback Web Speech API (Nativo del navegador con filtro estricto es-ES)
  const speakWebSpeech = useCallback((text: string, onEnd?: () => void) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      if (onEnd) onEnd()
      return
    }

    try {
      window.speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'es-ES'
      utterance.rate = 1.0
      utterance.pitch = 1.0
      utterance.volume = 1.0

      const allVoices = window.speechSynthesis.getVoices()
      // Filtrar estrictamente voces en español de España (es-ES) o español
      const spanishVoices = allVoices.filter((v) => {
        const lang = v.lang.toLowerCase()
        const name = v.name.toLowerCase()
        // Excluir cualquier voz asiática o no castellana
        if (name.includes('chinese') || name.includes('mandarin') || name.includes('cantonese') || lang.startsWith('zh') || lang.startsWith('ja') || lang.startsWith('ko')) {
          return false
        }
        return lang.includes('es')
      })

      const bestVoice =
        spanishVoices.find((v) => v.lang.toLowerCase() === 'es-es' || v.lang.toLowerCase() === 'es_es') ||
        spanishVoices.find((v) => {
          const name = v.name.toLowerCase()
          return name.includes('spain') || name.includes('españ') || name.includes('helena') || name.includes('laura') || name.includes('monica') || name.includes('jorge') || name.includes('google español')
        }) ||
        spanishVoices[0]

      if (bestVoice) {
        utterance.voice = bestVoice
      }

      utterance.onstart = () => setSpeaking(true)
      utterance.onend = () => {
        setSpeaking(false)
        if (onEnd) onEnd()
      }
      utterance.onerror = () => {
        setSpeaking(false)
        if (onEnd) onEnd()
      }

      window.speechSynthesis.speak(utterance)
    } catch (e) {
      setSpeaking(false)
      if (onEnd) onEnd()
    }
  }, [])

  // Reproduce un audio TTS devolviendo true si llega al final sin errores
  // (CORS, CAPTCHA, bloqueo de red...). Así podemos encadenar varias fuentes.
  // Incluye un timeout de 12s: si la fuente no arranca ni falla (red colgada,
  // servidor que no responde), se resuelve con false y se prueba la siguiente.
  const playTtsAudio = useCallback((url: string): Promise<boolean> => {
    return new Promise((resolve) => {
      let done = false
      let timeoutId: ReturnType<typeof setTimeout> | undefined

      const finish = (ok: boolean) => {
        if (done) return
        done = true
        if (pendingResolveRef.current === finish) pendingResolveRef.current = null
        if (timeoutId) clearTimeout(timeoutId)
        setSpeaking(false)
        currentAudioRef.current = null
        resolve(ok)
      }

      timeoutId = setTimeout(() => finish(false), 12000)
      // El resolver se guarda para poder cancelar la promesa desde stop()/speak()
      pendingResolveRef.current = finish

      try {
        const audio = new Audio(url)
        currentAudioRef.current = audio
        audio.playbackRate = 1.0
        audio.onplay = () => setSpeaking(true)
        audio.onended = () => finish(true)
        audio.onerror = () => finish(false)
        audio.play().catch(() => finish(false))
      } catch {
        finish(false)
      }
    })
  }, [])

  // 2. Voz Principal: TTS en castellano natural (Google es-ES) con dos fuentes:
  //    - translate.google.com (voz clásica, cada vez más restringida)
  //    - api.streamelements.com (proxy del mismo TTS de Google, voz es-ES-Standard-A)
  //    Si ambas fallan, se usa la Web Speech API nativa con filtro estricto es-ES.
  const speak = useCallback(async (text: string, onEnd?: () => void) => {
    if (typeof window === 'undefined' || !text.trim()) return

    // Detener cualquier reproducción previa
    if (currentAudioRef.current) {
      currentAudioRef.current.pause()
      currentAudioRef.current = null
    }
    // Resolver con false la promesa TTS pendiente para no dejar el flujo esperando
    if (pendingResolveRef.current) {
      pendingResolveRef.current(false)
      pendingResolveRef.current = null
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }

    // Limpiar caracteres especiales y formatear moneda para pronunciación castellana perfecta
    const cleanText = text
      .replace(/[*_~#`]/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/•/g, '')
      .replace(/(\d+)[.,](\d+)\s*€/g, '$1 euros con $2 céntimos')
      .replace(/(\d+)\s*€/g, '$1 euros')
      .trim()

    if (!cleanText) return

    // El TTS de Google tiene un límite de ~200 caracteres: los textos más largos
    // se hablan con el motor Web Speech nativo (sin límite) para no cortarse.
    if (cleanText.length > 200) {
      speakWebSpeech(cleanText, onEnd)
      return
    }

    try {
      const encoded = encodeURIComponent(cleanText)
      const fuentes = [
        `https://translate.google.com/translate_tts?ie=UTF-8&tl=es-ES&client=tw-ob&q=${encoded}`,
        `https://api.streamelements.com/kappa/v2/speech?voice=es-ES-Standard-A&text=${encoded}`
      ]
      for (const url of fuentes) {
        if (await playTtsAudio(url)) {
          onEnd?.()
          return
        }
      }
      // Ninguna fuente externa disponible: motor Web Speech con filtro es-ES
      speakWebSpeech(cleanText, onEnd)
    } catch (err) {
      speakWebSpeech(cleanText, onEnd)
    }
  }, [playTtsAudio, speakWebSpeech])

  const stop = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause()
      currentAudioRef.current = null
    }
    // Cancelar la promesa TTS pendiente (si no, el for de fuentes quedaría
    // esperando un onended que nunca llega tras el pause).
    if (pendingResolveRef.current) {
      pendingResolveRef.current(false)
      pendingResolveRef.current = null
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    setSpeaking(false)
  }, [])

  return { speak, stop, speaking, supported }
}
