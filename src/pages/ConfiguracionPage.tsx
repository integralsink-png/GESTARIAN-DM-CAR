import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Configuracion, ThemePreset, TextColorValue, TextColorSettings } from '../lib/types'
import { PageHeader, Card } from '../components/UI'
import { useTheme, DEFAULT_THEME_SETTINGS } from '../lib/theme'
import { Chip, Stack, Switch } from '@mui/material'
import { Save, Building2, Mail, Palette, Sparkles, History, ArrowLeft, Eye, EyeOff, CheckCircle2, XCircle, Bot, FileSearch, Car, HardDrive, RefreshCw, UserCog, ShieldCheck, Image as ImageIcon, Upload, Trash2, Layers } from 'lucide-react'
import { CommunicationHistoryModal } from '../components/CommunicationHistoryModal'

// Servicios centralizados
import { getAiConfig, getFallbackConfig, testAiConnection } from '../services/aiProviderService'
import { getDocumentOcrConfig, testDocumentOcrConnection } from '../services/documentOcrService'
import { getPlateRecognizerConfig, testPlateRecognizerConnection } from '../services/plateRecognizerService'
import { can, hasRole, guardarPreferenciasUsuario, getPerfil } from '../services/authService'
import { AI_CATALOG, runAiHealthCheck } from '../services/aiCatalogService'


