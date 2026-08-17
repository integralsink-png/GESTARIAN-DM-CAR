import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Camera, Check, Upload, Mic, ArrowLeft, Send, X, Loader2, PlusCircle, FileText, Shield, Save, Car, UserPlus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useSpeechSynthesis } from '../lib/useSpeechSynthesis'
import { useVoice } from '../lib/useVoice'
import { PageHeader, Button } from '../components/UI'
import { Box, Chip, Stack, TextField, Typography } from '@mui/material'
import type { Cliente, Concepto, Vehiculo } from '../lib/types'

// Servicios Centralizados
import { recognizeVehiclePlate, normalizeSpanishPlate } from '../services/plateRecognizerService'
import { processDocumentOcr } from '../services/documentOcrService'
import { uploadFileToStorage } from '../services/storageService'
import { saveExpedienteFoto } from '../lib/expedienteService'

function EuropeanLicensePlate({ plate }: { plate: string }) {
  if (!plate) return null
  const formatted = normalizeSpanishPlate(plate)

  return (
    <div className="inline-flex items-center h-12 bg-white border-2 border-black rounded-md shadow-lg overflow-hidden font-mono select-none">
      {/* Franja Azul Europea Izquierda */}
      <div className="h-full bg-[#003399] px-2.5 flex flex-col items-center justify-between py-1 shrink-0">
        {/* 12 Puntos Amarillos (Estrellas de la Bandera Europea dispuestas como las horas del reloj) */}
        <div className="relative w-3.5 h-3.5 flex items-center justify-center">
          {[...Array(12)].map((_, i) => {
            const angle = (i * 30 - 90) * (Math.PI / 180)
            const r = 5.5 // Radio en px
            const x = r * Math.cos(angle)
            const y = r * Math.sin(angle)
            return (
              <span
                key={i}
                className="absolute w-0.5 h-0.5 bg-[#FFCC00] rounded-full"
                style={{
                  transform: `translate(${x}px, ${y}px)`
                }}
              />
            )
          })}
        </div>
        {/* Letra E de España en la base */}
        <span className="text-white font-black text-[11px] leading-none">E</span>
      </div>

      {/* Texto de la Matrícula en Negro Puro sobre Fondo Blanco */}
      <div
        className="px-3.5 py-1 text-2xl sm:text-3xl font-black tracking-[0.2em] font-mono leading-none select-none"
        style={{ color: '#000000', backgroundColor: '#ffffff' }}
      >
        {formatted}
      </div>
    </div>
  )
}

const PROVINCIAS_ESPANOLAS: Record<string, string> = {
  '01': 'Araba / Álava', '02': 'Albacete', '03': 'Alicante', '04': 'Almería', '05': 'Ávila',
  '06': 'Badajoz', '07': 'Illes Balears', '08': 'Barcelona', '09': 'Burgos', '10': 'Cáceres',
  '11': 'Cádiz', '12': 'Castellón', '13': 'Ciudad Real', '14': 'Córdoba', '15': 'A Coruña',
  '16': 'Cuenca', '17': 'Girona', '18': 'Granada', '19': 'Guadalajara', '20': 'Gipuzkoa',
  '21': 'Huelva', '22': 'Huesca', '23': 'Jaén', '24': 'León', '25': 'Lleida',
  '26': 'La Rioja', '27': 'Lugo', '28': 'Madrid', '29': 'Málaga', '30': 'Murcia',
  '31': 'Navarra', '32': 'Ourense', '33': 'Asturias', '34': 'Palencia', '35': 'Las Palmas',
  '36': 'Pontevedra', '37': 'Salamanca', '38': 'Santa Cruz de Tenerife', '39': 'Cantabria', '40': 'Segovia',
  '41': 'Sevilla', '42': 'Soria', '43': 'Tarragona', '44': 'Teruel', '45': 'Toledo',
  '46': 'Valencia', '47': 'Valladolid', '48': 'Bizkaia', '49': 'Zamora', '50': 'Zaragoza',
  '51': 'Ceuta', '52': 'Melilla'
}

function getLocalidadFromCP(cp: string): string {
  const prefix = cp.substring(0, 2)
  return PROVINCIAS_ESPANOLAS[prefix] || ''
}

