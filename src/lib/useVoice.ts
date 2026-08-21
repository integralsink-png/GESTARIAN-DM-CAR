import { useState, useRef, useCallback, useEffect } from 'react'

interface SpeechRecognitionResultItem {
  transcript: string
}

interface SpeechRecognitionResult {
  length: number
  [index: number]: SpeechRecognitionResultItem
  isFinal: boolean
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number
  results: {
    length: number
    [index: number]: SpeechRecognitionResult
  }
}

interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start: () => void
  stop: () => void
  abort: () => void
  onstart: (() => void) | null
  onresult: ((e: SpeechRecognitionEvent) => void) | null
  onend: (() => void) | null
  onerror: ((e: any) => void) | null
}

function getRecognition(): SpeechRecognitionLike | null {
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  return SR ? new SR() : null
}

export type MicPermission = 'granted' | 'denied' | 'unknown'

function describeRecognitionError(code: string): string {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'No tengo permiso para usar el micrófono: el navegador lo ha bloqueado. Pulsa el botón "Activar micrófono" para abrir los ajustes y permitirlo.'
    case 'audio-capture':
      return 'No se ha encontrado ningún micrófono. Comprueba que tienes uno conectado, activado y sin cubrir.'
    case 'network':
      return 'El reconocimiento de voz necesita conexión a internet. Revisa tu red e inténtalo de nuevo.'
    case 'no-speech':
      return 'No he detectado ninguna voz. Acércate al micrófono y vuelve a intentarlo.'
    case 'aborted':
      return 'Reconocimiento de voz cancelado.'
    default:
      return `El micrófono ha fallado (${code}). Usa Google Chrome, Edge o Safari y comprueba que la página se sirve por HTTPS.`
  }
}

/**
 * Detección real de soporte de getUserMedia en el navegador.
 * Se usa typeof en vez de una referencia directa para que el compilador no
 * marque la condición como "siempre true" y para que falle limpio en
 * navegadores antiguos/WebViews sin mediaDevices.
 */
function canRequestMicPermission(): boolean {
  return typeof navigator !== 'undefined' &&
    typeof navigator.mediaDevices?.getUserMedia === 'function'
}

/**
 * Devuelve la URL de ajustes más adecuada para activar el micrófono según
 * el sistema operativo / navegador. Se usa cuando el permiso está bloqueado
 * para llevar al usuario directo a la pantalla donde puede activarlo.
 * Devuelve '' cuando no existe un enlace directo (p. ej. iOS).
 */
