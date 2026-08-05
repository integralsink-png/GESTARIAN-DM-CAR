import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Configuracion } from '../lib/types'
import { PageHeader, Card, Button, Input } from '../components/UI'
import { useTheme } from '../lib/theme'
import { Save, Building2, Mail, Image as ImageIcon, Palette, Volume2, Sparkles, Sun, Moon, History, LayoutTemplate, Type } from 'lucide-react'
import { CommunicationHistoryModal } from '../components/CommunicationHistoryModal'

export function ConfiguracionPage() {
  const [config, setConfig] = useState<Configuracion | null>(null)
  const [apiKey, setApiKey] = useState(localStorage.getItem('gestarian_groq_api_key') || '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')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const { themeSettings, setThemeSettings, saveThemeToDB, playSound, appearance, setAppearance } = useTheme()

  useEffect(() => {
    loadConfig()
  }, [])

  async function loadConfig() {
    const { data } = await supabase.from('configuracion').select('*').eq('id', 1).maybeSingle()
    if (data) {
      setConfig(data)
    } else {
      setConfig({
        id: 1,
        nombre_empresa: '',
        cif: '',
        direccion: '',
        telefono: '',
        email: '',
        email_gestoria: '',
        logo_color: '',
        logo_bn: '',
        fondo_landscape: '',
        fondo_portrait: '',
        tipo_empresa: 'empresa'
      } as any)
    }
  }

  async function handleSave() {
    if (!config) return
    setSaving(true)
    await supabase.from('configuracion').upsert({
      id: 1,
      nombre_empresa: config.nombre_empresa,
      cif: config.cif,
      direccion: config.direccion,
      telefono: config.telefono,
      email: config.email,
      email_gestoria: config.email_gestoria,
      logo_color: config.logo_color,
      logo_bn: config.logo_bn,
      fondo_landscape: config.fondo_landscape,
      fondo_portrait: config.fondo_portrait,
      tipo_empresa: config.tipo_empresa,
    }).eq('id', 1)
    
    await saveThemeToDB(themeSettings)
    // Legacy theme save for fallback
    await supabase.from('configuracion').upsert({
      id: 1,
      color_fondo: appearance.color_fondo,
      color_texto: appearance.color_texto,
      color_glow_botones: appearance.color_glow_botones,
      color_linea_botones: appearance.color_linea_botones,
      color_relleno_campo: appearance.color_relleno_campo,
      color_relleno_botones: appearance.color_relleno_botones,
      color_relleno_paneles: appearance.color_relleno_paneles,
      modo_diurno: appearance.modo_diurno,
      animaciones_activadas: appearance.animaciones_activadas,
      sonido_activado: appearance.sonido_activado,
    }).eq('id', 1)

    setSaving(false)
    setSaved(true)
    playSound('success')
    setTimeout(() => setSaved(false), 2000)
  }

  if (!config) return <div className="text-center py-16 text-slate-500">Cargando...</div>

  return (
    <div>
      <PageHeader title="Configuración" subtitle="Datos de la empresa, apariencia visual y preferencias">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Guardando...' : saved ? 'Guardado ✓' : 'Guardar'}
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Datos fiscales */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5 text-[var(--primary)]" />
            <h2 className="text-lg font-semibold text-white">Datos Fiscales</h2>
          </div>
          <div className="space-y-3">
            <Input label="Nombre empresa" value={config.nombre_empresa} onChange={(v) => setConfig({ ...config, nombre_empresa: v })} />
            <Input label="CIF / NIF" value={config.cif} onChange={(v) => setConfig({ ...config, cif: v })} />
            <Input label="Dirección" value={config.direccion} onChange={(v) => setConfig({ ...config, direccion: v })} />
            <Input label="Teléfono" value={config.telefono ?? ''} onChange={(v) => setConfig({ ...config, telefono: v })} />
            <Input label="Email" value={config.email ?? ''} onChange={(v) => setConfig({ ...config, email: v })} type="email" />
            <div>
              <label className="block text-sm text-slate-400 mb-2">Tipo de empresa</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfig({ ...config, tipo_empresa: 'autonomo' })}
                  className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    config.tipo_empresa === 'autonomo'
                      ? 'gestarian-btn-primary gestarian-btn bg-[var(--btn-color)] text-white border-[var(--btn-color)]'
                      : 'gestarian-btn gestarian-btn-secondary border-slate-700'
                  }`}
                >
                  Autónomo
                </button>
                <button
                  onClick={() => setConfig({ ...config, tipo_empresa: 'sociedad_limitada' })}
                  className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    config.tipo_empresa === 'sociedad_limitada'
                      ? 'gestarian-btn-primary gestarian-btn bg-[var(--btn-color)] text-white border-[var(--btn-color)]'
                      : 'gestarian-btn gestarian-btn-secondary border-slate-700'
                  }`}
                >
                  Sociedad Limitada
                </button>
              </div>
            </div>
          </div>
        </Card>

        {/* Gestoría & Comunicaciones */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-[var(--primary)]" />
              <h2 className="text-lg font-semibold text-white">Comunicaciones & Gestoría</h2>
            </div>
            <button
              type="button"
              onClick={() => setShowHistoryModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-xs font-semibold border border-indigo-500/40 transition-colors"
            >
              <History className="w-4 h-4" /> Historial de Envíos
            </button>
          </div>
          <div className="space-y-3">
            <Input label="Email gestoría" value={config.email_gestoria ?? ''} onChange={(v) => setConfig({ ...config, email_gestoria: v })} type="email" placeholder="gestoria@asessoria.es" />
            <p className="text-xs text-slate-500">
              A este email se enviarán automáticamente las facturas y los informes trimestrales.
            </p>
          </div>
        </Card>

        <CommunicationHistoryModal
          isOpen={showHistoryModal}
          onClose={() => setShowHistoryModal(false)}
        />

        {/* Inteligencia Artificial METIS */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-semibold text-white">Inteligencia Artificial METIS</h2>
          </div>
          <div className="space-y-3">
            <Input
              label="Clave API de Groq (Llama 3)"
              value={apiKey}
              onChange={(v) => {
                setApiKey(v)
                localStorage.setItem('gestarian_groq_api_key', v)
              }}
              type="text"
              placeholder="gsk_..."
            />
            <p className="text-xs text-slate-400">
              METIS funciona de forma ultrarrápida utilizando el modelo Llama 3 a través de Groq. Puedes obtener tu clave gratuita en <a href="https://console.groq.com" target="_blank" rel="noreferrer" className="text-cyan-400 underline">console.groq.com</a>.
            </p>
          </div>
        </Card>

        {/* Logos and Media */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <ImageIcon className="w-5 h-5 text-[var(--primary)]" />
            <h2 className="text-lg font-semibold text-white">Multimedia y Marca</h2>
          </div>
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            <div>
              <p className="text-sm text-slate-400 mb-2">Nombre comercial (mostrado en interfaz)</p>
              <Input label="" value={themeSettings.commercial_name ?? ''} onChange={(v) => setThemeSettings({ ...themeSettings, commercial_name: v })} placeholder="Ej: Talleres Paco" />
            </div>
            <div>
              <p className="text-sm text-slate-400 mb-2">Logo del taller (Principal)</p>
              <div className="flex items-center gap-3">
                {themeSettings.logo_url && <img src={themeSettings.logo_url} alt="Logo" className="w-12 h-12 rounded-lg object-contain bg-white/10" />}
                <Input label="" value={themeSettings.logo_url ?? ''} onChange={(v) => setThemeSettings({ ...themeSettings, logo_url: v })} placeholder="URL del logo" />
              </div>
            </div>
            <div>
              <p className="text-sm text-slate-400 mb-2">Logo pantalla de inicio</p>
              <Input label="" value={themeSettings.logo_inicio_url ?? ''} onChange={(v) => setThemeSettings({ ...themeSettings, logo_inicio_url: v })} placeholder="URL del logo para el inicio" />
            </div>
            <div>
              <p className="text-sm text-slate-400 mb-2">Imagen de Dashboard</p>
              <Input label="" value={themeSettings.dashboard_image_url ?? ''} onChange={(v) => setThemeSettings({ ...themeSettings, dashboard_image_url: v })} placeholder="URL de la imagen" />
            </div>
            <div>
              <p className="text-sm text-slate-400 mb-2">Imagen de fondo</p>
              <Input label="" value={themeSettings.background_image_url ?? ''} onChange={(v) => setThemeSettings({ ...themeSettings, background_image_url: v })} placeholder="URL de la imagen de fondo" />
            </div>
            <div>
              <p className="text-sm text-slate-400 mb-2">Favicon (Icono pestaña)</p>
              <Input label="" value={themeSettings.favicon_url ?? ''} onChange={(v) => setThemeSettings({ ...themeSettings, favicon_url: v })} placeholder="URL del favicon (.ico o .png)" />
            </div>
            
            <hr className="border-slate-800" />
            
            {/* Legacy Logos */}
            <div>
              <p className="text-sm text-slate-400 mb-2">Logo a color (Documentos)</p>
              <Input label="" value={config.logo_color ?? ''} onChange={(v) => setConfig({ ...config, logo_color: v })} placeholder="URL del logo a color" />
            </div>
            <div>
              <p className="text-sm text-slate-400 mb-2">Logo blanco y negro (Documentos)</p>
              <Input label="" value={config.logo_bn ?? ''} onChange={(v) => setConfig({ ...config, logo_bn: v })} placeholder="URL del logo B/N" />
            </div>
          </div>
        </Card>

        {/* Personalización Visual Avanzada */}
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-6">
            <Palette className="w-5 h-5 text-[var(--primary)]" />
            <h2 className="text-lg font-semibold text-white">Personalización Visual (Theming)</h2>
          </div>
          
          <div className="space-y-8">
            {/* Global Settings */}
            <div>
              <h3 className="text-sm font-medium text-slate-300 mb-4 flex items-center gap-2"><LayoutTemplate className="w-4 h-4" /> Layout y Estilo Global</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <ToggleRow
                  icon={themeSettings.is_dark_mode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                  label={themeSettings.is_dark_mode ? 'Modo Oscuro' : 'Modo Claro'}
                  description=""
                  checked={themeSettings.is_dark_mode}
                  onChange={(v) => { setThemeSettings({ ...themeSettings, is_dark_mode: v }); setAppearance({ ...appearance, modo_diurno: !v }); playSound('click') }}
                />
                
                <div>
                  <label className="block text-xs text-slate-400 mb-2">Bordes (Radius)</label>
                  <select 
                    value={themeSettings.border_radius} 
                    onChange={(e) => setThemeSettings({ ...themeSettings, border_radius: e.target.value })}
                    className="w-full bg-bg-700 border border-bg-600 rounded-lg px-3 py-2 text-sm text-white"
                  >
                    <option value="0">Cuadrado (0px)</option>
                    <option value="0.25rem">Suave (4px)</option>
                    <option value="0.5rem">Normal (8px)</option>
                    <option value="1rem">Redondeado (16px)</option>
                    <option value="9999px">Píldora</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs text-slate-400 mb-2">Sombras</label>
                  <select 
                    value={themeSettings.shadows} 
                    onChange={(e) => setThemeSettings({ ...themeSettings, shadows: e.target.value })}
                    className="w-full bg-bg-700 border border-bg-600 rounded-lg px-3 py-2 text-sm text-white"
                  >
                    <option value="none">Sin sombra</option>
                    <option value="sm">Pequeña</option>
                    <option value="md">Media</option>
                    <option value="lg">Grande</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-2">Espaciado General</label>
                  <select 
                    value={themeSettings.spacing} 
                    onChange={(e) => setThemeSettings({ ...themeSettings, spacing: e.target.value })}
                    className="w-full bg-bg-700 border border-bg-600 rounded-lg px-3 py-2 text-sm text-white"
                  >
                    <option value="compact">Compacto</option>
                    <option value="normal">Normal</option>
                    <option value="relaxed">Relajado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-2">Densidad Visual</label>
                  <select 
                    value={themeSettings.visual_density} 
                    onChange={(e) => setThemeSettings({ ...themeSettings, visual_density: e.target.value })}
                    className="w-full bg-bg-700 border border-bg-600 rounded-lg px-3 py-2 text-sm text-white"
                  >
                    <option value="compact">Compacta</option>
                    <option value="normal">Normal</option>
                    <option value="comfortable">Cómoda</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Typography */}
            <div>
              <h3 className="text-sm font-medium text-slate-300 mb-4 flex items-center gap-2"><Type className="w-4 h-4" /> Tipografía</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-2">Fuente Principal</label>
                  <select 
                    value={themeSettings.typography} 
                    onChange={(e) => setThemeSettings({ ...themeSettings, typography: e.target.value })}
                    className="w-full bg-bg-700 border border-bg-600 rounded-lg px-3 py-2 text-sm text-white"
                  >
                    <option value="Inter, sans-serif">Inter</option>
                    <option value="Roboto, sans-serif">Roboto</option>
                    <option value="'Open Sans', sans-serif">Open Sans</option>
                    <option value="'Segoe UI', sans-serif">Segoe UI</option>
                    <option value="system-ui, sans-serif">System UI</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-2">Tamaño Base</label>
                  <select 
                    value={themeSettings.font_size} 
                    onChange={(e) => setThemeSettings({ ...themeSettings, font_size: e.target.value })}
                    className="w-full bg-bg-700 border border-bg-600 rounded-lg px-3 py-2 text-sm text-white"
                  >
                    <option value="12px">Pequeño (12px)</option>
                    <option value="14px">Normal (14px)</option>
                    <option value="16px">Grande (16px)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Imágenes y Marca */}
            <div>
              <h3 className="text-sm font-medium text-slate-300 mb-4 flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Imágenes y Marca (Theming)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Nombre Comercial Mostrado" value={themeSettings.commercial_name ?? ''} onChange={(v) => setThemeSettings({ ...themeSettings, commercial_name: v })} />
                <Input label="Logo del Taller (URL)" value={themeSettings.logo_url ?? ''} onChange={(v) => setThemeSettings({ ...themeSettings, logo_url: v })} />
                <Input label="Logo Pantalla de Inicio (URL)" value={themeSettings.logo_inicio_url ?? ''} onChange={(v) => setThemeSettings({ ...themeSettings, logo_inicio_url: v })} />
                <Input label="Imagen del Dashboard (URL)" value={themeSettings.dashboard_image_url ?? ''} onChange={(v) => setThemeSettings({ ...themeSettings, dashboard_image_url: v })} />
                <Input label="Imagen de Fondo (URL)" value={themeSettings.background_image_url ?? ''} onChange={(v) => setThemeSettings({ ...themeSettings, background_image_url: v })} />
                <Input label="Favicon (URL)" value={themeSettings.favicon_url ?? ''} onChange={(v) => setThemeSettings({ ...themeSettings, favicon_url: v })} />
              </div>
            </div>

            {/* Colors */}
            <div>
              <h3 className="text-sm font-medium text-slate-300 mb-4 flex items-center gap-2"><Palette className="w-4 h-4" /> Paleta de Colores</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <ColorPicker
                  label="Color Principal"
                  value={themeSettings.primary_color}
                  onChange={(v) => {
                    setThemeSettings({ ...themeSettings, primary_color: v })
                    setAppearance({ ...appearance, color_glow_botones: v })
                  }}
                />
                <ColorPicker
                  label="Color Secundario"
                  value={themeSettings.secondary_color}
                  onChange={(v) => {
                    setThemeSettings({ ...themeSettings, secondary_color: v })
                    setAppearance({ ...appearance, color_linea_botones: v })
                  }}
                />
                <ColorPicker
                  label="Botones"
                  value={themeSettings.button_color}
                  onChange={(v) => {
                    setThemeSettings({ ...themeSettings, button_color: v })
                    setAppearance({ ...appearance, color_relleno_botones: v })
                  }}
                />
                <ColorPicker
                  label="Iconos"
                  value={themeSettings.icon_color}
                  onChange={(v) => setThemeSettings({ ...themeSettings, icon_color: v })}
                />
                <ColorPicker
                  label="Avisos (Warning)"
                  value={themeSettings.warning_color}
                  onChange={(v) => setThemeSettings({ ...themeSettings, warning_color: v })}
                />
                <ColorPicker
                  label="Éxito (Success)"
                  value={themeSettings.success_color}
                  onChange={(v) => setThemeSettings({ ...themeSettings, success_color: v })}
                />
                <ColorPicker
                  label="Errores (Error)"
                  value={themeSettings.error_color}
                  onChange={(v) => setThemeSettings({ ...themeSettings, error_color: v })}
                />
                <ColorPicker
                  label="Fondo del Dashboard"
                  value={themeSettings.dashboard_color}
                  onChange={(v) => {
                    setThemeSettings({ ...themeSettings, dashboard_color: v })
                    setAppearance({ ...appearance, color_fondo: v })
                  }}
                />
                <ColorPicker
                  label="Fondo de Tarjetas"
                  value={themeSettings.card_color}
                  onChange={(v) => {
                    setThemeSettings({ ...themeSettings, card_color: v })
                    setAppearance({ ...appearance, color_relleno_paneles: v })
                  }}
                />
                <ColorPicker
                  label="Fondo de Tablas"
                  value={themeSettings.table_color}
                  onChange={(v) => setThemeSettings({ ...themeSettings, table_color: v })}
                />
                <ColorPicker
                  label="Fondo de Cabeceras"
                  value={themeSettings.header_color}
                  onChange={(v) => setThemeSettings({ ...themeSettings, header_color: v })}
                />
                <ColorPicker
                  label="Color de Notificaciones"
                  value={themeSettings.notification_color}
                  onChange={(v) => setThemeSettings({ ...themeSettings, notification_color: v })}
                />
              </div>
            </div>

          </div>
        </Card>

        {/* Preferencias: animaciones y sonido */}
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-[var(--primary)]" />
            <h2 className="text-lg font-semibold text-white">Preferencias de Experiencia</h2>
          </div>
          <div className="space-y-4">
            <ToggleRow
              icon={<Sparkles className="w-5 h-5" />}
              label="Animaciones"
              description="Activa o desactiva las animaciones de la interfaz"
              checked={appearance.animaciones_activadas}
              onChange={(v) => setAppearance({ ...appearance, animaciones_activadas: v })}
            />
            <ToggleRow
              icon={<Volume2 className="w-5 h-5" />}
              label="Sonido"
              description="Activa o desactiva los efectos de sonido al interactuar"
              checked={appearance.sonido_activado}
              onChange={(v) => { setAppearance({ ...appearance, sonido_activado: v }); if (v) playSound('success') }}
            />
          </div>
        </Card>
      </div>

      <div className="mt-6 flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          <span className="flex items-center gap-2"><Save className="w-4 h-4" /> {saving ? 'Guardando...' : saved ? 'Guardado ✓' : 'Guardar cambios'}</span>
        </Button>
      </div>
    </div>
  )
}

function ColorPicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded-md cursor-pointer bg-transparent border border-bg-600 shrink-0"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-bg-700 border border-bg-600 rounded-md px-2 py-1.5 text-xs text-white focus:outline-none focus:border-[var(--primary)]"
        />
      </div>
    </div>
  )
}

function ToggleRow({
  icon,
  label,
  description,
  checked,
  onChange,
}: {
  icon: React.ReactNode
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-3 bg-bg-700 rounded-lg">
      <div className="flex items-center gap-3">
        <div className="text-[var(--primary)]">{icon}</div>
        <div>
          <p className="text-sm font-medium text-white">{label}</p>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
          checked ? 'bg-[var(--primary)]' : 'bg-bg-600'
        }`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-200 ${
          checked ? 'translate-x-6' : ''
        }`} />
      </button>
    </div>
  )
}
