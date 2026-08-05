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
    // Configurar voz más agradable y natural
    utterance.rate = 1.05 // Un poco más rápido para fluidez
    utterance.pitch = 1.1 // Ligeramente más agudo para sonar menos robótico

    // Buscar voces naturales, preferiblemente femeninas
    const voices = window.speechSynthesis.getVoices()
    
    // Primero filtramos SÓLO las voces que sean explícitamente en español (es-ES, es-US, es-MX, etc)
    const spanishVoices = voices.filter(v => v.lang.toLowerCase().startsWith('es'))
    
    // 1. Priorizar voces online/naturales españolas de España o neutrales (Microsoft Elena/Laura Online, Google español)
    let esVoice = spanishVoices.find(v => 
      v.name.includes('Online') || 
      v.name.includes('Natural') || 
      v.name.includes('Google español')
    )
    
    // 2. Si no hay online, usar voces femeninas estándar (Elena, Laura, Monica, Helena)
    if (!esVoice) {
      esVoice = spanishVoices.find(v => 
        v.name.includes('Elena') || 
        v.name.includes('Laura') || 
        v.name.includes('Monica') || 
        v.name.includes('Helena')
      )
    }
    
    // 3. Fallback a la primera voz en español que encontremos (para evitar que agarre voces inglesas u orientales)
    if (!esVoice && spanishVoices.length > 0) {
      esVoice = spanishVoices[0]
    }

    if (esVoice) {
      utterance.voice = esVoice
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
