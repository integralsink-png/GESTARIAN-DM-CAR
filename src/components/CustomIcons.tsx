import React from 'react';

// Símbolo de Presupuesto: hoja A4 (celeste) transparente con una P
export const PresupuestoIcon = ({ className = "w-6 h-6", style }: { className?: string; style?: React.CSSProperties }) => (
  <svg className={`text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)] ${className}`} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    {/* P letter inside */}
    <path d="M9 16v-6h3.5a2 2 0 1 1 0 4H9"></path>
  </svg>
);

// Símbolo de Nuevo Presupuesto: igual que Presupuesto pero con un + a la izquierda
export const NuevoPresupuestoIcon = ({ className = "w-6 h-6", style }: { className?: string; style?: React.CSSProperties }) => (
  <div className={`relative flex items-center justify-center text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)] ${className}`} style={style}>
    {/* Signo + */}
    <svg className="absolute -left-1 w-[40%] h-[40%]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
    {/* Hoja A4 con P */}
    <svg className="w-[80%] h-[80%] ml-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      {/* P letter inside */}
      <path d="M9 16v-6h3.5a2 2 0 1 1 0 4H9"></path>
    </svg>
  </div>
);

// Símbolo de Factura: hoja A4 (verde) transparente con una F
export const FacturaIcon = ({ className = "w-6 h-6", style }: { className?: string; style?: React.CSSProperties }) => (
  <svg className={`text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.5)] ${className}`} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    {/* F letter inside */}
    <path d="M9 16v-6h4"></path>
    <path d="M9 13h3"></path>
  </svg>
);
