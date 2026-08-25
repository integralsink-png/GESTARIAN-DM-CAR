import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { Menu, X, Camera, Power, Minimize2, Smartphone, Monitor, ChevronLeft, ChevronRight, Plus, UserPlus } from 'lucide-react'
import { useState, useEffect } from 'react'
import { NAV_ITEMS, FOOTER_NAV } from '../lib/navigation'
import { useTheme } from '../lib/theme'
import { useUIState } from '../lib/uiStateContext'
import { useMobileMode } from '../lib/mobileMode'
import { MetisVoiceCall } from './MetisVoiceCall'
import { can, getPerfil } from '../services/authService'
import { supabase } from '../lib/supabase'

// Paleta de colores vibrantes para el menú
const MENU_COLORS = [
  '#06b6d4', // Cyan
  '#a855f7', // Purple
  '#3b82f6', // Blue
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#f43f5e', // Rose
  '#f97316', // Orange
  '#84cc16', // Lime
  '#6366f1', // Indigo
  '#14b8a6', // Teal
  '#d946ef', // Fuchsia
  '#eab308', // Yellow
]

/* ── Floating exit-fullscreen button (always visible while in fullscreen) ── */
export function FullscreenExitButton() {
  const { isFullscreen, exitFullscreen } = useUIState()
  const { playSound } = useTheme()
  const [showHint, setShowHint] = useState(false)

  if (!isFullscreen) return null

  const handleExit = () => {
    playSound('click')
    exitFullscreen()
    // Si no había elemento en fullscreen (caso F11 del navegador, que JS no puede
    // cancelar), avisamos de la única forma de salir: la tecla F11.
    if (!document.fullscreenElement) {
      setShowHint(true)
      window.setTimeout(() => setShowHint(false), 4500)
    }
  }

  return (
    <>
      {showHint && (
        <div className="fixed top-12 right-2 z-[70] bg-black/90 text-white text-xs px-3 py-2 rounded-lg border border-white/25 shadow-xl pointer-events-none">
          Pulsa <kbd className="font-bold text-[#40e0d0]">F11</kbd> (o <kbd className="font-bold text-[#40e0d0]">Esc</kbd>) para salir de pantalla completa
        </div>
      )}
      <button
        onClick={handleExit}
        className="fixed top-2 right-2 z-[70] w-10 h-10 flex items-center justify-center rounded-full bg-black/70 text-white border border-white/30 hover:bg-black/90 hover:border-[#40e0d0]/60 shadow-lg transition-all backdrop-blur-md active:scale-95"
        aria-label="Salir de pantalla completa"
        title="Salir de pantalla completa (Esc / F11)"
      >
        <Minimize2 className="w-5 h-5" />
      </button>
    </>
  )
}

/* 📱 Power button (mobile/tablet portrait, all pages, top left) 📱 */
export function PowerButton() {
  return (
    <button
      onClick={() => window.close()}
      className="gestarian-power-btn w-10 h-10 flex items-center justify-center lg:hidden fixed top-4 left-4 z-50 rounded-full border border-gray-600 bg-bg-900/80 backdrop-blur"
      title="Salir de la aplicación"
    >
      <Power className="w-5 h-5 text-red-500" />
    </button>
  )
}

