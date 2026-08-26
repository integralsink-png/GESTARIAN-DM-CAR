import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader, Card, Button, Input } from '../components/UI'
import { 
  Building2, Mail, Phone, MapPin, FileText, CheckCircle2, 
  AlertCircle, ShieldCheck, ArrowLeft, Sparkles, Scale, Info
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { validarDocumentoAEAT } from '../lib/utils'
import { useToast } from '../lib/ToastContext'
import { configuracionService } from '../services/configuracionService'
import type { Configuracion } from '../lib/types'

export function RegistroUsuarioTallerPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [config, setConfig] = useState<Configuracion | null>(null)
  const [loading, setLoading] = useState(false)
  const [completado, setCompletado] = useState(false)

  // Formulario con datos obligatorios por Ley AEAT (Real Decreto 1619/2012)
  const [form, setForm] = useState({
    nombre_profesional: 'DM CAR TALLERES',
    nombre_titular: 'Ali Mohamed',
    cif: '12345678Z',
    direccion_fiscal: 'Polígono Industrial Las Palmeras, Nave 4',
    codigo_postal: '28001',
    poblacion: 'Madrid',
    provincia: 'Madrid',
    pais: 'España',
    email: 'alimajefe@gmail.com',
    telefono: '600 123 456',
    password: '',
    confirm_password: '',
    tipo_empresa: 'autonomo' as 'autonomo' | 'sociedad_limitada',
    plan_solicitado: 'PRO' as 'FREE' | 'PRO' | 'ENTERPRISE',
    acepta_terminos: true
  })

  const [cifValidation, setCifValidation] = useState<{ valido: boolean; tipo: string; error?: string }>({
    valido: true,
    tipo: 'DNI/NIF'
  })

  const [mostrarLoginRapido, setMostrarLoginRapido] = useState(false)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [cuentasLocales, setCuentasLocales] = useState<Array<{ email: string; nombre?: string }>>([])

  useEffect(() => {
    configuracionService.obtenerConfiguracion().then(setConfig).catch(() => null)

    // Cargar cuentas registradas en este dispositivo
    try {
      const savedRaw = localStorage.getItem('gestarian_saved_accounts')
      if (savedRaw) {
        setCuentasLocales(JSON.parse(savedRaw))
      } else {
        const bkpRaw = localStorage.getItem('gestarian_clientes_registrados_backup')
        if (bkpRaw) {
          const list: any[] = JSON.parse(bkpRaw)
          const mapped = list.filter(c => !!c.email).map(c => ({
            email: c.email,
            nombre: c.nombre_taller || c.nombre_profesional || c.email
          }))
          setCuentasLocales(mapped)
        }
      }
    } catch (e) {}
  }, [])

  const ejecutarLogin = async (emailToLogin: string) => {
    const clean = emailToLogin.trim().toLowerCase()
    if (!clean) return
    setLoginLoading(true)
    try {
      localStorage.setItem('gestarian_test_user', clean)
      sessionStorage.setItem('gestarian_account_chosen', 'true')
      
      // Guardar en cuentas guardadas
      try {
        const raw = localStorage.getItem('gestarian_saved_accounts')
        const list: any[] = raw ? JSON.parse(raw) : []
        if (!list.some(a => a.email.toLowerCase() === clean)) {
          list.unshift({ email: clean, nombre: clean.split('@')[0], ultimoAcceso: new Date().toISOString() })
          localStorage.setItem('gestarian_saved_accounts', JSON.stringify(list))
        }
      } catch (e) {}

      if (clean === 'iclomsinks@gmail.com' && localStorage.getItem('gestarian_dev_mode') !== 'true') {
        showToast('Accediendo a autenticación de desarrollador...', 'info')
        setTimeout(() => {
          window.location.href = '/desarrollador'
        }, 400)
        return
      }

      showToast(`Iniciando sesión con ${clean}...`, 'success')
      setTimeout(() => {
        window.location.href = '/'
      }, 400)
    } catch (err: any) {
      showToast('Error al iniciar sesión: ' + (err.message || ''), 'error')
      setLoginLoading(false)
    }
  }

  const handleLoginDirecto = (e: React.FormEvent) => {
    e.preventDefault()
    ejecutarLogin(loginEmail)
  }

  const handleCifChange = (val: string) => {
    const formatted = val.toUpperCase().trim()
    setForm(prev => ({ ...prev, cif: formatted }))
    if (formatted.length >= 8) {
      const res = validarDocumentoAEAT(formatted)
      setCifValidation(res)
    } else {
      setCifValidation({ valido: false, tipo: 'DESCONOCIDO', error: 'Introduce el NIF/CIF completo' })
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Validar NIF/CIF por algoritmo oficial AEAT
    const validacion = validarDocumentoAEAT(form.cif)
    if (!validacion.valido) {
      showToast(`NIF/CIF inválido: ${validacion.error || 'Revise el documento'}`, 'error')
      return
    }

    if (!form.nombre_profesional.trim() || !form.direccion_fiscal.trim() || !form.codigo_postal.trim() || !form.poblacion.trim()) {
      showToast('Por favor cumplimenta todos los campos fiscales obligatorios exigidos por la AEAT', 'warning')
      return
    }

    if (!form.password || form.password.length < 4) {
      showToast('Introduce una contraseña de al menos 4 caracteres para tu cuenta', 'warning')
      return
    }

    if (form.password !== form.confirm_password) {
      showToast('Las contraseñas no coinciden. Por favor ratifica tu contraseña correctamente.', 'error')
      return
    }

    setLoading(true)
    try {
      // 1. Registrar / Actualizar en gestarian_licencias con el esquema real de Supabase
      const fechaPrueba = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      const cleanEmail = form.email.trim().toLowerCase()
      
      const licPayload = {
        email: cleanEmail,
        nombre_taller: form.nombre_profesional.trim(),
        estado: 'activo',
        fecha_fin_prueba: fechaPrueba
      }

      // Upsert directo en la nube de Supabase (accesible desde cualquier móvil o PC)
      try {
        const { error: licErr } = await supabase.from('gestarian_licencias').upsert(licPayload, { onConflict: 'email' })
        if (licErr) {
          console.warn('Reintentando insert en gestarian_licencias:', licErr.message)
          await supabase.from('gestarian_licencias').insert(licPayload)
        }
      } catch (e) {
        console.warn('Aviso en gestarian_licencias:', e)
      }

      // 2. Guardar en tabla usuarios de Supabase
      try {
        await supabase.from('usuarios').upsert({
          email: cleanEmail,
          nombre: form.nombre_titular.trim() || form.nombre_profesional.trim(),
          rol: 'JEFE_TALLER',
          activo: true
        }, { onConflict: 'email' })
      } catch (e) {
        console.warn('Aviso en usuarios:', e)
      }

      // 3. Registrar también en la tabla clientes de Supabase para respaldo cloud universal
      try {
        await supabase.from('clientes').upsert({
          nombre: `${form.nombre_profesional.trim()} (${form.nombre_titular.trim()})`,
          email: cleanEmail,
          telefono: form.telefono.trim(),
          dni: form.cif.trim().toUpperCase(),
          direccion: `${form.direccion_fiscal}, CP ${form.codigo_postal}, ${form.poblacion} (${form.provincia})`
        }, { onConflict: 'email' })
      } catch (e) {
        console.warn('Aviso en clientes cloud:', e)
      }

      // 4. Sincronizar datos fiscales de la empresa en configuracion (id=1)
      try {
        await supabase.from('configuracion').upsert({
          id: 1,
          nombre_empresa: form.nombre_profesional.trim(),
          cif: form.cif.trim().toUpperCase(),
          direccion: `${form.direccion_fiscal}, CP ${form.codigo_postal}, ${form.poblacion}`,
          telefono: form.telefono.trim(),
          email: cleanEmail,
          tipo_empresa: form.tipo_empresa,
          plan_activo: form.plan_solicitado,
          pro_activo: form.plan_solicitado === 'PRO' || form.plan_solicitado === 'ENTERPRISE'
        })
      } catch (e) {
        console.warn('Aviso en configuracion:', e)
      }

      // Guardar respaldo permanente de clientes registrados
      try {
        const prevBackup = localStorage.getItem('gestarian_clientes_registrados_backup')
        const clientsList: any[] = prevBackup ? JSON.parse(prevBackup) : []
        const existingIdx = clientsList.findIndex(c => c.email.toLowerCase() === cleanEmail)
        const clientEntry = {
          id: `client-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          ...licPayload,
          created_at: new Date().toISOString()
        }
        if (existingIdx >= 0) {
          clientsList[existingIdx] = { ...clientsList[existingIdx], ...clientEntry }
        } else {
          clientsList.unshift(clientEntry)
        }
        localStorage.setItem('gestarian_clientes_registrados_backup', JSON.stringify(clientsList))
      } catch (e) {}

      // Guardar sesión de prueba activa para este usuario y registrar en lista multi-cuenta
      localStorage.setItem('gestarian_test_user', cleanEmail)
      try {
        const savedRaw = localStorage.getItem('gestarian_saved_accounts')
        const savedAccounts: any[] = savedRaw ? JSON.parse(savedRaw) : []
        const exists = savedAccounts.findIndex((a: any) => a.email.toLowerCase() === cleanEmail)
        const accountEntry = {
          email: cleanEmail,
          nombre: form.nombre_profesional.trim() || form.nombre_titular.trim(),
          ultimoAcceso: new Date().toISOString()
        }
        if (exists >= 0) {
          savedAccounts[exists] = { ...savedAccounts[exists], ...accountEntry }
        } else {
          savedAccounts.unshift(accountEntry)
        }
        localStorage.setItem('gestarian_saved_accounts', JSON.stringify(savedAccounts))
      } catch (e) {}

      setCompletado(true)
      showToast('¡Autorización concedida con éxito! Acceso concedido a GESTARIAN', 'success')
    } catch (err: any) {
      console.error('Error registrando usuario:', err)
      showToast('Error al procesar la solicitud: ' + (err.message || ''), 'error')
    } finally {
      setLoading(false)
    }
  }

  if (completado) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center bg-slate-900/95 border-2 border-emerald-500/50 shadow-2xl rounded-3xl space-y-6 animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(16,185,129,0.3)]">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-wide">
              ¡AUTORIZACIÓN COMPLETADA!
            </h2>
            <p className="text-sm text-slate-300 mt-2">
              Tu taller <strong className="text-emerald-400">{form.nombre_profesional}</strong> ha sido dado de alta con éxito en el plan <strong className="text-cyan-400">{form.plan_solicitado} (Gratuito)</strong>.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-left text-slate-300 space-y-1">
            <p><strong>Titular:</strong> {form.nombre_titular}</p>
            <p><strong>NIF / CIF:</strong> {form.cif} ({cifValidation.tipo})</p>
            <p><strong>Login:</strong> {form.email}</p>
            <p><strong>Estado:</strong> <span className="text-emerald-400 font-bold uppercase">Autorizado / Activo</span></p>
          </div>

          <button
            onClick={() => {
              window.location.href = '/configuracion'
            }}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm uppercase tracking-wider shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all active:scale-95 cursor-pointer"
          >
            Entrar a mi Panel de Taller
          </button>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20 p-2 sm:p-4">
      <PageHeader
        title="GESTARIAN"
        subtitle="Registro de Usuario"
      >
        <button
          onClick={() => navigate('/configuracion')}
          className="w-[60px] h-[60px] rounded-2xl bg-slate-800/80 text-white border border-white/20 flex items-center justify-center hover:bg-slate-700 transition-transform active:scale-95 shrink-0 shadow-[0_0_15px_rgba(255,255,255,0.1)]"
          title="Volver"
        >
          <ArrowLeft className="w-7 h-7" />
        </button>
      </PageHeader>

      {/* SECCIÓN DE LOGIN DIRECTO PARA USUARIOS YA REGISTRADOS */}
      <div className="p-5 rounded-3xl bg-slate-900/90 border-2 border-cyan-500/60 shadow-[0_0_25px_rgba(6,182,212,0.2)] backdrop-blur-md space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-cyan-300">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider">
                ¿Ya tienes una cuenta de taller?
              </h3>
              <p className="text-[11px] text-slate-400">
                Inicia sesión directamente con tu correo electrónico registrado.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMostrarLoginRapido(!mostrarLoginRapido)}
            className="px-3.5 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/60 text-xs font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer shrink-0"
          >
            {mostrarLoginRapido ? 'Cerrar' : 'INICIAR SESIÓN'}
          </button>
        </div>

        {mostrarLoginRapido && (
          <div className="space-y-3 pt-1 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="Introduce tu correo (ej: alimajefe@gmail.com)"
                className="flex-1 bg-slate-950 border border-cyan-500/40 focus:border-cyan-400 rounded-2xl px-4 py-3 text-sm text-white font-medium outline-none transition-colors"
              />
              <button
                type="button"
                disabled={loginLoading || !loginEmail.trim()}
                onClick={handleLoginDirecto}
                className="py-3 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-slate-950 font-black text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 shrink-0"
              >
                <span>{loginLoading ? 'ACCEDIENDO...' : 'ENTRAR AL TALLER'}</span>
              </button>
            </div>

            {/* Cuentas guardadas en este dispositivo si existen */}
            {cuentasLocales.length > 0 && (
              <div className="pt-2 border-t border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">
                  O accede con una cuenta guardada en este equipo:
                </span>
                <div className="flex flex-wrap gap-2">
                  {cuentasLocales.map((c) => (
                    <button
                      key={c.email}
                      type="button"
                      onClick={() => {
                        setLoginEmail(c.email)
                        ejecutarLogin(c.email)
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-700 hover:border-cyan-400 text-xs text-slate-200 font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <span className="text-cyan-400 font-mono">👤</span>
                      <span>{c.nombre || c.email}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* AVISO LEGAL FISCAL OBLIGATORIO AEAT */}
      <div className="p-4 rounded-2xl bg-cyan-950/40 border-2 border-cyan-500/60 flex items-start gap-3 shadow-lg">
        <Scale className="w-6 h-6 text-cyan-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 leading-relaxed">
          <span className="font-bold text-white uppercase block text-sm mb-0.5">
            Cumplimiento de Obligaciones de Facturación (Ley 58/2003 y RD 1619/2012 AEAT)
          </span>
          La Agencia Tributaria exige que toda factura emitida contenga obligatoriamente el Número de Identificación Fiscal (NIF/CIF), Razón Social o Nombre completo y Domicilio Fiscal exacto del emisor. Estos datos se utilizarán automáticamente en el membrete oficial de tus presupuestos y facturas.
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. SELECCIÓN DE PLAN (TODOS GRATUITOS EN PROMOCIÓN) */}
        <Card className="p-5 sm:p-6 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-4">
          <h3 className="text-sm sm:text-base font-black uppercase tracking-widest text-cyan-400 flex items-center gap-2 border-b border-slate-800 pb-3">
            <Sparkles className="w-5 h-5" />
            <span>1. Elige tu Plan de Uso (Promoción Gratuita Activa)</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { id: 'FREE', title: 'GESTARIAN FREE', desc: 'Hasta 3 empleados autorizados', badge: '0.00 € (Siempre Gratis)' },
              { id: 'PRO', title: 'GESTARIAN PRO', desc: 'Empleados ilimitados + OCR + IA', badge: '0.00 € (En Promoción)' },
              { id: 'ENTERPRISE', title: 'ENTERPRISE', desc: 'Multi-taller y franquicias', badge: '0.00 € (En Promoción)' }
            ].map((p) => {
              const isSelected = form.plan_solicitado === p.id
              return (
                <div
                  key={p.id}
                  onClick={() => setForm({ ...form, plan_solicitado: p.id as any })}
                  className={`p-5 rounded-2xl border-2 transition-all cursor-pointer select-none flex flex-col justify-between ${
                    isSelected
                      ? 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.35)] ring-1 ring-cyan-400'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <span className="text-lg sm:text-xl font-black uppercase text-white block tracking-tight">{p.title}</span>
                    <span className="text-sm sm:text-base text-slate-300 mt-2 block leading-snug">{p.desc}</span>
                  </div>
                  <span className="mt-4 text-xs sm:text-sm font-black uppercase px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 w-fit tracking-wide shadow-sm">
                    {p.badge}
                  </span>
                </div>
              )
            })}
          </div>
        </Card>

        {/* 2. DATOS FISCALES DEL EMISOR OBLIGATORIOS POR LA AEAT */}
        <Card className="p-5 sm:p-6 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-cyan-400 flex items-center gap-2 border-b border-slate-800 pb-3">
            <Building2 className="w-4 h-4" />
            <span>2. Datos de Identificación Fiscal del Taller (Emisor)</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-300 block mb-1">Nombre Comercial del Taller *</label>
              <input
                type="text"
                required
                value={form.nombre_profesional}
                onChange={(e) => setForm({ ...form, nombre_profesional: e.target.value })}
                placeholder="Ej. DM CAR TALLERES"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-medium focus:border-cyan-400 outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-slate-300 block mb-1">Nombre y Apellidos del Titular / Administrador *</label>
              <input
                type="text"
                required
                value={form.nombre_titular}
                onChange={(e) => setForm({ ...form, nombre_titular: e.target.value })}
                placeholder="Ej. Ali Mohamed"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-medium focus:border-cyan-400 outline-none"
              />
            </div>

            {/* NIF/CIF con verificación AEAT en tiempo real */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-300">NIF / CIF Oficial del Emisor *</label>
                {form.cif && (
                  <span className={`text-[10px] font-bold uppercase px-1.5 py-0.2 rounded ${
                    cifValidation.valido ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-400'
                  }`}>
                    {cifValidation.valido ? `✓ ${cifValidation.tipo} VÁLIDO` : '✗ NO VÁLIDO'}
                  </span>
                )}
              </div>
              <input
                type="text"
                required
                maxLength={9}
                value={form.cif}
                onChange={(e) => handleCifChange(e.target.value)}
                placeholder="Ej. 12345678Z o B12345678"
                className={`w-full bg-slate-950 border rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold uppercase outline-none transition-all ${
                  cifValidation.valido
                    ? 'border-emerald-500/60 text-emerald-300 focus:border-emerald-400'
                    : 'border-rose-500/60 text-rose-300 focus:border-rose-400'
                }`}
              />
              {cifValidation.error && (
                <span className="text-[10px] text-rose-400 mt-1 block font-medium">
                  {cifValidation.error}
                </span>
              )}
            </div>

            <div>
              <label className="font-bold text-slate-300 block mb-1">Tipo de Entidad *</label>
              <select
                value={form.tipo_empresa}
                onChange={(e) => setForm({ ...form, tipo_empresa: e.target.value as any })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-medium focus:border-cyan-400 outline-none"
              >
                <option value="autonomo">Persona Física / Autónomo (DNI / NIE)</option>
                <option value="sociedad_limitada">Sociedad Mercantil / S.L. / S.A. (CIF)</option>
              </select>
            </div>
          </div>
        </Card>

        {/* 3. DOMICILIO FISCAL COMPLETO (REQUISITO FISCAL AEAT) */}
        <Card className="p-5 sm:p-6 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-cyan-400 flex items-center gap-2 border-b border-slate-800 pb-3">
            <MapPin className="w-4 h-4" />
            <span>3. Domicilio Fiscal y Contacto (Emisor de Facturas)</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="sm:col-span-2">
              <label className="font-bold text-slate-300 block mb-1">Calle, Número, Nave o Polígono *</label>
              <input
                type="text"
                required
                value={form.direccion_fiscal}
                onChange={(e) => setForm({ ...form, direccion_fiscal: e.target.value })}
                placeholder="Ej. Polígono Industrial Las Palmeras, Nave 4"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-medium focus:border-cyan-400 outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-slate-300 block mb-1">Código Postal *</label>
              <input
                type="text"
                required
                maxLength={5}
                value={form.codigo_postal}
                onChange={(e) => setForm({ ...form, codigo_postal: e.target.value })}
                placeholder="28001"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-medium focus:border-cyan-400 outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-slate-300 block mb-1">Población / Municipio *</label>
              <input
                type="text"
                required
                value={form.poblacion}
                onChange={(e) => setForm({ ...form, poblacion: e.target.value })}
                placeholder="Madrid"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-medium focus:border-cyan-400 outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-slate-300 block mb-1">Provincia *</label>
              <input
                type="text"
                required
                value={form.provincia}
                onChange={(e) => setForm({ ...form, provincia: e.target.value })}
                placeholder="Madrid"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-medium focus:border-cyan-400 outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-slate-300 block mb-1">País</label>
              <input
                type="text"
                value={form.pais}
                disabled
                className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-400 font-medium"
              />
            </div>

            <div>
              <label className="font-bold text-slate-300 block mb-1">Email de Acceso (Usuario GESTARIAN) *</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="alimajefe@gmail.com"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-medium focus:border-cyan-400 outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-slate-300 block mb-1">Teléfono Móvil / WhatsApp *</label>
              <input
                type="tel"
                required
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                placeholder="600 123 456"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-medium focus:border-cyan-400 outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-slate-300 block mb-1">Elegir Contraseña de Acceso *</label>
              <input
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-medium focus:border-cyan-400 outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-slate-300 block mb-1">Ratificar Contraseña *</label>
              <input
                type="password"
                required
                value={form.confirm_password}
                onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
                placeholder="••••••••"
                className={`w-full bg-slate-950 border rounded-xl px-3.5 py-2.5 text-sm text-white font-medium outline-none ${
                  form.confirm_password && form.confirm_password !== form.password
                    ? 'border-rose-500/80 focus:border-rose-400'
                    : 'border-slate-700 focus:border-cyan-400'
                }`}
              />
              {form.confirm_password && form.confirm_password !== form.password && (
                <span className="text-[10px] text-rose-400 mt-1 block">Las contraseñas no coinciden</span>
              )}
            </div>
          </div>
        </Card>

        {/* Botón de Enviar Solicitud */}
        <div className="pt-4 flex justify-center w-full">
          <button
            type="submit"
            disabled={loading}
            className="w-[85%] py-4 px-3 sm:px-5 rounded-2xl bg-black/90 hover:bg-black text-white font-black uppercase tracking-wider border-2 border-cyan-200 shadow-[0_0_20px_rgba(6,182,212,0.90)] hover:shadow-[0_0_25px_rgba(6,182,212,1)] transition-all active:scale-[0.99] flex items-center justify-center text-center cursor-pointer disabled:opacity-50"
          >
            <div className="w-full mx-auto flex flex-col items-center justify-center leading-tight">
              <span 
                className="w-full block text-center font-black tracking-wide whitespace-nowrap overflow-hidden text-ellipsis"
                style={{ fontSize: 'clamp(0.98rem, 4.3vw, 1.5rem)' }}
              >
                {loading ? 'PROCESANDO AUTORIZACIÓN...' : 'SOLICITUD AUTORIZACIÓN DE USO'}
              </span>
              {!loading && (
                <span 
                  className="w-full block text-center font-black text-cyan-300 tracking-wider mt-1 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]"
                  style={{ fontSize: 'clamp(1.35rem, 5.8vw, 2.05rem)', lineHeight: '1.1' }}
                >
                  (GRATUITO)
                </span>
              )}
            </div>
          </button>
        </div>
      </form>
    </div>
  )
}
