import { useState, useCallback, useEffect, useRef } from 'react'
import { speakSpanish, stopSpanishSpeech, initSpanishVoice } from '../services/voiceService'

export function useSpeechSynthesis() {
  const [speaking, setSpeaking] = useState(false)
  const [supported, setSupported] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setSupported(false)
    } else {
      initSpanishVoice()
    }
  }, [])

  const speak = useCallback(async (text: string, onEnd?: () => void) => {
    if (typeof window === 'undefined' || !text.trim()) {
      onEnd?.()
      return
    }

    await speakSpanish(text, {
      rate: 1.02,
      pitch: 1.0,
      volume: 1.0,
      onStart: () => setSpeaking(true),
      onEnd: () => {
        setSpeaking(false)
        onEnd?.()
      },
      onError: () => {
        setSpeaking(false)
        onEnd?.()
      }
    })
  }, [])

  const stop = useCallback(() => {
    stopSpanishSpeech()
    setSpeaking(false)
  }, [])

  useEffect(() => {
    return () => {
      stopSpanishSpeech()
    }
  }, [])

  return {
    speak,
    stop,
    speaking,
    supported
  }
}
