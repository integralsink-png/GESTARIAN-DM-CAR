// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect, useCallback, useRef } from 'react'
import { ThemeProvider } from './lib/theme'
import { MobileModeContext } from './lib/mobileMode'
import { UIStateProvider } from './lib/uiState'
import { supabase } from './lib/supabase'
import { ToastProvider } from './lib/ToastContext'
import { DesktopHeader, MobileFooter, DesktopFooter, FullscreenExitButton } from './components/Navigation'
import { MetisAssistant } from './components/MetisAssistant'
import { CameraModal } from './components/CameraModal'
import { InicioPage } from './pages/InicioPage'
import { ClientePage } from './pages/ClientePage'
import { ClientesPage } from './pages/ClientesPage'
import { PresupuestosPage } from './pages/PresupuestosPage'
import { PresupuestoHibridoPage } from './pages/PresupuestoHibridoPage'
import { CitasPage } from './pages/CitasPage'
import { ReparacionesPage } from './pages/ReparacionesPage'
import { AbonosParcialesPage } from './pages/AbonosParcialesPage'
import { FacturasPage } from './pages/FacturasPage'
import { BalancesPage } from './pages/BalancesPage'
import { ConfiguracionPage } from './pages/ConfiguracionPage'
import { ExpedientesPage } from './pages/ExpedientesPage'
import { AsignarCitaPage } from './pages/AsignarCitaPage'
import { NAV_ITEMS } from './lib/navigation'
import {
  FacturasRecibidasPage,
  ProveedoresPage,
  IncidenciasPage,
  UsuariosPage,
  UsuarioEditPage,
  RegistroUsuarioTallerPage,
  DatosEmpresaPage,
  ClienteAdminPage,
  VehiculoAdminPage,
  ExpedientePage
} from './pages/Pages'
import { LicenciasPage } from './pages/LicenciasPage'
import { ClientePortalAuthPage } from './pages/ClientePortalAuthPage'
import { GemeloDigitalPage } from './pages/GemeloDigitalPage'
import { DeveloperAuthPage } from './pages/DeveloperAuthPage'
import { motion, AnimatePresence } from 'framer-motion'
import { ErrorBoundary } from './components/ErrorBoundary'

import { IntroAnimation } from './components/IntroAnimation'
import { cargarPerfil, tieneLicenciaValida, getPerfil } from './services/authService'

function BackgroundImage() {
  const [fondoLandscape, setFondoLandscape] = useState('/images/backgrounds/background_landscape.jpg')
  const [fondoPortrait, setFondoPortrait] = useState('/images/backgrounds/background_portrait.png')

  useEffect(() => {
    supabase.from('configuracion').select('*').eq('id', 1).maybeSingle().then(({ data }) => {
      if (data) {
        if (data.fondo_landscape) setFondoLandscape(data.fondo_landscape)
        if (data.fondo_portrait) setFondoPortrait(data.fondo_portrait)

        // Sincronización global automática de Claves API desde Supabase hacia localStorage para todos los usuarios
        if (data.ai_api_key) {
          localStorage.setItem('gestarian_gemini_api_key', data.ai_api_key)
          localStorage.setItem('gestarian_ai_assistant_config', JSON.stringify({
            provider: data.ai_provider || 'gemini',
            model: data.ai_model || 'gemini-3.7-flash',
            api_key: data.ai_api_key,
            status: 'connected'
          }))
        }
        if (data.doc_ocr_api_key) {
          localStorage.setItem('gestarian_document_ocr_config', JSON.stringify({
            provider: data.doc_ocr_provider || 'gemini',
            model: data.doc_ocr_model || 'gemini-3.7-flash',
            api_key: data.doc_ocr_api_key,
            status: 'connected'
          }))
        }
        if (data.plate_api_key) {
          localStorage.setItem('gestarian_plate_recognizer_key', data.plate_api_key)
          localStorage.setItem('gestarian_plate_recognizer_config', JSON.stringify({
            provider: 'plate_recognizer',
            api_key: data.plate_api_key,
            endpoint_url: data.plate_endpoint || 'https://api.platerecognizer.com/v1/plate-reader/',
            status: 'connected'
          }))
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
        }
        // Escaneo periódico de salud y disponibilidad de modelos IA en segundo plano
        import('./services/aiCatalogService').then(({ runAiHealthCheck }) => {
          runAiHealthCheck().then(res => {
            if (res.status === 'degraded') {
              console.warn('[GESTARIAN AI SCANNER] Modelos auto-recalibrados:', res.report)
            }
          })
        }).catch(() => {})
      }
    })
  }, [])

  return (
    <>
      <img
        src={fondoLandscape}
        alt=""
        className="gestarian-bg-image hidden lg:block"
        aria-hidden
      />
      <img
        src={fondoPortrait}
        alt=""
        className="gestarian-bg-image lg:hidden"
        aria-hidden
      />
    </>
  )
}