export function ConfiguracionPage() {
  const navigate = useNavigate()
  const [config, setConfig] = useState<Configuracion | null>(null)
  const [themePreset, setThemePreset] = useState<ThemePreset>(DEFAULT_THEME_SETTINGS.theme_preset)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [mostrarMenuModos, setMostrarMenuModos] = useState(false)
  const { themeSettings, setThemeSettings, saveThemeToDB, playSound, appearance } = useTheme()

  const perfil = getPerfil()
  const esDev = perfil?.esDeveloper || perfil?.email.toLowerCase() === 'iclomsinks@gmail.com'
  const [vistaModo, setVistaModo] = useState<'usuario' | 'desarrollador'>(esDev ? 'desarrollador' : 'usuario')

  // ----------------------------------------------------
  // ESTADOS DE SERVICIOS Y CLAVES API (OBJETIVO 1, 2, 3)
  // ----------------------------------------------------
  // 1. Ayudante IA
  const [aiProvider, setAiProvider] = useState<'gemini' | 'groq' | 'openai'>('gemini')
  const [aiModel, setAiModel] = useState('gemini-3.5-flash')
  const [aiApiKey, setAiApiKey] = useState('')
  const [showAiKey, setShowAiKey] = useState(false)
  const [aiStatus, setAiStatus] = useState<'connected' | 'disconnected' | 'testing' | 'error'>('disconnected')

  // 2. OCR Documentos
  const [docOcrProvider, setDocOcrProvider] = useState<'gemini' | 'tesseract'>('gemini')
  const [docOcrModel, setDocOcrModel] = useState('gemini-3.5-flash')
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

  // 5. Capas de Personalización (Sistema de 5 Capas de Alto Contraste)
  const [selectedLayer, setSelectedLayer] = useState<number>(0)
  const [activeLayerIndex, setActiveLayerIndex] = useState<number | null>(() => {
    const saved = localStorage.getItem('gestarian_active_layer')
    return saved !== null ? parseInt(saved, 10) : 0
  })

  const [customLayers, setCustomLayers] = useState<Array<{ name: string; colors: typeof defaultTextColors }>>(() => {
    const stored = localStorage.getItem('gestarian_custom_layers')
    if (stored) {
      try { return JSON.parse(stored) } catch (e) {}
    }
    return [
      { name: 'Capa 1 (Actual)', colors: { text_title: '#ffffff', text_primary: '#ffffff', text_input: '#ffffff', text_secondary: '#94a3b8', text_card: '#f8fafc' } },
      { name: 'Capa 2 (Neon High-Vis)', colors: { text_title: '#38bdf8', text_primary: '#ffffff', text_input: '#67e8f9', text_secondary: '#cbd5e1', text_card: '#ffffff' } },
      { name: 'Capa 3 (Amber Solar)', colors: { text_title: '#fbbf24', text_primary: '#ffffff', text_input: '#fde68a', text_secondary: '#d6d3d1', text_card: '#fafaf9' } },
      { name: 'Capa 4 (Emerald Glow)', colors: { text_title: '#34d399', text_primary: '#ffffff', text_input: '#a7f3d0', text_secondary: '#cbd5e1', text_card: '#f0fdf4' } },
      { name: 'Capa 5 (Ultra White)', colors: { text_title: '#ffffff', text_primary: '#ffffff', text_input: '#ffffff', text_secondary: '#e2e8f0', text_card: '#ffffff' } },
    ]
  })

  const saveLayerColors = (layerIdx: number, newColors: typeof defaultTextColors) => {
    const updated = [...customLayers]
    if (updated[layerIdx]) {
      updated[layerIdx] = { ...updated[layerIdx], colors: newColors }
      setCustomLayers(updated)
      localStorage.setItem('gestarian_custom_layers', JSON.stringify(updated))
    }
  }
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

      // Si existen claves API guardadas en Supabase, sincronizarlas en localStorage para todos los dispositivos
      if (data.ai_api_key) {
        localStorage.setItem('gestarian_gemini_api_key', data.ai_api_key)
        localStorage.setItem('gestarian_ai_assistant_config', JSON.stringify({
          provider: data.ai_provider || 'gemini',
          model: data.ai_model || 'gemini-3.7-flash',
          api_key: data.ai_api_key,
          status: 'connected'
        }))
        setAiApiKey(data.ai_api_key)
        if (data.ai_provider) setAiProvider(data.ai_provider)
        if (data.ai_model) setAiModel(data.ai_model)
      }

      if (data.doc_ocr_api_key) {
        localStorage.setItem('gestarian_document_ocr_config', JSON.stringify({
          provider: data.doc_ocr_provider || 'gemini',
          model: data.doc_ocr_model || 'gemini-3.7-flash',
          api_key: data.doc_ocr_api_key,
          status: 'connected'
        }))
        setDocOcrApiKey(data.doc_ocr_api_key)
        if (data.doc_ocr_provider) setDocOcrProvider(data.doc_ocr_provider)
        if (data.doc_ocr_model) setDocOcrModel(data.doc_ocr_model)
      }

      if (data.plate_api_key) {
        localStorage.setItem('gestarian_plate_recognizer_key', data.plate_api_key)
        localStorage.setItem('gestarian_plate_recognizer_config', JSON.stringify({
          provider: 'plate_recognizer',
          api_key: data.plate_api_key,
          endpoint_url: data.plate_endpoint || 'https://api.platerecognizer.com/v1/plate-reader/',
          status: 'connected'
        }))
        setPlateApiKey(data.plate_api_key)
        if (data.plate_endpoint) setPlateEndpoint(data.plate_endpoint)
      }

      if (data.fallback_api_key) {
        localStorage.setItem('gestarian_fallback_api_key', data.fallback_api_key)
        if (data.fallback_provider === 'openrouter') {
          localStorage.setItem('gestarian_openrouter_api_key', data.fallback_api_key)
        } else {
          localStorage.setItem('gestarian_groq_api_key', data.fallback_api_key)
        }
        localStorage.setItem('gestarian_fallback_ai_config', JSON.stringify({
          provider: data.fallback_provider || 'openrouter',
          model: data.fallback_model || 'deepseek/deepseek-chat:free',
          api_key: data.fallback_api_key,
          enabled: data.fallback_enabled ?? true,
          status: 'connected'
        }))
        setFallbackApiKey(data.fallback_api_key)
        if (data.fallback_provider) setFallbackProvider(data.fallback_provider)
        if (data.fallback_model) setFallbackModel(data.fallback_model)
        if (data.fallback_enabled !== undefined) setFallbackEnabled(data.fallback_enabled)
      }
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
    setAiModel(aiCfg.model || 'gemini-3.7-flash')
    setAiApiKey(aiCfg.api_key || localStorage.getItem('gestarian_gemini_api_key') || '')

    // Cargar OCR Documentos
    const docCfg = getDocumentOcrConfig()
    setDocOcrProvider(docCfg.provider as any || 'gemini')
    setDocOcrModel(docCfg.model || 'gemini-3.7-flash')
    setDocOcrApiKey(docCfg.api_key || localStorage.getItem('gestarian_gemini_api_key') || '')

    // Cargar Plate Recognizer
    const plateCfg = getPlateRecognizerConfig()
    setPlateApiKey(plateCfg.api_key || localStorage.getItem('gestarian_plate_recognizer_key') || '')
    setPlateEndpoint(plateCfg.endpoint_url || 'https://api.platerecognizer.com/v1/plate-reader/')

    // Cargar Fallback IA
    const fallbackCfg = getFallbackConfig()
    const storedFallbackKey = localStorage.getItem('gestarian_fallback_api_key') || localStorage.getItem('gestarian_openrouter_api_key') || localStorage.getItem('gestarian_groq_api_key') || fallbackCfg.api_key || ''
    setFallbackEnabled(fallbackCfg.enabled ?? (!!storedFallbackKey))
    setFallbackProvider((fallbackCfg.provider as any) || 'openrouter')
    setFallbackModel(fallbackCfg.model || 'deepseek/deepseek-chat:free')
    setFallbackApiKey(storedFallbackKey)

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

    // 1. Guardar configuraciones de Servicios externos en localStorage
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

    // Guardar preferencias personales en tabla preferencias_usuario
    await guardarPreferenciasUsuario({
      capaVisual: activeLayerIndex !== null ? activeLayerIndex.toString() : 'default',
      tema: appearance.modo_diurno ? 'claro' : 'oscuro'
    })

    // 3. Persistir Configuración Global solo si tiene permiso
    const puedeConfigGlobal = can('configuracion_global') || hasRole('admin') || hasRole('developer') || getPerfil()?.esDeveloper

    if (puedeConfigGlobal) {
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
        // Guardar claves centralizadas para sincronizar todos los móviles/PCs
        ai_provider: aiProvider,
        ai_model: aiModel,
        ai_api_key: aiApiKey,
        doc_ocr_provider: docOcrProvider,
        doc_ocr_model: docOcrModel,
        doc_ocr_api_key: docOcrApiKey,
        plate_api_key: plateApiKey,
        plate_endpoint: plateEndpoint,
        fallback_provider: fallbackProvider,
        fallback_model: fallbackModel,
        fallback_api_key: fallbackApiKey,
        fallback_enabled: fallbackEnabled,
        // Notificaciones y WhatsApp
        email_api_key: config.email_api_key,
        email_from: config.email_from,
        notificaciones_activas: config.notificaciones_activas,
        whatsapp_api_key: config.whatsapp_api_key,
        whatsapp_phone_number_id: config.whatsapp_phone_number_id,
        // Configuración de Planes PRO / FREE / ENTERPRISE
        plan_activo: config.plan_activo || (config.pro_activo ? 'PRO' : 'FREE'),
        precio_pro_mensual: config.precio_pro_mensual ?? 0,
        precio_pro_anual: config.precio_pro_anual ?? 0,
        precio_enterprise_mensual: config.precio_enterprise_mensual ?? 0,
        precio_enterprise_anual: config.precio_enterprise_anual ?? 0,
        dias_prueba_pro: config.dias_prueba_pro ?? 0,
        pro_activo: config.pro_activo ?? false,
        limite_usuarios_free: config.limite_usuarios_free ?? 3
      }).eq('id', 1)

      await saveThemeToDB(themeSettings)
    }

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

  useEffect(() => {
    if (testResult) {
      setTimeout(() => {
        const el = document.getElementById(`test-result-${testResult.service.replace(/\s+/g, '-')}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 100);
    }
  }, [testResult])

  const renderTestResult = (serviceName: string) => {
    if (testResult?.service !== serviceName) return null;
    return (
      <div 
        id={`test-result-${serviceName.replace(/\s+/g, '-')}`}
        className={`mt-3 p-3 rounded-xl border flex items-start justify-between gap-2 animate-fade-in ${
          testResult.success ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
        }`}
      >
        <div className="flex items-start gap-2">
          {testResult.success ? <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" /> : <XCircle className="w-5 h-5 shrink-0 mt-0.5" />}
          <p className="text-xs font-semibold leading-relaxed">{testResult.message}</p>
        </div>
        <button onClick={() => setTestResult(null)} className="opacity-50 hover:opacity-100 shrink-0 p-1">
          <XCircle className="w-4 h-4" />
        </button>
      </div>
    )
  }

  if (!config) {
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
        <div className="text-center py-16 text-slate-500 font-bold">Cargando configuración...</div>
      </div>
    )
  }

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

      {/* CONTROL MAESTRO DE DESARROLLADOR Y ACCESO A MODOS */}
      {esDev && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-900/90 border-2 border-indigo-500/40 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-black">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-black text-white uppercase tracking-wider">Control Maestro de Desarrollador</p>
                <p className="text-[11px] text-slate-400">Accede directamente a cualquier entorno y modo de la aplicación</p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Botón General: ENTRAR A MODOS */}
              <button
                type="button"
                onClick={() => setMostrarMenuModos(!mostrarMenuModos)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.5)] transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer font-extrabold"
              >
                <Layers className="w-4 h-4 text-slate-950" />
                <span>Entrar a Modos {mostrarMenuModos ? '▲' : '▼'}</span>
              </button>
            </div>
          </div>

          {/* DESPLEGABLE: ACCESOS DIRECTOS A MODOS PARA DESARROLLO */}
          {mostrarMenuModos && (
            <div className="p-4 rounded-2xl bg-slate-900/95 border-2 border-amber-500/40 shadow-[0_0_30px_rgba(245,158,11,0.2)] animate-fade-in space-y-3">
              <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
                <div className="flex items-center gap-2 text-amber-400 font-black text-xs uppercase tracking-wider">
                  <Sparkles className="w-4 h-4" />
                  <span>MODOS DE LA APLICACIÓN (ACCESO RÁPIDO DESARROLLADOR)</span>
                </div>
                <span className="text-[10px] text-slate-400">
                  Podrás volver aquí en cualquier momento con el botón flotante superior
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                {/* 1. Formulario Registro */}
                <button
                  type="button"
                  onClick={() => navigate('/registro-taller')}
                  className="p-3.5 rounded-xl bg-slate-950 border border-emerald-500/40 hover:border-emerald-400 text-left transition-all hover:scale-[1.02] active:scale-95 group cursor-pointer shadow-md"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-black text-emerald-400 uppercase tracking-wider group-hover:text-emerald-300">
                      1. Formulario Registro
                    </span>
                    <Building2 className="w-4 h-4 text-emerald-400" />
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Alta de nuevos talleres y datos fiscales de clientes GESTARIAN
                  </p>
                </button>

                {/* 2. Modo Usuario */}
                <button
                  type="button"
                  onClick={() => {
                    localStorage.setItem('gestarian_dev_mode', 'false')
                    navigate('/')
                  }}
                  className="p-3.5 rounded-xl bg-slate-950 border border-cyan-500/40 hover:border-cyan-400 text-left transition-all hover:scale-[1.02] active:scale-95 group cursor-pointer shadow-md"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-black text-cyan-400 uppercase tracking-wider group-hover:text-cyan-300">
                      2. Modo Usuario
                    </span>
                    <UserCog className="w-4 h-4 text-cyan-400" />
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Panel del titular/administrador de taller (Gestión interna)
                  </p>
                </button>

                {/* 3. Área de Cliente */}
                <button
                  type="button"
                  onClick={() => navigate('/cliente/acceso')}
                  className="p-3.5 rounded-xl bg-slate-950 border border-blue-500/40 hover:border-blue-400 text-left transition-all hover:scale-[1.02] active:scale-95 group cursor-pointer shadow-md"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-black text-blue-400 uppercase tracking-wider group-hover:text-blue-300">
                      3. Área de Cliente
                    </span>
                    <Car className="w-4 h-4 text-blue-400" />
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Portal de consulta y seguimiento para conductores
                  </p>
                </button>

                {/* 4. Modo Empleado */}
                <button
                  type="button"
                  onClick={() => navigate('/acceso-empleado')}
                  className="p-3.5 rounded-xl bg-slate-950 border border-indigo-500/40 hover:border-indigo-400 text-left transition-all hover:scale-[1.02] active:scale-95 group cursor-pointer shadow-md"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-black text-indigo-400 uppercase tracking-wider group-hover:text-indigo-300">
                      4. Modo Empleado
                    </span>
                    <Bot className="w-4 h-4 text-indigo-400" />
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Portal de personal autorizado para órdenes de trabajo
                  </p>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between bg-slate-900/60 p-4 rounded-2xl border border-slate-800 backdrop-blur-md">
        <h2 className="text-xl font-black text-white tracking-tight">
          {vistaModo === 'desarrollador' ? 'Panel de Ajustes Globales y Desarrollador' : 'Panel de Ajustes del Taller'}
        </h2>
        <button 
          onClick={handleSave} 
          disabled={saving} 
          className="flex items-center gap-2 text-white font-bold bg-cyan-600 hover:bg-cyan-500 transition-all rounded-xl px-5 py-2.5 shadow-lg active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          <Save className="w-5 h-5" /> {saving ? 'Guardando...' : saved ? 'Guardado ✓' : 'Guardar todo'}
        </button>
      </div>

      {/* ================================================== */}
      {/* SECCIÓN 1: INTELIGENCIA ARTIFICIAL Y SERVICIOS (SOLO DESARROLLADOR) */}
      {/* ================================================== */}
      {vistaModo === 'desarrollador' && (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-cyan-400" />
            <h2 className="text-xl font-black text-white uppercase tracking-tight">GESTIÓN DE IA Y SERVICIOS (CATÁLOGO UNIVERSAL)</h2>
          </div>

          <button
            type="button"
            onClick={async () => {
              const res = await runAiHealthCheck()
              setTestResult({
                service: 'ESCANEO DE SALUD IA',
                message: res.report.join(' | '),
                success: res.status === 'ok'
              })
            }}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-cyan-500/40 text-cyan-300 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md"
          >
            <RefreshCw className="w-4 h-4 text-cyan-400" />
            <span>Escanear disponibilidad de modelos</span>
          </button>
        </div>

        {renderTestResult('ESCANEO DE SALUD IA')}

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
                    else setAiModel('gemini-3.5-flash')
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Proveedor IA</label>
                  <select 
                    value={aiProvider} 
                    onChange={(e) => {
                      const p = e.target.value as any
                      setAiProvider(p)
                      const firstModel = AI_CATALOG[p]?.models[0]?.id || 'gemini-3.5-flash'
                      setAiModel(firstModel)
                    }}
                    className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none cursor-pointer"
                  >
                    {Object.values(AI_CATALOG).map(prov => (
                      <option key={prov.id} value={prov.id}>
                        {prov.logo} {prov.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Modelo Activo</label>
                  <select 
                    value={aiModel} 
                    onChange={(e) => setAiModel(e.target.value)}
                    className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none cursor-pointer"
                  >
                    {(AI_CATALOG[aiProvider]?.models || AI_CATALOG.gemini.models).map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name} {m.badge ? `(${m.badge})` : ''}
                      </option>
                    ))}
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
              {renderTestResult('AYUDANTE IA GESTARIAN')}
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
                  <label className="block text-xs font-bold text-slate-400 mb-1">Proveedor OCR</label>
                  <select 
                    value={docOcrProvider} 
                    onChange={(e) => {
                      const p = e.target.value as any
                      setDocOcrProvider(p)
                      if (p === 'gemini') setDocOcrModel('gemini-3.5-flash')
                      else if (p === 'openai') setDocOcrModel('gpt-4o-mini')
                      else if (p === 'anthropic') setDocOcrModel('claude-3-5-haiku-20241022')
                      else if (p === 'tesseract') setDocOcrModel('tesseract-local')
                    }}
                    className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none cursor-pointer"
                  >
                    <option value="gemini">✨ Google Gemini Vision (Recomendado)</option>
                    <option value="openai">🟢 OpenAI GPT-4o Vision</option>
                    <option value="anthropic">🟣 Claude 3.5 Sonnet Vision</option>
                    <option value="tesseract">📄 Tesseract Local (Sin API Key)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Modelo OCR</label>
                  <select 
                    value={docOcrModel} 
                    onChange={(e) => setDocOcrModel(e.target.value)}
                    className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none cursor-pointer"
                  >
                    {docOcrProvider === 'gemini' ? (
                      AI_CATALOG.gemini.models.filter(m => m.isMultimodal).map(m => (
                        <option key={m.id} value={m.id}>
                          {m.name} {m.badge ? `(${m.badge})` : ''}
                        </option>
                      ))
                    ) : docOcrProvider === 'openai' ? (
                      AI_CATALOG.openai.models.filter(m => m.isMultimodal).map(m => (
                        <option key={m.id} value={m.id}>
                          {m.name} {m.badge ? `(${m.badge})` : ''}
                        </option>
                      ))
                    ) : docOcrProvider === 'anthropic' ? (
                      AI_CATALOG.anthropic.models.filter(m => m.isMultimodal).map(m => (
                        <option key={m.id} value={m.id}>
                          {m.name} {m.badge ? `(${m.badge})` : ''}
                        </option>
                      ))
                    ) : (
                      <option value="tesseract-local">Tesseract OCR Motor Nativo</option>
                    )}
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
              {renderTestResult('OCR DE FACTURAS Y DOCUMENTOS')}
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
              {renderTestResult('OCR DE MATRÍCULAS')}
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
                  <span className="text-xs text-purple-400 font-semibold uppercase">{fallbackProvider}</span>
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
                  onChange={(e) => setFallbackProvider(e.target.value as any)}
                  className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none cursor-pointer"
                >
                  <option value="openrouter">OpenRouter</option>
                  <option value="groq">Groq</option>
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="gemini">Google Gemini</option>
                  <option value="custom">Personalizado / Otro</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Modelo Fallback</label>
                <input 
                  type="text" 
                  value={fallbackModel} 
                  onChange={(e) => setFallbackModel(e.target.value)}
                  placeholder="ej. llama-3.3-70b-versatile, deepseek/deepseek-chat:free..."
                  className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono font-bold text-purple-300 focus:border-purple-500 focus:outline-none"
                />
                {/* Botones de modelos vigentes y activos */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {fallbackProvider === 'groq' ? (
                    [
                      { id: 'openai/gpt-oss-20b', label: 'GPT-OSS 20B (1000 tps) ⭐' },
                      { id: 'openai/gpt-oss-120b', label: 'GPT-OSS 120B (500 tps)' },
                      { id: 'groq/compound', label: 'Groq Compound (Agentic)' },
                      { id: 'qwen/qwen3.6-27b', label: 'Qwen 3.6 27B' },
                      { id: 'groq/compound-mini', label: 'Compound Mini' },
                    ].map(m => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setFallbackModel(m.id)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-mono border transition-all ${
                          fallbackModel === m.id
                            ? 'bg-purple-500/20 border-purple-500 text-purple-300 font-bold'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))
                  ) : fallbackProvider === 'openrouter' ? (
                    [
                      { id: 'deepseek/deepseek-chat:free', label: 'DeepSeek V3 (Free) ⭐' },
                      { id: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 (Free)' },
                      { id: 'deepseek/deepseek-r1:free', label: 'DeepSeek R1 (Free)' },
                    ].map(m => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setFallbackModel(m.id)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-mono border transition-all ${
                          fallbackModel === m.id
                            ? 'bg-purple-500/20 border-purple-500 text-purple-300 font-bold'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))
                  ) : null}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-400">
                    Clave API {fallbackProvider.toUpperCase()}
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
                  {fallbackProvider === 'groq' && (
                    <a
                      href="https://console.groq.com/keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-bold text-orange-400 hover:text-orange-300 underline"
                    >
                      Consola Groq ↗
                    </a>
                  )}
                </div>
                <div className="relative">
                  <input 
                    type={showFallbackKey ? "text" : "password"} 
                    value={fallbackApiKey} 
                    onChange={(e) => setFallbackApiKey(e.target.value)}
                    placeholder={fallbackProvider === 'openrouter' ? "sk-or-v1-..." : fallbackProvider === 'groq' ? "gsk_..." : "sk-..."}
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
                {fallbackProvider === 'groq' 
                  ? 'Modelos activos Groq: Llama 3.3 70B (Máxima calidad) o Llama 3.1 8B Instant (Ultra rápido).'
                  : 'Modelos gratuitos OpenRouter: DeepSeek V3 o Llama 3.3 70B.'}
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
            {renderTestResult('IA ALTERNATIVA / FALLBACK')}
          </Card>

        </div>
      </div>
      )}

      {/* ================================================== */}
      {/* SECCIÓN 2: PREFERENCIAS PERSONALES: PERSONALIZACIÓN & 5 CAPAS */}
      {/* ================================================== */}
      <Card className="p-6 space-y-6 border border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Palette className="w-6 h-6 text-cyan-400" />
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-tight">PERSONALIZACIÓN DE LA INTERFAZ</h2>
              <span className="text-xs text-slate-400 font-medium">Sistema de 5 Capas de Estilo y Alto Contraste</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                const nextActive = activeLayerIndex === selectedLayer ? null : selectedLayer;
                setActiveLayerIndex(nextActive);
                if (nextActive !== null) {
                  const layerConfig = customLayers[nextActive];
                  setTextColors(layerConfig.colors);
                  localStorage.setItem('gestarian_active_layer', nextActive.toString());
                  localStorage.setItem('gestarian_text_colors', JSON.stringify(layerConfig.colors));
                  const root = document.documentElement;
                  root.style.setProperty('--text-title', layerConfig.colors.text_title);
                  root.style.setProperty('--text-primary', layerConfig.colors.text_primary);
                  root.style.setProperty('--text-input', layerConfig.colors.text_input);
                  root.style.setProperty('--text-secondary', layerConfig.colors.text_secondary);
                  root.style.setProperty('--text-card', layerConfig.colors.text_card);
                } else {
                  localStorage.removeItem('gestarian_active_layer');
                }
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all flex items-center gap-1.5 ${
                activeLayerIndex === selectedLayer
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              {activeLayerIndex === selectedLayer ? '✓ Capa Activa' : 'Activar Capa'}
            </button>
          </div>
        </div>

        {/* ── SELECTOR DE LAS 5 CAPAS DE PERSONALIZACIÓN ── */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {[0, 1, 2, 3, 4].map((idx) => {
            const layer = customLayers[idx] || { name: `Capa ${idx + 1}` };
            const isSelected = selectedLayer === idx;
            const isCurrentActive = activeLayerIndex === idx;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setSelectedLayer(idx);
                  if (customLayers[idx]) {
                    setTextColors(customLayers[idx].colors);
                  }
                }}
                className={`flex-1 min-w-[100px] py-3 px-3 rounded-xl border text-center transition-all relative ${
                  isSelected
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)] font-black'
                    : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200 font-bold'
                }`}
              >
                <div className="text-xs uppercase tracking-wider flex items-center justify-center gap-1.5">
                  {layer.name || `Capa ${idx + 1}`}
                  {isCurrentActive && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
                  )}
                </div>
                <div className="text-[10px] opacity-60 mt-0.5">
                  {isCurrentActive ? 'En uso' : isSelected ? 'Editando' : 'Inactiva'}
                </div>
              </button>
            );
          })}
        </div>

        {/* ── EDITOR DE COLORES DE LA CAPA SELECCIONADA ── */}
        <div className="space-y-5 bg-slate-950 p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white uppercase">
                Ajuste Fino de la {customLayers[selectedLayer]?.name || `Capa ${selectedLayer + 1}`}
              </h3>
              <p className="text-xs text-slate-400">Garantía de Alto Contraste: Fondos oscuros con textos claros y luminosos.</p>
            </div>
            <span className="text-xs text-cyan-400 font-semibold bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">
              {activeLayerIndex === selectedLayer ? 'Capa Aplicada en la App' : 'Borrador de Capa'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* A. TÍTULOS */}
            <TextColorSelector
              label="A. TÍTULOS"
              value={textColors.text_title}
              onChange={(val) => {
                const updated = { ...textColors, text_title: val };
                setTextColors(updated);
                saveLayerColors(selectedLayer, updated);
              }}
            />

            {/* B. TEXTOS PRINCIPALES */}
            <TextColorSelector
              label="B. TEXTOS PRINCIPALES"
              value={textColors.text_primary}
              onChange={(val) => {
                const updated = { ...textColors, text_primary: val };
                setTextColors(updated);
                saveLayerColors(selectedLayer, updated);
              }}
            />

            {/* C. TEXTOS DE INPUTS */}
            <TextColorSelector
              label="C. TEXTOS DE INPUTS"
              value={textColors.text_input}
              onChange={(val) => {
                const updated = { ...textColors, text_input: val };
                setTextColors(updated);
                saveLayerColors(selectedLayer, updated);
              }}
            />

            {/* D. TEXTOS SECUNDARIOS */}
            <TextColorSelector
              label="D. TEXTOS SECUNDARIOS"
              value={textColors.text_secondary}
              onChange={(val) => {
                const updated = { ...textColors, text_secondary: val };
                setTextColors(updated);
                saveLayerColors(selectedLayer, updated);
              }}
            />

            {/* E. TEXTOS DE TARJETAS */}
            <TextColorSelector
              label="E. TEXTOS DE TARJETAS"
              value={textColors.text_card}
              onChange={(val) => {
                const updated = { ...textColors, text_card: val };
                setTextColors(updated);
                saveLayerColors(selectedLayer, updated);
              }}
            />
          </div>
        </div>

        {/* ── PRESETS DE ESTILO VISUAL MODERNO (LIBRERÍA DE ALTO CONTRASTE) ── */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase text-slate-300 tracking-wide">
              Librería de Presets Visuales Modernos (Alto Contraste)
            </h3>
            <span className="text-[11px] text-slate-400">Tonalidades optimizadas para legibilidad de taller</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {[
              { id: 'classic', name: 'Titanium Blue', border: '#06b6d4', bg: '#090d16', text: '#ffffff' },
              { id: 'cyberpunk', name: 'Cyber Neon', border: '#ec4899', bg: '#050508', text: '#ffffff' },
              { id: 'nordic', name: 'Nordic Frost', border: '#88c0d0', bg: '#242933', text: '#ffffff' },
              { id: 'emerald_oled', name: 'Emerald OLED', border: '#10b981', bg: '#01140f', text: '#ffffff' },
              { id: 'amber_gold', name: 'Amber Gold', border: '#f59e0b', bg: '#0c0a09', text: '#ffffff' },
              { id: 'slate_contrast', name: 'Slate High-Vis', border: '#6366f1', bg: '#020617', text: '#ffffff' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  handlePresetChange(p.id as any);
                  const modern = MODERN_THEME_PRESETS[p.id];
                  if (modern) {
                    setThemeSettings((prev) => ({ ...prev, ...modern }));
                  }
                }}
                className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden group ${
                  themePreset === p.id
                    ? 'border-cyan-400 bg-slate-900 shadow-[0_0_12px_rgba(6,182,212,0.4)] scale-105'
                    : 'border-slate-800 bg-slate-950 hover:border-slate-700 hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: p.border }} />
                  <span className="text-xs font-bold text-white truncate">{p.name}</span>
                </div>
                <div className="text-[10px] text-slate-400">100% Contraste</div>
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* ================================================== */}
      {/* SECCIÓN 3: CONFIGURACIÓN DE EMPRESA Y ADMINISTRACIÓN (GLOBAL) */}
      {/* ================================================== */}
      <div className="space-y-6">
        {/* Datos Fiscales y Comunicaciones */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="w-5 h-5 text-[var(--primary)]" />
                <h2 className="text-lg font-semibold text-white">Datos Fiscales</h2>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Nombre empresa</label>
                  <input
                    type="text"
                    value={config.nombre_empresa || ''}
                    onChange={(e) => setConfig({ ...config, nombre_empresa: e.target.value })}
                    className="w-full bg-[#111827] text-white rounded-2xl px-4 py-3 border border-slate-800 focus:border-cyan-500 focus:outline-none text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">CIF / NIF</label>
                  <input
                    type="text"
                    value={config.cif || ''}
                    onChange={(e) => setConfig({ ...config, cif: e.target.value })}
                    className="w-full bg-[#111827] text-white rounded-2xl px-4 py-3 border border-slate-800 focus:border-cyan-500 focus:outline-none text-sm font-semibold uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Dirección</label>
                  <input
                    type="text"
                    value={config.direccion || ''}
                    onChange={(e) => setConfig({ ...config, direccion: e.target.value })}
                    className="w-full bg-[#111827] text-white rounded-2xl px-4 py-3 border border-slate-800 focus:border-cyan-500 focus:outline-none text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={config.telefono ?? ''}
                    onChange={(e) => setConfig({ ...config, telefono: e.target.value })}
                    className="w-full bg-[#111827] text-white rounded-2xl px-4 py-3 border border-slate-800 focus:border-cyan-500 focus:outline-none text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Email</label>
                  <input
                    type="email"
                    value={config.email ?? ''}
                    onChange={(e) => setConfig({ ...config, email: e.target.value })}
                    className="w-full bg-[#111827] text-white rounded-2xl px-4 py-3 border border-slate-800 focus:border-cyan-500 focus:outline-none text-sm font-semibold"
                  />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-[var(--primary)]" />
                  <h2 className="text-lg font-semibold text-white">Comunicaciones & Notificaciones</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowHistoryModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-xs font-semibold border border-indigo-500/40 transition-colors cursor-pointer"
                >
                  <History className="w-4 h-4" /> Historial de Envíos
                </button>
              </div>

              {/* AVISO IMPORTANTE PARA PLANES PRO / ENTERPRISE */}
              {(config.pro_activo || config.plan_activo === 'PRO' || config.plan_activo === 'ENTERPRISE') && (
                <div className="mb-4 p-3.5 rounded-2xl bg-amber-950/40 border-2 border-amber-500/60 flex items-start gap-3 text-amber-200 text-xs leading-relaxed shadow-lg">
                  <span className="text-base shrink-0">⚠️</span>
                  <div>
                    <span className="font-black uppercase tracking-wider text-amber-300 block mb-0.5">
                      Requerimiento Plan {config.plan_activo || 'PRO'} / Asesoría Fiscal:
                    </span>
                    <span>
                      Para un correcto funcionamiento operativo, envío automatizado de cierres y comunicación de facturas, es <strong>imprescindible cumplimentar el Email de la gestoría</strong>.
                    </span>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                  <div>
                    <span className="text-xs font-bold text-white block">Notificaciones Automáticas por Email</span>
                    <span className="text-[10px] text-slate-400">Notificar al cliente cuando cambia el estado de su expediente</span>
                  </div>
                  <Switch
                    checked={config.notificaciones_activas ?? false}
                    onChange={(e) => setConfig({ ...config, notificaciones_activas: e.target.checked })}
                    sx={{ '& .MuiSwitch-thumb': { bgcolor: '#06b6d4' }, '& .Mui-checked + .MuiSwitch-track': { bgcolor: '#06b6d4' } }}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-400">Email gestoría</label>
                    {(config.pro_activo || config.plan_activo === 'PRO' || config.plan_activo === 'ENTERPRISE') && !config.email_gestoria && (
                      <span className="text-[10px] text-amber-400 font-bold uppercase animate-pulse">Pendiente de rellenar</span>
                    )}
                  </div>
                  <input
                    type="email"
                    value={config.email_gestoria ?? ''}
                    onChange={(e) => setConfig({ ...config, email_gestoria: e.target.value })}
                    placeholder="gestoria@asesoria.es"
                    className={`w-full bg-[#111827] text-white rounded-2xl px-4 py-3 border text-sm font-semibold focus:outline-none transition-all ${
                      (config.pro_activo || config.plan_activo === 'PRO' || config.plan_activo === 'ENTERPRISE') && !config.email_gestoria
                        ? 'border-amber-500/80 shadow-[0_0_12px_rgba(245,158,11,0.2)] focus:border-amber-400'
                        : 'border-slate-800 focus:border-cyan-500'
                    }`}
                  />
                </div>

                {/* Configuración Técnica Avanzada de Envíos (Solo Desarrollador) */}
                {esDev && vistaModo === 'desarrollador' && (
                  <div className="pt-3 border-t border-slate-800 space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-amber-400 uppercase tracking-wider">
                        ⚡ Conectores de Comunicación (Modo Desarrollador)
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1">Email Remitente (From)</label>
                      <input
                        type="email"
                        value={config.email_from ?? ''}
                        onChange={(e) => setConfig({ ...config, email_from: e.target.value })}
                        placeholder="notificaciones@taller.es"
                        className="w-full bg-[#111827] text-white rounded-2xl px-4 py-3 border border-slate-800 focus:border-cyan-500 focus:outline-none text-sm font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1">Email API Key (Resend / SendGrid)</label>
                      <input
                        type="password"
                        value={config.email_api_key ?? ''}
                        onChange={(e) => setConfig({ ...config, email_api_key: e.target.value })}
                        placeholder="re_123456789..."
                        className="w-full bg-[#111827] text-white rounded-2xl px-4 py-3 border border-slate-800 focus:border-cyan-500 focus:outline-none text-sm font-mono"
                      />
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-400">WhatsApp Business API</span>
                        <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">Preparado (Desactivado)</span>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1">WhatsApp Phone Number ID</label>
                        <input
                          type="text"
                          value={config.whatsapp_phone_number_id ?? ''}
                          onChange={(e) => setConfig({ ...config, whatsapp_phone_number_id: e.target.value })}
                          placeholder="1092837465..."
                          className="w-full bg-[#111827] text-white rounded-2xl px-4 py-3 border border-slate-800 focus:border-cyan-500 focus:outline-none text-sm font-semibold"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1">WhatsApp Access Token</label>
                        <input
                          type="password"
                          value={config.whatsapp_api_key ?? ''}
                          onChange={(e) => setConfig({ ...config, whatsapp_api_key: e.target.value })}
                          placeholder="EAA..."
                          className="w-full bg-[#111827] text-white rounded-2xl px-4 py-3 border border-slate-800 focus:border-cyan-500 focus:outline-none text-sm font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* ── SECCIÓN DE IMÁGENES DE PERSONALIZACIÓN DE LA APLICACIÓN ── */}
          <Card className="p-6 border-cyan-500/30 bg-slate-900/90 shadow-xl rounded-2xl">
            <div className="flex items-center gap-3 mb-4 border-b border-slate-800 pb-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white uppercase tracking-wider">Imágenes de Personalización Corporativa</h2>
                <p className="text-xs text-slate-400">Fondos de pantalla y logotipos corporativos para la app y documentos oficiales</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 1. IMAGEN LANDSCAPE */}
              <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-white text-sm uppercase tracking-wide text-cyan-400">1. IMAGEN LANDSCAPE</h3>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">1920 x 1080 px</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    Imagen de fondo de pantalla para visualización en tablet landscape (horizontal) y escritorio de PC.
                  </p>
                </div>

                <div className="flex flex-col items-center justify-center pt-2">
                  {config.fondo_landscape ? (
                    <div className="w-full space-y-3 flex flex-col items-center">
                      <div className="w-full h-36 rounded-xl overflow-hidden border-2 border-cyan-500/40 bg-black/60 shadow-lg relative group">
                        <img src={config.fondo_landscape} alt="Fondo Landscape" className="w-full h-full object-cover" />
                      </div>
                      <label className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-slate-700 active:scale-95 shadow">
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Reemplazar Imagen</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              const reader = new FileReader()
                              reader.onload = (event) => {
                                setConfig({ ...config, fondo_landscape: event.target?.result as string })
                              }
                              reader.readAsDataURL(file)
                            }
                          }}
                        />
                      </label>
                    </div>
                  ) : (
                    <label className="w-full py-8 border-2 border-dashed border-slate-700 hover:border-cyan-500/60 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all bg-slate-900/40 hover:bg-cyan-500/5 group">
                      <div className="w-10 h-10 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Upload className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold text-slate-300 group-hover:text-cyan-300">Adjuntar Imagen Landscape</span>
                      <span className="text-[10px] text-slate-500">JPG, PNG o WebP (1920x1080p)</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            const reader = new FileReader()
                            reader.onload = (event) => {
                              setConfig({ ...config, fondo_landscape: event.target?.result as string })
                            }
                            reader.readAsDataURL(file)
                          }
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* 2. IMAGEN PORTRAIT */}
              <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-white text-sm uppercase tracking-wide text-cyan-400">2. IMAGEN PORTRAIT</h3>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">1080 x 1920 px</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    Imagen de fondo de pantalla para visualización en tablet portrait (vertical) y teléfonos móviles.
                  </p>
                </div>

                <div className="flex flex-col items-center justify-center pt-2">
                  {config.fondo_portrait ? (
                    <div className="w-full space-y-3 flex flex-col items-center">
                      <div className="w-32 h-44 rounded-xl overflow-hidden border-2 border-cyan-500/40 bg-black/60 shadow-lg relative group">
                        <img src={config.fondo_portrait} alt="Fondo Portrait" className="w-full h-full object-cover" />
                      </div>
                      <label className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-slate-700 active:scale-95 shadow">
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Reemplazar Imagen</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              const reader = new FileReader()
                              reader.onload = (event) => {
                                setConfig({ ...config, fondo_portrait: event.target?.result as string })
                              }
                              reader.readAsDataURL(file)
                            }
                          }}
                        />
                      </label>
                    </div>
                  ) : (
                    <label className="w-full py-8 border-2 border-dashed border-slate-700 hover:border-cyan-500/60 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all bg-slate-900/40 hover:bg-cyan-500/5 group">
                      <div className="w-10 h-10 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Upload className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold text-slate-300 group-hover:text-cyan-300">Adjuntar Imagen Portrait</span>
                      <span className="text-[10px] text-slate-500">JPG, PNG o WebP (1080x1920p)</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            const reader = new FileReader()
                            reader.onload = (event) => {
                              setConfig({ ...config, fondo_portrait: event.target?.result as string })
                            }
                            reader.readAsDataURL(file)
                          }
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* 3. IMAGEN LOGOTIPO (COLOR) */}
              <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-white text-sm uppercase tracking-wide text-cyan-400">3. IMAGEN LOGOTIPO (COLOR)</h3>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">250 x 250 px</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    Logotipo a color para incrustar en el header de todas las páginas (excepto Inicio y menú footer). Actúa como botón de retorno que siempre redirige a la pantalla de Inicio. <strong className="text-cyan-300">Tamaño recomendado: 250x250px.</strong>
                  </p>
                </div>

                <div className="flex flex-col items-center justify-center pt-2">
                  {config.logo_color ? (
                    <div className="w-full space-y-3 flex flex-col items-center">
                      <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-cyan-500/40 bg-slate-900 p-2 shadow-lg flex items-center justify-center">
                        <img src={config.logo_color} alt="Logotipo Color" className="max-w-full max-h-full object-contain" />
                      </div>
                      <label className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-slate-700 active:scale-95 shadow">
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Reemplazar Logotipo</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              const reader = new FileReader()
                              reader.onload = (event) => {
                                setConfig({ ...config, logo_color: event.target?.result as string })
                              }
                              reader.readAsDataURL(file)
                            }
                          }}
                        />
                      </label>
                    </div>
                  ) : (
                    <label className="w-full py-8 border-2 border-dashed border-slate-700 hover:border-cyan-500/60 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all bg-slate-900/40 hover:bg-cyan-500/5 group">
                      <div className="w-10 h-10 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Upload className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold text-slate-300 group-hover:text-cyan-300">Adjuntar Logo a Color</span>
                      <span className="text-[10px] text-slate-500">250x250px · PNG transparente recomendado</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            const reader = new FileReader()
                            reader.onload = (event) => {
                              setConfig({ ...config, logo_color: event.target?.result as string })
                            }
                            reader.readAsDataURL(file)
                          }
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* 4. LOGO B/N (DOCUMENTOS) */}
              <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-white text-sm uppercase tracking-wide text-cyan-400">4. LOGO B/N (DOCUMENTOS)</h3>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">250 x 250 px</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    Logotipo en blanco y negro para incrustar en facturas y presupuestos oficiales, situado justo a la izquierda de los datos fiscales de la empresa en la cabecera A4. <strong className="text-cyan-300">Tamaño recomendado: 250x250px.</strong>
                  </p>
                </div>

                <div className="flex flex-col items-center justify-center pt-2">
                  {config.logo_bn ? (
                    <div className="w-full space-y-3 flex flex-col items-center">
                      <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-slate-600 bg-white p-2 shadow-lg flex items-center justify-center">
                        <img src={config.logo_bn} alt="Logo B/N" className="max-w-full max-h-full object-contain filter grayscale" />
                      </div>
                      <label className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-slate-700 active:scale-95 shadow">
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Reemplazar Logo B/N</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              const reader = new FileReader()
                              reader.onload = (event) => {
                                setConfig({ ...config, logo_bn: event.target?.result as string })
                              }
                              reader.readAsDataURL(file)
                            }
                          }}
                        />
                      </label>
                    </div>
                  ) : (
                    <label className="w-full py-8 border-2 border-dashed border-slate-700 hover:border-cyan-500/60 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all bg-slate-900/40 hover:bg-cyan-500/5 group">
                      <div className="w-10 h-10 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Upload className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold text-slate-300 group-hover:text-cyan-300">Adjuntar Logo B/N</span>
                      <span className="text-[10px] text-slate-500">250x250px · PNG / JPG para impresión A4</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            const reader = new FileReader()
                            reader.onload = (event) => {
                              setConfig({ ...config, logo_bn: event.target?.result as string })
                            }
                            reader.readAsDataURL(file)
                          }
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>
          </Card>

          <CommunicationHistoryModal
            isOpen={showHistoryModal}
            onClose={() => setShowHistoryModal(false)}
          />

          {/* ── SECCIÓN DE GESTIÓN DEL TALLER / DESARROLLADOR ────────── */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <HardDrive className="w-5 h-5 text-teal-400" />
              <h2 className="text-lg font-semibold text-white uppercase tracking-wider">
                {vistaModo === 'desarrollador' ? 'Gestión del Desarrollador y Licencias' : 'Gestión del Taller (Autorizados)'}
              </h2>
            </div>

            {vistaModo === 'desarrollador' ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. Botón de acceso a la página de CONFIGURACIÓN de usuario para edición */}
                <button
                  type="button"
                  onClick={() => setVistaModo('usuario')}
                  className="w-full flex items-center justify-between gap-4 px-4 py-4 rounded-xl bg-teal-500/10 border border-teal-500/30 hover:bg-teal-500/20 hover:border-teal-400/50 transition-all active:scale-[0.99] group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center group-hover:bg-teal-500/30 transition-colors shrink-0">
                      <Building2 className="w-5 h-5 text-teal-400" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-white text-xs uppercase tracking-wide">CONFIGURACIÓN DE USUARIO</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Editar panel de usuario del taller</p>
                    </div>
                  </div>
                  <Sparkles className="w-4 h-4 text-teal-400 opacity-60 group-hover:opacity-100 transition-opacity" />
                </button>

                {/* 2. Botón de USUARIOS para acceso al panel de control de licencias y usuarios registrados */}
                <button
                  type="button"
                  onClick={() => navigate('/licencias')}
                  className="w-full flex items-center justify-between gap-4 px-4 py-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30 hover:bg-indigo-500/20 hover:border-indigo-400/50 transition-all active:scale-[0.99] group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center group-hover:bg-indigo-500/30 transition-colors shrink-0">
                      <ShieldCheck className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-white text-xs uppercase tracking-wide">CONTROL DE USUARIOS (CLIENTES GESTARIAN)</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Autorizar altas de talleres, planes y fijar tarifas</p>
                    </div>
                  </div>
                  <Sparkles className="w-4 h-4 text-indigo-400 opacity-60 group-hover:opacity-100 transition-opacity" />
                </button>

                {/* 3. Botón del PORTAL DEL CLIENTE FINAL */}
                <button
                  type="button"
                  onClick={() => navigate('/cliente/demo')}
                  className="w-full flex items-center justify-between gap-4 px-4 py-4 rounded-xl bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 hover:border-amber-400/50 transition-all active:scale-[0.99] group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center group-hover:bg-amber-500/30 transition-colors shrink-0">
                      <Car className="w-5 h-5 text-amber-400" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-white text-xs uppercase tracking-wide">PORTAL CLIENTE FINAL</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Seguimiento de expediente y normativa</p>
                    </div>
                  </div>
                  <Sparkles className="w-4 h-4 text-amber-400 opacity-60 group-hover:opacity-100 transition-opacity" />
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/autorizados')}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 rounded-xl bg-teal-500/10 border border-teal-500/30 hover:bg-teal-500/20 hover:border-teal-400/50 transition-all active:scale-[0.99] group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-teal-500/20 flex items-center justify-center group-hover:bg-teal-500/30 transition-colors shrink-0">
                      <UserCog className="w-6 h-6 text-teal-400" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-white text-sm uppercase tracking-wide">AUTORIZADOS (EMPLEADOS DEL TALLER)</p>
                      <p className="text-xs text-slate-400 mt-0.5">Gestionar operarios, mecánicos y permisos de acceso</p>
                    </div>
                  </div>
                  <Sparkles className="w-5 h-5 text-teal-400 opacity-60 group-hover:opacity-100 transition-opacity" />
                </button>
              </div>
            )}
          </Card>

          {/* ── SECCIÓN DE PLAN DE SUSCRIPCIÓN (VISTA USUARIO VS DESARROLLADOR) ──── */}
          {vistaModo === 'usuario' ? (
            <Card className="p-6 mt-8 border-cyan-500/30 bg-slate-900/90 shadow-xl rounded-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-cyan-500 to-indigo-500 flex items-center justify-center text-slate-950 font-black shadow-md">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-white uppercase tracking-wider">
                      Su Plan de Suscripción Exclusivo
                    </h2>
                    <p className="text-xs text-slate-400">
                      Estado actual de su licencia del software GESTARIAN
                    </p>
                  </div>
                </div>

                <span className="px-3.5 py-1.5 rounded-full font-black text-xs uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Plan {config.plan_activo || (config.pro_activo ? 'PRO' : 'FREE')} Activo
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-white text-sm">
                    Modalidad: <span className="text-cyan-400 font-black uppercase">{config.plan_activo || 'PRO (Periodo Promoción Gratuito)'}</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Incluye gestión integral de expedientes, presupuestos A4, facturación con código QR AEAT y seguimiento para clientes.
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[11px] text-slate-500 block uppercase font-bold">Límite Autorizados</span>
                  <span className="text-base font-black text-white font-mono">{config.limite_usuarios_free ?? 3} Empleados</span>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="p-6 mt-8 border-cyan-500/40 bg-slate-900/90 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-cyan-500 to-indigo-500 flex items-center justify-center text-slate-950 font-black shadow-md">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-white uppercase tracking-wider">
                      Planes y Suscripciones GESTARIAN (Tarifas Globales)
                    </h2>
                    <p className="text-xs text-slate-400">
                      Configuración de precios y planes FREE, PRO y ENTERPRISE (Desarrollador)
                    </p>
                  </div>
                </div>

                {/* Selector de Plan Activo */}
                <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
                  {(['FREE', 'PRO', 'ENTERPRISE'] as const).map((p) => {
                    const currentPlan = config.plan_activo || (config.pro_activo ? 'PRO' : 'FREE')
                    const isSelected = currentPlan === p
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() =>
                          setConfig({
                            ...config,
                            plan_activo: p,
                            pro_activo: p === 'PRO' || p === 'ENTERPRISE'
                          })
                        }
                        className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all ${
                          isSelected
                            ? p === 'ENTERPRISE'
                              ? 'bg-indigo-600 text-white shadow-[0_0_12px_rgba(99,102,241,0.5)]'
                              : p === 'PRO'
                              ? 'bg-amber-500 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                              : 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.5)]'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {p}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Precio Mensual PRO */}
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block uppercase tracking-wider">
                    Precio PRO Mensual (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={config.precio_pro_mensual ?? 0}
                    onChange={(e) => setConfig({ ...config, precio_pro_mensual: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-bold focus:border-cyan-400 outline-none"
                  />
                  <span className="text-[10px] text-slate-400 block">Tarifa mensual plan PRO</span>
                </div>

                {/* Precio Anual PRO */}
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block uppercase tracking-wider">
                    Precio PRO Anual (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={config.precio_pro_anual ?? 0}
                    onChange={(e) => setConfig({ ...config, precio_pro_anual: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-bold focus:border-cyan-400 outline-none"
                  />
                  <span className="text-[10px] text-slate-400 block">Tarifa anual plan PRO</span>
                </div>

                {/* Días de Prueba Gratuita */}
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block uppercase tracking-wider">
                    Prueba Gratuita (Días)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={config.dias_prueba_pro ?? 0}
                    onChange={(e) => setConfig({ ...config, dias_prueba_pro: parseInt(e.target.value, 10) || 0 })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-bold focus:border-cyan-400 outline-none"
                  />
                  <span className="text-[10px] text-slate-400 block">Período de promoción o prueba de cortesía</span>
                </div>

                {/* Precio Mensual ENTERPRISE */}
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block uppercase tracking-wider">
                    Precio ENTERPRISE Mensual (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={config.precio_enterprise_mensual ?? 0}
                    onChange={(e) => setConfig({ ...config, precio_enterprise_mensual: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-bold focus:border-indigo-400 outline-none"
                  />
                  <span className="text-[10px] text-slate-400 block">Tarifa mensual Enterprise</span>
                </div>

                {/* Precio Anual ENTERPRISE */}
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block uppercase tracking-wider">
                    Precio ENTERPRISE Anual (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={config.precio_enterprise_anual ?? 0}
                    onChange={(e) => setConfig({ ...config, precio_enterprise_anual: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-bold focus:border-indigo-400 outline-none"
                  />
                  <span className="text-[10px] text-slate-400 block">Tarifa anual Enterprise</span>
                </div>

                {/* Límite Usuarios Plan FREE */}
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block uppercase tracking-wider">
                    Límite Autorizados FREE
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={config.limite_usuarios_free ?? 3}
                    onChange={(e) => setConfig({ ...config, limite_usuarios_free: parseInt(e.target.value, 10) || 1 })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-bold focus:border-cyan-400 outline-none"
                  />
                  <span className="text-[10px] text-slate-400 block">Tope de empleados en modo gratuito</span>
                </div>
              </div>
            </Card>
          )}

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
        </div>

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
