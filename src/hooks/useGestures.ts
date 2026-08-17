import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

interface UseGesturesProps {
  showPanels?: boolean
  setShowPanels?: (show: boolean) => void
  isFadingOut?: boolean
  setIsFadingOut?: (fading: boolean) => void
}

let blockClicksUntil = 0

export const useGestures = ({
  showPanels = false,
  setShowPanels = () => {},
  isFadingOut = false,
  setIsFadingOut = () => {},
}: UseGesturesProps = {}) => {
  const navigate = useNavigate()
  const fadeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const startX = useRef(0)
  const startY = useRef(0)
  const isDragging = useRef(false)
  const directionLocked = useRef<'h' | 'v' | null>(null)
  const lastTap = useRef<number>(0)
  const rafRef = useRef<number>(0)
  const pendingOffsetX = useRef(0)

  const [offsetX, setOffsetX] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    blockClicksUntil = 0
    return () => {
      blockClicksUntil = 0
    }
  }, [])

  useEffect(() => {
    const blockGhostClick = (e: MouseEvent | TouchEvent) => {
      if (Date.now() < blockClicksUntil) {
        e.stopPropagation()
        e.preventDefault()
      }
    }
    window.addEventListener('click', blockGhostClick as EventListener, { capture: true })
    window.addEventListener('touchstart', blockGhostClick as EventListener, { capture: true, passive: false })
    return () => {
      window.removeEventListener('click', blockGhostClick as EventListener, { capture: true })
      window.removeEventListener('touchstart', blockGhostClick as EventListener, { capture: true })
    }
  }, [])

  const showPanelsRef = useRef(showPanels)
  const isFadingOutRef = useRef(isFadingOut)
  const setShowPanelsRef = useRef(setShowPanels)
  const setIsFadingOutRef = useRef(setIsFadingOut)
  const navigateRef = useRef(navigate)

  useEffect(() => { showPanelsRef.current = showPanels }, [showPanels])
  useEffect(() => { isFadingOutRef.current = isFadingOut }, [isFadingOut])
  useEffect(() => { setShowPanelsRef.current = setShowPanels }, [setShowPanels])
  useEffect(() => { setIsFadingOutRef.current = setIsFadingOut }, [setIsFadingOut])
  useEffect(() => { navigateRef.current = navigate }, [navigate])

  // Función para obtener la posición real del scroll (sea window o el contenedor de la página)
  const getScrollTop = () => {
    const motionDiv = document.querySelector('main > div.overflow-y-auto')
    const containerScroll = motionDiv ? motionDiv.scrollTop : 0
    return Math.max(window.scrollY, document.documentElement.scrollTop, containerScroll)
  }

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (Date.now() < blockClicksUntil) return

      startX.current = e.touches[0].clientX
      startY.current = e.touches[0].clientY
      isDragging.current = true
      directionLocked.current = null
      pendingOffsetX.current = 0
      cancelAnimationFrame(rafRef.current)
      setIsAnimating(false)
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging.current) return

      const diffX = e.touches[0].clientX - startX.current
      const diffY = e.touches[0].clientY - startY.current

      if (!directionLocked.current) {
        if (Math.abs(diffX) > Math.abs(diffY) + 10) {
          directionLocked.current = 'h'
        } else if (Math.abs(diffY) > Math.abs(diffX) + 10) {
          directionLocked.current = 'v'
        } else {
          return
        }
      }

      if (directionLocked.current === 'h') {
        if (e.cancelable) e.preventDefault()
        pendingOffsetX.current = diffX
        cancelAnimationFrame(rafRef.current)
        rafRef.current = requestAnimationFrame(() => {
          setOffsetX(pendingOffsetX.current)
        })
      }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isDragging.current) return
      isDragging.current = false
      cancelAnimationFrame(rafRef.current)

      const endX = e.changedTouches[0].clientX
      const endY = e.changedTouches[0].clientY
      const diffX = endX - startX.current
      const diffY = endY - startY.current

      const sp = showPanelsRef.current
      const fo = isFadingOutRef.current

      // ── 1. TAP (doble tap para abrir panel) ─────────────────────────────────
      if (Math.abs(diffX) < 12 && Math.abs(diffY) < 12) {
        const now = Date.now()
        if (lastTap.current !== 0 && now - lastTap.current < 350) {
          if (e.cancelable) e.preventDefault()
          blockClicksUntil = now + 800
          if (window.innerHeight - endY > 100 && !sp && !fo) {
            setShowPanelsRef.current(true)
          }
          lastTap.current = 0
        } else {
          lastTap.current = now
        }
        setIsAnimating(true)
        setOffsetX(0)
        return
      }

      // ── 2. SWIPE HORIZONTAL ────────────────
      if (directionLocked.current === 'h') {
        setIsAnimating(true)
        setOffsetX(0)
        return
      }

      // ── 3. SWIPE VERTICAL (Cierre de paneles estrictamente en posición inicial) ─────────
      setIsAnimating(true)
      setOffsetX(0)

      if (directionLocked.current === 'v' && Math.abs(diffY) > 50) {
        if (diffY > 0) {
          // Desplazamiento hacia ABAJO
          // REQUISITO: Para cerrar, los paneles TIENEN que estar en la posición inicial (scrollTop <= 5).
          // Si están desplazados (scrollTop > 5), el gesto desplaza la vista normalmente pero NUNCA los cierra.
          const currentScroll = getScrollTop()
          if (sp && !fo && currentScroll <= 5) {
            setIsFadingOutRef.current(true)
            if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current)
            fadeTimeoutRef.current = setTimeout(() => {
              setShowPanelsRef.current(false)
              setIsFadingOutRef.current(false)
            }, 500)
          }
        }
      }
    }

    const handleWheel = (e: WheelEvent) => {
      const sp = showPanelsRef.current
      const fo = isFadingOutRef.current
      // Rueda ratón hacia abajo en el tope
      const currentScroll = getScrollTop()
      if (e.deltaY < 0 && sp && !fo && currentScroll <= 5) {
        setIsFadingOutRef.current(true)
        if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current)
        fadeTimeoutRef.current = setTimeout(() => {
          setShowPanelsRef.current(false)
          setIsFadingOutRef.current(false)
        }, 500)
      }
    }

    window.addEventListener('touchstart', handleTouchStart, { passive: true })
    window.addEventListener('touchmove', handleTouchMove, { passive: false })
    window.addEventListener('touchend', handleTouchEnd, { passive: false })
    window.addEventListener('wheel', handleWheel, { passive: true })

    return () => {
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
      window.removeEventListener('wheel', handleWheel)
      if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current)
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return { offsetX, isAnimating }
}
