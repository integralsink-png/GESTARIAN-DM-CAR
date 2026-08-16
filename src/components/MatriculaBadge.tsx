import React from 'react';

interface MatriculaBadgeProps {
  matricula?: string | null;
  className?: string;
}

/**
 * Componente unificado de matrícula española estándar.
 * Diseño oficial con banda azul europea (estrella y letra E)
 * y numeración negra con tipografía geométrica condensada DGT.
 */
export function MatriculaBadge({ matricula, className = '' }: MatriculaBadgeProps) {
  const plateText = matricula?.trim() ? matricula.toUpperCase() : '—';

  return (
    <span
      className={`inline-flex items-center bg-white border border-slate-600 rounded overflow-hidden h-[25.5px] w-[115px] shadow-sm shrink-0 select-none ${className}`}
    >
      {/* Banda Azul Europea Izquierda */}
      <span className="w-[15.6px] h-full bg-[#003399] flex flex-col items-center justify-between py-[1.5px] shrink-0">
        <span className="text-[5.5px] text-yellow-300 leading-none">★</span>
        <span className="text-[8px] text-white font-extrabold leading-none">E</span>
      </span>

      {/* Numeración en tipografía DGT España */}
      <span
        className="font-semibold tracking-[0.05em] leading-none select-none flex-1 flex items-center justify-center text-center overflow-hidden"
        style={{
          color: '#000000',
          fontSize: '21.12px',
          fontWeight: 600,
          fontFamily:
            "'Barlow Semi Condensed', 'Bebas Neue', 'DIN Alternate', 'DIN 1451', sans-serif",
        }}
      >
        {plateText}
      </span>
    </span>
  );
}
