import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { ThemeSettings, AppearanceSettings } from './types'
import { supabase } from './supabase'

export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  id: 1,
  theme_preset: 'classic',
  primary_color: '#0f172a',
  secondary_color: '#334155',
  button_color: '#3b82f6',
  icon_color: '#64748b',
  warning_color: '#f59e0b',
  success_color: '#10b981',
  error_color: '#ef4444',
  is_dark_mode: true,
  card_color: '#1e293b',
  dashboard_color: '#0f172a',
  table_color: '#1e293b',
  header_color: '#0f172a',
  typography: 'Inter',
  font_size: '14px',
  border_radius: '0.5rem',
  shadows: 'md',
  spacing: 'normal',
  visual_density: 'normal',
  logo_url: null,
  logo_inicio_url: null,
  dashboard_image_url: null,
  background_image_url: null,
  favicon_url: null,
  commercial_name: null,
  splash_screen_url: null,
  pwa_icon_url: null,
  notification_color: '#3b82f6',
}

interface ThemeContextValue {
  themeSettings: ThemeSettings
  setThemeSettings: (s: ThemeSettings) => void
  saveThemeToDB: (s: ThemeSettings) => Promise<void>
  playSound: (type?: 'click' | 'success' | 'error') => void
  appearance: AppearanceSettings // Keep for backward compatibility until fully migrated
  setAppearance: (a: AppearanceSettings) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function applyCssVars(t: ThemeSettings) {
  const root = document.documentElement
  
  // Customization variables
  root.style.setProperty('--primary', t.primary_color)
  root.style.setProperty('--secondary', t.secondary_color)
  root.style.setProperty('--btn-color', t.button_color)
  root.style.setProperty('--icon-color', t.icon_color)
  root.style.setProperty('--warning', t.warning_color)
  root.style.setProperty('--success', t.success_color)
  root.style.setProperty('--error', t.error_color)
  root.style.setProperty('--card-bg', t.card_color)
  root.style.setProperty('--dashboard-bg', t.dashboard_color)
  root.style.setProperty('--table-bg', t.table_color)
  root.style.setProperty('--header-bg', t.header_color)
  root.style.setProperty('--radius', t.border_radius)
  root.style.setProperty('--font-family', t.typography)

  // Variables Centralizadas de Colores de Texto (OBJETIVO 4 & 5)
  // Regla de Oro: Los botones NUNCA heredan estas variables de texto.
  const storedTextColors = localStorage.getItem('gestarian_text_colors')
  let textColors = { text_title: '#ffffff', text_primary: '#f8fafc', text_input: '#ffffff', text_secondary: '#94a3b8', text_card: '#f8fafc' }
  if (storedTextColors) {
    try { textColors = { ...textColors, ...JSON.parse(storedTextColors) } } catch (e) {}
  }
  root.style.setProperty('--text-title', textColors.text_title)
  root.style.setProperty('--text-primary', textColors.text_primary)
  root.style.setProperty('--text-input', textColors.text_input)
  root.style.setProperty('--text-secondary', textColors.text_secondary)
  root.style.setProperty('--text-card', textColors.text_card)

  const shadowsMap = {
    none: 'none',
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  }
  root.style.setProperty('--shadow-custom', shadowsMap[t.shadows as keyof typeof shadowsMap] || shadowsMap.md)
  
  // Backwards compatibility with old variables
  root.style.setProperty('--color-fondo', t.dashboard_color)
  root.style.setProperty('--color-texto', textColors.text_primary || (t.is_dark_mode ? '#f8fafc' : '#0f172a'))
  root.style.setProperty('--color-glow', t.button_color)
  root.style.setProperty('--color-linea', t.secondary_color)
  root.style.setProperty('--color-relleno', t.card_color)
  root.style.setProperty('--color-relleno-btn', t.button_color)
  root.style.setProperty('--color-relleno-paneles', t.card_color)

  root.style.fontFamily = t.typography
  root.style.fontSize = t.font_size

  root.classList.remove('gestarian-day-mode', 'gestarian-night-mode', 'dark', 'light')
  if (t.is_dark_mode) {
    root.classList.add('gestarian-night-mode', 'dark')
  } else {
    root.classList.add('gestarian-day-mode', 'light')
  }

  // Favicon update
  if (t.favicon_url) {
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.getElementsByTagName('head')[0].appendChild(link);
    }
    link.href = t.favicon_url;
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeSettings, setThemeSettingsState] = useState<ThemeSettings>(DEFAULT_THEME_SETTINGS)
  // Legacy
  const [appearance, setAppearance] = useState<AppearanceSettings>({
    color_fondo: '#1c1c1e', color_texto: '#f5f5f7', color_glow_botones: '#40e0d0', color_linea_botones: '#8e8e93', color_relleno_campo: '#2c2c2e', color_relleno_botones: '#3a3a3c', color_relleno_paneles: '#2c2c2e', modo_diurno: false, animaciones_activadas: true, sonido_activado: true,
  })

  useEffect(() => {
    // 1. Try local storage first for instant load
    const stored = localStorage.getItem('gestarian-theme')
    if (stored) {
      try {
        const parsed = { ...DEFAULT_THEME_SETTINGS, ...JSON.parse(stored) }
        setThemeSettingsState(parsed)
        applyCssVars(parsed)
      } catch (e) {
        console.error('Error parsing local theme', e)
      }
    } else {
      applyCssVars(DEFAULT_THEME_SETTINGS)
    }

    // 2. Fetch from DB
    const loadFromDB = async () => {
      const { data, error } = await supabase.from('theme_settings').select('*').eq('id', 1).maybeSingle()
      if (data && !error) {
        const parsed = { ...DEFAULT_THEME_SETTINGS, ...data }
        setThemeSettingsState(parsed)
        applyCssVars(parsed)
        localStorage.setItem('gestarian-theme', JSON.stringify(parsed))
      }
    }
    loadFromDB()
  }, [])

  function setThemeSettings(t: ThemeSettings) {
    setThemeSettingsState(t)
    applyCssVars(t)
    localStorage.setItem('gestarian-theme', JSON.stringify(t))
  }

  async function saveThemeToDB(t: ThemeSettings) {
    setThemeSettings(t)
    await supabase.from('theme_settings').upsert({ id: 1, ...t })
  }

  function playSound(type: 'click' | 'success' | 'error' = 'click') {
    if (!appearance.sonido_activado) return
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      const freqs = { click: 600, success: 880, error: 300 }
      osc.frequency.value = freqs[type]
      osc.type = 'sine'
      gain.gain.setValueAtTime(0.08, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)
      osc.start()
      osc.stop(ctx.currentTime + 0.15)
    } catch {
      // AudioContext not available
    }
  }

  return (
    <ThemeContext.Provider value={{ themeSettings, setThemeSettings, saveThemeToDB, playSound, appearance, setAppearance }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}

