import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  Calendar, Wrench, FileText, Users,
  Clock, CheckCircle2, AlertCircle, Euro, ArrowRight,
  CarFront, BarChart3, FolderOpen, Send, X, Loader2
} from 'lucide-react'

import { useGestures } from '../hooks/useGestures'
import { useClima } from '../hooks/useClima'
import { PanelControlHeader } from '../components/PanelControlHeader'
import { MetisAlertsSection } from '../components/MetisAlertsSection'
import { MatriculaBadge } from '../components/UI'
import { CronFiscalService, CronEvent } from '../lib/cronFiscalService'
import { enviarTrimestreGestoriaAutomático } from '../services/gestoriaExportService'
import { useToast } from '../lib/ToastContext'
import { playSuccessChime } from '../lib/sound'

interface KPIs {
  ingresosTrimestre: number; ingresosMes: number; citasHoy: number;
  citasPendientesHoy: number; reparacionesEnProceso: number;
  presupuestosPendientes: number; facturasPendienteCobro: number; totalClientes: number;
}
interface CitaHoy {
  id: string; hora: string | null; vehiculo: { matricula: string } | null; cliente: { nombre: string } | null; estado: string;
}
interface ReparacionActiva {
  id: string; vehiculo: { matricula: string; marca: string | null; modelo: string | null } | null; cliente: { nombre: string } | null; created_at: string;
}

function formatEuros(n: number) { return n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }) }
function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
  if (diff < 60) return `hace ${diff}m`
  if (diff < 1440) return `hace ${Math.floor(diff / 60)}h`
  return `hace ${Math.floor(diff / 1440)}d`
}
function computeBaseIVA(conceptos: any[]): { base: number } {
  return { base: conceptos.reduce((s, c) => s + (c.cantidad || 0) * (c.precio || 0), 0) }
}

const PANEL_READY_DELAY = 500

