import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@plot-poc/host-core/styles.css'
import '@plot-poc/fixtures/styles.css'
import { App } from './App'

const target = document.getElementById('root')
if (!target) throw new Error('Missing #root')

createRoot(target).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
