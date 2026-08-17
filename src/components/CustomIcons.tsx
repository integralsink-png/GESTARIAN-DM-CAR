import React from 'react';

// Símbolo de Presupuesto: hoja A4 (celeste) transparente con una P
export const PresupuestoIcon = ({ className = "w-6 h-6", style }: { className?: string; style?: React.CSSProperties }) => (
  <svg className={`text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)] ${className}`} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
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
    <svg className="absolute -left-1 w-[40%] h-[40%]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
    {/* Hoja A4 con P */}
    <svg className="w-[80%] h-[80%] ml-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      {/* P letter inside */}
      <path d="M9 16v-6h3.5a2 2 0 1 1 0 4H9"></path>
    </svg>
  </div>
);

// Símbolo de Factura: hoja A4 (verde) transparente con una F
export const FacturaIcon = ({ className = "w-6 h-6", style }: { className?: string; style?: React.CSSProperties }) => (
  <svg className={`text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.5)] ${className}`} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    {/* F letter inside */}
    <path d="M9 16v-6h4"></path>
    <path d="M9 13h3"></path>
  </svg>
);

// Símbolo de Nuevo Presupuesto A4 con +P adentro
export const NuevoPresupuestoA4Icon = ({ className = "w-6 h-6", style }: { className?: string; style?: React.CSSProperties }) => (
  <svg className={`text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)] ${className}`} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    {/* +P inside */}
    <path d="M6 12h4m-2-2v4" strokeWidth="1"></path>
    <path d="M11 15v-6h2.5a1.5 1.5 0 1 1 0 3H11" strokeWidth="1"></path>
  </svg>
);

// Símbolo de Expediente: carpeta amarilla con una E adentro (misma altura que PresupuestoIcon)
export const ExpedienteFolderIcon = ({ className = "w-6 h-6", style }: { className?: string; style?: React.CSSProperties }) => (
  <svg className={`text-yellow-500 hover:text-yellow-400 drop-shadow-[0_0_8px_rgba(234,179,8,0.4)] ${className}`} style={style} viewBox="1.5 2 21 19" fill="currentColor" fillOpacity={0.2} stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"></path>
    {/* E letter inside */}
    <path d="M10 16v-6h4" strokeWidth="1.5" stroke="currentColor" fill="none"></path>
    <path d="M10 13h3" strokeWidth="1.5" stroke="currentColor" fill="none"></path>
    <path d="M10 16h4" strokeWidth="1.5" stroke="currentColor" fill="none"></path>
  </svg>
);

// Símbolo de Historial de Presupuestos: igual que NuevoPresupuestoA4Icon pero sin el signo +
export const HistorialPresupuestoA4Icon = ({ className = "w-6 h-6", style }: { className?: string; style?: React.CSSProperties }) => (
  <svg className={`text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)] ${className}`} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    {/* P inside */}
    <path d="M9 16v-7h3.5a2 2 0 1 1 0 4H9" strokeWidth="1.2"></path>
  </svg>
);

// Símbolo de WhatsApp con teléfono dentro (estilo original)
export const WhatsAppWithPhoneIcon = ({ className = "w-6 h-6", style }: { className?: string; style?: React.CSSProperties }) => (
  <svg className={`text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.5)] ${className}`} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">
    {/* Globo de mensaje tipo WhatsApp */}
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
    {/* Auricular de teléfono dentro del globo */}
    <path d="M9.5 8.5c.2-.4.4-.4.6-.4h.5c.2 0 .4.1.5.3l.8 1.8c.1.2.1.4 0 .6l-.4.5c-.1.1-.2.3-.1.5.4.8 1 1.4 1.8 1.8.2.1.4 0 .5-.1l.5-.4c.2-.1.4-.1.6 0l1.8.8c.2.1.3.3.3.5v.5c0 .2 0 .4-.4.6-.5.2-1.3.3-2.5-.2-1.5-.7-2.7-1.9-3.4-3.4-.5-1.2-.4-2-.2-2.5z" fill="currentColor" stroke="none"></path>
  </svg>
);

// Símbolo de Nuevo Vehículo: coche con signo + en su interior
export const NuevoVehiculoPlusIcon = ({ className = "w-6 h-6", style }: { className?: string; style?: React.CSSProperties }) => (
  <svg className={`text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)] ${className}`} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    {/* Contorno del vehículo */}
    <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"></path>
    <circle cx="7" cy="17" r="2"></circle>
    <path d="M9 17h6"></path>
    <circle cx="17" cy="17" r="2"></circle>
    {/* Signo + dentro del habitáculo */}
    <path d="M9.5 10.5h3m-1.5-1.5v3" strokeWidth="1.5"></path>
  </svg>
);


