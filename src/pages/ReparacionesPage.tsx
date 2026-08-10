import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Reparacion, Cliente, Vehiculo, Concepto, Presupuesto } from '../lib/types'
import { PageHeader, Card, Button, Badge, EmptyState } from '../components/UI'
import { Wrench, FileText, Camera, Mail, Save, X, Car, ImageIcon, Check, Trash2, ArrowLeft } from 'lucide-react'
import { ImageViewer } from '../components/ImageViewer'
import { GlobalImageViewer } from '../components/GlobalImageViewer'

type Fase = 'antes' | 'durante' | 'despues'

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function fotoUrl(entry: string): string {
  return entry.substring(entry.indexOf(':') + 1)
}

export function ReparacionesPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const navState = location.state as { citaId?: string; clienteId?: string; vehiculoId?: string } | null

  const [reparaciones, setReparaciones] = useState<Reparacion[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [vehiculos, setVehiculos] = useState<Record<string, Vehiculo>>({})
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Reparacion | null>(null)
  const [editDesc, setEditDesc] = useState('')
  const [savingDesc, setSavingDesc] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [viewerMatricula, setViewerMatricula] = useState<string | null>(null)
  const [fotosExpandida, setFotosExpandida] = useState<string | null>(null)
  const [subiendoFoto, setSubiendoFoto] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  // Mapa de reparacion_id -> numero de factura ya creada
  const [facturasMap, setFacturasMap] = useState<Record<string, string>>({})
  const [facturando, setFacturando] = useState<string | null>(null)

  useEffect(() => {
    loadReparaciones()
    loadClientes()
    loadVehiculos()
    loadFacturasMap()
  }, [])

  async function loadFacturasMap() {
    const { data } = await supabase.from('facturas').select('reparacion_id, numero').not('reparacion_id', 'is', null)
    const map: Record<string, string> = {}
    ;(data ?? []).forEach((f: any) => { if (f.reparacion_id) map[f.reparacion_id] = f.numero })
    setFacturasMap(map)
  }

  async function loadReparaciones() {
    setLoading(true)
    const { data } = await supabase.from('reparaciones').select('*').order('created_at', { ascending: false })
    setReparaciones(data ?? [])
    setLoading(false)
  }

  async function loadClientes() {
    const { data } = await supabase.from('clientes').select('*').order('nombre')
    setClientes(data ?? [])
  }

  async function loadVehiculos() {
    const { data } = await supabase.from('vehiculos').select('*')
    const map: Record<string, Vehiculo> = {}
    ;(data ?? []).forEach((v: Vehiculo) => { map[v.id] = v })
    setVehiculos(map)
  }

  async function cambiarEstado(id: string, estado: 'en_proceso' | 'finalizado') {
    await supabase.from('reparaciones').update({ estado }).eq('id', id)
    loadReparaciones()
    if (selected?.id === id) {
      setSelected({ ...selected, estado })
    }
  }

  async function facturarReparacion(rep: Reparacion) {
    if (facturasMap[rep.id]) return // ya facturada
    setFacturando(rep.id)
    try {
      // Verificar si ya existe
      const { data: existing } = await supabase.from('facturas').select('numero').eq('reparacion_id', rep.id).maybeSingle()
      if (existing) {
        setFacturasMap(prev => ({ ...prev, [rep.id]: existing.numero }))
        setFacturando(null)
        return
      }

      const yearSuffix = String(new Date().getFullYear()).slice(-2)
      const prefix = `F${yearSuffix}`
      const { data: todasFacturasAnio } = await supabase.from('facturas').select('numero').like('numero', `${prefix}%`).order('numero', { ascending: false })
      let maxNum = 0
      if (todasFacturasAnio && todasFacturasAnio.length > 0) {
        for (const f of todasFacturasAnio) {
          if (f.numero && f.numero.startsWith(prefix)) {
            const numPart = parseInt(f.numero.substring(prefix.length), 10)
            if (!isNaN(numPart) && numPart > maxNum) maxNum = numPart
          }
        }
      }
      const numero = `${prefix}${String(maxNum + 1).padStart(4, '0')}`

      // Buscar conceptos del presupuesto vinculado via cita
      let conceptos: Concepto[] = []
      let total = 0
      let obs = ''
      const { data: repData } = await supabase.from('reparaciones').select('cita_id').eq('id', rep.id).maybeSingle()
      if (repData?.cita_id) {
        const { data: cita } = await supabase.from('citas').select('presupuesto_id').eq('id', repData.cita_id).maybeSingle()
        if (cita?.presupuesto_id) {
          const { data: presup } = await supabase.from('presupuestos').select('conceptos, total, observaciones').eq('id', cita.presupuesto_id).maybeSingle() as { data: Presupuesto | null }
          if (presup) {
            conceptos = (presup as any).conceptos ?? []
            total = (presup as any).total ?? 0
            obs = (presup as any).observaciones ?? ''
          }
        }
      }

      const { error } = await supabase.from('facturas').insert({
        numero,
        reparacion_id: rep.id,
        cliente_id: rep.cliente_id,
        vehiculo_id: rep.vehiculo_id ?? null,
        conceptos,
        total,
        total_abonado: 0,
        estado_cobro: 'pendiente',
      })

      if (error) {
        console.error('Error insertando factura:', error)
        alert('Hubo un error al guardar la factura: ' + error.message)
        return
      }
      setFacturasMap(prev => ({ ...prev, [rep.id]: numero }))
    } finally {
      setFacturando(null)
    }
  }

  async function saveDescripcion() {
    if (!selected) return
    setSavingDesc(true)
    await supabase.from('reparaciones').update({ descripcion: editDesc }).eq('id', selected.id)
    setSavingDesc(false)
    setSelected({ ...selected, descripcion: editDesc })
  }

  async function handleAddFoto(e: React.ChangeEvent<HTMLInputElement>, fase: Fase, repId: string) {
    const file = e.target.files?.[0]
    if (!file) return
    setSubiendoFoto(true)
    try {
      const dataUrl = await fileToDataUrl(file)
      const rep = reparaciones.find(r => r.id === repId)
      if (!rep) return
      const fotos = [...(rep.fotos ?? [])]
      fotos.push(`${fase}:${dataUrl}`)
      await supabase.from('reparaciones').update({ fotos }).eq('id', repId)
      if (selected?.id === repId) {
        setSelected({ ...selected, fotos })
      }
      await loadReparaciones()
    } catch (err) {
      console.error(err)
      alert("Error subiendo foto")
    } finally {
      setSubiendoFoto(false)
    }
  }

  async function handleDeleteReparacionFoto(repId: string, index: number) {
    if (!confirm('¿Eliminar esta foto?')) return
    const rep = reparaciones.find(r => r.id === repId)
    if (!rep) return
    const fotos = [...(rep.fotos ?? [])]
    fotos.splice(index, 1)
    await supabase.from('reparaciones').update({ fotos }).eq('id', repId)
    if (selected?.id === repId) {
      setSelected({ ...selected, fotos })
    }
    await loadReparaciones()
  }

  async function eliminarReparacion(id: string) {
    if (!confirm('¿Eliminar esta reparación? Esta acción no se puede deshacer.')) return
    await supabase.from('reparaciones').delete().eq('id', id)
    if (selected?.id === id) setSelected(null)
    loadReparaciones()
  }

  async function enviarEmailFinalizacion() {
    setSendingEmail(true)
    // En producción sería una edge function que envía email con fotos + factura
    await new Promise((r) => setTimeout(r, 1500))
    setSendingEmail(false)
    setEmailSent(true)
    setTimeout(() => setEmailSent(false), 3000)
  }

  function clienteNombre(id: string) {
    return clientes.find((c) => c.id === id)?.nombre ?? '—'
  }

  function vehiculoInfo(id: string | null) {
    if (!id) return null
    const v = vehiculos[id]
    return v ? `${v.matricula} · ${v.marca ?? ''} ${v.modelo ?? ''}` : null
  }

  return (
    <div>
      <PageHeader title="REPARACIONES">
        <button
          onClick={() => navigate(-1)}
          className="w-[60px] h-[60px] rounded-2xl bg-slate-800/80 text-white border border-white/20 flex items-center justify-center hover:bg-slate-700 transition-transform active:scale-95 shrink-0 shadow-[0_0_15px_rgba(255,255,255,0.1)]"
          title="Volver"
          aria-label="Volver"
        >
          <ArrowLeft className="w-7 h-7" />
        </button>
      </PageHeader>

      {loading ? (
        <div className="text-center py-16 text-slate-500">Cargando...</div>
      ) : selected ? (
        /* Vista detalle de reparación */
        <div className="space-y-6">
          <button
            onClick={() => setSelected(null)}
            className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 font-semibold transition-colors mb-2"
          >
            ← Volver al listado de reparaciones
          </button>
          
          <Card className="p-6">
            <div className="flex items-center justify-between gap-4 flex-wrap pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-xl font-bold text-white">{clienteNombre(selected.cliente_id)}</h2>
                {vehiculoInfo(selected.vehiculo_id) && (
                  <p className="text-sm text-slate-400 mt-1 flex items-center gap-1.5">
                    <Car className="w-4 h-4 text-cyan-400" /> {vehiculoInfo(selected.vehiculo_id)}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                  <Badge
                    text={selected.estado === 'en_proceso' ? 'EN PROCESO' : 'FINALIZADA'}
                    color={selected.estado === 'en_proceso' ? 'blue' : 'green'}
                  />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const v = vehiculos[selected.vehiculo_id || '']
                        if (v) setViewerMatricula(v.matricula)
                      }}
                      className="flex items-center justify-center h-[54px] w-[54px] rounded-lg bg-transparent hover:bg-white/5 text-cyan-400 transition-colors"
                      title="Imágenes"
                    >
                    <ImageIcon className="w-[40px] h-[40px]" />
                  </button>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-semibold text-slate-300 mb-2">Descripción de los trabajos realizada</label>
              <textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                placeholder="Indica las reparaciones y recambios sustituidos..."
                rows={4}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-cyan-500 transition-all"
              />
              <div className="mt-2 flex justify-end">
                <Button size="sm" onClick={saveDescripcion} disabled={savingDesc}>
                  <Save className="w-4 h-4 mr-1 inline" /> {savingDesc ? 'Guardando...' : 'Guardar descripción'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      ) : reparaciones.length === 0 ? (
        <EmptyState icon={<Wrench className="w-12 h-12" />} title="No hay reparaciones" subtitle="Las reparaciones se inician al confirmar llegada de citas" />
      ) : (
        <div className="space-y-3">
          {reparaciones.map((rep) => (
            <Card 
              key={rep.id} 
              className="p-3 hover:border-cyan-500/40 transition-all cursor-pointer flex flex-col gap-2" 
              onClick={() => {
                if (rep.estado === 'finalizado') {
                  setExpandedId(expandedId === rep.id ? null : rep.id);
                } else {
                  setSelected(rep);
                  setEditDesc(rep.descripcion ?? '');
                }
              }}
            >
              {/* LÍNEA 1: Nombre en MAYUS y MINUS y Badge EN PROCESO X0.8 */}
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white text-base capitalize">{clienteNombre(rep.cliente_id).toLowerCase()}</span>
                <div className="transform scale-[0.8] origin-right">
                  <Badge
                    text={rep.estado === 'en_proceso' ? 'EN PROCESO' : 'FINALIZADA'}
                    color={rep.estado === 'en_proceso' ? 'blue' : 'green'}
                  />
                </div>
              </div>

              {/* LÍNEA 2: Marca/Modelo y Matrícula (justificada derecha y color distinto) */}
              {(() => {
                const v = rep.vehiculo_id ? vehiculos[rep.vehiculo_id] : null;
                if (!v) return null;
                return (
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-slate-400 uppercase font-medium">
                      {v.marca} {v.modelo}
                    </span>
                    <span className="text-xs font-bold text-emerald-400 text-right">
                      {v.matricula}
                    </span>
                  </div>
                );
              })()}

              {/* DESCRIPCIÓN (si la hay) */}
              {rep.descripcion && (
                <p className="text-xs text-slate-400 mt-1 line-clamp-1 italic">
                  "{rep.descripcion}"
                </p>
              )}

              {/* LÍNEA 3: Botones */}
              {(rep.estado !== 'finalizado' || expandedId === rep.id) && (
                <div className="flex items-center justify-between gap-2 w-[96%] mx-auto mt-2 pt-2 border-t border-slate-800/50" onClick={(e) => e.stopPropagation()}>
                  {/* Botón Imágenes (izquierda) */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFotosExpandida(rep.id);
                    }}
                    className="flex items-center justify-center h-[48px] w-[48px] rounded-lg bg-slate-800/50 border border-slate-700 hover:bg-slate-700 text-cyan-400 transition-colors shrink-0"
                    title="Imágenes"
                  >
                    <ImageIcon className="w-[24px] h-[24px]" />
                  </button>

                  {/* Botón Central (Finalizar Taller / Facturar / Facturada) */}
                  {rep.estado === 'en_proceso' ? (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        cambiarEstado(rep.id, 'finalizado');
                      }}
                      className="flex-1 flex items-center justify-center py-2.5 rounded-xl border text-sm font-semibold bg-bg-800 text-slate-300 border-bg-700 hover:bg-bg-700 hover:text-emerald-400 hover:border-emerald-500/60 transition-all active:scale-95 h-[48px]"
                    >
                      Finalizar Taller
                    </button>
                  ) : facturasMap[rep.id] ? (
                    // Ya facturada
                    <div className="flex-1 flex items-center justify-between gap-2 h-[48px]">
                      <div className="flex-1 flex items-center justify-center h-full rounded-xl border text-sm font-semibold text-[#a3e635] border-[#a3e635]/40 bg-[#a3e635]/5 shadow-[0_0_8px_rgba(163,230,53,0.25)]">
                        <span className="flex items-center gap-1.5"><Check className="w-4 h-4" /> Facturada</span>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate('/facturas', { state: { facturaNumero: facturasMap[rep.id] } });
                        }}
                        className="flex-1 flex items-center justify-center h-full rounded-xl border text-sm font-semibold bg-bg-800 text-cyan-400 border-cyan-500/40 hover:bg-bg-700 transition-all active:scale-95"
                      >
                        VER
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        facturarReparacion(rep);
                      }}
                      disabled={facturando === rep.id}
                      className="flex-1 flex items-center justify-center py-2.5 rounded-xl border text-sm font-semibold bg-bg-800 text-slate-300 border-bg-700 hover:bg-bg-700 hover:text-emerald-400 hover:border-emerald-500/60 transition-all active:scale-95 h-[48px] disabled:opacity-60"
                    >
                      {facturando === rep.id
                        ? <span className="flex items-center gap-1"><span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full" /> Facturando...</span>
                        : <span className="flex items-center gap-1"><FileText className="w-4 h-4" /> Facturar</span>
                      }
                    </button>
                  )}

                  {/* Botón Eliminar (derecha) */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      eliminarReparacion(rep.id);
                    }}
                    className="flex items-center justify-center h-[48px] w-[48px] rounded-lg bg-slate-800/50 border border-slate-700 hover:bg-slate-700 text-red-400 transition-colors shrink-0"
                    title="Eliminar reparación"
                  >
                    <Trash2 className="w-[24px] h-[24px]" />
                  </button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <ImageViewer open={!!viewerMatricula} matricula={viewerMatricula ?? ''} onClose={() => setViewerMatricula(null)} />

      <GlobalImageViewer
        isOpen={!!fotosExpandida}
        onClose={() => setFotosExpandida(null)}
        images={(reparaciones.find(r => r.id === fotosExpandida)?.fotos ?? []).map(fotoUrl)}
        onAddImage={async (dataUrl) => {
          // Fallback to "durante" if added globally without custom action (though hidden in UI)
          if (!fotosExpandida) return;
          const r = reparaciones.find(x => x.id === fotosExpandida);
          if (r) {
            const nuevasFotos = [...(r.fotos ?? []), `durante:${dataUrl}`];
            await supabase.from('reparaciones').update({ fotos: nuevasFotos }).eq('id', fotosExpandida);
            await loadReparaciones();
            if (selected?.id === fotosExpandida) setSelected({ ...r, fotos: nuevasFotos });
          }
        }}
        onDeleteImage={async (index) => {
          if (fotosExpandida) await handleDeleteReparacionFoto(fotosExpandida, index)
        }}
        title="Fotos de la Reparación"
        customAction={
          <div className="flex gap-2 justify-center w-full">
            {(['antes', 'durante', 'despues'] as Fase[]).map(fase => (
              <label key={fase} className={`cursor-pointer flex flex-col items-center justify-center gap-1 w-20 h-20 p-1 text-xs transition-colors font-medium rounded-xl border-2 border-dashed ${subiendoFoto ? 'bg-bg-800 border-bg-700 text-slate-500' : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-500 hover:bg-cyan-500/20'}`}>
                <Camera className="w-6 h-6" />
                <span className="capitalize">{fase}</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => fotosExpandida && handleAddFoto(e, fase, fotosExpandida)} disabled={subiendoFoto} />
              </label>
            ))}
          </div>
        }
      />
    </div>
  )
}
