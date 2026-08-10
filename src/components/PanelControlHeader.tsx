// src/components/PanelControlHeader.tsx
import { Activity, Triangle } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';

interface PanelControlHeaderProps {
  showPanels: boolean;
  isFadingOut: boolean;
  hora: Date;
  tempActual: number;
  cargandoClima: boolean;
  tempColor: string;
  totalAvisos: number;
  mostrarAvisos: boolean;
  setMostrarAvisos: (value: boolean) => void;
  touchSelectable: boolean;
}

export const PanelControlHeader: React.FC<PanelControlHeaderProps> = ({
  showPanels, isFadingOut, hora, tempActual, cargandoClima, 
  tempColor, totalAvisos, mostrarAvisos, setMostrarAvisos, touchSelectable
}) => {
  const location = useLocation();

  if (!showPanels || location.pathname !== '/') return null;

  return createPortal(
    <div 
      id="panel-control-principal" 
      className={`fixed top-0 left-0 right-0 z-[9999] w-screen bg-black transition-all duration-500 shadow-[0_4px_25px_rgba(0,0,0,0.9)] ${
        isFadingOut ? 'opacity-0 -translate-y-4' : 'opacity-100 translate-y-0'
      }`}
    >
      <div className="w-full px-6 py-1.5 flex flex-col items-center text-center gap-1.5">
        <div className="flex items-center justify-center gap-2 whitespace-nowrap overflow-hidden">
          <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-violet-400 drop-shadow-[0_0_15px_rgba(167,139,250,0.9)] animate-pulse shrink-0" />
          <span className="text-xl sm:text-2xl font-bold uppercase tracking-widest text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]">PANEL DE CONTROL</span>
        </div>

        <div className="flex items-center justify-between w-full px-2 mt-2">
          {/* Izquierda: Día (x1.5) y Fecha (x1.5) */}
          <div className="flex flex-col items-start justify-center">
            <div className="font-semibold text-white capitalize tracking-tight leading-none drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]" style={{ fontSize: '1.5em' }}>
              {hora.toLocaleDateString('es-ES', { weekday: 'long' })}
            </div>
            <div className="font-semibold text-white uppercase tracking-tight leading-none mt-1.5 drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]" style={{ fontSize: '1.5em' }}>
              {hora.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: '2-digit' }).replace('.', '')}
            </div>
          </div>

          {/* Centro: Botón Avisos */}
          <div className="flex items-center justify-center shrink-0 mx-4">
            <button
              onClick={(e) => { e.stopPropagation(); if (touchSelectable) setMostrarAvisos(!mostrarAvisos); }}
              className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 bg-transparent ${
                !touchSelectable ? 'opacity-50 pointer-events-none' : ''
              } ${
                totalAvisos > 0 && !mostrarAvisos
                  ? 'animate-rainbow-breathe' 
                  : 'border-orange-500/80 text-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.5)]'
              }`}
            >
              <Triangle className={`w-5 h-5 fill-transparent transition-transform duration-300 ${mostrarAvisos ? 'rotate-180' : ''} drop-shadow-[0_0_8px_currentColor]`} />
            </button>
          </div>

          {/* Derecha: Hora (x2) y Grados (x1.5) */}
          <div className="flex flex-col items-end justify-center">
            <div className="font-bold text-white tabular-nums tracking-tight leading-none drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]" style={{ fontSize: '2em' }}>
              {hora.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className={`font-medium tabular-nums leading-none mt-1.5 drop-shadow-md ${tempColor}`} style={{ fontSize: '1.5em' }}>
              {cargandoClima ? '…' : `${tempActual}°C`}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};