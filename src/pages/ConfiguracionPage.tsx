import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Configuracion, ThemePreset, TextColorValue, TextColorSettings } from '../lib/types'
import { PageHeader, Card } from '../components/UI'
import { useTheme, DEFAULT_THEME_SETTINGS } from '../lib/theme'
import { Chip, Stack, Switch, TextField } from '@mui/material'
import { Save, Building2, Mail, Palette, Sparkles, History, ArrowLeft, Eye, EyeOff, CheckCircle2, XCircle, Bot, FileSearch, Car, HardDrive, RefreshCw, UserCog } from 'lucide-react'
import { CommunicationHistoryModal } from '../components/CommunicationHistoryModal'

// Servicios centralizados
import { getAiConfig, getFallbackConfig, testAiConnection } from '../services/aiProviderService'
import { getDocumentOcrConfig, testDocumentOcrConnection } from '../services/documentOcrService'
import { getPlateRecognizerConfig, testPlateRecognizerConnection } from '../services/plateRecognizerService'


export function ConfiguracionPage() {
  const navigate = useNavigate()
  const [config, setConfig] = useState<Configuracion | null>(null)
  const [themePreset, setThemePreset] = useState<ThemePreset>(DEFAULT_THEME_SETTINGS.theme_preset)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const { themeSettings, setThemeSettings, saveThemeToDB, playSound, appearance } = useTheme()

  // ----------------------------------------------------
  // ESTADOS DE SERVICIOS Y CLAVES API (OBJETIVO 1, 2, 3)
  // ----------------------------------------------------
  // 1. Ayudante IA
  const [aiProvider, setAiProvider] = useState<'gemini' | 'groq' | 'openai'>('gemini')
  const [aiModel, setAiModel] = useState('gemini-1.5-flash')
  const [aiApiKey, setAiApiKey] = useState('')
  const [showAiKey, setShowAiKey] = useState(false)
  const [aiStatus, setAiStatus] = useState<'connected' | 'disconnected' | 'testing' | 'error'>('disconnected')

  // 2. OCR Documentos
  const [docOcrProvider, setDocOcrProvider] = useState<'gemini' | 'tesseract'>('gemini')
  const [docOcrModel, setDocOcrModel] = useState('gemini-1.5-flash')
  const [docOcrApiKey, setDocOcrApiKey] = useState('')
  const [showDocOcrKey, setShowDocOcrKey] = useState(false)
  const [docOcrStatus, setDocOcrStatus] = useState<'connected' | 'disconnected' | 'testing' | 'error'>('disconnected')

  // 3. OCR Matrículas (Plate Recognizer)
  const [plateApiKey, setPlateApiKey] = useState('')
  const [showPlateKey, setShowPlateKey] = useState(false)
  const [plateEndpoint, setPlateEndpoint] = useState('https://api.platerecognizer.com/v1/plate-reader/')
  const [plateStatus, setPlateStatus] = useState<'connected' | 'disconnected' | 'testing' | 'error'>('disconnected')

  // 4. Fallback IA
  const [fallbackEnabled, setFallbackEnabled] = useState(false)
  const [fallbackProvider, setFallbackProvider] = useState<'openrouter' | 'groq' | 'deepseek'>('openrouter')
  const [fallbackModel, setFallbackModel] = useState('deepseek/deepseek-chat:free')
  const [fallbackApiKey, setFallbackApiKey] = useState('')
  const [showFallbackKey, setShowFallbackKey] = useState(false)
  const [fallbackStatus, setFallbackStatus] = useState<'connected' | 'disconnected' | 'testing' | 'error'>('disconnected')

  // Mensajes de prueba de conexión
  const [testResult, setTestResult] = useState<{ service: string; message: string; success: boolean } | null>(null)

  // ----------------------------------------------------
  // ESTADOS DE COLORES DE TEXTO (OBJETIVO 4 & 5)
  // ----------------------------------------------------
  // ESTADOS DE COLORES DE TEXTO (OBJETIVO 4 & 5)
  // ----------------------------------------------------
  const [textColors, setTextColors] = useState<TextColorSettings>({
    text_title: '#ffffff',
    text_primary: '#ffffff',
    text_input: '#ffffff',
    text_secondary: '#808080',
    text_card: '#ffffff',
  })

  // ----------------------------------------------------
  // RESET DE DATOS OPERATIVOS
  // ----------------------------------------------------
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetInput, setResetInput] = useState('')
  const [isResetting, setIsResetting] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)

  const sharedTextFieldProps = {
    fullWidth: true,
    variant: 'filled' as const,
    InputProps: { sx: { bgcolor: '#111827', color: '#fff', borderRadius: '1rem' } },
    InputLabelProps: { sx: { color: '#94a3b8' } },
  }

  useEffect(() => {
    loadConfig()
    loadServicesAndColors()
  }, [])

  async function handleResetData() {
    if (resetInput !== 'RESET') return
    setIsResetting(true)
    setResetError(null)
    try {
      // Borrado en orden respetando claves foráneas
      const { error: errImg } = await supabase.from('expediente_imagenes').delete().neq('id', 'dummy')
      if (errImg) throw new Error('Error al borrar imágenes de expedientes: ' + errImg.message)

      const { error: errCobros } = await supabase.from('cobros').delete().neq('id', 'dummy')
      if (errCobros) throw new Error('Error al borrar cobros: ' + errCobros.message)

      const { error: errFac } = await supabase.from('facturas').delete().neq('id', 'dummy')
      if (errFac) throw new Error('Error al borrar facturas: ' + errFac.message)

      const { error: errRep } = await supabase.from('reparaciones').delete().neq('id', 'dummy')
      if (errRep) throw new Error('Error al borrar reparaciones: ' + errRep.message)

      const { error: errCitas } = await supabase.from('citas').delete().neq('id', 'dummy')
      if (errCitas) throw new Error('Error al borrar citas: ' + errCitas.message)

      const { error: errPres } = await supabase.from('presupuestos').delete().neq('id', 'dummy')
      if (errPres) throw new Error('Error al borrar presupuestos: ' + errPres.message)

      setShowResetModal(false)
      setResetInput('')
      // Recargar para limpiar todo el estado local
      window.location.reload()
    } catch (error: any) {
      setResetError(error.message || 'Error desconocido durante el borrado')
      setIsResetting(false)
    }
  }

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

  function loadServicesAndColors() {
    // Cargar IA principal
    const aiCfg = getAiConfig()
    setAiProvider(aiCfg.provider as any || 'gemini')
    setAiModel(aiCfg.model || 'gemini-1.5-flash')
    setAiApiKey(aiCfg.api_key || localStorage.getItem('gestarian_gemini_api_key') || '')

    // Cargar OCR Documentos
    const docCfg = getDocumentOcrConfig()
    setDocOcrProvider(docCfg.provider as any || 'gemini')
    setDocOcrModel(docCfg.model || 'gemini-1.5-flash')
    setDocOcrApiKey(docCfg.api_key || localStorage.getItem('gestarian_gemini_api_key') || '')

    // Cargar Plate Recognizer
    const plateCfg = getPlateRecognizerConfig()
    setPlateApiKey(plateCfg.api_key || localStorage.getItem('gestarian_plate_recognizer_key') || '')
    setPlateEndpoint(plateCfg.endpoint_url || 'https://api.platerecognizer.com/v1/plate-reader/')

    // Cargar Fallback IA
    const fallbackCfg = getFallbackConfig()
    const storedOpenRouterKey = localStorage.getItem('gestarian_openrouter_api_key') || localStorage.getItem('gestarian_fallback_api_key') || fallbackCfg.api_key || ''
    setFallbackEnabled(fallbackCfg.enabled ?? (!!storedOpenRouterKey))
    setFallbackProvider('openrouter')
    setFallbackModel(fallbackCfg.model && fallbackCfg.model !== 'llama-3.3-70b-versatile' ? fallbackCfg.model : 'deepseek/deepseek-chat:free')
    setFallbackApiKey(storedOpenRouterKey)

    // Cargar Colores de Texto
    const savedColors = localStorage.getItem('gestarian_text_colors')
    if (savedColors) {
      try { setTextColors({ ...textColors, ...JSON.parse(savedColors) }) } catch (e) {}
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

  // Guardar configuración completa y persistir API Keys de forma segura
  async function handleSave() {
    if (!config) return
    setSaving(true)

    // 1. Guardar configuraciones de Servicios externos de forma aislada
    const aiConfigObj = { provider: aiProvider, model: aiModel, api_key: aiApiKey, status: aiStatus }
    localStorage.setItem('gestarian_ai_assistant_config', JSON.stringify(aiConfigObj))
    if (aiApiKey) localStorage.setItem('gestarian_gemini_api_key', aiApiKey)

    const docOcrConfigObj = { provider: docOcrProvider, model: docOcrModel, api_key: docOcrApiKey, status: docOcrStatus }
    localStorage.setItem('gestarian_document_ocr_config', JSON.stringify(docOcrConfigObj))

    const plateConfigObj = { provider: 'plate_recognizer', api_key: plateApiKey, endpoint_url: plateEndpoint, status: plateStatus }
    localStorage.setItem('gestarian_plate_recognizer_config', JSON.stringify(plateConfigObj))
    if (plateApiKey) localStorage.setItem('gestarian_plate_recognizer_key', plateApiKey)

    const fallbackConfigObj = { provider: fallbackProvider, model: fallbackModel, api_key: fallbackApiKey, enabled: fallbackEnabled, status: fallbackStatus }
    localStorage.setItem('gestarian_fallback_ai_config', JSON.stringify(fallbackConfigObj))
    if (fallbackApiKey) {
      if (fallbackProvider === 'openrouter') {
        localStorage.setItem('gestarian_openrouter_api_key', fallbackApiKey)
      } else {
        localStorage.setItem('gestarian_groq_api_key', fallbackApiKey)
      }
    }

    // 2. Guardar Colores de Texto y aplicarlos mediante Variables CSS Dinámicas
    localStorage.setItem('gestarian_text_colors', JSON.stringify(textColors))
    const root = document.documentElement
    root.style.setProperty('--text-title', textColors.text_title)
    root.style.setProperty('--text-primary', textColors.text_primary)
    root.style.setProperty('--text-input', textColors.text_input)
    root.style.setProperty('--text-secondary', textColors.text_secondary)
    root.style.setProperty('--text-card', textColors.text_card)

    // 3. Persistir en Supabase
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

  // ----------------------------------------------------
  // PRUEBAS DE CONEXIÓN A SERVICIOS (OBJETIVOS 1, 2, 3)
  // ----------------------------------------------------
  async function handleTestAi() {
    setAiStatus('testing')
    const res = await testAiConnection({ provider: aiProvider, model: aiModel, api_key: aiApiKey, status: 'testing' })
    setAiStatus(res.success ? 'connected' : 'error')
    setTestResult({ service: 'AYUDANTE IA GESTARIAN', message: res.message, success: res.success })
  }

  async function handleTestDocOcr() {
    setDocOcrStatus('testing')
    const res = await testDocumentOcrConnection({ provider: docOcrProvider, model: docOcrModel, api_key: docOcrApiKey, status: 'testing' })
    setDocOcrStatus(res.success ? 'connected' : 'error')
    setTestResult({ service: 'OCR DE FACTURAS Y DOCUMENTOS', message: res.message, success: res.success })
  }

  async function handleTestPlate() {
    setPlateStatus('testing')
    const res = await testPlateRecognizerConnection({ provider: 'plate_recognizer', api_key: plateApiKey, endpoint_url: plateEndpoint, status: 'testing' })
    setPlateStatus(res.success ? 'connected' : 'error')
    setTestResult({ service: 'OCR DE MATRÍCULAS', message: res.message, success: res.success })
  }

  async function handleTestFallback() {
    setFallbackStatus('testing')
    const res = await testAiConnection({ provider: fallbackProvider, model: fallbackModel, api_key: fallbackApiKey, enabled: fallbackEnabled, status: 'testing' })
    setFallbackStatus(res.success ? 'connected' : 'error')
    setTestResult({ service: 'IA ALTERNATIVA / FALLBACK', message: res.message, success: res.success })
  }

  if (!config) return <div className="text-center py-16 text-slate-500">Cargando...</div>

  return (
    <div className="space-y-6 pb-12">
      <PageHeader title="CONFIGURACIÓN">
        <div className="flex items-center gap-3">
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

      <div className="flex items-center justify-between bg-slate-900/60 p-4 rounded-2xl border border-slate-800 backdrop-blur-md">
        <h2 className="text-xl font-black text-white tracking-tight">Panel de Control de Ajustes</h2>
        <button 
          onClick={handleSave} 
          disabled={saving} 
          className="flex items-center gap-2 text-white font-bold bg-cyan-600 hover:bg-cyan-500 transition-all rounded-xl px-5 py-2.5 shadow-lg active:scale-95 disabled:opacity-50"
        >
          <Save className="w-5 h-5" /> {saving ? 'Guardando...' : saved ? 'Guardado ✓' : 'Guardar todo'}
        </button>
      </div>

      {/* Banner de Resultado de Prueba de Conexión */}
      {testResult && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between animate-fade-in ${
          testResult.success ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
        }`}>
          <div className="flex items-center gap-3">
            {testResult.success ? <CheckCircle2 className="w-6 h-6 shrink-0" /> : <XCircle className="w-6 h-6 shrink-0" />}
            <div>
              <span className="font-extrabold text-xs uppercase tracking-wider block opacity-75">{testResult.service}</span>
              <p className="text-sm font-semibold">{testResult.message}</p>
            </div>
          </div>
          <button onClick={() => setTestResult(null)} className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1">
            Cerrar
          </button>
        </div>
      )}

      {/* ================================================== */}
      {/* SECCIÓN 1: INTELIGENCIA ARTIFICIAL Y SERVICIOS */}
      {/* ================================================== */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pt-2">
          <Sparkles className="w-6 h-6 text-cyan-400" />
          <h2 className="text-xl font-black text-white uppercase tracking-tight">INTELIGENCIA ARTIFICIAL Y SERVICIOS</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* 1. AYUDANTE IA GESTARIAN */}
          <Card className="p-6 space-y-4 border border-cyan-500/20 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-cyan-500/10 rounded-xl text-cyan-400">
                  <Bot className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">AYUDANTE IA GESTARIAN</h3>
                  <span className="text-xs text-slate-400 font-medium">IA Conversacional en Lenguaje Natural</span>
                </div>
              </div>
              <StatusChip status={aiStatus} />
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-xl border border-slate-800">
              IA conversacional para hablar con GESTARIAN en lenguaje natural, entender instrucciones y ayudar a gestionar las tareas de la aplicación.
            </p>

            {/* ── TARJETA MODELO PREFERENTE GEMINI ── */}
            <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/60 to-slate-900/80 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">⚡</span>
                  <div>
                    <p className="text-xs font-black text-emerald-300 uppercase tracking-wider">Modelo Preferente Gemini</p>
                    <p className="text-[10px] text-slate-400">Activa el endpoint estable recomendado para METIS</p>
                  </div>
                </div>
                <Switch
                  size="small"
                  checked={['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash'].includes(aiModel)}
                  onChange={(e) => {
                    if (e.target.checked) setAiModel('gemini-3.7-flash')
                    else setAiModel('gemini-2.5-flash')
                  }}
                  sx={{ '& .MuiSwitch-thumb': { bgcolor: '#10b981' }, '& .Mui-checked + .MuiSwitch-track': { bgcolor: '#10b981' } }}
                />
              </div>

              <div className="flex gap-2">
                {[
                  { id: 'gemini-3.7-flash', label: '3.7 Flash', badge: '⭐' },
                  { id: 'gemini-3.6-flash', label: '3.6 Flash', badge: '' },
                  { id: 'gemini-3.5-flash', label: '3.5 Flash', badge: '⚡' },
                ].map(m => (
                  <button
                    key={m.id}
                    onClick={() => setAiModel(m.id)}
                    className={`flex-1 py-2 px-1 rounded-lg text-[10px] font-bold border transition-all ${
                      aiModel === m.id
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                        : 'bg-slate-900/60 border-slate-700 text-slate-400 hover:border-emerald-500/50 hover:text-slate-200'
                    }`}
                  >
                    {m.badge && <span className="mr-0.5">{m.badge}</span>}
                    {m.label}
                  </button>
                ))}
              </div>

              <p className="text-[10px] text-slate-500 leading-relaxed">
                <span className="text-emerald-400 font-semibold">Orden de preferencia:</span> 3.7 Flash → 3.6 Flash → 3.5 Flash. El motor intentará el seleccionado y migrará automáticamente si detecta el antiguo 2.0-flash configurado.
              </p>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Proveedor</label>
                  <select 
                    value={aiProvider} 
                    onChange={(e) => setAiProvider(e.target.value as any)}
                    className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none"
                  >
                    <option value="gemini">Google Gemini (Recomendado)</option>
                    <option value="groq">Groq Llama 3</option>
                    <option value="openai">OpenAI GPT-4</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Modelo</label>
                  <select 
                    value={aiModel} 
                    onChange={(e) => setAiModel(e.target.value)}
                    className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none"
                  >
                    <option value="gemini-3.7-flash">Gemini 3.7 Flash ⭐ (Recomendado)</option>
                    <option value="gemini-3.6-flash">Gemini 3.6 Flash</option>
                    <option value="gemini-3.5-flash">Gemini 3.5 Flash (Ultra Rápido)</option>
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                    <option value="gemini-1.5-flash-latest">Gemini 1.5 Flash (Latest)</option>
                    <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                    <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Clave API</label>
                <div className="relative">
                  <input 
                    type={showAiKey ? "text" : "password"} 
                    value={aiApiKey} 
                    onChange={(e) => setAiApiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full pl-4 pr-12 py-3 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono font-bold text-cyan-300 focus:outline-none"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowAiKey(!showAiKey)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-white"
                  >
                    {showAiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button 
                  type="button" 
                  onClick={handleTestAi}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 transition-colors"
                >
                  Probar conexión
                </button>
                <button 
                  type="button" 
                  onClick={handleSave}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-md transition-colors"
                >
                  Guardar
                </button>
              </div>
            </div>
          </Card>

          {/* 2. OCR DE FACTURAS Y DOCUMENTOS */}
          <Card className="p-6 space-y-4 border border-blue-500/20 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-400">
                  <FileSearch className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">OCR DE FACTURAS Y DOCUMENTOS</h3>
                  <span className="text-xs text-blue-400 font-semibold">{docOcrProvider.toUpperCase()}</span>
                </div>
              </div>
              <StatusChip status={docOcrStatus} />
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-xl border border-slate-800">
              Procesamiento de documentos, permisos de circulación y facturas recibidas de proveedores mediante IA Multimodal con extracción estructurada.
            </p>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Proveedor</label>
                  <select 
                    value={docOcrProvider} 
                    onChange={(e) => setDocOcrProvider(e.target.value as any)}
                    className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none"
                  >
                    <option value="gemini">Google Gemini Vision</option>
                    <option value="tesseract">Tesseract Local</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Modelo</label>
                  <select 
                    value={docOcrModel} 
                    onChange={(e) => setDocOcrModel(e.target.value)}
                    className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none"
                  >
                    <option value="gemini-3.7-flash">Gemini 3.7 Flash ⭐ (Recomendado)</option>
                    <option value="gemini-3.6-flash">Gemini 3.6 Flash</option>
                    <option value="gemini-3.5-flash">Gemini 3.5 Flash (Ultra Rápido)</option>
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                    <option value="gemini-1.5-flash-latest">Gemini 1.5 Flash (Latest)</option>
                    <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                    <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Clave API</label>
                <div className="relative">
                  <input 
                    type={showDocOcrKey ? "text" : "password"} 
                    value={docOcrApiKey} 
                    onChange={(e) => setDocOcrApiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full pl-4 pr-12 py-3 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono font-bold text-blue-300 focus:outline-none"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowDocOcrKey(!showDocOcrKey)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-white"
                  >
                    {showDocOcrKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button 
                  type="button" 
                  onClick={handleTestDocOcr}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-blue-300 border border-blue-500/30 transition-colors"
                >
                  Probar OCR
                </button>
                <button 
                  type="button" 
                  onClick={handleSave}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md transition-colors"
                >
                  Guardar
                </button>
              </div>
            </div>
          </Card>

          {/* 3. OCR DE MATRÍCULAS — PLATE RECOGNIZER */}
          <Card className="p-6 space-y-4 border border-amber-500/20 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-amber-500/10 rounded-xl text-amber-400">
                  <Car className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">OCR DE MATRÍCULAS — PLATE RECOGNIZER</h3>
                  <span className="text-xs text-amber-400 font-semibold">Proveedor Exclusivo para Matrículas</span>
                </div>
              </div>
              <StatusChip status={plateStatus} />
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-xl border border-slate-800">
              Reconocimiento automático de matrículas españolas mediante fotografía utilizando la API especializada Plate Recognizer.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Proveedor Específico</label>
                <input 
                  type="text" 
                  disabled 
                  value="Plate Recognizer (Normalizado Español)" 
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-slate-400 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">API Key</label>
                <div className="relative">
                  <input 
                    type={showPlateKey ? "text" : "password"} 
                    value={plateApiKey} 
                    onChange={(e) => setPlateApiKey(e.target.value)}
                    placeholder="Token de Plate Recognizer"
                    className="w-full pl-4 pr-12 py-3 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono font-bold text-amber-300 focus:outline-none"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPlateKey(!showPlateKey)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-white"
                  >
                    {showPlateKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Servicio / Endpoint</label>
                <input 
                  type="text" 
                  value={plateEndpoint} 
                  onChange={(e) => setPlateEndpoint(e.target.value)}
                  className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono text-slate-300 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button 
                  type="button" 
                  onClick={handleTestPlate}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 transition-colors"
                >
                  Probar reconocimiento
                </button>
                <button 
                  type="button" 
                  onClick={handleSave}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-md transition-colors"
                >
                  Guardar
                </button>
              </div>
            </div>
          </Card>

          {/* 4. ALMACENAMIENTO DE FOTOS Y DOCUMENTOS (SUPABASE STORAGE) */}
          <Card className="p-6 space-y-4 border border-emerald-500/20 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400">
                  <HardDrive className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">ALMACENAMIENTO DE FOTOS Y DOCUMENTOS</h3>
                  <span className="text-xs text-emerald-400 font-semibold">SUPABASE STORAGE</span>
                </div>
              </div>
              <StatusChip status="connected" />
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-xl border border-slate-800">
              Almacenamiento nativo de fotografías, documentos y archivos asociados a clientes, vehículos y expedientes sin solicitar credenciales duplicadas.
            </p>

            <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-bold">Estado del Bucket:</span>
                <span className="text-emerald-400 font-black">Conectado (gestarian-files)</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-bold">Estructura Jerárquica:</span>
                <span className="text-slate-300 font-mono text-[11px]">clientes/cliente_id/vehiculo_id/expediente_id/</span>
              </div>
            </div>
          </Card>

          {/* 5. PROVEEDOR IA ALTERNATIVO / FALLBACK */}
          <Card className="p-6 space-y-4 border border-purple-500/20 shadow-xl relative overflow-hidden lg:col-span-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-purple-500/10 rounded-xl text-purple-400">
                  <RefreshCw className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">PROVEEDOR IA ALTERNATIVO / FALLBACK</h3>
                  <span className="text-xs text-purple-400 font-medium">OpenRouter (100% Gratuito · Español de España y Andaluz)</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs font-bold text-slate-300">Activar Fallback</span>
                  <Switch 
                    checked={fallbackEnabled} 
                    onChange={(e) => setFallbackEnabled(e.target.checked)} 
                    color="primary"
                  />
                </label>
                <StatusChip status={fallbackStatus} />
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-xl border border-slate-800">
              Servidor IA alternativo 100% gratuito que comprende a la perfección el español de España, dialecto andaluz y la jerga de taller. Actúa de inmediato si Gemini no estuviera disponible.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Proveedor Fallback</label>
                <select
                  value={fallbackProvider}
                  onChange={(e) => {
                    const p = e.target.value as any;
                    setFallbackProvider(p);
                    if (p === 'openrouter') setFallbackModel('deepseek/deepseek-chat:free');
                    if (p === 'groq') setFallbackModel('llama-3.3-70b-versatile');
                  }}
                  className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none cursor-pointer"
                >
                  <option value="openrouter">OpenRouter (Gratuito - DeepSeek / Llama)</option>
                  <option value="groq">Groq (Llama 3.3)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Modelo Fallback</label>
                <input 
                  type="text" 
                  value={fallbackModel} 
                  onChange={(e) => setFallbackModel(e.target.value)}
                  placeholder="deepseek/deepseek-chat:free"
                  className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-400">
                    Clave API {fallbackProvider === 'openrouter' ? 'OpenRouter' : 'Groq'}
                  </label>
                  {fallbackProvider === 'openrouter' && (
                    <a
                      href="https://openrouter.ai/keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 underline"
                    >
                      Obtener API Key Gratis ↗
                    </a>
                  )}
                </div>
                <div className="relative">
                  <input 
                    type={showFallbackKey ? "text" : "password"} 
                    value={fallbackApiKey} 
                    onChange={(e) => setFallbackApiKey(e.target.value)}
                    placeholder={fallbackProvider === 'openrouter' ? "sk-or-v1-..." : "gsk_..."}
                    className="w-full pl-4 pr-12 py-3 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono font-bold text-purple-300 focus:outline-none"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowFallbackKey(!showFallbackKey)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-white"
                  >
                    {showFallbackKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <div className="text-[11px] text-slate-400">
                Modelos gratuitos recomendados: <code className="text-purple-300 font-mono">deepseek/deepseek-chat:free</code> o <code className="text-purple-300 font-mono">meta-llama/llama-3.3-70b-instruct:free</code>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  type="button" 
                  onClick={handleTestFallback}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/30 transition-colors"
                >
                  Probar conexión
                </button>
                <button 
                  type="button" 
                  onClick={handleSave}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-md transition-colors"
                >
                  Guardar
                </button>
              </div>
            </div>
          </Card>

        </div>
      </div>

      {/* ================================================== */}
      {/* SECCIÓN 2: PERSONALIZACIÓN DE LA INTERFAZ & COLORES DE TEXTO (OBJETIVOS 4 & 5) */}
      {/* ================================================== */}
      <Card className="p-6 space-y-6 border border-slate-800">
        <div className="flex items-center gap-2.5">
          <Palette className="w-6 h-6 text-[var(--primary)]" />
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-tight">PERSONALIZACIÓN DE LA INTERFAZ</h2>
            <span className="text-xs text-slate-400 font-medium">Ajuste fino de Colores de Texto Centralizados</span>
          </div>
        </div>

        <div className="space-y-5 bg-slate-950 p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white">COLORES DE TEXTO</h3>
            <span className="text-xs text-cyan-400 font-semibold bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">
              Los botones mantienen su diseño propio
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* A. TÍTULOS */}
            <TextColorSelector
              label="A. TÍTULOS"
              value={textColors.text_title}
              onChange={(val) => setTextColors({ ...textColors, text_title: val })}
            />

            {/* B. TEXTOS PRINCIPALES */}
            <TextColorSelector
              label="B. TEXTOS PRINCIPALES"
              value={textColors.text_primary}
              onChange={(val) => setTextColors({ ...textColors, text_primary: val })}
            />

            {/* C. TEXTOS DE INPUTS */}
            <TextColorSelector
              label="C. TEXTOS DE INPUTS"
              value={textColors.text_input}
              onChange={(val) => setTextColors({ ...textColors, text_input: val })}
            />

            {/* D. TEXTOS SECUNDARIOS */}
            <TextColorSelector
              label="D. TEXTOS SECUNDARIOS"
              value={textColors.text_secondary}
              onChange={(val) => setTextColors({ ...textColors, text_secondary: val })}
            />

            {/* E. TEXTOS DE TARJETAS */}
            <TextColorSelector
              label="E. TEXTOS DE TARJETAS"
              value={textColors.text_card}
              onChange={(val) => setTextColors({ ...textColors, text_card: val })}
            />

          </div>
        </div>

        {/* Presets de Estilo Visual Global */}
        <div>
          <h3 className="text-sm font-bold text-slate-300 mb-3">Presets de Estilo Visual General</h3>
          <Stack
  direction="row"
  spacing={1}
  sx={{ flexWrap: 'wrap' }}
>
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
        </div>
      </Card>

      {/* Datos Fiscales y Comunicaciones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
              {...sharedTextFieldProps}
            />
            <TextField
              label="CIF / NIF"
              value={config.cif}
              onChange={(e) => setConfig({ ...config, cif: e.target.value })}
              {...sharedTextFieldProps}
            />
            <TextField
              label="Dirección"
              value={config.direccion}
              onChange={(e) => setConfig({ ...config, direccion: e.target.value })}
              {...sharedTextFieldProps}
            />
            <TextField
              label="Teléfono"
              value={config.telefono ?? ''}
              onChange={(e) => setConfig({ ...config, telefono: e.target.value })}
              {...sharedTextFieldProps}
            />
            <TextField
              label="Email"
              value={config.email ?? ''}
              onChange={(e) => setConfig({ ...config, email: e.target.value })}
              type="email"
              {...sharedTextFieldProps}
            />
          </div>
        </Card>

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
              placeholder="gestoria@asesoria.es"
              {...sharedTextFieldProps}
            />
          </div>
        </Card>
      </div>

      <CommunicationHistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
      />

      <div className="flex justify-end pt-4">
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 text-white font-bold bg-cyan-600 hover:bg-cyan-500 transition-colors rounded-xl px-6 py-3 shadow-lg disabled:opacity-50">
          <Save className="w-5 h-5" /> {saving ? 'Guardando...' : saved ? 'Guardado ✓' : 'Guardar Cambios de Configuración'}
        </button>
      </div>

      {/* ── Acceso a Usuarios ─────────────────────────────────── */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <HardDrive className="w-5 h-5 text-teal-400" />
          <h2 className="text-lg font-semibold text-white">Administración</h2>
        </div>
        <button
          onClick={() => navigate('/usuarios')}
          className="w-full flex items-center justify-between gap-4 px-5 py-4 rounded-xl bg-teal-500/10 border border-teal-500/30 hover:bg-teal-500/20 hover:border-teal-400/50 transition-all active:scale-[0.99] group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center group-hover:bg-teal-500/30 transition-colors">
              <UserCog className="w-5 h-5 text-teal-400" />
            </div>
            <div className="text-left">
              <p className="font-bold text-white text-sm uppercase tracking-wide">Usuarios</p>
              <p className="text-xs text-slate-400 mt-0.5">Gestión de usuarios y permisos del sistema</p>
            </div>
          </div>
          <Sparkles className="w-5 h-5 text-teal-400 opacity-60 group-hover:opacity-100 transition-opacity" />
        </button>
      </Card>

      {/* ── ZONA DE PELIGRO ─────────────────────────────────── */}
      <Card className="p-6 mt-8 border-rose-500/30 bg-rose-950/10">
        <div className="flex items-center gap-3 mb-4">
          <XCircle className="w-5 h-5 text-rose-500" />
          <h2 className="text-lg font-semibold text-rose-500">Zona de Peligro (Pruebas)</h2>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-white text-sm">Vaciar Datos Operativos</p>
            <p className="text-xs text-rose-400 mt-1 max-w-xl">
              Elimina todos los expedientes, presupuestos, citas, reparaciones, facturas y balances. 
              <strong> Los clientes y vehículos se conservarán intactos.</strong>
            </p>
          </div>
          <button
            onClick={() => setShowResetModal(true)}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg shadow-lg transition-colors whitespace-nowrap"
          >
            RESET DATOS DE PRUEBA
          </button>
        </div>
      </Card>

      {/* ── MODAL DE RESET ─────────────────────────────────── */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-rose-500/30 p-6 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-3 mb-4 text-rose-500">
              <XCircle className="w-6 h-6" />
              <h2 className="text-xl font-bold">Confirmar Reset de Datos</h2>
            </div>
            
            <p className="text-sm text-slate-300 mb-6 leading-relaxed">
              Esta operación eliminará <strong>todos</strong> los expedientes, presupuestos, citas, reparaciones, facturas y datos de balances. 
              <br /><br />
              <span className="text-emerald-400 font-semibold">Los clientes y vehículos se conservarán.</span>
            </p>

            <div className="mb-6 p-4 bg-rose-950/30 border border-rose-500/20 rounded-xl">
              <label className="block text-xs font-bold text-rose-400 mb-2 uppercase tracking-wide">
                Escribe RESET para confirmar
              </label>
              <input 
                type="text" 
                value={resetInput}
                onChange={(e) => setResetInput(e.target.value)}
                placeholder="RESET"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white font-mono text-center uppercase focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none transition-all"
              />
            </div>

            {resetError && (
              <div className="mb-6 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                <p className="text-xs text-rose-400 font-semibold">{resetError}</p>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button 
                onClick={() => {
                  setShowResetModal(false)
                  setResetInput('')
                  setResetError(null)
                }}
                disabled={isResetting}
                className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
              >
                CANCELAR
              </button>
              <button 
                onClick={handleResetData}
                disabled={resetInput !== 'RESET' || isResetting}
                className="flex-1 px-4 py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow-lg transition-colors disabled:opacity-30 disabled:hover:bg-rose-600 flex justify-center items-center"
              >
                {isResetting ? 'ELIMINANDO...' : 'ELIMINAR DATOS'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatusChip({ status }: { status: 'connected' | 'disconnected' | 'testing' | 'error' }) {
  if (status === 'connected') {
    return <Chip label="Conectado ✓" size="small" className="bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 text-xs" />
  }
  if (status === 'testing') {
    return <Chip label="Verificando..." size="small" className="bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 text-xs" />
  }
  if (status === 'error') {
    return <Chip label="Error Conexión ✗" size="small" className="bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30 text-xs" />
  }
  return <Chip label="Sin Conectar" size="small" className="bg-slate-800 text-slate-400 font-bold border border-slate-700 text-xs" />
}

function TextColorSelector({ 
  label, 
  value, 
  onChange 
}: { 
  label: string; 
  value: TextColorValue; 
  onChange: (val: TextColorValue) => void 
}) {
  const options: Array<{ label: string; color: TextColorValue; bg: string }> = [
    { label: 'Negro', color: '#000000', bg: 'bg-black text-white' },
    { label: 'Blanco', color: '#ffffff', bg: 'bg-white text-black' },
    { label: 'Gris 50%', color: '#808080', bg: 'bg-gray-500 text-white' },
  ]

  return (
    <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
      <label className="block text-xs font-black text-slate-300">{label}</label>
      <div className="grid grid-cols-3 gap-1.5">
        {options.map((opt) => (
          <button
            key={opt.color}
            type="button"
            onClick={() => onChange(opt.color)}
            className={`py-2 px-1 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1 transition-all ${
              value === opt.color 
                ? 'ring-2 ring-cyan-400 scale-105 shadow-md font-black' 
                : 'opacity-60 hover:opacity-100'
            } ${opt.bg}`}
          >
            <span>● {opt.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