export function PresupuestoHibridoPage() {
  const navigate = useNavigate()
  const { speak } = useSpeechSynthesis()
  const { listening, transcript, interim, supported: sttSupported, start, stop, reset } = useVoice()
  
  const [phase, setPhase] = useState<'matricula' | 'confirmPlate' | 'burst' | 'cliente' | 'conceptos' | 'review' | 'done'>('matricula')
  const [plateText, setPlateText] = useState('')
  const [manualPlate, setManualPlate] = useState('')
  const [plateConfidence, setPlateConfidence] = useState<number | null>(null)
  const [ocrError, setOcrError] = useState<string | null>(null)
  const [cameraOn, setCameraOn] = useState(false)

  // Fotos de trabajo vs Fotos de documentación interna (Permiso / Ficha técnica)
  const [photos, setPhotos] = useState<string[]>([]) // Fotos de trabajo/daños (hasta 5 se envían en factura)
  const [docPhotos, setDocPhotos] = useState<string[]>([]) // Fotos de documentos (NUNCA se envían por email al cliente)
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null)
  
  const [uploading, setUploading] = useState(false)
  const [clientData, setClientData] = useState<Cliente | null>(null)
  const [vehicleData, setVehicleData] = useState<Vehiculo | null>(null)
  const [clientExists, setClientExists] = useState(false)
  
  const [clientForm, setClientForm] = useState({
    nombre: '',
    dni: '',
    calle: '',
    cp: '',
    localidad: '',
    telefono: '',
    email: '',
  })

  // Auto-relleno de localidad según Código Postal (CP)
  const handleCpChange = useCallback(async (cpValue: string) => {
    const cleanCp = cpValue.replace(/\D/g, '').slice(0, 5)
    const autoLocalidad = getLocalidadFromCP(cleanCp)

    setClientForm((prev) => ({
      ...prev,
      cp: cleanCp,
      localidad: autoLocalidad || prev.localidad,
    }))

    if (cleanCp.length === 5) {
      try {
        const res = await fetch(`https://api.zippopotam.us/es/${cleanCp}`)
        if (res.ok) {
          const data = await res.json()
          const place = data.places?.[0]?.['place name']
          if (place) {
            setClientForm((prev) => ({
              ...prev,
              localidad: autoLocalidad ? `${place} (${autoLocalidad})` : place,
            }))
          }
        }
      } catch (e) {
        // Fallback se mantiene con autoLocalidad
      }
    }
  }, [])

  const [concepto, setConcepto] = useState<Concepto>({ descripcion: '', cantidad: 1, precio: 0 })
  const [conceptos, setConceptos] = useState<Concepto[]>([])
  const [sending, setSending] = useState(false)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const sharedFieldProps = {
    fullWidth: true,
    variant: 'filled' as const,
    InputProps: { sx: { bgcolor: '#111827', color: '#fff', borderRadius: '1rem' } },
    InputLabelProps: { sx: { color: '#94a3b8' } },
  }

  // --------------------------------------------------
  // GESTIÓN DE CÁMARA ROBUSTA Y SIN PANTALLA NEGRA
  // --------------------------------------------------
  const startCamera = useCallback(async () => {
    setOcrError(null)
    if (!navigator.mediaDevices?.getUserMedia) {
      setOcrError('Tu navegador no soporta la cámara.')
      return
    }
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }

      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false
        })
      } catch (e) {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      }

      streamRef.current = stream
      setCameraOn(true)

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.setAttribute('playsinline', 'true')
        videoRef.current.setAttribute('autoplay', 'true')
        videoRef.current.setAttribute('muted', 'true')
        await videoRef.current.play().catch(() => {})
      }
    } catch (err: any) {
      console.error('Camera error:', err)
      setOcrError('No se pudo acceder a la cámara. Revisa los permisos en tu navegador.')
    }
  }, [])

  // Garantizar que la cámara se asigna al elemento <video> tan pronto como se monta en el DOM
  useEffect(() => {
    if (cameraOn && streamRef.current && videoRef.current) {
      const video = videoRef.current
      if (video.srcObject !== streamRef.current) {
        video.srcObject = streamRef.current
        video.setAttribute('playsinline', 'true')
        video.setAttribute('autoplay', 'true')
        video.setAttribute('muted', 'true')
        video.play().catch(() => {})
      }
    }
  }, [cameraOn, phase, previewPhoto])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setCameraOn(false)
  }, [])

  useEffect(() => {
    return () => stopCamera()
  }, [stopCamera])

  // Inicio automático desde navegación
  const location = useLocation()
  useEffect(() => {
    const state: any = (location as any)?.state
    if (state && state.startCamera) {
      startCamera()
    }
  }, [location, startCamera])

  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return null
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.90)
  }, [])

  // --------------------------------------------------
  // PASO 1: RECONOCIMIENTO DE MATRÍCULA CON PLATE RECOGNIZER
  // --------------------------------------------------
  const handleCapturePlate = useCallback(async () => {
    const dataUrl = captureFrame()
    if (!dataUrl) return
    setOcrError(null)
    setUploading(true)

    try {
      const resBlob = await fetch(dataUrl).then((r) => r.blob())
      const result = await recognizeVehiclePlate(resBlob)

      if (result.success && result.matricula_normalizada) {
        const plate = result.matricula_normalizada
        setPlateText(plate)
        setManualPlate(plate)
        setPlateConfidence(result.confidence || 95)

        const cleanPlate = plate.replace(/\s+/g, '').toUpperCase()
        const { data: vehs } = await supabase
          .from('vehiculos')
          .select('*, clientes(*)')
          .ilike('matricula', cleanPlate)
          .limit(1)

        if (vehs && vehs.length > 0) {
          const veh = vehs[0]
          setVehicleData(veh)
          if ((veh as any).clientes) {
            const cli = (veh as any).clientes as Cliente
            setClientData(cli)
            setClientExists(true)
          } else if (veh.cliente_id) {
            const { data: cli } = await supabase.from('clientes').select('*').eq('id', veh.cliente_id).maybeSingle()
            if (cli) {
              setClientData(cli)
              setClientExists(true)
            }
          }
        } else {
          setClientExists(false)
          setVehicleData(null)
          setClientData(null)
        }

        setPhase('confirmPlate')
        speak(`Matrícula detectada: ${plate}. Acepta para iniciar fotos.`)
      } else {
        setOcrError(result.error_message || 'No se pudo leer la matrícula. Escríbela manualmente.')
      }
    } catch (error: any) {
      console.error('Error en captura Plate Recognizer:', error)
      setOcrError('No se pudo conectar con Plate Recognizer. Introduce la matrícula manualmente.')
    } finally {
      setUploading(false)
    }
  }, [captureFrame, speak])

  // Aceptar matrícula -> Activa la cámara automáticamente de inmediato
  const handleConfirmPlate = useCallback(async () => {
    if (!manualPlate) return
    const plate = normalizeSpanishPlate(manualPlate)
    setPlateText(plate)
    
    // Si aún no tenemos los datos del vehículo o cliente, buscarlos
    const cleanPlate = plate.replace(/\s+/g, '').toUpperCase()
    const { data: vehs } = await supabase
      .from('vehiculos')
      .select('*, clientes(*)')
      .ilike('matricula', cleanPlate)
      .limit(1)

    if (vehs && vehs.length > 0) {
      const veh = vehs[0]
      setVehicleData(veh)
      if ((veh as any).clientes) {
        const cli = (veh as any).clientes as Cliente
        setClientData(cli)
        setClientExists(true)
      } else if (veh.cliente_id) {
        const { data: cli } = await supabase.from('clientes').select('*').eq('id', veh.cliente_id).maybeSingle()
        if (cli) {
          setClientData(cli)
          setClientExists(true)
        }
      }
    }

    setPhase('burst')
    setPreviewPhoto(null)
    setCameraOn(true)
    
    // REGLA DEL USUARIO: Al confirmar matrícula la cámara se reactiva automáticamente de inmediato
    setTimeout(() => {
      startCamera()
    }, 150)
    speak('Matrícula confirmada. Cámara activa para tomar fotos del trabajo o documentos.')
  }, [manualPlate, startCamera, speak])

  const handleRetakePlate = useCallback(() => {
    setManualPlate('')
    setPlateText('')
    setPhase('matricula')
    setOcrError(null)
    startCamera()
  }, [startCamera])

  // --------------------------------------------------
  // PASO 2: TOMA DE FOTOS DEL TRABAJO / DAÑOS
  // --------------------------------------------------
  const addCapturedPhoto = useCallback(async () => {
    const dataUrl = captureFrame()
    if (!dataUrl) return
    setPhotos((prev) => [dataUrl, ...prev])
    setPreviewPhoto(dataUrl)
    setTimeout(() => setPreviewPhoto(null), 1200)
    speak('Foto de trabajo guardada.')
  }, [captureFrame, speak])

  // --------------------------------------------------
  // PASO 3: BOTÓN DEDICADO PARA DOCUMENTOS (PERMISO / FICHA TÉCNICA)
  // --------------------------------------------------
  const handleCaptureDocument = useCallback(async () => {
    const dataUrl = captureFrame()
    if (!dataUrl) return
    setOcrError(null)
    setUploading(true)

    try {
      const docData = await processDocumentOcr(dataUrl)
      if (docData.cif_nif || docData.proveedor) {
        setClientForm((prev) => ({
          ...prev,
          dni: docData.cif_nif || prev.dni,
          nombre: docData.proveedor || prev.nombre,
        }))
      }
      setDocPhotos((prev) => [dataUrl, ...prev])
      setPreviewPhoto(dataUrl)
      setTimeout(() => setPreviewPhoto(null), 1200)
      speak('Documento escaneado y procesado por OCR.')
    } catch (err) {
      setDocPhotos((prev) => [dataUrl, ...prev])
      speak('Documento guardado.')
    } finally {
      setUploading(false)
    }
  }, [captureFrame, speak])

  // --------------------------------------------------
  // PASO 4: GUARDAR IMÁGENES EN EL EXPEDIENTE
  // --------------------------------------------------
  const handleSaveExpedienteImages = useCallback(async (cliId?: string, vehId?: string) => {
    const allImgs = [...photos, ...docPhotos]
    for (const img of allImgs) {
      await saveExpedienteFoto(img, cliId, vehId)
    }
  }, [photos, docPhotos])

  // --------------------------------------------------
  // PASO 5: GENERAR PRESUPUESTO
  // --------------------------------------------------
  const handleGenerarPresupuesto = useCallback(async () => {
    let finalClient = clientData
    let finalVeh = vehicleData

    // Doble verificación directa en base de datos si por algún motivo no estuvieran en memoria
    if (!finalClient || !finalVeh) {
      const cleanPlate = (plateText || manualPlate || '').replace(/\s+/g, '').toUpperCase()
      if (cleanPlate) {
        const { data: vehs } = await supabase
          .from('vehiculos')
          .select('*, clientes(*)')
          .ilike('matricula', cleanPlate)
          .limit(1)

        if (vehs && vehs.length > 0) {
          finalVeh = vehs[0]
          if ((finalVeh as any).clientes) {
            finalClient = (finalVeh as any).clientes as Cliente
          } else if (finalVeh.cliente_id) {
            const { data: cli } = await supabase.from('clientes').select('*').eq('id', finalVeh.cliente_id).maybeSingle()
            if (cli) finalClient = cli
          }
        }
      }
    }

    if (finalClient && finalVeh) {
      await handleSaveExpedienteImages(finalClient.id, finalVeh.id)
      navigate('/presupuestos', {
        state: {
          clienteId: finalClient.id,
          vehiculoId: finalVeh.id,
          openForm: true,
          initialFotos: photos,
        }
      })
    } else {
      setPhase('cliente')
      speak('Matrícula no encontrada en la base de datos. Por favor, cumplimentar los datos del nuevo cliente.')
    }
  }, [clientData, vehicleData, plateText, manualPlate, navigate, handleSaveExpedienteImages, photos, speak])

  // Guardar cliente nuevo cuando no existía
  const handleSaveNewClient = useCallback(async () => {
    if (!clientForm.nombre?.trim()) {
      alert('Por favor, introduce al menos el nombre completo del cliente.')
      return
    }
    setUploading(true)
    setOcrError(null)

    try {
      const payload: any = {
        nombre: clientForm.nombre.trim(),
        dni: clientForm.dni?.trim() || null,
        direccion: clientForm.calle?.trim() || null,
        telefono: clientForm.telefono?.trim() || null,
        email: clientForm.email?.trim() || null,
      }
      if (clientForm.cp?.trim()) {
        payload.cp = clientForm.cp.trim()
      }

      let newCli: any = null
      const { data, error: cliErr } = await supabase
        .from('clientes')
        .insert(payload)
        .select()
        .single()

      if (cliErr) {
        delete payload.cp
        const { data: fbData, error: fbErr } = await supabase
          .from('clientes')
          .insert(payload)
          .select()
          .single()

        if (fbErr) throw fbErr
        newCli = fbData
      } else {
        newCli = data
      }

      // 2. Crear o asociar el vehículo a la matrícula reconocida
      const cleanPlate = (plateText || manualPlate || '1234ABC').replace(/\s+/g, '').toUpperCase()
      
      let vehId = null
      const { data: newVeh, error: vehErr } = await supabase
        .from('vehiculos')
        .insert({
          cliente_id: newCli.id,
          matricula: cleanPlate,
        })
        .select()
        .single()

      if (vehErr) {
        const { data: existingVeh } = await supabase.from('vehiculos').select('*').eq('matricula', cleanPlate).maybeSingle()
        if (existingVeh) {
          vehId = existingVeh.id
          setVehicleData(existingVeh)
        }
      } else if (newVeh) {
        vehId = newVeh.id
        setVehicleData(newVeh)
      }

      setClientData(newCli)
      setClientExists(true)

      // Guardar fotos en expediente_imagenes y vehiculos.fotos
      await handleSaveExpedienteImages(newCli.id, vehId)

      speak('Cliente registrado correctamente. Abriendo presupuesto A4.')

      // 3. Navegar directamente al Presupuesto A4/PDF cumplimentado
      navigate('/presupuestos', {
        state: {
          clienteId: newCli.id,
          vehiculoId: vehId,
          openForm: true,
          initialFotos: photos,
        }
      })
    } catch (e: any) {
      console.error('Error al guardar cliente:', e)
      setOcrError('Error guardando cliente: ' + (e.message || 'Comprueba tu conexión'))
    } finally {
      setUploading(false)
    }
  }, [clientForm, plateText, manualPlate, navigate, speak])

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-12">
      {/* Cabecera Centrada con PRESUPUESTO / ASISTIDO */}
      <div className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700 flex items-center justify-center shadow transition-all active:scale-95 shrink-0"
          title="Volver"
          aria-label="Volver"
        >
          <ArrowLeft className="w-5 h-5 text-slate-200" />
        </button>

        <div className="flex flex-col items-center justify-center text-center">
          <h1 className="text-lg sm:text-xl font-black uppercase tracking-wider text-white">PRESUPUESTO</h1>
          <p className="text-xs font-black uppercase tracking-widest text-cyan-400">ASISTIDO</p>
        </div>

        <div className="w-10" /> {/* Spacer */}
      </div>

      <div className="mx-auto max-w-4xl px-3 py-3 space-y-4">

        {/* Banner de Error u OCR */}
        {ocrError && (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-bold text-rose-300">
            {ocrError}
          </div>
        )}

        {/* -------------------------------------------------- */}
        {/* FASE 1: CAPTURA DE MATRÍCULA */}
        {/* -------------------------------------------------- */}
        {phase === 'matricula' && (
          <Box className="space-y-3">
            <Stack direction="row" spacing={2} flexWrap="wrap" alignItems="center" className="mb-1">
              <Chip label="Paso 1: Matrícula" color="info" size="small" className="bg-cyan-500/10 text-cyan-200 border border-cyan-500/20 font-bold" />
              <Typography variant="subtitle2" className="text-slate-300 text-xs">
                Captura la matrícula con Plate Recognizer o escríbela manualmente.
              </Typography>
            </Stack>

            <Box className="relative overflow-hidden rounded-3xl border border-cyan-500/30 bg-black/80">
              {!cameraOn ? (
                <div className="flex min-h-[200px] max-h-[260px] flex-col items-center justify-center gap-3 px-6 py-8 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-300">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div>
                    <Typography variant="subtitle1" className="text-white font-bold">Inicia la cámara del móvil</Typography>
                    <Typography variant="caption" className="text-slate-400">Reconocimiento preciso de matrícula</Typography>
                  </div>
                  <Button onClick={startCamera} className="inline-flex items-center gap-2 px-5 py-2.5 font-bold bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-sm">
                    <Camera className="w-4 h-4" /> Iniciar cámara
                  </Button>
                </div>
              ) : (
                <>
                  <video ref={videoRef} className="w-full h-[220px] sm:h-[280px] object-cover" autoPlay muted playsInline />
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="border-2 border-cyan-400/80 bg-black/20 rounded-xl" style={{ width: '80%', aspectRatio: '4 / 1' }} />
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
                <Button onClick={handleCapturePlate} disabled={uploading} className="inline-flex items-center gap-2 font-bold bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl py-3 px-5">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />} CAPTURA OCR
                </Button>
                <Button variant="secondary" onClick={handleConfirmPlate} disabled={!manualPlate} className="inline-flex items-center gap-2 py-3">
                  <Check className="w-4 h-4" /> Usar esta matrícula
                </Button>
              </Stack>
            </Stack>
          </Box>
        )}

        {/* -------------------------------------------------- */}
        {/* FASE 2: CONFIRMAR MATRÍCULA Y ESTADO DB */}
        {/* -------------------------------------------------- */}
        {phase === 'confirmPlate' && (
          <div className="space-y-4">
            <div className="rounded-3xl border border-cyan-500/30 bg-slate-900/90 p-5 text-center space-y-3 shadow-2xl flex flex-col items-center">
              <p className="text-xs uppercase tracking-widest text-cyan-400 font-black">CAPTURA OCR MATRÍCULA</p>
              
              {/* Matrícula Europea Oficial (Envoltorio rectangular con franja azul 'E' y 12 estrellas amarillas) */}
              <div className="py-2">
                <EuropeanLicensePlate plate={plateText} />
              </div>

              {plateConfidence && (
                <span className="text-xs font-bold bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full border border-emerald-500/30 inline-block">
                  Confianza API: {plateConfidence}%
                </span>
              )}
              {clientExists ? (
                <div className="pt-1 text-emerald-400 font-bold text-sm flex items-center justify-center gap-1.5">
                  <Check className="w-4 h-4" /> Vehículo encontrado en la Base de Datos: {clientData?.nombre}
                </div>
              ) : (
                <div className="pt-1 text-amber-400 font-bold text-xs flex items-center justify-center gap-1.5">
                  Matrícula no registrada en la base de datos de GESTARIAN
                </div>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Button onClick={handleConfirmPlate} className="font-bold bg-cyan-600 text-white py-3 text-sm">
                <Check className="w-5 h-5 mr-2" /> Aceptar Matrícula e Iniciar Captura de Fotos
              </Button>
              <Button variant="secondary" onClick={handleRetakePlate} className="py-3 text-sm">
                <X className="w-5 h-5 mr-2" /> Volver a capturar
              </Button>
            </div>
          </div>
        )}

        {/* -------------------------------------------------- */}
        {/* FASE 3: CAPTURA CONTINUA DE FOTOS Y DOCUMENTOS */}
        {/* -------------------------------------------------- */}
        {phase === 'burst' && (
          <div className="space-y-3">
            <div className="relative overflow-hidden rounded-3xl border border-cyan-500/30 bg-black/80">
              {previewPhoto ? (
                <img src={previewPhoto} alt="Foto capturada" className="w-full h-[220px] sm:h-[280px] object-cover" />
              ) : (
                <video ref={videoRef} className="w-full h-[220px] sm:h-[280px] object-cover" autoPlay muted playsInline />
              )}
              {/* Matrícula Europea Flotante en el visor de cámara */}
              <div className="absolute left-1/2 top-3 -translate-x-1/2 shadow-2xl z-10 scale-90">
                <EuropeanLicensePlate plate={plateText} />
              </div>
            </div>

            {/* BARRA DE ACCIONES PRINCIPALES Y DEDICADAS */}
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                
                {/* Botón 1: Foto del Trabajo */}
                <Button onClick={addCapturedPhoto} className="py-2.5 font-bold bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl flex items-center justify-center gap-2 text-sm shadow">
                  <Camera className="w-4 h-4" /> Tomar Foto del Trabajo ({photos.length})
                </Button>

                {/* Botón 2: Foto de Documento en Relleno Gris 80% (Sin morados) */}
                <Button onClick={handleCaptureDocument} disabled={uploading} className="py-2.5 font-bold bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 rounded-xl flex items-center justify-center gap-2 text-sm shadow">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4 text-slate-300" />} 
                  Capturar Permiso / Ficha Técnica ({docPhotos.length})
                </Button>

              </div>

              {/* MUESTRA DE FOTOS CAPTURADAS */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <div className="bg-slate-900 p-2.5 rounded-2xl border border-slate-800 space-y-1.5">
                  <span className="text-[11px] font-bold text-cyan-300 block uppercase">Fotos de Trabajo ({photos.length})</span>
                  <div className="flex gap-2 overflow-x-auto">
                    {photos.map((p, idx) => (
                      <img key={idx} src={p} alt={`Trabajo ${idx}`} className="w-12 h-12 object-cover rounded-lg border border-slate-700 shrink-0" />
                    ))}
                  </div>
                </div>

                <div className="bg-slate-900 p-2.5 rounded-2xl border border-slate-800 space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-300 block uppercase">Documentos Internos ({docPhotos.length})</span>
                  <p className="text-[9px] text-slate-400">Archivos internos (No se envían por email)</p>
                  <div className="flex gap-2 overflow-x-auto">
                    {docPhotos.map((p, idx) => (
                      <img key={idx} src={p} alt={`Doc ${idx}`} className="w-12 h-12 object-cover rounded-lg border border-slate-700 shrink-0" />
                    ))}
                  </div>
                </div>
              </div>

              {/* LÍNEA DE ACCIONES DE FINALIZACIÓN */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-slate-800">
                
                {/* Botón Guardar Expediente / Imágenes en Gris 80% */}
                <Button variant="secondary" onClick={handleSaveExpedienteImages} disabled={uploading} className="py-3 font-bold bg-slate-800 border border-slate-700 text-slate-200 flex items-center justify-center gap-2 text-sm">
                  <Save className="w-4 h-4" /> Guardar Imágenes en Expediente
                </Button>

                {/* Botón Generar Presupuesto A4/PDF */}
                <Button onClick={handleGenerarPresupuesto} disabled={uploading} className="py-3 font-black bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl flex items-center justify-center gap-2 text-sm shadow-lg">
                  <FileText className="w-4 h-4" /> Generar Presupuesto A4/PDF
                </Button>

              </div>
            </div>
          </div>
        )}

        {/* -------------------------------------------------- */}
        {/* FASE 4: FORMULARIO NUEVO CLIENTE (TEXTOS x1.5 Y VISIBILIDAD TOTAL) */}
        {/* -------------------------------------------------- */}
        {phase === 'cliente' && (
          <div className="space-y-6 bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-2xl">
            <div className="border-b border-slate-800 pb-4">
              <h2 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3 uppercase tracking-wide">
                <UserPlus className="w-8 h-8 text-cyan-400" /> Registro de Nuevo Cliente
              </h2>
              <p className="text-sm sm:text-base text-slate-300 mt-2 font-medium">
                La matrícula <span className="text-cyan-300 font-mono font-black bg-cyan-950 px-2 py-0.5 rounded border border-cyan-700">{plateText}</span> no está registrada. Cumplimenta los datos para generar el expediente.
              </p>
            </div>
            
            <div className="space-y-6">
              {/* Nombre completo + DNI */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-lg sm:text-2xl font-black text-white mb-2 uppercase tracking-wider">
                    Nombre completo <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={clientForm.nombre}
                    onChange={(e) => setClientForm({ ...clientForm, nombre: e.target.value })}
                    placeholder="Ej: Juan Pérez González"
                    enterKeyHint="next"
                    className="w-full bg-slate-950 border-2 border-slate-700 rounded-2xl px-5 py-4 text-white text-2xl sm:text-3xl focus:border-cyan-400 focus:outline-none placeholder-slate-500 shadow-inner font-bold"
                  />
                </div>

                <div>
                  <label className="block text-lg sm:text-2xl font-black text-white mb-2 uppercase tracking-wider">
                    DNI / CIF / NIF
                  </label>
                  <input
                    type="text"
                    value={clientForm.dni}
                    onChange={(e) => setClientForm({ ...clientForm, dni: e.target.value })}
                    placeholder="Ej: 12345678X"
                    inputMode="numeric"
                    enterKeyHint="next"
                    className="w-full bg-slate-950 border-2 border-slate-700 rounded-2xl px-5 py-4 text-white text-2xl sm:text-3xl focus:border-cyan-400 focus:outline-none placeholder-slate-500 shadow-inner uppercase font-bold"
                  />
                </div>
              </div>

              {/* Teléfono + Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-lg sm:text-2xl font-black text-white mb-2 uppercase tracking-wider">
                    Teléfono Móvil
                  </label>
                  <input
                    type="tel"
                    value={clientForm.telefono}
                    onChange={(e) => setClientForm({ ...clientForm, telefono: e.target.value })}
                    placeholder="Ej: 612345678"
                    inputMode="numeric"
                    enterKeyHint="next"
                    className="w-full bg-slate-950 border-2 border-slate-700 rounded-2xl px-5 py-4 text-white text-2xl sm:text-3xl focus:border-cyan-400 focus:outline-none placeholder-slate-500 shadow-inner font-bold"
                  />
                </div>

                <div>
                  <label className="block text-lg sm:text-2xl font-black text-white mb-2 uppercase tracking-wider">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    value={clientForm.email}
                    onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                    placeholder="Ej: cliente@email.com"
                    inputMode="email"
                    enterKeyHint="next"
                    className="w-full bg-slate-950 border-2 border-slate-700 rounded-2xl px-5 py-4 text-white text-2xl sm:text-3xl focus:border-cyan-400 focus:outline-none placeholder-slate-500 shadow-inner font-bold"
                  />
                </div>
              </div>

              {/* Calle / Dirección + Código Postal (CP) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="sm:col-span-2">
                  <label className="block text-lg sm:text-2xl font-black text-white mb-2 uppercase tracking-wider">
                    Calle / Dirección
                  </label>
                  <input
                    type="text"
                    value={clientForm.calle}
                    onChange={(e) => setClientForm({ ...clientForm, calle: e.target.value })}
                    placeholder="Ej: Av. Principal 45"
                    enterKeyHint="next"
                    className="w-full bg-slate-950 border-2 border-slate-700 rounded-2xl px-5 py-4 text-white text-2xl sm:text-3xl focus:border-cyan-400 focus:outline-none placeholder-slate-500 shadow-inner font-bold"
                  />
                </div>

                <div>
                  <label className="block text-lg sm:text-2xl font-black text-white mb-2 uppercase tracking-wider">
                    Código Postal (CP)
                  </label>
                  <input
                    type="text"
                    maxLength={5}
                    value={clientForm.cp}
                    onChange={(e) => setClientForm({ ...clientForm, cp: e.target.value.replace(/\D/g, '').slice(0, 5) })}
                    placeholder="Ej: 28001"
                    inputMode="numeric"
                    enterKeyHint="done"
                    className="w-full bg-slate-950 border-2 border-slate-700 rounded-2xl px-5 py-4 text-white text-2xl sm:text-3xl focus:border-cyan-400 focus:outline-none placeholder-slate-500 shadow-inner font-bold"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-6 border-t border-slate-800">
              <Button variant="ghost" onClick={() => setPhase('burst')} className="px-6 py-3.5 text-lg font-bold text-slate-300">
                Volver
              </Button>
              <Button onClick={handleSaveNewClient} disabled={uploading} className="font-black bg-cyan-600 hover:bg-cyan-500 text-white px-8 py-4 text-lg sm:text-xl rounded-2xl shadow-xl flex items-center gap-3">
                {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Check className="w-6 h-6" />} Guardar y Abrir Presupuesto A4
              </Button>
            </div>
          </div>
        )}

        {/* Canvas permanente e invisible para captura de fotogramas en cualquier fase */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  )
}
