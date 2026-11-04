import { describe, expect, it } from 'vitest'
import { scaleUtc } from './scales-time'
import { scaleLinear } from './scales-linear'
import { createChartScene, defineChart } from './scene'
import { lineY } from './line'

describe('compact UTC chart integration', () => {
  const rows = [
    { date: new Date('2024-02-28T00:00:00Z'), value: 2 },
    { date: new Date('2024-02-29T00:00:00Z'), value: 4 },
    { date: new Date('2024-03-02T00:00:00Z'), value: 3 },
  ]
  it('infers a Date domain and maps elapsed time through responsive ranges', () => {
    const definition = defineChart({
      marks: [lineY(rows, { x: 'date', y: 'value' })],
      scales: { x: { scale: scaleUtc }, y: { scale: scaleLinear } },
    })
    for (const width of [320, 800]) {
      const scene = createChartScene(definition, { width, height: 300 })
      const x = scene.scales.x
      expect(x.domain).toEqual([rows[0]!.date, rows[2]!.date])
      const a = x.map(rows[0]!.date),
        b = x.map(rows[1]!.date),
        c = x.map(rows[2]!.date)
      expect((b - a) / (c - a)).toBeCloseTo(1 / 3, 10)
      expect(x.invert?.(b)).toEqual(rows[1]!.date)
    }
  })
  it('copies configured dates without changing the authored range or domain', () => {
    const scale = scaleUtc()
      .domain([rows[0]!.date, rows[2]!.date])
      .range([20, 40])
    const definition = defineChart({
      marks: [lineY(rows, { x: 'date', y: 'value' })],
      scales: { x: { scale }, y: { scale: scaleLinear } },
    })
    const scene = createChartScene(definition, { width: 600, height: 300 })
    expect(scene.scales.x.map(rows[2]!.date)).toBeGreaterThan(40)
    expect(scale.range()).toEqual([20, 40])
    expect(scale.domain()).toEqual([rows[0]!.date, rows[2]!.date])
  })
})
