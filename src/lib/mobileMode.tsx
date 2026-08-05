import { createContext, useContext } from 'react'

type MobileModeCtx = {
  mobileMode: boolean
  toggleMobileMode: () => void
  exitMobileMode: () => void
}

export const MobileModeContext = createContext<MobileModeCtx>({
  mobileMode: false,
  toggleMobileMode: () => {},
  exitMobileMode: () => {},
})

export function useMobileMode() {
  return useContext(MobileModeContext)
}
