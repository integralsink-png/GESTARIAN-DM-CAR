import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { PageHeader, Card, Button, Badge, EmptyState } from '../components/UI'
import { 
  ArrowLeft, Users, ShieldCheck, ShieldAlert, Calendar, Mail, 
  Trash2, UserCheck, UserX, Clock, CreditCard, Search
} from 'lucide-react'

export function LicenciasPage() {
  const navigate = useNavigate()
  const [licencias, setLicencias] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadLicencias()
  }, [])

  async function loadLicencias() {
    setLoading(true)
    const { data } = await supabase.from('gestarian_licencias').select('*').order('created_at', { ascending: false })
    setLicencias(data || [])
    setLoading(false)
  }

  async function toggleEstado(id: string, estadoActual: string) {
    const nuevoEstado = estadoActual === 'activo' ? 'bloqueado' : 'activo'
    const { error } = await supabase.from('gestarian_licencias').update({ 
        estado_licencia: nuevoEstado,
        suscripcion_activa: nuevoEstado === 'activo'
    }).eq('id', id)
    
    if (!error) loadLicencias()
  }

  async function extenderPrueba(id: string) {
    const { error } = await supabase.from('gestarian_licencias').update({ 
        fecha_fin_prueba: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        estado_licencia: 'prueba'
    }).eq('id', id)
    
    if (!error) loadLicencias()
  }

  const filtradas = licencias.filter(l => 
    l.email.toLowerCase().includes(search.toLowerCase()) || 
    (l.nombre_profesional || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6 pb-20">
      <PageHeader title="GESTIÓN DE LICENCIAS" subtitle="Administración de suscripciones profesionales GESTARIAN">
        <button onClick={() => navigate(-1)} className="gestarian-nav-btn w-12 h-12 flex items-center justify-center rounded-xl bg-bg-800 border border-bg-700">
          <ArrowLeft className="w-6 h-6" />
        </button>
      </PageHeader>

      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input 
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por taller o email..."
            className="w-full pl-10 pr-4 py-3 bg-bg-800 border border-bg-700 rounded-xl text-sm text-white focus:border-cyan-500 outline-none"
          />
        </div>
        <div className="flex gap-2">
            <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                <p className="text-[10px] font-bold text-emerald-500 uppercase">Activos</p>
                <p className="text-lg font-black text-white">{licencias.filter(l => l.estado_licencia === 'activo').length}</p>
            </div>
            <div className="px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <p className="text-[10px] font-bold text-amber-500 uppercase">En Prueba</p>
                <p className="text-lg font-black text-white">{licencias.filter(l => l.estado_licencia === 'prueba').length}</p>
            </div>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-500">Cargando licencias...</div>
      ) : filtradas.length === 0 ? (
        <EmptyState icon={<Users className="w-12 h-12" />} title="No hay licencias" subtitle="No se han encontrado usuarios profesionales." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtradas.map(l => (
            <Card key={l.id} className={`p-5 border-l-4 ${
                l.estado_licencia === 'activo' ? 'border-l-emerald-500' : 
                l.estado_licencia === 'prueba' ? 'border-l-amber-500' : 'border-l-rose-500'
            }`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-lg">{l.nombre_profesional || 'Sin nombre'}</h3>
                    <Badge text={l.estado_licencia.toUpperCase()} color={
                        l.estado_licencia === 'activo' ? 'green' : 
                        l.estado_licencia === 'prueba' ? 'yellow' : 'red'
                    } />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                    <Mail className="w-3 h-3" /> {l.email}
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-2">
                    <button 
                        onClick={() => toggleEstado(l.id, l.estado_licencia)}
                        className={`p-2 rounded-lg transition-colors ${
                            l.estado_licencia === 'activo' ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                        }`}
                        title={l.estado_licencia === 'activo' ? 'Bloquear Suscripción' : 'Activar Suscripción'}
                    >
                        {l.estado_licencia === 'activo' ? <UserX className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
                    </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-bg-700">
                <div>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase">
                        <Clock className="w-3 h-3" /> Fin Prueba / Vencimiento
                    </div>
                    <p className="text-sm font-mono text-white mt-0.5">
                        {new Date(l.fecha_fin_prueba).toLocaleDateString('es-ES')}
                    </p>
                </div>
                <div>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase">
                        <CreditCard className="w-3 h-3" /> Suscripción Activa
                    </div>
                    <p className={`text-sm font-black mt-0.5 ${l.suscripcion_activa ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {l.suscripcion_activa ? 'SÍ (ABONADA)' : 'NO (PENDIENTE)'}
                    </p>
                </div>
              </div>

              <div className="flex gap-2 mt-5">
                <Button variant="secondary" size="sm" onClick={() => extenderPrueba(l.id)} className="flex-1 text-[10px]">
                    Extender Prueba +15 días
                </Button>
                <Button variant="danger" size="sm" onClick={() => {}} className="px-3">
                    <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="p-6 bg-cyan-500/5 border border-cyan-500/20 rounded-2xl">
          <div className="flex items-center gap-3 mb-2">
            <ShieldCheck className="w-6 h-6 text-cyan-400" />
            <h4 className="font-black text-white uppercase tracking-tight">Reglas de Negocio GESTARIAN</h4>
          </div>
          <ul className="text-xs text-slate-400 space-y-2 list-disc pl-5 leading-relaxed">
              <li>Los nuevos usuarios registrados entran automáticamente en estado <strong>PRUEBA</strong> durante 30 días.</li>
              <li>Al finalizar los 30 días, si no se ha marcado como <strong>ACTIVO</strong>, la aplicación se bloqueará para ese usuario.</li>
              <li>Como administrador, puedes <strong>BLOQUEAR</strong> manualmente cualquier cuenta en cualquier momento.</li>
              <li>El botón "Extender Prueba" permite dar una cortesía de 15 días adicionales sin necesidad de pago.</li>
          </ul>
      </div>
    </div>
  )
}
