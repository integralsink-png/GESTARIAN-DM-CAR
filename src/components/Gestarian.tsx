import type { ReactNode } from 'react'
import { Check, Circle, Lock, AlertCircle, ChevronRight } from 'lucide-react'
import type {
  RoadFlowStep,
  SmartRowField,
  SmartRowAction,
  StatusChipConfig,
} from '../lib/types'
import { useTheme } from '../lib/theme'

/* ───────────────────────── RoadFlow™ ───────────────────────── */
export function RoadFlow({ steps }: { steps: RoadFlowStep[] }) {
  return (
    <div className="w-full overflow-x-auto pb-2">
      <div className="flex items-center gap-1 min-w-max">
        {steps.map((step, i) => {
          const Icon =
            step.status === 'done' ? Check
            : step.status === 'blocked' ? Lock
            : step.status === 'current' ? Circle
            : ChevronRight
          const colorClass =
            step.status === 'done' ? 'gestarian-step-done'
            : step.status === 'current' ? 'gestarian-step-current'
            : step.status === 'blocked' ? 'gestarian-step-blocked'
            : 'gestarian-step-pending'
          return (
            <div key={step.key} className="flex items-center shrink-0">
              <div className={`flex flex-col items-center gap-1 gestarian-step ${colorClass}`}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-200">
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-medium whitespace-nowrap">{step.label}</span>
              </div>
              {i < steps.length - 1 && (
                <div className={`h-px w-6 sm:w-10 rounded transition-colors duration-200 ${
                  step.status === 'done' ? 'bg-[var(--color-glow)]' : 'bg-bg-600'
                }`} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ───────────────────────── SmartRow™ ───────────────────────── */
export function SmartRow({
  title,
  subtitle,
  fields,
  actions,
  chip,
  onClick,
}: {
  title: string
  subtitle?: string
  fields?: SmartRowField[]
  actions?: SmartRowAction[]
  chip?: StatusChipConfig
  onClick?: () => void
}) {
  const { playSound } = useTheme()
  return (
    <div
      onClick={() => { if (onClick) { playSound('click'); onClick() } }}
      className={`group bg-bg-800/80 backdrop-blur-md border border-bg-700 rounded-xl p-4 transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:border-[var(--color-linea)] hover:bg-bg-700/80' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-[var(--color-texto)] truncate">{title}</h3>
            {chip && <StatusChip label={chip.label} color={chip.color} />}
          </div>
          {subtitle && <p className="text-sm text-white/40 mt-0.5 truncate">{subtitle}</p>}
          {fields && fields.length > 0 && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-white/50">
              {fields.map((f) => (
                <span key={f.label}>
                  <span className="text-white/30">{f.label}:</span> {f.value}
                </span>
              ))}
            </div>
          )}
        </div>
        {actions && actions.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-1.5 shrink-0">
            {actions.map((a) => (
              <button
                key={a.label}
                onClick={(e) => { e.stopPropagation(); playSound('click'); a.onClick() }}
                className={`gestarian-btn text-xs font-semibold rounded-lg px-3 py-1.5 transition-all duration-150 ${
                  a.variant === 'primary' ? 'gestarian-btn-primary'
                  : a.variant === 'danger' ? 'gestarian-btn-danger'
                  : a.variant === 'ghost' ? 'gestarian-btn-ghost'
                  : 'gestarian-btn-secondary'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  {a.icon && <a.icon className="w-3.5 h-3.5" />}
                  {a.label}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ───────────────────── SmartBubble™ / Blocker™ ───────────────────── */
export function SmartBubble({
  title,
  message,
  variant = 'info',
  action,
}: {
  title: string
  message: string
  variant?: 'info' | 'warning' | 'danger'
  action?: { label: string; onClick: () => void }
}) {
  const { playSound } = useTheme()
  const styles = {
    info: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300',
    warning: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
    danger: 'bg-red-500/10 border-red-500/30 text-red-300',
  }
  return (
    <div className={`fixed bottom-20 lg:bottom-24 right-4 lg:right-6 z-40 max-w-sm rounded-xl border p-4 shadow-2xl gestarian-bubble ${styles[variant]}`}>
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-semibold text-sm">{title}</p>
          <p className="text-xs mt-1 opacity-90">{message}</p>
          {action && (
            <button
              onClick={() => { playSound('click'); action.onClick() }}
              className="mt-2 text-xs font-semibold underline hover:no-underline"
            >
              {action.label}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export function Blocker({
  title,
  message,
  action,
}: {
  title: string
  message: string
  action?: { label: string; onClick: () => void }
}) {
  return <SmartBubble title={title} message={message} variant="danger" action={action} />
}

/* ───────────────────────── StatusChip™ ───────────────────────── */
export function StatusChip({ label, color }: StatusChipConfig) {
  const colors = {
    green: 'bg-green-500/15 text-green-400 border-green-500/30',
    yellow: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    red: 'bg-red-500/15 text-red-400 border-red-500/30',
    blue: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    gray: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors[color]}`}>
      {label}
    </span>
  )
}

/* ───────────────────────── ActionBar™ ───────────────────────── */
export function ActionBar({ actions }: { actions: SmartRowAction[] }) {
  const { playSound } = useTheme()
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((a) => (
        <button
          key={a.label}
          onClick={() => { playSound('click'); a.onClick() }}
          className={`gestarian-btn text-sm font-semibold rounded-lg px-4 py-2.5 transition-all duration-150 ${
            a.variant === 'primary' ? 'gestarian-btn-primary'
            : a.variant === 'danger' ? 'gestarian-btn-danger'
            : a.variant === 'ghost' ? 'gestarian-btn-ghost'
            : 'gestarian-btn-secondary'
          }`}
        >
          <span className="flex items-center gap-2">
            {a.icon && <a.icon className="w-4 h-4" />}
            {a.label}
          </span>
        </button>
      ))}
    </div>
  )
}

/* ───────────────────────── ImageDock™ ───────────────────────── */
export function ImageDock({
  images,
  onAdd,
  onRemove,
}: {
  images: string[]
  onAdd?: () => void
  onRemove?: (index: number) => void
}) {
  const { playSound } = useTheme()
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {images.map((img, i) => (
        <div key={i} className="relative group shrink-0">
          <img src={img} alt={`Foto ${i + 1}`} className="w-20 h-20 rounded-lg object-cover border border-bg-700" />
          {onRemove && (
            <button
              onClick={() => { playSound('click'); onRemove(i) }}
              className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
            >
              ×
            </button>
          )}
        </div>
      ))}
      {onAdd && (
        <button
          onClick={() => { playSound('click'); onAdd() }}
          className="w-20 h-20 rounded-lg border border-dashed border-bg-600 hover:border-[var(--color-linea)] flex items-center justify-center text-white/40 hover:text-[var(--color-glow)] transition-all shrink-0"
        >
          <span className="text-2xl">+</span>
        </button>
      )}
    </div>
  )
}

/* ───────────────────────── Dock Operativo™ ───────────────────────── */
export function DockOperativo({ children }: { children: ReactNode }) {
  return (
    <div className="hidden lg:flex fixed bottom-24 left-1/2 -translate-x-1/2 z-30 bg-bg-800/90 backdrop-blur-md border border-bg-700 rounded-2xl shadow-2xl px-4 py-2.5 gestarian-dock">
      {children}
    </div>
  )
}
