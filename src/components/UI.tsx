import type { ReactNode } from 'react'

import { useNavigate } from 'react-router-dom'
export { ActionMenu } from './ActionMenu'
export { TimelineVisual } from './TimelineVisual'

export function PageHeader({ title, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  const navigate = useNavigate()
  return (
    <div className="relative flex items-center justify-between mb-6 w-full px-2 min-h-[60px]">
      {/* Logo corporativo a la izquierda (x1.5 = 60px x 60px) */}
      <button
        onClick={() => navigate('/')}
        className="w-15 h-15 w-[60px] h-[60px] rounded-2xl overflow-hidden border border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.2)] hover:scale-105 transition-transform active:scale-95 shrink-0 bg-white z-10"
        title="Ir a Inicio"
        aria-label="Ir a Inicio"
      >
        <img src="/images/logos/logo.jpg" alt="Logo Corporativo" className="w-full h-full object-cover" />
      </button>

      {/* Título centrado absoluto (escalado x0.8) */}
      <h1 className="absolute left-1/2 -translate-x-1/2 text-lg font-bold uppercase tracking-wider text-[var(--color-texto)] drop-shadow-[0_0_10px_rgba(255,255,255,0.3)] pointer-events-none whitespace-nowrap">
        {title}
      </h1>

      {/* Elementos a la derecha (Botones de acción) */}
      <div className="flex items-center gap-3 z-10 ml-auto">
        {children}
      </div>
    </div>
  )
}

export function Card({ children, className = '', onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div 
      className={`gestarian-panel border border-bg-700 rounded-custom shadow-[var(--shadow-custom)] ${className} ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      {children}
    </div>
  )

}

export function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled,
  className = '',
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md'
  disabled?: boolean
  className?: string
}) {
  const variants = {
    primary: 'gestarian-btn-primary',
    secondary: 'gestarian-btn-secondary',
    danger: 'gestarian-btn-danger',
    ghost: 'gestarian-btn-ghost',
  }
  const sizes = {
    sm: 'px-5 py-3 text-base',
    md: 'px-6 py-4 text-lg',
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`gestarian-btn font-semibold rounded-custom transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  )
}

export function Input({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  addonRight,
  className = '',
  inputClassName = '',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
  addonRight?: ReactNode
  className?: string
  inputClassName?: string
}) {
  return (
    <div className={className}>
      {label && <label className="block text-sm sm:text-lg text-white/50 mb-2">{label}</label>}
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full gestarian-field rounded-custom px-5 py-4 text-lg focus:outline-none transition-colors ${addonRight ? 'pr-16' : ''} ${inputClassName || ''}`}
        />
        {addonRight && (
          <div className="absolute right-0 top-0 bottom-0 overflow-hidden rounded-r-custom">
            {addonRight}
          </div>
        )}
      </div>
    </div>
  )
}

export function Badge({ text, color, onClick }: { text: string; color: 'yellow' | 'green' | 'red' | 'blue' | 'gray', onClick?: () => void }) {
  const colors = {
    yellow: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    green: 'bg-green-500/15 text-green-400 border-green-500/30',
    red: 'bg-red-500/15 text-red-400 border-red-500/30',
    blue: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    gray: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
  }
  return (
    <span onClick={onClick} className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors[color]} ${onClick ? 'cursor-pointer hover:opacity-80 active:scale-95 transition-all' : ''}`}>
      {text}
    </span>
  )
}

export function EmptyState({ icon: Icon, title, subtitle }: { icon: ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-white/30 mb-3">{Icon}</div>
      <p className="text-white/60 font-medium">{title}</p>
      {subtitle && <p className="text-sm text-white/40 mt-1">{subtitle}</p>}
    </div>
  )
}

export function MetisRowButton({
  tipo,
  id,
  numero,
  matricula,
  cliente_nombre,
  data,
  label = 'IA Metis',
  className = '',
}: {
  tipo: 'presupuesto' | 'cita' | 'reparacion' | 'factura' | 'cliente' | 'vehiculo'
  id?: string
  numero?: string
  matricula?: string
  cliente_nombre?: string
  data?: any
  label?: string
  className?: string
}) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    const event = new CustomEvent('metis-open-context', {
      detail: {
        context: { tipo, id, numero, matricula, cliente_nombre, data },
        autoMic: true,
      },
    })
    window.dispatchEvent(event)
  }

  return (
    <button
      onClick={handleClick}
      title={`Hablar con METIS sobre este expediente (${numero || matricula || tipo})`}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-xs font-semibold transition-all hover:scale-105 ${className}`}
    >
      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
      {label}
    </button>
  )
}

