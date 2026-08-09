import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { driving } from '@charts-poc/demo-data/driving'
import { createChartRuntime } from '@tanstack/charts'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { waterfallDefinition, waterfallRows, yearlyChanges } from './tanstack'

type WaterfallRow = (typeof waterfallRows)[number]

describe('definition-owned waterfall layout', () => {
  it('derives adjacent gasoline-price changes with raw-window lineage', () => {
    const observations = driving.filter((row) => row.year >= 2004)

    expect(yearlyChanges.map(({ year }) => year)).toEqual([
      2005, 2006, 2007, 2008, 2009, 2010,
    ])
    expect(yearlyChanges.map(({ delta }) => Number(delta.toFixed(4)))).toEqual([
      0.3908, 0.2605, 0.1553, 0.3579, -0.929, 0.229,
    ])
    yearlyChanges.forEach((row, index) => {
      expect(row.source).toEqual(observations.slice(index, index + 2))
      expect(row.sourceIndexes).toEqual([index, index + 1])
    })
  })

  it('materializes six cumulative intervals and a zero-based net total', () => {
    expectTypeOf<WaterfallRow['kind']>().toEqualTypeOf<
      'increase' | 'decrease' | 'total'
    >()
    expect(
      waterfallRows.map(({ delta, start, end, kind }) => ({
        delta: Number(delta.toFixed(4)),
        start: Number(start.toFixed(4)),
        end: Number(end.toFixed(4)),
        kind,
      })),
    ).toEqual([
      { delta: 0.3908, start: 0, end: 0.3908, kind: 'increase' },
      { delta: 0.2605, start: 0.3908, end: 0.6513, kind: 'increase' },
      { delta: 0.1553, start: 0.6513, end: 0.8066, kind: 'increase' },
      { delta: 0.3579, start: 0.8066, end: 1.1645, kind: 'increase' },
      { delta: -0.929, start: 1.1645, end: 0.2355, kind: 'decrease' },
      { delta: 0.229, start: 0.2355, end: 0.4645, kind: 'increase' },
      { delta: 0.4645, start: 0, end: 0.4645, kind: 'total' },
    ])

    waterfallRows.slice(0, -1).forEach((row, index) => {
      expect(row.source).toEqual([yearlyChanges[index]])
      expect(row.sourceIndexes).toEqual([index])
    })
    const total = waterfallRows.at(-1)
    expect(total?.kind).toBe('total')
    expect(total?.source).toEqual(yearlyChanges)
    expect(total?.sourceIndexes).toEqual([0, 1, 2, 3, 4, 5])
    expect(total && 'year' in total).toBe(false)
  })

  it('renders transform-owned intervals without reconstructing geometry', () => {
    const scene = createChartRuntime<
      WaterfallRow | number,
      string,
      number
    >().render(waterfallDefinition(), { width: 640, height: 400 })
    const bars = scene.points.filter(
      ({ markId }) => markId === 'waterfall-bars',
    )

    expect(bars).toHaveLength(waterfallRows.length)
    bars.forEach((point, index) => {
      const row = waterfallRows[index]
      expect(point.datum).toBe(row)
      expect(point.y1Value).toBe(row?.start)
      expect(point.y2Value).toBe(row?.end)
    })
    expect(bars.map(({ xValue }) => xValue)).toEqual([
      '2005',
      '2006',
      '2007',
      '2008',
      '2009',
      '2010',
      '2004–10',
    ])
  })

  it('keeps delta and waterfall ownership visible beside the definition', () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        'benchmarks/conformance/cases/29-waterfall/tanstack.ts',
      ),
      'utf8',
    )

    expect(source).toContain('rollingWindow(observations')
    expect(source).toContain("delta: { value: 'gas', reduce: delta }")
    expect(source).toContain('waterfall(yearlyChanges')
    expect(source).toContain('barY(waterfallRows')
    expect(source).not.toContain("from 'd3-array'")
    expect(source).not.toContain('buildWaterfall')
    expect(source).not.toContain('let total')
  })
})
