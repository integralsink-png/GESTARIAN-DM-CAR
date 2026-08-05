import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import type { ReactNode } from 'react'

interface UIStateCtx {
  isFullscreen: boolean
  enterFullscreen: () => void
  exitFullscreen: () => void
  headerVisible: boolean
  footerVisible: boolean
  setHeaderHover: (v: boolean) => void
  setFooterHover: (v: boolean) => void
}

const UIStateContext = createContext<UIStateCtx>({
  isFullscreen: false,
  enterFullscreen: () => {},
  exitFullscreen: () => {},
  headerVisible: false,
  footerVisible: false,
  setHeaderHover: () => {},
  setFooterHover: () => {},
})

export const useUIState = () => useContext(UIStateContext)

export function UIStateProvider({ children }: { children: ReactNode }) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [headerVisible, setHeaderVisible] = useState(false)
  const [footerVisible, setFooterVisible] = useState(false)
  const headerHoverRef = useRef(false)
  const footerHoverRef = useRef(false)

  // Keep isFullscreen in sync with browser fullscreen state (user can exit via browser controls)
  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', onFsChange)
    document.addEventListener('webkitfullscreenchange', onFsChange as EventListener)
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange)
      document.removeEventListener('webkitfullscreenchange', onFsChange as EventListener)
    }
  }, [])

  // Auto-enter real fullscreen on first user gesture (mobile/tablet only)
  // Browsers require a user gesture to call requestFullscreen()
  useEffect(() => {
    if (window.innerWidth >= 1024) return

    let entered = false
    function tryFullscreen() {
      if (entered) return
      const el = document.documentElement as any
      const req = el.requestFullscreen || el.webkitRequestFullscreen
      if (req) {
        entered = true
        req.call(el).then(() => setIsFullscreen(true)).catch(() => {})
        document.removeEventListener('click', tryFullscreen)
        document.removeEventListener('touchstart', tryFullscreen)
      }
    }
    document.addEventListener('click', tryFullscreen, { once: false })
    document.addEventListener('touchstart', tryFullscreen, { once: false })
    return () => {
      document.removeEventListener('click', tryFullscreen)
      document.removeEventListener('touchstart', tryFullscreen)
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
    if (exit) exit.call(document).then(() => setIsFullscreen(false)).catch(() => {})
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
