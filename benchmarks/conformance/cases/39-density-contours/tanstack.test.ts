import { createChartRuntime } from '@tanstack/charts'
import { describe, expect, it } from 'vitest'
import {
  densityDefinition,
  densityThresholds,
  densityXDomain,
  densityYDomain,
  type DensityContourDatum,
} from './tanstack'
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
    expect(scene.margin).toEqual({ top: 27, right: 27, bottom: 27, left: 27 })

    for (const point of scene.points) {
      expect(point.xValue).toBe(point.datum.centroidX)
      expect(point.yValue).toBe(point.datum.centroidY)
      expect(point.datum.centroidX).toBeGreaterThanOrEqual(densityXDomain[0])
      expect(point.datum.centroidX).toBeLessThanOrEqual(densityXDomain[1])
      expect(point.datum.centroidY).toBeGreaterThanOrEqual(densityYDomain[0])
      expect(point.datum.centroidY).toBeLessThanOrEqual(densityYDomain[1])
      expect(point.x).toBeGreaterThanOrEqual(scene.chart.x)
      expect(point.x).toBeLessThanOrEqual(scene.chart.x + scene.chart.width)
      expect(point.y).toBeGreaterThanOrEqual(scene.chart.y)
      expect(point.y).toBeLessThanOrEqual(scene.chart.y + scene.chart.height)
    }
  })
})
