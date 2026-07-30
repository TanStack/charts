import { createChartRuntime } from '@tanstack/charts'
import { describe, expect, it } from 'vitest'
import { densityDefinition, type DensityContourDatum } from './tanstack'
import { densityThresholds, densityXDomain, densityYDomain } from './data'
import type { ConformanceInput } from '../../types'

describe('density contour interaction points', () => {
  it('emits one semantic centroid and density value per contour', () => {
    const runtime = createChartRuntime<DensityContourDatum, number, number>()
    const scene = runtime.render(
      densityDefinition({
        width: 640,
        height: 400,
        revision: 0,
        interactive: true,
      }),
      { width: 640, height: 400 },
    )

    expect(scene.points).toHaveLength(densityThresholds.length)
    expect(scene.points.map((point) => point.datum.density)).toEqual(
      densityThresholds.map((threshold) => threshold / 100),
    )

    for (const point of scene.points) {
      expect(point.xValue).toBe(point.datum.centroidX)
      expect(point.yValue).toBe(point.datum.centroidY)
      expect(point.datum.centroidX).toBeGreaterThanOrEqual(densityXDomain[0])
      expect(point.datum.centroidX).toBeLessThanOrEqual(densityXDomain[1])
      expect(point.datum.centroidY).toBeGreaterThanOrEqual(densityYDomain[0])
      expect(point.datum.centroidY).toBeLessThanOrEqual(densityYDomain[1])
      expect(point.x).toBeGreaterThanOrEqual(0)
      expect(point.x).toBeLessThanOrEqual(scene.width)
      expect(point.y).toBeGreaterThanOrEqual(0)
      expect(point.y).toBeLessThanOrEqual(scene.height)
    }
  })
})
