import { useState, useRef } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { processDocumentOcr } from '../services/documentOcrService';

interface InvoiceData {
  numero?: string;
  fecha?: string;
  base_imponible?: number;
  iva?: number;
  total?: number;
  proveedor?: string;
  cif_nif?: string;
}

interface Props {
  onScan: (data: InvoiceData) => void;
  title?: string;
}

export function OcrInvoiceScanner({ onScan, title = "Autocompletar con foto (OCR)" }: Props) {
  const [scanning, setScanning] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanning(true);
    try {
      const structured = await processDocumentOcr(file);
      
      const data: InvoiceData = {
        numero: structured.numero_factura,
        fecha: structured.fecha,
        base_imponible: structured.base_imponible,
        iva: structured.iva && structured.base_imponible ? Math.round((structured.iva / structured.base_imponible) * 100) : 21,
        total: structured.total,
        proveedor: structured.proveedor,
        cif_nif: structured.cif_nif
      };

      onScan(data);
    } catch (err) {
      console.error('Error en escaneo de factura:', err);
      alert("Error al procesar la imagen de la factura con OCR.");
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
        className="flex items-center justify-center gap-2 px-3 py-2 text-sm bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 rounded-lg transition-colors disabled:opacity-50 w-full mb-4 border border-cyan-500/30 font-medium"
      >
        {scanning ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Analizando documento...</>
        ) : (
          <><Camera className="w-4 h-4" /> Autocompletar Factura con Cámara (OCR)</>
        )}
      </button>
    </>
  );
}
