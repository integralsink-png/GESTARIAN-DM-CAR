import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { usuarioService } from '../services/usuarioService'
import { cargarPerfil, getPerfil } from '../services/authService'
import { useToast } from '../lib/ToastContext'
import { playSuccessChime } from '../lib/sound'
import type { Usuario, Configuracion } from '../lib/types'
import {
  Wrench,
  KeyRound,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Lock,
  UserCheck,
  Briefcase,
  AlertCircle,
  Smartphone,
  CheckCircle2,
  FolderOpen,
  Car,
  FileText,
  Clock,
  CheckCircle,
  ExternalLink,
  ChevronRight,
  LogOut
} from 'lucide-react'
import { MatriculaBadge } from '../components/UI'

interface OrdenTrabajo {
  id: string
  reparacion_id: string
  expediente_id: string
  presupuesto_id?: string | null
  vehiculo_id?: string | null
  matricula: string
  marca: string
  modelo: string
  cliente_nombre: string
  cliente_telefono?: string
  concepto: string
  operarios_ids: string[]
  operarios_nombres: string[]
  estado: string
  fecha_emision: string
}

export function EmpleadoAuthPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [loading, setLoading] = useState(false)
  const [config, setConfig] = useState<Configuracion | null>(null)
  const [empleados, setEmpleados] = useState<Usuario[]>([])
  
  // Estado de sesión activa de empleado
  const [empleadoActivo, setEmpleadoActivo] = useState<Usuario | null>(null)
  const [misOrdenes, setMisOrdenes] = useState<OrdenTrabajo[]>([])

  // Estado de login
  const [emailSeleccionado, setEmailSeleccionado] = useState('')
  const [pinPassword, setPinPassword] = useState('')
  const [guardarSesion, setGuardarSesion] = useState(true)

  useEffect(() => {
    // 1. Cargar configuración de taller
    supabase.from('configuracion').select('*').eq('id', 1).maybeSingle().then(({ data }) => {
      if (data) setConfig(data)
    })

    // 2. Cargar lista de empleados autorizados
    usuarioService.obtenerUsuarios().then((users) => {
      const activeUsers = users.filter(u => u.activo)
      setEmpleados(activeUsers)

      // Comprobar si ya hay una sesión de empleado activa
      const currentTestUser = localStorage.getItem('gestarian_test_user')
      if (currentTestUser) {
        const found = activeUsers.find(u => u.email.toLowerCase() === currentTestUser.toLowerCase())
        if (found) {
          setEmpleadoActivo(found)
          cargarOrdenesEmpleado(found)
        }
      }

      if (activeUsers.length > 0) {
        const savedEmp = localStorage.getItem('gestarian_saved_empleado_email')
        if (savedEmp && activeUsers.some(u => u.email.toLowerCase() === savedEmp.toLowerCase())) {
          setEmailSeleccionado(savedEmp)
        } else {
          setEmailSeleccionado(activeUsers[0].email)
        }
      }
    }).catch((e) => console.warn('Aviso cargando empleados:', e))
  }, [])

  // Cargar órdenes de trabajo asignadas a este operario
  const cargarOrdenesEmpleado = (emp: Usuario) => {
    try {
      const rawOTs = localStorage.getItem('gestarian_ordenes_trabajo_empleados')
      if (rawOTs) {
        const allOTs: OrdenTrabajo[] = JSON.parse(rawOTs)
        const myOTs = allOTs.filter(ot => 
          ot.operarios_ids?.includes(emp.id) ||
          ot.operarios_nombres?.some(nom => nom.toLowerCase() === emp.nombre.toLowerCase())
        )
        setMisOrdenes(myOTs)
      }
    } catch (e) {
      console.warn('Error cargando órdenes de trabajo:', e)
    }
  }

  const handleLoginEmpleado = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!emailSeleccionado) {
      showToast('Selecciona tu usuario de empleado', 'warning')
      return
    }

    setLoading(true)
    try {
      const cleanEmail = emailSeleccionado.trim().toLowerCase()
      const empleadoObj = empleados.find(u => u.email.toLowerCase() === cleanEmail)

      // Establecer sesión de empleado activo
      localStorage.setItem('gestarian_test_user', cleanEmail)
      localStorage.setItem('gestarian_empleado_activo_id', empleadoObj?.id || '')
      localStorage.setItem('gestarian_empleado_activo_nombre', empleadoObj?.nombre || '')
      
      if (guardarSesion) {
        localStorage.setItem('gestarian_saved_empleado_email', cleanEmail)
      }

      await cargarPerfil(cleanEmail)
      if (empleadoObj) {
        setEmpleadoActivo(empleadoObj)
        cargarOrdenesEmpleado(empleadoObj)
      }

      playSuccessChime()
      showToast(`¡Bienvenido, ${empleadoObj?.nombre || cleanEmail}! Acceso concedido a órdenes de trabajo`, 'success')
    } catch (err: any) {
      console.error('Error accediendo como empleado:', err)
      showToast('Error al iniciar sesión: ' + (err.message || ''), 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleCerrarSesionEmpleado = () => {
    setEmpleadoActivo(null)
    setMisOrdenes([])
    showToast('Sesión de empleado cerrada', 'info')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-[#0a0f1d] to-black text-white p-4 sm:p-8 flex flex-col justify-between select-none">
      {/* Cabecera superior */}
      <div className="max-w-3xl w-full mx-auto text-center pt-2 sm:pt-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-400/40 text-indigo-300 text-xs font-mono font-bold uppercase tracking-widest mb-2 sm:mb-3">
          <Wrench className="w-3.5 h-3.5 text-indigo-400" />
          <span>PORTAL DE PERSONAL AUTORIZADO</span>
        </div>

        <h1 className="text-2xl sm:text-4xl font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-200 to-white">
          {config?.nombre_empresa || 'GESTARIAN TALLER'}
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Panel de Órdenes de Trabajo adjudicadas y Reparaciones asignadas
        </p>
      </div>

      {/* Si el operario ya está identificado: Mostrar su bandeja de ÓRDENES DE TRABAJO */}
      {empleadoActivo ? (
        <div className="max-w-3xl w-full mx-auto my-6 space-y-6">
          {/* Barra de bienvenida del operario */}
          <div className="bg-slate-900/90 border-2 border-indigo-500/40 rounded-3xl p-5 sm:p-6 shadow-[0_0_40px_rgba(99,102,241,0.25)] backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-lg shadow-[0_0_20px_rgba(99,102,241,0.4)]">
                {empleadoActivo.nombre.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-white">{empleadoActivo.nombre}</h2>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    En Turno
                  </span>
                </div>
                <p className="text-xs text-indigo-300">
                  {empleadoActivo.roles?.nombre || empleadoActivo.rol || 'Mecánico / Operario Autorizado'}
                  {empleadoActivo.especialidades?.nombre ? ` • ${empleadoActivo.especialidades.nombre}` : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => navigate('/reparaciones')}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow cursor-pointer flex items-center gap-1.5"
              >
                <span>Ver Reparaciones</span>
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleCerrarSesionEmpleado}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                title="Cambiar de Operario"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Bandeja de Órdenes de Trabajo Adjudicadas */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-indigo-400" />
                <span>Mis Órdenes de Trabajo ({misOrdenes.length})</span>
              </h3>
              <span className="text-xs text-slate-400">
                Pasa el jefe de taller
              </span>
            </div>

            {misOrdenes.length === 0 ? (
              <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 text-center space-y-3">
                <FileText className="w-12 h-12 text-slate-600 mx-auto" />
                <h4 className="text-base font-bold text-slate-300">Sin órdenes de trabajo pendientes</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  En cuanto el jefe de taller te adjudique un expediente desde el panel de reparaciones con el botón de operario, aparecerá aquí tu tarjeta de trabajo en tiempo real.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {misOrdenes.map((ot) => (
                  <div
                    key={ot.id}
                    className="bg-slate-900/90 border-2 border-indigo-500/50 rounded-3xl p-5 sm:p-6 shadow-[0_0_25px_rgba(99,102,241,0.2)] space-y-4 relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400" />

                    {/* Cabecera OT: Expediente y Matrícula */}
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono font-bold text-slate-400 block uppercase">
                          Expediente
                        </span>
                        <span className="text-base font-black font-mono text-cyan-400">
                          {ot.expediente_id}
                        </span>
                      </div>

                      {ot.matricula && (
                        <div className="shrink-0">
                          <MatriculaBadge matricula={ot.matricula} size="sm" />
                        </div>
                      )}
                    </div>

                    {/* Datos del Vehículo y Cliente */}
                    <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="font-bold text-white uppercase">{ot.marca} {ot.modelo}</span>
                        <span className="text-slate-400">Vehículo</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400 text-[11px]">
                        <span>Cliente: <strong className="text-slate-200">{ot.cliente_nombre}</strong></span>
                        {ot.cliente_telefono && <span>📞 {ot.cliente_telefono}</span>}
                      </div>
                    </div>

                    {/* Concepto e Instrucciones de Reparación pasadas por el Jefe */}
                    <div className="space-y-1">
                      <span className="text-[11px] font-black text-indigo-300 uppercase tracking-wider block">
                        🛠️ Concepto / Tareas a Ejecutar:
                      </span>
                      <div className="p-3 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 text-xs text-slate-200 whitespace-pre-line leading-relaxed">
                        {ot.concepto || 'Reparación general del vehículo según presupuesto.'}
                      </div>
                    </div>

                    {/* Pie de la tarjeta */}
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                      <div className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{new Date(ot.fecha_emision).toLocaleDateString('es-ES')} {new Date(ot.fecha_emision).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => navigate('/reparaciones')}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-400/40 text-indigo-200 text-xs font-bold flex items-center gap-1 transition-all"
                      >
                        <span>Abrir Reparación</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Tarjeta Central de Acceso si no está autenticado */
        <div className="max-w-md w-full mx-auto my-6">
          <div className="bg-slate-900/90 border-2 border-indigo-500/40 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(99,102,241,0.2)] backdrop-blur-xl space-y-6">
            <div className="flex items-center justify-between border-b border-indigo-500/20 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">Identificación de Operario</h2>
                  <p className="text-[11px] text-indigo-300">Selecciona tu perfil de trabajo</p>
                </div>
              </div>
              <span className="text-[10px] px-2.5 py-1 rounded-full font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {empleados.length} Registrados
              </span>
            </div>

            <form onSubmit={handleLoginEmpleado} className="space-y-4">
              {/* Selector de Empleado */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Empleado / Mecánico Autorizado
                </label>
                {empleados.length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-400">
                    No hay empleados registrados en el sistema. Solicita a tu jefe de taller que te dé de alta en Personal Autorizado.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {empleados.map((emp) => {
                      const isSelected = emailSeleccionado.toLowerCase() === emp.email.toLowerCase()
                      return (
                        <div
                          key={emp.id}
                          onClick={() => setEmailSeleccionado(emp.email)}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? 'bg-indigo-600/30 border-indigo-400 text-white shadow-[0_0_15px_rgba(99,102,241,0.3)] scale-[1.01]'
                              : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                              isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-300'
                            }`}>
                              {emp.nombre.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-white">{emp.nombre}</p>
                              <p className="text-[10px] text-slate-400">{emp.roles?.nombre || emp.rol || 'Operario'}</p>
                            </div>
                          </div>

                          {isSelected && (
                            <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0" />
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Clave PIN Opcional */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Código PIN o Contraseña (Opcional)
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={pinPassword}
                    onChange={(e) => setPinPassword(e.target.value)}
                    placeholder="Introduce tu PIN / Clave si está activada"
                    className="w-full bg-slate-950/70 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                  />
                  <KeyRound className="w-4 h-4 text-slate-500 absolute right-3 top-3" />
                </div>
              </div>

              {/* Checkbox recordar */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="guardarSesionEmp"
                  checked={guardarSesion}
                  onChange={(e) => setGuardarSesion(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-950 border-slate-700 accent-indigo-500 cursor-pointer"
                />
                <label htmlFor="guardarSesionEmp" className="text-xs text-slate-300 cursor-pointer select-none">
                  Recordar mi puesto de trabajo en este dispositivo
                </label>
              </div>

              {/* Botón de Entrada */}
              <button
                type="submit"
                disabled={loading || !emailSeleccionado}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <span>Conectando orden de trabajo...</span>
                ) : (
                  <>
                    <span>Entrar a Mis Órdenes de Trabajo</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Enlaces de pie de tarjeta */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="hover:text-white transition-colors"
              >
                ← Panel Principal
              </button>
              <button
                type="button"
                onClick={() => navigate('/registro-taller')}
                className="text-indigo-400 hover:text-indigo-300 font-bold transition-colors"
              >
                Alta de Taller
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pie informativo */}
      <div className="max-w-md w-full mx-auto text-center pb-4 text-xs text-slate-500">
        GESTARIAN • Sistema de Adjudicación de Órdenes de Reparación en Taller
      </div>
    </div>
  )
}