export function getMicSettingsUrl(): string {
  if (typeof navigator === 'undefined') return 'chrome://settings/content/microphone'
  const ua = navigator.userAgent
  if (/Windows/i.test(ua)) return 'ms-settings:privacy-microphone'
  if (/Macintosh|Mac OS X/i.test(ua)) return 'x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone'
  if (/Android/i.test(ua)) return 'chrome://settings/content/microphone'
  if (/iPhone|iPad|iPod/i.test(ua)) return ''
  if (/Edg\//i.test(ua)) return 'edge://settings/content/microphone'
  if (/Firefox/i.test(ua)) return 'about:preferences#privacy'
  return 'chrome://settings/content/microphone'
}

export function useVoice() {
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interim, setInterim] = useState('')
  const [supported, setSupported] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [permissionDenied, setPermissionDenied] = useState(false)
  // true mientras se está pidiendo el permiso de micrófono (pregunta del navegador en pantalla)
  const [pending, setPending] = useState(false)
  const pendingRef = useRef(false)
  const setPendingState = useCallback((v: boolean) => {
    pendingRef.current = v
    setPending(v)
  }, [])
  const recRef = useRef<SpeechRecognitionLike | null>(null)
  const finalRef = useRef('')

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { setSupported(false) }
  }, [])

  const initRecognition = useCallback((): SpeechRecognitionLike | null => {
    // Reutilizamos la misma instancia para evitar condiciones de carrera
    if (recRef.current) return recRef.current

    const r = getRecognition()
    if (!r) { setSupported(false); return null }
    r.lang = 'es-ES'
    // En móviles (iOS Safari / Android Chrome), continuous: true a veces cuelga el reconocedor o no emite eventos
    const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    r.continuous = !isMobile
    r.interimResults = true
    r.maxAlternatives = 1

    r.onstart = () => setListening(true)

    r.onresult = (e: SpeechRecognitionEvent) => {
      let interimTranscript = ''
      let finalTranscript = finalRef.current

      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i]
        const text = result[0]?.transcript || ''
        if (result.isFinal) {
          finalTranscript = `${finalTranscript}${finalTranscript ? ' ' : ''}${text}`.trim()
          finalRef.current = finalTranscript
        } else {
          interimTranscript += text
        }
      }

      setTranscript(`${finalTranscript}${interimTranscript ? ' ' + interimTranscript : ''}`.trim())
      setInterim(interimTranscript.trim())
    }
    r.onend = () => {
      setListening(false)
      setInterim('')
      setTranscript(finalRef.current)
    }
    r.onerror = (e: any) => {
      setListening(false)
      setInterim('')
      const code = e?.error || 'unknown'
      if (code === 'not-allowed' || code === 'service-not-allowed') {
        setPermissionDenied(true)
      }
      setError(describeRecognitionError(code))
    }
    recRef.current = r
    return r
  }, [])

  /**
   * Pide permiso de micrófono de forma explícita mediante la API nativa del
   * navegador (getUserMedia). Así aparece la pregunta "¿Permitir usar el
   * micrófono?" con los botones Permitir/Bloquear. Si ya está concedido,
   * vuelve al instante sin molestar.
   */
  const requestPermission = useCallback(async (): Promise<MicPermission> => {
    if (!canRequestMicPermission()) {
      setError('Este navegador no permite pedir permiso de micrófono desde la página. Usa Google Chrome, Edge o Safari por HTTPS.')
      setPermissionDenied(false)
      return 'unknown'
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      // Solo nos interesaba el permiso: soltamos el micrófono para que lo use el reconocedor de voz
      stream.getTracks().forEach(t => t.stop())
      setPermissionDenied(false)
      setError(null)
      return 'granted'
    } catch (err: any) {
      const name = err?.name || ''
      if (/NotAllowedError|PermissionDeniedError/i.test(name)) {
        setPermissionDenied(true)
        setError('No tengo permiso para usar el micrófono: el navegador lo ha bloqueado. Pulsa el botón "Activar micrófono" para abrir los ajustes y permitirlo.')
        return 'denied'
      }
      if (/NotFoundError|DevicesNotFoundError/i.test(name)) {
        setError('No se ha encontrado ningún micrófono. Comprueba que tienes uno conectado, activado y sin cubrir.')
        return 'unknown'
      }
      if (/NotReadableError|TrackStartError/i.test(name)) {
        setError('El micrófono está bloqueado o siendo usado por otra aplicación. Ciérralo y vuelve a intentarlo, o revisa los ajustes de privacidad del sistema.')
        return 'unknown'
      }
      setError('No se ha podido acceder al micrófono. Pulsa el botón "Activar micrófono" para abrir los ajustes.')
      return 'unknown'
    }
  }, [])

  const start = useCallback(async () => {
    finalRef.current = ''
    setTranscript('')
    setInterim('')
    setError(null)
    setPermissionDenied(false)

    const r = initRecognition()
    if (!r) {
      setError('El reconocimiento de voz no está soportado en este navegador. Usa Google Chrome, Edge o Safari.')
      return
    }

    // Antes de activar el reconocedor aseguramos el permiso de forma explícita:
    // así el navegador muestra la pregunta y el usuario pulsa "Permitir".
    // Si el permiso está denegado, getUserMedia falla al instante sin pregunta
    // y mostramos el mensaje con el botón que abre los ajustes.
    setPendingState(true)
    try {
      if (canRequestMicPermission()) {
        const perm = await requestPermission()
        if (perm !== 'granted') return
      }

      try {
        r.start()
        setListening(true)
      } catch (err: any) {
        setListening(false)
        setError(
          err?.name === 'InvalidStateError'
            ? 'El micrófono ya estaba activo. Espera un segundo y vuelve a pulsar.'
            : describeRecognitionError(err?.message || 'unknown')
        )
      }
    } finally {
      setPendingState(false)
    }
  }, [initRecognition, requestPermission, setPendingState])

  const stop = useCallback(() => {
    if (!recRef.current) return
    try { recRef.current.stop() } catch {}
    setListening(false)
  }, [])

  const reset = useCallback(() => {
    finalRef.current = ''
    setTranscript('')
    setInterim('')
    setError(null)
  }, [])

  return { listening, transcript, interim, supported, error, permissionDenied, pending, start, stop, reset, requestPermission }
}

