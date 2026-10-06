import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/noto-sans-egyptian-hieroglyphs/egyptian-hieroglyphs-400.css'
import './index.css'
import './App.css'
import './vk-classic.css'
import App from './App.jsx'
import I18nProvider from './i18n.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>,
)
