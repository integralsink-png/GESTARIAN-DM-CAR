import { useState, useRef } from 'react';
import Tesseract from 'tesseract.js';
import { Camera, Loader2 } from 'lucide-react';

interface Props {
  onScan: (text: string) => void;
  title?: string;
}

export function OcrScanner({ onScan, title = "Escanear matrícula (OCR)" }: Props) {
  const [scanning, setScanning] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanning(true);
    try {
      const result = await Tesseract.recognize(file, 'spa');
      const text = result.data.text.trim();
      
      // Intentar extraer patrón de matrícula (4 números y 3 letras)
      const match = text.match(/\d{4}\s?[A-Z]{3}/i);
      if (match) {
        onScan(match[0].replace(/\s+/g, '').toUpperCase());
      } else {
        // Fallback: coger los primeros 7 caracteres alfanuméricos
        const fallback = text.replace(/[^A-Z0-9]/ig, '').substring(0, 7).toUpperCase();
        if (fallback) onScan(fallback);
        else alert("No se pudo detectar texto válido en la imagen.");
      }
    } catch (err) {
      console.error(err);
      alert("Error al procesar la imagen (OCR).");
    } finally {
      setScanning(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  return (
    <>
      <input 
        type="file" 
        accept="image/*" 
        capture="environment" 
        className="hidden" 
        ref={fileInput}
        onChange={handleCapture}
      />
      <button 
        type="button"
        onClick={() => fileInput.current?.click()}
        disabled={scanning}
        title={title}
        className="h-full px-5 flex items-center justify-center text-slate-400 hover:text-cyan-400 hover:bg-white/5 transition-colors disabled:opacity-50"
      >
        {scanning ? <Loader2 className="w-8 h-8 animate-spin text-cyan-400" /> : <Camera className="w-8 h-8" />}
      </button>
    </>
  );
}
