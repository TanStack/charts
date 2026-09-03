import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../src/styles.css'
import { PagedHistoryChart } from '../src/PagedHistoryChart'

const target = document.getElementById('root')
if (!target) throw new Error('Missing #root')

createRoot(target).render(
  <StrictMode>
    <main className="demo">
      <PagedHistoryChart />
    </main>
  </StrictMode>,
)