/* ── Desktop header (PC / tablet landscape, auto-show on mouse-near-top) ── */
export function DesktopHeader() {
  const navigate = useNavigate()
  const location = useLocation()
  const { playSound, themeSettings } = useTheme()
  const { setHeaderHover, exitFullscreen } = useUIState()
  const { mobileMode, toggleMobileMode } = useMobileMode()
  const isInicio = location.pathname === '/'

  if (mobileMode && !window.matchMedia('(min-width: 1024px)').matches) return null

  const visibleNavItems = NAV_ITEMS.filter((item) => !item.permiso || can(item.permiso))
  const routes = visibleNavItems.filter((n) => n.path !== '/').map((n) => n.path)
  const currentIdx = routes.indexOf(location.pathname)
  const prev = currentIdx > 0 ? routes[currentIdx - 1] : null
  const next = currentIdx >= 0 && currentIdx < routes.length - 1 ? routes[currentIdx + 1] : null

  const [logoColor, setLogoColor] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('configuracion').select('logo_color').eq('id', 1).maybeSingle().then(({ data }) => {
      if (data?.logo_color) setLogoColor(data.logo_color)
    })
  }, [])

  return (
    <header
      onMouseEnter={() => setHeaderHover(true)}
      onMouseLeave={() => setHeaderHover(false)}
      className="hidden md:flex gestarian-header-bar visible gestarian-panel fixed top-0 left-0 right-0 z-50 items-center gap-2 px-4 py-2.5 border-b border-bg-700"
    >
      {!isInicio && (
        <button
          onClick={() => { playSound('click'); navigate('/') }}
          className="shrink-0 transition-transform active:scale-95"
          aria-label="Inicio"
          title="Ir a Inicio"
        >
          <img
            src={logoColor || themeSettings.logo_url || "/images/logos/logo.jpg"}
            alt={themeSettings.commercial_name || "GESTARIAN"}
            className="w-8 h-8 rounded-lg object-contain bg-slate-900/60 p-0.5 border border-white/20 shadow-sm"
          />
        </button>
      )}

      <button
        onClick={() => { if (prev) { playSound('click'); navigate(prev) } }}
        disabled={!prev}
        className="gestarian-nav-btn w-9 h-9 flex items-center justify-center disabled:opacity-30 shrink-0"
        aria-label="Retroceder"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <div className="flex-1 flex items-center gap-1 overflow-x-auto mx-2">
        {visibleNavItems.map((item) => {
          const isActive = location.pathname === item.path
          return (
            <button
              key={item.path}
              onClick={() => { playSound('click'); navigate(item.path) }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
                isActive
                  ? 'bg-[#40e0d0]/20 text-[#40e0d0] border border-[#40e0d0]/40'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/5'
              }`}
            >
              {item.label}
            </button>
          )
        })}
      </div>

      <button
        onClick={() => { playSound('click'); window.location.href = '/' }}
        className="gestarian-power-btn w-9 h-9 flex items-center justify-center shrink-0"
        aria-label="Salir"
      >
        <Power className="w-4 h-4" />
      </button>

      <button
        onClick={() => { playSound('click'); exitFullscreen() }}
        className="gestarian-nav-btn w-9 h-9 flex items-center justify-center shrink-0"
        aria-label="Salir de pantalla completa"
      >
        <Minimize2 className="w-4 h-4" />
      </button>

      <button
        onClick={() => { playSound('click'); toggleMobileMode() }}
        className={`gestarian-nav-btn w-9 h-9 flex items-center justify-center shrink-0 ${mobileMode ? 'text-[#40e0d0]' : ''}`}
        aria-label={mobileMode ? "Vista Escritorio" : "Vista Móvil"}
      >
        {mobileMode ? <Monitor className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
      </button>

      <button
        onClick={() => { if (next) { playSound('click'); navigate(next) } }}
        disabled={!next}
        className="gestarian-nav-btn w-9 h-9 flex items-center justify-center disabled:opacity-30 shrink-0"
        aria-label="Avanzar"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </header>
  )
}

/* ── Mobile/Tablet Portrait footer: Camera, Menu, Mic ── */
export function MobileFooter() {
  const { playSound } = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)
  const [shouldHide, setShouldHide] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  // Sonido de tap al pulsar botón de menú
  const [animatingBtn, setAnimatingBtn] = useState<string | null>(null)

  useEffect(() => {
    const handleToggle = (e: Event) => {
      const detail = (e as CustomEvent).detail
      setShouldHide(!!detail?.hide)
    }
    window.addEventListener('gestarian-toggle-footer', handleToggle)
    return () => window.removeEventListener('gestarian-toggle-footer', handleToggle)
  }, [])

  if (shouldHide) {
    return null
  }

  const triggerAnimatedAction = (btnKey: string, action: () => void) => {
    if ('vibrate' in navigator) navigator.vibrate([30, 40, 50])
    playSound('click')
    setAnimatingBtn(btnKey)
    setTimeout(() => {
      setAnimatingBtn(null)
      action()
    }, 450)
  }

  const handleNavClick = (path: string) => {
    if ('vibrate' in navigator) navigator.vibrate(40)
    playSound('click')
    setMenuOpen(false)
    navigate(path)
  }

  const isA4Document = ['/presupuestos', '/presupuesto-hibrido'].includes(location.pathname)
  if (isA4Document) return null

  const isInicio = location.pathname === '/'
  const perfil = getPerfil()
  const isDev = perfil?.esDeveloper || localStorage.getItem('gestarian_dev_mode') === 'true'

  // Para usuarios normales en INICIO: ocultar iconos de AI y conversación bidireccional
  const showAiControls = !isInicio || isDev

  return (
    <>
      {location.pathname !== '/' && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/90 via-black/[0.65] to-transparent z-40 pointer-events-none" />
      )}
      <nav className={`lg:hidden fixed bottom-6 left-0 right-0 z-50 flex items-center ${showAiControls ? 'justify-between' : 'justify-center gap-8'} px-6`}>
        <button
          onClick={() => triggerAnimatedAction('camera', () => navigate('/presupuesto-hibrido', { state: { startCamera: true } }))}
          className={`w-16 h-16 rounded-full bg-transparent text-[#40e0d0] shadow-[0_0_10px_rgba(64,224,208,0.9),inset_0_0_5px_rgba(64,224,208,0.9)] border-[1px] border-white flex items-center justify-center transition-all hover:scale-105 flex-shrink-0 ${animatingBtn === 'camera' ? 'scale-125 border-cyan-400' : ''}`}
          style={{ filter: 'drop-shadow(0 0 5px rgb(64, 224, 157))' }}
          aria-label="Cámara"
        >
          <div className={animatingBtn === 'camera' ? 'animate-icon-burst' : ''}>
            <Camera className="w-7 h-7" strokeWidth={1} color="white" />
          </div>
        </button>

        <button
          onClick={() => triggerAnimatedAction('menu', () => setMenuOpen(!menuOpen))}
          className={`w-16 h-16 rounded-full bg-transparent text-[#d3d3d3] shadow-[0_0_10px_rgba(211,211,211,0.9),inset_0_0_5px_rgba(211,211,211,0.9)] border-[1px] border-white flex items-center justify-center transition-all hover:scale-105 flex-shrink-0 ${animatingBtn === 'menu' ? 'scale-125 border-orange-400' : ''}`}
          style={{ filter: 'drop-shadow(0 0 5px #f15b04e7)' }}
          aria-label="Menú"
        >
          <div className={animatingBtn === 'menu' ? 'animate-icon-burst' : ''}>
            {menuOpen ? <X className="w-7 h-7" strokeWidth={1} color="white" /> : <Menu className="w-7 h-7" strokeWidth={1} color="white" />}
          </div>
        </button>

        {showAiControls && (
          <>
            <button
              onClick={() => triggerAnimatedAction('ai', () => window.dispatchEvent(new Event('metis-toggle-panel')))}
              className={`w-16 h-16 rounded-full bg-transparent text-white shadow-[0_0_5px_rgba(168,85,247,1)] border-[1px] border-white/50 flex items-center justify-center transition-all hover:scale-105 flex-shrink-0 relative animate-pulse ${animatingBtn === 'ai' ? 'scale-125 border-purple-400' : ''}`}
              style={{ backgroundColor: 'rgba(0,0,0,0)' }}
              aria-label="Asistente METIS"
            >
              <div className={animatingBtn === 'ai' ? 'animate-icon-burst' : ''}>
                <span className="font-thin text-[32px] text-transparent tracking-widest drop-shadow-[0_0_5px_rgba(168,85,247,1)]" style={{ WebkitTextStroke: '1px white' }}>AI</span>
              </div>
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-green-400 rounded-full border-[2px] border-transparent animate-metis-ping" />
            </button>

            <MetisVoiceCall />
          </>
        )}
      </nav>

      {menuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-[60] bg-bg-950 flex flex-col justify-between overflow-hidden"
          style={{
            backgroundImage: 'url(/images/backgrounds/background_portrait.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            ['--bento-gap' as any]: '8px',
          }}
        >
          {/* Overlay oscuro semitransparente sobre la imagen (reducido al 30%) */}
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm pointer-events-none" />

          {/* Botón cerrar */}
          <button
            onClick={() => setMenuOpen(false)}
            className="absolute top-2 right-2 z-20 w-8 h-8 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center text-white/70 hover:text-white transition-all active:scale-95 shadow-md"
            aria-label="Cerrar menú"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Bento grid — ocupando la totalidad del display adaptándose al espacio disponible con separación exterior x2 */}
          <div
            className="relative z-10 w-full h-full flex flex-col box-border"
            style={{
              padding: 'calc(var(--bento-gap) * 2)',
            }}
          >
            <div
              className="w-full h-full max-w-none grid"
              style={{
                gridTemplateColumns: 'repeat(12, 1fr)',
                gridTemplateRows: 'repeat(7, 1fr)',
                gap: 'var(--bento-gap)',
              }}
            >
              <style>{`
                @keyframes flyFromLeft {
                  0% { opacity: 0; transform: translate3d(-140px, -60px, 0) scale(0.6) rotate(-8deg); }
                  100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1) rotate(0deg); }
                }
                @keyframes flyFromRight {
                  0% { opacity: 0; transform: translate3d(140px, 60px, 0) scale(0.6) rotate(8deg); }
                  100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1) rotate(0deg); }
                }
                @keyframes flyFromTop {
                  0% { opacity: 0; transform: translate3d(0, -180px, 0) scale(0.5); }
                  100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
                }
                @keyframes flyFromBottom {
                  0% { opacity: 0; transform: translate3d(0, 180px, 0) scale(0.5); }
                  100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
                }
                @keyframes flyFromTopRight {
                  0% { opacity: 0; transform: translate3d(160px, -120px, 0) scale(0.5) rotate(12deg); }
                  100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1) rotate(0deg); }
                }
                @keyframes flyFromBottomLeft {
                  0% { opacity: 0; transform: translate3d(-160px, 120px, 0) scale(0.5) rotate(-12deg); }
                  100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1) rotate(0deg); }
                }
                @keyframes bentoTap {
                  0% { transform: scale(1); }
                  40% { transform: scale(0.93); }
                  100% { transform: scale(1); }
                }
                .bento-btn {
                  position: relative;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  justify-content: center;
                  text-align: center;
                  gap: 3px;
                  border-radius: 12px;
                  border-width: 1px;
                  border-style: solid;
                  overflow: hidden;
                  cursor: pointer;
                  -webkit-tap-highlight-color: transparent;
                  transition: border-color 0.2s ease, box-shadow 0.2s ease;
                  padding: 4px 2px;
                  width: 100%;
                  height: 100%;
                  min-height: 0;
                  animation-duration: 1.0s;
                  animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
                  animation-fill-mode: backwards;
                  backdrop-filter: blur(12px);
                }
                .bento-btn span {
                  color: #e2e8f0;
                  font-weight: 800;
                  font-size: 1.3125rem;
                  line-height: 1.15;
                  text-align: center;
                  letter-spacing: -0.01em;
                  width: 100%;
                  display: block;
                  overflow: hidden;
                  text-overflow: ellipsis;
                  white-space: nowrap;
                  padding: 0 2px;
                }
                .bento-btn .bento-plus {
                  color: #e2e8f0;
                  font-weight: 900;
                  font-size: 2.1rem;
                  line-height: 1;
                  text-align: center;
                }
                .bento-btn:active {
                  animation: bentoTap 0.22s cubic-bezier(0.4, 0, 0.2, 1) forwards;
                }
                .bento-btn.active-page {
                  border-width: 2.5px;
                  box-shadow: 0 0 20px rgba(255,255,255,0.3);
                }
              `}</style>

              {/* 1. INICIO (x0.8 -> span 5) */}
              {(() => {
                const item = NAV_ITEMS.find(n => n.path === '/')
                if (!item) return null
                const Icon = item.icon
                const color = MENU_COLORS[0]
                const isActive = location.pathname === item.path
                return (
                  <button key={item.path} className={`bento-btn ${isActive ? 'active-page' : ''}`}
                    style={{ gridColumn: 'span 5', backgroundColor: `${color}4D`, borderColor: color, animationName: 'flyFromLeft', animationDelay: '0.03s' }}
                    onClick={() => handleNavClick(item.path)}>
                    <Icon className="w-6 h-6 shrink-0" style={{ color }} strokeWidth={1.8} />
                    <span>{item.label}</span>
                  </button>
                )
              })()}

              {/* 2. EXPEDIENTES (x1.2 -> span 7) */}
              {(() => {
                const item = NAV_ITEMS.find(n => n.path === '/expedientes')
                if (!item) return null
                const Icon = item.icon
                const color = MENU_COLORS[1]
                const isActive = location.pathname === item.path
                return (
                  <button key={item.path} className={`bento-btn ${isActive ? 'active-page' : ''}`}
                    style={{ gridColumn: 'span 7', backgroundColor: `${color}4D`, borderColor: color, animationName: 'flyFromTopRight', animationDelay: '0.05s' }}
                    onClick={() => handleNavClick(item.path)}>
                    <Icon className="w-6 h-6 shrink-0" style={{ color }} strokeWidth={1.8} />
                    <span>{item.label}</span>
                  </button>
                )
              })()}

              {/* 3. CITAS (x0.7 -> span 4) */}
              {(() => {
                const item = NAV_ITEMS.find(n => n.path === '/citas')
                if (!item) return null
                const Icon = item.icon
                const color = MENU_COLORS[3]
                const isActive = location.pathname === item.path
                return (
                  <button key={item.path} className={`bento-btn ${isActive ? 'active-page' : ''}`}
                    style={{ gridColumn: 'span 4', backgroundColor: `${color}4D`, borderColor: color, animationName: 'flyFromLeft', animationDelay: '0.08s' }}
                    onClick={() => handleNavClick(item.path)}>
                    <Icon className="w-6 h-6 shrink-0" style={{ color }} strokeWidth={1.8} />
                    <span>{item.label}</span>
                  </button>
                )
              })()}

              {/* 4. REPARACIONES (x1.3 -> span 8) */}
              {(() => {
                const item = NAV_ITEMS.find(n => n.path === '/reparaciones')
                if (!item) return null
                const Icon = item.icon
                const color = MENU_COLORS[5]
                const isActive = location.pathname === item.path
                return (
                  <button key={item.path} className={`bento-btn ${isActive ? 'active-page' : ''}`}
                    style={{ gridColumn: 'span 8', backgroundColor: `${color}4D`, borderColor: color, animationName: 'flyFromRight', animationDelay: '0.11s' }}
                    onClick={() => handleNavClick(item.path)}>
                    <Icon className="w-6 h-6 shrink-0" style={{ color }} strokeWidth={1.8} />
                    <span>{item.label}</span>
                  </button>
                )
              })()}

              {/* 5. USUARIOS (x0.9 -> span 5) */}
              {(() => {
                const item = NAV_ITEMS.find(n => n.path === '/usuarios')
                if (!item || (item.permiso && !can(item.permiso))) return null
                const Icon = item.icon
                const color = MENU_COLORS[10]
                const isActive = location.pathname === item.path
                return (
                  <button key={item.path} className={`bento-btn ${isActive ? 'active-page' : ''}`}
                    style={{ gridColumn: 'span 5', backgroundColor: `${color}4D`, borderColor: color, animationName: 'flyFromLeft', animationDelay: '0.13s' }}
                    onClick={() => handleNavClick(item.path)}>
                    <Icon className="w-6 h-6 shrink-0" style={{ color }} strokeWidth={1.8} />
                    <span>{item.label}</span>
                  </button>
                )
              })()}

              {/* 6. FACTURACIÓN (x1.1 -> span 7) */}
              {(() => {
                const item = NAV_ITEMS.find(n => n.path === '/facturas')
                if (!item) return null
                const Icon = item.icon
                const color = MENU_COLORS[6]
                const isActive = location.pathname === item.path
                return (
                  <button key={item.path} className={`bento-btn ${isActive ? 'active-page' : ''}`}
                    style={{ gridColumn: 'span 7', backgroundColor: `${color}4D`, borderColor: color, animationName: 'flyFromRight', animationDelay: '0.16s' }}
                    onClick={() => handleNavClick(item.path)}>
                    <Icon className="w-6 h-6 shrink-0" style={{ color }} strokeWidth={1.8} />
                    <span>{item.label}</span>
                  </button>
                )
              })()}

              {/* 7. BALANCES & PROVEEDORES (span 5 / span 7) */}
              {(() => {
                const item = NAV_ITEMS.find(n => n.path === '/balances')
                if (!item) return null
                const Icon = item.icon
                const color = MENU_COLORS[7]
                const isActive = location.pathname === item.path
                return (
                  <button key={item.path} className={`bento-btn ${isActive ? 'active-page' : ''}`}
                    style={{ gridColumn: 'span 5', backgroundColor: `${color}4D`, borderColor: color, animationName: 'flyFromLeft', animationDelay: '0.19s' }}
                    onClick={() => handleNavClick(item.path)}>
                    <Icon className="w-6 h-6 shrink-0" style={{ color }} strokeWidth={1.8} />
                    <span>{item.label}</span>
                  </button>
                )
              })()}

              {/* 8. PROVEEDORES */}
              {(() => {
                const item = NAV_ITEMS.find(n => n.path === '/proveedores')
                if (!item) return null
                const Icon = item.icon
                const color = MENU_COLORS[8]
                const isActive = location.pathname === item.path
                return (
                  <button key={item.path} className={`bento-btn ${isActive ? 'active-page' : ''}`}
                    style={{ gridColumn: 'span 7', backgroundColor: `${color}4D`, borderColor: color, animationName: 'flyFromRight', animationDelay: '0.21s' }}
                    onClick={() => handleNavClick(item.path)}>
                    <Icon className="w-6 h-6 shrink-0" style={{ color }} strokeWidth={1.8} />
                    <span>{item.label}</span>
                  </button>
                )
              })()}

              {/* 9. CLIENTES (x0.8 -> span 5) */}
              {(() => {
                const item = NAV_ITEMS.find(n => n.path === '/clientes')
                if (!item) return null
                const Icon = item.icon
                const color = MENU_COLORS[2]
                const isActive = location.pathname === item.path
                return (
                  <button key={item.path} className={`bento-btn ${isActive ? 'active-page' : ''}`}
                    style={{ gridColumn: 'span 5', backgroundColor: `${color}4D`, borderColor: color, animationName: 'flyFromLeft', animationDelay: '0.24s' }}
                    onClick={() => handleNavClick(item.path)}>
                    <Icon className="w-6 h-6 shrink-0" style={{ color }} strokeWidth={1.8} />
                    <span>{item.label}</span>
                  </button>
                )
              })()}

              {/* 10. INCIDENCIAS (x1.2 -> span 7) */}
              {(() => {
                const item = NAV_ITEMS.find(n => n.path === '/incidencias')
                if (!item) return null
                const Icon = item.icon
                const color = MENU_COLORS[9]
                const isActive = location.pathname === item.path
                return (
                  <button key={item.path} className={`bento-btn ${isActive ? 'active-page' : ''}`}
                    style={{ gridColumn: 'span 7', backgroundColor: `${color}4D`, borderColor: color, animationName: 'flyFromRight', animationDelay: '0.27s' }}
                    onClick={() => handleNavClick(item.path)}>
                    <Icon className="w-6 h-6 shrink-0" style={{ color }} strokeWidth={1.8} />
                    <span>{item.label}</span>
                  </button>
                )
              })()}

              {/* 11. PRESUPUESTOS (span 6 - 2px padding interior exacto) */}
              {(() => {
                const item = NAV_ITEMS.find(n => n.path === '/presupuestos')
                if (!item) return null
                const Icon = item.icon
                const color = MENU_COLORS[4]
                const isActive = location.pathname === item.path
                return (
                  <button key={item.path} className={`bento-btn ${isActive ? 'active-page' : ''}`}
                    style={{ gridColumn: 'span 6', padding: '4px 2px', backgroundColor: `${color}4D`, borderColor: color, animationName: 'flyFromLeft', animationDelay: '0.29s' }}
                    onClick={() => handleNavClick(item.path)}>
                    <Icon className="w-6 h-6 shrink-0" style={{ color }} strokeWidth={1.8} />
                    <span style={{ padding: '0 2px' }}>{item.label}</span>
                  </button>
                )
              })()}

              {/* 12. CONFIGURACIÓN (span 6 - 2px padding interior exacto) */}
              {(() => {
                const item = NAV_ITEMS.find(n => n.path === '/configuracion')
                if (!item) return null
                const Icon = item.icon
                const color = MENU_COLORS[11]
                const isActive = location.pathname === item.path
                return (
                  <button key={item.path} className={`bento-btn ${isActive ? 'active-page' : ''}`}
                    style={{ gridColumn: 'span 6', padding: '4px 2px', backgroundColor: `${color}4D`, borderColor: color, animationName: 'flyFromRight', animationDelay: '0.32s' }}
                    onClick={() => handleNavClick(item.path)}>
                    <Icon className="w-6 h-6 shrink-0" style={{ color }} strokeWidth={1.8} />
                    <span style={{ padding: '0 2px' }}>{item.label}</span>
                  </button>
                )
              })()}

              {/* 13. + PRESUPUESTO */}
              {(() => {
                const color = '#06b6d4'
                return (
                  <button key="nuevo-presupuesto" className="bento-btn"
                    style={{ gridColumn: 'span 6', backgroundColor: `${color}4D`, borderColor: color, boxShadow: `0 0 15px ${color}, inset 0 0 10px ${color}`, animationName: 'flyFromLeft', animationDelay: '0.35s' }}
                    onClick={() => { playSound('click'); setMenuOpen(false); navigate('/presupuestos', { state: { openForm: true } }) }}>
                    <span className="bento-plus" style={{ color }}>+</span>
                    <span>Presupuesto</span>
                  </button>
                )
              })()}

              {/* 14. + CLIENTE */}
              {(() => {
                const color = '#10b981'
                return (
                  <button key="nuevo-cliente" className="bento-btn"
                    style={{ gridColumn: 'span 6', backgroundColor: `${color}4D`, borderColor: color, boxShadow: `0 0 15px ${color}, inset 0 0 10px ${color}`, animationName: 'flyFromRight', animationDelay: '0.37s' }}
                    onClick={() => { playSound('click'); setMenuOpen(false); navigate('/clientes', { state: { openNewModal: true } }) }}>
                    <span className="bento-plus" style={{ color }}>+</span>
                    <span>Cliente</span>
                  </button>
                )
              })()}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/* ── PC / Tablet Landscape footer: 3x1 text buttons, auto-show, gray bg when not Inicio ── */
export function DesktopFooter() {
  const { playSound } = useTheme()
  const location = useLocation()
  const { footerVisible, setFooterHover } = useUIState()
  const { mobileMode } = useMobileMode()
  const isInicio = location.pathname === '/'
  const isA4Document = ['/facturas', '/presupuestos', '/presupuesto-hibrido'].includes(location.pathname)

  if (mobileMode || isA4Document) return null

  const visibleFooterNav = FOOTER_NAV.filter((item) => !item.permiso || can(item.permiso))

  return (
    <div
      onMouseEnter={() => setFooterHover(true)}
      onMouseLeave={() => setFooterHover(false)}
      className={`hidden lg:flex gestarian-footer-bar ${footerVisible ? 'visible' : ''} fixed bottom-0 left-0 right-0 z-40 items-center justify-center gap-2 py-3 ${isInicio ? '' : 'gestarian-footer-gray'}`}
    >
      {visibleFooterNav.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          end={item.path === '/'}
          onClick={() => playSound('click')}
          className={({ isActive }) =>
            `gestarian-footer-text-btn ${isActive ? 'active' : ''}`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </div>
  )
}
