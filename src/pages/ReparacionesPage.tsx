import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Reparacion, Cliente, Vehiculo } from '../lib/types'
import { PageHeader, Card, Button, Badge, EmptyState, MetisRowButton } from '../components/UI'
import { Wrench, FileText, Camera, Mail, Save, X, Car, ImageIcon, Check, Trash2 } from 'lucide-react'
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

  function fotosPorFase(fotos: string[] | null, fase: Fase) {
    return (fotos ?? []).filter((f) => f.startsWith(`${fase}:`))
  }

  return (
    <div>
      <PageHeader title="Reparaciones" subtitle="Vehículos en taller y finalizados" />

      {loading ? (
        <div className="text-center py-16 text-slate-500">Cargando...</div>
      ) : selected ? (
        /* Vista detalle de reparación */
        <div className="space-y-4">
          <Button variant="ghost" onClick={() => setSelected(null)}>
            <span className="flex items-center gap-2"><X className="w-4 h-4" /> Volver al listado</span>
          </Button>

          <Card className="p-6">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
              <div>
                <h2 className="text-lg font-semibold text-white">{clienteNombre(selected.cliente_id)}</h2>
                {vehiculoInfo(selected.vehiculo_id) && (
                  <p className="flex items-center gap-1 text-sm text-slate-500 mt-1">
                    <Car className="w-3.5 h-3.5" />{vehiculoInfo(selected.vehiculo_id)}
                  </p>
                )}
              </div>
              <Badge text={selected.estado === 'en_proceso' ? 'En proceso' : 'Finalizado'} color={selected.estado === 'en_proceso' ? 'yellow' : 'green'} />
            </div>

            {/* Descripción editable */}
            <div className="mb-4">
              <label className="block text-sm text-slate-400 mb-1">Descripción del trabajo</label>
              <textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                placeholder="Describe el trabajo realizado..."
                rows={3}
                className="w-full bg-bg-700 border border-bg-600 rounded-lg px-3 py-2 text-white text-sm focus:border-cyan-500 focus:outline-none"
              />
              <Button size="sm" variant="secondary" className="mt-2" onClick={saveDescripcion} disabled={savingDesc}>
                <span className="flex items-center gap-1"><Save className="w-3.5 h-3.5" /> {savingDesc ? 'Guardando...' : 'Guardar'}</span>
              </Button>
            </div>

            {/* Fotos Integradas con GlobalImageViewer */}
            <div className="mb-4 flex items-center justify-between border border-bg-600 rounded-lg p-3 bg-bg-700">
              <div className="flex items-center gap-2 text-cyan-400">
                <ImageIcon className="w-5 h-5" />
                <span className="font-semibold">Fotos de la reparación ({(selected.fotos ?? []).length})</span>
              </div>
              <Button size="sm" onClick={() => setFotosExpandida(selected.id)}>Ver / Añadir Fotos</Button>
            </div>

            {/* Acciones */}
            <div className="flex gap-2 flex-wrap border-t border-bg-600 pt-4">
              {selected.estado === 'en_proceso' && (
                <Button onClick={() => cambiarEstado(selected.id, 'finalizado')}>
                  <span className="flex items-center gap-2"><Check className="w-4 h-4" /> Finalizar reparación</span>
                </Button>
              )}
              {selected.estado === 'finalizado' && (
                <>
                  <Button onClick={() => navigate('/facturas', { state: { reparacionId: selected.id, clienteId: selected.cliente_id, vehiculoId: selected.vehiculo_id } })}>
                    <span className="flex items-center gap-2"><FileText className="w-4 h-4" /> Generar factura</span>
                  </Button>
                  <Button variant="secondary" onClick={enviarEmailFinalizacion} disabled={sendingEmail}>
                    <span className="flex items-center gap-2"><Mail className="w-4 h-4" /> {sendingEmail ? 'Enviando...' : emailSent ? 'Email enviado ✓' : 'Enviar fotos + factura al cliente'}</span>
                  </Button>
                </>
              )}
              <Button variant="danger" onClick={() => eliminarReparacion(selected.id)} className="ml-auto">
                <span className="flex items-center gap-2"><Trash2 className="w-4 h-4" /> Eliminar</span>
              </Button>
            </div>
          </Card>
        </div>
      ) : reparaciones.length === 0 ? (
        <EmptyState icon={<Wrench className="w-12 h-12" />} title="No hay reparaciones" subtitle="Las reparaciones se crean desde citas confirmadas" />
      ) : (
        <div className="space-y-2">
          {reparaciones.map((r) => (
            <Card key={r.id} className="p-4 hover:border-bg-500 transition-colors cursor-pointer">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{clienteNombre(r.cliente_id)}</span>
                    <Badge text={r.estado === 'en_proceso' ? 'En proceso' : 'Finalizado'} color={r.estado === 'en_proceso' ? 'yellow' : 'green'} />
                  </div>
                  {vehiculoInfo(r.vehiculo_id) && (
                    <p className="flex items-center gap-1 text-xs text-slate-500 mt-1"><Car className="w-3 h-3" />{vehiculoInfo(r.vehiculo_id)}</p>
                  )}
                  {r.descripcion && <p className="text-sm text-slate-500 mt-1">{r.descripcion}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-2 sm:mt-0">
                  <MetisRowButton
                    tipo="reparacion"
                    id={r.id}
                    matricula={r.vehiculo_id ? vehiculos[r.vehiculo_id]?.matricula : undefined}
                    cliente_nombre={clienteNombre(r.cliente_id)}
                    data={r}
                  />
                  {r.vehiculo_id && vehiculos[r.vehiculo_id] && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setViewerMatricula(vehiculos[r.vehiculo_id!]!.matricula) }}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-bg-700 hover:bg-bg-600 text-slate-400 hover:text-cyan-400 text-xs font-semibold border border-bg-600"
                      title="Fotos del vehículo"
                    >
                      <Car className="w-3.5 h-3.5" /> FOTOS VEHÍCULO
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); setFotosExpandida(r.id); }}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      fotosExpandida === r.id 
                        ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' 
                        : 'bg-bg-700 hover:bg-bg-600 text-cyan-400 border-bg-600'
                    }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5" /> 
                    FOTOS REPARACIÓN
                    {(r.fotos ?? []).length > 0 && <span className="ml-1 px-1.5 bg-cyan-500/20 rounded-full">{(r.fotos ?? []).length}</span>}
                  </button>

                  {r.estado === 'en_proceso' && (
                    <Button size="sm" onClick={() => cambiarEstado(r.id, 'finalizado')}>Finalizar</Button>
                  )}
                  {r.estado === 'finalizado' && (
                    <Button size="sm" onClick={() => navigate('/facturas', { state: { reparacionId: r.id, clienteId: r.cliente_id, vehiculoId: r.vehiculo_id } }) }>
                      <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> Facturar</span>
                    </Button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); eliminarReparacion(r.id) }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold border border-red-500/20"
                    title="Eliminar reparación"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
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
