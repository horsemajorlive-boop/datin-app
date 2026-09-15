import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { loadThemePrefs, applyThemePrefs } from './lib/theme'

// Применяем сохранённую тему до первого рендера, чтобы не мигало.
applyThemePrefs(loadThemePrefs())

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
