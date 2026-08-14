import { useNavigate } from 'react-router-dom'
import { useCallback } from 'react'

/**
 * Hook de navegación contextual.
 * Usa el historial real del navegador si existe.
 * Si no hay historial previo (acceso directo por URL), usa el fallback.
 */
export function useGoBack(fallback: string = '/') {
  const navigate = useNavigate()

  return useCallback(() => {
    // window.history.length es 1 si la app fue abierta directamente en esta URL
    // Es 2+ si hubo navegación previa (aunque sea dentro de la app)
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate(fallback)
    }
  }, [navigate, fallback])
}
