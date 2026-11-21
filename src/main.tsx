import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
import './audio/audio.css'
import './input/controls.css'
import './golden-era.css'
import './input/mobile-football.css'
import './diagnostics/device-lab.css'
import './runtime/match-recovery.css'
import './ui/matchday-mobile-v2.css'
import { AudioProvider } from './audio/AudioProvider'
import { installKickoffSafety } from './runtime/kickoffSafety'

installKickoffSafety()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AudioProvider><App /></AudioProvider>
  </StrictMode>,
)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => undefined))
}
