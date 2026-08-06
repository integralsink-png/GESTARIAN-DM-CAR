import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Configuracion, ThemePreset, ThemeSettings } from '../lib/types'
import { PageHeader, Card, Button } from '../components/UI'
import { useTheme, DEFAULT_THEME_SETTINGS } from '../lib/theme'
import { Box, Chip, FormControl, InputLabel, MenuItem, Select, Stack, Switch, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import { Save, Building2, Mail, Image as ImageIcon, Palette, Volume2, Sparkles, Sun, Moon, History, LayoutTemplate, Type } from 'lucide-react'
import { CommunicationHistoryModal } from '../components/CommunicationHistoryModal'

export function ConfiguracionPage() {
  const [config, setConfig] = useState<Configuracion | null>(null)
  const [apiKey, setApiKey] = useState(localStorage.getItem('gestarian_groq_api_key') || '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')
  const [hfKey, setHfKey] = useState(localStorage.getItem('gestarian_hf_api_key') || '')
  const [hfModel, setHfModel] = useState(localStorage.getItem('gestarian_hf_model') || 'meta-llama/Llama-2-7b-chat')
  const [themePreset, setThemePreset] = useState<ThemePreset>(DEFAULT_THEME_SETTINGS.theme_preset)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const { themeSettings, setThemeSettings, saveThemeToDB, playSound, appearance, setAppearance } = useTheme()

  const sharedTextFieldProps = {
    fullWidth: true,
    variant: 'filled' as const,
    InputProps: { sx: { bgcolor: '#111827', color: '#fff', borderRadius: '1rem' } },
    InputLabelProps: { sx: { color: '#94a3b8' } },
  }

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

  const handlePresetChange = useCallback((preset: ThemePreset) => {
    setThemePreset(preset)
    if (preset === 'classic') {
      setThemeSettings({ ...DEFAULT_THEME_SETTINGS, theme_preset: 'classic' })
    }
    if (preset === 'professional') {
      setThemeSettings({ ...DEFAULT_THEME_SETTINGS, theme_preset: 'professional', primary_color: '#0f172a', secondary_color: '#1e293b', button_color: '#059669', dashboard_color: '#0f172a', card_color: '#111827' })
    }
    if (preset === 'dark') {
      setThemeSettings({ ...DEFAULT_THEME_SETTINGS, theme_preset: 'dark', primary_color: '#0f172a', secondary_color: '#0f172a', button_color: '#8b5cf6', card_color: '#111827', dashboard_color: '#0b1220' })
    }
    if (preset === 'blue') {
      setThemeSettings({ ...DEFAULT_THEME_SETTINGS, theme_preset: 'blue', primary_color: '#1d4ed8', secondary_color: '#2563eb', button_color: '#0ea5e9', dashboard_color: '#0f172a', card_color: '#1e3a8a' })
    }
    if (preset === 'green') {
      setThemeSettings({ ...DEFAULT_THEME_SETTINGS, theme_preset: 'green', primary_color: '#047857', secondary_color: '#065f46', button_color: '#10b981', dashboard_color: '#0f172a', card_color: '#064e3b' })
    }
    if (preset === 'orange') {
      setThemeSettings({ ...DEFAULT_THEME_SETTINGS, theme_preset: 'orange', primary_color: '#ea580c', secondary_color: '#c2410c', button_color: '#f97316', dashboard_color: '#111827', card_color: '#78350f' })
    }
    if (preset === 'premium') {
      setThemeSettings({ ...DEFAULT_THEME_SETTINGS, theme_preset: 'premium', primary_color: '#0f172a', secondary_color: '#1c1917', button_color: '#f59e0b', card_color: '#111827', dashboard_color: '#111827' })
    }
  }, [setThemeSettings])

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

    await saveThemeToDB(themeSettings)

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
            <TextField
              label="Nombre empresa"
              value={config.nombre_empresa}
              onChange={(e) => setConfig({ ...config, nombre_empresa: e.target.value })}
              fullWidth
              variant="filled"
              InputProps={{ sx: { bgcolor: '#111827', color: '#fff', borderRadius: '1rem' } }}
              InputLabelProps={{ sx: { color: '#94a3b8' } }}
            />
            <TextField
              label="CIF / NIF"
              value={config.cif}
              onChange={(e) => setConfig({ ...config, cif: e.target.value })}
              fullWidth
              variant="filled"
              InputProps={{ sx: { bgcolor: '#111827', color: '#fff', borderRadius: '1rem' } }}
              InputLabelProps={{ sx: { color: '#94a3b8' } }}
            />
            <TextField
              label="Dirección"
              value={config.direccion}
              onChange={(e) => setConfig({ ...config, direccion: e.target.value })}
              fullWidth
              variant="filled"
              InputProps={{ sx: { bgcolor: '#111827', color: '#fff', borderRadius: '1rem' } }}
              InputLabelProps={{ sx: { color: '#94a3b8' } }}
            />
            <TextField
              label="Teléfono"
              value={config.telefono ?? ''}
              onChange={(e) => setConfig({ ...config, telefono: e.target.value })}
              fullWidth
              variant="filled"
              InputProps={{ sx: { bgcolor: '#111827', color: '#fff', borderRadius: '1rem' } }}
              InputLabelProps={{ sx: { color: '#94a3b8' } }}
            />
            <TextField
              label="Email"
              value={config.email ?? ''}
              onChange={(e) => setConfig({ ...config, email: e.target.value })}
              fullWidth
              type="email"
              variant="filled"
              InputProps={{ sx: { bgcolor: '#111827', color: '#fff', borderRadius: '1rem' } }}
              InputLabelProps={{ sx: { color: '#94a3b8' } }}
            />
            <div>
              <label className="block text-sm text-slate-400 mb-2">Tipo de empresa</label>
              <ToggleButtonGroup
                value={config.tipo_empresa || 'autonomo'}
                exclusive
                onChange={(_, value) => value && setConfig({ ...config, tipo_empresa: value })}
                className="rounded-3xl bg-slate-900 p-1"
                fullWidth
              >
                <ToggleButton
                  value="autonomo"
                  className="text-white rounded-2xl bg-slate-950 border border-slate-700"
                  sx={{ '&.Mui-selected': { bgcolor: 'primary.main', color: 'white' } }}
                >
                  Autónomo
                </ToggleButton>
                <ToggleButton
                  value="sociedad_limitada"
                  className="text-white rounded-2xl bg-slate-950 border border-slate-700"
                  sx={{ '&.Mui-selected': { bgcolor: 'primary.main', color: 'white' } }}
                >
                  Sociedad Limitada
                </ToggleButton>
              </ToggleButtonGroup>
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
            <TextField
              label="Email gestoría"
              type="email"
              value={config.email_gestoria ?? ''}
              onChange={(e) => setConfig({ ...config, email_gestoria: e.target.value })}
              placeholder="gestoria@asessoria.es"
              {...sharedTextFieldProps}
            />
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
            <TextField
              label="Clave API de Groq (Llama 3)"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value)
                localStorage.setItem('gestarian_groq_api_key', e.target.value)
              }}
              type="text"
              placeholder="gsk_..."
              {...sharedTextFieldProps}
            />
            <p className="text-xs text-slate-400">
              METIS funciona de forma ultrarrápida utilizando el modelo Llama 3 a través de Groq. Puedes obtener tu clave gratuita en <a href="https://console.groq.com" target="_blank" rel="noreferrer" className="text-cyan-400 underline">console.groq.com</a>.
            </p>
            <TextField
              label="Clave API Hugging Face (opcional)"
              value={hfKey}
              onChange={(e) => { setHfKey(e.target.value); localStorage.setItem('gestarian_hf_api_key', e.target.value) }}
              type="text"
              placeholder="hf_..."
              {...sharedTextFieldProps}
            />
            <TextField
              label="Modelo Hugging Face (opcional)"
              value={hfModel}
              onChange={(e) => { setHfModel(e.target.value); localStorage.setItem('gestarian_hf_model', e.target.value) }}
              type="text"
              placeholder="meta-llama/Llama-2-7b-chat"
              helperText="Si no se especifica, se usará meta-llama/Llama-2-7b-chat. Puedes elegir un modelo smaller si lo deseas."
              {...sharedTextFieldProps}
            />
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
              <TextField
                label=""
                placeholder="Ej: Talleres Paco"
                value={themeSettings.commercial_name ?? ''}
                onChange={(e) => setThemeSettings({ ...themeSettings, commercial_name: e.target.value })}
                {...sharedTextFieldProps}
              />
            </div>
            <div>
              <p className="text-sm text-slate-400 mb-2">Logo del taller (Principal)</p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                {themeSettings.logo_url && <img src={themeSettings.logo_url} alt="Logo" className="w-12 h-12 rounded-lg object-contain bg-white/10" />}
                <TextField
                  label=""
                  placeholder="URL del logo"
                  value={themeSettings.logo_url ?? ''}
                  onChange={(e) => setThemeSettings({ ...themeSettings, logo_url: e.target.value })}
                  {...sharedTextFieldProps}
                />
              </div>
            </div>
            <div>
              <p className="text-sm text-slate-400 mb-2">Logo pantalla de inicio</p>
              <TextField
                label=""
                placeholder="URL del logo para el inicio"
                value={themeSettings.logo_inicio_url ?? ''}
                onChange={(e) => setThemeSettings({ ...themeSettings, logo_inicio_url: e.target.value })}
                {...sharedTextFieldProps}
              />
            </div>
            <div>
              <p className="text-sm text-slate-400 mb-2">Imagen de Dashboard</p>
              <TextField
                label=""
                placeholder="URL de la imagen"
                value={themeSettings.dashboard_image_url ?? ''}
                onChange={(e) => setThemeSettings({ ...themeSettings, dashboard_image_url: e.target.value })}
                {...sharedTextFieldProps}
              />
            </div>
            <div>
              <p className="text-sm text-slate-400 mb-2">Imagen de fondo</p>
              <TextField
                label=""
                placeholder="URL de la imagen de fondo"
                value={themeSettings.background_image_url ?? ''}
                onChange={(e) => setThemeSettings({ ...themeSettings, background_image_url: e.target.value })}
                {...sharedTextFieldProps}
              />
            </div>
            <div>
              <p className="text-sm text-slate-400 mb-2">Favicon (Icono pestaña)</p>
              <TextField
                label=""
                placeholder="URL del favicon (.ico o .png)"
                value={themeSettings.favicon_url ?? ''}
                onChange={(e) => setThemeSettings({ ...themeSettings, favicon_url: e.target.value })}
                {...sharedTextFieldProps}
              />
            </div>
            
            <hr className="border-slate-800" />
            
            {/* Legacy Logos */}
            <div>
              <p className="text-sm text-slate-400 mb-2">Logo a color (Documentos)</p>
              <TextField
                label=""
                placeholder="URL del logo a color"
                value={config.logo_color ?? ''}
                onChange={(e) => setConfig({ ...config, logo_color: e.target.value })}
                {...sharedTextFieldProps}
              />
            </div>
            <div>
              <p className="text-sm text-slate-400 mb-2">Logo blanco y negro (Documentos)</p>
              <TextField
                label=""
                placeholder="URL del logo B/N"
                value={config.logo_bn ?? ''}
                onChange={(e) => setConfig({ ...config, logo_bn: e.target.value })}
                {...sharedTextFieldProps}
              />
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
            <Box className="p-4 rounded-3xl border border-bg-600 bg-bg-700">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <Typography variant="subtitle1" className="text-white">Previsualización rápida</Typography>
                  <Typography variant="body2" className="text-slate-400">Observa cómo cambia la paleta y el modo antes de guardar.</Typography>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Chip label="Botón primario" color="primary" />
                  <Chip label="Etiqueta" variant="outlined" className="text-white border-slate-600" />
                  <Chip label={themeSettings.is_dark_mode ? 'Modo noche' : 'Modo día'} color="default" />
                </div>
              </div>
            </Box>
            {/* Global Settings */}
            <div>
              <h3 className="text-sm font-medium text-slate-300 mb-4 flex items-center gap-2"><LayoutTemplate className="w-4 h-4" /> Layout y Estilo Global</h3>
              <div className="space-y-4">
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} className="items-end">
                  <FormControl fullWidth variant="filled" className="bg-bg-700 rounded-lg">
                    <InputLabel className="text-slate-400">Preset de tema</InputLabel>
                    <Select
                      value={themePreset}
                      label="Preset de tema"
                      onChange={(e) => handlePresetChange(e.target.value as ThemePreset)}
                      className="text-sm text-white"
                      sx={{ '.MuiSelect-select': { padding: '12px' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'transparent' } }}
                    >
                      <MenuItem value="classic">Clásico</MenuItem>
                      <MenuItem value="professional">Profesional</MenuItem>
                      <MenuItem value="dark">Oscuro</MenuItem>
                      <MenuItem value="blue">Azul</MenuItem>
                      <MenuItem value="green">Verde</MenuItem>
                      <MenuItem value="orange">Naranja</MenuItem>
                      <MenuItem value="premium">Premium</MenuItem>
                      <MenuItem value="custom">Personalizado</MenuItem>
                    </Select>
                  </FormControl>

                  <Button
                    type="button"
                    onClick={() => {
                      setThemeSettings(DEFAULT_THEME_SETTINGS)
                      setThemePreset(DEFAULT_THEME_SETTINGS.theme_preset)
                      playSound('click')
                    }}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-200 hover:border-cyan-400 hover:text-white"
                  >
                    Restaurar valor por defecto
                  </Button>
                </Stack>

                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {(['classic', 'professional', 'dark', 'blue', 'green', 'orange', 'premium', 'custom'] as ThemePreset[]).map((preset) => (
                    <Chip
                      key={preset}
                      label={preset === 'custom' ? 'Personalizado' : preset.charAt(0).toUpperCase() + preset.slice(1)}
                      clickable
                      color={themePreset === preset ? 'primary' : 'default'}
                      onClick={() => handlePresetChange(preset)}
                      variant={themePreset === preset ? 'filled' : 'outlined'}
                      className="text-xs rounded-full"
                    />
                  ))}
                </Stack>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Box className="flex items-center justify-between gap-4 p-4 bg-bg-700 rounded-2xl border border-bg-600">
                    <div>
                      <Typography variant="subtitle2" className="text-white">Modo Oscuro</Typography>
                      <Typography variant="caption" className="text-slate-400">Activa el modo noche y ajusta el contraste general.</Typography>
                    </div>
                    <Switch
                      checked={themeSettings.is_dark_mode}
                      onChange={(e) => {
                        const value = e.target.checked
                        setThemeSettings({ ...themeSettings, is_dark_mode: value })
                        setAppearance({ ...appearance, modo_diurno: !value })
                        playSound('click')
                      }}
                      color="primary"
                    />
                  </Box>

                  <Box className="flex items-center justify-between gap-4 p-4 bg-bg-700 rounded-2xl border border-bg-600">
                    <div>
                      <Typography variant="subtitle2" className="text-white">Visualización actual</Typography>
                      <Typography variant="caption" className="text-slate-400">Preset: {themePreset === 'custom' ? 'Personalizado' : themePreset}</Typography>
                    </div>
                    <Chip label={themeSettings.is_dark_mode ? 'Noche' : 'Día'} size="small" color={themeSettings.is_dark_mode ? 'default' : 'primary'} />
                  </Box>
                </div>

                <FormControl fullWidth variant="filled" className="bg-bg-700 rounded-lg">
                  <InputLabel className="text-slate-400">Bordes (Radius)</InputLabel>
                  <Select
                    value={themeSettings.border_radius}
                    label="Bordes (Radius)"
                    onChange={(e) => setThemeSettings({ ...themeSettings, border_radius: e.target.value })}
                    className="text-sm text-white"
                    sx={{ '.MuiSelect-select': { padding: '12px' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'transparent' } }}
                  >
                    <MenuItem value="0">Cuadrado (0px)</MenuItem>
                    <MenuItem value="0.25rem">Suave (4px)</MenuItem>
                    <MenuItem value="0.5rem">Normal (8px)</MenuItem>
                    <MenuItem value="1rem">Redondeado (16px)</MenuItem>
                    <MenuItem value="9999px">Píldora</MenuItem>
                  </Select>
                </FormControl>

                <FormControl fullWidth variant="filled" className="bg-bg-700 rounded-lg">
                  <InputLabel className="text-slate-400">Sombras</InputLabel>
                  <Select
                    value={themeSettings.shadows}
                    label="Sombras"
                    onChange={(e) => setThemeSettings({ ...themeSettings, shadows: e.target.value })}
                    className="text-sm text-white"
                    sx={{ '.MuiSelect-select': { padding: '12px' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'transparent' } }}
                  >
                    <MenuItem value="none">Sin sombra</MenuItem>
                    <MenuItem value="sm">Pequeña</MenuItem>
                    <MenuItem value="md">Media</MenuItem>
                    <MenuItem value="lg">Grande</MenuItem>
                  </Select>
                </FormControl>

                <FormControl fullWidth variant="filled" className="bg-bg-700 rounded-lg">
                  <InputLabel className="text-slate-400">Espaciado General</InputLabel>
                  <Select
                    value={themeSettings.spacing}
                    label="Espaciado General"
                    onChange={(e) => setThemeSettings({ ...themeSettings, spacing: e.target.value })}
                    className="text-sm text-white"
                    sx={{ '.MuiSelect-select': { padding: '12px' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'transparent' } }}
                  >
                    <MenuItem value="compact">Compacto</MenuItem>
                    <MenuItem value="normal">Normal</MenuItem>
                    <MenuItem value="relaxed">Relajado</MenuItem>
                  </Select>
                </FormControl>

                <FormControl fullWidth variant="filled" className="bg-bg-700 rounded-lg">
                  <InputLabel className="text-slate-400">Densidad Visual</InputLabel>
                  <Select
                    value={themeSettings.visual_density}
                    label="Densidad Visual"
                    onChange={(e) => setThemeSettings({ ...themeSettings, visual_density: e.target.value })}
                    className="text-sm text-white"
                    sx={{ '.MuiSelect-select': { padding: '12px' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'transparent' } }}
                  >
                    <MenuItem value="compact">Compacta</MenuItem>
                    <MenuItem value="normal">Normal</MenuItem>
                    <MenuItem value="comfortable">Cómoda</MenuItem>
                  </Select>
                </FormControl>
              </div>
            </div>

            {/* Typography */}
            <div>
              <h3 className="text-sm font-medium text-slate-300 mb-4 flex items-center gap-2"><Type className="w-4 h-4" /> Tipografía</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormControl fullWidth variant="filled" className="bg-bg-700 rounded-lg">
                  <InputLabel className="text-slate-400">Fuente Principal</InputLabel>
                  <Select
                    value={themeSettings.typography}
                    label="Fuente Principal"
                    onChange={(e) => setThemeSettings({ ...themeSettings, typography: e.target.value })}
                    className="text-sm text-white"
                    sx={{ '.MuiSelect-select': { padding: '12px' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'transparent' } }}
                  >
                    <MenuItem value="Inter, sans-serif">Inter</MenuItem>
                    <MenuItem value="Roboto, sans-serif">Roboto</MenuItem>
                    <MenuItem value="'Open Sans', sans-serif">Open Sans</MenuItem>
                    <MenuItem value="'Segoe UI', sans-serif">Segoe UI</MenuItem>
                    <MenuItem value="system-ui, sans-serif">System UI</MenuItem>
                  </Select>
                </FormControl>

                <FormControl fullWidth variant="filled" className="bg-bg-700 rounded-lg">
                  <InputLabel className="text-slate-400">Tamaño Base</InputLabel>
                  <Select
                    value={themeSettings.font_size}
                    label="Tamaño Base"
                    onChange={(e) => setThemeSettings({ ...themeSettings, font_size: e.target.value })}
                    className="text-sm text-white"
                    sx={{ '.MuiSelect-select': { padding: '12px' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'transparent' } }}
                  >
                    <MenuItem value="12px">Pequeño (12px)</MenuItem>
                    <MenuItem value="14px">Normal (14px)</MenuItem>
                    <MenuItem value="16px">Grande (16px)</MenuItem>
                  </Select>
                </FormControl>
              </div>
            </div>

            {/* Imágenes y Marca */}
            <div>
              <h3 className="text-sm font-medium text-slate-300 mb-4 flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Imágenes y Marca (Theming)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextField
                  label="Nombre Comercial Mostrado"
                  value={themeSettings.commercial_name ?? ''}
                  onChange={(e) => setThemeSettings({ ...themeSettings, commercial_name: e.target.value })}
                  {...sharedTextFieldProps}
                />
                <TextField
                  label="Logo del Taller (URL)"
                  value={themeSettings.logo_url ?? ''}
                  onChange={(e) => setThemeSettings({ ...themeSettings, logo_url: e.target.value })}
                  {...sharedTextFieldProps}
                />
                <TextField
                  label="Logo Pantalla de Inicio (URL)"
                  value={themeSettings.logo_inicio_url ?? ''}
                  onChange={(e) => setThemeSettings({ ...themeSettings, logo_inicio_url: e.target.value })}
                  {...sharedTextFieldProps}
                />
                <TextField
                  label="Imagen del Dashboard (URL)"
                  value={themeSettings.dashboard_image_url ?? ''}
                  onChange={(e) => setThemeSettings({ ...themeSettings, dashboard_image_url: e.target.value })}
                  {...sharedTextFieldProps}
                />
                <TextField
                  label="Imagen de Fondo (URL)"
                  value={themeSettings.background_image_url ?? ''}
                  onChange={(e) => setThemeSettings({ ...themeSettings, background_image_url: e.target.value })}
                  {...sharedTextFieldProps}
                />
                <TextField
                  label="Favicon (URL)"
                  value={themeSettings.favicon_url ?? ''}
                  onChange={(e) => setThemeSettings({ ...themeSettings, favicon_url: e.target.value })}
                  {...sharedTextFieldProps}
                />
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
    <FormControl fullWidth variant="filled" className="bg-bg-700 rounded-2xl p-3">
      <InputLabel shrink className="text-slate-400">{label}</InputLabel>
      <Box className="flex items-center gap-3 mt-2">
        <TextField
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          variant="filled"
          sx={{ width: 56, minWidth: 56, padding: 0, '& .MuiInputBase-input': { padding: 0, minHeight: 56, borderRadius: '16px' } }}
          InputProps={{ sx: { bgcolor: 'transparent', borderRadius: '16px', border: '1px solid rgba(148,163,184,0.2)' } }}
        />
        <TextField
          value={value}
          onChange={(e) => onChange(e.target.value)}
          variant="filled"
          size="small"
          placeholder="#123456"
          className="w-full"
          InputProps={{ sx: { color: '#fff', borderRadius: '16px' } }}
        />
      </Box>
    </FormControl>
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
