import { renderChartSvgWithHooks } from './svg-renderer'
import type { ChartScene, RenderChartSvgOptions } from './types'

export function renderChartSvg(
  scene: ChartScene,
  options: RenderChartSvgOptions,
): string {
  return renderChartSvgWithHooks(scene, options)
}
