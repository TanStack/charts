import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import { scaleBand, scaleLinear } from 'd3-scale'
import { barY } from './bar'
import { colorLegend } from './legend-static'
import { lineY } from './line'
import { createChartScene, defaultChartTheme, defineChart } from './scene'
import type {
  ChartColorLegendContext,
  ResolvedColorScale,
  SceneGroup,
} from './types'

const colors: ResolvedColorScale = {
  type: 'ordinal',
  kind: 'categorical',
  domain: ['Alpha', 'Beta', 'Gamma'],
  range: ['#2563eb', '#f97316', '#16a34a'],
  map(value) {
    const index = this.domain.indexOf(value as string)
    return this.range[index] ?? 'currentColor'
  },
}

function legendContext(
  overrides: Partial<ChartColorLegendContext> = {},
): ChartColorLegendContext {
  return {
    colors,
    chart: { x: 40, y: 60, width: 200, height: 200 },
    bounds: { x: 40, y: 0, width: 200, height: 100 },
    theme: defaultChartTheme,
    width: 280,
    height: 320,
    ...overrides,
  }
}

function renderLegend(
  legend: ReturnType<typeof colorLegend>,
  context = legendContext(),
): SceneGroup {
  const node = legend.render(context)
  if (node.kind !== 'group') throw new Error('Expected a legend group')
  return node
}

describe('categorical color legend presentation', () => {
  it('keeps the default stretched layout and measurement', () => {
    const legend = colorLegend()
    const context = legendContext()

    expect(legend.height(colors.domain.length, context)).toBe(75)
    expect(
      renderLegend(legend, context)
        .children.filter((node) => node.kind === 'dot')
        .map(({ x, y }) => [x, y]),
    ).toEqual([
      [44, 10],
      [44, 29],
      [44, 48],
    ])
  })

  it('measures labels to center and wrap compact rows', () => {
    const legend = colorLegend({
      items: {
        justify: 'center',
        gap: 20,
        rowGap: 10,
        indicator: { width: 20, height: 14, gap: 6 },
        label: { fontSize: 14 },
      },
    })
    const context = legendContext()

    expect(legend.height(colors.domain.length, context)).toBe(66)
    const labels = renderLegend(legend, context).children.filter(
      (node) => node.kind === 'label',
    )
    expect(labels.map(({ y }) => y)).toEqual([10, 10, 34])
    expect(labels[0]!.x).toBeGreaterThan(context.bounds.x + 20)
    expect(labels[2]!.x).toBeGreaterThan(labels[0]!.x)
  })

  it('renders per-series symbols and label colors from resolved items', () => {
    const legend = colorLegend<'Alpha' | 'Beta' | 'Gamma'>({
      items: {
        justify: 'center',
        indicator: {
          width: 20,
          height: 14,
          shape: (value) => (value === 'Alpha' ? 'line-dot' : 'square'),
        },
        label: {
          fontSize: 14,
          fill: (_value, { color }) => color,
        },
      },
    })
    const children = renderLegend(legend).children

    expect(children).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'rule',
          key: expect.stringMatching(/^legend-line:.*Alpha$/),
          style: expect.objectContaining({ stroke: '#2563eb' }),
        }),
        expect.objectContaining({
          kind: 'dot',
          key: expect.stringMatching(/^legend-line-dot:.*Alpha$/),
          style: expect.objectContaining({
            fill: '#fff',
            stroke: '#2563eb',
          }),
        }),
        expect.objectContaining({
          kind: 'rect',
          key: expect.stringMatching(/^legend-square:.*Beta$/),
          style: { fill: '#f97316' },
        }),
        expect.objectContaining({
          kind: 'label',
          key: expect.stringMatching(/^legend-label:.*Alpha$/),
          baseline: 'middle',
          fontSize: 14,
          style: { fill: '#2563eb', fillOpacity: 1 },
        }),
      ]),
    )
  })

  it('passes resolved item data and measured bounds to custom indicators', () => {
    const render = vi.fn((_value: string, context) => ({
      kind: 'rule' as const,
      key: `custom:${context.index}`,
      x1: context.bounds.x,
      x2: context.bounds.x + context.bounds.width,
      y1: context.bounds.y,
      y2: context.bounds.y,
      style: { stroke: context.color },
    }))
    const legend = colorLegend<string>({
      items: { indicator: { width: 18, height: 12, render } },
    })

    renderLegend(legend)

    expect(render).toHaveBeenCalledWith(
      'Alpha',
      expect.objectContaining({
        color: '#2563eb',
        index: 0,
        label: 'Alpha',
        bounds: { x: 40, y: 4, width: 18, height: 12 },
      }),
    )
  })

  it('supports mixed marks with one resolved categorical legend', () => {
    const rows = [
      { month: 'Jan', revenue: 10, orders: 4 },
      { month: 'Feb', revenue: 14, orders: 7 },
    ]
    const definition = defineChart({
      marks: [
        barY(rows, {
          id: 'orders',
          x: 'month',
          y: 'orders',
          color: () => 'Orders',
        }),
        lineY(rows, {
          id: 'revenue',
          x: 'month',
          y: 'revenue',
          color: () => 'Revenue',
        }),
      ],
      scales: {
        x: { scale: scaleBand<string> },
        y: { scale: scaleLinear },
      },
      color: {
        domain: ['Revenue', 'Orders'],
        range: ['#2563eb', '#f97316'],
        legend: colorLegend<'Revenue' | 'Orders'>({
          placement: 'bottom',
          items: {
            indicator: {
              width: 20,
              height: 12,
              shape: (value) => (value === 'Revenue' ? 'line-dot' : 'square'),
            },
          },
        }),
      },
    })
    const scene = createChartScene(definition, { width: 480, height: 320 })
    const legend = scene.nodes.find((node) => node.key === 'legend')

    expect(legend).toEqual(
      expect.objectContaining({
        kind: 'group',
        children: expect.arrayContaining([
          expect.objectContaining({
            key: expect.stringMatching(/^legend-line:.*Revenue$/),
          }),
          expect.objectContaining({
            key: expect.stringMatching(/^legend-square:.*Orders$/),
          }),
        ]),
      }),
    )
  })
})

colorLegend<'Revenue' | 'Orders'>({
  items: {
    indicator: {
      shape: (value, context) => {
        expectTypeOf(value).toEqualTypeOf<'Revenue' | 'Orders'>()
        expectTypeOf(context.color).toEqualTypeOf<string>()
        return value === 'Revenue' ? 'line-dot' : 'square'
      },
    },
    label: {
      format: (value) => {
        expectTypeOf(value).toEqualTypeOf<'Revenue' | 'Orders'>()
        return value
      },
    },
  },
})

colorLegend({
  items: {
    indicator: {
      // @ts-expect-error Indicator shapes are a closed renderer-neutral set.
      shape: 'triangle',
    },
  },
})
