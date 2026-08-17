interface MatriculaBadgeProps {
  matricula?: string | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

/** 8 puntitos amarillos en círculo con diámetro reducido */
const EightDotsEurope = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={`text-yellow-400 fill-current shrink-0 ${className}`}>
    <circle cx="12" cy="4.5" r="1.15" />
    <circle cx="17.3" cy="6.7" r="1.15" />
    <circle cx="19.5" cy="12" r="1.15" />
    <circle cx="17.3" cy="17.3" r="1.15" />
    <circle cx="12" cy="19.5" r="1.15" />
    <circle cx="6.7" cy="17.3" r="1.15" />
    <circle cx="4.5" cy="12" r="1.15" />
    <circle cx="6.7" cy="6.7" r="1.15" />
  </svg>
);

/**
 * Componente unificado de matrícula española estándar.
 * Diseño oficial con banda azul europea (8 puntitos en círculo y letra E subida 3px)
 * y numeración negra con tipografía geométrica condensada DGT.
 */
export function MatriculaBadge({ matricula, className = '', size = 'md' }: MatriculaBadgeProps) {
  const plateText = matricula?.trim() ? matricula.toUpperCase() : '—';

  if (size === 'xl') {
    return (
      <span
        className={`inline-flex items-center bg-white border border-[#c0c0c0] rounded-[6px] overflow-hidden h-[38px] sm:h-[44px] w-[182px] sm:w-[207px] shadow-[0_0_12px_rgba(192,192,192,0.3)] shrink-0 select-none ${className}`}
      >
        {/* Banda Azul Europea Izquierda (estrechada 3px) */}
        <span className="w-[27px] sm:w-[31px] h-full bg-[#003399] flex flex-col items-center justify-between pt-1 pb-0.5 shrink-0">
          <EightDotsEurope className="w-[15px] h-[15px] sm:w-[17px] sm:h-[17px]" />
          <span 
            className="text-[19px] sm:text-[22px] text-white font-extrabold leading-none -translate-y-[3px]"
            style={{ transform: 'translateY(-3px)' }}
          >
            E
          </span>
        </span>

        {/* Numeración en tipografía DGT España (menos peso, manteniendo tamaño) */}
        <span
          className="tracking-[0.05em] leading-none select-none flex-1 flex items-center justify-center text-center overflow-hidden"
          style={{
            color: '#000000',
            fontSize: '38px',
            fontWeight: 500,
            fontFamily:
              "'Barlow Semi Condensed', 'Bebas Neue', 'DIN Alternate', 'DIN 1451', sans-serif",
          }}
        >
          {plateText}
        </span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center bg-white border border-[#c0c0c0] rounded overflow-hidden h-[25.5px] w-[115px] shadow-sm shrink-0 select-none ${className}`}
    >
      {/* Banda Azul Europea Izquierda */}
      <span className="w-[15.6px] h-full bg-[#003399] flex flex-col items-center justify-between pt-1 pb-0.5 shrink-0">
        <EightDotsEurope className="w-[9.5px] h-[9.5px]" />
        <span 
          className="text-[8px] text-white font-extrabold leading-none"
          style={{ transform: 'translateY(-3px)' }}
        >
          E
        </span>
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
