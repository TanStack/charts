import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../src/styles.css'
import { LiveCharts } from '../src/LiveCharts'

const target = document.getElementById('root')
if (!target) throw new Error('Missing #root')

createRoot(target).render(
  <StrictMode>
    <main className="demo">
      <LiveCharts />
    </main>
  </StrictMode>,
)
