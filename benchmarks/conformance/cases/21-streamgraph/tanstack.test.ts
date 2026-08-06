import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { industries } from '@charts-poc/demo-data/industries'
import type { IndustriesRow } from '@charts-poc/demo-data/industries'
import { createChartRuntime } from '@tanstack/charts'
import type {
  ChartSpecDatum,
  ChartSpecXValue,
  ChartSpecYValue,
} from '@tanstack/charts'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { streamgraphDefinition } from './tanstack'

type Definition = ReturnType<typeof streamgraphDefinition>

describe('definition-owned streamgraph stack', () => {
  it('keeps raw rows while deriving inside-out wiggle intervals', () => {
    const scene = createChartRuntime<IndustriesRow, Date, number>().render(
      streamgraphDefinition(),
      { width: 640, height: 400 },
    )

    expectTypeOf<ChartSpecDatum<Definition>>().toEqualTypeOf<IndustriesRow>()
    expectTypeOf<ChartSpecXValue<Definition>>().toEqualTypeOf<Date>()
    expectTypeOf<ChartSpecYValue<Definition>>().toEqualTypeOf<number>()
    expect(scene.points).toHaveLength(industries.length)
    expect(new Set(scene.points.map(({ group }) => group)).size).toBe(14)
    expect(
      Math.min(
        ...scene.points.map(({ y1Value }) =>
          typeof y1Value === 'number' ? y1Value : Infinity,
        ),
      ),
    ).toBe(0)

    scene.points.forEach((point) => {
      expect(point.datum).toBe(industries[point.datumIndex])
      expect(point.yValue).toBe(point.datum.unemployed)
      expect(typeof point.y1Value).toBe('number')
      expect(typeof point.y2Value).toBe('number')
      if (
        typeof point.y1Value === 'number' &&
        typeof point.y2Value === 'number'
      ) {
        expect(point.y2Value - point.y1Value).toBeCloseTo(
          point.datum.unemployed,
        )
      }
    })
  })

  it('removes case-owned pivot, interval, and D3 stack preparation', () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        'benchmarks/conformance/cases/21-streamgraph/tanstack.ts',
      ),
      'utf8',
    )

    expect(source).toContain("order: 'inside-out'")
    expect(source).toContain("offset: 'wiggle'")
    expect(source).toContain('streamgraphChart(industries, true)')
    expect(source).toContain('areaY(rows')
    expect(source).not.toContain("from 'd3-array'")
    expect(source).not.toContain("from 'd3-shape'")
    expect(source).not.toContain('streamIntervals')
    expect(source).not.toContain('WideTimePoint')
  })
})
