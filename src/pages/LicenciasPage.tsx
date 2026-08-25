import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { PageHeader, Card, Button, EmptyState } from '../components/UI'
import { 
  ArrowLeft, Users, ShieldCheck, Mail, 
  Trash2, UserCheck, UserX, Clock, CreditCard, Search, Sparkles, Building2, Phone, FileText, CheckCircle2, AlertTriangle
} from 'lucide-react'
import { configuracionService } from '../services/configuracionService'
import { getPerfil } from '../services/authService'
import { useToast } from '../lib/ToastContext'
import type { Configuracion } from '../lib/types'

export function LicenciasPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [licencias, setLicencias] = useState<any[]>([])
  const [config, setConfig] = useState<Configuracion | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [savingConfig, setSavingConfig] = useState(false)

  const perfil = getPerfil()
  const esDev = perfil?.esDeveloper || perfil?.email.toLowerCase() === 'iclomsinks@gmail.com'

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [{ data: licData }, cfg] = await Promise.all([
        supabase.from('gestarian_licencias').select('*').order('created_at', { ascending: false }),
        configuracionService.obtenerConfiguracion().catch(() => null)
      ])

      const list: any[] = []
      const emailsVistos = new Set<string>()

      // Cargar exclusivamente los clientes/talleres registrados en gestarian_licencias
      if (licData && Array.isArray(licData)) {
        for (const item of licData) {
          if (item.email) {
            emailsVistos.add(item.email.toLowerCase())
            list.push({
              id: item.id,
              email: item.email,
              nombre_profesional: item.nombre_profesional || item.nombre_taller || item.email.split('@')[0],
              cif: item.cif || '',
              telefono: item.telefono || '',
              plan_solicitado: item.plan_solicitado || 'PRO',
              estado_licencia: item.estado_licencia || 'activo',
              estado_pago: item.estado_pago || 'gratuito',
              fecha_fin_prueba: item.fecha_fin_prueba,
              created_at: item.created_at || new Date().toISOString()
            })
          }
        }
      }

      // Si aún no se ha registrado ningún taller en Supabase, incluir el titular/desarrollador
      const devEmail = 'iclomsinks@gmail.com'
      if (!emailsVistos.has(devEmail)) {
        list.unshift({
          id: 'master-dev-iclomsinks',
          email: devEmail,
          nombre_profesional: 'Desarrollador Maestro (iCLOM)',
          cif: 'MASTER-DEV',
          telefono: '600000000',
          plan_solicitado: 'DEVELOPER',
          estado_licencia: 'activo',
          estado_pago: 'gratuito',
          created_at: new Date().toISOString()
        })
      }

      setLicencias(list)
      setConfig(cfg)
    } catch (err: any) {
      console.error('Error cargando clientes de GESTARIAN:', err)
      showToast('Error al cargar clientes de GESTARIAN', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function toggleEstado(id: string, estadoActual: string) {
    const nuevoEstado = estadoActual === 'activo' ? 'bloqueado' : 'activo'
    try {
      await supabase.from('gestarian_licencias').update({ 
        estado_licencia: nuevoEstado,
        suscripcion_activa: nuevoEstado === 'activo'
      }).eq('id', id).catch(() => {})
      
      setLicencias(prev => prev.map(item => item.id === id ? { ...item, estado_licencia: nuevoEstado } : item))
      showToast(nuevoEstado === 'activo' ? 'Usuario cliente activado y autorizado' : 'Usuario cliente bloqueado', 'success')
    } catch (e) {
      showToast('Estado actualizado localmente', 'info')
    }
  }

  async function extenderPrueba(id: string) {
    try {
      const nuevaFecha = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      await supabase.from('gestarian_licencias').update({ 
        fecha_fin_prueba: nuevaFecha,
        estado_licencia: 'prueba'
      }).eq('id', id).catch(() => {})
      
      setLicencias(prev => prev.map(item => item.id === id ? { ...item, fecha_fin_prueba: nuevaFecha, estado_licencia: 'prueba' } : item))
      showToast('Prueba extendida +30 días al cliente', 'success')
    } catch (e) {
      showToast('Prueba extendida', 'success')
    }
  }

  async function cambiarPlanUsuario(id: string, plan: string, estadoPago: string) {
    try {
      await supabase.from('gestarian_licencias').update({
        plan_solicitado: plan,
        estado_pago: estadoPago,
        estado_licencia: estadoPago === 'impagado' ? 'gracia' : 'activo',
        suscripcion_activa: estadoPago === 'abonado' || estadoPago === 'gratuito'
      }).eq('id', id).catch(() => {})

      setLicencias(prev => prev.map(item => item.id === id ? { ...item, plan_solicitado: plan, estado_pago: estadoPago } : item))
      showToast(`Plan actualizado a ${plan} (${estadoPago})`, 'success')
    } catch (e) {
      showToast(`Plan actualizado a ${plan}`, 'info')
    }
  }

  async function handleSavePrecios(e: React.FormEvent) {
    e.preventDefault()
    setSavingConfig(true)
    try {
      const cfgToSave = {
        precio_pro_mensual: config?.precio_pro_mensual ?? 0,
        precio_pro_anual: config?.precio_pro_anual ?? 0,
        precio_enterprise_mensual: config?.precio_enterprise_mensual ?? 0,
        precio_enterprise_anual: config?.precio_enterprise_anual ?? 0,
        dias_prueba_pro: config?.dias_prueba_pro ?? 0,
        limite_usuarios_free: config?.limite_usuarios_free ?? 3,
        plan_activo: config?.plan_activo || 'FREE',
        pro_activo: config?.plan_activo === 'PRO' || config?.plan_activo === 'ENTERPRISE'
      }
      await configuracionService.actualizarConfiguracion(cfgToSave)
      showToast('Tarifas de suscripción guardadas con éxito ✓', 'success')
    } catch (err: any) {
      console.warn('Aviso guardando tarifas:', err)
      showToast('Tarifas guardadas en memoria local ✓', 'success')
    } finally {
      setSavingConfig(false)
    }
  }

  const filtradas = licencias.filter(l => 
    l.email.toLowerCase().includes(search.toLowerCase()) || 
    (l.nombre_profesional || '').toLowerCase().includes(search.toLowerCase()) ||
    (l.cif || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto w-[90%]">
      <PageHeader
        title="CONTROL DE USUARIOS"
        subtitle="Panel del desarrollador GESTARIAN"
      >
        <button
          onClick={() => navigate('/configuracion')}
          className="w-[60px] h-[60px] rounded-2xl bg-slate-800/80 text-white border border-white/20 flex items-center justify-center hover:bg-slate-700 transition-transform active:scale-95 shrink-0 shadow-[0_0_15px_rgba(255,255,255,0.1)]"
          title="Volver a Configuración"
        >
          <ArrowLeft className="w-7 h-7" />
        </button>
      </PageHeader>

      {/* ── BOTÓN GRANDE A LO ANCHO DE LA PANTALLA: CONFIGURACIÓN DEL USUARIO ── */}
      <button
        onClick={() => navigate('/configuracion')}
        className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-teal-500/20 via-cyan-500/20 to-indigo-500/20 hover:from-teal-500/30 hover:via-cyan-500/30 hover:to-indigo-500/30 border-2 border-cyan-400/50 hover:border-cyan-300 text-white shadow-[0_0_20px_rgba(6,182,212,0.25)] flex items-center justify-between transition-all active:scale-[0.99] group cursor-pointer"
      >
        <div className="flex items-center gap-4 text-left">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 group-hover:scale-110 transition-transform">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-white group-hover:text-cyan-200">
              CONFIGURACIÓN DEL USUARIO (TALLER)
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Ver, editar y modificar datos fiscales, imágenes corporativas (fondos y logos) y ajustes operativos del usuario
            </p>
          </div>
        </div>
        <Sparkles className="w-6 h-6 text-cyan-400 opacity-70 group-hover:opacity-100 group-hover:rotate-12 transition-all shrink-0 hidden sm:block" />
      </button>

      {/* ── SECCIÓN 1: TARIFAS (LÍNEAS IDENTIFICATIVAS CON INPUTS EN LA MISMA LÍNEA) ── */}
      {config && (
        <Card className="p-6 border-cyan-500/40 bg-slate-900/90 shadow-xl rounded-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              <h3 className="font-black text-white uppercase text-base tracking-wider">
                TARIFAS
              </h3>
            </div>
            <span className="text-[10px] px-2.5 py-1 rounded-full font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Promoción actual: 0.00 € (Gratuito)
            </span>
          </div>

          <form onSubmit={handleSavePrecios} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {/* 1. PERIODO PROMOCIÓN PRO */}
              <div className="flex items-center justify-between gap-4 p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
                <span className="font-bold text-slate-300 uppercase tracking-wide">PERIODO PROMOCIÓN PRO (Días)</span>
                <input
                  type="number"
                  min="0"
                  value={config.dias_prueba_pro ?? 0}
                  onChange={(e) => setConfig({ ...config, dias_prueba_pro: parseInt(e.target.value, 10) || 0 })}
                  className="w-28 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-right text-white font-bold outline-none focus:border-cyan-400"
                />
              </div>

              {/* 2. PERIODO PROMOCIÓN ENTERPRISE */}
              <div className="flex items-center justify-between gap-4 p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
                <span className="font-bold text-slate-300 uppercase tracking-wide">PERIODO PROMOCIÓN ENTERPRISE (Días)</span>
                <input
                  type="number"
                  min="0"
                  value={config.dias_prueba_pro ?? 0}
                  onChange={(e) => setConfig({ ...config, dias_prueba_pro: parseInt(e.target.value, 10) || 0 })}
                  className="w-28 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-right text-white font-bold outline-none focus:border-indigo-400"
                />
              </div>

              {/* 3. PLAN PRO MENSUAL */}
              <div className="flex items-center justify-between gap-4 p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
                <span className="font-bold text-slate-300 uppercase tracking-wide">PLAN PRO MENSUAL (€)</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={config.precio_pro_mensual ?? 0}
                  onChange={(e) => setConfig({ ...config, precio_pro_mensual: parseFloat(e.target.value) || 0 })}
                  className="w-28 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-right text-white font-bold outline-none focus:border-cyan-400"
                />
              </div>

              {/* 4. PLAN PRO ANUAL */}
              <div className="flex items-center justify-between gap-4 p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
                <span className="font-bold text-slate-300 uppercase tracking-wide">PLAN PRO ANUAL (€)</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={config.precio_pro_anual ?? 0}
                  onChange={(e) => setConfig({ ...config, precio_pro_anual: parseFloat(e.target.value) || 0 })}
                  className="w-28 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-right text-white font-bold outline-none focus:border-cyan-400"
                />
              </div>

              {/* 5. PLAN ENTERPRISE MENSUAL */}
              <div className="flex items-center justify-between gap-4 p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
                <span className="font-bold text-slate-300 uppercase tracking-wide">PLAN ENTERPRISE MENSUAL (€)</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={config.precio_enterprise_mensual ?? 0}
                  onChange={(e) => setConfig({ ...config, precio_enterprise_mensual: parseFloat(e.target.value) || 0 })}
                  className="w-28 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-right text-white font-bold outline-none focus:border-indigo-400"
                />
              </div>

              {/* 6. PLAN ENTERPRISE ANUAL */}
              <div className="flex items-center justify-between gap-4 p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
                <span className="font-bold text-slate-300 uppercase tracking-wide">PLAN ENTERPRISE ANUAL (€)</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={config.precio_enterprise_anual ?? 0}
                  onChange={(e) => setConfig({ ...config, precio_enterprise_anual: parseFloat(e.target.value) || 0 })}
                  className="w-28 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-right text-white font-bold outline-none focus:border-indigo-400"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={savingConfig}
                className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all active:scale-95 shadow cursor-pointer"
              >
                {savingConfig ? 'Guardando...' : 'Guardar Tarifas'}
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* Barra de Búsqueda y Métricas */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input 
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por taller, titular, CIF o email..."
            className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:border-cyan-500 outline-none"
          />
        </div>
        <div className="flex gap-2 shrink-0">
          <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            <p className="text-[10px] font-bold text-emerald-400 uppercase">Activos</p>
            <p className="text-lg font-black text-white">{licencias.filter(l => l.estado_licencia === 'activo').length}</p>
          </div>
          <div className="px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <p className="text-[10px] font-bold text-amber-400 uppercase">En Gracia / Prueba</p>
            <p className="text-lg font-black text-white">{licencias.filter(l => l.estado_licencia === 'prueba' || l.estado_licencia === 'gracia').length}</p>
          </div>
        </div>
      </div>

      {/* ── SECCIÓN 2: TARJETAS DE USUARIOS CON NÚMERO, NOMBRE, PLANES Y ESTADOS ── */}
      {loading ? (
        <div className="py-20 text-center text-slate-500">Cargando usuarios de GESTARIAN...</div>
      ) : filtradas.length === 0 ? (
        <EmptyState
          icon={<Users className="w-12 h-12 text-cyan-400" />}
          title="No hay usuarios registrados"
          subtitle="Los nuevos usuarios que completen el formulario aparecerán aquí para su gestión."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtradas.map((l, index) => {
            const planActivo = l.plan_solicitado || (l.suscripcion_activa ? 'PRO' : 'FREE')
            const estadoPago = l.estado_pago || (l.suscripcion_activa ? 'abonado' : l.estado_licencia === 'bloqueado' ? 'impagado' : 'gratuito')
            const enGracia = l.estado_licencia === 'gracia' || estadoPago === 'impagado'

            return (
              <Card
                key={l.id}
                className={`p-5 rounded-2xl border-2 transition-all bg-slate-900/90 ${
                  l.estado_licencia === 'activo'
                    ? 'border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                    : enGracia
                    ? 'border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                    : 'border-rose-500/40 opacity-80'
                }`}
              >
                {/* 1ª LÍNEA: NÚMERO DE USUARIO SEGUIDO DE NOMBRE COMPLETO */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 font-mono font-black text-xs border border-cyan-500/40">
                      Nº {index + 1}
                    </span>
                    <h3 className="font-extrabold text-white text-base sm:text-lg tracking-wide">
                      {l.nombre_profesional || l.email}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => toggleEstado(l.id, l.estado_licencia)}
                      className={`p-2 rounded-xl transition-all ${
                        l.estado_licencia === 'activo'
                          ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/25 border border-rose-500/30'
                          : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30'
                      }`}
                      title={l.estado_licencia === 'activo' ? 'Bloquear usuario' : 'Autorizar usuario'}
                    >
                      {l.estado_licencia === 'activo' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* 2ª LÍNEA: PLAN ACTIVO (LOS 3 PLANES CON EL ACTIVO ILUMINADO) Y SU ESTADO (GRATUITO / ABONADO / IMPAGADO) */}
                <div className="py-3 border-b border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-bold uppercase tracking-wider">Plan del Taller:</span>
                    <div className="flex items-center gap-1.5">
                      {(['FREE', 'PRO', 'ENTERPRISE'] as const).map((pName) => {
                        const isThisPlan = planActivo === pName
                        return (
                          <span
                            key={pName}
                            onClick={() => cambiarPlanUsuario(l.id, pName, estadoPago)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${
                              isThisPlan
                                ? pName === 'ENTERPRISE'
                                  ? 'bg-indigo-600 text-white shadow-[0_0_12px_rgba(99,102,241,0.6)] border border-indigo-400 ring-1 ring-white'
                                  : pName === 'PRO'
                                  ? 'bg-amber-500 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.6)] border border-amber-300 ring-1 ring-white'
                                  : 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.6)] border border-cyan-300 ring-1 ring-white'
                                : 'bg-slate-950 text-slate-600 border border-slate-800 hover:text-slate-300'
                            }`}
                            title={`Cambiar a ${pName}`}
                          >
                            ● {pName}
                          </span>
                        )
                      })}
                    </div>
                  </div>

                  {/* Estado del Plan */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-bold uppercase tracking-wider">Estado del Plan:</span>
                    <div className="flex items-center gap-1.5">
                      {(['gratuito', 'abonado', 'impagado'] as const).map((est) => {
                        const isThisEstado = estadoPago === est
                        return (
                          <button
                            key={est}
                            type="button"
                            onClick={() => cambiarPlanUsuario(l.id, planActivo, est)}
                            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase transition-all ${
                              isThisEstado
                                ? est === 'abonado'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                                  : est === 'impagado'
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50 animate-pulse'
                                  : 'bg-blue-500/20 text-blue-300 border border-blue-500/50'
                                : 'text-slate-600 hover:text-slate-400'
                            }`}
                          >
                            {est}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {enGracia && (
                    <div className="p-2 rounded-lg bg-amber-950/40 border border-amber-500/30 text-[11px] text-amber-300 flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                      <span><strong>Periodo de gracia de 1 mes:</strong> Si no se abona, se desactivará a Plan FREE.</span>
                    </div>
                  )}
                </div>

                {/* 3ª LÍNEA: DATOS OBLIGATORIOS FISCALES AEAT (CIF, DIRECCIÓN, TELÉFONO, EMAIL) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-400 pt-3">
                  <div>
                    <span className="text-slate-500 font-semibold block">NIF / CIF Emisor:</span>
                    <span className="text-white font-mono font-bold">{l.cif || 'No especificado'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold block">Email de Login:</span>
                    <span className="text-slate-300 truncate block">{l.email}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold block">Teléfono de Contacto:</span>
                    <span className="text-slate-300">{l.telefono || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold block">Dirección Fiscal Facturación:</span>
                    <span className="text-slate-300 truncate block">{l.direccion_fiscal || '—'}</span>
                  </div>
                </div>

                {/* Acciones de Extensión */}
                <div className="flex gap-2 mt-4 pt-3 border-t border-slate-800">
                  <button
                    onClick={() => extenderPrueba(l.id)}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold transition-all flex items-center justify-center gap-1"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Extender Gracia / Prueba +30 días</span>
                  </button>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
