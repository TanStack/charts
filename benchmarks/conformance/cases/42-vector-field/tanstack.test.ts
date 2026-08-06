import { wind } from '@charts-poc/demo-data/wind'
import { createChartRuntime } from '@tanstack/charts'
import { describe, expect, it } from 'vitest'
import { sampleWind } from './selection'
import { vectorFieldDefinition } from './tanstack'
import type { WindRow } from '@charts-poc/demo-data/wind'

describe('native sampled vector field', () => {
  it('selects the authored six-by-five source grid without fabricating rows', () => {
    const sampled = sampleWind(wind)

    expect(sampled).toHaveLength(30)
    expect(new Set(sampled.map(({ longitude }) => longitude)).size).toBe(6)
    expect(new Set(sampled.map(({ latitude }) => latitude)).size).toBe(5)
    expect(sampled.every((row) => wind.includes(row))).toBe(true)
  })

  it('keeps one semantic interaction point per sampled observation', () => {
    const sampled = sampleWind(wind)
    const scene = createChartRuntime<WindRow>().render(
      vectorFieldDefinition(),
      { width: 640, height: 400 },
    )
    const points = scene.points.filter(
      ({ markId }) => markId === 'wind-vectors',
    )

    expect(points).toHaveLength(30)
    expect(points.map(({ datum }) => datum)).toEqual(sampled)
    expect(points.map(({ xValue }) => xValue)).toEqual(
      sampled.map(({ longitude }) => longitude),
    )
    expect(points.map(({ yValue }) => yValue)).toEqual(
      sampled.map(({ latitude }) => latitude),
    )
    expect(new Set(points.map(({ key }) => key)).size).toBe(30)
  })
})
