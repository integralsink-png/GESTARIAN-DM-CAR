import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect, useCallback, TouchEvent } from 'react'
import { ThemeProvider } from './lib/theme'
import { MobileModeContext } from './lib/mobileMode'
import { UIStateProvider } from './lib/uiState'
import { supabase } from './lib/supabase'
import { PowerButton, DesktopHeader, MobileFooter, DesktopFooter, FullscreenExitButton } from './components/Navigation'
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
  FacturasRecibidasPage, ProveedoresPage,
  IncidenciasPage, UsuariosPage,
} from './pages/Pages'

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
      {/* Capa oscurecedora eliminada para mostrar la imagen con su contraste y resolución original */}
    </>
  )
}

import { motion, AnimatePresence } from 'framer-motion'

function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const isInicio = location.pathname === '/'
  const [cameraOpen, setCameraOpen] = useState(false)
  const [knownMatricula, setKnownMatricula] = useState<string | null>(null)
  const [mobileMode, setMobileMode] = useState(false)
  const [direction, setDirection] = useState(0)

  const handleSwipe = (newDirection: number) => {
    const currentIndex = NAV_ITEMS.findIndex(item => item.path === location.pathname)
    if (currentIndex !== -1) {
      if (newDirection === 1 && currentIndex < NAV_ITEMS.length - 1) {
        setDirection(1)
        navigate(NAV_ITEMS[currentIndex + 1].path)
      }
      if (newDirection === -1 && currentIndex > 0) {
        setDirection(-1)
        navigate(NAV_ITEMS[currentIndex - 1].path)
      }
    }
  }

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? window.innerWidth : -window.innerWidth,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? window.innerWidth : -window.innerWidth,
      opacity: 0
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

  useEffect(() => {
    const enforceFullscreen = () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {})
      }
    }
    document.addEventListener('click', enforceFullscreen, { once: true })
    document.addEventListener('touchstart', enforceFullscreen, { once: true })
    return () => {
      document.removeEventListener('click', enforceFullscreen)
      document.removeEventListener('touchstart', enforceFullscreen)
    }
  }, [])

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

  return (
    <MobileModeContext.Provider value={{ mobileMode, toggleMobileMode, exitMobileMode }}>
      {/* Background image only on INICIO; other pages use the configured solid color */}
      {isInicio && <BackgroundImage />}

      <div className={`relative z-10 min-h-screen ${mobileMode ? 'mobile-mode' : ''}`}>
        {/* Desktop header: PC / tablet landscape, auto-show on mouse-near-top */}
        <DesktopHeader />
        <FullscreenExitButton />

        <main className="min-h-screen pb-20 lg:pb-24 overflow-hidden relative">
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            <motion.div
              key={location.pathname}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 }
              }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={1}
              dragDirectionLock={true}
              onDragEnd={(e, { offset, velocity }) => {
                const swipe = offset.x;
                if (swipe < -50) {
                  handleSwipe(1);
                } else if (swipe > 50) {
                  handleSwipe(-1);
                }
              }}
              className="absolute top-0 left-0 w-full h-full p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto pt-16 lg:pt-16 overflow-y-auto"
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
                <Route path="/facturas-recibidas" element={<FacturasRecibidasPage />} />
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
  return (
    <ThemeProvider>
      <UIStateProvider>
        <BrowserRouter>
          <Routes>
            {/* Client portal — separate layout, no admin header/footer */}
            <Route path="/cliente/:token" element={<ClientePage />} />
            <Route path="/*" element={<Layout />} />
          </Routes>
        </BrowserRouter>
      </UIStateProvider>
    </ThemeProvider>
  )
}