const WORD_NUMBERS: Record<string, number> = {
  cero: 0, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5,
  seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12,
  trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17,
  dieciocho: 18, diecinueve: 19, veinte: 20, treinta: 30, cuarenta: 40,
  cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90,
  cien: 100, doscientos: 200, doscientas: 200, trescientos: 300, trescientas: 300,
  cuatrocientos: 400, cuatrocientas: 400, quinientos: 500, quinientas: 500,
  seiscientos: 600, seiscientas: 600, setecientos: 700, setecientas: 700,
  ochocientos: 800, ochocientas: 800, novecientos: 900, novecientas: 900,
  mil: 1000,
}

/**
 * Parse a voice transcript into presupuesto conceptos.
 * Examples it understands (Spanish, spoken):
 *   "cambio de aceite 50 euros"
 *   "frenos delanteros doscientos"
 *   "mano de obra 30 por hora 2 unidades 60"
 *   "diagnóstico 35, revisión general 80"
 * Returns an array of { descripcion, cantidad, precio }.
 */
export function parseVoiceToConceptos(text: string): { descripcion: string; cantidad: number; precio: number }[] {
  if (!text.trim()) return []

  function parseNumber(s: string): number | null {
    s = s.trim().toLowerCase()
    if (!s) return null
    if (/^\d+([.,]\d+)?$/.test(s)) return parseFloat(s.replace(',', '.'))
    let total = 0
    let current = 0
    let found = false
    for (const w of s.split(/\s+/)) {
      if (w in WORD_NUMBERS) {
        const n = WORD_NUMBERS[w]
        if (n === 1000) { current = (current || 1) * 1000; }
        else if (n === 100) { current = (current || 1) * 100; }
        else current += n
        found = true
      } else {
        const m = w.match(/(\d+)/)
        if (m) { current += parseInt(m[1]); found = true }
      }
    }
    total += current
    return found ? total : null
  }

  const cleaned = text
    .replace(/\beuros?\b/gi, '€')
    .replace(/\beuros?\b/gi, '€')
    .replace(/\bpor\b/gi, 'x')
    .replace(/\bunidades?\b/gi, 'u')
    .replace(/\bhora\b/gi, 'h')
    .replace(/\bcon\b/gi, '€ con')

  const lines = cleaned.split(/(?:\by\b|,|;|\.|\n| entonces | también | más | suma | añade | agrega )/i)
    const conceptos: { descripcion: string; cantidad: number; precio: number }[] = []

  for (let line of lines) {
    line = line.trim()
    if (!line) continue

    const priceMatch = line.match(/(-?\d+(?:[.,]\d+)?)\s*€/)
    let precio = 0
    let desc = line

    if (priceMatch) {
      precio = parseFloat(priceMatch[1].replace(',', '.'))
      desc = line.replace(priceMatch[0], '').replace(/€/g, '').trim()
    } else {
      const words = line.split(/\s+/)
      const lastTwo = words.slice(-2).join(' ')
      const lastThree = words.slice(-3).join(' ')
      const pn = parseNumber(lastTwo) ?? parseNumber(lastThree)
      if (pn !== null && words.length > 2) {
        precio = pn
        desc = words.slice(0, -2).join(' ').trim() || words.slice(0, -1).join(' ').trim()
      }
    }

    desc = desc
      .replace(/\s+x\s*\d*\s*$/i, '')
      .replace(/\s+u\s*$/i, '')
      .replace(/\s+h\s*$/i, '')
      .replace(/\s+/g, ' ')
      .trim()

    if (!desc) continue

    const qtyMatch = line.match(/x\s*(\d+(?:[.,]\d+)?)\b/) || line.match(/(\d+(?:[.,]\d+)?)\s*u\b/)
    const cantidad = qtyMatch ? parseFloat(qtyMatch[1].replace(',', '.')) : 1

    conceptos.push({ descripcion: desc, cantidad, precio })
  }

  return conceptos.filter((c) => c.descripcion.length > 1)
}

