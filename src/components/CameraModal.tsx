import {
  useState,
  useRef,
  useCallback,
  useEffect,
} from 'react'
import {
  Camera,
  X,
  RefreshCw,
  Check,
  Loader2,
  Edit3,
  AlertCircle,
  Upload,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'

import {
  addVehicleImage,
  fetchVehicleImages,
  type VehicleImage,
} from '../lib/vehicleImages'

import {
  recognizeVehiclePlate,
} from '../services/plateRecognizerService'

type Props = {
  open: boolean
  onClose: () => void
  onMatriculaDetected: (matricula: string) => void
  knownMatricula?: string | null
}

export function CameraModal({
  open,
  onClose,
  onMatriculaDetected,
  knownMatricula,
}: Props) {
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

  // Gestión de fotografías del vehículo
  const [savedPhotos, setSavedPhotos] = useState<VehicleImage[]>([])
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerIdx, setViewerIdx] = useState<number | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [addingPhoto, setAddingPhoto] = useState(false)

  const isPanning = useRef(false)
  const panStart = useRef({ x: 0, y: 0 })

  /**
   * Inicia la cámara.
   */
  const iniciarCamara = useCallback(async () => {
    setError(null)
    setFoto(null)
    setNoDetectada(false)
    setEditing(false)

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError(
          'Tu navegador no soporta acceso a la cámara.'
        )
        return
      }

      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: {
              ideal: 'environment',
            },
          },
          audio: false,
        })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream

        await videoRef.current
          .play()
          .catch(() => {})
      }

      setCameraOn(true)
    } catch (err: unknown) {
      const errorName =
        err instanceof DOMException
          ? err.name
          : ''

      if (errorName === 'NotAllowedError') {
        setError(
          'Permiso de cámara denegado. Activa los permisos en tu navegador.'
        )
      } else if (errorName === 'NotFoundError') {
        setError(
          'No se encontró ninguna cámara en este dispositivo.'
        )
      } else {
        setError(
          'No se pudo acceder a la cámara. Revisa los permisos del navegador.'
        )
      }
    }
  }, [])

  /**
   * Detiene completamente la cámara.
   */
  const detenerCamara = useCallback(() => {
    if (streamRef.current) {
      streamRef.current
        .getTracks()
        .forEach((track) => track.stop())

      streamRef.current = null
    }

    setCameraOn(false)
  }, [])

  /**
   * Inicialización del modal.
   *
   * Si ya conocemos la matrícula, cargamos sus fotografías
   * y permitimos añadir nuevas imágenes.
   */
  useEffect(() => {
    if (open) {
      if (knownMatricula) {
        const plate = knownMatricula
          .toUpperCase()
          .replace(/\s/g, '')

        setResultado(plate)
        setManualMatricula(plate)

        fetchVehicleImages(plate)
          .then(setSavedPhotos)

        iniciarCamara()
      } else {
        setResultado(null)
        setManualMatricula('')
        setSavedPhotos([])

        iniciarCamara()
      }
    } else {
      detenerCamara()
    }

    return () => {
      detenerCamara()
    }
  }, [
    open,
    knownMatricula,
    iniciarCamara,
    detenerCamara,
  ])

  /**
   * Asegura que el vídeo vuelve a recibir el stream
   * cuando la cámara se activa.
   */
  useEffect(() => {
    if (
      cameraOn &&
      streamRef.current &&
      videoRef.current
    ) {
      videoRef.current.srcObject =
        streamRef.current

      videoRef.current
        .play()
        .catch(() => {})
    }
  }, [cameraOn])

  /**
   * Captura la fotografía inicial destinada
   * a reconocer la matrícula.
   */
  const capturarFoto = useCallback(() => {
    if (
      !videoRef.current ||
      !canvasRef.current
    ) {
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current

    if (
      !video.videoWidth ||
      !video.videoHeight
    ) {
      setError(
        'La cámara todavía no está lista. Inténtalo de nuevo.'
      )
      return
    }

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const ctx = canvas.getContext('2d')

    if (!ctx) {
      setError(
        'No se pudo procesar la fotografía.'
      )
      return
    }

    ctx.drawImage(
      video,
      0,
      0,
      canvas.width,
      canvas.height
    )

    const dataUrl =
      canvas.toDataURL(
        'image/jpeg',
        0.85
      )

    setFoto(dataUrl)
    detenerCamara()

    void runOCR(dataUrl)
  }, [detenerCamara])

  /**
   * OCR DE MATRÍCULA
   *
   * IMPORTANTE:
   * Toda la comunicación con Plate Recognizer
   * se realiza exclusivamente desde
   * plateRecognizerService.ts
   *
   * CameraModal NO contiene API Keys ni llamadas
   * directas al proveedor OCR.
   */
  const runOCR = useCallback(
    async (imageData: string) => {
      setScanning(true)
      setResultado(null)
      setNoDetectada(false)
      setError(null)

      try {
        const recognitionResult =
          await recognizeVehiclePlate(
            imageData
          )

        if (
          recognitionResult.success &&
          recognitionResult.matricula
        ) {
          const plate =
            recognitionResult.matricula_normalizada ||
            recognitionResult.matricula

          setResultado(plate)
          setManualMatricula(plate)

          /*
           * Cargar fotografías existentes
           * asociadas a la matrícula detectada.
           */
          const existing =
            await fetchVehicleImages(
              plate
            )

          setSavedPhotos(existing)
        } else {
          setNoDetectada(true)

          /*
           * No mostramos el error como error bloqueante.
           * El usuario debe poder introducir la matrícula
           * manualmente.
           */
          console.warn(
            'No se pudo reconocer la matrícula:',
            recognitionResult.error_message
          )
        }
      } catch (err) {
        console.error(
          'Error ejecutando OCR de matrícula:',
          err
        )

        setNoDetectada(true)
      } finally {
        setScanning(false)
      }
    },
    []
  )

  /**
   * Guarda la fotografía utilizada para OCR
   * como fotografía del vehículo.
   */
  const guardarFotoOCR =
    useCallback(async () => {
      if (!foto || !resultado) {
        return
      }

      setAddingPhoto(true)

      try {
        const newImg =
          await addVehicleImage(
            resultado,
            foto
          )

        if (newImg) {
          setSavedPhotos((prev) => [
            ...prev,
            newImg,
          ])
        }
      } finally {
        setAddingPhoto(false)
      }
    }, [foto, resultado])

  /**
   * Activa la cámara para añadir otra fotografía
   * después de detectar o conocer la matrícula.
   */
  const tomarOtraFoto =
    useCallback(async () => {
      setError(null)

      try {
        if (
          !navigator.mediaDevices
            ?.getUserMedia
        ) {
          setError(
            'Tu navegador no soporta acceso a la cámara.'
          )
          return
        }

        const stream =
          await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: {
                ideal: 'environment',
              },
            },
            audio: false,
          })

        streamRef.current = stream

        if (videoRef.current) {
          videoRef.current.srcObject =
            stream

          await videoRef.current
            .play()
            .catch(() => {})
        }

        setCameraOn(true)
        setFoto(null)
      } catch {
        setError(
          'No se pudo acceder a la cámara.'
        )
      }
    }, [])

  /**
   * Captura y guarda directamente una fotografía
   * adicional del vehículo.
   */
  const capturarOtraFoto =
    useCallback(() => {
      if (
        !videoRef.current ||
        !canvasRef.current ||
        !resultado
      ) {
        return
      }

      const video = videoRef.current
      const canvas = canvasRef.current

      if (
        !video.videoWidth ||
        !video.videoHeight
      ) {
        return
      }

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      const ctx =
        canvas.getContext('2d')

      if (!ctx) {
        return
      }

      ctx.drawImage(
        video,
        0,
        0,
        canvas.width,
        canvas.height
      )

      const dataUrl =
        canvas.toDataURL(
          'image/jpeg',
          0.85
        )

      detenerCamara()

      setAddingPhoto(true)

      void addVehicleImage(
        resultado,
        dataUrl
      )
        .then((newImg) => {
          if (newImg) {
            setSavedPhotos((prev) => [
              ...prev,
              newImg,
            ])
          }
        })
        .finally(() => {
          setAddingPhoto(false)
        })
    }, [
      detenerCamara,
      resultado,
    ])

  /**
   * Sube una o varias fotografías
   * desde el dispositivo.
   */
  const handleUpload =
    useCallback(
      async (
        files: FileList | null
      ) => {
        if (
          !files ||
          files.length === 0 ||
          !resultado
        ) {
          return
        }

        setAddingPhoto(true)

        try {
          for (
            const file of Array.from(files)
          ) {
            const dataUrl =
              await new Promise<string>(
                (resolve, reject) => {
                  const reader =
                    new FileReader()

                  reader.onload = () =>
                    resolve(
                      reader.result as string
                    )

                  reader.onerror = reject

                  reader.readAsDataURL(
                    file
                  )
                }
              )

            const newImg =
              await addVehicleImage(
                resultado,
                dataUrl
              )

            if (newImg) {
              setSavedPhotos((prev) => [
                ...prev,
                newImg,
              ])
            }
          }
        } catch (err) {
          console.error(
            'Error subiendo fotografías:',
            err
          )

          setError(
            'No se pudo subir una o varias fotografías.'
          )
        } finally {
          setAddingPhoto(false)

          /*
           * Permite volver a seleccionar
           * el mismo archivo posteriormente.
           */
          if (fileInputRef.current) {
            fileInputRef.current.value = ''
          }
        }
      },
      [resultado]
    )

  /**
   * Reinicia completamente el proceso de OCR.
   */
  const reintentar =
    useCallback(() => {
      setFoto(null)
      setResultado(null)
      setNoDetectada(false)
      setEditing(false)
      setManualMatricula('')
      setSavedPhotos([])
      setError(null)

      iniciarCamara()
    }, [iniciarCamara])

  /**
   * Confirma la matrícula.
   */
  const confirmar =
    useCallback(() => {
      const sourcePlate =
        editing
          ? manualMatricula
          : resultado

      const final =
        sourcePlate
          ?.toUpperCase()
          .replace(/\s/g, '')
          .trim() || ''

      if (final.length >= 4) {
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
      setViewerIdx(null)

      onClose()
    }, [
      resultado,
      manualMatricula,
      editing,
      onMatriculaDetected,
      detenerCamara,
      onClose,
    ])

  /**
   * Cierra el modal y limpia el estado.
   */
  const cerrar =
    useCallback(() => {
      detenerCamara()

      setFoto(null)
      setResultado(null)
      setError(null)
      setEditing(false)
      setManualMatricula('')
      setNoDetectada(false)
      setSavedPhotos([])
      setViewerOpen(false)
      setViewerIdx(null)

      onClose()
    }, [
      detenerCamara,
      onClose,
    ])

  /**
   * Reinicia zoom y desplazamiento
   * al cambiar de fotografía.
   */
  useEffect(() => {
    setZoom(1)
    setPan({
      x: 0,
      y: 0,
    })
  }, [viewerIdx])

  const handleWheel =
    useCallback(
      (e: React.WheelEvent) => {
        e.preventDefault()

        setZoom((currentZoom) =>
          Math.max(
            1,
            Math.min(
              5,
              currentZoom +
                (e.deltaY < 0
                  ? 0.3
                  : -0.3)
            )
          )
        )
      },
      []
    )

  const handleMouseDown =
    useCallback(
      (e: React.MouseEvent) => {
        if (zoom <= 1) {
          return
        }

        isPanning.current = true

        panStart.current = {
          x: e.clientX - pan.x,
          y: e.clientY - pan.y,
        }
      },
      [zoom, pan]
    )

  const handleMouseMove =
    useCallback(
      (e: React.MouseEvent) => {
        if (!isPanning.current) {
          return
        }

        setPan({
          x:
            e.clientX -
            panStart.current.x,
          y:
            e.clientY -
            panStart.current.y,
        })
      },
      []
    )

  const handleMouseUp =
    useCallback(() => {
      isPanning.current = false
    }, [])

  if (!open) {
    return null
  }

  const canConfirm = editing
    ? manualMatricula.trim().length >= 4
    : resultado !== null

  const hasPlate =
    Boolean(resultado) ||
    (
      editing &&
      manualMatricula.trim().length >= 4
    )

  const currentPlate = editing
    ? manualMatricula
        .toUpperCase()
        .replace(/\s/g, '')
    : resultado
        ?.toUpperCase()
        .replace(/\s/g, '') || null

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/90 flex flex-col"
      onClick={cerrar}
    >
      {/* CABECERA */}

      <div
        className="flex items-center justify-between p-4 text-white"
        onClick={(e) =>
          e.stopPropagation()
        }
      >
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5" />

          <span className="font-semibold text-sm">
            Capturar matrícula
          </span>
        </div>

        <button
          onClick={cerrar}
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/10"
          aria-label="Cerrar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* CONTENIDO PRINCIPAL */}

      <div
        className="flex-1 flex flex-col items-center justify-center px-4 overflow-y-auto"
        onClick={(e) =>
          e.stopPropagation()
        }
      >
        {error ? (
          <div className="text-center max-w-sm">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />

            <p className="text-red-400 text-sm mb-4">
              {error}
            </p>

            <button
              onClick={iniciarCamara}
              className="gestarian-btn-primary gestarian-btn px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />

              Reintentar
            </button>
          </div>
        ) : foto ? (
          <div className="w-full max-w-md">
            <img
              src={foto}
              alt="Captura"
              className="w-full rounded-lg"
            />

            {scanning ? (
              <div className="mt-4 flex items-center justify-center gap-2 text-cyan-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />

                Analizando matrícula...
              </div>
            ) : noDetectada &&
              !editing ? (
              <div className="mt-4 text-center">
                <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-2" />

                <p className="text-amber-400 text-sm font-medium mb-1">
                  No se detectó ninguna matrícula válida
                </p>

                <p className="text-xs text-white/40 mb-3">
                  Asegúrate de que la matrícula sea legible y esté bien encuadrada.
                </p>

                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={reintentar}
                    className="gestarian-btn gestarian-btn-secondary px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />

                    Repetir foto
                  </button>

                  <button
                    onClick={() => {
                      setEditing(true)
                      setManualMatricula('')
                    }}
                    className="gestarian-btn gestarian-btn-ghost px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2"
                  >
                    <Edit3 className="w-4 h-4" />

                    Introducir manual
                  </button>
                </div>
              </div>
            ) : resultado &&
              !editing ? (
              <div className="mt-4 text-center">
                <p className="text-xs text-white/50 mb-1">
                  Matrícula detectada:
                </p>

                <p className="text-2xl font-bold text-white tracking-widest">
                  {resultado}
                </p>

                <button
                  onClick={() => {
                    setEditing(true)
                    setManualMatricula(
                      resultado
                    )
                  }}
                  className="mt-2 text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 mx-auto"
                >
                  <Edit3 className="w-3 h-3" />

                  Corregir manualmente
                </button>
              </div>
            ) : null}

            {editing && (
              <div className="mt-4 text-center">
                <p className="text-xs text-white/50 mb-1">
                  Introduce la matrícula:
                </p>

                <input
                  type="text"
                  value={manualMatricula}
                  onChange={(e) =>
                    setManualMatricula(
                      e.target.value.toUpperCase()
                    )
                  }
                  placeholder="1234 ABC"
                  maxLength={10}
                  autoFocus
                  className="w-40 text-center text-2xl font-bold text-white tracking-widest bg-bg-800 border border-cyan-500 rounded-lg px-3 py-2 focus:outline-none"
                />
              </div>
            )}
          </div>
        ) : cameraOn ? (
          <div className="w-full max-w-md relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full rounded-lg"
            />

            {!knownMatricula && (
              <div className="absolute inset-8 border-2 border-cyan-400/60 rounded-lg pointer-events-none" />
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          </div>
        )}

        {/* GESTIÓN DE FOTOGRAFÍAS */}

        {hasPlate &&
          !scanning && (
            <div className="w-full max-w-md mt-6 pb-2">
              <div className="flex gap-3 mb-3">
                {!foto &&
                  !cameraOn &&
                  resultado && (
                    <button
                      onClick={tomarOtraFoto}
                      disabled={addingPhoto}
                      className="flex-1 gestarian-btn gestarian-btn-secondary px-3 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {addingPhoto ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Camera className="w-4 h-4" />
                      )}

                      AÑADIR FOTO
                    </button>
                  )}

                {foto &&
                  resultado &&
                  !editing && (
                    <button
                      onClick={guardarFotoOCR}
                      disabled={addingPhoto}
                      className="flex-1 gestarian-btn gestarian-btn-secondary px-3 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {addingPhoto ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Camera className="w-4 h-4" />
                      )}

                      GUARDAR FOTO OCR
                    </button>
                  )}

                {cameraOn &&
                  resultado && (
                    <button
                      onClick={capturarOtraFoto}
                      disabled={addingPhoto}
                      className="flex-1 gestarian-btn-primary gestarian-btn px-3 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {addingPhoto ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Camera className="w-4 h-4" />
                      )}

                      CAPTURAR
                    </button>
                  )}

                <button
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  disabled={
                    addingPhoto ||
                    !currentPlate
                  }
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
                  onChange={(e) =>
                    void handleUpload(
                      e.target.files
                    )
                  }
                />
              </div>

              {/* MINIATURAS */}

              {savedPhotos.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {savedPhotos.map(
                    (img, index) => (
                      <button
                        key={img.id}
                        onClick={() => {
                          setViewerIdx(
                            index
                          )
                          setViewerOpen(
                            true
                          )
                        }}
                        className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-white/20 hover:border-cyan-400/60 transition-all"
                      >
                        <img
                          src={
                            img.image_data
                          }
                          alt={`Foto ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
          )}
      </div>

      {/* BARRA INFERIOR */}

      <div
        className="p-4 flex justify-center gap-3"
        onClick={(e) =>
          e.stopPropagation()
        }
      >
        {!foto &&
          cameraOn &&
          !resultado &&
          !knownMatricula && (
            <button
              onClick={capturarFoto}
              className="w-16 h-16 rounded-full bg-white border-4 border-cyan-400 flex items-center justify-center active:scale-95 transition-transform"
              aria-label="Capturar"
            >
              <div className="w-12 h-12 rounded-full bg-cyan-400/30" />
            </button>
          )}

        {!foto &&
          cameraOn &&
          knownMatricula && (
            <button
              onClick={capturarOtraFoto}
              disabled={addingPhoto}
              className="w-16 h-16 rounded-full bg-white border-4 border-cyan-400 flex items-center justify-center active:scale-95 transition-transform disabled:opacity-50"
              aria-label="Capturar"
            >
              {addingPhoto ? (
                <Loader2 className="w-5 h-5 text-cyan-600 animate-spin" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-cyan-400/30" />
              )}
            </button>
          )}

        {foto &&
          !scanning &&
          resultado &&
          !noDetectada &&
          !knownMatricula && (
            <>
              <button
                onClick={reintentar}
                className="gestarian-btn gestarian-btn-secondary px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />

                Repetir
              </button>

              <button
                onClick={confirmar}
                disabled={!canConfirm}
                className="gestarian-btn-primary gestarian-btn px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
              >
                <Check className="w-4 h-4" />

                Confirmar
              </button>
            </>
          )}

        {foto &&
          !scanning &&
          editing &&
          !knownMatricula && (
            <button
              onClick={confirmar}
              disabled={!canConfirm}
              className="gestarian-btn-primary gestarian-btn px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />

              Confirmar
            </button>
          )}

        {knownMatricula && (
          <button
            onClick={confirmar}
            className="gestarian-btn-primary gestarian-btn px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2"
          >
            <Check className="w-4 h-4" />

            Cerrar
          </button>
        )}
      </div>

      {/* VISOR DE FOTOGRAFÍAS */}

      {viewerOpen &&
        viewerIdx !== null &&
        savedPhotos[viewerIdx] && (
          <div
            className="fixed inset-0 z-[105] bg-black flex flex-col"
            onClick={() =>
              setViewerOpen(false)
            }
          >
            <div
              className="flex items-center justify-between p-4 text-white"
              onClick={(e) =>
                e.stopPropagation()
              }
            >
              <span className="text-sm font-semibold">
                Foto {viewerIdx + 1} de{' '}
                {savedPhotos.length}
              </span>

              <button
                onClick={() =>
                  setViewerOpen(false)
                }
                className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/10"
                aria-label="Cerrar visor"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div
              className="flex-1 relative overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing"
              onClick={(e) =>
                e.stopPropagation()
              }
              onWheel={handleWheel}
              onMouseDown={
                handleMouseDown
              }
              onMouseMove={
                handleMouseMove
              }
              onMouseUp={handleMouseUp}
              onMouseLeave={
                handleMouseUp
              }
            >
              <img
                src={
                  savedPhotos[viewerIdx]
                    .image_data
                }
                alt={`Foto ${viewerIdx + 1}`}
                className="max-w-full max-h-full object-contain transition-transform duration-150 select-none pointer-events-none"
                style={{
                  transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                }}
                draggable={false}
              />

              <div className="absolute top-4 right-4 flex flex-col gap-2">
                <button
                  onClick={() =>
                    setZoom((value) =>
                      Math.min(
                        5,
                        value + 0.5
                      )
                    )
                  }
                  className="w-10 h-10 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
                  aria-label="Ampliar"
                >
                  <ZoomIn className="w-5 h-5" />
                </button>

                <button
                  onClick={() => {
                    setZoom(1)
                    setPan({
                      x: 0,
                      y: 0,
                    })
                  }}
                  className="w-10 h-10 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-xs font-bold"
                  aria-label="Restablecer zoom"
                >
                  {Math.round(
                    zoom * 100
                  )}
                  %
                </button>

                <button
                  onClick={() =>
                    setZoom((value) =>
                      Math.max(
                        1,
                        value - 0.5
                      )
                    )
                  }
                  className="w-10 h-10 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
                  aria-label="Reducir"
                >
                  <ZoomOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}

      <canvas
        ref={canvasRef}
        className="hidden"
      />
    </div>
  )
}