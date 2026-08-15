import { useState, useRef, useCallback, useEffect } from 'react'
import { X, ZoomIn, ZoomOut, Camera, Trash2, Loader2, ChevronLeft, ChevronRight, Maximize, Minimize } from 'lucide-react'
import { fetchVehicleImages, addVehicleImage, deleteVehicleImage, type VehicleImage } from '../lib/vehicleImages'

type Props = {
  open: boolean
  matricula: string
  onClose: () => void
}

export function ImageViewer({ open, matricula, onClose }: Props) {
  const [images, setImages] = useState<VehicleImage[]>([])
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [loading, setLoading] = useState(false)
  const [addingPhoto, setAddingPhoto] = useState(false)
  const [cameraOn, setCameraOn] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isPanning = useRef(false)
  const panStart = useRef({ x: 0, y: 0 })
  const [touchDist, setTouchDist] = useState<number | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const loadImages = useCallback(async () => {
    if (!matricula) return
    setLoading(true)
    const imgs = await fetchVehicleImages(matricula)
    setImages(imgs)
    setLoading(false)
    setSelectedIdx(imgs.length > 0 ? 0 : null)
  }, [matricula])

  useEffect(() => {
    if (open) {
      loadImages()
      setZoom(1)
      setPan({ x: 0, y: 0 })
    } else {
      stopCamera()
    }
  }, [open])

  useEffect(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [selectedIdx])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setCameraOn(false)
  }, [])

  const startCamera = useCallback(async () => {
    try {
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
    } catch {
      setCameraOn(false)
    }
  }, [])

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    stopCamera()
    setAddingPhoto(true)
    const newImg = await addVehicleImage(matricula, dataUrl)
    if (newImg) {
      setImages((prev) => [...prev, newImg])
      setSelectedIdx(images.length)
    }
    setAddingPhoto(false)
  }, [matricula, stopCamera, images.length])

  const handleUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setAddingPhoto(true)
    for (const file of Array.from(files)) {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const newImg = await addVehicleImage(matricula, dataUrl)
      if (newImg) {
        setImages((prev) => [...prev, newImg])
      }
    }
    setAddingPhoto(false)
    setSelectedIdx(images.length)
  }, [matricula, images.length])

  const handleDelete = useCallback(async (id: string) => {
    const ok = await deleteVehicleImage(id)
    if (ok) {
      setImages((prev) => {
        const next = prev.filter((img) => img.id !== id)
        if (selectedIdx !== null && selectedIdx >= next.length) {
          setSelectedIdx(next.length > 0 ? next.length - 1 : null)
        }
        return next
      })
    }
  }, [selectedIdx])

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

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      setTouchDist(dist)
    } else if (e.touches.length === 1 && zoom > 1) {
      isPanning.current = true
      panStart.current = { x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y }
    } else if (e.touches.length === 1 && zoom === 1) {
      panStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    }
  }, [zoom, pan])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchDist !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      const scale = dist / touchDist
      setZoom((z) => Math.max(1, Math.min(5, z * scale)))
      setTouchDist(dist)
    } else if (e.touches.length === 1 && isPanning.current && zoom > 1) {
      setPan({ x: e.touches[0].clientX - panStart.current.x, y: e.touches[0].clientY - panStart.current.y })
    }
  }, [touchDist, zoom])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    setTouchDist(null)
    isPanning.current = false
    if (zoom === 1 && e.changedTouches.length === 1 && panStart.current.x !== 0) {
      const deltaX = e.changedTouches[0].clientX - panStart.current.x
      if (Math.abs(deltaX) > 50) {
        if (deltaX > 0 && images.length > 1) {
          setSelectedIdx((prev) => (prev! - 1 + images.length) % images.length)
        } else if (images.length > 1) {
          setSelectedIdx((prev) => (prev! + 1) % images.length)
        }
      }
      panStart.current = { x: 0, y: 0 }
    }
  }, [zoom, images.length])

  const toggleFullscreen = () => {
    const el = document.getElementById('image-viewer-container')
    if (!document.fullscreenElement) {
      el?.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {})
    }
  }

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  const handleClose = useCallback(() => {
    if (window.confirm('¿Estás seguro de que quieres salir del visor de imágenes?')) {
      onClose()
    }
  }, [onClose])

  if (!open) return null

  const currentImage = selectedIdx !== null ? images[selectedIdx] : null

  return (
    <div id="image-viewer-container" className="fixed inset-0 z-[110] bg-black flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 text-white relative">
        <div className="w-16"></div> {/* Spacer to balance */}

        <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center z-10 pointer-events-none">
          <span className="font-bold text-lg md:text-xl tracking-widest bg-black/40 px-6 py-1.5 rounded-full border border-white/10 backdrop-blur-md shadow-lg">{matricula}</span>
          <span className="text-xs text-white/50 mt-1 font-medium">{images.length} foto{images.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="flex items-center gap-2 relative z-10">
          <button onClick={toggleFullscreen} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 bg-black/40 backdrop-blur-md border border-white/5 transition-colors" aria-label="Pantalla completa">
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </button>
          <button onClick={handleClose} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-red-500/80 bg-black/40 backdrop-blur-md border border-white/5 transition-colors" aria-label="Cerrar">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main viewer area — fills all space above bottom bar */}
      <div className="flex-1 min-h-0 relative overflow-hidden flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
        {loading ? (
          <div className="flex items-center gap-2 text-cyan-400 text-sm">
            <Loader2 className="w-5 h-5 animate-spin" /> Cargando imágenes...
          </div>
        ) : cameraOn ? (
          <div className="relative w-full max-w-2xl">
            <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-lg" />
            <div className="absolute inset-8 border-2 border-cyan-400/60 rounded-lg pointer-events-none" />
            <div className="flex justify-center mt-4">
              <button onClick={capturePhoto} className="w-16 h-16 rounded-full bg-white border-4 border-cyan-400 flex items-center justify-center active:scale-95 transition-transform" aria-label="Capturar">
                <div className="w-12 h-12 rounded-full bg-cyan-400/30" />
              </button>
            </div>
          </div>
        ) : currentImage ? (
          <>
            <div
              className="w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing"
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <img
                src={currentImage.image_data}
                alt={`Foto ${selectedIdx! + 1}`}
                className="max-w-full max-h-full object-contain transition-transform duration-150 select-none pointer-events-none"
                style={{
                  transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                }}
                draggable={false}
              />
            </div>

            {/* Nav arrows */}
            {images.length > 1 && (
              <>
                <button
                  onClick={() => setSelectedIdx((prev) => (prev! - 1 + images.length) % images.length)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={() => setSelectedIdx((prev) => (prev! + 1) % images.length)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}

            {/* Zoom controls */}
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

            {/* Delete button */}
            <button
              onClick={() => handleDelete(currentImage.id)}
              className="absolute top-4 left-4 w-10 h-10 rounded-lg bg-red-500/20 hover:bg-red-500/40 flex items-center justify-center text-red-400"
              aria-label="Eliminar foto"
            >
              <Trash2 className="w-5 h-5" />
            </button>

            {/* Counter */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-white/50">
              {selectedIdx! + 1} / {images.length}
            </div>
          </>
        ) : addingPhoto ? (
          <div className="flex items-center gap-2 text-cyan-400 text-sm">
            <Loader2 className="w-5 h-5 animate-spin" /> Guardando foto...
          </div>
        ) : (
          <div className="text-center text-white/40">
            <Camera className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No hay fotos para este vehículo</p>
            <p className="text-xs mt-1">Usa el botón de cámara para añadir la primera foto</p>
          </div>
        )}
      </div>

      {/* Bottom bar: Thumbnails + Camera — fixed height, no overflow */}
      <div className="bg-black/80 border-t border-white/10 p-2 flex flex-col gap-2 shrink-0 max-h-[220px]" onClick={(e) => e.stopPropagation()}>
        {/* Thumbnails strip — horizontal scroll contained */}
        <div className="flex gap-2 overflow-x-auto overflow-y-hidden pb-1" style={{ scrollbarWidth: 'none' }}>
          {images.map((img, i) => (
            <button
              key={img.id}
              onClick={() => { setSelectedIdx(i); stopCamera() }}
              className={`flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${
                selectedIdx === i ? 'border-cyan-400 scale-105' : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              <img src={img.image_data} alt={`Miniatura ${i + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
          {images.length === 0 && !cameraOn && (
            <p className="text-xs text-white/30 self-center mx-auto py-4">Sin fotos aún</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={cameraOn ? capturePhoto : startCamera}
            disabled={addingPhoto}
            className="w-12 h-12 rounded-full bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 flex items-center justify-center text-cyan-400 disabled:opacity-50"
            aria-label="Añadir foto con cámara"
          >
            {addingPhoto ? <Loader2 className="w-6 h-6 animate-spin" /> : <Camera className="w-6 h-6" />}
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={addingPhoto}
            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold disabled:opacity-50"
          >
            SUBIR FOTO
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
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
