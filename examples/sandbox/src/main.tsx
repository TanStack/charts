import { createRoot } from 'react-dom/client'
import './styles.css'
import { App } from './App'
import { InteractionGeometryLab } from './InteractionGeometryLab'

const lab = new URLSearchParams(window.location.search).get('lab')
const showInteractionGeometryLab = lab === 'interaction-geometry'
if (showInteractionGeometryLab) {
  document.title = 'Charts interaction geometry lab'
}

createRoot(document.getElementById('root')!).render(
  showInteractionGeometryLab ? <InteractionGeometryLab /> : <App />,
)
