// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import { ThemeProvider } from './lib/theme'
import { MobileModeContext } from './lib/mobileMode'
import { UIStateProvider } from './lib/uiState'
import { supabase } from './lib/supabase'
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
import { FacturasPage } from './pages/FacturasPage'
import { BalancesPage } from './pages/BalancesPage'
import { ConfiguracionPage } from './pages/ConfiguracionPage'
import { NAV_ITEMS } from './lib/navigation'
import {
  ProveedoresPage,
  IncidenciasPage, UsuariosPage,
} from './pages/Pages'
import { motion, AnimatePresence } from 'framer-motion'

// NUEVO IMPORT: Añadimos tu componente de animación
import { IntroAnimation } from './components/IntroAnimation'

function BackgroundImage() {
  const [fondoLandscape, setFondoLandscape] = useState('/images/backgrounds/background_landscape.jpg')
  const [fondoPortrait, setFondoPortrait] = useState('/images/backgrounds/background_portrait.png')

  useEffect(() => {
    supabase.from('configuracion').select('*').eq('id', 1).maybeSingle().then(({ data }) => {
      if (data) {
        if (data.fondo_landscape) setFondoLandscape(data.fondo_landscape)
        if (data.fondo_portrait) setFondoPortrait(data.fondo_portrait)
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

  // Scroll to top on every page change
  useEffect(() => {
    window.scrollTo(0, 0)
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
  }, [location.pathname])

  const swipeRoutes = NAV_ITEMS.map(item => item.path)

  const handleSwipe = useCallback((newDirection: number) => {
    const currentIndex = swipeRoutes.indexOf(location.pathname)
    if (currentIndex !== -1) {
      if (newDirection === 1) {
        // Avanzar (+1), si estamos al final vuelve a la primera
        const nextIndex = (currentIndex + 1) % swipeRoutes.length
        setDirection(1)
        navigate(swipeRoutes[nextIndex])
      } else if (newDirection === -1) {
        // Retroceder (-1), si estamos al principio va a la última
        const prevIndex = (currentIndex - 1 + swipeRoutes.length) % swipeRoutes.length
        setDirection(-1)
        navigate(swipeRoutes[prevIndex])
      }
    } else {
      // Si la ruta no está directamente en el array (ej. subruta /cliente), vuelve a la primera o anterior
      setDirection(newDirection)
      navigate(newDirection === 1 ? swipeRoutes[0] : swipeRoutes[swipeRoutes.length - 1])
    }
  }, [location.pathname, navigate, swipeRoutes])

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? '100%' : '-100%',
      opacity: 0.6
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? '100%' : '-100%',
      opacity: 0.6
    })
  };

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

  // ── Global touch swipe detection for ALL pages (mobile & tablet portrait) ──
  useEffect(() => {
    let touchStartX = 0
    let touchStartY = 0
    let dirLocked: 'h' | 'v' | null = null

    const onTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX
      touchStartY = e.touches[0].clientY
      dirLocked = null
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!dirLocked) {
        const dx = Math.abs(e.touches[0].clientX - touchStartX)
        const dy = Math.abs(e.touches[0].clientY - touchStartY)
        if (dx > dy + 10) {
          dirLocked = 'h'
        } else if (dy > dx + 10) {
          dirLocked = 'v'
        }
      }
      // Prevent vertical scroll when swiping horizontally
      if (dirLocked === 'h' && e.cancelable) {
        e.preventDefault()
      }
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (dirLocked !== 'h') return
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
  }, [handleSwipe])

  return (
    <MobileModeContext.Provider value={{ mobileMode, toggleMobileMode, exitMobileMode }}>
      {isInicio && <BackgroundImage />}

      <div className={`relative z-10 min-h-screen ${mobileMode ? 'mobile-mode' : ''}`}>
        <DesktopHeader />
        <FullscreenExitButton />

        <main className="w-full relative min-h-screen">
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            <motion.div
              key={location.pathname}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "tween", ease: [0.25, 0.46, 0.45, 0.94], duration: 0.28 },
                opacity: { duration: 0.2 }
              }}
              style={{ willChange: 'transform, opacity' }}
              className="w-full min-h-screen p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto pt-3 lg:pt-16 pb-28"
            >
              <Routes location={location} key={location.pathname}>
                <Route path="/" element={<InicioPage />} />
                <Route path="/clientes" element={<ClientesPage />} />
                <Route path="/presupuestos" element={<PresupuestosPage />} />
                <Route path="/presupuesto-hibrido" element={<PresupuestoHibridoPage />} />
                <Route path="/citas" element={<CitasPage />} />
                <Route path="/reparaciones" element={<ReparacionesPage />} />
                <Route path="/facturas" element={<FacturasPage />} />
                <Route path="/balances" element={<BalancesPage />} />
                <Route path="/proveedores" element={<ProveedoresPage />} />
                <Route path="/incidencias" element={<IncidenciasPage />} />
                <Route path="/usuarios" element={<UsuariosPage />} />
                <Route path="/configuracion" element={<ConfiguracionPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
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
  const [showIntro, setShowIntro] = useState(true)
  const [introState, setIntroState] = useState<'start' | 'grow' | 'fadeOut'>('start')

  // Efecto inicial para automatizar toda la secuencia de la animación
  useEffect(() => {
    // 1. Arranca la animación (aparece el logo)
    const growTimer = setTimeout(() => {
      setIntroState('grow')
    }, 100)

    // 2. Inicia el desvanecimiento (fadeOut) después de 2 segundos de mostrarse
    const fadeOutTimer = setTimeout(() => {
      setIntroState('fadeOut')
    }, 2000)

    // 3. Destruye el componente de la memoria 500ms después para mostrar la app
    const removeTimer = setTimeout(() => {
      setShowIntro(false)
    }, 2500)

    return () => {
      clearTimeout(growTimer)
      clearTimeout(fadeOutTimer)
      clearTimeout(removeTimer)
    }
  }, [])

  return (
    <ThemeProvider>
      <UIStateProvider>
        
        {/* COMPONENTE DE INTRODUCCIÓN AUTOMÁTICO */}
        <IntroAnimation 
          showIntro={showIntro} 
          introState={introState} 
        />

        <BrowserRouter>
          <Routes>
            <Route path="/cliente/:token" element={<ClientePage />} />
            <Route path="/*" element={<Layout />} />
          </Routes>
        </BrowserRouter>
      </UIStateProvider>
    </ThemeProvider>
  )
}
