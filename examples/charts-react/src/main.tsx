import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@charts-poc/fixtures/styles.css'
import { App } from './App'

const target = document.getElementById('root')
if (!target) throw new Error('Missing #root')

createRoot(target).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
