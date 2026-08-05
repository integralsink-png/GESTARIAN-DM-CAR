import { useState, useRef } from 'react';
import Tesseract from 'tesseract.js';
import { Camera, Loader2 } from 'lucide-react';

interface InvoiceData {
  numero?: string;
  fecha?: string;
  base_imponible?: number;
  iva?: number;
  total?: number;
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
      const result = await Tesseract.recognize(file, 'spa');
      const text = result.data.text;
      
      const data: InvoiceData = {};

      // Heurística básica de extracción (puede fallar, pero ayuda a autocompletar)
      
      // Número de factura: suele ir tras "Factura", "Nº", etc.
      const numMatch = text.match(/(?:factura|nº|numero)[\s:.-]*([A-Z0-9-]{4,12})/i);
      if (numMatch) data.numero = numMatch[1];

      // Fecha: DD/MM/YYYY o DD-MM-YYYY
      const dateMatch = text.match(/(\d{2})[\/\.-](\d{2})[\/\.-](\d{4})/);
      if (dateMatch) {
        data.fecha = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
      }

      // Buscar importes: buscamos números con decimales cerca de palabras clave
      const totalMatch = text.match(/(?:total|importe a pagar)[\s:.-]*(\d+[.,]\d{2})/i);
      if (totalMatch) data.total = parseFloat(totalMatch[1].replace(',', '.'));

      const baseMatch = text.match(/(?:base|subtotal)[\s:.-]*(\d+[.,]\d{2})/i);
      if (baseMatch) data.base_imponible = parseFloat(baseMatch[1].replace(',', '.'));

      if (!data.iva && data.base_imponible && data.total) {
        // Calcular IVA si tenemos total y base
        const diff = data.total - data.base_imponible;
        if (Math.abs(diff - (data.base_imponible * 0.21)) < 0.5) data.iva = 21;
        else if (Math.abs(diff - (data.base_imponible * 0.10)) < 0.5) data.iva = 10;
        else if (Math.abs(diff - (data.base_imponible * 0.04)) < 0.5) data.iva = 4;
      }

      onScan(data);
      
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
