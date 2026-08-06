import { useState, useCallback, useEffect } from 'react'

export function useSpeechSynthesis() {
  const [speaking, setSpeaking] = useState(false)
  const [supported, setSupported] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setSupported(false)
    }
  }, [])

  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return

    window.speechSynthesis.cancel() // Stop any current speech

    // Clean markdown/symbols for clean audio reading
    const cleanText = text
      .replace(/[*_~#`]/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/•/g, '')
      .replace(/(\d+)[.,](\d+)\s*€/g, '$1 euros con $2')
      .replace(/(\d+)\s*€/g, '$1 euros')

    const utterance = new SpeechSynthesisUtterance(cleanText)
    utterance.lang = 'es-ES'
    // Ajustes más naturales y comprensibles
    utterance.rate = 1.0
    utterance.pitch = 1.0
    utterance.volume = 1.0

    const voices = window.speechSynthesis.getVoices()
    const spanishVoices = voices.filter((v) => v.lang.toLowerCase().startsWith('es'))

    const preferredVoice = spanishVoices.find((v) => {
      const name = v.name.toLowerCase()
      return (
        name.includes('espa') ||
        name.includes('spanish') ||
        name.includes('elena') ||
        name.includes('laura') ||
        name.includes('monica') ||
        name.includes('lucia') ||
        name.includes('sofia') ||
        name.includes('isabel') ||
        name.includes('celia') ||
        name.includes('natalia') ||
        name.includes('paola') ||
        name.includes('anna')
      )
    }) || spanishVoices[0]

    if (preferredVoice) {
      utterance.voice = preferredVoice
    }

    utterance.onstart = () => setSpeaking(true)
    utterance.onend = () => {
      setSpeaking(false)
      if (onEnd) onEnd()
    }
    utterance.onerror = () => setSpeaking(false)

    window.speechSynthesis.speak(utterance)
  }, [])

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      setSpeaking(false)
    }
  }, [])

  return { speak, stop, speaking, supported }
}