function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const isInicio = location.pathname === '/'
  const [cameraOpen, setCameraOpen] = useState(false)
  const [knownMatricula, setKnownMatricula] = useState<string | null>(null)
  const [mobileMode, setMobileMode] = useState(false)
  const [direction, setDirection] = useState(0)
  const lastSwipeTime = useRef(0)

  // Scroll to top on every page change
  useEffect(() => {
    window.scrollTo(0, 0)
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
  }, [location.pathname])

  const swipeRoutes = NAV_ITEMS.map(item => item.path)

  const handleSwipe = useCallback((newDirection: number) => {
    const now = Date.now()
    if (now - lastSwipeTime.current < 350) return
    lastSwipeTime.current = now

    const currentIndex = swipeRoutes.indexOf(location.pathname)
    if (currentIndex !== -1) {
      if (newDirection === 1) {
        if (currentIndex < swipeRoutes.length - 1) {
          setDirection(1)
          navigate(swipeRoutes[currentIndex + 1])
        }
      } else if (newDirection === -1) {
        if (currentIndex > 0) {
          setDirection(-1)
          navigate(swipeRoutes[currentIndex - 1])
        }
      }
    }
  }, [location.pathname, navigate, swipeRoutes])

  const variants = {
    enter: (direction: number) => ({
      x: direction === 0 ? 0 : (direction > 0 ? 25 : -25),
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction === 0 ? 0 : (direction < 0 ? 25 : -25),
      opacity: 0,
    }),
  }

  useEffect(() => {
    function handleCameraEvent(e: Event) {
      const detail = (e as CustomEvent).detail as { matricula?: string } | undefined
      setKnownMatricula(detail?.matricula ?? null)
      setCameraOpen(true)
    }
    window.addEventListener('gestarian-camera-open', handleCameraEvent)
    return () => window.removeEventListener('gestarian-camera-open', handleCameraEvent)
  }, [])

  // Desactivada la pantalla completa automática para permitir la visualización dentro de VS Code o navegador en ventana.


  const toggleMobileMode = useCallback(() => {
    setMobileMode((prev) => {
      const next = !prev
      if (next) {
        const el = document.documentElement
        el.style.overflow = 'hidden'
        if (el.requestFullscreen) el.requestFullscreen().catch(() => {})
      } else {
        document.documentElement.style.overflow = ''
        if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {})
      }
      return next
    })
  }, [])

  const exitMobileMode = useCallback(() => {
    setMobileMode(false)
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {})
  }, [])

  useEffect(() => {
    function handleSwipeEvent(e: Event) {
      const detail = (e as CustomEvent).detail as { direction: number } | undefined
      if (detail?.direction) {
        handleSwipe(detail.direction)
      }
    }
    window.addEventListener('gestarian-swipe-page', handleSwipeEvent)
    return () => window.removeEventListener('gestarian-swipe-page', handleSwipeEvent)
  }, [location.pathname])

  // Rutas principales autorizadas para swipe lateral
  const MAIN_SWIPE_ROUTES = [
    '/',
    '/expedientes',
    '/clientes',
    '/presupuestos',
    '/citas',
    '/reparaciones',
    '/facturas',
    '/proveedores',
    '/incidencias',
    '/configuracion'
  ]

  // ── Global touch swipe detection: EXCLUSIVO para navegar entre páginas principales ──
  // Bloqueado completamente si:
  // 1. La ruta actual no es una de las páginas principales.
  // 2. Se está interactuando con un formulario / input / textarea / select.
  // 3. Hay un modal abierto (nuevo cliente, etc.).
  // 4. Se está viendo un documento (hoja A4 de presupuesto, factura, visor A4, etc.).
  // 5. Se está viendo o interactuando con el Roadmap / Timeline / visor de imágenes.
  useEffect(() => {
    let touchStartX = 0
    let touchStartY = 0
    let dirLocked: 'h' | 'v' | null = null
    let isTouchBlocked = false

    const isSwipeAllowed = (target: HTMLElement | null): boolean => {
      // 1. Verificar si la ruta actual es una página principal permitida
      if (!MAIN_SWIPE_ROUTES.includes(location.pathname)) return false

      // 2. Si hay cualquier input o formulario enfocado actualmente
      const activeEl = document.activeElement
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT')) {
        return false
      }

      // 3. Si el toque se originó en un elemento de formulario o interactivo
      if (target) {
        if (target.closest('input, textarea, select, form, button, [contenteditable="true"]')) return false
        // Bloquear en modales o diálogos emergentes
        if (target.closest('[role="dialog"], .fixed, .modal-content, [data-modal]')) return false
        // Bloquear en documentos A4 (presupuesto A4, factura A4)
        if (target.closest('#factura-a4, #presupuesto-a4, .gestarian-paper, .print-sheet')) return false
        // Bloquear en el Roadmap / Línea temporal de expedientes
        if (target.closest('[data-roadmap], .timeline-container, svg, [draggable="true"]')) return false
      }

      // 4. Si hay documentos A4 activos en el DOM (viendo factura o presupuesto)
      if (document.getElementById('factura-a4') || document.getElementById('presupuesto-a4')) {
        return false
      }

      // 5. Si hay tarjetas de expediente desplegadas mostrando el roadmap
      const openRoadmaps = document.querySelectorAll('.gestarian-roadmap-open, [data-roadmap-open="true"]')
      if (openRoadmaps.length > 0) {
        return false
      }

      return true
    }

    const onTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement | null
      if (!isSwipeAllowed(target)) {
        isTouchBlocked = true
        return
      }

      isTouchBlocked = false
      touchStartX = e.touches[0].clientX
      touchStartY = e.touches[0].clientY
      dirLocked = null
    }

    const onTouchMove = (e: TouchEvent) => {
      if (isTouchBlocked) return

      if (!dirLocked) {
        const dx = Math.abs(e.touches[0].clientX - touchStartX)
        const dy = Math.abs(e.touches[0].clientY - touchStartY)
        if (dx > dy + 10) {
          dirLocked = 'h'
        } else if (dy > dx + 10) {
          dirLocked = 'v'
        }
      }
      // Evitar scroll vertical si se está ejecutando un swipe horizontal válido
      if (dirLocked === 'h' && e.cancelable) {
        e.preventDefault()
      }
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (isTouchBlocked || dirLocked !== 'h') return
      const diffX = e.changedTouches[0].clientX - touchStartX
      const threshold = window.innerWidth * 0.20
      if (Math.abs(diffX) > threshold) {
        handleSwipe(diffX < 0 ? 1 : -1)
      }
    }

    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', onTouchEnd, { passive: true })

    return () => {
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [location.pathname, handleSwipe])

  return (
    <MobileModeContext.Provider value={{ mobileMode, toggleMobileMode, exitMobileMode }}>
      {isInicio && <BackgroundImage />}

      <div className={`relative z-10 min-h-screen ${mobileMode ? 'mobile-mode' : ''}`}>
        <DesktopHeader />
        <FullscreenExitButton />

        <main className="w-full relative min-h-screen">
          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.div
              key={location.pathname}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                duration: 0.16,
                ease: "easeOut",
              }}
              style={{ willChange: 'opacity, transform' }}
              className="w-full min-h-screen p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto pt-3 lg:pt-16 pb-28"
            >
              <ErrorBoundary>
                <Routes location={location} key={location.pathname}>
                  <Route path="/" element={<InicioPage />} />
                  <Route path="/clientes" element={<ClientesPage />} />
                  <Route path="/cliente-admin/:id" element={<ClienteAdminPage />} />
                  <Route path="/vehiculo-admin/:id" element={<VehiculoAdminPage />} />
                  <Route path="/expediente/:vehiculoId" element={<ExpedientePage />} />
                  <Route path="/presupuestos" element={<PresupuestosPage />} />
                  <Route path="/presupuesto-hibrido" element={<PresupuestoHibridoPage />} />
                  <Route path="/citas" element={<CitasPage />} />
                  <Route path="/reparaciones" element={<ReparacionesPage />} />
                  <Route path="/abonos-parciales" element={<AbonosParcialesPage />} />
                  <Route path="/facturas" element={<FacturasPage />} />
                  <Route path="/balances" element={<BalancesPage />} />
                  <Route path="/expedientes" element={<ExpedientesPage />} />
                  <Route path="/asignar-cita" element={<AsignarCitaPage />} />
                  <Route path="/proveedores" element={<ProveedoresPage />} />
                  <Route path="/incidencias" element={<IncidenciasPage />} />
                  <Route path="/usuarios" element={<RegistroUsuarioTallerPage />} />
                  <Route path="/autorizados" element={<UsuariosPage />} />
                  <Route path="/autorizado-edit/:id" element={<UsuarioEditPage />} />
                  <Route path="/usuario-edit/:id" element={<UsuarioEditPage />} />
                  <Route path="/licencias" element={<LicenciasPage />} />
                  <Route path="/configuracion" element={<ConfiguracionPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </ErrorBoundary>
            </motion.div>
          </AnimatePresence>
        </main>

        <MobileFooter />
        <DesktopFooter />
        <MetisAssistant />

        <CameraModal
          open={cameraOpen}
          knownMatricula={knownMatricula}
          onClose={() => { setCameraOpen(false); setKnownMatricula(null) }}
          onMatriculaDetected={(matricula) => {
            navigate('/clientes', { state: { matriculaBuscada: matricula } })
          }}
        />
      </div>
    </MobileModeContext.Provider>
  )
}

