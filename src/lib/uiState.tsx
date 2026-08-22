import { useState, useEffect, useCallback, useRef } from 'react'
import type { ReactNode } from 'react'
import { UIStateContext } from './uiStateContext'

// NOTA: Este módulo solo exporta el componente UIStateProvider (compatible con
// Fast Refresh). El contexto y el hook useUIState viven en ./uiStateContext.ts
// para que Vite no muestre el warning "Could not Fast Refresh (useUIState export
// is incompatible)" al guardar.

export function UIStateProvider({ children }: { children: ReactNode }) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [headerVisible, setHeaderVisible] = useState(true)
  const [footerVisible, setFooterVisible] = useState(false)
  const headerHoverRef = useRef(false)
  const footerHoverRef = useRef(false)

  // Sincroniza el estado de pantalla completa con el navegador de forma robusta.
  // Cubre 3 casos:
  //  1) Fullscreen API (requestFullscreen / Esc) → fullscreenchange
  //  2) Pantalla completa del navegador con F11 → document.fullscreenElement es null,
  //     así que se detecta cuando el viewport ocupa toda la pantalla.
  //  3) Cambios de tamaño (maximizar, arrastrar, DevTools) → resize
  // NOTA: se ha eliminado la entrada automática en fullscreen al primer toque/clic,
  // que dejaba al usuario encerrado sin forma visible de salir.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined

    const sync = () => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        const inApiFullscreen = !!document.fullscreenElement
        // Solo en escritorio (puntero fino) tiene sentido la detección de F11;
        // en móvil innerHeight puede igualar screen.height sin estar en fullscreen.
        const isDesktop = window.matchMedia('(pointer: fine)').matches
        const fillsScreen =
          isDesktop &&
          window.outerWidth <= window.screen.width &&
          window.outerHeight <= window.screen.height &&
          Math.abs(window.screen.width - window.innerWidth) <= 2 &&
          Math.abs(window.screen.height - window.innerHeight) <= 2
        setIsFullscreen(inApiFullscreen || fillsScreen)
      }, 30)
    }

    const onKeyDown = (e: KeyboardEvent) => {
      // F11 no dispara fullscreenchange: comprobamos tras el cambio de tamaño
      if (e.key === 'F11' || e.key === 'Escape') sync()
    }

    document.addEventListener('fullscreenchange', sync)
    document.addEventListener('webkitfullscreenchange', sync as EventListener)
    window.addEventListener('resize', sync)
    window.addEventListener('keydown', onKeyDown)
    sync()
    return () => {
      clearTimeout(timer)
      document.removeEventListener('fullscreenchange', sync)
      document.removeEventListener('webkitfullscreenchange', sync as EventListener)
      window.removeEventListener('resize', sync)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  useEffect(() => {
    if (window.innerWidth < 1024) return

    let hideTimer: ReturnType<typeof setTimeout>
    function handleMouseMove(e: MouseEvent) {
      const y = e.clientY
      const h = window.innerHeight
      clearTimeout(hideTimer)
      if (y < 50) {
        setHeaderVisible(true)
      } else if (y > h - 50) {
        setFooterVisible(true)
      } else if (y > 120 && y < h - 120) {
        hideTimer = setTimeout(() => {
          if (!headerHoverRef.current && !footerHoverRef.current) {
            setHeaderVisible(false)
            setFooterVisible(false)
          }
        }, 400)
      }
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      clearTimeout(hideTimer)
    }
  }, [])

  const enterFullscreen = useCallback(() => {
    const el = document.documentElement as any
    const req = el.requestFullscreen || el.webkitRequestFullscreen
    if (req) req.call(el).then(() => setIsFullscreen(true)).catch(() => {})
  }, [])

  const exitFullscreen = useCallback(() => {
    const exit = document.exitFullscreen || (document as any).webkitExitFullscreen
    if (exit) {
      exit.call(document).then(() => setIsFullscreen(false)).catch(() => {})
    } else {
      setIsFullscreen(false)
    }
  }, [])

  const setHeaderHover = useCallback((v: boolean) => {
    headerHoverRef.current = v
    if (v) setHeaderVisible(true)
  }, [])

  const setFooterHover = useCallback((v: boolean) => {
    footerHoverRef.current = v
    if (v) setFooterVisible(true)
  }, [])

  return (
    <UIStateContext.Provider value={{
      isFullscreen,
      enterFullscreen,
      exitFullscreen,
      headerVisible,
      footerVisible,
      setHeaderHover,
      setFooterHover,
    }}>
      {children}
    </UIStateContext.Provider>
  )
}
