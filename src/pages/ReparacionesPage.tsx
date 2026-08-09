import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Reparacion, Cliente, Vehiculo } from '../lib/types'
import { PageHeader, Card, Button, Badge, EmptyState, MetisRowButton } from '../components/UI'
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

  useEffect(() => {
    loadReparaciones()
    loadClientes()
    loadVehiculos()
  }, [])

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

  async function crearReparacionDesdeCita() {
    if (!navState?.clienteId) return
    await supabase.from('reparaciones').insert({
      cita_id: navState.citaId ?? null,
      cliente_id: navState.clienteId,
      vehiculo_id: navState.vehiculoId ?? null,
      estado: 'en_proceso',
    })
    navigate('/reparaciones', { replace: true })
    loadReparaciones()
  }

  useEffect(() => {
    if (navState?.citaId) {
      crearReparacionDesdeCita()
    }
  }, [navState?.citaId])

  async function cambiarEstado(id: string, estado: 'en_proceso' | 'finalizado') {
    await supabase.from('reparaciones').update({ estado }).eq('id', id)
    loadReparaciones()
    if (selected?.id === id) {
      setSelected({ ...selected, estado })
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
                <MetisRowButton
                  tipo="reparacion"
                  id={selected.id}
                  matricula={selected.vehiculo_id ? vehiculos[selected.vehiculo_id]?.matricula : undefined}
                  cliente_nombre={clienteNombre(selected.cliente_id)}
                  data={selected}
                />
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
            <Card key={rep.id} className="p-4 hover:border-cyan-500/40 transition-all cursor-pointer" onClick={() => { setSelected(rep); setEditDesc(rep.descripcion ?? '') }}>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white text-base">{clienteNombre(rep.cliente_id)}</span>
                    <Badge
                      text={rep.estado === 'en_proceso' ? 'EN PROCESO' : 'FINALIZADA'}
                      color={rep.estado === 'en_proceso' ? 'blue' : 'green'}
                    />
                  </div>
                  {vehiculoInfo(rep.vehiculo_id) && (
                    <p className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                      <Car className="w-3.5 h-3.5 text-slate-400" />{vehiculoInfo(rep.vehiculo_id)}
                    </p>
                  )}
                  {rep.descripcion && (
                    <p className="text-xs text-slate-400 mt-1 line-clamp-1 italic">
                      "{rep.descripcion}"
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap ml-auto" onClick={(e) => e.stopPropagation()}>
                  <MetisRowButton
                    tipo="reparacion"
                    id={rep.id}
                    matricula={rep.vehiculo_id ? vehiculos[rep.vehiculo_id]?.matricula : undefined}
                    cliente_nombre={clienteNombre(rep.cliente_id)}
                    data={rep}
                  />

                  {rep.estado === 'en_proceso' ? (
                    <Button size="sm" onClick={() => cambiarEstado(rep.id, 'finalizado')}>
                      Finalizar Taller
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => navigate('/facturas', { state: { reparacionId: rep.id, clienteId: rep.cliente_id, vehiculoId: rep.vehiculo_id } })}>
                      <span className="flex items-center gap-1"><FileText className="w-4 h-4" /> Facturar</span>
                    </Button>
                  )}

                  <button
                    onClick={() => eliminarReparacion(rep.id)}
                    className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold border border-red-500/20 transition-all"
                    title="Eliminar reparación"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
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
