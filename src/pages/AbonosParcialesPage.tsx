import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Factura, Cobro, Cliente, Vehiculo, Configuracion } from '../lib/types'
import { PageHeader, MatriculaBadge } from '../components/UI'
import { validarDocumentoAEAT, getExpediente } from '../lib/utils'
import {
  sendReciboAbonoByEmail,
  sendFacturaProformaByEmail,
  sendFacturaByEmail,
  downloadReciboAbonoPDF,
  downloadFacturaProformaPDF
} from '../lib/pdfGenerator'
import { useToast } from '../lib/ToastContext'
import { playSuccessChime, playTimepickerTickSound } from '../lib/sound'
import {
  ArrowLeft,
  Users,
  Building2,
  Euro,
  Coins,
  Receipt,
  FileText,
  Mail,
  Download,
  CheckCircle2,
  Clock,
  Search,
  Loader2,
  Calendar,
  CreditCard,
  Banknote,
  Send
} from 'lucide-react'

export function AbonosParcialesPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const navState = location.state as { clienteId?: string; vehiculoId?: string; facturaId?: string } | undefined
  const { showToast } = useToast()

  const [activeTab, setActiveTab] = useState<'particulares' | 'empresas'>('particulares')
  const [facturas, setFacturas] = useState<Factura[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([])
  const [cobros, setCobros] = useState<Cobro[]>([])
  const [config, setConfig] = useState<Configuracion | null>(null)
  const [loading, setLoading] = useState(true)

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFactura, setSelectedFactura] = useState<Factura | null>(null)
  const [montoAbono, setMontoAbono] = useState('')
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'tarjeta' | 'transferencia' | 'bizum'>('transferencia')
  const [procesandoAbono, setProcesandoAbono] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [
        { data: fData },
        { data: cData },
        { data: vData },
        { data: cobData },
        { data: cfgData }
      ] = await Promise.all([
        supabase.from('facturas').select('*').order('created_at', { ascending: false }),
        supabase.from('clientes').select('*').order('nombre'),
        supabase.from('vehiculos').select('*'),
        supabase.from('cobros').select('*').order('created_at', { ascending: false }),
        supabase.from('configuracion').select('*').eq('id', 1).maybeSingle()
      ])

      setFacturas(fData ?? [])
      setClientes(cData ?? [])
      setVehiculos(vData ?? [])
      setCobros(cobData ?? [])
      setConfig(cfgData ?? null)

      // Si viene navegación previa seleccionando una factura
      if (navState?.facturaId && fData) {
        const found = fData.find((f: Factura) => f.id === navState.facturaId)
        if (found) setSelectedFactura(found)
      }
    } catch (err) {
      console.error('Error cargando abonos parciales:', err)
      showToast('Error al cargar datos de cobros', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Determinar si un cliente es particular o sociedad/empresa según AEAT y denominación
  function isEmpresaOEntidad(c?: Cliente | null): boolean {
    if (!c) return false
    const doc = c.dni ? c.dni.trim().toUpperCase() : ''
    const val = validarDocumentoAEAT(doc)
    if (val.tipo === 'CIF') return true

    // Detección por razón social si contiene SL, SA, Ayto, etc.
    const nom = (c.nombre || '').toUpperCase()
    const keywords = ['S.L.', 'SL', 'S.A.', 'SA', 'S.L.U.', 'SLU', 'SOCIEDAD', 'AYUNTAMIENTO', 'ORGANISMO', 'DIPUTACION', 'COMUNIDAD', 'COOPERATIVA', 'CORP']
    return keywords.some(k => nom.includes(k))
  }

  // Filtrar facturas que tengan saldo pendiente (no abonadas al 100%)
  const facturasPendientes = useMemo(() => {
    return facturas.filter(f => {
      const abonado = f.total_abonado || 0
      const total = f.total || 0
      const saldo = total - abonado
      // Solo facturas que tengan saldo pendiente > 0.01 y total > 0
      return saldo > 0.01 && total > 0 && f.estado_cobro !== 'pagada'
    })
  }, [facturas])

  // Particulares vs Empresas
  const facturasParticulares = useMemo(() => {
    return facturasPendientes.filter(f => {
      const c = clientes.find(cli => cli.id === f.cliente_id)
      return !isEmpresaOEntidad(c)
    })
  }, [facturasPendientes, clientes])

  const facturasEmpresas = useMemo(() => {
    return facturasPendientes.filter(f => {
      const c = clientes.find(cli => cli.id === f.cliente_id)
      return isEmpresaOEntidad(c)
    })
  }, [facturasPendientes, clientes])

  const facturasMostradas = useMemo(() => {
    const list = activeTab === 'particulares' ? facturasParticulares : facturasEmpresas
    if (!searchQuery.trim()) return list
    const q = searchQuery.toLowerCase()

    return list.filter(f => {
      const c = clientes.find(cli => cli.id === f.cliente_id)
      const v = vehiculos.find(veh => veh.id === f.vehiculo_id)
      return (
        f.numero?.toLowerCase().includes(q) ||
        f.numero_proforma?.toLowerCase().includes(q) ||
        c?.nombre?.toLowerCase().includes(q) ||
        c?.dni?.toLowerCase().includes(q) ||
        v?.matricula?.toLowerCase().includes(q) ||
        v?.marca?.toLowerCase().includes(q) ||
        v?.modelo?.toLowerCase().includes(q)
      )
    })
  }, [activeTab, facturasParticulares, facturasEmpresas, searchQuery, clientes, vehiculos])

  // Generar o recuperar número correlativo de Proforma FPAA0000 para empresas
  async function asegurarNumeroProforma(fac: Factura): Promise<string> {
    if (fac.numero_proforma && fac.numero_proforma.startsWith('FP')) {
      return fac.numero_proforma
    }

    const yearSuffix = String(new Date().getFullYear()).slice(-2)
    const prefix = `FP${yearSuffix}`

    const { data: todasProformas } = await supabase
      .from('facturas')
      .select('numero_proforma')
      .like('numero_proforma', `${prefix}%`)

    let maxNum = 0
    for (const f of (todasProformas || [])) {
      if (f.numero_proforma && f.numero_proforma.startsWith(prefix)) {
        const numPart = parseInt(f.numero_proforma.substring(prefix.length), 10)
        if (!isNaN(numPart) && numPart > maxNum) maxNum = numPart
      }
    }
    const nuevoNumeroProforma = `${prefix}${String(maxNum + 1).padStart(4, '0')}`

    await supabase
      .from('facturas')
      .update({ numero_proforma: nuevoNumeroProforma })
      .eq('id', fac.id)

    return nuevoNumeroProforma
  }

  // Generar número de Factura Oficial FAA0000 al llegar al 100% de pago
  async function generarNumeroFacturaOficial(): Promise<string> {
    const yearSuffix = String(new Date().getFullYear()).slice(-2)
    const prefix = `F${yearSuffix}`

    const { data: todasFacturas } = await supabase
      .from('facturas')
      .select('numero')
      .like('numero', `${prefix}%`)

    let maxNum = 0
    for (const f of (todasFacturas || [])) {
      if (f.numero && f.numero.startsWith(prefix)) {
        const numPart = parseInt(f.numero.substring(prefix.length), 10)
        if (!isNaN(numPart) && numPart > maxNum) maxNum = numPart
      }
    }
    return `${prefix}${String(maxNum + 1).padStart(4, '0')}`
  }

  // ─────────────────────────────────────────────────────────────
  // REGISTRAR NUEVO ABONO (Cobro parcial o total)
  // ─────────────────────────────────────────────────────────────
  async function handleRegistrarAbono(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedFactura || !montoAbono) return

    const importe = parseFloat(montoAbono)
    if (isNaN(importe) || importe <= 0) {
      showToast('Por favor introduce un importe válido', 'warning')
      return
    }

    setProcesandoAbono(true)
    try {
      const cliente = clientes.find(c => c.id === selectedFactura.cliente_id)
      const vehiculo = vehiculos.find(v => v.id === selectedFactura.vehiculo_id)
      const esEmpresa = isEmpresaOEntidad(cliente)

      const cobrosFactura = cobros.filter(c => c.factura_id === selectedFactura.id)
      const totalAnterior = selectedFactura.total_abonado || 0
      const nuevoTotalAbonado = totalAnterior + importe
      const totalFactura = selectedFactura.total || 0
      const isTotalmenteAbonada = nuevoTotalAbonado >= totalFactura - 0.01

      // 1. Guardar Cobro en BD
      const { error: cobroErr } = await supabase.from('cobros').insert({
        factura_id: selectedFactura.id,
        importe,
        fecha: new Date().toISOString().slice(0, 10),
        metodo: metodoPago
      })

      if (cobroErr) {
        throw new Error('Error al registrar cobro: ' + cobroErr.message)
      }

      // 2. Si es pago parcial (< 100%)
      if (!isTotalmenteAbonada) {
        let proformaNum = selectedFactura.numero_proforma
        if (esEmpresa) {
          proformaNum = await asegurarNumeroProforma(selectedFactura)
        }

        await supabase.from('facturas').update({
          total_abonado: nuevoTotalAbonado,
          estado_cobro: 'parcial',
          numero_proforma: proformaNum
        }).eq('id', selectedFactura.id)

        playSuccessChime()

        // Generar y enviar documento según tipo de cliente
        if (!esEmpresa) {
          // Particular -> RECIBO DE ABONO
          const resEmail = await sendReciboAbonoByEmail(
            { ...selectedFactura, total_abonado: nuevoTotalAbonado },
            importe,
            cobrosFactura,
            cliente,
            vehiculo,
            config,
            selectedFactura.numero
          )

          if (resEmail.success) {
            showToast("Abono registrado correctamente. Recibo enviado automáticamente por email al cliente.", 'success')
          } else {
            showToast("Abono registrado correctamente, pero no se pudo enviar automáticamente el documento por email.", 'warning')
          }
        } else {
          // Empresa -> FACTURA PROFORMA
          const resEmail = await sendFacturaProformaByEmail(
            { ...selectedFactura, numero_proforma: proformaNum, total_abonado: nuevoTotalAbonado },
            cliente,
            vehiculo,
            config,
            selectedFactura.numero,
            [...cobrosFactura, { id: 'temp', factura_id: selectedFactura.id, importe, fecha: new Date().toISOString(), metodo: metodoPago, created_at: new Date().toISOString() }]
          )

          if (resEmail.success) {
            showToast("Abono registrado correctamente. Factura proforma enviada automáticamente por email al cliente.", 'success')
          } else {
            showToast("Abono registrado correctamente, pero no se pudo enviar automáticamente el documento por email.", 'warning')
          }
        }
      } else {
        // 3. Pago TOTAL (100% ABONADA) -> FACTURA OFICIAL DEFINITIVA
        let numeroOficial = selectedFactura.numero
        if (!numeroOficial || numeroOficial.startsWith('FP') || numeroOficial.startsWith('BORRADOR') || numeroOficial.startsWith('FAC-')) {
          numeroOficial = await generarNumeroFacturaOficial()
        }

        await supabase.from('facturas').update({
          numero: numeroOficial,
          total_abonado: totalFactura,
          estado_cobro: 'pagada'
        }).eq('id', selectedFactura.id)

        playSuccessChime()

        // Enviar FACTURA OFICIAL al cliente
        const resEmail = await sendFacturaByEmail(
          { ...selectedFactura, numero: numeroOficial, total_abonado: totalFactura, estado_cobro: 'pagada' },
          cliente,
          vehiculo,
          config,
          numeroOficial
        )

        if (resEmail.success) {
          showToast(`Abono registrado correctamente. Factura totalmente abonada. Factura oficial ${numeroOficial} enviada automáticamente por email al cliente.`, 'success')
        } else {
          showToast(`Abono registrado correctamente. Factura totalmente abonada con número ${numeroOficial}.`, 'success')
        }
      }

      setMontoAbono('')
      setSelectedFactura(null)
      loadData()
    } catch (err: any) {
      console.error('Error registrando abono:', err)
      showToast(err.message || 'Error al registrar abono', 'error')
    } finally {
      setProcesandoAbono(false)
    }
  }

  const selectedCliente = selectedFactura ? clientes.find(c => c.id === selectedFactura.cliente_id) : null
  const selectedVehiculo = selectedFactura ? vehiculos.find(v => v.id === selectedFactura.vehiculo_id) : null
  const selectedCobros = selectedFactura ? cobros.filter(c => c.factura_id === selectedFactura.id) : []
  const selectedSaldoPendiente = selectedFactura ? Math.max(0, selectedFactura.total - (selectedFactura.total_abonado || 0)) : 0

  return (
    <div className="relative pb-24 animate-fade-in space-y-6">
      {/* Cabecera Fija */}
      <div className="sticky top-0 bg-bg-950/95 backdrop-blur-md z-30 pb-4 border-b border-slate-800/80 -mx-4 px-4 sm:-mx-6 sm:px-6">
        <PageHeader title="ABONOS PARCIALES">
          <button
            onClick={() => navigate(-1)}
            className="w-[60px] h-[60px] rounded-2xl bg-slate-800/80 text-white border border-white/20 flex items-center justify-center hover:bg-slate-700 transition-transform active:scale-95 shrink-0 shadow-[0_0_15px_rgba(255,255,255,0.1)]"
            title="Volver"
            aria-label="Volver"
          >
            <ArrowLeft className="w-7 h-7" />
          </button>
        </PageHeader>

        {/* PESTAÑAS: PARTICULARES (RECIBOS) vs EMPRESAS / ORGANISMOS (PROFORMAS) */}
        <div className="grid grid-cols-2 gap-3 mt-4 w-full max-w-2xl mx-auto">
          <button
            onClick={() => {
              setActiveTab('particulares')
              setSelectedFactura(null)
            }}
            className={`py-3 px-4 rounded-2xl border-2 font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'particulares'
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.3)] scale-[1.02]'
                : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-5 h-5" />
            <span>PARTICULARES ({facturasParticulares.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('empresas')
              setSelectedFactura(null)
            }}
            className={`py-3 px-4 rounded-2xl border-2 font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'empresas'
                ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.3)] scale-[1.02]'
                : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 className="w-5 h-5" />
            <span>EMPRESAS / ORGANISMOS ({facturasEmpresas.length})</span>
          </button>
        </div>
      </div>

      {/* Buscador */}
      <div className="relative max-w-md mx-auto">
        <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Buscar por cliente, matrícula, expediente o proforma..."
          className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:border-cyan-400 outline-none"
        />
      </div>

      {/* Banner Informativo del Tipo de Documento */}
      <div className={`p-4 rounded-2xl border ${
        activeTab === 'particulares' ? 'bg-cyan-950/30 border-cyan-500/40 text-cyan-200' : 'bg-amber-950/30 border-amber-500/40 text-amber-200'
      } flex items-center justify-between text-xs sm:text-sm`}>
        <div className="flex items-center gap-3">
          {activeTab === 'particulares' ? <Receipt className="w-6 h-6 text-cyan-400 shrink-0" /> : <FileText className="w-6 h-6 text-amber-400 shrink-0" />}
          <div>
            <strong className="block uppercase font-black">
              {activeTab === 'particulares' ? 'Documento: RECIBOS DE ABONO' : 'Documento: FACTURAS PROFORMA (FPAA0000)'}
            </strong>
            <span className="opacity-80">
              {activeTab === 'particulares'
                ? 'Cada abono parcial emite un recibo justificativo al particular. La Factura Oficial se emite al 100% de pago.'
                : 'Las sociedades y organismos reciben factura proforma con desglose de IVA hasta el pago del 100%.'}
            </span>
          </div>
        </div>
      </div>

      {/* Grid de Expedientes con Abonos Pendientes */}
      {loading ? (
        <div className="flex justify-center items-center py-20 text-slate-400 gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
          <span>Cargando expedientes con abonos parciales...</span>
        </div>
      ) : facturasMostradas.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/40 rounded-3xl border border-slate-800 space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto opacity-70" />
          <h3 className="text-lg font-bold text-white uppercase">Sin cobros pendientes</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            {activeTab === 'particulares'
              ? 'Todos los expedientes de particulares están 100% abonados o no tienen pagos parciales pendientes.'
              : 'Todos los expedientes de empresas y organismos están liquidados.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {facturasMostradas.map(fac => {
            const cli = clientes.find(c => c.id === fac.cliente_id)
            const veh = vehiculos.find(v => v.id === fac.vehiculo_id)
            const total = fac.total || 0
            const abonado = fac.total_abonado || 0
            const saldo = Math.max(0, total - abonado)
            const porcentaje = Math.min(100, Math.round((abonado / total) * 100))
            const isSelected = selectedFactura?.id === fac.id

            return (
              <div
                key={fac.id}
                onClick={() => {
                  setSelectedFactura(fac)
                  setMontoAbono(saldo.toFixed(2))
                }}
                className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-4 select-none ${
                  isSelected
                    ? activeTab === 'particulares'
                      ? 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)] scale-[1.02]'
                      : 'bg-amber-950/40 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)] scale-[1.02]'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                    <span className="text-xs font-mono font-bold text-slate-400">
                      EXP: {fac.numero || 'S/N'}
                    </span>
                    {activeTab === 'empresas' && fac.numero_proforma && (
                      <span className="text-xs font-mono font-black text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-lg border border-amber-500/40">
                        {fac.numero_proforma}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 space-y-1.5">
                    <h4 className="text-base font-black text-white truncate">{cli?.nombre || 'Cliente'}</h4>
                    <div className="flex items-center gap-2">
                      {veh && <MatriculaBadge matricula={veh.matricula} />}
                      <span className="text-xs text-slate-400 truncate">{veh?.marca} {veh?.modelo}</span>
                    </div>
                  </div>
                </div>

                {/* Barra de progreso de pago */}
                <div className="space-y-2 bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400">Abonado: <strong className="text-emerald-400">{abonado.toFixed(2)} €</strong></span>
                    <span className="text-slate-400">Pendiente: <strong className="text-rose-400">{saldo.toFixed(2)} €</strong></span>
                  </div>

                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-300"
                      style={{ width: `${porcentaje}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Total: {total.toFixed(2)} €</span>
                    <span className="font-bold text-cyan-300">{porcentaje}% cubierto</span>
                  </div>
                </div>

                {/* Botón de acción rápida */}
                <button
                  type="button"
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Coins className="w-4 h-4 text-cyan-400" />
                  <span>REGISTRAR ABONO</span>
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL / PANEL DE REGISTRO DE ABONO */}
      {/* ───────────────────────────────────────────────────────────── */}
      {selectedFactura && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-xl bg-slate-950 border-2 border-cyan-500/70 rounded-3xl p-6 sm:p-7 shadow-[0_0_35px_rgba(6,182,212,0.3)] space-y-6 text-white relative max-h-[90vh] overflow-y-auto">
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-xl font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <Coins className="w-6 h-6 text-cyan-400" />
                  <span>REGISTRAR ABONO</span>
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  Expediente: <span className="text-cyan-300 font-bold">{selectedFactura.numero}</span>
                  {selectedFactura.numero_proforma && ` · Proforma: ${selectedFactura.numero_proforma}`}
                </p>
              </div>

              <button
                onClick={() => setSelectedFactura(null)}
                className="w-9 h-9 rounded-full bg-slate-900 border border-slate-700 hover:border-cyan-400 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Resumen Cliente y Vehículo */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Cliente:</span>
                <span className="font-bold text-white">{selectedCliente?.nombre} ({selectedCliente?.dni || 'S/DNI'})</span>
              </div>
              {selectedVehiculo && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Vehículo:</span>
                  <span className="font-bold text-cyan-300">{selectedVehiculo.matricula} · {selectedVehiculo.marca} {selectedVehiculo.modelo}</span>
                </div>
              )}
              <div className="flex justify-between items-center border-t border-slate-800 pt-2 font-mono">
                <span className="text-slate-400">Importe Total:</span>
                <span className="font-black text-white">{selectedFactura.total.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between items-center font-mono">
                <span className="text-slate-400">Abonado hasta la fecha:</span>
                <span className="font-bold text-emerald-400">{(selectedFactura.total_abonado || 0).toFixed(2)} €</span>
              </div>
              <div className="flex justify-between items-center font-mono text-base bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="text-amber-300 font-bold">Saldo Pendiente:</span>
                <span className="font-black text-rose-400">{selectedSaldoPendiente.toFixed(2)} €</span>
              </div>
            </div>

            {/* Formulario de Abono */}
            <form onSubmit={handleRegistrarAbono} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-cyan-400 mb-2">
                  IMPORTE DEL NUEVO ABONO (€)
                </label>
                <div className="relative">
                  <Euro className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={selectedSaldoPendiente}
                    value={montoAbono}
                    onChange={e => setMontoAbono(e.target.value)}
                    required
                    className="w-full bg-slate-900 border-2 border-slate-700 focus:border-cyan-400 rounded-2xl pl-11 pr-4 py-3 text-xl font-mono font-black text-white outline-none shadow-inner"
                    placeholder="0.00"
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setMontoAbono(selectedSaldoPendiente.toFixed(2))}
                    className="px-3 py-1 bg-cyan-950 border border-cyan-500/40 text-cyan-300 rounded-lg text-xs font-bold hover:bg-cyan-900 transition-colors cursor-pointer"
                  >
                    Liquidar Todo ({selectedSaldoPendiente.toFixed(2)} €)
                  </button>
                  {selectedSaldoPendiente > 100 && (
                    <button
                      type="button"
                      onClick={() => setMontoAbono((selectedSaldoPendiente / 2).toFixed(2))}
                      className="px-3 py-1 bg-slate-900 border border-slate-700 text-slate-300 rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      50% ({(selectedSaldoPendiente / 2).toFixed(2)} €)
                    </button>
                  )}
                </div>
              </div>

              {/* Método de Pago */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-cyan-400 mb-2">
                  MÉTODO DE PAGO
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'transferencia', label: 'Transferencia', icon: Banknote },
                    { id: 'tarjeta', label: 'Tarjeta', icon: CreditCard },
                    { id: 'efectivo', label: 'Efectivo', icon: Coins },
                    { id: 'bizum', label: 'Bizum', icon: Send }
                  ].map(m => {
                    const Icon = m.icon
                    const isSel = metodoPago === m.id
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setMetodoPago(m.id as any)}
                        className={`py-2.5 px-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                          isSel
                            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-black shadow-sm'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-[11px] uppercase">{m.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Aviso del documento que se enviará automáticamente */}
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
                <Mail className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>
                  {parseFloat(montoAbono || '0') >= selectedSaldoPendiente - 0.01
                    ? '🎉 Al liquidar el 100%, se generará la FACTURA OFICIAL FAA0000 y se enviará automáticamente por email al cliente.'
                    : activeTab === 'particulares'
                    ? 'Se generará y enviará automáticamente el RECIBO DE ABONO por email al cliente particular.'
                    : 'Se generará y enviará automáticamente la FACTURA PROFORMA por email a la empresa/organismo.'}
                </span>
              </div>

              {/* Botonera Modal */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedFactura(null)}
                  className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-xs uppercase tracking-wider cursor-pointer"
                >
                  CANCELAR
                </button>

                <button
                  type="submit"
                  disabled={procesandoAbono}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {procesandoAbono ? <Loader2 className="w-4 h-4 animate-spin" /> : <Coins className="w-4 h-4" />}
                  <span>GUARDAR Y ENVIAR</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