const LETTER_MAP: Record<string, string> = {
  a: 'A', b: 'B', c: 'C', d: 'D', e: 'E', f: 'F', g: 'G', h: 'H',
  i: 'I', j: 'J', k: 'K', l: 'L', m: 'M', n: 'N', ñ: 'Ñ', o: 'O',
  p: 'P', q: 'Q', r: 'R', s: 'S', t: 'T', u: 'U', v: 'V', w: 'W',
  x: 'X', y: 'Y', z: 'Z',
  alfa: 'A', bravo: 'B', charlie: 'C', delta: 'D', eco: 'E', foxtrot: 'F',
  golf: 'G', hotel: 'H', india: 'I', juliet: 'J', kilo: 'K', lima: 'L',
  mike: 'M', november: 'N', oscar: 'O', papa: 'P', quebec: 'Q', romeo: 'R',
  sierra: 'S', tango: 'T', uniform: 'U', victor: 'V', whisky: 'W',
  xray: 'X', yankee: 'Y', zulu: 'Z',
}

const DIGIT_WORDS: Record<string, string> = {
  cero: '0', uno: '1', una: '1', dos: '2', doh: '2', tres: '3', treh: '3', cuatro: '4', cuatroh: '4',
  cinco: '5', seis: '6', seih: '6', siete: '7', sieteh: '7', ocho: '8', ochoh: '8', nueve: '9', nueveh: '9',
  diez: '10', dieh: '10', veinte: '20', treinta: '30', cuarenta: '40', cincuenta: '50',
  sesenta: '60', setenta: '70', ochenta: '80', noventa: '90', cien: '100', ciento: '100',
}

