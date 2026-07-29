import { renderToString } from 'octane/server'
import { HydrationCanvasChart } from './CanvasChart.hydration.fixture'

export function renderHydrationCanvasChart(): string {
  return renderToString(HydrationCanvasChart).html
}
