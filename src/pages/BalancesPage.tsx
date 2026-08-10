import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import type { Factura, Configuracion, Concepto, FacturaRecibida } from '../lib/types'
import { PageHeader, Card, Button, Badge, EmptyState } from '../components/UI'
import { Scale, Send, FileText, TrendingUp, Receipt, ArrowRight, ArrowLeft, X, Calculator, Info, Download, CheckCircle, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, Cell } from 'recharts'
import { exportToA3, exportToSAGE, exportToExcel, downloadFile } from '../lib/accountingExporters'
import { MetisFiscalAdvisor } from '../components/MetisFiscalAdvisor'
import { useTheme } from '../lib/theme'

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-bg-800 p-3 rounded-lg border border-bg-700 shadow-xl z-50">
        <p className="font-medium mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={`item-${index}`} className="text-sm flex items-center gap-2">
            <span className="w-3 h-3 rounded" style={{ backgroundColor: entry.color || entry.fill }} />
            <span className="opacity-70">{entry.name}:</span>
            <span className="semibold">{Number(entry.value).toFixed(2)} €</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

import { createPortal } from 'react-dom'

const IVA_RATE = 0.21

function computeBaseIVA(conceptos: Concepto[]): { base: number; iva: number } {
  const base = conceptos.reduce((s, c) => s + c.cantidad * c.precio, 0)
  const iva = base * IVA_RATE
  return { base, iva }
}

interface TrimData {
  label: string
  start: string
  end: string
  ingresos: number
  gastos: number
  beneficio: number
  ivaRepercutido: number
  ivaSoportado: number
  difIVA: number
  count: number
}

function getLast4Trimestres(): { label: string; start: string; end: string }[] {
  const now = new Date()
  let year = now.getFullYear()
  let q = Math.floor(now.getMonth() / 3) + 1
  const result: { label: string; start: string; end: string }[] = []
  for (let i = 0; i < 4; i++) {
    const startMonth = (q - 1) * 3 + 1
    const endMonth = q * 3
    const endDay = new Date(year, endMonth, 0).getDate()
    result.unshift({
      label: `${q}T ${year}`,
      start: `${year}-${String(startMonth).padStart(2, '0')}-01`,
      end: `${year}-${String(endMonth).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`,
    })
    q--
    if (q === 0) { q = 4; year-- }
  }
  return result
}

const TASA_AUTONOMO = 0.20
const TASA_SL = 0.25