export default function App() {
  const [showIntro, setShowIntro] = useState(() => !sessionStorage.getItem('gestarian_intro_shown'))
  const [introState, setIntroState] = useState<'start' | 'grow' | 'fadeOut'>('start')
  const [profileReady, setProfileReady] = useState(false)
  const [licenciaValida, setLicenciaValida] = useState(false)
  const [necesitaRegistro, setNecesitaRegistro] = useState(false)

  useEffect(() => {
    // Si estamos en la ruta del portal del cliente final o del Gemelo Digital o Consola Dev, permitir acceso directo
    const path = window.location.pathname
    if (
      path.startsWith('/cliente') ||
      path.startsWith('/acceso-cliente') ||
      path.startsWith('/gemelo-digital') ||
      path.startsWith('/digital-twin') ||
      path.startsWith('/dev') ||
      path.startsWith('/desarrollador')
    ) {
      setProfileReady(true)
      setLicenciaValida(true)
      return
    }

    const testEmail = localStorage.getItem('gestarian_test_user')
    
    // Si la app se acaba de descargar / instalar por primera vez y no hay usuario registrado
    if (!testEmail) {
      setNecesitaRegistro(true)
      setProfileReady(true)
      setLicenciaValida(true)
      return
    }

    cargarPerfil(testEmail)
      .then(() => {
        const perfil = getPerfil()
        if (perfil?.esDeveloper || perfil?.rol?.toUpperCase().includes('JEFE') || perfil?.rol?.toUpperCase().includes('ADMIN')) {
          setLicenciaValida(true)
        } else {
          setLicenciaValida(tieneLicenciaValida())
        }
        setProfileReady(true)
      })
      .catch((err: any) => {
        console.error('Error al cargar perfil:', err)
        const perfil = getPerfil()
        if (perfil?.esDeveloper || perfil?.rol?.toUpperCase().includes('JEFE') || perfil?.rol?.toUpperCase().includes('ADMIN')) {
          setLicenciaValida(true)
        } else {
          setLicenciaValida(tieneLicenciaValida())
        }
        setProfileReady(true)
      })
  }, [])

  // Efecto inicial para automatizar toda la secuencia de la animación en primer arranque
  useEffect(() => {
    if (sessionStorage.getItem('gestarian_intro_shown')) {
      setShowIntro(false)
      return
    }

    const growTimer = setTimeout(() => {
      setIntroState('grow')
    }, 100)

    const fadeOutTimer = setTimeout(() => {
      setIntroState('fadeOut')
    }, 1800)

    const removeTimer = setTimeout(() => {
      sessionStorage.setItem('gestarian_intro_shown', 'true')
      setShowIntro(false)
    }, 2300)

    return () => {
      clearTimeout(growTimer)
      clearTimeout(fadeOutTimer)
      clearTimeout(removeTimer)
    }
  }, [])

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <UIStateProvider>
          <ToastProvider>
            {showIntro ? (
              <IntroAnimation showIntro={showIntro} introState={introState} />
            ) : !profileReady ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <p className="text-cyan-400 font-bold">Iniciando GESTARIAN...</p>
              </div>
            ) : necesitaRegistro ? (
              <BrowserRouter>
                <div className="min-h-screen bg-[#05070e] text-white">
                  <Routes>
                    <Route path="*" element={<RegistroUsuarioTallerPage />} />
                  </Routes>
                </div>
              </BrowserRouter>
            ) : !licenciaValida ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', padding: '20px', textAlign: 'center', color: '#fff' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Licencia no válida</h1>
                <p style={{ color: '#94a3b8', maxWidth: '400px', marginBottom: '1rem' }}>Tu licencia de GESTARIAN no está activa o ha expirado. Contacta con el administrador.</p>
                <p style={{ fontSize: '0.875rem', color: '#64748b' }}>Estado: {getPerfil()?.licenciaEstado || 'Sin licencia'}</p>
              </div>
            ) : (
              <BrowserRouter>
                <Routes>
                  <Route path="/dev" element={<DeveloperAuthPage />} />
                  <Route path="/desarrollador" element={<DeveloperAuthPage />} />
                  <Route path="/gemelo-digital" element={<GemeloDigitalPage />} />
                  <Route path="/digital-twin" element={<GemeloDigitalPage />} />
                  <Route path="/cliente/acceso" element={<ClientePortalAuthPage />} />
                  <Route path="/acceso-cliente" element={<ClientePortalAuthPage />} />
                  <Route path="/cliente" element={<ClientePortalAuthPage />} />
                  <Route path="/cliente/:token" element={<ClientePage />} />
                  <Route path="/*" element={<Layout />} />
                </Routes>
              </BrowserRouter>
            )}
          </ToastProvider>
        </UIStateProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}
