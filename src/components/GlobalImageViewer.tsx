import React, { useState, useEffect } from 'react'
import { X, ChevronLeft, Camera, Trash2 } from 'lucide-react'

interface GlobalImageViewerProps {
  isOpen: boolean
  onClose: () => void
  images: string[]
  onAddImage: (dataUrl: string) => Promise<void>
  onDeleteImage: (index: number) => Promise<void>
  title?: string
  customAction?: React.ReactNode
}

export function GlobalImageViewer({
  isOpen,
  onClose,
  images,
  onAddImage,
  onDeleteImage,
  title = "Imágenes",
  customAction
}: GlobalImageViewerProps) {
  const [selectedIndex, setSelectedIndex] = useState<number>(0)
  const [isUploading, setIsUploading] = useState(false)

  // Reset index if out of bounds when images array changes
  useEffect(() => {
    if (images.length === 0) {
      setSelectedIndex(0)
    } else if (selectedIndex >= images.length) {
      setSelectedIndex(images.length - 1)
    }
  }, [images, selectedIndex])

  if (!isOpen) return null

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const reader = new FileReader()
      reader.onloadend = async () => {
        const dataUrl = reader.result as string
        await onAddImage(dataUrl)
        setSelectedIndex(images.length) // Go to the newly added image
      }
      reader.readAsDataURL(file)
    } finally {
      setIsUploading(false)
      // Reset the input so the same file can be selected again
      e.target.value = ''
    }
  }

  const handleDelete = async (index: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta imagen?')) return
    await onDeleteImage(index)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-between animate-fade-in">
      {/* Header */}
      <div className="w-full flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent absolute top-0 z-10">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-white bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full backdrop-blur-sm transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
          <span className="font-semibold text-lg">Volver</span>
        </button>
        <div className="text-white font-medium text-lg drop-shadow-md">
          {title} {images.length > 0 && `(${selectedIndex + 1}/${images.length})`}
        </div>
        <div className="w-24"></div> {/* Spacer for centering title */}
      </div>

      {/* Main Image Area */}
      <div className="flex-1 w-full flex items-center justify-center relative overflow-hidden mt-16 mb-24">
        {images.length > 0 ? (
          <div className="relative w-full h-full flex items-center justify-center p-4">
            <img
              src={images[selectedIndex]}
              alt={`Imagen ${selectedIndex + 1}`}
              className="max-w-full max-h-full object-contain drop-shadow-2xl"
            />
            
            {/* Delete current main image button */}
            <button
              onClick={() => handleDelete(selectedIndex)}
              className="absolute top-4 right-4 bg-red-500/80 hover:bg-red-500 text-white p-3 rounded-full shadow-lg backdrop-blur-md transition-transform hover:scale-110"
              title="Eliminar esta imagen"
            >
              <Trash2 className="w-6 h-6" />
            </button>
          </div>
        ) : (
          <div className="text-white/50 text-xl flex flex-col items-center gap-4">
            <Camera className="w-16 h-16 opacity-30" />
            <p>No hay imágenes disponibles</p>
          </div>
        )}
      </div>

      {/* Footer / Thumbnails */}
      <div className="w-full bg-bg-900/90 backdrop-blur-lg border-t border-white/10 p-4 absolute bottom-0 z-10 flex items-center gap-4 overflow-x-auto">
        {/* Upload Button */}
        <label className="shrink-0 flex flex-col items-center justify-center w-20 h-20 bg-cyan-500/20 border-2 border-dashed border-cyan-500/50 rounded-xl cursor-pointer hover:bg-cyan-500/30 transition-colors">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
            disabled={isUploading}
          />
          {isUploading ? (
            <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Camera className="w-8 h-8 text-cyan-400" />
          )}
        </label>

        {customAction && (
          <div className="shrink-0 flex items-center justify-center h-20">
            {customAction}
          </div>
        )}

        {/* Thumbnails */}
        {images.map((img, i) => (
          <div 
            key={i} 
            className={`shrink-0 relative w-20 h-20 rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${
              i === selectedIndex ? 'border-cyan-400 scale-105' : 'border-transparent opacity-60 hover:opacity-100'
            }`}
            onClick={() => setSelectedIndex(i)}
          >
            <img src={img} alt={`Miniatura ${i}`} className="w-full h-full object-cover" />
            
            {/* Thumbnail delete button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(i);
              }}
              className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-full hover:bg-red-500"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
