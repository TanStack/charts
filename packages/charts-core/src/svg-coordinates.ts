import type { ChartScene } from './types'

export function svgClientToScene(
  element: SVGSVGElement,
  scene: ChartScene,
  clientX: number,
  clientY: number,
) {
  const matrix = element.getScreenCTM?.()
  if (!matrix) {
    const bounds = element.getBoundingClientRect()
    if (!bounds.width || !bounds.height) return null
    return {
      x: ((clientX - bounds.left) / bounds.width) * scene.width,
      y: ((clientY - bounds.top) / bounds.height) * scene.height,
    }
  }

  let inverse: DOMMatrix
  try {
    inverse = matrix.inverse()
  } catch {
    return null
  }

  const x = inverse.a * clientX + inverse.c * clientY + inverse.e
  const y = inverse.b * clientX + inverse.d * clientY + inverse.f
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null

  return { x, y }
}
