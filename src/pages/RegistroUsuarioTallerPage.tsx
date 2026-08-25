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
    tipo_empresa: 'autonomo' as 'autonomo' | 'sociedad_limitada',
    plan_solicitado: 'PRO' as 'FREE' | 'PRO' | 'ENTERPRISE',
    acepta_terminos: true
  })

  const [cifValidation, setCifValidation] = useState<{ valido: boolean; tipo: string; error?: string }>({
    valido: true,
    tipo: 'DNI/NIF'
  })

  useEffect(() => {
    configuracionService.obtenerConfiguracion().then(setConfig).catch(() => null)
  }, [])

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

    setLoading(true)
    try {
      // 1. Registrar / Actualizar en gestarian_licencias
      const fechaPrueba = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      
      const { error: licErr } = await supabase.from('gestarian_licencias').upsert({
        email: form.email.trim().toLowerCase(),
        nombre_profesional: form.nombre_profesional.trim(),
        nombre_titular: form.nombre_titular.trim(),
        cif: form.cif.trim().toUpperCase(),
        direccion_fiscal: `${form.direccion_fiscal}, CP ${form.codigo_postal}, ${form.poblacion} (${form.provincia}), ${form.pais}`,
        telefono: form.telefono.trim(),
        tipo_empresa: form.tipo_empresa,
        plan_solicitado: form.plan_solicitado,
        estado_licencia: 'activo', // Autorización automática en fase promocional gratuita
        suscripcion_activa: true,
        estado_pago: 'gratuito',
        fecha_fin_prueba: fechaPrueba
      }, { onConflict: 'email' })

      if (licErr) {
        console.warn('Aviso guardando en gestarian_licencias:', licErr.message)
      }

      // 2. Guardar también en usuarios como JEFE_TALLER
      await supabase.from('usuarios').upsert({
        email: form.email.trim().toLowerCase(),
        nombre: form.nombre_titular.trim() || form.nombre_profesional.trim(),
        telefono: form.telefono.trim(),
        rol: 'JEFE_TALLER',
        es_pro: form.plan_solicitado === 'PRO' || form.plan_solicitado === 'ENTERPRISE',
        activo: true
      }, { onConflict: 'email' })

      // 3. Sincronizar datos fiscales de la empresa en configuracion (id=1)
      await supabase.from('configuracion').upsert({
        id: 1,
        nombre_empresa: form.nombre_profesional.trim(),
        cif: form.cif.trim().toUpperCase(),
        direccion: `${form.direccion_fiscal}, CP ${form.codigo_postal}, ${form.poblacion}`,
        telefono: form.telefono.trim(),
        email: form.email.trim().toLowerCase(),
        tipo_empresa: form.tipo_empresa,
        plan_activo: form.plan_solicitado,
        pro_activo: form.plan_solicitado === 'PRO' || form.plan_solicitado === 'ENTERPRISE'
      })

      // Guardar sesión de prueba activa para este usuario
      localStorage.setItem('gestarian_test_user', form.email.trim().toLowerCase())

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
          <h3 className="text-xs font-black uppercase tracking-widest text-cyan-400 flex items-center gap-2 border-b border-slate-800 pb-3">
            <Sparkles className="w-4 h-4" />
            <span>1. Elige tu Plan de Uso (Promoción Gratuita Activa)</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: 'FREE', title: 'GESTARIAN FREE', desc: 'Hasta 3 empleados autorizados', badge: '0.00 € / mes' },
              { id: 'PRO', title: 'GESTARIAN PRO', desc: 'Empleados ilimitados + OCR + IA', badge: '0.00 € (En Promoción)' },
              { id: 'ENTERPRISE', title: 'ENTERPRISE', desc: 'Multi-taller y franquicias', badge: '0.00 € (En Promoción)' }
            ].map((p) => {
              const isSelected = form.plan_solicitado === p.id
              return (
                <div
                  key={p.id}
                  onClick={() => setForm({ ...form, plan_solicitado: p.id as any })}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer select-none flex flex-col justify-between ${
                    isSelected
                      ? 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)] ring-1 ring-cyan-400'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <span className="text-xs font-black uppercase text-white block">{p.title}</span>
                    <span className="text-[11px] text-slate-400 mt-1 block">{p.desc}</span>
                  </div>
                  <span className="mt-3 text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 w-fit">
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
          </div>
        </Card>

        {/* Botón de Enviar Solicitud */}
        <div className="pt-4 flex justify-center w-full">
          <button
            type="submit"
            disabled={loading}
            className="w-[90%] py-4 px-6 rounded-2xl bg-black/90 hover:bg-black text-white font-black text-xs sm:text-sm md:text-base uppercase tracking-wider border-2 border-cyan-200 shadow-[0_0_1px_rgba(6,182,212,0.9)] hover:shadow-[0_0_2px_rgba(6,182,212,1)] transition-all active:scale-[0.99] flex items-center justify-center text-center cursor-pointer disabled:opacity-50"
          >
            <span>{loading ? 'PROCESANDO AUTORIZACIÓN...' : 'SOLICITAR AUTORIZACIÓN DE USO (GRATUITO)'}</span>
          </button>
        </div>
      </form>
    </div>
  )
}
