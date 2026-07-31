import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
import './audio/audio.css'
import './input/controls.css'
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
