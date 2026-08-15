import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  Calendar, Wrench, FileText, Users,
  Clock, CheckCircle2, AlertCircle, Euro, ArrowRight,
  CarFront, BarChart3, FolderOpen
} from 'lucide-react'

import { useGestures } from '../hooks/useGestures'
import { useClima } from '../hooks/useClima'
import { IntroAnimation } from '../components/IntroAnimation'
import { PanelControlHeader } from '../components/PanelControlHeader'
import { MetisAlertsSection } from '../components/MetisAlertsSection'

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

  const [showIntro, setShowIntro] = useState(!sessionStorage.getItem('gestarian_intro_shown'))
  const [introState, setIntroState] = useState<'start' | 'grow' | 'fadeOut'>('start')

  const [showPanels, setShowPanels] = useState(false)
  const [isFadingOut, setIsFadingOut] = useState(false)
  const [mostrarAvisos, setMostrarAvisos] = useState(false)

  const [panelReady, setPanelReady] = useState(false)
  const panelReadyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
    const t = setInterval(() => setHora(new Date()), 30000)
    return () => clearInterval(t)
  }, [])

  const handleAppStart = (e?: React.MouseEvent | React.TouchEvent) => {
    const target = e?.target as HTMLElement
    if (target?.closest('button') || target?.closest('a')) return

    const docEl = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => Promise<void>; msRequestFullscreen?: () => Promise<void> }
    const requestFs = docEl.requestFullscreen || docEl.webkitRequestFullscreen || docEl.msRequestFullscreen
    if (requestFs && !document.fullscreenElement) requestFs.call(docEl).catch(() => {})

    if (showIntro) {
      sessionStorage.setItem('gestarian_intro_shown', 'true')
      setIntroState('fadeOut')
      setTimeout(() => setShowIntro(false), 500)
    }
  }

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (window.innerHeight - e.clientY <= 100) return
    if (!showPanels && !isFadingOut) setShowPanels(true)
  }

  useEffect(() => {
    if (sessionStorage.getItem('gestarian_intro_shown')) return
    const t1 = setTimeout(() => setIntroState('grow'), 50)
    const t2 = setTimeout(() => setIntroState('fadeOut'), 1500)
    const t3 = setTimeout(() => { sessionStorage.setItem('gestarian_intro_shown', 'true'); setShowIntro(false) }, 2000)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

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
      <IntroAnimation showIntro={showIntro} introState={introState} />

      <div className={`transition-opacity duration-500 ease-in-out ${showIntro ? 'opacity-0' : 'opacity-100'}`}>
        <PanelControlHeader
          showPanels={showPanels} isFadingOut={isFadingOut} hora={hora} tempActual={tempActual}
          cargandoClima={cargandoClima} tempColor={tempColor} totalAvisos={totalAvisos}
          mostrarAvisos={mostrarAvisos} setMostrarAvisos={setMostrarAvisos} touchSelectable={panelInteractable}
        />

        {showPanels && (
          <div
            className={`relative z-10 space-y-6 pt-[130px] transition-opacity duration-500 ease-in-out
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
                          <p className="text-sm font-medium text-white truncate">{cita.cliente?.nombre ?? 'Cliente desconocido'}</p>
                          <p className="text-xs text-white/40 truncate">{cita.vehiculo?.matricula ?? '—'}</p>
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
                          <p className="text-sm font-semibold text-white">{rep.vehiculo?.matricula ?? '—'}</p>
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
