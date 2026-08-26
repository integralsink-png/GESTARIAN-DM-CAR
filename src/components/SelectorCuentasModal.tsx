import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  User, PlusCircle, CheckCircle2, ShieldCheck, 
  Trash2, LogIn, ArrowRight, Sparkles, Building2, ChevronRight
} from 'lucide-react'
import { playSuccessChime, playSound } from '../lib/sound'

export interface CuentaGuardada {
  email: string
  nombre?: string
  rol?: string
  ultimoAcceso?: string
}

interface SelectorCuentasProps {
  cuentas: CuentaGuardada[]
  cuentaActual?: string
  onSeleccionarCuenta: (email: string) => void
  onNuevaCuenta: () => void
  onEliminarCuenta?: (email: string) => void
}

export function SelectorCuentasModal({
  cuentas,
  cuentaActual,
  onSeleccionarCuenta,
  onNuevaCuenta,
  onEliminarCuenta
}: SelectorCuentasProps) {
  const [hoveredEmail, setHoveredEmail] = useState<string | null>(null)

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#05070e] via-[#080d1a] to-black text-white p-4 sm:p-6 flex flex-col justify-between select-none">
      {/* Cabecera */}
      <div className="max-w-md w-full mx-auto text-center pt-6 sm:pt-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/40 text-cyan-300 text-xs font-mono font-bold uppercase tracking-widest mb-3 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span>GESTARIAN MULTI-CUENTA</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-200 to-white">
          Elegir Cuenta
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-2">
          Selecciona con qué cuenta de taller deseas iniciar sesión en este dispositivo.
        </p>
      </div>

      {/* Lista de Cuentas */}
      <div className="max-w-md w-full mx-auto my-6">
        <div className="bg-slate-900/90 border-2 border-cyan-500/40 rounded-3xl p-5 sm:p-6 shadow-[0_0_40px_rgba(6,182,212,0.2)] backdrop-blur-xl space-y-3">
          <div className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Cuentas disponibles en este equipo:</span>
            <span className="font-mono text-cyan-400">{cuentas.length}</span>
          </div>

          <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
            {cuentas.map((c) => {
              const isCurrent = (cuentaActual || '').toLowerCase() === c.email.toLowerCase()
              const isDev = c.email.toLowerCase() === 'iclomsinks@gmail.com'

              return (
                <motion.div
                  key={c.email}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onMouseEnter={() => setHoveredEmail(c.email)}
                  onMouseLeave={() => setHoveredEmail(null)}
                  className={`relative p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${
                    isCurrent
                      ? 'bg-cyan-950/40 border-cyan-400/80 shadow-[0_0_18px_rgba(6,182,212,0.3)]'
                      : isDev
                      ? 'bg-slate-950/90 border-amber-500/40 hover:border-amber-400'
                      : 'bg-slate-950/70 border-slate-800 hover:border-cyan-500/50 hover:bg-slate-800/80'
                  }`}
                  onClick={() => {
                    playSuccessChime()
                    onSeleccionarCuenta(c.email)
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                      isDev
                        ? 'bg-amber-500/20 border-amber-400/60 text-amber-300'
                        : isCurrent
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400 group-hover:text-cyan-300 group-hover:border-cyan-500/40'
                    }`}>
                      {isDev ? <ShieldCheck className="w-5 h-5" /> : <User className="w-5 h-5" />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white truncate block group-hover:text-cyan-300 transition-colors">
                          {c.nombre || c.email.split('@')[0]}
                        </span>
                        {isDev && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 border border-amber-400/40 font-mono font-black">
                            DEV
                          </span>
                        )}
                        {isCurrent && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-400/20 text-cyan-300 border border-cyan-400/40 font-mono font-bold">
                            ACTIVA
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400 font-mono truncate block">
                        {c.email}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {onEliminarCuenta && cuentas.length > 1 && hoveredEmail === c.email && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onEliminarCuenta(c.email)
                        }}
                        className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 transition-all cursor-pointer"
                        title="Quitar de este dispositivo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-300 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </motion.div>
              )
            })}
          </div>

          {/* Botón para Añadir o Registrar otra cuenta */}
          <div className="pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => {
                onNuevaCuenta()
              }}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-cyan-500/20 via-teal-500/20 to-emerald-500/20 hover:from-cyan-500/30 hover:to-emerald-500/30 border-2 border-cyan-400/60 text-cyan-300 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.15)]"
            >
              <PlusCircle className="w-4 h-4" />
              <span>USAR OTRA CUENTA / REGISTRARSE</span>
            </button>
          </div>
        </div>
      </div>

      {/* Pie */}
      <div className="max-w-md w-full mx-auto text-center pb-4 text-[11px] text-slate-600 font-mono">
        GESTARIAN AUTOMOTIVE SUITE · MULTI-USER SYSTEM
      </div>
    </div>
  )
}
