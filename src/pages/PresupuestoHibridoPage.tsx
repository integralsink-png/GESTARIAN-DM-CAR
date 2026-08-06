import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Camera, Check, Upload, Mic, ArrowLeft, Send, X, Loader2, PlusCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useSpeechSynthesis } from '../lib/useSpeechSynthesis'
import { useVoice, parseVoiceToConceptos } from '../lib/useVoice'
import { fetchVehicleImages, addVehicleImage } from '../lib/vehicleImages'
import { PageHeader, Button } from '../components/UI'
import { Box, Chip, Stack, TextField, Typography } from '@mui/material'
import { extractTextFromImage } from '../lib/ocrService'
import type { Cliente, Concepto, Vehiculo } from '../lib/types'

const PLATE_PATTERN = /([A-Z0-9]{4,7})/gi

function normalizePlate(value: string) {
  return value.replace(/[^A-Z0-9]/gi, '').toUpperCase()
}

function parsePlateFromText(text: string) {
  const cleaned = text.replace(/\s+/g, '').toUpperCase()
  const candidate = cleaned.match(/\d{4}[A-Z]{3}/) || cleaned.match(/[A-Z0-9]{4,7}/)
  return candidate ? normalizePlate(candidate[0]) : null
}

function formatMoney(value: number) {
  return value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function PresupuestoHibridoPage() {
  const navigate = useNavigate()
  const { speak, supported: ttsSupported } = useSpeechSynthesis()
  const { listening, transcript, interim, supported: sttSupported, start, stop, reset } = useVoice()
  const [phase, setPhase] = useState<'matricula' | 'confirmPlate' | 'burst' | 'cliente' | 'conceptos' | 'review' | 'done'>('matricula')
  const [plateText, setPlateText] = useState('')
  const [manualPlate, setManualPlate] = useState('')
  const [ocrError, setOcrError] = useState<string | null>(null)
  const [cameraOn, setCameraOn] = useState(false)
  const [photos, setPhotos] = useState<string[]>([])
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [clientData, setClientData] = useState<Cliente | null>(null)
  const [vehicleData, setVehicleData] = useState<Vehiculo | null>(null)
  const [clientExists, setClientExists] = useState(false)
  const [clientForm, setClientForm] = useState({
    nombre: '',
    dni: '',
    calle: '',
    numero: '',
    cp: '',
    localidad: '',
    provincia: '',
    telefono: '',
    email: '',
  })
  const [concepto, setConcepto] = useState<Concepto>({ descripcion: '', cantidad: 1, precio: 0 })
  const [conceptos, setConceptos] = useState<Concepto[]>([])
  const [voiceIntent, setVoiceIntent] = useState<'descripcion' | 'cantidad' | 'precio' | 'decision' | 'cliente' | 'none'>('none')
  const [sending, setSending] = useState(false)
  const [whatsappUrl, setWhatsappUrl] = useState('')
  const [smsFeedback, setSmsFeedback] = useState('')
  const [cpLoading, setCpLoading] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const voiceTimerRef = useRef<number | null>(null)

  const total = useMemo(
    () => conceptos.reduce((sum, c) => sum + c.cantidad * c.precio, 0),
    [conceptos],
  )

  const sharedFieldProps = {
    fullWidth: true,
    variant: 'filled' as const,
    InputProps: { sx: { bgcolor: '#111827', color: '#fff', borderRadius: '1rem' } },
    InputLabelProps: { sx: { color: '#94a3b8' } },
  }

  const playSound = useCallback(() => {
    if (typeof window === 'undefined') return

    // Try a simple media file first if available
    try {
      const audio = new Audio('/pistola_neumatica.mp3')
      audio.currentTime = 0
      audio.play().catch(() => {
        // fallback to simple tone if file is unavailable
        if ('AudioContext' in window) {
          const ctx = new AudioContext()
          audioContextRef.current = ctx
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.type = 'triangle'
          osc.frequency.value = 880
          gain.gain.value = 0.06
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.start()
          osc.stop(ctx.currentTime + 0.1)
          osc.onended = () => ctx.close()
        }
      })
    } catch {
      if (typeof window !== 'undefined' && 'AudioContext' in window) {
        const ctx = new AudioContext()
        audioContextRef.current = ctx
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'triangle'
        osc.frequency.value = 880
        gain.gain.value = 0.06
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start()
        osc.stop(ctx.currentTime + 0.1)
        osc.onended = () => ctx.close()
      }
    }
  }, [])

  const startCamera = useCallback(async () => {
    if (cameraOn) return
    setOcrError(null)
    if (!navigator.mediaDevices?.getUserMedia) {
      setOcrError('Tu navegador no soporta la cámara.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => {})
      }
      setCameraOn(true)
    } catch (err: any) {
      setOcrError('No se pudo acceder a la cámara. Revisa permisos o dispositivo.')
    }
  }, [cameraOn])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setCameraOn(false)
  }, [])

  useEffect(() => {
    if (phase === 'matricula') {
      speak('Pulsa iniciar cámara para capturar la matrícula')
    }
    if (phase === 'burst') {
      playSound()
      speak('Sigue subiendo imágenes pulsando el botón de cámara, o di Subir si has terminado')
    }
    if (phase === 'cliente') {
      speak('Incluye los datos del cliente')
    }
    if (phase === 'conceptos') {
      speak('Dicta el concepto o repuesto')
      setVoiceIntent('descripcion')
    }
    if (phase === 'review') {
      speak('Presupuesto generado correctamente. Confírmalo, por favor, para enviar al cliente')
    }
    return () => {
      if (voiceTimerRef.current) {
        window.clearTimeout(voiceTimerRef.current)
        voiceTimerRef.current = null
      }
    }
  }, [phase, speak, playSound])

  useEffect(() => {
    return () => stopCamera()
  }, [stopCamera])

  // Auto-start camera if navigation state requests it (e.g., footer camera button)
  const location = useLocation()
  useEffect(() => {
    // location.state may be a plain object; guard access
    const state: any = (location as any)?.state
    if (state && state.startCamera) {
      // startCamera is called in response to a user gesture that triggered navigation
      startCamera()
    }
  }, [location, startCamera])

  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return null
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.85)
  }, [])

  const handleCapturePlate = useCallback(async () => {
    const dataUrl = captureFrame()
    if (!dataUrl) return
    setOcrError(null)
    try {
      const text = await extractTextFromImage(dataUrl)
      const plate = parsePlateFromText(text)
      if (!plate) {
        setOcrError('No se detectó la matrícula. Escribe o vuelve a intentarlo.')
        return
      }
      setPlateText(plate)
      setManualPlate(plate)
      setPhase('confirmPlate')
      speak('Pulsa aceptar si la matrícula es correcta')
    } catch (error) {
      setOcrError('Error al extraer la matrícula. Intenta otra foto.')
    }
  }, [captureFrame, speak])

  const handleConfirmPlate = useCallback(() => {
    if (!manualPlate) return
    setPlateText(normalizePlate(manualPlate))
    setPhase('burst')
    setPreviewPhoto(null)
    setPhotos([])
  }, [manualPlate])

  const handleRetakePlate = useCallback(() => {
    setManualPlate('')
    setPlateText('')
    setPhase('matricula')
    setOcrError(null)
    startCamera()
  }, [startCamera])

  const addCapturedPhoto = useCallback(async () => {
    const dataUrl = captureFrame()
    if (!dataUrl) return
    const nextPhotos = [dataUrl, ...photos]
    setPhotos(nextPhotos)
    setPreviewPhoto(dataUrl)
    window.setTimeout(() => setPreviewPhoto(null), 1500)
  }, [captureFrame, photos])

  const handleUpload = useCallback(async () => {
    if (!plateText || photos.length === 0) return
    setUploading(true)
    try {
      for (const photo of photos) {
        await addVehicleImage(plateText, photo)
      }
      const { data: vehiculos } = await supabase.from('vehiculos').select('*').eq('matricula', plateText).limit(1)
      if (vehiculos && vehiculos.length > 0) {
        const veh = vehiculos[0] as Vehiculo
        setVehicleData(veh)
        if (veh.cliente_id) {
          const { data: clientes } = await supabase.from('clientes').select('*').eq('id', veh.cliente_id).limit(1)
          if (clientes && clientes.length > 0) {
            setClientData(clientes[0] as Cliente)
            setClientExists(true)
            setPhase('conceptos')
            speak('Cliente registrado. Añadiendo conceptos')
            return
          }
        }
      }
      setClientExists(false)
      setPhase('cliente')
    } catch (error) {
      console.error(error)
      setOcrError('Error subiendo las fotos o consultando el cliente. Intenta de nuevo.')
    } finally {
      setUploading(false)
    }
  }, [photos, plateText, speak])

  useEffect(() => {
    if (clientForm.cp.length === 5) {
      const cp = clientForm.cp
      setCpLoading(true)
      fetch(`https://api.zippopotam.us/es/${cp}`)
        .then((res) => res.ok ? res.json() : Promise.reject('no zip'))
        .then((data) => {
          const place = data.places?.[0]
          if (place) {
            setClientForm((prev) => ({
              ...prev,
              localidad: place['place name'] || prev.localidad,
              provincia: place['state'] || prev.provincia,
            }))
          }
        })
        .catch(() => {})
        .finally(() => setCpLoading(false))
    }
  }, [clientForm.cp])

  const handleClientField = useCallback((field: keyof typeof clientForm, value: string) => {
    setClientForm((prev) => ({ ...prev, [field]: value }))
  }, [])

  const handleSaveNewClient = useCallback(async () => {
    const nombre = clientForm.nombre.trim()
    if (!nombre || !clientForm.cp || !clientForm.localidad || !clientForm.provincia) {
      setOcrError('Completa al menos nombre y dirección para continuar.')
      return
    }
    setUploading(true)
    try {
      const { data: existing, error: existingError } = await supabase
        .from('clientes')
        .select('*')
        .ilike('nombre', nombre)
        .limit(1)
      if (existingError) throw existingError
      let clienteId: string
      if (existing && existing.length > 0) {
        clienteId = existing[0].id
        setClientData(existing[0] as Cliente)
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from('clientes')
          .insert([{ ...clientForm, nombre }])
          .select()
          .single()
        if (insertError || !inserted) throw insertError
        clienteId = inserted.id
        setClientData(inserted as Cliente)
      }
      const { data: vehInserted, error: vehError } = await supabase
        .from('vehiculos')
        .insert([{ cliente_id: clienteId, matricula: plateText, marca: null, modelo: null, anio: null, vin: null }])
        .select()
        .single()
      if (vehError || !vehInserted) throw vehError
      setVehicleData(vehInserted as Vehiculo)
      setClientExists(true)
      setPhase('conceptos')
      setOcrError(null)
      speak('Cliente creado. Ahora añade conceptos para el presupuesto')
    } catch (error) {
      console.error(error)
      setOcrError('No se pudo guardar el cliente. Revisa los datos e intenta de nuevo.')
    } finally {
      setUploading(false)
    }
  }, [clientForm, plateText, speak])

  const handleAddConcept = useCallback(() => {
    if (!concepto.descripcion.trim() || concepto.precio <= 0) {
      setOcrError('Añade descripción y precio para el concepto.')
      return
    }
    setConceptos((prev) => [...prev, concepto])
    setConcepto({ descripcion: '', cantidad: 1, precio: 0 })
    setVoiceIntent('descripcion')
    speak('¿Añadir otro concepto o finalizar?')
  }, [concepto, speak])

  const handleFinishConcepts = useCallback(() => {
    let finalConceptos = conceptos
    if (concepto.descripcion.trim()) {
      if (concepto.precio <= 0) {
        setOcrError('Añade un precio válido antes de finalizar.')
        return
      }
      finalConceptos = [...conceptos, concepto]
      setConceptos(finalConceptos)
      setConcepto({ descripcion: '', cantidad: 1, precio: 0 })
    }
    if (finalConceptos.length === 0) {
      setOcrError('Añade al menos un concepto antes de finalizar.')
      return
    }
    setPhase('review')
  }, [concepto, conceptos])

  const applyClientVoiceTranscript = useCallback((text: string) => {
    const normalized = text.toLowerCase()
    const updateField = (field: keyof typeof clientForm, value: string) => {
      setClientForm((prev) => ({ ...prev, [field]: value }))
    }

    if (/nombre|llamo|llama|cliente/.test(normalized)) {
      const match = normalized.match(/nombre(?: es|:)?\s*([a-zñáéíóúü\s]+)/i)
      if (match) updateField('nombre', match[1].trim())
    }
    if (/tel[eé]fono|m[oó]vil|celular/.test(normalized)) {
      const match = normalized.match(/(\+?\d[\d\s\-]{6,}\d)/)
      if (match) updateField('telefono', match[1].replace(/\D/g, ''))
    }
    if (/email|correo/.test(normalized)) {
      const match = normalized.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/)
      if (match) updateField('email', match[1].trim())
    }
    if (/calle/.test(normalized)) {
      const match = normalized.match(/calle(?:\s+)?([a-zñáéíóúü\s0-9]+)/i)
      if (match) updateField('calle', match[1].trim())
    }
    if (/n[uú]mero/.test(normalized)) {
      const match = normalized.match(/n[uú]mero(?:\s+)?(\d+)/i)
      if (match) updateField('numero', match[1].trim())
    }
    if (/c[oó]digo postal|cp/.test(normalized)) {
      const match = normalized.match(/(\d{4,5})/)
      if (match) updateField('cp', match[1])
    }
    if (/localidad/.test(normalized)) {
      const match = normalized.match(/localidad(?:\s+)?([a-zñáéíóúü\s]+)/i)
      if (match) updateField('localidad', match[1].trim())
    }
    if (/provincia/.test(normalized)) {
      const match = normalized.match(/provincia(?:\s+)?([a-zñáéíóúü\s]+)/i)
      if (match) updateField('provincia', match[1].trim())
    }
  }, [])

  const handleListenConcept = useCallback(() => {
    if (!sttSupported) return
    if (phase === 'cliente') {
      setVoiceIntent('cliente')
    } else {
      setVoiceIntent('descripcion')
    }
    reset()
    stop()
    start()
  }, [phase, reset, start, stop, sttSupported])

  useEffect(() => {
    if (!listening && voiceIntent !== 'none' && transcript.trim()) {
      const text = `${transcript} ${interim}`.trim()
      if (voiceIntent === 'cliente') {
        applyClientVoiceTranscript(text)
        speak('He actualizado los datos según tu dictado. Revisa y guarda.')
        setVoiceIntent('none')
      } else {
        const parsed = parseVoiceToConceptos(text)
        if (parsed.length > 0) {
          const first = parsed[0]
          if (voiceIntent === 'descripcion') {
            setConcepto((prev) => ({
              ...prev,
              descripcion: first.descripcion || prev.descripcion,
              cantidad: first.cantidad || prev.cantidad,
              precio: first.precio || prev.precio,
            }))
            setVoiceIntent('decision')
            speak('Dime si quieres añadir otro concepto o finalizar.')
          } else if (voiceIntent === 'decision') {
            const normalized = text.toLowerCase()
            if (/finaliz|termin|enviar|ya basta/.test(normalized)) {
              handleFinishConcepts()
            } else if (/otro|siguiente|añadir/.test(normalized)) {
              handleAddConcept()
            } else {
              setVoiceIntent('descripcion')
              speak('He guardado el concepto. Di uno nuevo o pulsa Añadir concepto.')
            }
          }
        }
      }
      reset()
    }
  }, [interim, listening, transcript, voiceIntent, reset, speak, applyClientVoiceTranscript, handleFinishConcepts, handleAddConcept])

  const handleSendWhatsApp = useCallback(async () => {
    if (sending || !clientData || conceptos.length === 0) return
    setSending(true)
    try {
      const presupuesto = {
        cliente_id: clientData.id,
        vehiculo_id: vehicleData?.id ?? null,
        conceptos,
        total,
        estado: 'pendiente',
        observaciones: null,
      }
      const { data, error } = await supabase.from('presupuestos').insert([presupuesto]).select().single()
      if (error || !data) throw error
      const url = `${window.location.origin}/presupuestos?presupuesto=${data.id}`
      const phone = clientData.telefono?.replace(/\D+/g, '')
      if (!phone) {
        setSmsFeedback('No se pudo generar WhatsApp porque falta número de cliente.')
        setPhase('done')
        return
      }
      const message = `VER PRESUPUESTO PULSANDO ESTE ENLACE: ${url}`
      const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
      setWhatsappUrl(waUrl)
      window.open(waUrl, '_blank')
      playSound()
      speak('Presupuesto enviado. Volviendo al inicio')
      setPhase('done')
      setTimeout(() => navigate('/presupuestos'), 2000)
    } catch (error) {
      console.error(error)
      setSmsFeedback('No se pudo enviar WhatsApp. Intenta de nuevo.')
    } finally {
      setSending(false)
    }
  }, [clientData, conceptos, navigate, playSound, speak, sending, total, vehicleData?.id])

  const phaseTitle = {
    matricula: 'Captura de matrícula',
    confirmPlate: 'Confirmación de matrícula',
    burst: 'Fotos del vehículo',
    cliente: 'Datos del cliente',
    conceptos: 'Conceptos y precios',
    review: 'Resumen y envío',
    done: 'Finalizado',
  }[phase]

  return (
    <div className="space-y-6 pb-24">
      <PageHeader title="Flujo Híbrido de Presupuesto" subtitle={phaseTitle}>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => navigate('/presupuestos')}>
            <ArrowLeft className="w-4 h-4" /> Volver
          </Button>
        </div>
      </PageHeader>

      <div className="gestarian-panel rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-2xl">
        {ocrError && (
          <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {ocrError}
          </div>
        )}

        {phase === 'matricula' && (
          <Box className="space-y-4">
            <Stack direction="row" spacing={2} flexWrap="wrap" alignItems="center" className="mb-2">
              <Chip label="Paso 1 de 5" color="info" size="small" className="bg-cyan-500/10 text-cyan-200 border border-cyan-500/20" />
              <Typography variant="subtitle2" className="text-slate-300">Captura la matrícula con la cámara o escríbela manualmente.</Typography>
            </Stack>
            <Box className="relative overflow-hidden rounded-3xl border border-cyan-500/30 bg-black/80">
              {!cameraOn ? (
                <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 px-6 py-16 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-300">
                    <Camera className="w-8 h-8" />
                  </div>
                  <div>
                    <Typography variant="h6" className="text-white">Inicia cámara para detectar matrícula</Typography>
                    <Typography variant="body2" className="text-slate-400">Pulsa el botón para activar la cámara en tu móvil.</Typography>
                  </div>
                  <Button onClick={startCamera} className="inline-flex items-center gap-2 px-6 py-3">
                    <Camera className="w-4 h-4" /> Iniciar cámara
                  </Button>
                </div>
              ) : (
                <>
                  <video ref={videoRef} className="w-full min-h-[320px] object-cover" autoPlay muted playsInline />
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="border-2 border-cyan-400/80 bg-black/20" style={{ width: '80%', aspectRatio: '4 / 1' }} />
                  </div>
                </>
              )}
            </Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-end">
              <TextField
                label="Matrícula manual"
                value={manualPlate}
                onChange={(e) => setManualPlate(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                placeholder="Ej: 1234ABC"
                {...sharedFieldProps}
              />
              <Stack direction="row" spacing={2} className="w-full sm:w-auto">
                <Button onClick={handleCapturePlate} className="inline-flex items-center gap-2">
                  <Camera className="w-4 h-4" /> Capturar matrícula
                </Button>
                <Button variant="secondary" onClick={handleConfirmPlate} disabled={!manualPlate} className="inline-flex items-center gap-2">
                  <Check className="w-4 h-4" /> Usar matrícula
                </Button>
              </Stack>
            </Stack>
            <Typography variant="caption" className="text-slate-400">Coloca la matrícula dentro del rectángulo 4:1 y pulsa el botón de captura. También puedes escribirla manualmente si no se detecta.</Typography>
            <canvas ref={canvasRef} className="hidden" />
          </Box>
        )}

        {phase === 'confirmPlate' && (
          <div className="space-y-4">
            <div className="rounded-3xl border border-slate-700 bg-slate-950/90 p-4 text-center">
              <p className="text-sm text-slate-400">Matrícula detectada</p>
              <p className="text-4xl font-semibold tracking-[0.35em] text-white">{plateText}</p>
              <p className="text-xs text-slate-500">Solo guardaremos el texto; la imagen se descarta.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button onClick={handleConfirmPlate}>
                <Check className="w-4 h-4" /> Aceptar matrícula
              </Button>
              <Button variant="secondary" onClick={handleRetakePlate}>
                <X className="w-4 h-4" /> Volver a capturar
              </Button>
            </div>
          </div>
        )}

        {phase === 'burst' && (
          <div className="space-y-4">
            <div className="relative overflow-hidden rounded-3xl border border-cyan-500/30 bg-black/80">
              {previewPhoto ? (
                <img src={previewPhoto} alt="Foto capturada" className="w-full h-[360px] object-cover" />
              ) : (
                <video ref={videoRef} className="w-full min-h-[320px] object-cover" autoPlay muted playsInline />
              )}
              <div className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-black/50 px-4 py-2 text-xs uppercase tracking-[.2em] text-cyan-200">
                Matrícula: {plateText}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <div className="grid gap-3 sm:grid-cols-3">
                <Button onClick={addCapturedPhoto}>
                  <Camera className="w-4 h-4" /> Tomar foto
                </Button>
                <Button variant="secondary" onClick={handleUpload} disabled={photos.length === 0 || uploading}>
                  <Upload className="w-4 h-4" /> Subir fotos
                </Button>
                <Button variant="ghost" onClick={handleRetakePlate}>
                  <X className="w-4 h-4" /> Cambiar matrícula
                </Button>
              </div>
              <div className="text-right text-slate-400">
                <p className="text-xs uppercase tracking-[.2em] text-slate-500">Fotos tomadas</p>
                <p className="text-3xl font-semibold text-white">{photos.length}</p>
              </div>
            </div>
            {photos.length > 0 && (
              <div className="grid grid-cols-4 gap-2 overflow-x-auto pb-2">
                {photos.map((photo, index) => (
                  <div key={index} className="h-20 overflow-hidden rounded-2xl border border-white/10">
                    <img src={photo} alt={`Foto ${index + 1}`} className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {phase === 'cliente' && (
          <Box className="space-y-4">
            <Stack spacing={3}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Nombre"
                  value={clientForm.nombre}
                  onChange={(e) => handleClientField('nombre', e.target.value)}
                  {...sharedFieldProps}
                />
                <TextField
                  label="DNI / NIF"
                  value={clientForm.dni}
                  onChange={(e) => handleClientField('dni', e.target.value)}
                  {...sharedFieldProps}
                />
              </Stack>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <TextField
                  label="Calle"
                  value={clientForm.calle}
                  onChange={(e) => handleClientField('calle', e.target.value)}
                  {...sharedFieldProps}
                />
                <TextField
                  label="Número"
                  value={clientForm.numero}
                  onChange={(e) => handleClientField('numero', e.target.value)}
                  {...sharedFieldProps}
                />
                <TextField
                  label="Código Postal"
                  value={clientForm.cp}
                  onChange={(e) => handleClientField('cp', e.target.value)}
                  {...sharedFieldProps}
                />
              </Stack>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <TextField
                  label="Localidad"
                  value={clientForm.localidad}
                  onChange={(e) => handleClientField('localidad', e.target.value)}
                  {...sharedFieldProps}
                />
                <TextField
                  label="Provincia"
                  value={clientForm.provincia}
                  onChange={(e) => handleClientField('provincia', e.target.value)}
                  {...sharedFieldProps}
                />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Teléfono"
                  value={clientForm.telefono}
                  onChange={(e) => handleClientField('telefono', e.target.value)}
                  {...sharedFieldProps}
                />
                <TextField
                  label="Email"
                  value={clientForm.email}
                  onChange={(e) => handleClientField('email', e.target.value)}
                  {...sharedFieldProps}
                />
              </Stack>
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" justifyContent="space-between">
              <Stack direction="row" spacing={2} alignItems="center" className="text-sm text-slate-400">
                {sttSupported && (
                  <Button variant="ghost" onClick={handleListenConcept} className="inline-flex items-center gap-2 rounded-2xl bg-cyan-500/10 px-4 py-2 text-cyan-100 hover:bg-cyan-500/20">
                    <Mic className="w-4 h-4" /> Dictar datos
                  </Button>
                )}
                <Typography variant="caption" className="text-slate-400">Pulsa para dictar datos del cliente en esta sección.</Typography>
              </Stack>
              <Stack direction="row" spacing={2} className="w-full sm:w-auto">
                <Button variant="ghost" onClick={() => setPhase('burst')}>
                  <X className="w-4 h-4" /> Volver atrás
                </Button>
                <Button onClick={handleSaveNewClient} disabled={uploading}>
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Guardar cliente
                </Button>
              </Stack>
            </Stack>
            {cpLoading && <Typography variant="caption" className="text-slate-400">Consultando localidad y provincia...</Typography>}
          </Box>
        )}

        {phase === 'conceptos' && (
          <Box className="space-y-4">
            <Stack spacing={3}>
              <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2}>
                <TextField
                  label="Concepto / Repuesto"
                  value={concepto.descripcion}
                  onChange={(e) => setConcepto((prev) => ({ ...prev, descripcion: e.target.value }))}
                  {...sharedFieldProps}
                  className="lg:col-span-2"
                />
                <TextField
                  type="number"
                  label="Cantidad"
                  value={concepto.cantidad || ''}
                  min={1}
                  onChange={(e) => setConcepto((prev) => ({ ...prev, cantidad: Number(e.target.value) || 1 }))}
                  {...sharedFieldProps}
                />
                <TextField
                  type="number"
                  label="Precio unitario €"
                  value={concepto.precio || ''}
                  min={0}
                  onChange={(e) => setConcepto((prev) => ({ ...prev, precio: Number(e.target.value) || 0 }))}
                  {...sharedFieldProps}
                />
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" justifyContent="space-between">
                <Stack direction="row" spacing={2} alignItems="center" className="text-sm text-slate-400">
                  {sttSupported ? (
                    <Button variant="ghost" onClick={handleListenConcept} className="inline-flex items-center gap-2 rounded-2xl bg-cyan-500/10 px-4 py-2 text-cyan-100 hover:bg-cyan-500/20">
                      <Mic className="w-4 h-4" /> Dictar concepto
                    </Button>
                  ) : (
                    <Typography variant="caption" className="text-slate-400">Dictado por voz no disponible en este navegador.</Typography>
                  )}
                  <Typography variant="caption" className="text-slate-400">Pulsa cuando quieras dictar el concepto completo o dictar campos si estás en cliente.</Typography>
                </Stack>

                <Stack direction="row" spacing={2} flexWrap="wrap">
                  <Button onClick={handleAddConcept}>
                    <PlusCircle className="w-4 h-4" /> Añadir concepto
                  </Button>
                  <Button variant="secondary" onClick={handleFinishConcepts}>
                    <Send className="w-4 h-4" /> Finalizar
                  </Button>
                </Stack>
              </Stack>
            </Stack>

            {listening && (
              <Box className="rounded-3xl border border-cyan-500/40 bg-cyan-500/10 p-4 text-sm text-cyan-100">
                Escuchando: {(transcript || interim).trim() || '...'}
              </Box>
            )}

            {!!conceptos.length && (
              <Box className="rounded-3xl border border-slate-700 bg-slate-950/70 p-4">
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <Typography variant="caption" className="uppercase tracking-[.2em] text-slate-400">Conceptos añadidos</Typography>
                  <Typography variant="body2" className="text-slate-300">Total {formatMoney(total)} €</Typography>
                </div>
                <Stack spacing={3}>
                  {conceptos.map((item, index) => (
                    <Box key={index} className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <Typography variant="body2" className="font-semibold text-white">{item.descripcion}</Typography>
                          <Typography variant="caption" className="text-slate-400">{item.cantidad} x {formatMoney(item.precio)} €</Typography>
                        </div>
                        <Typography variant="body2" className="text-right font-semibold text-white">{formatMoney(item.cantidad * item.precio)} €</Typography>
                      </div>
                    </Box>
                  ))}
                </Stack>
              </Box>
            )}
          </Box>
        )}

        {phase === 'review' && (
          <div className="space-y-4">
            <div className="rounded-3xl border border-slate-700 bg-slate-950/80 p-4">
              <p className="text-sm text-slate-400">Cliente</p>
              <p className="text-lg font-semibold text-white">{clientData?.nombre ?? 'Cliente nuevo'}</p>
              <p className="text-sm text-slate-500">Matrícula: {plateText}</p>
            </div>
            <div className="rounded-3xl border border-slate-700 bg-slate-950/80 p-4">
              <div className="flex items-center justify-between text-sm text-slate-400 mb-2">
                <span>Subtotal</span>
                <span>{formatMoney(total)} €</span>
              </div>
              <div className="flex items-center justify-between text-sm text-slate-400 mb-2">
                <span>IVA 21%</span>
                <span>{formatMoney(total * 0.21)} €</span>
              </div>
              <div className="border-t border-slate-700 pt-3 flex items-center justify-between text-base font-semibold text-white">
                <span>Total</span>
                <span>{formatMoney(total * 1.21)} €</span>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button variant="ghost" onClick={() => setPhase('conceptos')}>
                <X className="w-4 h-4" /> Volver atrás
              </Button>
              <Button onClick={handleSendWhatsApp} disabled={sending || !clientData}>
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Enviar por WhatsApp
              </Button>
            </div>
            {smsFeedback && <p className="text-sm text-slate-300">{smsFeedback}</p>}
          </div>
        )}

        {phase === 'done' && (
          <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center text-white">
            <p className="text-xl font-semibold mb-2">Presupuesto enviado</p>
            <p className="text-sm text-slate-200 mb-4">Se ha abierto WhatsApp para seguir con el envío.</p>
            {whatsappUrl && (
              <a href={whatsappUrl} target="_blank" rel="noreferrer" className="text-cyan-300 underline">
                Abrir WhatsApp manualmente
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
