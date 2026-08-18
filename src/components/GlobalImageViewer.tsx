import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  ChevronLeft, ChevronRight, Camera, Trash2,
  ZoomIn, ZoomOut, RotateCcw, RefreshCw
} from 'lucide-react'
import { MatriculaBadge } from './MatriculaBadge'
import { playCameraShutterSound } from '../lib/sound'

interface GlobalImageViewerProps {
  isOpen: boolean
  onClose: () => void
  images: string[]
  onAddImage: (dataUrl: string) => Promise<void>
  onDeleteImage: (index: number) => Promise<void>
  title?: string
  matricula?: string
  customAction?: React.ReactNode
}

export function GlobalImageViewer({
  isOpen,
  onClose,
  images,
  onAddImage,
  onDeleteImage,
  title = "Imágenes",
  matricula,
  customAction
}: GlobalImageViewerProps) {
  // 'camera' mode or viewing a photo index
  const [activeMode, setActiveMode] = useState<'camera' | 'photo'>(images.length > 0 ? 'photo' : 'camera')
  const [selectedIndex, setSelectedIndex] = useState<number>(0)
  const [isUploading, setIsUploading] = useState(false)
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment')
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null)

  // Zoom & Pan for photo mode
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const isPanning = useRef(false)
  const panStart = useRef({ x: 0, y: 0 })
  const [touchDist, setTouchDist] = useState<number | null>(null)
  const lastTapRef = useRef<number>(0)

  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Extraer matrícula si viene en la prop o en el título
  const extractedMatricula = matricula || (() => {
    if (!title) return null
    const match = title.match(/[A-Z0-9]{4,8}/i)
    if (title.toLowerCase().includes('vehículo') || title.toLowerCase().includes('vehiculo') || title.toLowerCase().includes('expediente')) {
      const parts = title.split(/\s+/)
      const lastPart = parts[parts.length - 1]
      if (lastPart && /^[0-9]{4}[A-Z]{3}$|^[A-Z]{1,2}[0-9]{4}[A-Z]{1,2}$/i.test(lastPart)) {
        return lastPart
      }
    }
    return match ? match[0] : null
  })()

  // Fullscreen automático al abrir el visor
  useEffect(() => {
    if (isOpen) {
      window.dispatchEvent(new CustomEvent('gestarian-toggle-footer', { detail: { hide: true } }))
      if (!document.fullscreenElement && containerRef.current) {
        containerRef.current.requestFullscreen?.().catch(() => {})
      }
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {})
      }
    }
    return () => {
      window.dispatchEvent(new CustomEvent('gestarian-toggle-footer', { detail: { hide: false } }))
    }
  }, [isOpen])

  // Iniciar / detener cámara directamente dentro de la interfaz
  const startCamera = useCallback(async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: cameraFacing,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      })

      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play().catch(() => {})
      }
      setHasCameraPermission(true)
    } catch (err) {
      console.warn("No se pudo iniciar la cámara web/móvil directa:", err)
      setHasCameraPermission(false)
    }
  }, [cameraFacing])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [])

  // Control de ciclo de vida de la cámara según apertura y modo
  useEffect(() => {
    if (isOpen && activeMode === 'camera') {
      startCamera()
    } else {
      stopCamera()
    }
    return () => {
      stopCamera()
    }
  }, [isOpen, activeMode, startCamera, stopCamera])

  // Reset al cambiar imágenes
  useEffect(() => {
    if (images.length === 0) {
      setActiveMode('camera')
      setSelectedIndex(0)
    } else if (selectedIndex >= images.length) {
      setSelectedIndex(images.length - 1)
    }
  }, [images.length, selectedIndex])

  useEffect(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [selectedIndex, activeMode])

  const [isCapturingAnim, setIsCapturingAnim] = useState(false)

  // Capturar imagen directamente de la cámara (guardado automático)
  const handleCapturePhoto = async () => {
    if (activeMode !== 'camera') {
      setActiveMode('camera')
      return
    }

    setIsCapturingAnim(true)
    setTimeout(() => setIsCapturingAnim(false), 480)

    if (!videoRef.current) return
    const video = videoRef.current
    if (video.videoWidth === 0 || video.videoHeight === 0) return

    setIsUploading(true)
    try {
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.88)
        await onAddImage(dataUrl)
        setSelectedIndex(images.length)
        setActiveMode('photo')
      }
    } catch (e) {
      console.error('Error capturando foto:', e)
    } finally {
      setIsUploading(false)
    }
  }

  // Adjuntar imágenes desde la galería (hasta 10 imágenes a la vez)
  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files
    if (!fileList || fileList.length === 0) return

    const files = Array.from(fileList).slice(0, 10)
    setIsUploading(true)
    try {
      for (const file of files) {
        await new Promise<void>((resolve) => {
          const reader = new FileReader()
          reader.onloadend = async () => {
            const dataUrl = reader.result as string
            if (dataUrl) {
              await onAddImage(dataUrl)
            }
            resolve()
          }
          reader.readAsDataURL(file)
        })
      }
      setSelectedIndex(images.length + files.length - 1)
      setActiveMode('photo')
    } finally {
      setIsUploading(false)
      e.target.value = ''
    }
  }

  // Zoom & Pan handlers
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (activeMode !== 'photo') return
    e.preventDefault()
    setZoom((z) => Math.max(1, Math.min(5, z + (e.deltaY < 0 ? 0.3 : -0.3))))
  }, [activeMode])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (activeMode !== 'photo' || zoom <= 1) return
    isPanning.current = true
    panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }
  }, [activeMode, zoom, pan])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (activeMode !== 'photo' || !isPanning.current || zoom <= 1) return
    setPan({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y })
  }, [activeMode, zoom])

  const handleMouseUp = useCallback(() => {
    isPanning.current = false
  }, [])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (activeMode !== 'photo') return
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      setTouchDist(dist)
    } else if (e.touches.length === 1) {
      const now = Date.now()
      if (now - lastTapRef.current < 300) {
        setZoom((z) => (z > 1 ? 1 : 2.5))
        setPan({ x: 0, y: 0 })
        lastTapRef.current = 0
        return
      }
      lastTapRef.current = now

      if (zoom > 1) {
        isPanning.current = true
        panStart.current = { x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y }
      } else {
        panStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      }
    }
  }, [activeMode, zoom, pan])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (activeMode !== 'photo') return
    if (e.touches.length === 2 && touchDist !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      const scale = dist / touchDist
      setZoom((z) => Math.max(1, Math.min(5, z * scale)))
      setTouchDist(dist)
    } else if (e.touches.length === 1 && zoom > 1 && isPanning.current) {
      setPan({
        x: e.touches[0].clientX - panStart.current.x,
        y: e.touches[0].clientY - panStart.current.y
      })
    }
  }, [activeMode, touchDist, zoom])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (activeMode !== 'photo') return
    setTouchDist(null)
    isPanning.current = false

    if (zoom === 1 && e.changedTouches.length === 1 && panStart.current.x !== 0) {
      const deltaX = e.changedTouches[0].clientX - panStart.current.x
      if (Math.abs(deltaX) > 40 && images.length > 1) {
        if (deltaX > 0) {
          setSelectedIndex((prev) => (prev - 1 + images.length) % images.length)
        } else {
          setSelectedIndex((prev) => (prev + 1) % images.length)
        }
      }
      panStart.current = { x: 0, y: 0 }
    }
  }, [activeMode, zoom, images.length])

  const handleDelete = async (index: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta imagen?')) return
    await onDeleteImage(index)
  }

  if (!isOpen) return null

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[120] w-screen h-[100dvh] max-h-[100dvh] bg-black flex flex-col justify-between overflow-hidden select-none animate-fade-in touch-none"
    >
      {/* Header bar: ChevronLeft (x2 tamaño) a la izquierda, Matrícula española exacta en el centro */}
      <div className="w-full flex items-center justify-between px-3 sm:px-6 py-3 bg-gradient-to-b from-black/95 via-black/70 to-transparent z-30 shrink-0">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-white bg-white/10 hover:bg-white/20 active:scale-95 px-4 sm:px-5 py-2.5 rounded-2xl backdrop-blur-md transition-all text-base sm:text-lg font-bold shrink-0 shadow-lg border border-white/15"
          aria-label="Volver"
        >
          <ChevronLeft className="w-8 h-8 sm:w-10 sm:h-10 text-cyan-400 stroke-[2.5]" />
          <span className="hidden xs:inline sm:inline">Volver</span>
        </button>

        {/* Centro: Matrícula Oficial Española */}
        <div className="flex flex-col items-center justify-center text-center">
          {extractedMatricula ? (
            <div className="scale-105 sm:scale-125 origin-center drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
              <MatriculaBadge matricula={extractedMatricula} size="md" />
            </div>
          ) : (
            <span className="text-white font-black text-base sm:text-xl drop-shadow-md truncate max-w-[200px] sm:max-w-[340px]">
              {title}
            </span>
          )}
        </div>

        {/* Botón cambiar cámara frontal / trasera y customAction si se proporciona */}
        <div className="flex items-center gap-2 shrink-0">
          {customAction}
          {activeMode === 'camera' && (
            <button
              onClick={() => setCameraFacing((prev) => (prev === 'environment' ? 'user' : 'environment'))}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl text-white bg-white/10 hover:bg-white/20 active:scale-95 transition-all backdrop-blur-md flex items-center justify-center border border-white/15 shadow-lg"
              title="Girar cámara"
            >
              <RefreshCw className="w-7 h-7 text-cyan-400 stroke-[2]" />
            </button>
          )}
        </div>
      </div>

      {/* Main Viewport con altura al 80% (Cámara en vivo o Foto con Zoom/Pan) */}
      <div
        className="w-full relative h-[68vh] sm:h-[72vh] max-h-[75vh] flex-initial overflow-hidden flex items-center justify-center bg-black touch-none"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {activeMode === 'camera' ? (
          /* VISTA DIRECTA DE CÁMARA DENTRO DEL DISEÑO DEL VISOR */
          <div className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden">
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="w-full h-full object-cover sm:object-contain select-none pointer-events-none"
            />
            {hasCameraPermission === false && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-bg-950/90 z-20">
                <Camera className="w-16 h-16 text-rose-500 mb-3" />
                <p className="text-white font-bold text-lg">Cámara no disponible o sin permiso</p>
                <p className="text-slate-400 text-xs mt-1">Puedes adjuntar imágenes desde la galería con el botón inferior.</p>
              </div>
            )}
          </div>
        ) : images.length > 0 ? (
          /* VISTA DE IMAGEN GUARDADA SELECCIONADA CON ZOOM Y PAN */
          <div className="relative w-full h-full flex items-center justify-center p-2">
            <img
              src={images[selectedIndex]}
              alt={`Imagen ${selectedIndex + 1}`}
              className="max-w-full max-h-full object-contain drop-shadow-2xl transition-transform duration-75 select-none pointer-events-none"
              style={{
                transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
              }}
              draggable={false}
            />

            {/* Lateral Navigation Arrow - Left */}
            {images.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedIndex((prev) => (prev - 1 + images.length) % images.length)
                }}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-black/70 hover:bg-cyan-600 text-white flex items-center justify-center backdrop-blur-md border border-white/20 active:scale-90 transition-all z-10 shadow-xl"
                aria-label="Imagen anterior"
              >
                <ChevronLeft className="w-8 h-8 stroke-[2.5]" />
              </button>
            )}

            {/* Lateral Navigation Arrow - Right */}
            {images.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedIndex((prev) => (prev + 1) % images.length)
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-black/70 hover:bg-cyan-600 text-white flex items-center justify-center backdrop-blur-md border border-white/20 active:scale-90 transition-all z-10 shadow-xl"
                aria-label="Siguiente imagen"
              >
                <ChevronRight className="w-8 h-8 stroke-[2.5]" />
              </button>
            )}

            {/* Zoom Controls Overlay */}
            <div className="absolute top-2 right-2 flex flex-col gap-2 z-10">
              <button
                onClick={() => setZoom((z) => Math.min(5, z + 0.5))}
                className="w-11 h-11 rounded-2xl bg-black/70 hover:bg-cyan-600 active:scale-95 text-white flex items-center justify-center backdrop-blur-md border border-white/20 shadow-lg"
                title="Ampliar zoom"
              >
                <ZoomIn className="w-6 h-6 stroke-[2]" />
              </button>
              {zoom > 1 && (
                <button
                  onClick={() => {
                    setZoom(1)
                    setPan({ x: 0, y: 0 })
                  }}
                  className="w-11 h-11 rounded-2xl bg-cyan-600 hover:bg-cyan-500 active:scale-95 text-white flex items-center justify-center backdrop-blur-md border border-white/20 shadow-lg"
                  title="Restablecer zoom"
                >
                  <RotateCcw className="w-6 h-6 stroke-[2]" />
                </button>
              )}
              <button
                onClick={() => setZoom((z) => Math.max(1, z - 0.5))}
                className="w-11 h-11 rounded-2xl bg-black/70 hover:bg-cyan-600 active:scale-95 text-white flex items-center justify-center backdrop-blur-md border border-white/20 shadow-lg"
                title="Reducir zoom"
              >
                <ZoomOut className="w-6 h-6 stroke-[2]" />
              </button>
            </div>

            {/* Delete current main image button */}
            <button
              onClick={() => handleDelete(selectedIndex)}
              className="absolute top-2 left-2 bg-red-600/80 hover:bg-red-600 text-white p-3 rounded-2xl shadow-xl backdrop-blur-md transition-transform hover:scale-105 active:scale-95 z-10 border border-red-400/30"
              title="Eliminar esta imagen"
            >
              <Trash2 className="w-6 h-6 stroke-[2]" />
            </button>
          </div>
        ) : (
          <div className="text-white/50 text-center flex flex-col items-center gap-3 p-4">
            <Camera className="w-16 h-16 opacity-30 text-cyan-400" />
            <p className="text-base font-semibold">No hay imágenes disponibles</p>
          </div>
        )}
      </div>

      {/* Footer del Visor: Miniaturas en 1ª línea y Botones en 2ª línea */}
      <div className="w-full bg-slate-950/95 backdrop-blur-2xl border-t border-white/10 px-4 py-2.5 z-30 shrink-0 space-y-2.5">
        
        {/* PRIMERA LÍNEA: Miniaturas de las imágenes guardadas (sin icono verde) */}
        <div className="w-full flex items-center justify-center overflow-x-auto gap-2.5 py-1 px-1" style={{ scrollbarWidth: 'none' }}>
          {images.length === 0 ? (
            <div className="text-xs text-slate-500 italic py-1">Sin capturas</div>
          ) : (
            images.map((img, i) => (
              <div
                key={i}
                className={`shrink-0 relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${
                  activeMode === 'photo' && i === selectedIndex
                    ? 'border-cyan-400 scale-105 shadow-[0_0_14px_rgba(6,182,212,0.8)]'
                    : 'border-transparent opacity-60 hover:opacity-100'
                }`}
                onClick={() => {
                  setSelectedIndex(i)
                  setActiveMode('photo')
                }}
              >
                <img src={img} alt={`Miniatura ${i}`} className="w-full h-full object-cover" />

                {/* Thumbnail delete button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(i)
                  }}
                  className="absolute top-0.5 right-0.5 bg-black/80 hover:bg-red-600 text-white p-1 rounded-full transition-colors"
                  title="Eliminar"
                >
                  <Trash2 className="w-3 h-3 text-red-400" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* SEGUNDA LÍNEA: Botones ADJUNTAR y CAPTURAR simétricos en la misma línea */}
        <div className="w-full flex items-center justify-center gap-4 sm:gap-6 pt-1">
          {/* Botón ADJUNTAR (Relleno negro, borde 2px gris claro 20%, texto gris claro 20%, sin icono, sin animar) */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 max-w-[170px] sm:max-w-[200px] py-2.5 px-4 rounded-2xl bg-black text-gray-300 font-bold text-sm sm:text-base border-2 border-gray-300 tracking-[1px] flex items-center justify-center shadow-lg transition-all active:scale-95 cursor-pointer uppercase select-none"
            title="Adjuntar imágenes de la galería (hasta 10)"
          >
            <span>ADJUNTAR</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleGalleryUpload}
            disabled={isUploading}
          />

          {/* Botón CAPTURAR (Relleno negro, borde 2px gris claro 20%, texto gris claro 20%, simétrico, anima solo al pulsar) */}
          <button
            onClick={() => {
              playCameraShutterSound()
              handleCapturePhoto()
            }}
            disabled={isUploading}
            className={`flex-1 max-w-[170px] sm:max-w-[200px] py-2.5 px-4 rounded-2xl bg-black text-gray-300 font-bold text-sm sm:text-base border-2 border-gray-300 tracking-[1px] flex items-center justify-center shadow-xl cursor-pointer uppercase select-none transition-all active:scale-95 ${
              isCapturingAnim ? 'btn-capture-animating' : ''
            }`}
          >
            {isUploading ? (
              <div className="w-5 h-5 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>CAPTURAR</span>
            )}
          </button>
        </div>

      </div>
    </div>
  )
}