export function BalancesPage() {
  const { playSound } = useTheme()
  const navigate = useNavigate()
  const [facturas, setFacturas] = useState<Factura[]>([])
  const [facturasRecibidas, setFacturasRecibidas] = useState<FacturaRecibida[]>([])
  const [config, setConfig] = useState<Configuracion | null>(null)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [showEmitidas, setShowEmitidas] = useState(false)
  const [showRecibidas, setShowRecibidas] = useState(false)
  const [emitidasTrimestre, setEmitidasTrimestre] = useState('')
  const [tipoEmpresa, setTipoEmpresa] = useState<'autonomo' | 'sociedad_limitada'>('autonomo')
  
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportFormat, setExportFormat] = useState<'A3' | 'SAGE' | 'EXCEL'>('EXCEL')
  const [exportTrimestre, setExportTrimestre] = useState<string>('')
  const [exclude10Days, setExclude10Days] = useState(false)
  const [showSummary, setShowSummary] = useState(false)

  useEffect(() => {
    loadFacturas()
    loadConfig()
  }, [])

  async function loadFacturas() {
    const [{ data: emitidas }, { data: recibidas }] = await Promise.all([
      supabase.from('facturas').select('*').order('fecha', { ascending: false }),
      supabase.from('facturas_recibidas').select('*').order('fecha', { ascending: false })
    ])
    
    // Restricción: en balances no pueden haber facturas con el mismo id
    const uniqueEmitidas = Array.from(new Map((emitidas ?? []).map((f: Factura) => [f.id, f])).values())
    const uniqueRecibidas = Array.from(new Map((recibidas ?? []).map((f: FacturaRecibida) => [f.id, f])).values())
    
    setFacturas(uniqueEmitidas)
    setFacturasRecibidas(uniqueRecibidas)
  }

  async function loadConfig() {
    const { data } = await supabase.from('configuracion').select('*').eq('id', 1).maybeSingle()
    setConfig(data)
    if (data?.tipo_empresa === 'sociedad_limitada') setTipoEmpresa('sociedad_limitada')
  }

  const trimestres = useMemo(() => getLast4Trimestres(), [])

  const datosTrimestrales: TrimData[] = useMemo(() => {
    return trimestres.map((t) => {
      const facs = facturas.filter((f) => f.fecha >= t.start && f.fecha <= t.end)
      const facsRecibidas = facturasRecibidas.filter((f) => f.fecha >= t.start && f.fecha <= t.end)

      const { base: ingresos, iva: ivaRepercutido } = facs.reduce(
        (acc, f) => {
          const r = computeBaseIVA(f.conceptos ?? [])
          return { base: acc.base + r.base, iva: acc.iva + r.iva }
        },
        { base: 0, iva: 0 },
      )
      
      const gastos = facsRecibidas.reduce((acc, f) => acc + (f.base_imponible || 0), 0)
      const ivaSoportado = facsRecibidas.reduce((acc, f) => acc + ((f.base_imponible || 0) * ((f.iva || 0)/100)), 0)
      
      const beneficio = ingresos - gastos
      
      return {
        label: t.label,
        start: t.start,
        end: t.end,
        ingresos,
        gastos,
        beneficio,
        ivaRepercutido,
        ivaSoportado,
        difIVA: ivaRepercutido - ivaSoportado,
        count: facs.length,
      }
    })
  }, [trimestres, facturas, facturasRecibidas])

  const totalIngresos = datosTrimestrales.reduce((s, d) => s + d.ingresos, 0)
  const totalGastos = datosTrimestrales.reduce((s, d) => s + d.gastos, 0)
  const totalBeneficio = totalIngresos - totalGastos
  const totalIVADif = datosTrimestrales.reduce((s, d) => s + d.difIVA, 0)

  const tasaFiscal = tipoEmpresa === 'autonomo' ? TASA_AUTONOMO : TASA_SL
  const totalImporteFiscal = totalBeneficio * tasaFiscal

  const estadoColor = (e: string): 'yellow' | 'green' | 'red' => {
    if (e === 'pagada') return 'green'
    if (e === 'parcial') return 'yellow'
    return 'red'
  }

  async function enviarGestoria() {
    if (!config?.email_gestoria) {
      alert('Configura el email de gestoría en la página de Configuración antes de enviar.')
      return
    }
    setSending(true)
    await new Promise((r) => setTimeout(r, 1500))
    setSending(false)
    setSent(true)
    playSound('success')
    setTimeout(() => setSent(false), 3000)
  }

  function handleAdvancedExport() {
    let tStart = ''
    let tEnd = ''
    if (exportTrimestre === 'ALL' || !exportTrimestre) {
       tStart = trimestres[trimestres.length - 1].start
       tEnd = trimestres[0].end
    } else {
       const t = trimestres.find((t) => t.label === exportTrimestre)
       if (t) {
         tStart = t.start
         tEnd = t.end
       }
    }
    
    let content = ''
    let ext = 'csv'
    let mime = 'text/csv;charset=utf-8;'
    
    if (exportFormat === 'A3') {
      content = exportToA3(facturas, facturasRecibidas, tStart, tEnd, exclude10Days)
      ext = 'txt'
      mime = 'text/plain;charset=utf-8;'
    } else if (exportFormat === 'SAGE') {
      content = exportToSAGE(facturas, facturasRecibidas, tStart, tEnd, exclude10Days)
      ext = 'txt'
      mime = 'text/plain;charset=utf-8;'
    } else {
      content = exportToExcel(facturas, facturasRecibidas, tStart, tEnd, exclude10Days)
      ext = 'csv'
    }

    downloadFile(content, `exportacion_${exportFormat}_${exportTrimestre || 'TOTAL'}.${ext}`, mime)
    setShowExportModal(false)
  }

  const facturasTrim = emitidasTrimestre
    ? facturas.filter((f) => {
        const t = trimestres.find((t) => t.label === emitidasTrimestre)
        return t && f.fecha >= t.start && f.fecha <= t.end
      })
    : facturas.filter((f) => {
        const last = trimestres[trimestres.length - 1]
        const first = trimestres[0]
        return f.fecha >= first.start && f.fecha <= last.end
      })

  return (
    <div>
      <PageHeader title="BALANCES">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="w-[60px] h-[60px] rounded-2xl bg-slate-800/80 text-white border border-white/20 flex items-center justify-center hover:bg-slate-700 transition-transform active:scale-95 shrink-0 shadow-[0_0_15px_rgba(255,255,255,0.1)]"
            title="Volver"
            aria-label="Volver"
          >
            <ArrowLeft className="w-7 h-7" />
          </button>
        </div>
      </PageHeader>

      {/* Botones de acción (Exportar y Enviar a gestoría) debajo del título */}
      <div className="flex flex-col md:flex-row gap-3 mb-6 w-full">
        <button
          onClick={() => setShowExportModal(true)}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-bg-700 bg-bg-800 text-white hover:bg-bg-700 hover:text-cyan-400 transition-all font-medium text-sm w-full md:w-auto"
        >
          <Download className="w-5 h-5" /> Exportar
        </button>
        
        <div className="relative w-full md:w-auto">
          <button
            onClick={enviarGestoria}
            disabled={sending || sent}
            className={`flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl border transition-all font-medium text-sm text-white ${
              sent
                ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                : 'border-bg-700 bg-bg-800 hover:bg-bg-700 hover:text-violet-400'
            }`}
          >
            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            Enviar a gestoría
          </button>

          {/* Globo animado (Tooltip de confirmación) */}
          {sending && (
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold animate-bounce whitespace-nowrap shadow-lg z-10 pointer-events-none">
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-blue-500 rotate-45" />
              Preparando envío...
            </div>
          )}
          {sent && (
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold animate-bounce whitespace-nowrap shadow-[0_0_15px_rgba(16,185,129,0.5)] z-10 pointer-events-none">
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-emerald-500 rotate-45" />
              ¡Enviado con éxito!
            </div>
          )}
        </div>
      </div>

      <Card className="p-4 mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm text-[var(--color-texto)] opacity-60 mb-2">Tipo de empresa</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setTipoEmpresa('autonomo')}
                className={`py-2 px-4 rounded-xl border transition-all font-medium text-sm ${
                  tipoEmpresa === 'autonomo'
                    ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400'
                    : 'bg-bg-800 border-bg-700 text-white/70 hover:bg-bg-700 hover:text-white'
                }`}
              >
                Autónomo
              </button>
              <button
                onClick={() => setTipoEmpresa('sociedad_limitada')}
                className={`py-2 px-4 rounded-xl border transition-all font-medium text-sm ${
                  tipoEmpresa === 'sociedad_limitada'
                    ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400'
                    : 'bg-bg-800 border-bg-700 text-white/70 hover:bg-bg-700 hover:text-white'
                }`}
              >
                Sociedad Limitada
              </button>
            </div>
          </div>
        </div>
      </Card>

      <div className="hidden lg:block mb-4">
        <button
          onClick={() => setShowSummary(!showSummary)}
          className="w-full py-3 border border-gray-400 bg-transparent rounded-lg flex items-center justify-center gap-2 text-sm uppercase tracking-wide"
        >
          {showSummary ? 'Ocultar Resumen' : 'Mostrar Resumen'}
        </button>
      </div>

      {(!window.matchMedia('(min-width: 1024px)').matches) || showSummary ? (
        <>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-5">
          <p className="text-xs opacity-50 uppercase font-medium">Ingresos (4T)</p>
          <p className="text-xl lg:text-2xl font-bold mt-1 text-cyan-400">{totalIngresos.toFixed(2)} €</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs opacity-50 uppercase font-medium">Gastos (4T)</p>
          <p className="text-xl lg:text-2xl font-bold mt-1 text-red-400">{totalGastos.toFixed(2)} €</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs opacity-50 uppercase font-medium">Beneficio neto</p>
          <p className="text-xl lg:text-2xl font-bold mt-1 text-green-400">{totalBeneficio.toFixed(2)} €</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs opacity-50 uppercase font-medium">Diferencia IVA</p>
          <p className="text-xl lg:text-2xl font-bold mt-1 text-amber-400">{totalIVADif.toFixed(2)} €</p>
        </Card>
      </div>

      <MetisFiscalAdvisor beneficioAnual={totalBeneficio} tipoEmpresa={tipoEmpresa} />
      </>
      ) : null}

      <Card className="p-6 mb-6">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="w-5 h-5 text-[var(--color-glow)]" />
          <h2 className="text-lg font-semibold">Ingresos, gastos y beneficio neto — últimos 4 trimestres</h2>
        </div>

        {totalIngresos === 0 && totalGastos === 0 ? (
          <EmptyState icon={<Scale className="w-12 h-12" />} title="Sin datos" subtitle="No hay facturas en los últimos 4 trimestres" />
        ) : (
          <div className="h-80 lg:h-96 w-full -ml-4 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[...datosTrimestrales].reverse()} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis dataKey="label" stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="ingresos" name="Ingresos" fill="#22d3ee" radius={[4, 4, 0, 0]} />
                <Bar dataKey="gastos" name="Gastos" fill="#f87171" radius={[4, 4, 0, 0]} />
                <Bar dataKey="beneficio" name="Beneficio neto" radius={[4, 4, 0, 0]}>
                  {
                    [...datosTrimestrales].reverse().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.beneficio >= 0 ? '#4ade80' : '#ef4444'} />
                    ))
                  }
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card className="p-6 mb-6">
        <div className="flex items-center gap-2 mb-6">
          <Receipt className="w-5 h-5 text-[var(--color-glow)]" />
          <h2 className="text-lg font-semibold">IVA soportado, repercutido y diferencia — últimos 4 trimestres</h2>
        </div>

        {totalIVADif === 0 && datosTrimestrales.every((d) => d.ivaRepercutido === 0) ? (
          <EmptyState icon={<Receipt className="w-12 h-12" />} title="Sin datos de IVA" subtitle="No hay facturas con IVA en los últimos 4 trimestres" />
        ) : (
          <div className="h-80 lg:h-96 w-full -ml-4 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[...datosTrimestrales].reverse()} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis dataKey="label" stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="ivaSoportado" name="IVA Soportado" fill="#60a5fa" radius={[4, 4, 0, 0]} />
                <Bar dataKey="ivaRepercutido" name="IVA Repercutido" fill="#c084fc" radius={[4, 4, 0, 0]} />
                <Bar dataKey="difIVA" name="Diferencia" radius={[4, 4, 0, 0]}>
                  {
                    [...datosTrimestrales].reverse().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.difIVA >= 0 ? '#fbbf24' : '#ef4444'} />
                    ))
                  }
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card className="p-6 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Calculator className="w-5 h-5 text-[var(--color-glow)]" />
          <h2 className="text-lg font-semibold">Diferencia IVA e importe a pagar sobre beneficio</h2>
        </div>
        <div className="flex items-center gap-2 mb-6 text-xs opacity-50">
          <Info className="w-3.5 h-3.5" />
          {tipoEmpresa === 'autonomo' ? (
            <span>Autónomo (estimación directa simplificada): {TASA_AUTONOMO * 100}% del beneficio neto como pago fraccionado IRPF</span>
          ) : (
            <span>Sociedad Limitada: {TASA_SL * 100}% del beneficio como pago fraccionado del Impuesto de Sociedades</span>
          )}
        </div>

        {totalBeneficio === 0 && totalIVADif === 0 ? (
          <EmptyState icon={<Calculator className="w-12 h-12" />} title="Sin datos" subtitle="No hay datos suficientes para el cálculo fiscal" />
        ) : (
          <>
            <div className="h-80 lg:h-96 w-full -ml-4 mb-4 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={[...datosTrimestrales].reverse().map(d => ({ ...d, importeFiscal: d.beneficio * tasaFiscal }))} 
                  margin={{ top: 20, right: 0, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                  <XAxis dataKey="label" stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                  <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar dataKey="difIVA" name="Diferencia IVA" radius={[4, 4, 0, 0]}>
                    {
                      [...datosTrimestrales].reverse().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.difIVA >= 0 ? '#f59e0b' : '#ef4444'} />
                      ))
                    }
                  </Bar>
                  <Bar dataKey="importeFiscal" name={`Pago sobre beneficio (${tasaFiscal * 100}%)`} fill="#06b6d4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-6 border-t border-bg-700">
              <div className="p-4 rounded-lg bg-bg-700/50">
                <p className="text-xs opacity-50 uppercase font-medium mb-1">Total a pagar (IVA + fiscal)</p>
                <p className="text-xl font-bold text-amber-400">{(totalIVADif + totalImporteFiscal).toFixed(2)} €</p>
                <p className="text-[10px] opacity-40 mt-1">Suma de diferencia IVA e importe fiscal de los 4 trimestres</p>
              </div>
              <div className="p-4 rounded-lg bg-bg-700/50">
                <p className="text-xs opacity-50 uppercase font-medium mb-1">
                  {tipoEmpresa === 'autonomo' ? 'IRPF (pago fraccionado)' : 'Impuesto de Sociedades'}
                </p>
                <p className="text-xl font-bold text-cyan-400">{totalImporteFiscal.toFixed(2)} €</p>
                <p className="text-[10px] opacity-40 mt-1">{tasaFiscal * 100}% sobre {totalBeneficio.toFixed(2)} € de beneficio</p>
              </div>
            </div>
          </>
        )}
      </Card>

      {config?.email_gestoria && (
        <p className="text-xs opacity-40 mt-4 flex items-center gap-1">
          <FileText className="w-3.5 h-3.5" />
          Informes a: {config.email_gestoria}
        </p>
      )}

      {showEmitidas && createPortal(
        <div className="fixed inset-0 bg-bg-950/80 z-50 flex items-center justify-center p-4" onClick={() => setShowEmitidas(false)}>
          <Card className="w-full max-w-2xl p-6 max-h-[80vh] overflow-y-auto">
            <div onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Facturas emitidas — últimos 4 trimestres</h2>
                <button onClick={() => setShowEmitidas(false)} className="opacity-50 hover:opacity-100"><X className="w-5 h-5" /></button>
              </div>
              <div className="mb-4">
                <label className="block text-sm opacity-60 mb-1">Trimestre</label>
                <select
                  value={emitidasTrimestre}
                  onChange={(e) => setEmitidasTrimestre(e.target.value)}
                  className="gestarian-panel border border-bg-600 rounded-lg px-4 py-2.5 text-sm focus:border-cyan-500 focus:outline-none"
                >
                  <option value="">Todos</option>
                  {trimestres.map((t) => <option key={t.label} value={t.label}>{t.label}</option>)}
                </select>
              </div>
              {facturasTrim.length === 0 ? (
                <p className="text-center opacity-50 py-8">No hay facturas emitidas en este período</p>
              ) : (
                <div className="space-y-2">
                  {facturasTrim.map((f) => (
                    <div key={f.id} className="flex items-center justify-between p-3 bg-bg-700 rounded-lg">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{f.numero}</span>
                          <Badge text={f.estado_cobro} color={estadoColor(f.estado_cobro)} />
                        </div>
                        <p className="text-xs opacity-50 mt-1">{f.total.toFixed(2)} € · {new Date(f.fecha).toLocaleDateString('es-ES')}</p>
                      </div>
                      <Button size="sm" variant="secondary" onClick={() => { setShowEmitidas(false); navigate('/facturas') }}>
                        <span className="flex items-center gap-1">Ver <ArrowRight className="w-3 h-3" /></span>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>,
        document.body
      )}

      {showRecibidas && createPortal(
        <div className="fixed inset-0 bg-bg-950/80 z-50 flex items-center justify-center p-4" onClick={() => setShowRecibidas(false)}>
          <Card className="w-full max-w-2xl p-6 max-h-[80vh] overflow-y-auto">
            <div onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Facturas recibidas de proveedores</h2>
                <button onClick={() => setShowRecibidas(false)} className="opacity-50 hover:opacity-100"><X className="w-5 h-5" /></button>
              </div>
              <EmptyState
                icon={<Receipt className="w-12 h-12" />}
                title="Sin facturas recibidas"
                subtitle="Las facturas de proveedores se registrarán desde la página de Facturas Recibidas"
              />
              <div className="mt-4 flex justify-end">
                <Button variant="secondary" onClick={() => { setShowRecibidas(false); navigate('/facturas-recibidas') }}>
                  <span className="flex items-center gap-2">Ir a Facturas Recibidas <ArrowRight className="w-4 h-4" /></span>
                </Button>
              </div>
            </div>
          </Card>
        </div>,
        document.body
      )}

      {showExportModal && createPortal(
        <div className="fixed inset-0 bg-bg-950/80 z-50 flex items-center justify-center p-4" onClick={() => setShowExportModal(false)}>
          <Card className="w-full max-w-lg p-6">
            <div onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Download className="w-5 h-5 text-cyan-400" /> Exportación Contable Avanzada
                </h2>
                <button onClick={() => setShowExportModal(false)} className="opacity-50 hover:opacity-100"><X className="w-5 h-5" /></button>
              </div>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-1 opacity-70">Formato de Exportación</label>
                  <select 
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value as any)}
                    className="w-full gestarian-panel border border-bg-600 rounded-lg px-4 py-2 text-sm focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="EXCEL">EXCEL (CSV Genérico)</option>
                    <option value="A3">A3 Software</option>
                    <option value="SAGE">SAGE 50 / Contaplus</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 opacity-70">Trimestre</label>
                  <select 
                    value={exportTrimestre}
                    onChange={(e) => setExportTrimestre(e.target.value)}
                    className="w-full gestarian-panel border border-bg-600 rounded-lg px-4 py-2 text-sm focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="ALL">Todo el histórico</option>
                    {trimestres.map(t => <option key={t.label} value={t.label}>{t.label}</option>)}
                  </select>
                </div>

                <div className="flex items-start gap-3 mt-4 bg-bg-800 p-3 rounded-lg border border-bg-700">
                  <input
                    type="checkbox"
                    id="exclude10Days"
                    checked={exclude10Days}
                    onChange={(e) => setExclude10Days(e.target.checked)}
                    className="mt-1"
                  />
                  <div>
                    <label htmlFor="exclude10Days" className="text-sm font-medium cursor-pointer">Excluir 10 días extra</label>
                    <p className="text-xs opacity-60 mt-0.5">Ignora las facturas generadas en los primeros 10 días para no incluirlas si pertenecen fiscalmente al trimestre anterior o siguiente según tu configuración contable.</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button variant="secondary" onClick={() => setShowExportModal(false)}>Cancelar</Button>
                <Button onClick={handleAdvancedExport}>Descargar Fichero</Button>
              </div>
            </div>
          </Card>
        </div>,
        document.body
      )}
    </div>
  )
}