function normalizeAndalusianText(s: string): string {
  return s
    .replace(/\b(er|el)\b/gi, 'el')
    .replace(/\b(pa|par|pa'|pár)\b/gi, 'para')
    .replace(/\b(to|to'|toa|toas|toah)\b/gi, 'todo')
    .replace(/\b(pisha|illo|quillo|quilla|gachó|compare|compadre)\b/gi, '')
    .replace(/\b(aseite|aceit|aseitillo)\b/gi, 'aceite')
    .replace(/\b(filtroh|filtros|firtroh)\b/gi, 'filtros')
    .replace(/\b(frenoh|frenos)\b/gi, 'frenos')
    .replace(/\b(paragorpe|paragolpeh|parachoques|parachoque)\b/gi, 'paragolpes')
    .replace(/\b(pintao|pintaillo)\b/gi, 'pintar')
    .replace(/\b(arreglao|arreglá|reparao)\b/gi, 'reparar')
    .replace(/\b(cambiao|cambiá)\b/gi, 'cambiar')
    .replace(/\b(haser|hacé)\b/gi, 'hacer')
    .replace(/\b(ar)\s+/gi, 'al ')
    .replace(/\s+/g, ' ')
    .trim()
}

function wordsToDigits(s: string): string {
  const norm = normalizeAndalusianText(s)
  return norm
    .toLowerCase()
    .split(/\s+/)
    .map((w) => {
      const clean = w.replace(/[.,;:]/g, '')
      if (clean in DIGIT_WORDS) return DIGIT_WORDS[clean]
      if (/^\d+$/.test(clean)) return clean
      return w
    })
    .join(' ')
}

function extractDigits(s: string): string {
  const spelled = wordsToDigits(s)
  const matches = spelled.match(/\d/g)
  return matches ? matches.join('') : ''
}

function extractLetter(s: string): string {
  const lower = s.toLowerCase()
  for (const [word, letter] of Object.entries(LETTER_MAP)) {
    const re = new RegExp(`\\b${word}\\b`, 'i')
    if (re.test(lower)) return letter
  }
  const m = s.match(/\b([a-zñA-ZÑ])\b/i)
  return m ? m[1].toUpperCase() : ''
}

function parseSpokenNumber(s: string): number | null {
  s = s.trim().toLowerCase()
  if (!s) return null
  if (/^\d+([.,]\d+)?$/.test(s)) return parseFloat(s.replace(',', '.'))
  let current = 0
  let found = false
  for (const w of s.split(/\s+/)) {
    if (w in WORD_NUMBERS) {
      const n = WORD_NUMBERS[w]
      if (n === 1000) { current = (current || 1) * 1000 }
      else if (n === 100) { current = (current || 1) * 100 }
      else current += n
      found = true
    } else {
      const m = w.match(/(\d+)/)
      if (m) { current += parseInt(m[1]); found = true }
    }
  }
  return found ? current : null
}

export interface ClienteVoiceData {
  nombre: string
  dni: string
  telefono: string
  email: string
  direccion: string
}

/**
 * Parse a voice transcript into client data.
 * Understands spoken Spanish, e.g.:
 *   "Pedro Ruiz González DNI 74373332 letra p"
 *   "tres tres dos tres dos seis cuatro ocho b"
 *   "calle Alfredo Kraus número 12 código postal veintinueve 560 Estación de Cártama Málaga"
 *   "teléfono 600123456 email pedro arroba gmail punto com"
 */
export function parseVoiceToCliente(text: string): Partial<ClienteVoiceData> {
  if (!text.trim()) return {}
  const result: Partial<ClienteVoiceData> = {}
  const lower = text.toLowerCase()

  // Email — handle "arroba" and "punto"
  const emailMatch = lower.match(/([\w.+-]+)\s*(?:arroba|@)\s*([\w.+-]+(?:\s*punto\s*[\w-]+)*)/)
  if (emailMatch) {
    const user = emailMatch[1].replace(/\s+/g, '')
    const domain = emailMatch[2].replace(/\s*punto\s*/g, '.').replace(/\s+/g, '')
    result.email = `${user}@${domain}`
  } else {
    const plainEmail = text.match(/[\w.+-]+@[\w.-]+\.\w+/)
    if (plainEmail) result.email = plainEmail[0]
  }

  // Phone — look for "teléfono" or a sequence of 9 digits
  const phoneSection = lower.match(/tel[ée]fono\s*[:\s]*([\d\s\w]{5,40})/)
  if (phoneSection) {
    const digits = extractDigits(phoneSection[1])
    if (digits.length >= 9) result.telefono = digits.slice(0, 9)
  }
  if (!result.telefono) {
    const digits = extractDigits(text)
    if (digits.length >= 9) result.telefono = digits.slice(0, 9)
  }

  // DNI — look for "DNI" keyword or "letra" pattern
  const dniSection = lower.match(/dni\s*[:\s]*([\d\s\w]{5,30})/)
  if (dniSection) {
    const digits = extractDigits(dniSection[1])
    const letter = extractLetter(dniSection[1])
    if (digits.length >= 7) {
      result.dni = digits.slice(0, 8) + (letter || '')
    }
  }
  if (!result.dni) {
    const letraMatch = lower.match(/letra\s+([a-zñ])/i)
    const digits = extractDigits(text)
    if (digits.length >= 7 && letraMatch) {
      result.dni = digits.slice(0, 8) + letraMatch[1].toUpperCase()
    }
  }

  // Address — look for "calle", "avenida", "plaza", "paseo", "dirección"
  const addrMatch = text.match(/(?:calle|avenida|plaza|paseo|carretera|r[úu]a|direcci[óo]n)\s+([^\n,]+(?:,\s*[^\n,]+)*)/i)
  if (addrMatch) {
    let addr = addrMatch[1].trim()
    // Normalize "número" -> "nº", "código postal" -> "CP"
    addr = addr.replace(/\bn[úu]mero\b/gi, 'nº').replace(/\bn\b(\d+)/gi, 'nº $1')
    addr = addr.replace(/\bc[óo]digo postal\b/gi, 'CP')
    // Convert spelled numbers in "CP veintinueve 560" style
    addr = addr.replace(/CP\s+([\w\s]+?)(?=\s+[A-Z]|$)/gi, (m, p1) => {
      const n = parseSpokenNumber(p1)
      return n !== null ? `CP ${n}` : m
    })
    result.direccion = addr
  }

  // Name — everything before "DNI", "teléfono", "dirección", "calle", "email"
  const stopIdx = lower.search(/\b(dni|tel[ée]fono|direcci[óo]n|calle|avenida|plaza|paseo|email|correo)\b/i)
  if (stopIdx > 0) {
    const namePart = text.slice(0, stopIdx).trim()
    if (namePart.length > 2) result.nombre = namePart.replace(/\s+/g, ' ').trim()
  } else if (!stopIdx || stopIdx === -1) {
    // No keywords found — assume the whole thing is a name if short enough
    const words = text.trim().split(/\s+/)
    if (words.length >= 2 && words.length <= 6) {
      result.nombre = text.trim()
    }
  }

  return result
}
