import { createContext, useContext } from 'react'

export interface UIStateCtx {
  isFullscreen: boolean
  enterFullscreen: () => void
  exitFullscreen: () => void
  headerVisible: boolean
  footerVisible: boolean
  setHeaderHover: (v: boolean) => void
  setFooterHover: (v: boolean) => void
}

export const UIStateContext = createContext<UIStateCtx>({
  isFullscreen: false,
  enterFullscreen: () => {},
  exitFullscreen: () => {},
  headerVisible: false,
  footerVisible: false,
  setHeaderHover: () => {},
  setFooterHover: () => {},
})

export const useUIState = () => useContext(UIStateContext)
