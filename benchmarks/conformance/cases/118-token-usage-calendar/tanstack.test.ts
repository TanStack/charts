import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  createChartRuntime,
  type ChartDefinition,
  type SceneLabel,
  type SceneNode,
  type SceneRect,
} from '@tanstack/charts'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { calendarChartHeight } from './layout'
import {
  calendarMonthTicks,
  tokenUsageCalendar,
  type TokenUsageDay,
} from './model'
import { createExampleChart } from './tanstack'
import type { ConformanceInput } from '../../types'

type DefinitionDatum<TDefinition> =
  TDefinition extends ChartDefinition<infer TDatum, any, any> ? TDatum : never

describe('definition-owned token activity calendar', () => {
  it('keeps the exact day type, source identity, and 364 interactive cells', () => {
    const input = calendarInput(640)
    const definition = createExampleChart(input)
    const first = render(definition, input)
    const second = render(definition, input)
    type Datum = DefinitionDatum<typeof definition>

    expectTypeOf<Datum>().toEqualTypeOf<TokenUsageDay>()
    expectTypeOf(definition).toMatchTypeOf<
      ChartDefinition<TokenUsageDay, number, string>
    >()
    expect(first.points).toHaveLength(364)
    expect(second.points).toHaveLength(364)
    expect(first.points.map(({ datum }) => datum.dateKey)).toEqual(
      tokenUsageCalendar(0).map(({ dateKey }) => dateKey),
    )
    first.points.forEach((point, index) => {
      expect(second.points[index]?.datum).toBe(point.datum)
      expect(point.xValue).toBe(point.datum.week)
      expect(point.yValue).toBe(point.datum.weekday)
    })
  })

  it('owns month-label typography and leading-edge alignment in the axis definition', () => {
    const input = calendarInput(640)
    const scene = render(createExampleChart(input), input)
    const nodes = flatten(scene.nodes)
    const labels = nodes.filter(
      (node): node is SceneLabel =>
        node.kind === 'label' && node.key.startsWith('x-tick-label:'),
    )
    const cells = nodes.filter(
      (node): node is SceneRect =>
        node.kind === 'rect' && node.key.startsWith('rect-0:'),
    )
    const ticks = calendarMonthTicks()
    const firstCellX = Math.min(...cells.map(({ x }) => x))

    expect(cells).toHaveLength(364)
    expect(labels.map(({ text }) => text)).toEqual([...ticks.labels.values()])
    expect(labels[0]).toMatchObject({
      text: 'Aug',
      x: firstCellX,
      anchor: 'start',
      fontSize: 13,
      style: { opacity: 0.62 },
    })
    labels.slice(1).forEach((label, index) => {
      expect(label.anchor).toBe('middle')
      expect(label.fontSize).toBe(13)
      expect(label.style?.opacity).toBe(0.62)
      expect(label.x).toBeCloseTo(scene.scales.x.map(ticks.values[index + 1]))
    })
  })

  it.each([320, 960])(
    'keeps the edge alignment and cells responsive at %ipx',
    (width) => {
      const input = calendarInput(width)
      const scene = render(createExampleChart(input), input)
      const nodes = flatten(scene.nodes)
      const firstLabel = nodes.find(
        (node): node is SceneLabel =>
          node.kind === 'label' && node.text === 'Aug',
      )
      const cells = nodes.filter(
        (node): node is SceneRect =>
          node.kind === 'rect' && node.key.startsWith('rect-0:'),
      )

      expect(scene.width).toBe(width)
      expect(scene.height).toBe(calendarChartHeight(width))
      expect(cells).toHaveLength(364)
      expect(firstLabel?.x).toBe(Math.min(...cells.map(({ x }) => x)))
      expect(firstLabel?.anchor).toBe('start')
    },
  )

  it('keeps only host sizing and tooltip presentation in the application shell', () => {
    const definitionSource = readFileSync(
      resolve(
        process.cwd(),
        'benchmarks/conformance/cases/118-token-usage-calendar/example.tsx',
      ),
      'utf8',
    )
    const shellSource = readFileSync(
      resolve(
        process.cwd(),
        'benchmarks/conformance/cases/118-token-usage-calendar/shell.tsx',
      ),
      'utf8',
    )

    expect(definitionSource).toContain('fontSize: input.preview ? 8 : 13')
    expect(definitionSource).toContain('opacity: 0.62')
    expect(definitionSource).toContain("index === 0 ? 'start' : undefined")
    expect(definitionSource).toContain('-bandwidth / 2')
    expect(shellSource).not.toContain('.ts-chart__axes')
    expect(shellSource).not.toContain('alignFirstMonthLabel')
    expect(shellSource).not.toContain('setAttribute(')
  })
})

function calendarInput(width: number): ConformanceInput {
  return {
    width,
    height: calendarChartHeight(width),
    revision: 0,
    interactive: true,
  }
}

function render(
  definition: ReturnType<typeof createExampleChart>,
  input: ConformanceInput,
) {
  return createChartRuntime<TokenUsageDay, number, string>().render(
    definition,
    input,
  )
}

function flatten(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'group' ? [node, ...flatten(node.children)] : [node],
  )
}
