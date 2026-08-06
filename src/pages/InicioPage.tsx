import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  TrendingUp, Calendar, Wrench, FileText, Users,
  Clock, CheckCircle2, AlertCircle, Euro, ArrowRight,
  CarFront, BarChart3, Activity, Triangle, Camera
} from 'lucide-react'

interface KPIs {
  ingresosHoy: number
  ingresosMes: number
  citasHoy: number
  citasPendientesHoy: number
  reparacionesEnProceso: number
  presupuestosPendientes: number
  facturasPendienteCobro: number
  totalClientes: number
}

interface CitaHoy {
  id: string
  hora: string | null
  vehiculo: { matricula: string } | null
  cliente: { nombre: string } | null
  estado: string
}

interface ReparacionActiva {
  id: string
  vehiculo: { matricula: string; marca: string | null; modelo: string | null } | null
  cliente: { nombre: string } | null
  created_at: string
}

function formatEuros(n: number) {
  return n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
  if (diff < 60) return `hace ${diff}m`
  if (diff < 1440) return `hace ${Math.floor(diff / 60)}h`
  return `hace ${Math.floor(diff / 1440)}d`
}

export function InicioPage() {
  const navigate = useNavigate()
  const [kpis, setKpis] = useState<KPIs>({
    ingresosHoy: 0, ingresosMes: 0, citasHoy: 0,
    citasPendientesHoy: 0, reparacionesEnProceso: 0,
    presupuestosPendientes: 0, facturasPendienteCobro: 0,
    totalClientes: 0,
  })
  const [citasHoy, setCitasHoy] = useState<CitaHoy[]>([])
  const [reparacionesActivas, setReparacionesActivas] = useState<ReparacionActiva[]>([])
  const [loading, setLoading] = useState(true)
  const [empresa, setEmpresa] = useState<string>('GESTARIAN')
  const [hora, setHora] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setHora(new Date()), 30000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    async function load() {
      const hoy = new Date().toISOString().slice(0, 10)
      const primeroDeMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)

      const [
        { data: config },
        { data: facturasHoy },
        { data: facturasMes },
        { data: citasHoyData },
        { data: repsActivas },
        { data: presusPendientes },
        { data: facturasCobro },
        { count: totalClientes },
      ] = await Promise.all([
        supabase.from('configuracion').select('nombre_empresa').eq('id', 1).maybeSingle(),
        supabase.from('facturas').select('total').eq('fecha', hoy),
        supabase.from('facturas').select('total').gte('fecha', primeroDeMes),
        supabase.from('citas').select('id, hora, estado, vehiculos:vehiculo_id (matricula), clientes:cliente_id (nombre)').eq('fecha', hoy).order('hora'),
        supabase.from('reparaciones').select('id, created_at, vehiculos:vehiculo_id (matricula, marca, modelo), clientes:cliente_id (nombre)').eq('estado', 'en_proceso').order('created_at', { ascending: false }).limit(5),
        supabase.from('presupuestos').select('id').eq('estado', 'pendiente'),
        supabase.from('facturas').select('id').eq('estado_cobro', 'pendiente'),
        supabase.from('clientes').select('id', { count: 'exact', head: true }),
      ])

      if (config?.nombre_empresa) setEmpresa(config.nombre_empresa)

      const sumHoy = facturasHoy?.reduce((s, f) => s + (f.total || 0), 0) ?? 0
      const sumMes = facturasMes?.reduce((s, f) => s + (f.total || 0), 0) ?? 0

      const citasArr = (citasHoyData || []) as any[]
      setCitasHoy(citasArr.map(c => ({
        id: c.id, hora: c.hora, estado: c.estado,
        vehiculo: c.vehiculos ?? null,
        cliente: c.clientes ?? null,
      })))

      const repsArr = (repsActivas || []) as any[]
      setReparacionesActivas(repsArr.map(r => ({
        id: r.id, created_at: r.created_at,
        vehiculo: r.vehiculos ?? null,
        cliente: r.clientes ?? null,
      })))

      setKpis({
        ingresosHoy: sumHoy,
        ingresosMes: sumMes,
        citasHoy: citasArr.length,
        citasPendientesHoy: citasArr.filter(c => c.estado === 'pendiente' || c.estado === 'confirmada').length,
        reparacionesEnProceso: repsArr.length,
        presupuestosPendientes: presusPendientes?.length ?? 0,
        facturasPendienteCobro: facturasCobro?.length ?? 0,
        totalClientes: totalClientes ?? 0,
      })
      setLoading(false)
    }
    load()
  }, [])

  const totalAvisos = kpis.presupuestosPendientes + kpis.facturasPendienteCobro + kpis.citasPendientesHoy
  const [mostrarAvisos, setMostrarAvisos] = useState(false)
  const [showPanel, setShowPanel] = useState(false)

  useEffect(() => {
    let startY = 0
    let accumulatedWheel = 0

    const handleTouchStart = (e: TouchEvent) => { 
      startY = e.touches[0].clientY 
    }
    const handleTouchMove = (e: TouchEvent) => {
      const diff = e.touches[0].clientY - startY
      if (diff < -30) {
        setShowPanel(true)
      } else if (diff > window.innerHeight / 2 && window.scrollY <= 0) {
        setShowPanel(false)
      }
    }
    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY > 0) {
        accumulatedWheel = 0
        setShowPanel(true)
      } else if (e.deltaY < 0 && window.scrollY <= 0) {
        accumulatedWheel -= e.deltaY
        if (accumulatedWheel > window.innerHeight / 2) {
          setShowPanel(false)
          accumulatedWheel = 0
        }
      }
    }

    window.addEventListener('touchstart', handleTouchStart)
    window.addEventListener('touchmove', handleTouchMove)
    window.addEventListener('wheel', handleWheel)

    return () => {
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('wheel', handleWheel)
    }
  }, [])

  const horaStr = hora.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  const fechaStr = hora.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <>
      <div className={`fixed inset-0 bg-black transition-opacity duration-700 pointer-events-none z-0 ${showPanel ? 'opacity-20' : 'opacity-0'}`} />
      
      <div className={`relative z-10 space-y-6 pb-24 transition-all duration-700 transform ${showPanel ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>

      {/* CABECERA */}
      <div className="gestarian-glass gestarian-metis-card rounded-2xl p-5 border border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Activity className="w-5 h-5 text-violet-400 drop-shadow-[0_0_10px_rgba(167,139,250,0.8)]" />
            <span className="text-xs font-medium uppercase tracking-widest text-white/50">Panel de Control</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">{empresa}</h1>
          <p className="text-sm text-white/50 capitalize mt-0.5">{fechaStr}</p>
        </div>

        <div className="flex items-center gap-4 justify-between sm:justify-end">
          {/* BOTÓN AVISOS METIS - MÓVIL / PORTRAIT (CIRCULAR CON TRIÁNGULO) */}
          <button
            onClick={() => setMostrarAvisos(!mostrarAvisos)}
            className={`lg:hidden w-11 h-11 rounded-full flex items-center justify-center border transition-all duration-300 shrink-0 ${
              totalAvisos > 0
                ? 'bg-orange-500/20 border-orange-500/60 text-orange-400 shadow-[0_0_20px_rgba(167,139,250,0.5)] hover:shadow-[0_0_30px_rgba(167,139,250,0.7)]'
                : 'bg-emerald-500/20 border-emerald-500/60 text-emerald-400 shadow-[0_0_20px_rgba(167,139,250,0.5)] hover:shadow-[0_0_30px_rgba(167,139,250,0.7)]'
            }`}
            title={mostrarAvisos ? "Ocultar Avisos METIS" : "Mostrar Avisos METIS"}
          >
            <Triangle className={`w-5 h-5 fill-current ${mostrarAvisos ? 'rotate-180' : ''} drop-shadow-[0_0_10px_rgba(167,139,250,0.8)]`} />
          </button>

          {/* BOTÓN AVISOS METIS - PC / LANDSCAPE (RECTANGULAR) */}
          <button
            onClick={() => setMostrarAvisos(!mostrarAvisos)}
            className={`hidden lg:flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all duration-200 shrink-0 ${
              totalAvisos > 0
                ? 'bg-orange-500/20 text-orange-400 border-orange-500/40 hover:bg-orange-500/30'
                : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30'
            }`}
          >
            <Triangle className={`w-3.5 h-3.5 fill-current transition-transform duration-200 ${mostrarAvisos ? 'rotate-180' : ''}`} />
            <span>{mostrarAvisos ? 'Ocultar Avisos METIS' : `Avisos METIS (${totalAvisos})`}</span>
          </button>

          <div className="text-right">
              <div className="text-4xl font-bold text-white tabular-nums">{horaStr}</div>
            <div className="text-xs text-white/40 mt-1 flex items-center justify-end gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
              Sistema activo
            </div>
          </div>
        </div>
      </div>

      {/* Quick access card removed as requested */}

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          icon={<Euro className="w-5 h-5" />}
          label="Ingresos hoy"
          value={loading ? '…' : formatEuros(kpis.ingresosHoy)}
          sub="facturas emitidas hoy"
          color="from-emerald-500/80 to-emerald-500/70"
          border="border-emerald-500/30"
          iconColor="text-emerald-400"
          onClick={() => navigate('/facturas')}
        />
        <KpiCard
          icon={<BarChart3 className="w-5 h-5" />}
          label="Ingresos del mes"
          value={loading ? '…' : formatEuros(kpis.ingresosMes)}
          sub="total facturado"
          color="from-violet-500/80 to-violet-500/70"
          border="border-violet-500/30"
          iconColor="text-violet-400"
          onClick={() => navigate('/balances')}
        />
        <KpiCard
          icon={<Calendar className="w-5 h-5" />}
          label="Citas hoy"
          value={loading ? '…' : String(kpis.citasHoy)}
          sub={`${kpis.citasPendientesHoy} pendientes`}
          color="from-blue-500/80 to-blue-500/70"
          border="border-blue-500/30"
          iconColor="text-blue-400"
          onClick={() => navigate('/citas')}
        />
        <KpiCard
          icon={<Wrench className="w-5 h-5" />}
          label="En taller"
          value={loading ? '…' : String(kpis.reparacionesEnProceso)}
          sub="reparaciones activas"
          color="from-amber-500/80 to-amber-500/70"
          border="border-amber-500/30"
          iconColor="text-amber-400"
          onClick={() => navigate('/reparaciones')}
        />
      </div>

      {/* AVISOS Y ALERTAS METIS (DESPLEGABLES) */}
      {mostrarAvisos && (
        <div className="gestarian-glass gestarian-metis-card rounded-2xl p-4 border border-white/100 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Triangle className={`w-4 h-4 fill-current ${totalAvisos > 0 ? 'text-orange-400' : 'text-emerald-400'}`} />
              <h3 className="text-sm font-semibold text-white">Avisos y Notificaciones METIS</h3>
            </div>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
              totalAvisos > 0 ? 'bg-orange-500/80 text-orange-400 border-orange-500/40' : 'bg-emerald-500/80 text-emerald-400 border-emerald-500/40'
            }`}>
              {totalAvisos > 0 ? `${totalAvisos} Pendientes` : 'Sin Avisos'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <AlertCard
              icon={<FileText className="w-4 h-4" />}
              label="Presupuestos pendientes"
              count={kpis.presupuestosPendientes}
              color="text-orange-400"
              borderColor="border-orange-500"
              onClick={() => navigate('/presupuestos')}
            />
            <AlertCard
              icon={<TrendingUp className="w-4 h-4" />}
              label="Facturas sin cobrar"
              count={kpis.facturasPendienteCobro}
              color="text-red-400"
              borderColor="border-red-500"
              onClick={() => navigate('/facturas')}
            />
            <AlertCard
              icon={<Users className="w-4 h-4" />}
              label="Total clientes"
              count={kpis.totalClientes}
              color="text-cyan-400"
              borderColor="border-cyan-500"
              onClick={() => navigate('/clientes')}
            />
          </div>
        </div>
      )}

      {/* CITAS + REPARACIONES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="gestarian-glass rounded-2xl border border-white/10 overflow-hidden bg-white/80">
          <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-400" />
              <span className="font-semibold text-sm text-white">Citas de hoy</span>
            </div>
            <button onClick={() => navigate('/citas')} className="text-xs text-white/40 hover:text-white/70 transition flex items-center gap-1">
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
              <div key={cita.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition cursor-pointer" onClick={() => navigate('/citas')}>
                <div className="flex-shrink-0">
                  {cita.estado === 'completada' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    : cita.estado === 'cancelada' ? <AlertCircle className="w-4 h-4 text-red-400" />
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

        <div className="gestarian-glass rounded-2xl border border-white/10 overflow-hidden bg-white/80">
          <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-amber-400" />
              <span className="font-semibold text-sm text-white">Vehículos en taller</span>
            </div>
            <button onClick={() => navigate('/reparaciones')} className="text-xs text-white/40 hover:text-white/70 transition flex items-center gap-1">
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
              <div key={rep.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition cursor-pointer" onClick={() => navigate('/reparaciones')}>
                <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <CarFront className="w-4 h-4 text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{rep.vehiculo?.matricula ?? '—'}</p>
                  <p className="text-xs text-white/40 truncate">
                    {[rep.vehiculo?.marca, rep.vehiculo?.modelo].filter(Boolean).join(' ') || 'Sin datos'}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-white/30">{timeAgo(rep.created_at)}</p>
                  <p className="text-xs text-white/50 truncate max-w-[100px]">{rep.cliente?.nombre}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ACCESO RAPIDO */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-3">Acceso rápido</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { icon: Users,      label: 'Clientes',     path: '/clientes',          color: 'bg-cyan-500/80 border-cyan-500/20 text-cyan-400' },
            { icon: Camera,     label: 'Presupuesto híbrido', path: '/presupuesto-hibrido', color: 'bg-fuchsia-500/80 border-fuchsia-500/20 text-fuchsia-400' },
            { icon: FileText,   label: 'Presupuestos', path: '/presupuestos',      color: 'bg-violet-500/80 border-violet-500/20 text-violet-400' },
            { icon: Wrench,     label: 'Reparaciones', path: '/reparaciones',     color: 'bg-amber-500/80 border-amber-500/20 text-amber-400' },
            { icon: TrendingUp, label: 'Balances',     path: '/balances',         color: 'bg-emerald-500/80 border-emerald-500/20 text-emerald-400' },
          ].map(({ icon: Icon, label, path, color }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] ${color} shadow-[0_0_20px_-5px_rgba(64,224,208,0.3)] hover:shadow-[0_0_30px_-5px_rgba(64,224,208,0.5)]`}
            >
              <Icon className="w-4 h-4 flex-shrink-0 drop-shadow-[0_0_8px_rgba(64,224,208,0.8)]" />
              <span className="text-sm font-medium text-white leading-[0.75] drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
    </>
  )
}

function KpiCard({
  icon, label, value, sub, color, border, iconColor, onClick
}: {
  icon: React.ReactNode; label: string; value: string; sub: string
  color: string; border: string; iconColor: string; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`gestarian-glass rounded-2xl p-4 text-left bg-gradient-to-br ${color} hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 w-full group shadow-[0_0_20px_-5px_rgba(64,224,208,0.3)] hover:shadow-[0_0_30px_-5px_rgba(64,224,208,0.5)]`}
    >
      <div className={`${iconColor} mb-3 opacity-80 group-hover:opacity-100 transition drop-shadow-[0_0_8px_rgba(64,224,208,0.8)]`}>{icon}</div>
      <div className="text-2xl font-bold text-white tabular-nums leading-[0.75] mb-1 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">{value}</div>
      <div className="text-xs font-semibold text-white/70 leading-[0.75] drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">{label}</div>
      <div className="text-xs text-white/35 mt-0.5 leading-[0.75]">{sub}</div>
    </button>
  )
}

function AlertCard({
  icon, label, count, color, borderColor, onClick
}: {
  icon: React.ReactNode; label: string; count: number
  color: string; borderColor: string; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`gestarian-glass rounded-xl px-4 py-3 flex items-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 w-full text-left shadow-[0_0_20px_-5px_rgba(64,224,208,0.3)] hover:shadow-[0_0_30px_-5px_rgba(64,224,208,0.5)]`}
    >
      <span className={`${color} flex-shrink-0 drop-shadow-[0_0_8px_rgba(64,224,208,0.8)]`}>{icon}</span>
      <span className="flex-1 text-sm text-white/70 leading-[0.75] drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">{label}</span>
      <span className={`text-lg font-bold tabular-nums ${color}`}>{count}</span>
    </button>
  )
}

function EstadoBadge({ estado }: { estado: string }) {
  const map: Record<string, string> = {
    pendiente: 'text-amber-400', confirmada: 'text-blue-400',
    completada: 'text-emerald-400', cancelada: 'text-red-400',
  }
  const labels: Record<string, string> = {
    pendiente: 'Pendiente', confirmada: 'Confirmada',
    completada: 'Completada', cancelada: 'Cancelada',
  }
  return <span className={`text-xs ${map[estado] ?? 'text-white/40'}`}>{labels[estado] ?? estado}</span>
}
