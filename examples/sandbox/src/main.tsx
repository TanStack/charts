import { lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import { App } from './App'

const InteractionGeometryLab = lazy(async () => {
  const module = await import('./InteractionGeometryLab')
  return { default: module.InteractionGeometryLab }
})

const lab = new URLSearchParams(window.location.search).get('lab')
const showInteractionGeometryLab = lab === 'interaction-geometry'
if (showInteractionGeometryLab) {
  document.title = 'Charts interaction geometry lab'
}

createRoot(document.getElementById('root')!).render(
  showInteractionGeometryLab ? (
    <Suspense fallback={null}>
      <InteractionGeometryLab />
    </Suspense>
  ) : (
    <App />
  ),
)
