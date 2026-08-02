import { describe, expect, it } from 'vitest'
import { scenePath } from './scene-path'

describe('scenePath', () => {
  it('emits one rendered cubic and its subpixel interaction contour', () => {
    const geometry = scenePath((path) => {
      path.moveTo(20, 180)
      path.bezierCurveTo(20, 20, 180, 20, 180, 180)
    })

    expect(geometry.data).toBe('M20,180C20,20,180,20,180,180')
    expect(geometry.tolerance).toBe(0.25)
    expect(geometry.contours).toHaveLength(1)
    expect(geometry.bounds).toMatchObject({
      x: 20,
      y: expect.closeTo(60, 0),
      width: 160,
      height: expect.closeTo(120, 0),
    })
    expect(geometry.contours[0]?.closed).toBe(false)
    expect(geometry.contours[0]?.points.length).toBeGreaterThan(2)
    expect(geometry.contours[0]?.points.at(0)).toEqual([20, 180])
    expect(geometry.contours[0]?.points.at(-1)).toEqual([180, 180])
  })

  it('records closed areas and quadratic curves from the same commands', () => {
    const geometry = scenePath((path) => {
      path.moveTo(10, 90)
      path.lineTo(10, 50)
      path.quadraticCurveTo(50, 10, 90, 50)
      path.lineTo(90, 90)
      path.closePath()
    })

    expect(geometry.data).toBe('M10,90L10,50Q50,10,90,50L90,90Z')
    expect(geometry.contours[0]?.closed).toBe(true)
    expect(geometry.contours[0]?.points.length).toBeGreaterThan(4)
  })

  it('keeps sampled cubic points within its declared hit tolerance', () => {
    const curves = [
      [20, 180, 20, 20, 180, 20, 180, 180],
      [40, 40, 300, -180, -120, 260, 40, 40],
      [0, 0, 400, 1, -400, -1, 1, 0],
    ] as const

    for (const [x0, y0, x1, y1, x2, y2, x3, y3] of curves) {
      const geometry = scenePath((path) => {
        path.moveTo(x0, y0)
        path.bezierCurveTo(x1, y1, x2, y2, x3, y3)
      })
      const contour = geometry.contours[0]?.points ?? []
      let maximumDistance = 0

      for (let index = 0; index <= 1_000; index += 1) {
        const amount = index / 1_000
        const point = cubicPoint(x0, y0, x1, y1, x2, y2, x3, y3, amount)
        maximumDistance = Math.max(
          maximumDistance,
          distanceToPolyline(contour, point[0], point[1]),
        )
      }

      expect(maximumDistance).toBeLessThanOrEqual(geometry.tolerance)
    }
  })
})

function cubicPoint(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  amount: number,
) {
  const inverse = 1 - amount
  const a = inverse ** 3
  const b = 3 * inverse * inverse * amount
  const c = 3 * inverse * amount * amount
  const d = amount ** 3
  return [
    a * x0 + b * x1 + c * x2 + d * x3,
    a * y0 + b * y1 + c * y2 + d * y3,
  ] as const
}

function distanceToPolyline(
  points: readonly (readonly [number, number])[],
  x: number,
  y: number,
) {
  let distance = Infinity
  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1]!
    const end = points[index]!
    const dx = end[0] - start[0]
    const dy = end[1] - start[1]
    const length = dx * dx + dy * dy
    const amount = length
      ? Math.max(
          0,
          Math.min(1, ((x - start[0]) * dx + (y - start[1]) * dy) / length),
        )
      : 0
    distance = Math.min(
      distance,
      Math.hypot(x - (start[0] + amount * dx), y - (start[1] + amount * dy)),
    )
  }
  return distance
}
