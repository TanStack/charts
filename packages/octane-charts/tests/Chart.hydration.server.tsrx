import { renderToString } from 'octane/server'
import { HydrationSvgChart } from './Chart.hydration.fixture'

export function renderHydrationSvgChart(): string {
  return renderToString(HydrationSvgChart).html
}
