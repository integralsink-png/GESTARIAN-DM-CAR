import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Cliente, Vehiculo, Configuracion } from '../lib/types'
import { useToast } from '../lib/ToastContext'
import { playSuccessChime } from '../lib/sound'
import {
  KeyRound,
  Mail,
  UserCheck,
  Lock,
  ArrowRight,
  ShieldCheck,
  CarFront,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  Smartphone,
  Save
} from 'lucide-react'

export function ClientePortalAuthPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [loading, setLoading] = useState(false)
  const [config, setConfig] = useState<Configuracion | null>(null)

  // Estados del Formulario de Acceso
  const [email, setEmail] = useState('')
  const [documentoDni, setDocumentoDni] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Estado de Paso: 'login' | 'primer_acceso_cambio_clave'
  const [step, setStep] = useState<'login' | 'primer_acceso_cambio_clave'>('login')
  const [clienteEncontrado, setClienteEncontrado] = useState<Cliente | null>(null)
  const [primerVehiculo, setPrimerVehiculo] = useState<Vehiculo | null>(null)

  // Nuevas credenciales
  const [nuevaPassword, setNuevaPassword] = useState('')
  const [confirmarPassword, setConfirmarPassword] = useState('')
  const [showNuevaPass, setShowNuevaPass] = useState(false)

  // Recordar credenciales
  const [guardarEnDispositivo, setGuardarEnDispositivo] = useState(true)
  const [credencialGuardada, setCredencialGuardada] = useState<{ email: string; pass: string; nombre: string } | null>(null)

  useEffect(() => {
    // 1. Cargar configuración de taller
    supabase.from('configuracion').select('*').eq('id', 1).maybeSingle().then(({ data }) => {
      if (data) setConfig(data)
    })

    // 2. Verificar si hay credenciales guardadas en este navegador/teléfono para auto-completar/acceso en un toque
    try {
      const savedAuth = localStorage.getItem('gestarian_cliente_portal_saved_auth')
      if (savedAuth) {
        const parsed = JSON.parse(savedAuth)
        if (parsed.email && parsed.pass) {
          setCredencialGuardada(parsed)
          setEmail(parsed.email)
          setPassword(parsed.pass)
        }
      }
    } catch (e) {
      console.warn('Error leyendo auth guardada:', e)
    }
  }, [])

  // Normalizar documento (sin espacios ni guiones, en mayúsculas)
  const normalizarDoc = (str: string) => {
    return (str || '').replace(/[\s\-_.]/g, '').toUpperCase().trim()
  }

  // ─────────────────────────────────────────────────────────────
  // 1. INICIAR SESIÓN (PRIMERA VEZ CON DNI O SIGUIENTES CON CLAVE)
  // ─────────────────────────────────────────────────────────────
  async function handleLogin(e?: React.FormEvent) {
    if (e) e.preventDefault()
    const cleanEmail = email.trim().toLowerCase()
    const cleanDoc = normalizarDoc(documentoDni || password)

    if (!cleanEmail) {
      showToast('Introduce tu correo electrónico', 'warning')
      return
    }

    setLoading(true)
    try {
      // 1. Buscar cliente por email
      const { data: clientesData, error: cliErr } = await supabase
        .from('clientes')
        .select('*')
        .ilike('email', cleanEmail)

      if (cliErr || !clientesData || clientesData.length === 0) {
        showToast('No consta ningún cliente registrado con este correo electrónico.', 'error')
        setLoading(false)
        return
      }

      // Encontrar coincidencia con documento o contraseña guardada
      let matchCliente: Cliente | null = null
      let esPrimerAcceso = false

      for (const cli of clientesData) {
        const docBD = normalizarDoc(cli.dni || '')
        const customPass = localStorage.getItem(`gestarian_cliente_pwd_${cli.id}`)

        // A) Verificación con contraseña personalizada si ya la cambió
        if (customPass && password === customPass) {
          matchCliente = cli
          esPrimerAcceso = false
          break
        }

        // B) Verificación de primera vez con DNI/CIF (sin espacios ni guiones)
        if (docBD && (cleanDoc === docBD || normalizarDoc(password) === docBD)) {
          matchCliente = cli
          // Si no ha cambiado contraseña nunca, es primer acceso obligatorio
          if (!customPass) {
            esPrimerAcceso = true
          }
          break
        }
      }

      if (!matchCliente) {
        showToast('Credenciales incorrectas. La primera vez introduzca su DNI/CIF sin espacios ni guiones.', 'error')
        setLoading(false)
        return
      }

      setClienteEncontrado(matchCliente)

      // Obtener vehículo asociado
      const { data: vehs } = await supabase
        .from('vehiculos')
        .select('*')
        .eq('cliente_id', matchCliente.id)
        .order('created_at', { ascending: false })

      const primerVeh = (vehs && vehs.length > 0) ? vehs[0] : null
      setPrimerVehiculo(primerVeh)

      // Si es primera vez, pasar a pantalla de cambio de contraseña obligatorio
      if (esPrimerAcceso) {
        setStep('primer_acceso_cambio_clave')
        setLoading(false)
        showToast('Identificación correcta. Por seguridad, establezca su nueva contraseña personal.', 'info')
        return
      }

      // Si ya tiene contraseña, dar acceso directo al portal
      completarAcceso(matchCliente, primerVeh, password)
    } catch (err: any) {
      console.error('Error login cliente:', err)
      showToast('Error al conectar con el servidor', 'error')
    } finally {
      setLoading(false)
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 2. GUARDAR NUEVA CONTRASEÑA EN PRIMER ACCESO
  // ─────────────────────────────────────────────────────────────
  async function handleGuardarNuevaPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!clienteEncontrado) return

    if (!nuevaPassword || nuevaPassword.length < 4) {
      showToast('La nueva contraseña debe tener al menos 4 caracteres', 'warning')
      return
    }

    if (nuevaPassword !== confirmarPassword) {
      showToast('Las contraseñas introducidas no coinciden', 'error')
      return
    }

    setLoading(true)
    try {
      // Guardar clave personalizada vinculada al cliente
      localStorage.setItem(`gestarian_cliente_pwd_${clienteEncontrado.id}`, nuevaPassword)

      playSuccessChime()
      showToast('¡Contraseña establecida con éxito!', 'success')

      completarAcceso(clienteEncontrado, primerVehiculo, nuevaPassword)
    } catch (e) {
      showToast('Error al guardar contraseña', 'error')
    } finally {
      setLoading(false)
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 3. COMPLETAR ACCESO (GUARDAR SESIÓN Y NAVEGAR AL PORTAL)
  // ─────────────────────────────────────────────────────────────
  async function completarAcceso(cli: Cliente, veh: Vehiculo | null, passUsada: string) {
    // 1. Si está marcado guardar en navegador/teléfono
    if (guardarEnDispositivo) {
      try {
        const cred = {
          email: cli.email,
          pass: passUsada,
          nombre: cli.nombre,
          savedAt: new Date().toISOString()
        }
        localStorage.setItem('gestarian_cliente_portal_saved_auth', JSON.stringify(cred))
      } catch (e) {
        console.warn('Error guardando credenciales locales:', e)
      }
    }

    // 2. Crear o recuperar invitación / token activo
    let targetToken = 'demo'
    const { data: invExistente } = await supabase
      .from('cliente_invitaciones')
      .select('token')
      .eq('cliente_id', cli.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (invExistente?.token) {
      targetToken = invExistente.token
    } else {
      // Generar token único si no existiese
      const nuevoToken = `${cli.id.slice(0, 8)}-${Date.now().toString(36)}`
      await supabase.from('cliente_invitaciones').insert({
        cliente_id: cli.id,
        vehiculo_id: veh?.id || null,
        token: nuevoToken
      })
      targetToken = nuevoToken
    }

    sessionStorage.setItem('gestarian_cliente_authed_id', cli.id)
    playSuccessChime()
    showToast(`Bienvenido/a, ${cli.nombre}`, 'success')

    navigate(`/cliente/${targetToken}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white flex flex-col justify-between p-4 sm:p-6 select-none animate-fade-in">
      {/* Cabecera Superior con Logo */}
      <div className="w-full max-w-md mx-auto pt-6 flex flex-col items-center text-center">
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl overflow-hidden shadow-[0_0_30px_rgba(6,182,212,0.4)] border-2 border-cyan-400/40 bg-white p-0.5 mb-4">
          <img src="/images/logos/logo.jpg" alt="Logo DM CAR" className="w-full h-full object-cover rounded-[22px]" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-200 to-white">
          {config?.nombre_empresa || 'DM CAR'}
        </h1>
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-400/80 mt-1">
          PORTAL WEB DE CLIENTE
        </p>
      </div>

      {/* Contenedor Central / Tarjeta de Autenticación */}
      <div className="w-full max-w-md mx-auto my-6">
        <div className="bg-slate-900/90 border-2 border-cyan-500/50 rounded-3xl p-6 sm:p-8 shadow-[0_0_40px_rgba(6,182,212,0.25)] backdrop-blur-xl">

          {/* ───────────────────────────────────────────────────────────── */}
          {/* VISTA 1: INICIO DE SESIÓN */}
          {/* ───────────────────────────────────────────────────────────── */}
          {step === 'login' && (
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="text-center pb-2 border-b border-slate-800">
                <h2 className="text-lg font-black uppercase tracking-wider text-white">Acceso a tus Expedientes</h2>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Consulta presupuestos, citas, recibos de abono y facturas en tiempo real.
                </p>
              </div>

              {/* Acceso Rápido con 1 Toque si ya hay credencial guardada */}
              {credencialGuardada && (
                <div className="p-3.5 rounded-2xl bg-cyan-950/40 border border-cyan-500/50 space-y-2">
                  <div className="flex items-center gap-2 text-cyan-300 text-xs font-bold">
                    <Smartphone className="w-4 h-4 text-cyan-400" />
                    <span>Dispositivo recordado: <strong>{credencialGuardada.nombre}</strong></span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleLogin()}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md cursor-pointer transition-transform active:scale-95"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Entrar con 1 Toque</span>
                  </button>
                </div>
              )}

              {/* Campo Email */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black uppercase tracking-wider text-cyan-400">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="ejemplo@correo.com"
                    autoComplete="username"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-xl pl-11 pr-4 py-3 text-sm text-white outline-none shadow-inner"
                  />
                </div>
              </div>

              {/* Campo DNI/CIF (Primer acceso) o Contraseña */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-black uppercase tracking-wider text-cyan-400">
                    DNI / CIF o Contraseña
                  </label>
                  <span className="text-[10px] text-slate-400 italic">Primera vez: tu DNI/CIF</span>
                </div>
                <div className="relative">
                  <KeyRound className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="12345678C o X12345678"
                    autoComplete="current-password"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-xl pl-11 pr-11 py-3 text-sm text-white outline-none shadow-inner uppercase"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 leading-tight pt-0.5">
                  Introduce tu DNI/CIF sin espacios ni guiones (ejemplo: <strong>12345678C</strong> o <strong>B12345678</strong>).
                </p>
              </div>

              {/* Checkbox Recordar en este Navegador / Teléfono */}
              <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer pt-1 select-none">
                <input
                  type="checkbox"
                  checked={guardarEnDispositivo}
                  onChange={e => setGuardarEnDispositivo(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 text-cyan-500 focus:ring-cyan-400 bg-slate-950"
                />
                <span>Guardar acceso en este navegador para entrar automáticamente</span>
              </label>

              {/* Botón Principal de Acceso */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                <span>ACCEDER AL PORTAL</span>
              </button>
            </form>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* VISTA 2: OBLIGATORIO PRIMER ACCESO - ESTABLECER CONTRASEÑA */}
          {/* ───────────────────────────────────────────────────────────── */}
          {step === 'primer_acceso_cambio_clave' && (
            <form onSubmit={handleGuardarNuevaPassword} className="space-y-5 animate-fade-in">
              <div className="text-center pb-2 border-b border-slate-800">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto mb-2">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-black uppercase tracking-wider text-white">Configurar Tu Contraseña</h2>
                <p className="text-xs text-slate-300 mt-1">
                  Hola <strong>{clienteEncontrado?.nombre}</strong>. Establece tu contraseña personal para los próximos accesos.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-black uppercase tracking-wider text-cyan-400">
                  Nueva Contraseña
                </label>
                <div className="relative">
                  <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showNuevaPass ? 'text' : 'password'}
                    required
                    minLength={4}
                    value={nuevaPassword}
                    onChange={e => setNuevaPassword(e.target.value)}
                    placeholder="Mínimo 4 caracteres"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-xl pl-11 pr-11 py-3 text-sm text-white outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNuevaPass(!showNuevaPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showNuevaPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-black uppercase tracking-wider text-cyan-400">
                  Confirmar Contraseña
                </label>
                <div className="relative">
                  <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showNuevaPass ? 'text' : 'password'}
                    required
                    minLength={4}
                    value={confirmarPassword}
                    onChange={e => setConfirmarPassword(e.target.value)}
                    placeholder="Repite la contraseña"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-xl pl-11 pr-4 py-3 text-sm text-white outline-none"
                  />
                </div>
              </div>

              {/* Mensaje de Autoguardado */}
              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-400 flex items-start gap-2">
                <Save className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>
                  Tu usuario seguirá siendo tu correo <strong>{clienteEncontrado?.email}</strong>. El navegador te ofrecerá guardar la contraseña automáticamente.
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                <span>GUARDAR CONTRASEÑA Y ENTRAR</span>
              </button>
            </form>
          )}

        </div>
      </div>

      {/* Pie de página */}
      <div className="w-full max-w-md mx-auto text-center pb-4 text-xs text-slate-500">
        <p>Sistema seguro de gestión para talleres · GESTARIAN</p>
      </div>
    </div>
  )
}