export function InicioPage() {
  const navigate = useNavigate()
  const [kpis, setKpis] = useState<KPIs>({
    ingresosTrimestre: 0, ingresosMes: 0, citasHoy: 0, citasPendientesHoy: 0,
    reparacionesEnProceso: 0, presupuestosPendientes: 0, facturasPendienteCobro: 0, totalClientes: 0,
  })
  const [citasHoy, setCitasHoy] = useState<CitaHoy[]>([])
  const [reparacionesActivas, setReparacionesActivas] = useState<ReparacionActiva[]>([])
  const [loading, setLoading] = useState(true)
  const [hora, setHora] = useState(new Date())

  const [showPanels, setShowPanels] = useState(false)
  const [isFadingOut, setIsFadingOut] = useState(false)
  const [mostrarAvisos, setMostrarAvisos] = useState(false)

  const [panelReady, setPanelReady] = useState(false)
  const panelReadyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { showToast } = useToast()

  const [avisoFiscal, setAvisoFiscal] = useState<CronEvent | null>(null)
  const [enviandoTrimestre, setEnviandoTrimestre] = useState(false)

  useEffect(() => {
    // Comprobar si hay un aviso fiscal activo hoy
    const evento = CronFiscalService.checkCurrentDate()
    if (evento) {
      const avisoId = CronFiscalService.getAvisoId(evento.tipo)
      const descartadoSesion = sessionStorage.getItem(`aviso_descartado_${avisoId}`)
      if (!descartadoSesion) {
        setAvisoFiscal(evento)
      }
    }
  }, [])

  const handleCerrarAvisoFiscal = () => {
    if (avisoFiscal) {
      const avisoId = CronFiscalService.getAvisoId(avisoFiscal.tipo)
      sessionStorage.setItem(`aviso_descartado_${avisoId}`, 'true')
    }
    setAvisoFiscal(null)
  }

  const handleEnviarTrimestreManual = async () => {
    if (enviandoTrimestre) return
    setEnviandoTrimestre(true)
    try {
      const exito = await enviarTrimestreGestoriaAutomático()
      if (exito) {
        if (avisoFiscal) {
          const avisoId = CronFiscalService.getAvisoId(avisoFiscal.tipo)
          CronFiscalService.markAsDone(avisoId)
        }
        playSuccessChime()
        showToast("INFORME TRIMESTRAL ENVIADO CON ÉXITO A GESTORÍA", 'success')
        setAvisoFiscal(null)
      } else {
        showToast("Error al enviar el informe. Verifique la configuración de email de gestoría.", 'error')
      }
    } catch (e) {
      showToast("Error al procesar el envío trimestral", 'error')
    } finally {
      setEnviandoTrimestre(false)
    }
  }

  useEffect(() => {
    if (panelReadyTimerRef.current) clearTimeout(panelReadyTimerRef.current)
    if (showPanels && !isFadingOut) {
      panelReadyTimerRef.current = setTimeout(() => {
        setPanelReady(true)
      }, PANEL_READY_DELAY)
    } else {
      setPanelReady(false)
    }
    return () => {
      if (panelReadyTimerRef.current) clearTimeout(panelReadyTimerRef.current)
    }
  }, [showPanels, isFadingOut])

  const panelInteractable = panelReady && showPanels && !isFadingOut

  const { temperatura, cargandoClima } = useClima()
  const { offsetX, isAnimating } = useGestures({ showPanels, setShowPanels, isFadingOut, setIsFadingOut })

  useEffect(() => {
    const t = setInterval(() => setHora(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const handleAppStart = (e?: React.MouseEvent | React.TouchEvent) => {
    const target = e?.target as HTMLElement
    if (target?.closest('button') || target?.closest('a')) return

    const docEl = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => Promise<void>; msRequestFullscreen?: () => Promise<void> }
    const requestFs = docEl.requestFullscreen || docEl.webkitRequestFullscreen || docEl.msRequestFullscreen
    if (requestFs && !document.fullscreenElement) requestFs.call(docEl).catch(() => {})
  }

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (window.innerHeight - e.clientY <= 100) return
    if (!showPanels && !isFadingOut) setShowPanels(true)
  }

  useEffect(() => {
    async function load() {
      const hoy = new Date().toISOString().slice(0, 10)
      const primeroDeMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)
      const now = new Date()
      const year = now.getFullYear()
      const q = Math.floor(now.getMonth() / 3) + 1
      const startMonth = (q - 1) * 3 + 1
      const endMonth = q * 3
      const endDay = new Date(year, endMonth, 0).getDate()
      const trimStart = `${year}-${String(startMonth).padStart(2, '0')}-01`
      const trimEnd = `${year}-${String(endMonth).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`

      const [
        , { data: facturasTrimestreData }, { data: facturasMes }, { data: citasHoyData },
        { data: repsActivas }, { data: presusPendientes }, { data: facturasCobro }, { count: totalClientes },
      ] = await Promise.all([
        supabase.from('configuracion').select('nombre_empresa').eq('id', 1).maybeSingle(),
        supabase.from('facturas').select('total, conceptos').gte('fecha', trimStart).lte('fecha', trimEnd),
        supabase.from('facturas').select('total').gte('fecha', primeroDeMes),
        supabase.from('citas').select('id, hora, estado, vehiculos:vehiculo_id (matricula), clientes:cliente_id (nombre)').eq('fecha', hoy).order('hora'),
        supabase.from('reparaciones').select('id, created_at, vehiculos:vehiculo_id (matricula, marca, modelo), clientes:cliente_id (nombre)').eq('estado', 'en_proceso').order('created_at', { ascending: false }).limit(5),
        supabase.from('presupuestos').select('id').eq('estado', 'pendiente'),
        supabase.from('facturas').select('id').eq('estado_cobro', 'pendiente'),
        supabase.from('clientes').select('id', { count: 'exact', head: true }),
      ])

      const sumTrimestre = facturasTrimestreData?.reduce((s, f) => s + (computeBaseIVA(f.conceptos ?? []).base || f.total || 0), 0) ?? 0
      const sumMes = facturasMes?.reduce((s, f) => s + (f.total || 0), 0) ?? 0
      const citasArr = (citasHoyData || []) as any[]
      setCitasHoy(citasArr.map(c => ({ id: c.id, hora: c.hora, estado: c.estado, vehiculo: c.vehiculos ?? null, cliente: c.clientes ?? null })))
      const repsArr = (repsActivas || []) as any[]
      setReparacionesActivas(repsArr.map(r => ({ id: r.id, created_at: r.created_at, vehiculo: r.vehiculos ?? null, cliente: r.clientes ?? null })))

      setKpis({
        ingresosTrimestre: sumTrimestre, ingresosMes: sumMes, citasHoy: citasArr.length,
        citasPendientesHoy: citasArr.filter(c => c.estado === 'pendiente' || c.estado === 'confirmada').length,
        reparacionesEnProceso: repsArr.length, presupuestosPendientes: presusPendientes?.length ?? 0,
        facturasPendienteCobro: facturasCobro?.length ?? 0, totalClientes: totalClientes ?? 0,
      })
      setLoading(false)
    }
    load()
  }, [])

  const totalAvisos = kpis.presupuestosPendientes + kpis.facturasPendienteCobro + kpis.citasPendientesHoy
  const tempActual = temperatura ?? 22
  const tempColor = tempActual < 18 ? 'text-blue-400' : tempActual <= 30 ? 'text-emerald-400' : tempActual <= 35 ? 'text-orange-400' : 'text-red-400'

  return (
    <div
      className="w-full min-h-screen pb-24 relative overflow-x-hidden touch-pan-y"
      onClick={handleAppStart}
      onDoubleClick={handleDoubleClick}
      style={{
        transform: `translateX(${offsetX}px)`,
        transition: isAnimating ? 'transform 0.28s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'none',
        willChange: 'transform',
        backfaceVisibility: 'hidden',
      }}
    >
      <div>
        <PanelControlHeader
          showPanels={showPanels} isFadingOut={isFadingOut} hora={hora} tempActual={tempActual}
          cargandoClima={cargandoClima} tempColor={tempColor} totalAvisos={totalAvisos}
          mostrarAvisos={mostrarAvisos} setMostrarAvisos={setMostrarAvisos} touchSelectable={panelInteractable}
        />

        {/* Reloj Digital Permanente en Pantalla de Inicio (Tipografía calculadora, color blanco amarillento, peso alto) */}
        <div className="relative z-10 w-full max-w-4xl mx-auto pt-[130px] flex flex-col items-center justify-center select-none px-4">
          <div
            className="font-black tracking-widest tabular-nums leading-none text-6xl sm:text-8xl md:text-9xl text-center"
            style={{
              fontFamily: "'Share Tech Mono', 'Orbitron', 'Courier New', monospace, system-ui",
              fontWeight: 900,
              color: '#fffde7', // Blanco amarillento cálido (calculadora LCD backlight)
              textShadow: '0 0 25px rgba(254, 240, 138, 0.8), 0 0 50px rgba(253, 224, 71, 0.5), 0 0 80px rgba(234, 179, 8, 0.3)'
            }}
          >
            {hora.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
        </div>

        {showPanels && (
          <div
            className={`relative z-10 space-y-6 pt-4 transition-opacity duration-500 ease-in-out
              ${isFadingOut ? 'opacity-0' : 'opacity-100'}
              ${!panelInteractable ? 'pointer-events-none select-none' : 'pointer-events-auto'}
            `}
          >
            <div className="w-full max-w-4xl mx-auto">
              <MetisAlertsSection
                mostrarAvisos={mostrarAvisos} totalAvisos={totalAvisos} touchSelectable={panelInteractable}
                presupuestosPendientes={kpis.presupuestosPendientes} facturasPendienteCobro={kpis.facturasPendienteCobro}
                totalClientes={kpis.totalClientes} navigate={navigate}
              />

              {/* Acceso rápido */}
              <div className="px-2 sm:px-4">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-white/50 mb-3">Acceso rápido</h2>
                
                {/* Botón Expedientes a todo lo ancho */}
                <button
                  onClick={() => navigate('/expedientes')}
                  disabled={!panelInteractable}
                  className="w-full flex items-center justify-center gap-3 px-4 py-4 mb-3 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] border border-pink-500/60 border-[2px] backdrop-blur-md text-center"
                  style={{ backgroundColor: 'rgba(236, 72, 153, 0.45)' }}
                >
                  <FolderOpen className="w-8 h-8 flex-shrink-0 drop-shadow-[0_0_8px_currentColor] text-pink-400" />
                  <span className="text-[1.2em] font-semibold text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">Expedientes</span>
                </button>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { icon: Users, label: 'Clientes', path: '/clientes', border: 'border-cyan-500/60 border-[2px]', iconColor: 'text-cyan-400', bg: 'rgba(8, 145, 178, 0.45)' },
                    { icon: FileText, label: 'Presupuestos', path: '/presupuestos', border: 'border-violet-500/60 border-[2px]', iconColor: 'text-violet-300', bg: 'rgba(109, 40, 217, 0.45)' },
                    { icon: Calendar, label: 'Citas', path: '/citas', border: 'border-blue-500/60 border-[2px]', iconColor: 'text-blue-300', bg: 'rgba(29, 78, 216, 0.45)' },
                    { icon: Wrench, label: 'Reparaciones', path: '/reparaciones', border: 'border-amber-500/60 border-[2px]', iconColor: 'text-amber-300', bg: 'rgba(180, 83, 9, 0.45)' },
                  ].map(({ icon: Icon, label, path, border, iconColor, bg }) => (
                    <button
                      key={path}
                      onClick={() => navigate(path)}
                      disabled={!panelInteractable}
                      className={`flex flex-col items-center justify-center gap-2 px-4 py-4 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] ${border} backdrop-blur-md text-center`}
                      style={{ backgroundColor: bg }}
                    >
                      <div className="text-[1.5em] leading-none mb-1">
                        <Icon className={`w-8 h-8 flex-shrink-0 drop-shadow-[0_0_8px_currentColor] ${iconColor}`} />
                      </div>
                      <span className="text-[1.2em] font-semibold text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Citas y Reparaciones */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 px-2 sm:px-4 mt-6">
                <div className="backdrop-blur-md rounded-2xl border border-blue-500/60 border-[2px] overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.4)]" style={{ backgroundColor: 'rgba(15, 23, 42, 0.75)' }}>
                  <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-400" />
                      <span className="font-semibold text-sm text-white">Citas de hoy</span>
                    </div>
                    <button
                      onClick={() => navigate('/citas')}
                      disabled={!panelInteractable}
                      className="text-xs text-white/50 hover:text-white transition flex items-center gap-1"
                    >
                      Ver todas <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="divide-y divide-white/5">
                    {loading ? (
                      <div className="p-4 text-center text-white/30 text-sm">Cargando…</div>
                    ) : citasHoy.length === 0 ? (
                      <div className="p-6 text-center text-white/30 text-sm">
                        <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        Sin citas programadas para hoy
                      </div>
                    ) : citasHoy.map(cita => (
                      <div
                        key={cita.id}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition cursor-pointer"
                        onClick={() => panelInteractable && navigate('/citas')}
                      >
                        <div className="flex-shrink-0">
                          {cita.estado === 'completada'
                            ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            : cita.estado === 'cancelada'
                              ? <AlertCircle className="w-4 h-4 text-red-400" />
                              : <Clock className="w-4 h-4 text-blue-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate mb-1">{cita.cliente?.nombre ?? 'Cliente desconocido'}</p>
                          <MatriculaBadge matricula={cita.vehiculo?.matricula} />
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-mono text-white/70">{cita.hora?.slice(0, 5) ?? '—'}</p>
                          <EstadoBadge estado={cita.estado} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="backdrop-blur-md rounded-2xl border border-emerald-600/60 border-[2px] overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.4)]" style={{ backgroundColor: 'rgba(6, 78, 59, 0.75)' }}>
                  <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-amber-400" />
                      <span className="font-semibold text-sm text-white">Vehículos en taller</span>
                    </div>
                    <button
                      onClick={() => navigate('/reparaciones')}
                      disabled={!panelInteractable}
                      className="text-xs text-white/50 hover:text-white transition flex items-center gap-1"
                    >
                      Ver todas <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="divide-y divide-white/5">
                    {loading ? (
                      <div className="p-4 text-center text-white/30 text-sm">Cargando…</div>
                    ) : reparacionesActivas.length === 0 ? (
                      <div className="p-6 text-center text-white/30 text-sm">
                        <CarFront className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        No hay vehículos en taller ahora mismo
                      </div>
                    ) : reparacionesActivas.map(rep => (
                      <div
                        key={rep.id}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition cursor-pointer"
                        onClick={() => panelInteractable && navigate('/reparaciones')}
                      >
                        <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/40 border-[2px] flex items-center justify-center">
                          <CarFront className="w-4 h-4 text-amber-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="mb-1">
                            <MatriculaBadge matricula={rep.vehiculo?.matricula} />
                          </div>
                          <p className="text-xs text-white/40 truncate">{[rep.vehiculo?.marca, rep.vehiculo?.modelo].filter(Boolean).join(' ') || 'Sin datos'}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs text-white/30">{timeAgo(rep.created_at)}</p>
                          <p className="text-xs text-white/60 truncate max-w-[100px]">{rep.cliente?.nombre}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-2 gap-3 px-2 sm:px-4 mt-6">
                <KpiCard
                  icon={<Euro className="w-5 h-5" />}
                  label="Ingresos Trimestre"
                  value={loading ? '…' : formatEuros(kpis.ingresosTrimestre)}
                  sub="trimestre en curso"
                  border="border-rose-600/60 border-[2px]"
                  iconColor="text-emerald-400"
                  bg="rgba(159, 18, 57, 0.65)"
                  disabled={!panelInteractable}
                  onClick={() => navigate('/balances')}
                />
                <KpiCard
                  icon={<BarChart3 className="w-5 h-5" />}
                  label="Ingresos del mes"
                  value={loading ? '…' : formatEuros(kpis.ingresosMes)}
                  sub="total facturado"
                  border="border-purple-600/60 border-[2px]"
                  iconColor="text-violet-300"
                  bg="rgba(88, 28, 135, 0.65)"
                  disabled={!panelInteractable}
                  onClick={() => navigate('/balances')}
                />
              </div>

            </div>
          </div>
        )}

        {/* ── MODAL / TARJETA FLOTANTE DE AVISO TRIMESTRAL (METIS CRON FISCAL) ── */}
        {avisoFiscal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="w-full max-w-lg bg-slate-950/95 border-2 border-cyan-500/70 rounded-3xl p-6 sm:p-7 shadow-[0_0_35px_rgba(6,182,212,0.3)] space-y-5 text-white relative">
              {/* Botón cerrar esquina superior */}
              <button
                onClick={handleCerrarAvisoFiscal}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-900 border border-slate-700 hover:border-cyan-400 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Cerrar aviso"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
                  <AlertCircle className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-black uppercase tracking-wider text-white">
                    AVISO DE CIERRE TRIMESTRAL
                  </h3>
                  <p className="text-xs text-cyan-300 font-bold uppercase tracking-wider">
                    CALENDARIO FISCAL GESTARIAN · METIS
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-slate-200 text-sm leading-relaxed shadow-inner">
                {avisoFiscal.mensaje}
              </div>

              {/* Botonera de acciones */}
              <div className="space-y-2.5 pt-2 border-t border-slate-800">
                {avisoFiscal.permiteEnvioAnticipado && (
                  <button
                    disabled={enviandoTrimestre}
                    onClick={handleEnviarTrimestreManual}
                    className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    {enviandoTrimestre ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>ENVIANDO INFORME A GESTORÍA...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        <span>ENVIAR INFORME TRIMESTRAL A GESTORIA</span>
                      </>
                    )}
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleCerrarAvisoFiscal}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs sm:text-sm uppercase tracking-wider border border-slate-700 hover:border-slate-500 transition-all cursor-pointer text-center"
                >
                  CANCELAR
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function KpiCard({
  icon, label, value, sub, border, iconColor, bg, disabled, onClick
}: {
  icon: React.ReactNode; label: string; value: string; sub: string;
  border: string; iconColor: string; bg: string; disabled?: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-2xl p-4 text-left border ${border} hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 w-full group backdrop-blur-md`}
      style={{ backgroundColor: bg }}
    >
      <div className={`${iconColor} mb-3 opacity-90 group-hover:opacity-100 transition drop-shadow-[0_0_8px_currentColor]`} suppressHydrationWarning>
        {icon}
      </div>
      <div className="text-2xl font-bold text-white tabular-nums leading-tight mb-1 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">{value}</div>
      <div className="text-xs font-semibold text-white/80 leading-tight">{label}</div>
      <div className="text-xs text-white/40 mt-0.5 leading-tight">{sub}</div>
    </button>
  )
}

function EstadoBadge({ estado }: { estado: string }) {
  const map: Record<string, string> = { pendiente: 'text-amber-400', confirmada: 'text-blue-400', completada: 'text-emerald-400', cancelada: 'text-red-400' }
  const labels: Record<string, string> = { pendiente: 'Pendiente', confirmada: 'Confirmada', completada: 'Completada', cancelada: 'Cancelada' }
  return <span className={`text-xs font-medium ${map[estado] ?? 'text-white/40'}`}>{labels[estado] ?? estado}</span>
}
