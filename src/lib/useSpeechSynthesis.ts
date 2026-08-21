import { useState, useCallback, useEffect, useRef } from 'react'

export function useSpeechSynthesis() {
  const [speaking, setSpeaking] = useState(false)
  const [supported, setSupported] = useState(true)
  const currentAudioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') {
      setSupported(false)
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

  // 2. Voz Principal: Google Native Spanish TTS (Voz 100% natural castellana de España)
  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (typeof window === 'undefined' || !text.trim()) return

    // Detener cualquier reproducción previa
    if (currentAudioRef.current) {
      currentAudioRef.current.pause()
      currentAudioRef.current = null
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

    // Intentar reproducir con Voz Humana Castellana de Google
    try {
      // Google TTS tiene un límite de ~200 caracteres: los textos más largos
      // se hablan con el motor Web Speech nativo (sin límite) para no cortarse.
      if (cleanText.length > 200) {
        speakWebSpeech(cleanText, onEnd)
        return
      }
      const shortText = cleanText
      const encoded = encodeURIComponent(shortText)
      const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=es-ES&client=tw-ob&q=${encoded}`
      
      const audio = new Audio(ttsUrl)
      audio.playbackRate = 1.05
      currentAudioRef.current = audio

      audio.onplay = () => setSpeaking(true)
      audio.onended = () => {
        setSpeaking(false)
        currentAudioRef.current = null
        if (onEnd) onEnd()
      }

      audio.onerror = () => {
        // Si hay un bloqueo de CORS u offline, usar el motor Web Speech con filtro es-ES
        speakWebSpeech(cleanText, onEnd)
      }

      audio.play().catch(() => {
        // Fallback a Web Speech API
        speakWebSpeech(cleanText, onEnd)
      })
    } catch (err) {
      speakWebSpeech(cleanText, onEnd)
    }
  }, [speakWebSpeech])

  const stop = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause()
      currentAudioRef.current = null
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    setSpeaking(false)
  }, [])

  return { speak, stop, speaking, supported }
}
