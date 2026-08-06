import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { Menu, X, Camera, Mic, Power, ChevronLeft, ChevronRight, Minimize2, Smartphone } from 'lucide-react'
import { useState } from 'react'
import { NAV_ITEMS, FOOTER_NAV, openCameraWithoutPlate } from '../lib/navigation'
import { useTheme } from '../lib/theme'
import { useUIState } from '../lib/uiState'
import { useMobileMode } from '../lib/mobileMode'

/* ── Floating exit-fullscreen button (mobile/tablet, only when in real fullscreen) ── */
export function FullscreenExitButton() {
  const { isFullscreen, exitFullscreen } = useUIState()
  const { playSound } = useTheme()
  if (!isFullscreen) return null
  return (
    <button
      onClick={() => { playSound('click'); exitFullscreen() }}
      className="fixed top-2 right-2 z-[60] w-7 h-7 flex items-center justify-center rounded-full bg-black/20 text-white/30 hover:text-white/80 hover:bg-black/50 transition-all backdrop-blur-md"
      aria-label="Salir de pantalla completa"
    >
      <Minimize2 className="w-3 h-3" />
    </button>
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
  const { mobileMode } = useMobileMode()
  const isInicio = location.pathname === '/'

  if (mobileMode) return null

  const routes = NAV_ITEMS.filter((n) => n.path !== '/').map((n) => n.path)
  const currentIdx = routes.indexOf(location.pathname)
  const prev = currentIdx > 0 ? routes[currentIdx - 1] : null
  const next = currentIdx >= 0 && currentIdx < routes.length - 1 ? routes[currentIdx + 1] : null

  return (
    <header
      onMouseEnter={() => setHeaderHover(true)}
      onMouseLeave={() => setHeaderHover(false)}
      className="hidden md:flex gestarian-header-bar visible gestarian-panel fixed top-0 left-0 right-0 z-50 items-center gap-2 px-4 py-2.5 border-b border-bg-700"
    >
      {!isInicio && (
        <button
          onClick={() => { playSound('click'); navigate('/') }}
          className="shrink-0"
          aria-label="Inicio"
        >
          <img src={themeSettings.logo_url || "/images/logos/logo.jpg"} alt={themeSettings.commercial_name || "GESTARIAN"} className="w-8 h-8 rounded-lg object-cover" />
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
        {NAV_ITEMS.map((item) => {
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
  const navigate = useNavigate()

  return (
    <>
      <nav className="lg:hidden fixed bottom-6 left-0 right-0 z-50 flex items-center justify-between px-6 gap-2">
        {/* OCR Camera (Izquierda) */}
        <button
          onClick={() => { playSound('click'); navigate('/presupuesto-hibrido', { state: { startCamera: true } }) }}
          className="w-16 h-16 rounded-full bg-transparent text-[#40e0d0] shadow-[0_0_20px_rgba(64,224,208,0.4),inset_0_0_20px_rgba(64,224,208,0.2)] border-[1px] border-white flex items-center justify-center transition-all hover:scale-105 flex-shrink-0"
          style={{ filter: 'drop-shadow(0 0 5px rgba(64,224,208,1))' }}
          aria-label="Cámara"
        >
          <Camera className="w-7 h-7" strokeWidth={1} color="white" />
        </button>

        {/* Menú (Centro) */}
        <button
          onClick={() => { playSound('click'); setMenuOpen(!menuOpen) }}
          className="w-16 h-16 rounded-full bg-transparent text-[#d3d3d3] shadow-[0_0_20px_rgba(211,211,211,0.4),inset_0_0_20px_rgba(211,211,211,0.2)] border-[1px] border-white flex items-center justify-center transition-all hover:scale-105 flex-shrink-0"
          style={{ filter: 'drop-shadow(0 0 5px rgba(211,211,211,1))' }}
          aria-label="Menú"
        >
          {menuOpen ? <X className="w-7 h-7" strokeWidth={1} color="white" /> : <Menu className="w-7 h-7" strokeWidth={1} color="white" />}
        </button>

        {/* METIS AI (Derecha) */}
        <button
          onClick={() => {
            playSound('click');
            window.dispatchEvent(new Event('metis-toggle-panel'));
          }}
          className="w-16 h-16 rounded-full bg-transparent text-white shadow-[0_0_40px_rgba(167,139,250,0.8),inset_0_0_40px_rgba(167,139,250,0.4)] border-[1px] border-white flex items-center justify-center transition-all hover:scale-105 gestarian-metis-btn flex-shrink-0 relative animate-pulse"
          aria-label="Asistente METIS"
        >
          <span className="font-thin text-[26px] text-white tracking-widest drop-shadow-[0_0_15px_rgba(167,139,250,1)]" style={{ WebkitTextStroke: '0.5px rgba(167,139,250,0.8)', textShadow: '0 0 20px rgba(167,139,250,1)' }}>AI</span>
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-green-400 rounded-full border-[2px] border-bg-900 animate-pulse" />
        </button>
      </nav>

      {menuOpen && (
        <div className="lg:hidden fixed inset-0 top-0 bottom-0 z-40 overflow-y-auto gestarian-mobile-menu-overlay flex flex-col justify-center items-center py-20 px-6" onClick={() => setMenuOpen(false)}>
          <div className="w-full max-w-md space-y-4 flex flex-col items-center justify-center text-center" onClick={(e) => e.stopPropagation()}>
            {NAV_ITEMS.map((item, idx) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  onClick={() => { setMenuOpen(false); playSound('click') }}
                  style={{ animationDelay: `${idx * 60}ms` }}
                  className={({ isActive }) =>
                    `gestarian-menu-item-cascade flex items-center justify-center gap-4 px-6 py-2.5 rounded-xl transition-all gestarian-menu-text-glow ${
                      isActive ? 'bg-white/15 scale-105' : 'hover:bg-white/10'
                    }`
                  }
                >
                  <Icon className="w-7 h-7 text-white drop-shadow-[0_0_15px_rgba(255,255,255,1)]" strokeWidth={1.5} />
                  <span>{item.label}</span>
                </NavLink>
              )
            })}
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

  if (mobileMode) return null

  return (
    <div
      onMouseEnter={() => setFooterHover(true)}
      onMouseLeave={() => setFooterHover(false)}
      className={`hidden lg:flex gestarian-footer-bar ${footerVisible ? 'visible' : ''} fixed bottom-0 left-0 right-0 z-40 items-center justify-center gap-2 py-3 ${isInicio ? '' : 'gestarian-footer-gray'}`}
    >
      {FOOTER_NAV.map((item) => (
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
