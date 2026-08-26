import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Terminal, Sparkles, ShieldCheck, ArrowLeft, Layers } from 'lucide-react'
import { cargarPerfil } from '../services/authService'
import { playSuccessChime } from '../lib/sound'

export function DevModeFloatingButton() {
  const navigate = useNavigate()
  const location = useLocation()
  const [devEmail, setDevEmail] = useState('iclomsinks@gmail.com')

  // Obtener estado actual
  const currentTestUser = localStorage.getItem('gestarian_test_user') || ''
  const isDevModeActive = localStorage.getItem('gestarian_dev_mode') === 'true'
  const isDevAccount = currentTestUser.toLowerCase() === 'iclomsinks@gmail.com'

  // Si ya estamos exactamente en la página de login de desarrollador (/dev o /desarrollador), no mostrar
  const isDevAuthPage = location.pathname === '/dev' || location.pathname === '/desarrollador'

  // El botón flotante debe ser visible SIEMPRE que NO estemos en modo desarrollador pleno, o para volver al modo desarrollador
  const esModoDevPleno = isDevModeActive && isDevAccount && (location.pathname === '/configuracion' || location.pathname === '/licencias')

  if (isDevAuthPage || esModoDevPleno) {
    return null
  }

  const handleVolverModoDev = async () => {
    try {
      const devMail = 'iclomsinks@gmail.com'
      localStorage.setItem('gestarian_test_user', devMail)
      localStorage.setItem('gestarian_dev_mode', 'true')
      await cargarPerfil(devMail)
      playSuccessChime()
      navigate('/configuracion')
    } catch (e) {
      navigate('/dev')
    }
  }

  return (
    <div className="fixed top-2.5 left-1/2 -translate-x-1/2 z-[9999] pointer-events-auto select-none animate-bounce-subtle">
      <button
        type="button"
        onClick={handleVolverModoDev}
        className="group flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-950/90 hover:bg-slate-900 text-white text-xs font-black uppercase tracking-wider border-2 border-indigo-400/80 shadow-[0_0_25px_rgba(99,102,241,0.6)] backdrop-blur-md transition-all active:scale-95 hover:border-cyan-400 hover:shadow-[0_0_30px_rgba(6,182,212,0.8)] cursor-pointer"
        title="Volver al Modo Desarrollador (iCLOM Console)"
      >
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
        <Terminal className="w-4 h-4 text-cyan-400 group-hover:rotate-12 transition-transform" />
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-indigo-200 to-white font-extrabold text-[11px] sm:text-xs">
          VOLVER A MODO DESARROLLADOR
        </span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/30 text-indigo-300 font-mono hidden sm:inline">
          DEV
        </span>
      </button>
    </div>
  )
}
