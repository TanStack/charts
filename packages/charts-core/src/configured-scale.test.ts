import { scaleLinear } from 'd3-scale'
import { describe, expect, it } from 'vitest'
import { createChartScene, defineChart } from './scene'
import { lineY } from './line'
import type { ChartSpec } from './types'

describe('configured scales', () => {
  it('requires explicit positional scale decisions in chart definitions', () => {
    // @ts-expect-error Both positional dimensions must supply a scale or null.
    const invalid = defineChart({ marks: [lineY([1, 2, 3])] })

    expect(invalid.marks).toHaveLength(1)
  })

  it('accepts D3 scales directly', () => {
    const definition = defineChart({
      marks: [lineY([4, 9, 7])],
      x: { scale: scaleLinear().domain([0, 2]) },
      y: { scale: scaleLinear().domain([0, 10]) },
    })
    const scene = createChartScene(definition, {
      width: 480,
      height: 260,
    })

    expect(scene.scales.x.domain).toEqual([0, 2])
    expect(scene.scales.x.map(2)).toBe(scene.chart.x + scene.chart.width)
    expect(scene.scales.y.map(10)).toBe(scene.chart.y)
  })

  it('adopts configured D3 domains while owning responsive ranges', () => {
    const xSource = scaleLinear().domain([0, 10])
    const definition = defineChart({
      marks: [
        lineY(
          [
            { x: 0, y: 4 },
            { x: 10, y: 9 },
          ],
          {
            x: 'x',
            y: 'y',
          },
        ),
      ],
      x: {
        scale: xSource,
      },
      y: {
        scale: scaleLinear().domain([0, 10]),
      },
    })
    const scene = createChartScene(definition, {
      width: 480,
      height: 260,
    })

    expect(scene.scales.x.domain).toEqual([0, 10])
    expect(scene.scales.x.map(0)).toBe(scene.chart.x)
    expect(scene.scales.x.map(10)).toBe(scene.chart.x + scene.chart.width)
    expect(scene.scales.y.map(0)).toBe(scene.chart.y + scene.chart.height)
    expect(scene.scales.y.map(10)).toBe(scene.chart.y)

    const wider = createChartScene(definition, { width: 800, height: 260 })
    expect(wider.scales.x.map(10)).toBe(wider.chart.x + wider.chart.width)
    expect(xSource.range()).toEqual([0, 1])
  })

  it('rejects missing scales in the scene compiler', () => {
    const invalidDefinition = {
      marks: [lineY([1, 2, 3])],
    } as unknown as ChartSpec

    expect(() =>
      createChartScene(invalidDefinition, {
        width: 480,
        height: 260,
      }),
    ).toThrow(/requires a configured scale/)
  })

  it('supports explicit null axes only for unused dimensions', () => {
    const positionless = createChartScene(
      defineChart({
        marks: [],
        guides: false,
        x: null,
        y: null,
      }),
      { width: 480, height: 260 },
    )

    expect(positionless.scales.x.type).toBe('none')
    expect(positionless.scales.y.type).toBe('none')
    expect(() =>
      createChartScene(
        defineChart({
          marks: [lineY([])],
          x: null,
          y: { scale: scaleLinear().domain([0, 1]) },
        }),
        { width: 480, height: 260 },
      ),
    ).toThrow(/cannot be null/)
  })
})
