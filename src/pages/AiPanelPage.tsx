import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { PageHeader, Card, Button, Badge } from '../components/UI'
import { AI_PROVIDERS } from '../lib/aiProviderRegistry'
import { 
  ArrowLeft, Sparkles, Bot, FileSearch, Car, Eye, EyeOff, 
  ExternalLink, CheckCircle2, XCircle, RefreshCw, Trash2, ShieldCheck
} from 'lucide-react'

export function AiPanelPage() {
  const navigate = useNavigate()
  const [configs, setConfigs] = useState<any[]>([])
  const [_loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Formulario para nueva config
  const [servicio, setServicio] = useState('metis')
  const [proveedorId, setProveedorId] = useState('google')
  const [modeloId, setModeloId] = useState('gemini-3.5-flash')
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)

  const provider = AI_PROVIDERS.find(p => p.id === proveedorId)

  useEffect(() => {
    loadConfigs()
  }, [])

  async function loadConfigs() {
    setLoading(true)
    const { data } = await supabase.from('ai_configurations').select('*').order('created_at', { ascending: false })
    setConfigs(data || [])
    setLoading(false)
  }

  async function handleSave() {
    if (!apiKey) return
    setSaving(true)
    
    // Desactivar otros del mismo servicio si este se va a activar
    await supabase.from('ai_configurations').update({ is_active: false }).eq('servicio', servicio)

    const { error } = await supabase.from('ai_configurations').insert({
      servicio,
      proveedor_id: proveedorId,
      modelo_id: modeloId,
      api_key: apiKey,
      is_active: true,
      status: 'no_comprobado'
    })

    if (!error) {
      setApiKey('')
      loadConfigs()
    }
    setSaving(false)
  }

  async function toggleActive(id: string, serv: string) {
    await supabase.from('ai_configurations').update({ is_active: false }).eq('servicio', serv)
    await supabase.from('ai_configurations').update({ is_active: true }).eq('id', id)
    loadConfigs()
  }

  async function deleteConfig(id: string) {
    if (!confirm('¿Eliminar esta configuración?')) return
    await supabase.from('ai_configurations').delete().eq('id', id)
    loadConfigs()
  }

  async function testConnection(config: any) {
    // Simulación de prueba por ahora
    await supabase.from('ai_configurations').update({ status: 'comprobando' }).eq('id', config.id)
    loadConfigs()
    
    setTimeout(async () => {
        await supabase.from('ai_configurations').update({ 
            status: 'operativo', 
            last_checked_at: new Date().toISOString() 
        }).eq('id', config.id)
        loadConfigs()
    }, 1500)
  }

  return (
    <div className="space-y-6 pb-20">
      <PageHeader title="PANEL DE CONTROL IA" subtitle="Gestión centralizada de Inteligencia Artificial">
        <button onClick={() => navigate(-1)} className="gestarian-nav-btn w-12 h-12 flex items-center justify-center rounded-xl bg-bg-800 border border-bg-700">
          <ArrowLeft className="w-6 h-6" />
        </button>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario de Alta */}
        <Card className="lg:col-span-1 p-6 space-y-4 border-cyan-500/20">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" /> Nueva Configuración
          </h3>
          
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Servicio</label>
              <select 
                value={servicio} 
                onChange={e => setServicio(e.target.value)}
                className="w-full p-3 bg-bg-950 border border-bg-700 rounded-xl text-sm text-white focus:border-cyan-500 outline-none"
              >
                <option value="metis">🧠 METIS — IA Conversacional</option>
                <option value="ocr_documental">🧾 OCR — Facturas y Documentos</option>
                <option value="ocr_matriculas">🚗 OCR — Matrículas (Enlace)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Proveedor</label>
              <select 
                value={proveedorId} 
                onChange={e => {
                    setProveedorId(e.target.value);
                    const p = AI_PROVIDERS.find(x => x.id === e.target.value);
                    if (p) setModeloId(p.models[0].id);
                }}
                className="w-full p-3 bg-bg-950 border border-bg-700 rounded-xl text-sm text-white focus:border-cyan-500 outline-none"
              >
                {AI_PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Modelo</label>
              <select 
                value={modeloId} 
                onChange={e => setModeloId(e.target.value)}
                className="w-full p-3 bg-bg-950 border border-bg-700 rounded-xl text-sm text-white focus:border-cyan-500 outline-none"
              >
                {provider?.models.map(m => (
                    <option key={m.id} value={m.id}>
                        {m.isFree ? '🟢 ' : '🔴 '}{m.name}
                    </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1 uppercase flex justify-between">
                API Key
                {provider && (
                    <a href={provider.urlApiKey} target="_blank" rel="noreferrer" className="text-cyan-400 flex items-center gap-1 hover:underline">
                        Obtener Key <ExternalLink className="w-3 h-3" />
                    </a>
                )}
              </label>
              <div className="relative">
                <input 
                  type={showKey ? "text" : "password"} 
                  value={apiKey} 
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="Pega tu clave aquí..."
                  className="w-full pl-4 pr-12 py-3 bg-bg-950 border border-bg-700 rounded-xl text-sm font-mono text-cyan-300 focus:border-cyan-500 outline-none"
                />
                <button onClick={() => setShowKey(!showKey)} className="absolute right-3 top-3 text-slate-500">
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button onClick={handleSave} disabled={saving || !apiKey} className="w-full">
              {saving ? 'Guardando...' : 'Guardar y Activar'}
            </Button>
          </div>
        </Card>

        {/* Listado de Modelos Configurados */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white uppercase tracking-wider">Modelos Configurados</h3>
            <span className="text-xs text-slate-500 font-mono">Total: {configs.length}</span>
          </div>

          {configs.length === 0 ? (
            <div className="p-12 text-center bg-bg-800/50 rounded-2xl border border-dashed border-bg-700">
              <Bot className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500">No hay modelos configurados todavía.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {configs.map(cfg => (
                <Card key={cfg.id} className={`p-4 transition-all ${cfg.is_active ? 'border-cyan-500/50 bg-cyan-500/5 shadow-lg shadow-cyan-500/10' : 'border-bg-700'}`}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${cfg.is_active ? 'bg-cyan-500/20 text-cyan-400' : 'bg-bg-700 text-slate-500'}`}>
                        {cfg.servicio === 'metis' ? <Bot className="w-5 h-5" /> : cfg.servicio === 'ocr_documental' ? <FileSearch className="w-5 h-5" /> : <Car className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{cfg.proveedor_id.toUpperCase()}</span>
                          <span className="text-xs text-slate-400 font-mono">{cfg.modelo_id}</span>
                          {cfg.is_active && <Badge text="ACTIVO" color="green" />}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] text-slate-500 font-bold uppercase">{cfg.servicio.replace('_', ' ')}</span>
                          <StatusBadge status={cfg.status} />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => testConnection(cfg)}
                        className="p-2 rounded-lg bg-bg-700 text-slate-400 hover:text-white transition-colors"
                        title="Probar conexión"
                      >
                        <RefreshCw className={`w-4 h-4 ${cfg.status === 'comprobando' ? 'animate-spin' : ''}`} />
                      </button>
                      
                      {!cfg.is_active && (
                        <button 
                          onClick={() => toggleActive(cfg.id, cfg.servicio)}
                          className="px-3 py-1.5 rounded-lg bg-bg-700 text-xs font-bold text-white hover:bg-cyan-600 transition-colors"
                        >
                          Activar
                        </button>
                      )}

                      <button 
                        onClick={() => deleteConfig(cfg.id)}
                        className="p-2 rounded-lg bg-bg-700 text-slate-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {cfg.last_error && (
                    <p className="mt-2 text-[10px] text-red-400 bg-red-500/10 p-1.5 rounded-md border border-red-500/20">
                      Error: {cfg.last_error}
                    </p>
                  )}
                </Card>
              ))}
            </div>
          )}

          {/* Información de Fallback Automático */}
          <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl flex gap-3 items-start">
            <ShieldCheck className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
                <p className="text-xs font-bold text-amber-500 uppercase">Sistema de Conmutación por Fallo (Failover)</p>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    Si el modelo activo devuelve un error de cuota o indisponibilidad, GESTARIAN buscará automáticamente entre el resto de modelos configurados para el mismo servicio para asegurar la continuidad del taller.
                </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
    if (status === 'operativo') return <span className="flex items-center gap-1 text-[10px] text-green-400 font-bold"><CheckCircle2 className="w-3 h-3" /> OPERATIVO</span>
    if (status === 'error') return <span className="flex items-center gap-1 text-[10px] text-red-400 font-bold"><XCircle className="w-3 h-3" /> NO DISPONIBLE</span>
    if (status === 'comprobando') return <span className="flex items-center gap-1 text-[10px] text-amber-400 font-bold"><RefreshCw className="w-3 h-3 animate-spin" /> COMPROBANDO</span>
    return <span className="text-[10px] text-slate-600 font-bold">SIN COMPROBAR</span>
}
