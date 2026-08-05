import { useState, useRef, useCallback, useEffect } from 'react'
import { Camera, X, RefreshCw, Check, Loader2, Edit3, AlertCircle, Upload, ZoomIn, ZoomOut } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { addVehicleImage, fetchVehicleImages, type VehicleImage } from '../lib/vehicleImages'

type Props = {
  open: boolean
  onClose: () => void
  onMatriculaDetected: (matricula: string) => void
  knownMatricula?: string | null
}

export function CameraModal({ open, onClose, onMatriculaDetected, knownMatricula }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [foto, setFoto] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [resultado, setResultado] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cameraOn, setCameraOn] = useState(false)
  const [editing, setEditing] = useState(false)
  const [manualMatricula, setManualMatricula] = useState('')
  const [noDetectada, setNoDetectada] = useState(false)

  // Photo management state
  const [savedPhotos, setSavedPhotos] = useState<VehicleImage[]>([])
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerIdx, setViewerIdx] = useState<number | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [addingPhoto, setAddingPhoto] = useState(false)
  const isPanning = useRef(false)
  const panStart = useRef({ x: 0, y: 0 })

  const iniciarCamara = useCallback(async () => {
    setError(null)
    setFoto(null)
    setResultado(null)
    setNoDetectada(false)
    setEditing(false)
    setManualMatricula('')
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Tu navegador no soporta acceso a la cámara.')
        return
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => {})
      }
      setCameraOn(true)
    } catch (err: any) {
      if (err?.name === 'NotAllowedError') {
        setError('Permiso de cámara denegado. Activa los permisos en tu navegador.')
      } else if (err?.name === 'NotFoundError') {
        setError('No se encontró ninguna cámara en este dispositivo.')
      } else {
        setError('No se pudo acceder a la cámara. Revisa los permisos del navegador.')
      }
    }
  }, [])

  const detenerCamara = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setCameraOn(false)
  }, [])

  useEffect(() => {
    if (open) {
      if (knownMatricula) {
        setResultado(knownMatricula)
        setManualMatricula(knownMatricula)
        fetchVehicleImages(knownMatricula).then(setSavedPhotos)
        iniciarCamara()
      } else {
        iniciarCamara()
      }
    } else {
      detenerCamara()
    }
    return () => detenerCamara()
  }, [open, knownMatricula, iniciarCamara, detenerCamara])

  useEffect(() => {
    if (cameraOn && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play().catch(() => {})
    }
  }, [cameraOn])

  const capturarFoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    setFoto(dataUrl)
    detenerCamara()
    runOCR(dataUrl)
  }, [detenerCamara])

  const runOCR = useCallback(async (imageData: string) => {
    setScanning(true)
    setResultado(null)
    setNoDetectada(false)
    try {
      const res = await fetch(imageData)
      const blob = await res.blob()
      
      const formData = new FormData()
      formData.append('upload', blob, 'image.jpg')
      formData.append('regions', 'es')

      const apiRes = await fetch('https://api.platerecognizer.com/v1/plate-reader/', {
        method: 'POST',
        headers: {
          'Authorization': 'Token 928ead1c82c78af71e76ad7ccb53563b7230d5c6'
        },
        body: formData
      })
      
      const data = await apiRes.json()

      if (apiRes.ok && data?.results && data.results.length > 0) {
        const plate = data.results[0].plate.toUpperCase()
        setResultado(plate)
        setManualMatricula(plate)
        // Load any existing photos for this plate
        const existing = await fetchVehicleImages(plate)
        setSavedPhotos(existing)
      } else {
        setNoDetectada(true)
      }
    } catch (err: any) {
      console.error(err)
      setNoDetectada(true)
    } finally {
      setScanning(false)
    }
  }, [])

  // Save the OCR capture as a vehicle photo
  const guardarFotoOCR = useCallback(async () => {
    if (!foto || !resultado) return
    setAddingPhoto(true)
    const newImg = await addVehicleImage(resultado, foto)
    if (newImg) {
      setSavedPhotos((prev) => [...prev, newImg])
    }
    setAddingPhoto(false)
  }, [foto, resultado])

  // Add another photo using camera (after plate detected)
  const tomarOtraFoto = useCallback(async () => {
    setError(null)
    try {
      if (!navigator.mediaDevices?.getUserMedia) return
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => {})
      }
      setCameraOn(true)
      setFoto(null)
    } catch {
      setError('No se pudo acceder a la cámara.')
    }
  }, [])

  const capturarOtraFoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !resultado) return
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    detenerCamara()
    // Save directly
    addVehicleImage(resultado, dataUrl).then((newImg) => {
      if (newImg) setSavedPhotos((prev) => [...prev, newImg])
    })
  }, [detenerCamara, resultado])

  const handleUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0 || !resultado) return
    setAddingPhoto(true)
    for (const file of Array.from(files)) {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const newImg = await addVehicleImage(resultado, dataUrl)
      if (newImg) setSavedPhotos((prev) => [...prev, newImg])
    }
    setAddingPhoto(false)
  }, [resultado])

  const reintentar = useCallback(() => {
    setFoto(null)
    setResultado(null)
    setNoDetectada(false)
    setEditing(false)
    setManualMatricula('')
    setSavedPhotos([])
    iniciarCamara()
  }, [iniciarCamara])

  const confirmar = useCallback(() => {
    const final = editing ? manualMatricula.toUpperCase().replace(/\s/g, '') : resultado
    if (final && final.length >= 4) {
      onMatriculaDetected(final)
    }
    detenerCamara()
    setFoto(null)
    setResultado(null)
    setEditing(false)
    setManualMatricula('')
    setNoDetectada(false)
    setSavedPhotos([])
    setViewerOpen(false)
    onClose()
  }, [resultado, manualMatricula, editing, onMatriculaDetected, detenerCamara, onClose])

  const cerrar = useCallback(() => {
    detenerCamara()
    setFoto(null)
    setResultado(null)
    setError(null)
    setEditing(false)
    setManualMatricula('')
    setNoDetectada(false)
    setSavedPhotos([])
    setViewerOpen(false)
    onClose()
  }, [detenerCamara, onClose])

  // Zoom viewer handlers
  useEffect(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [viewerIdx])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    setZoom((z) => Math.max(1, Math.min(5, z + (e.deltaY < 0 ? 0.3 : -0.3))))
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (zoom <= 1) return
    isPanning.current = true
    panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }
  }, [zoom, pan])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning.current) return
    setPan({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y })
  }, [])

  const handleMouseUp = useCallback(() => {
    isPanning.current = false
  }, [])

  if (!open) return null

  const canConfirm = editing
    ? manualMatricula.trim().length >= 4
    : resultado !== null

  const hasPlate = resultado || (editing && manualMatricula.trim().length >= 4)
  const currentPlate = editing ? manualMatricula.toUpperCase().replace(/\s/g, '') : resultado

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col" onClick={cerrar}>
      <div className="flex items-center justify-between p-4 text-white" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5" />
          <span className="font-semibold text-sm">Capturar matrícula</span>
        </div>
        <button onClick={cerrar} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/10" aria-label="Cerrar">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {error ? (
          <div className="text-center max-w-sm">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <p className="text-red-400 text-sm mb-4">{error}</p>
            <button onClick={iniciarCamara} className="gestarian-btn-primary gestarian-btn px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2">
              <RefreshCw className="w-4 h-4" /> Reintentar
            </button>
          </div>
        ) : foto ? (
          <div className="w-full max-w-md">
            <img src={foto} alt="Captura" className="w-full rounded-lg" />
            {scanning ? (
              <div className="mt-4 flex items-center justify-center gap-2 text-cyan-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Analizando matrícula...
              </div>
            ) : noDetectada && !editing ? (
              <div className="mt-4 text-center">
                <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                <p className="text-amber-400 text-sm font-medium mb-1">No se detectó ninguna matrícula válida</p>
                <p className="text-xs text-white/40 mb-3">Asegúrate de que la matrícula sea legible y esté bien encuadrada.</p>
                <div className="flex items-center justify-center gap-3">
                  <button onClick={reintentar} className="gestarian-btn gestarian-btn-secondary px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2">
                    <RefreshCw className="w-4 h-4" /> Repetir foto
                  </button>
                  <button
                    onClick={() => { setEditing(true); setManualMatricula('') }}
                    className="gestarian-btn gestarian-btn-ghost px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2"
                  >
                    <Edit3 className="w-4 h-4" /> Introducir manual
                  </button>
                </div>
              </div>
            ) : resultado && !editing ? (
              <div className="mt-4 text-center">
                <p className="text-xs text-white/50 mb-1">Matrícula detectada:</p>
                <p className="text-2xl font-bold text-white tracking-widest">{resultado}</p>
                <button
                  onClick={() => { setEditing(true); setManualMatricula(resultado) }}
                  className="mt-2 text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 mx-auto"
                >
                  <Edit3 className="w-3 h-3" /> Corregir manualmente
                </button>
              </div>
            ) : null}
            {editing && (
              <div className="mt-4 text-center">
                <p className="text-xs text-white/50 mb-1">Introduce la matrícula:</p>
                <input
                  type="text"
                  value={manualMatricula}
                  onChange={(e) => setManualMatricula(e.target.value.toUpperCase())}
                  placeholder="1234 ABC"
                  maxLength={10}
                  autoFocus
                  className="w-40 text-center text-2xl font-bold text-white tracking-widest bg-bg-800 border border-cyan-500 rounded-lg px-3 py-2 focus:outline-none"
                />
              </div>
            )}
          </div>
        ) : cameraOn && !knownMatricula ? (
          <div className="w-full max-w-md relative">
            <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-lg" />
            {cameraOn && (
              <div className="absolute inset-8 border-2 border-cyan-400/60 rounded-lg pointer-events-none" />
            )}
          </div>
        ) : cameraOn && knownMatricula ? (
          <div className="w-full max-w-md relative">
            <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-lg" />
          </div>
        ) : (
          <div className="flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          </div>
        )}

        {/* Photo management section — shown when plate is available */}
        {hasPlate && !scanning && (
          <div className="w-full max-w-md mt-6 pb-2">
            {/* Action buttons */}
            <div className="flex gap-3 mb-3">
              {!foto && !cameraOn && resultado && (
                <button
                  onClick={tomarOtraFoto}
                  disabled={addingPhoto}
                  className="flex-1 gestarian-btn gestarian-btn-secondary px-3 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {addingPhoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                  AÑADIR FOTO
                </button>
              )}
              {foto && resultado && !editing && (
                <button
                  onClick={guardarFotoOCR}
                  disabled={addingPhoto}
                  className="flex-1 gestarian-btn gestarian-btn-secondary px-3 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {addingPhoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                  GUARDAR FOTO OCR
                </button>
              )}
              {cameraOn && resultado && (
                <button
                  onClick={capturarOtraFoto}
                  className="flex-1 gestarian-btn-primary gestarian-btn px-3 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
                >
                  <Camera className="w-4 h-4" /> CAPTURAR
                </button>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={addingPhoto || !currentPlate}
                className="flex-1 gestarian-btn gestarian-btn-secondary px-3 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                SUBIR FOTOS
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleUpload(e.target.files)}
              />
            </div>

            {/* Thumbnail strip */}
            {savedPhotos.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {savedPhotos.map((img, i) => (
                  <button
                    key={img.id}
                    onClick={() => { setViewerIdx(i); setViewerOpen(true) }}
                    className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-white/20 hover:border-cyan-400/60 transition-all"
                  >
                    <img src={img.image_data} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom action bar */}
      <div className="p-4 flex justify-center gap-3" onClick={(e) => e.stopPropagation()}>
        {!foto && cameraOn && !resultado && !knownMatricula && (
          <button onClick={capturarFoto} className="w-16 h-16 rounded-full bg-white border-4 border-cyan-400 flex items-center justify-center active:scale-95 transition-transform" aria-label="Capturar">
            <div className="w-12 h-12 rounded-full bg-cyan-400/30" />
          </button>
        )}
        {!foto && cameraOn && knownMatricula && (
          <button onClick={capturarOtraFoto} className="w-16 h-16 rounded-full bg-white border-4 border-cyan-400 flex items-center justify-center active:scale-95 transition-transform" aria-label="Capturar">
            <div className="w-12 h-12 rounded-full bg-cyan-400/30" />
          </button>
        )}
        {foto && !scanning && resultado && !noDetectada && !knownMatricula && (
          <>
            <button onClick={reintentar} className="gestarian-btn gestarian-btn-secondary px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2">
              <RefreshCw className="w-4 h-4" /> Repetir
            </button>
            <button
              onClick={confirmar}
              disabled={!canConfirm}
              className="gestarian-btn-primary gestarian-btn px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
            >
              <Check className="w-4 h-4" /> Confirmar
            </button>
          </>
        )}
        {foto && !scanning && editing && !knownMatricula && (
          <button
            onClick={confirmar}
            disabled={!canConfirm}
            className="gestarian-btn-primary gestarian-btn px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
          >
            <Check className="w-4 h-4" /> Confirmar
          </button>
        )}
        {knownMatricula && (
          <button
            onClick={confirmar}
            className="gestarian-btn-primary gestarian-btn px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2"
          >
            <Check className="w-4 h-4" /> Cerrar
          </button>
        )}
      </div>

      {/* Full-screen zoom viewer */}
      {viewerOpen && viewerIdx !== null && savedPhotos[viewerIdx] && (
        <div className="fixed inset-0 z-[105] bg-black flex flex-col" onClick={() => setViewerOpen(false)}>
          <div className="flex items-center justify-between p-4 text-white" onClick={(e) => e.stopPropagation()}>
            <span className="text-sm font-semibold">Foto {viewerIdx + 1} de {savedPhotos.length}</span>
            <button onClick={() => setViewerOpen(false)} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/10">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div
            className="flex-1 relative overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing"
            onClick={(e) => e.stopPropagation()}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <img
              src={savedPhotos[viewerIdx].image_data}
              alt={`Foto ${viewerIdx + 1}`}
              className="max-w-full max-h-full object-contain transition-transform duration-150 select-none pointer-events-none"
              style={{ transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)` }}
              draggable={false}
            />
            <div className="absolute top-4 right-4 flex flex-col gap-2">
              <button onClick={() => setZoom((z) => Math.min(5, z + 0.5))} className="w-10 h-10 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white">
                <ZoomIn className="w-5 h-5" />
              </button>
              <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }} className="w-10 h-10 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-xs font-bold">
                {Math.round(zoom * 100)}%
              </button>
              <button onClick={() => setZoom((z) => Math.max(1, z - 0.5))} className="w-10 h-10 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white">
                <ZoomOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
