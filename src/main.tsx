import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// Force a hard reload if the page was loaded from cache (bfcache / stale tab)
if ('performance' in window && performance.getEntriesByType) {
  const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
  if (nav && nav.type === 'back_forward') {
    window.location.reload()
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
