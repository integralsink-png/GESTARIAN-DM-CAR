import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { cargarPerfil, getPerfil } from '../services/authService'
import { useToast } from '../lib/ToastContext'
import { playSuccessChime } from '../lib/sound'
import {
  Code,
  ShieldCheck,
  Zap,
  Users,
  Key,
  Layers,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Lock,
  Loader2,
  Terminal,
  Settings,
  Database
} from 'lucide-react'

export function DeveloperAuthPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [usuario, setUsuario] = useState('iclomsinks@gmail.com')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [perfilActivo, setPerfilActivo] = useState(getPerfil())

  useEffect(() => {
    setPerfilActivo(getPerfil())
  }, [])

  const handleLoginDeveloper = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanUser = usuario.trim().toLowerCase()
    const cleanPass = password.trim()

    if (!cleanUser) {
      showToast('Introduce tu usuario o email de desarrollador', 'warning')
      return
    }

    if (cleanPass !== '123321') {
      showToast('Contraseña de desarrollador incorrecta', 'error')
      return
    }

    setLoading(true)
    try {
      localStorage.setItem('gestarian_test_user', cleanUser)
      localStorage.setItem('gestarian_dev_mode', 'true')

      const p = await cargarPerfil(cleanUser)
      setPerfilActivo(p)
      playSuccessChime()
      showToast(`¡Acceso Maestro DEVELOPER Concedido!`, 'success')

      setTimeout(() => {
        navigate('/')
      }, 500)
    } catch (err: any) {
      console.error('Error activando dev mode:', err)
      showToast('Error al iniciar sesión de desarrollador', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleCerrarSesionDev = () => {
    localStorage.removeItem('gestarian_dev_mode')
    localStorage.removeItem('gestarian_test_user')
    showToast('Sesión de desarrollador cerrada', 'info')
    setTimeout(() => {
      window.location.href = '/'
    }, 400)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-[#070b14] to-black text-white p-4 sm:p-8 flex flex-col justify-between select-none">
      {/* Cabecera */}
      <div className="max-w-2xl w-full mx-auto text-center pt-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/40 text-cyan-300 text-xs font-mono font-bold uppercase tracking-widest mb-3">
          <Terminal className="w-3.5 h-3.5 text-cyan-400" />
          <span>GESTARIAN DEVELOPER PORTAL (/GESTARIAN/DEV)</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-200 to-white">
          ACCESO MODO DESARROLLADOR
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-2">
          Consola maestra de control de licencias, usuarios, configuración de IA y Gemelo Digital.
        </p>
      </div>

      {/* Tarjeta Central de Login */}
      <div className="max-w-md w-full mx-auto my-6">
        <div className="bg-slate-900/90 border-2 border-cyan-500/50 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(6,182,212,0.25)] backdrop-blur-xl space-y-6">
          
          {/* Estado Actual */}
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-500 font-mono uppercase block">Usuario Activo:</span>
              <span className="text-xs font-bold text-cyan-300 font-mono truncate max-w-[160px] block">
                {localStorage.getItem('gestarian_test_user') || 'Sin sesión'}
              </span>
            </div>
            <div className="text-right">
              <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${
                perfilActivo?.esDeveloper || localStorage.getItem('gestarian_dev_mode') === 'true'
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}>
                {perfilActivo?.esDeveloper || localStorage.getItem('gestarian_dev_mode') === 'true' ? 'DEV ACTIVO' : 'NO IDENTIFICADO'}
              </span>
            </div>
          </div>

          {/* Formulario de Login */}
          <form onSubmit={handleLoginDeveloper} className="space-y-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-1.5">
                Usuario / Email
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  placeholder="iclomsinks@gmail.com"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-xl px-4 py-3 text-sm text-white font-medium outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Introduce la contraseña"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-xl px-4 py-3 text-sm text-white font-medium outline-none transition-colors"
                />
                <Lock className="w-4 h-4 text-slate-500 absolute right-3.5 top-3.5" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !usuario.trim() || !password.trim()}
              className="w-full py-4 px-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-slate-950 font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(6,182,212,0.4)] transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
              )}
              <span>ENTRAR COMO DEVELOPER</span>
            </button>
          </form>

          <p className="text-[11px] text-slate-400 text-center leading-relaxed border-t border-slate-800 pt-3">
            Acceso exclusivo para el desarrollador del sistema. Otorga privilegios totales y control de licencias.
          </p>

          {/* Accesos Directos de Desarrollador */}
          <div className="pt-4 border-t border-slate-800 space-y-2">
            <span className="text-[10px] text-slate-500 font-mono uppercase block">Accesos Directos Maestro:</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => navigate('/usuarios')}
                className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-left text-xs font-bold text-slate-300 flex items-center justify-between cursor-pointer"
              >
                <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-cyan-400" /> Usuarios & Roles</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
              </button>
              <button
                onClick={() => navigate('/licencias')}
                className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-left text-xs font-bold text-slate-300 flex items-center justify-between cursor-pointer"
              >
                <span className="flex items-center gap-1.5"><Key className="w-4 h-4 text-amber-400" /> Licencias</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
              </button>
              <button
                onClick={() => navigate('/configuracion')}
                className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-left text-xs font-bold text-slate-300 flex items-center justify-between cursor-pointer"
              >
                <span className="flex items-center gap-1.5"><Settings className="w-4 h-4 text-purple-400" /> Configuración & IA</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
              </button>
              <button
                onClick={() => navigate('/gemelo-digital')}
                className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-left text-xs font-bold text-slate-300 flex items-center justify-between cursor-pointer"
              >
                <span className="flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-emerald-400" /> Gemelo Digital 3D</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
              </button>
            </div>
          </div>

          {/* Salir / Reset */}
          <div className="text-center pt-2">
            <button
              onClick={handleCerrarSesionDev}
              className="text-xs text-rose-400/80 hover:text-rose-300 underline font-medium cursor-pointer"
            >
              Cerrar sesión de desarrollador y volver a inicio
            </button>
          </div>
        </div>
      </div>

      {/* Pie */}
      <div className="max-w-xl w-full mx-auto text-center pb-2 text-[11px] text-slate-600 font-mono">
        GESTARIAN CORE · ROOT LEVEL DEVELOPER CONSOLE
      </div>
    </div>
  )
}
