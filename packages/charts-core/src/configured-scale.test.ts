import { scaleBand, scaleLinear, scaleLog, scaleUtc } from 'd3-scale'
import { describe, expect, it } from 'vitest'
import { barY } from './bar'
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

  it('infers factory domains from materialized mark channels', () => {
    const rows = [
      { category: 'Beta', value: 4 },
      { category: 'Alpha', value: 9 },
      { category: 'Beta', value: 7 },
    ]
    const scene = createChartScene(
      defineChart({
        marks: [lineY(rows, { x: 'category', y: 'value' })],
        x: { scale: scaleBand<string> },
        y: { scale: scaleLinear },
      }),
      { width: 480, height: 260 },
    )

    expect(scene.scales.x.domain).toEqual(['Beta', 'Alpha'])
    expect(scene.scales.y.domain).toEqual([4, 9])
  })

  it('supports factory options and post-domain nicening', () => {
    const rows = [
      { date: new Date('2026-01-03T00:00:00Z'), value: 4.2 },
      { date: new Date('2026-01-08T00:00:00Z'), value: 8.7 },
    ]
    const scene = createChartScene(
      defineChart({
        marks: [lineY(rows, { x: 'date', y: 'value' })],
        x: { scale: scaleUtc, nice: true },
        y: { scale: () => scaleLinear().clamp(true), nice: true },
      }),
      { width: 480, height: 260 },
    )

    expect(scene.scales.x.domain[0]).toBeInstanceOf(Date)
    expect(scene.scales.x.domain[1]).toBeInstanceOf(Date)
    expect(scene.scales.y.domain).toEqual([4, 9])
  })

  it('keeps configured instance domains authoritative', () => {
    const scene = createChartScene(
      defineChart({
        marks: [lineY([10, 20, 30])],
        x: { scale: scaleLinear().domain([0, 1]) },
        y: { scale: scaleLinear().domain([0, 100]) },
      }),
      { width: 480, height: 260 },
    )

    expect(scene.scales.x.domain).toEqual([0, 1])
    expect(scene.scales.y.domain).toEqual([0, 100])
  })

  it('includes implicit mark baselines in inferred domains', () => {
    const scene = createChartScene(
      defineChart({
        marks: [
          barY([{ category: 'Alpha', value: 12 }], {
            x: 'category',
            y: 'value',
          }),
        ],
        x: { scale: scaleBand<string> },
        y: { scale: scaleLinear },
      }),
      { width: 480, height: 260 },
    )

    expect(scene.scales.y.domain).toEqual([0, 12])
  })

  it('rejects inferred log scales with implicit zero baselines', () => {
    expect(() =>
      createChartScene(
        defineChart({
          marks: [barY([12])],
          x: { scale: scaleBand<number> },
          y: { scale: scaleLog },
        }),
        { width: 480, height: 260 },
      ),
    ).toThrow('An inferred log scale cannot include an implicit zero baseline')
  })

  it('retains native factory domains for empty channels', () => {
    const scene = createChartScene(
      defineChart({
        marks: [lineY([])],
        x: { scale: scaleLinear },
        y: { scale: scaleLinear },
      }),
      { width: 480, height: 260 },
    )

    expect(scene.scales.x.domain).toEqual([0, 1])
    expect(scene.scales.y.domain).toEqual([0, 1])
  })

  it('rejects factories that do not return a scale', () => {
    expect(() =>
      createChartScene(
        defineChart({
          marks: [lineY([1, 2, 3])],
          x: { scale: (() => 42) as never },
          y: { scale: scaleLinear },
        }),
        { width: 480, height: 260 },
      ),
    ).toThrow(
      'A scale factory must return a copyable scale with domain and range methods',
    )
  })

  it('rejects factory and channel type mismatches at runtime', () => {
    expect(() =>
      createChartScene(
        defineChart({
          marks: [
            lineY([{ category: 'Alpha', value: 3 }], {
              x: 'category',
              y: 'value',
            }),
          ],
          x: { scale: scaleLinear },
          y: { scale: scaleLinear },
        }),
        { width: 480, height: 260 },
      ),
    ).toThrow('A quantitative scale factory requires numeric values')
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
