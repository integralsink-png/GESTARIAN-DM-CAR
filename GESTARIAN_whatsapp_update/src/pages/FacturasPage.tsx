import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Factura, Cliente, Cobro, Concepto, Configuracion, Presupuesto, Vehiculo } from '../lib/types'
import { PageHeader, Card, Button, Badge, EmptyState, MetisRowButton } from '../components/UI'
import { FileText, Printer, Mail, Save, X, Check, List, Scale, Calendar, ImageIcon, Download, Trash2, Camera, Plus, MessageCircle } from 'lucide-react'
import { ImageViewer } from '../components/ImageViewer'
import { GlobalImageViewer } from '../components/GlobalImageViewer'
import { sendFacturaByEmail, sendFacturaWhatsApp } from '../lib/pdfGenerator'


const IVA_RATE = 0.21

export function FacturasPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const navState = location.state as { reparacionId?: string; clienteId?: string; vehiculoId?: string } | null

  const [facturas, setFacturas] = useState<Factura[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([])
  const [config, setConfig] = useState<Configuracion | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedFactura, setSelectedFactura] = useState<Factura | null>(null)
  const [cobros, setCobros] = useState<Cobro[]>([])
  const [nuevoAbono, setNuevoAbono] = useState('')
  const [showCobroPanel, setShowCobroPanel] = useState(false)
  const [showRegistro, setShowRegistro] = useState(false)
  const [registered, setRegistered] = useState(false)
  const [trimestreFilter, setTrimestreFilter] = useState('')
  const [viewerMatricula, setViewerMatricula] = useState<string | null>(null)
  const [fotosExpandida, setFotosExpandida] = useState<string | null>(null)
  const [subiendoFoto, setSubiendoFoto] = useState(false)
  const [escaneandoOCR, setEscaneandoOCR] = useState(false)

  useEffect(() => {
    loadFacturas()
    loadClientes()
    loadConfig()
    loadVehiculos()
  }, [])

  async function loadFacturas() {
    setLoading(true)
    const { data } = await supabase.from('facturas').select('*').order('created_at', { ascending: false })
    setFacturas(data ?? [])
    setLoading(false)
  }

  function getTrimestres(): { label: string; value: string; start: string; end: string }[] {
    const y = new Date().getFullYear()
    return [
      { label: `1T ${y}`, value: `${y}-1`, start: `${y}-01-01`, end: `${y}-03-31` },
      { label: `2T ${y}`, value: `${y}-2`, start: `${y}-04-01`, end: `${y}-06-30` },
      { label: `3T ${y}`, value: `${y}-3`, start: `${y}-07-01`, end: `${y}-09-30` },
      { label: `4T ${y}`, value: `${y}-4`, start: `${y}-10-01`, end: `${y}-12-31` },
    ]
  }

  const trimestres = getTrimestres()

  const facturasFiltradas = trimestreFilter
    ? facturas.filter((f) => {
        const t = trimestres.find((t) => t.value === trimestreFilter)
        return t && f.fecha >= t.start && f.fecha <= t.end
      })
    : (() => {
        const now = new Date()
        const month = now.getMonth()
        const y = now.getFullYear()
        let start: string, end: string
        if (month <= 2) { start = `${y}-01-01`; end = `${y}-03-31` }
        else if (month <= 5) { start = `${y}-04-01`; end = `${y}-06-30` }
        else if (month <= 8) { start = `${y}-07-01`; end = `${y}-09-30` }
        else { start = `${y}-10-01`; end = `${y}-12-31` }
        return facturas.filter((f) => f.fecha >= start && f.fecha <= end)
      })()

  function toggleFotos(id: string) {
    if (fotosExpandida === id) {
      setFotosExpandida(null)
    } else {
      setFotosExpandida(id)
    }
  }

  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  async function handleUploadFacturaFoto(e: React.ChangeEvent<HTMLInputElement>, id: string) {
    if (!e.target.files || e.target.files.length === 0) return
    setSubiendoFoto(true)
    try {
      const file = e.target.files[0]
      const dataUrl = await fileToDataUrl(file)
      
      const f = facturas.find(x => x.id === id)
      if (!f) return
      
      const fotosActuales = f.fotos ?? []
      const nuevasFotos = [...fotosActuales, dataUrl]

      const { error } = await supabase.from('facturas').update({ fotos: nuevasFotos }).eq('id', id)
      if (error) throw error
      await loadFacturas()
    } catch (err) {
      console.error(err)
      alert('Error subiendo foto')
    } finally {
      setSubiendoFoto(false)
    }
  }

  async function handleDeleteFacturaFoto(id: string, index: number) {
    if (!confirm('¿Eliminar esta foto?')) return
    const f = facturas.find(x => x.id === id)
    if (!f) return

    const nuevasFotos = [...(f.fotos ?? [])]
    nuevasFotos.splice(index, 1)

    try {
      const { error } = await supabase.from('facturas').update({ fotos: nuevasFotos }).eq('id', id)
      if (error) throw error
      await loadFacturas()
    } catch (err) {
      console.error(err)
      alert('Error eliminando foto')
    }
  }

  async function handleScanOCR(e: React.ChangeEvent<HTMLInputElement>, id: string) {
    if (!e.target.files || e.target.files.length === 0) return
    setEscaneandoOCR(true)
    try {
      const file = e.target.files[0]
      const dataUrl = await fileToDataUrl(file)
      
      const { extractTextFromImage } = await import('../lib/ocrService')
      const text = await extractTextFromImage(dataUrl)
      
      if (text.trim()) {
        const { processMetisMessage } = await import('../lib/metisAiEngine')
        const f = facturas.find(x => x.id === id)
        if (f) {
          // Facturas uses 'conceptos', we can reuse the processMetisMessage but passing facturas instead of presupuestos might be tricky as the engine expects `presupuestos` structure sometimes.
          // For now we will just show the text or use the existing budget logic if Factura has `conceptos`
          // Note: Metis handles `presupuestos` specifically inside its engine, but we will pass it anyway.
          alert(`OCR Detectado en factura:\n\n${text}\n\nNota: La inserción automática de conceptos vía METIS está optimizada para presupuestos actualmente.`);
        }
      }
    } catch (err) {
      console.error(err)
      alert('Error al escanear OCR. Puede que Tesseract tarde un poco en cargar.')
    } finally {
      setEscaneandoOCR(false)
    }
  }

  async function loadClientes() {
    const { data } = await supabase.from('clientes').select('*').order('nombre')
    setClientes(data ?? [])
  }

  async function loadVehiculos() {
    const { data } = await supabase.from('vehiculos').select('*')
    setVehiculos(data ?? [])
  }

  async function loadConfig() {
    const { data } = await supabase.from('configuracion').select('*').eq('id', 1).maybeSingle()
    setConfig(data)
  }

  async function crearFacturaDesdeReparacion() {
    if (!navState?.clienteId) return
    const prefix = `FAA`
    
    const { data: maxFactura } = await supabase
      .from('facturas')
      .select('numero')
      .like('numero', `${prefix}%`)
      .order('numero', { ascending: false })
      .limit(1)
      .maybeSingle()
      
    let maxNum = 0
    if (maxFactura && maxFactura.numero) {
      const numPart = parseInt(maxFactura.numero.substring(prefix.length), 10)
      if (!isNaN(numPart)) {
        maxNum = numPart
      }
    }
    
    const count = maxNum + 1
    const numero = `${prefix}${String(count).padStart(4, '0')}`

    // Buscar el presupuesto asociado a la reparación para copiar los conceptos
    let conceptos: Concepto[] = []
    let total = 0
    if (navState.reparacionId) {
      // Buscar la cita asociada a esta reparación
      const { data: rep } = await supabase.from('reparaciones').select('cita_id').eq('id', navState.reparacionId).maybeSingle()
      if (rep?.cita_id) {
        const { data: cita } = await supabase.from('citas').select('presupuesto_id').eq('id', rep.cita_id).maybeSingle()
        if (cita?.presupuesto_id) {
          const { data: presup } = await supabase.from('presupuestos').select('conceptos, total').eq('id', cita.presupuesto_id).maybeSingle() as { data: Presupuesto | null }
          if (presup) {
            conceptos = (presup as any).conceptos ?? []
            total = (presup as any).total ?? 0
          }
        }
      }
    }

    const { data } = await supabase.from('facturas').insert({
      numero,
      reparacion_id: navState.reparacionId ?? null,
      cliente_id: navState.clienteId,
      vehiculo_id: navState.vehiculoId ?? null,
      conceptos,
      total,
      total_abonado: 0,
      estado_cobro: 'pendiente',
    }).select().single()
    navigate('/facturas', { replace: true })
    loadFacturas()
    if (data) selectFactura(data as Factura)
  }

  useEffect(() => {
    if (navState?.reparacionId) {
      crearFacturaDesdeReparacion()
    }
  }, [navState?.reparacionId])

  async function selectFactura(f: Factura) {
    setSelectedFactura(f)
    const { data } = await supabase.from('cobros').select('*').eq('factura_id', f.id).order('created_at', { ascending: false })
    setCobros(data ?? [])
    setShowCobroPanel(f.estado_cobro === 'parcial' || f.estado_cobro === 'pendiente')
    setNuevoAbono('')
  }

  async function registrarAbono() {
    if (!selectedFactura || !nuevoAbono) return
    const importe = parseFloat(nuevoAbono)
    if (isNaN(importe) || importe <= 0) return

    await supabase.from('cobros').insert({ factura_id: selectedFactura.id, importe })

    const nuevoTotalAbonado = selectedFactura.total_abonado + importe
    const nuevoEstado = nuevoTotalAbonado >= selectedFactura.total ? 'pagada' : 'parcial'

    await supabase.from('facturas').update({
      total_abonado: nuevoTotalAbonado,
      estado_cobro: nuevoEstado,
    }).eq('id', selectedFactura.id)

    setNuevoAbono('')
    setShowCobroPanel(false)
    loadFacturas()
    const updated: Factura = { ...selectedFactura, total_abonado: nuevoTotalAbonado, estado_cobro: nuevoEstado as Factura['estado_cobro'] }
    setSelectedFactura(updated)
    const { data } = await supabase.from('cobros').select('*').eq('factura_id', selectedFactura.id).order('created_at', { ascending: false })
    setCobros(data ?? [])
  }

  async function abonarTodo() {
    if (!selectedFactura || saldoPendiente <= 0) return
    const importe = saldoPendiente
    await supabase.from('cobros').insert({ factura_id: selectedFactura.id, importe })
    const nuevoTotalAbonado = selectedFactura.total
    const nuevoEstado = 'pagada' as Factura['estado_cobro']
    await supabase.from('facturas').update({
      total_abonado: nuevoTotalAbonado,
      estado_cobro: nuevoEstado,
    }).eq('id', selectedFactura.id)
    setShowCobroPanel(false)
    loadFacturas()
    const updated: Factura = { ...selectedFactura, total_abonado: nuevoTotalAbonado, estado_cobro: nuevoEstado }
    setSelectedFactura(updated)
    const { data } = await supabase.from('cobros').select('*').eq('factura_id', selectedFactura.id).order('created_at', { ascending: false })
    setCobros(data ?? [])
  }

  function registrarFactura() {
    setRegistered(true)
    setTimeout(() => setRegistered(false), 2500)
  }

  async function eliminarFactura(id: string) {
    if (!confirm('¿Eliminar esta factura? Esta acción no se puede deshacer.')) return
    await supabase.from('cobros').delete().eq('factura_id', id)
    await supabase.from('facturas').delete().eq('id', id)
    setSelectedFactura(null)
    loadFacturas()
  }

  function descargarPDF() {
    if (!selectedFactura) return
    const cliente = clienteData(selectedFactura.cliente_id)
    const base = selectedFactura.total / (1 + IVA_RATE)
    const iva = selectedFactura.total - base
    const rows = (selectedFactura.conceptos ?? []).map(c =>
      `<tr><td>${c.descripcion}</td><td style="text-align:center">${c.cantidad}</td><td style="text-align:right">${c.precio.toFixed(2)} €</td><td style="text-align:right">${(c.cantidad * c.precio).toFixed(2)} €</td></tr>`
    ).join('')
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${selectedFactura.numero}</title>
    <style>body{font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:40px;color:#111}
    h1{font-size:28px;font-weight:bold;text-transform:uppercase;letter-spacing:2px;color:#111}
    .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #111;padding-bottom:20px;margin-bottom:24px}
    .empresa{font-size:18px;font-weight:bold} .meta{text-align:right}
    .cliente-box{margin-bottom:24px;padding:14px;background:#f8f8f8;border-radius:6px}
    table{width:100%;border-collapse:collapse;margin-bottom:20px}
    th{background:#111;color:#fff;padding:8px;text-align:left;font-size:12px;text-transform:uppercase}
    td{padding:8px;border-bottom:1px solid #e5e5e5;font-size:13px}
    .totales{display:flex;justify-content:flex-end}
    .totales-box{width:260px}
    .total-row{display:flex;justify-content:space-between;padding:4px 0;font-size:13px;color:#555}
    .total-final{display:flex;justify-content:space-between;padding:8px 0;font-size:16px;font-weight:bold;border-top:2px solid #111;margin-top:4px}
    .footer{margin-top:32px;padding-top:16px;border-top:1px solid #e5e5e5;font-size:11px;color:#888}
    @media print{body{padding:20px}}</style></head><body>
    <div class="header">
      <div><div class="empresa">${config?.nombre_empresa ?? 'DM CAR'}</div>
      <div style="font-size:12px;color:#666;margin-top:4px">${config?.cif ?? ''}</div>
      <div style="font-size:12px;color:#666">${config?.direccion ?? ''}</div>
      ${config?.telefono ? `<div style="font-size:12px;color:#666">Tel: ${config.telefono}</div>` : ''}</div>
      <div class="meta"><h1>Factura</h1><div style="font-size:14px;color:#555">${selectedFactura.numero}</div>
      <div style="font-size:12px;color:#888">${new Date(selectedFactura.fecha).toLocaleDateString('es-ES')}</div></div>
    </div>
    <div class="cliente-box"><div style="font-size:11px;color:#888;text-transform:uppercase;font-weight:bold;margin-bottom:4px">Facturar a:</div>
      <div style="font-size:15px;font-weight:bold">${cliente?.nombre ?? '—'}</div>
      ${cliente?.dni ? `<div style="font-size:12px;color:#555">DNI: ${cliente.dni}</div>` : ''}
      ${cliente?.direccion ? `<div style="font-size:12px;color:#555">${cliente.direccion}</div>` : ''}
      ${cliente?.telefono ? `<div style="font-size:12px;color:#555">Tel: ${cliente.telefono}</div>` : ''}</div>
    <table><thead><tr><th>Descripción</th><th style="text-align:center">Cant.</th><th style="text-align:right">Precio</th><th style="text-align:right">Importe</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="4" style="text-align:center;color:#888">Sin conceptos</td></tr>'}</tbody></table>
    <div class="totales"><div class="totales-box">
      <div class="total-row"><span>Base imponible</span><span>${base.toFixed(2)} €</span></div>
      <div class="total-row"><span>IVA (21%)</span><span>${iva.toFixed(2)} €</span></div>
      <div class="total-final"><span>TOTAL</span><span>${selectedFactura.total.toFixed(2)} €</span></div></div></div>
    <div class="footer">Estado de cobro: ${selectedFactura.estado_cobro.toUpperCase()} · Abonado: ${selectedFactura.total_abonado.toFixed(2)} € · Pendiente: ${(selectedFactura.total - selectedFactura.total_abonado).toFixed(2)} €</div>
    </body></html>`
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedFactura.numero}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  function enviarEmail() {
    if (!selectedFactura) return
    const cliente = clienteData(selectedFactura.cliente_id)
    const vehiculo = selectedFactura.vehiculo_id ? vehiculos.find(v => v.id === selectedFactura.vehiculo_id) : null
    sendFacturaByEmail(selectedFactura, cliente, vehiculo, config)
  }

  function clienteNombre(id: string) {
    return clientes.find((c) => c.id === id)?.nombre ?? '—'
  }

  function clienteData(id: string) {
    return clientes.find((c) => c.id === id)
  }

  const estadoColor = (e: string): 'yellow' | 'green' | 'red' => {
    if (e === 'pagada') return 'green'
    if (e === 'parcial') return 'yellow'
    return 'red'
  }

  const saldoPendiente = selectedFactura ? selectedFactura.total - selectedFactura.total_abonado : 0
  const baseImponible = selectedFactura ? selectedFactura.total / (1 + IVA_RATE) : 0
  const ivaAmount = selectedFactura ? selectedFactura.total - baseImponible : 0

  return (
    <div>
      <PageHeader title="Facturas" subtitle="Facturación y control de cobros">
        <div className="flex gap-2">
          {selectedFactura && (
            <>
              <Button variant="secondary" onClick={() => setShowRegistro(true)}>
                <span className="flex items-center gap-2"><List className="w-4 h-4" /> Registro</span>
              </Button>
              <Button variant="secondary" onClick={() => navigate('/balances')}>
                <span className="flex items-center gap-2"><Scale className="w-4 h-4" /> Ir a Balances</span>
              </Button>
            </>
          )}
        </div>
      </PageHeader>

      {/* Selector de trimestre */}
      {!selectedFactura && (
        <div className="flex items-center gap-3 mb-4">
          <Calendar className="w-4 h-4 text-slate-500" />
          <select
            value={trimestreFilter}
            onChange={(e) => setTrimestreFilter(e.target.value)}
            className="bg-bg-700 border border-bg-600 rounded-lg px-4 py-2.5 text-white text-sm focus:border-cyan-500 focus:outline-none"
          >
            <option value="">Último trimestre</option>
            {trimestres.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-slate-500">Cargando...</div>
      ) : facturas.length === 0 && !selectedFactura ? (
        <EmptyState icon={<FileText className="w-12 h-12" />} title="No hay facturas" subtitle="Las facturas se generan desde reparaciones finalizadas" />
      ) : selectedFactura ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Panel izquierdo: control de cobro + acciones */}
          <div className="space-y-4">
            <Button variant="ghost" onClick={() => setSelectedFactura(null)} className="mb-2">
              <span className="flex items-center gap-2"><X className="w-4 h-4" /> Volver al listado</span>
            </Button>

            <Card className="p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Control de Cobro</h3>
              
              {/* Información de la factura */}
              <div className="space-y-3 text-sm mb-4">
                <div className="flex justify-between"><span className="text-slate-500">Factura:</span><span className="text-white font-medium">{selectedFactura.numero}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Fecha emisión:</span><span className="text-white font-medium">{new Date(selectedFactura.fecha).toLocaleDateString('es-ES')}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Cliente:</span><span className="text-white font-medium">{clienteNombre(selectedFactura.cliente_id)}</span></div>
                {selectedFactura.vehiculo_id && (
                  <div className="flex justify-between"><span className="text-slate-500">Vehículo:</span><span className="text-white font-medium">{vehiculos.find(v => v.id === selectedFactura.vehiculo_id)?.matricula || '—'}</span></div>
                )}
              </div>

              {/* Resumen de cobro */}
              <div className="bg-bg-700/50 rounded-lg p-3 space-y-2 text-sm mb-4">
                <div className="flex justify-between"><span className="text-slate-500">Total factura:</span><span className="text-white font-medium">{selectedFactura.total.toFixed(2)} €</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Total abonado:</span><span className="text-green-400 font-medium">{selectedFactura.total_abonado.toFixed(2)} €</span></div>
                <div className="flex justify-between border-t border-bg-600 pt-2"><span className="text-slate-500">Saldo pendiente:</span><span className="text-amber-400 font-bold">{saldoPendiente.toFixed(2)} €</span></div>
                <div className="flex justify-between pt-1"><span className="text-slate-500">Estado:</span><span className="text-white font-medium">{selectedFactura.estado_cobro.toUpperCase()}</span></div>
              </div>

              <div className="mb-4"><Badge text={selectedFactura.estado_cobro} color={estadoColor(selectedFactura.estado_cobro)} /></div>

              {showCobroPanel && saldoPendiente > 0 && (
                <div className="mt-4 p-4 bg-bg-700 rounded-lg border border-bg-600">
                  <label className="block text-sm text-slate-400 mb-2">Nuevo abono</label>
                  <div className="flex gap-2">
                    <input type="number" value={nuevoAbono} onChange={(e) => setNuevoAbono(e.target.value)} placeholder="0.00 €" className="flex-1 bg-bg-800 border border-bg-600 rounded-lg px-3 py-2 text-white text-sm focus:border-cyan-500 focus:outline-none" />
                    <Button size="sm" onClick={registrarAbono}><span className="flex items-center gap-1"><Save className="w-3.5 h-3.5" /> Guardar</span></Button>
                  </div>
                  <button onClick={() => setShowCobroPanel(false)} className="mt-2 text-xs text-slate-500 hover:text-white">Cancelar</button>
                </div>
              )}
              {saldoPendiente > 0 && (
                <div className="mt-4 flex gap-2">
                  {!showCobroPanel && (
                    <Button size="sm" variant="secondary" onClick={() => setShowCobroPanel(true)}>Registrar abono</Button>
                  )}
                  <Button size="sm" onClick={abonarTodo}>Abonar todo ({saldoPendiente.toFixed(2)} €)</Button>
                </div>
              )}

              {cobros.length > 0 && (
                <div className="mt-4 pt-4 border-t border-bg-600">
                  <p className="text-xs text-slate-500 mb-2 font-medium">Histórico de abonos ({cobros.length})</p>
                  <div className="space-y-1.5">
                    {cobros.map((c, idx) => (
                      <div key={c.id} className="flex justify-between text-xs items-center bg-bg-700/30 rounded px-2 py-1">
                        <span className="text-slate-500">
                          {new Date(c.fecha).toLocaleDateString('es-ES')} {new Date(c.fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="text-green-400 font-medium">{c.importe.toFixed(2)} €</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 text-xs text-slate-400">
                    Total abonado: {selectedFactura.total_abonado.toFixed(2)} € ({((selectedFactura.total_abonado / selectedFactura.total) * 100).toFixed(1)}%)
                  </div>
                </div>
              )}
            </Card>

            <Card className="p-5">
              <h3 className="text-sm font-semibold text-white mb-3">Acciones</h3>
              <div className="flex flex-col gap-2">
                <Button variant="secondary" onClick={() => window.print()} className="gestarian-paper-btn"><span className="flex items-center gap-2"><Printer className="w-4 h-4" /> Imprimir</span></Button>
                <Button variant="secondary" onClick={descargarPDF} className="gestarian-paper-btn"><span className="flex items-center gap-2"><Download className="w-4 h-4" /> Descargar PDF</span></Button>
                <Button variant="secondary" onClick={enviarEmail} className="gestarian-paper-btn"><span className="flex items-center gap-2"><Mail className="w-4 h-4" /> Enviar por email</span></Button>
                <Button onClick={registrarFactura} className="gestarian-paper-btn-primary">
                  <span className="flex items-center gap-2"><Check className="w-4 h-4" /> {registered ? 'Factura registrada ✓' : 'Registrar factura'}</span>
                </Button>
                <Button variant="danger" onClick={() => eliminarFactura(selectedFactura!.id)} className="mt-2">
                  <span className="flex items-center gap-2"><Trash2 className="w-4 h-4" /> Eliminar factura</span>
                </Button>
              </div>
            </Card>
          </div>

          {/* Panel derecho: vista A4 de factura */}
          <div className="gestarian-paper rounded-lg shadow-2xl p-8 sm:p-12 print:shadow-none">
            <div className="flex justify-between items-start mb-6 pb-4 border-b-2 border-gray-800">
              <div className="flex items-center gap-3">
                {config?.logo_bn ? (
                  <img src={config.logo_bn} alt="Logo" className="w-16 h-16 rounded-lg object-cover bg-gray-100 p-1" />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-gray-800 flex items-center justify-center text-white font-bold text-lg">{config?.nombre_empresa?.charAt(0) ?? 'D'}</div>
                )}
                <div>
                  <h2 className="text-xl font-bold">{config?.nombre_empresa ?? 'DM CAR'}</h2>
                  <p className="text-xs text-gray-500">{config?.cif ?? 'B-12345678'}</p>
                  <p className="text-xs text-gray-500">{config?.direccion ?? ''}</p>
                  {config?.telefono && <p className="text-xs text-gray-500">Tel: {config.telefono}</p>}
                </div>
              </div>
              <div className="text-right">
                <h3 className="text-2xl font-bold uppercase tracking-wide">Factura</h3>
                <p className="text-sm text-gray-600 mt-1">{selectedFactura.numero}</p>
                <p className="text-xs text-gray-500">{new Date(selectedFactura.fecha).toLocaleDateString('es-ES')}</p>
              </div>
            </div>

            <div className="mb-6 pb-4 border-b border-gray-200">
              <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Facturar a:</p>
              <p className="font-semibold">{clienteNombre(selectedFactura.cliente_id)}</p>
              {(() => {
                const c = clienteData(selectedFactura.cliente_id)
                return c ? (
                  <div className="text-sm text-gray-600">
                    {c.direccion && <p>{c.direccion}</p>}
                    {c.dni && <p>DNI: {c.dni}</p>}
                    {c.telefono && <p>Tel: {c.telefono}</p>}
                  </div>
                ) : null
              })()}
            </div>

            <table className="w-full text-sm mb-4">
              <thead>
                <tr className="border-b-2 border-gray-800 text-left text-xs uppercase text-gray-600">
                  <th className="py-2">Descripción</th>
                  <th className="py-2 text-center">Cant.</th>
                  <th className="py-2 text-right">Precio</th>
                  <th className="py-2 text-right">Importe</th>
                </tr>
              </thead>
              <tbody>
                {(selectedFactura.conceptos ?? []).length === 0 ? (
                  <tr><td colSpan={4} className="py-4 text-center text-gray-400">Sin conceptos</td></tr>
                ) : (
                  (selectedFactura.conceptos ?? []).map((c, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="py-2">{c.descripcion}</td>
                      <td className="py-2 text-center">{c.cantidad}</td>
                      <td className="py-2 text-right">{c.precio.toFixed(2)} €</td>
                      <td className="py-2 text-right">{(c.cantidad * c.precio).toFixed(2)} €</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <div className="flex justify-end mb-6">
              <div className="w-64 space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Base imponible</span><span className="font-medium">{baseImponible.toFixed(2)} €</span></div>
                <div className="flex justify-between"><span className="text-gray-500">IVA (21%)</span><span className="font-medium">{ivaAmount.toFixed(2)} €</span></div>
                <div className="flex justify-between font-bold text-base border-t-2 border-gray-800 pt-1.5"><span>TOTAL</span><span>{selectedFactura.total.toFixed(2)} €</span></div>
              </div>
            </div>

            <div className="text-xs text-gray-400 border-t border-gray-200 pt-4 space-y-0.5">
              <p>Estado de cobro: {selectedFactura.estado_cobro.toUpperCase()}</p>
              {selectedFactura.total_abonado > 0 && <p>Abonado: {selectedFactura.total_abonado.toFixed(2)} € · Pendiente: {saldoPendiente.toFixed(2)} €</p>}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {facturasFiltradas.length === 0 ? (
            <EmptyState icon={<FileText className="w-12 h-12" />} title="No hay facturas" subtitle="No hay facturas en el trimestre seleccionado" />
          ) : facturasFiltradas.map((f) => (
            <Card key={f.id} className="p-4 hover:border-bg-500 transition-colors cursor-pointer">
              <div className="flex items-center justify-between gap-3" onClick={() => selectFactura(f)}>
                <div>
                  <div className="flex items-center gap-2"><span className="font-medium text-white">{f.numero}</span><Badge text={f.estado_cobro} color={estadoColor(f.estado_cobro)} /></div>
                  <p className="text-sm text-slate-500 mt-1">{clienteNombre(f.cliente_id)} · {f.total.toFixed(2)} €</p>
                  {f.estado_cobro === 'parcial' && <p className="text-xs text-amber-400 mt-1">Abonado: {f.total_abonado.toFixed(2)} € · Pendiente: {(f.total - f.total_abonado).toFixed(2)} €</p>}
                </div>
                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                  <MetisRowButton
                    tipo="factura"
                    id={f.id}
                    numero={f.numero}
                    matricula={f.vehiculo_id ? vehiculos.find(x => x.id === f.vehiculo_id)?.matricula : undefined}
                    cliente_nombre={clienteNombre(f.cliente_id)}
                    data={f}
                  />
                  {f.vehiculo_id && (() => {
                    const v = vehiculos.find((x) => x.id === f.vehiculo_id)
                    if (!v) return null
                    return (
                      <button
                        onClick={() => setViewerMatricula(v.matricula)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-bg-700 hover:bg-bg-600 text-cyan-400 text-xs font-semibold border border-bg-600"
                      >
                        <ImageIcon className="w-3.5 h-3.5" /> IMÁGENES
                      </button>
                    )
                  })()}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const c = clientes.find(x => x.id === f.cliente_id);
                      const veh = f.vehiculo_id ? vehiculos.find(v => v.id === f.vehiculo_id) : null;
                      sendFacturaByEmail(f, c, veh, config);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 text-xs font-semibold border border-indigo-500/40"
                  >
                    <Mail className="w-3.5 h-3.5" /> EMAIL
                  </button>

                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      const c = clientes.find(x => x.id === f.cliente_id);
                      const veh = f.vehiculo_id ? vehiculos.find(v => v.id === f.vehiculo_id) : null;
                      const pendiente = f.total - (cobros?.reduce((sum: number, cobro: any) => sum + cobro.importe, 0) || 0);
                      await sendFacturaWhatsApp(f, c, veh, config, pendiente);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 text-xs font-semibold border border-green-500/40"
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> WHATSAPP
                  </button>

                  <button
                    onClick={(e) => { e.stopPropagation(); toggleFotos(f.id); }}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      fotosExpandida === f.id 
                        ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' 
                        : 'bg-bg-700 hover:bg-bg-600 text-cyan-400 border-bg-600'
                    }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5" /> 
                    {fotosExpandida === f.id ? 'OCULTAR' : 'FOTOS'}
                    {(f.fotos ?? []).length > 0 && <span className="ml-1 px-1.5 bg-cyan-500/20 rounded-full">{(f.fotos ?? []).length}</span>}
                  </button>

                  <button
                    onClick={(e) => { e.stopPropagation(); eliminarFactura(f.id); }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold border border-red-500/20"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <div className="text-right"><p className="text-xs text-slate-500">{new Date(f.fecha).toLocaleDateString('es-ES')}</p></div>
                </div>
              </div>

              {/* Inline photos block replaced by GlobalImageViewer */}

            </Card>
          ))}
        </div>
      )}

      {/* Modal Registro de Facturas */}
      {showRegistro && (
        <div className="fixed inset-0 bg-bg-950/80 z-50 flex items-center justify-center p-4" onClick={() => setShowRegistro(false)}>
          <Card className="w-full max-w-2xl p-6 max-h-[80vh] overflow-y-auto">
            <div onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Registro de Facturas</h2>
                <button onClick={() => setShowRegistro(false)} className="text-slate-500 hover:text-white text-sm">Cerrar</button>
              </div>
              <div className="space-y-2">
                {facturas.length === 0 ? (
                  <p className="text-center text-slate-500 py-8">No hay facturas registradas</p>
                ) : (
                  facturas.map((f) => (
                    <div key={f.id} className="flex items-center justify-between p-3 bg-bg-700 rounded-lg">
                      <div>
                        <div className="flex items-center gap-2"><span className="font-medium text-white text-sm">{f.numero}</span><Badge text={f.estado_cobro} color={estadoColor(f.estado_cobro)} /></div>
                        <p className="text-xs text-slate-500 mt-1">{clienteNombre(f.cliente_id)} · {f.total.toFixed(2)} € · {new Date(f.fecha).toLocaleDateString('es-ES')}</p>
                      </div>
                      <Button size="sm" variant="secondary" onClick={() => { selectFactura(f); setShowRegistro(false) }}>Ver</Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Card>
        </div>
      )}

      <ImageViewer open={!!viewerMatricula} matricula={viewerMatricula ?? ''} onClose={() => setViewerMatricula(null)} />

      <GlobalImageViewer
        isOpen={!!fotosExpandida}
        onClose={() => setFotosExpandida(null)}
        images={facturas.find(f => f.id === fotosExpandida)?.fotos ?? []}
        onAddImage={async (dataUrl) => {
          if (!fotosExpandida) return;
          const f = facturas.find(x => x.id === fotosExpandida);
          if (f) {
            const nuevasFotos = [...(f.fotos ?? []), dataUrl];
            await supabase.from('facturas').update({ fotos: nuevasFotos }).eq('id', fotosExpandida);
            await loadFacturas();
          }
        }}
        onDeleteImage={async (index) => {
          if (fotosExpandida) await handleDeleteFacturaFoto(fotosExpandida, index)
        }}
        title={`Factura ${facturas.find(f => f.id === fotosExpandida)?.numero ?? ''}`}
        customAction={
          <label className={`cursor-pointer flex items-center justify-center w-full h-full text-xs transition-colors font-medium ${escaneandoOCR ? 'text-amber-400' : 'text-amber-500 hover:text-amber-400'}`}>
            <div className="flex flex-col items-center justify-center gap-1 bg-amber-500/10 border-2 border-dashed border-amber-500/30 hover:bg-amber-500/20 rounded-xl w-20 h-20 p-1 text-center leading-tight">
              <Camera className="w-6 h-6" />
              {escaneandoOCR ? 'OCR...' : 'OCR'}
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => fotosExpandida && handleScanOCR(e, fotosExpandida)} disabled={escaneandoOCR} />
          </label>
        }
      />
    </div>
  )
}
