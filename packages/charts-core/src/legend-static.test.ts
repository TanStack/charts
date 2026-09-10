import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import { scaleBand, scaleLinear } from 'd3-scale'
import { barY } from './bar'
import {
  estimateSceneText,
  measureSceneLabelBounds,
  withChartTextTypography,
} from './guide-layout'
import { colorLegend, colorLegendItems } from './legend-static'
import { lineY } from './line'
import { createChartScene, defaultChartTheme, defineChart } from './scene'
import type {
  ChartColorLegendContext,
  ChartTextMeasureOptions,
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
    layout: { measureText: estimateSceneText },
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

  it('handles an empty categorical domain without invoking item callbacks', () => {
    const format = vi.fn(String)
    const render = vi.fn(() => ({
      kind: 'dot' as const,
      key: 'unused',
      x: 0,
      y: 0,
      radius: 1,
    }))
    const legend = colorLegend({
      items: colorLegendItems({
        indicator: { render },
        label: { format },
      }),
    })
    const context = legendContext({
      colors: { ...colors, domain: [], range: [] },
    })

    expect(legend.height(0, context)).toBe(18)
    expect(renderLegend(legend, context).children).toEqual([])
    expect(format).not.toHaveBeenCalled()
    expect(render).not.toHaveBeenCalled()
  })

  it.each(['continuous', 'quantile', 'quantize', 'threshold'] as const)(
    'ignores categorical item callbacks for a %s scale',
    (kind) => {
      const format = vi.fn(String)
      const fill = vi.fn(() => '#000')
      const shape = vi.fn(() => 'dot' as const)
      const render = vi.fn(() => ({
        kind: 'dot' as const,
        key: 'unused',
        x: 0,
        y: 0,
        radius: 1,
      }))
      const legend = colorLegend<number>({
        items: colorLegendItems({
          indicator: { shape, render },
          label: { format, fill },
        }),
      })
      const context = legendContext({
        colors: {
          ...colors,
          kind,
          domain: [0, 10],
          range: ['#eff6ff', '#1d4ed8'],
          thresholds: [5],
        },
      })

      expect(legend.height(2, context)).toBeGreaterThan(0)
      renderLegend(legend, context)
      expect(format).not.toHaveBeenCalled()
      expect(fill).not.toHaveBeenCalled()
      expect(shape).not.toHaveBeenCalled()
      expect(render).not.toHaveBeenCalled()
    },
  )

  it('measures labels to center and wrap compact rows', () => {
    const legend = colorLegend({
      items: colorLegendItems({
        justify: 'center',
        gap: 20,
        rowGap: 10,
        indicator: { width: 20, height: 14, gap: 6 },
        label: { fontSize: 14 },
      }),
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

  it('uses host text measurement and ignores invalid font weights', () => {
    const measureText = vi.fn((text: string) => ({
      x: 0,
      y: 0,
      width: text.length * 10,
      height: 14,
    }))
    const legend = colorLegend({
      items: colorLegendItems({
        justify: 'center',
        label: { fontSize: 14, fontWeight: Number.NaN },
      }),
    })
    const context = legendContext({ layout: { measureText } })

    const labels = renderLegend(legend, context).children.filter(
      (node) => node.kind === 'label',
    )

    expect(measureText).toHaveBeenCalledWith(
      'Alpha',
      expect.objectContaining({ fontSize: 14, fontWeight: undefined }),
    )
    expect(labels.map((label) => label.fontWeight)).toEqual([
      undefined,
      undefined,
      undefined,
    ])
  })

  it.each([
    { direction: 'ltr' as const, textX: -7, anchor: 'start' as const },
    { direction: 'rtl' as const, textX: 8, anchor: 'end' as const },
  ])(
    'positions compact $direction labels from their painted bounds',
    ({ direction, textX, anchor }) => {
      const labelWidth = 40
      const indicatorGap = 4
      const itemGap = 12
      const measureText = vi.fn(() => ({
        x: textX,
        y: -6,
        width: labelWidth,
        height: 12,
      }))
      const legend = colorLegend({
        items: colorLegendItems({
          justify: 'center',
          gap: itemGap,
          indicator: {
            shape: 'square',
            width: 10,
            height: 10,
            gap: indicatorGap,
          },
        }),
      })
      const context = legendContext({
        direction,
        chart: { x: 40, y: 60, width: 130, height: 200 },
        bounds: { x: 40, y: 0, width: 130, height: 100 },
        layout: { measureText },
      })
      const children = renderLegend(legend, context).children
      const indicators = children.filter((node) => node.kind === 'rect')
      const labels = children.filter((node) => node.kind === 'label')

      expect(indicators).toHaveLength(3)
      expect(labels).toHaveLength(3)
      expect(labels.map((label) => label.anchor)).toEqual([
        anchor,
        anchor,
        anchor,
      ])
      labels.forEach((label, index) => {
        const indicator = indicators[index]!
        expect(label.x + textX).toBe(
          indicator.x + indicator.width + indicatorGap,
        )
      })
      expect(indicators[1]!.x - (labels[0]!.x + textX + labelWidth)).toBe(
        itemGap,
      )
      expect(indicators[0]!.x - context.bounds.x).toBe(
        context.bounds.x +
          context.bounds.width -
          (labels[1]!.x + textX + labelWidth),
      )
      expect(indicators[2]!.x - context.bounds.x).toBe(
        context.bounds.x +
          context.bounds.width -
          (labels[2]!.x + textX + labelWidth),
      )
      expect(labels[2]!.y).toBeGreaterThan(labels[1]!.y)
    },
  )

  it.each([
    { direction: 'ltr' as const, anchor: 'start' },
    { direction: 'rtl' as const, anchor: 'end' },
  ])(
    'keeps configured labels on their physical left edge in $direction',
    ({ direction, anchor }) => {
      const measureText = vi.fn(
        (text: string, options: ChartTextMeasureOptions) =>
          estimateSceneText(text, options),
      )
      const legend = colorLegend({
        items: colorLegendItems({ justify: 'center' }),
      })
      const context = legendContext({
        direction,
        layout: { measureText },
      })
      const labels = renderLegend(legend, context).children.filter(
        (node) => node.kind === 'label',
      )

      expect(labels.map((label) => label.anchor)).toEqual([
        anchor,
        anchor,
        anchor,
      ])
      expect(measureText).toHaveBeenCalledWith(
        'Alpha',
        expect.objectContaining({ direction, anchor }),
      )
    },
  )

  it('reserves measured label height for every wrapped row', () => {
    const measureText = vi.fn(() => ({
      x: 0,
      y: -16,
      width: 45,
      height: 32,
    }))
    const legend = colorLegend({
      items: colorLegendItems({
        justify: 'start',
        rowGap: 4,
        label: { fontSize: 12 },
      }),
    })
    const context = legendContext({
      chart: { x: 40, y: 60, width: 80, height: 200 },
      bounds: { x: 40, y: 0, width: 80, height: 126 },
      layout: { measureText },
    })

    expect(legend.height(colors.domain.length, context)).toBe(126)
    expect(
      renderLegend(legend, context)
        .children.filter((node) => node.kind === 'label')
        .map((label) => label.y),
    ).toEqual([16, 52, 88])
  })

  it.each([
    ['x', Number.NaN],
    ['y', Number.POSITIVE_INFINITY],
    ['width', Number.NaN],
    ['width', -1],
    ['height', Number.POSITIVE_INFINITY],
    ['height', -1],
  ] as const)(
    'falls back from an invalid host metric at %s',
    (field, value) => {
      const typography = { fontScale: 2, letterSpacing: 1 }
      const estimateText = withChartTextTypography(
        estimateSceneText,
        typography,
      )
      const measureText = vi.fn(
        (text: string, options: ChartTextMeasureOptions) => ({
          ...estimateText(text, options),
          [field]: value,
        }),
      )
      const legend = colorLegend({
        label: 'Series',
        items: colorLegendItems({ justify: 'center', label: { fontSize: 14 } }),
      })
      const measuredContext = legendContext({
        layout: { measureText, typography },
      })
      const fallbackContext = legendContext({ layout: { typography } })
      const positions = (context: ChartColorLegendContext) =>
        renderLegend(legend, context)
          .children.filter((node) => node.kind === 'label')
          .map(({ x, y }) => [x, y])

      expect(legend.height(colors.domain.length, measuredContext)).toBe(
        legend.height(colors.domain.length, fallbackContext),
      )
      expect(positions(measuredContext)).toEqual(positions(fallbackContext))
      expect(positions(measuredContext).flat().every(Number.isFinite)).toBe(
        true,
      )
      expect(
        legend.height(colors.domain.length, measuredContext),
      ).toBeGreaterThan(18 + colors.domain.length * 14)
    },
  )

  it('keeps a scaled title above configured item rows', () => {
    const typography = { fontScale: 2, letterSpacing: 1 }
    const legend = colorLegend({
      label: 'Series',
      items: colorLegendItems(),
    })
    const context = legendContext({ layout: { typography } })
    const labels = renderLegend(legend, context).children.filter(
      (node) => node.kind === 'label',
    )
    const title = labels.find((label) => label.key === 'legend-label')
    const firstItem = labels.find((label) => label.key !== 'legend-label')
    if (!title || !firstItem) throw new Error('Expected title and item labels')
    const measureText = withChartTextTypography(estimateSceneText, typography)
    const titleBounds = measureSceneLabelBounds(title, measureText)
    const itemBounds = measureSceneLabelBounds(firstItem, measureText)

    expect(titleBounds.y).toBeGreaterThanOrEqual(context.bounds.y)
    expect(titleBounds.y + titleBounds.height).toBeLessThanOrEqual(itemBounds.y)
    expect(itemBounds.y + itemBounds.height).toBeLessThanOrEqual(
      context.bounds.y + legend.height(colors.domain.length, context),
    )
  })

  it('uses asymmetric label extents to separate the title and rows', () => {
    const measureText = vi.fn((text: string) =>
      text === 'Series'
        ? { x: 0, y: -18, width: 40, height: 22 }
        : { x: 0, y: -24, width: 45, height: 28 },
    )
    const legend = colorLegend({
      label: 'Series',
      items: colorLegendItems({ justify: 'start', rowGap: 2 }),
    })
    const context = legendContext({
      chart: { x: 40, y: 60, width: 80, height: 200 },
      bounds: { x: 40, y: 0, width: 80, height: 140 },
      layout: { measureText },
    })
    const labels = renderLegend(legend, context).children.filter(
      (node) => node.kind === 'label',
    )
    const bounds = labels.map((label) =>
      measureSceneLabelBounds(label, measureText),
    )

    expect(bounds).toHaveLength(4)
    bounds.slice(1).forEach((current, index) => {
      const previous = bounds[index]!
      expect(previous.y + previous.height).toBeLessThanOrEqual(current.y)
    })
    expect(bounds.at(-1)!.y + bounds.at(-1)!.height).toBeLessThanOrEqual(
      context.bounds.y + legend.height(colors.domain.length, context),
    )
  })

  it('renders per-series symbols and label colors from resolved items', () => {
    const legend = colorLegend<'Alpha' | 'Beta' | 'Gamma'>({
      items: colorLegendItems<'Alpha' | 'Beta' | 'Gamma'>({
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
      }),
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
            fill: 'Canvas',
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

  it('uses the concrete chart background inside a line-dot indicator', () => {
    const legend = colorLegend({
      items: colorLegendItems({
        indicator: { shape: 'line-dot' },
      }),
    })
    const context = legendContext({
      theme: { ...defaultChartTheme, background: '#0f172a' },
    })
    const centerDots = renderLegend(legend, context).children.filter(
      (node) => node.kind === 'dot',
    )

    expect(centerDots).toHaveLength(3)
    expect(centerDots.map((node) => node.style?.fill)).toEqual([
      '#0f172a',
      '#0f172a',
      '#0f172a',
    ])
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
      items: colorLegendItems({
        indicator: { width: 18, height: 12, render },
      }),
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

  it('accepts multiple scene nodes from a custom indicator', () => {
    const legend = colorLegend<string>({
      items: colorLegendItems({
        indicator: {
          render: (value, { bounds, color }) => [
            {
              kind: 'rect',
              key: `custom-box:${value}`,
              ...bounds,
              style: { fill: color },
            },
            {
              kind: 'rule',
              key: `custom-rule:${value}`,
              x1: bounds.x,
              x2: bounds.x + bounds.width,
              y1: bounds.y,
              y2: bounds.y + bounds.height,
              style: { stroke: color },
            },
          ],
        },
      }),
    })
    const children = renderLegend(legend).children

    expect(
      children.filter((node) => node.key.startsWith('custom-box:')),
    ).toHaveLength(3)
    expect(
      children.filter((node) => node.key.startsWith('custom-rule:')),
    ).toHaveLength(3)
  })

  it('keeps oversized indicators within the legend bounds', () => {
    const legend = colorLegend({
      items: colorLegendItems({
        indicator: { width: 24, height: 24, shape: 'square' },
      }),
    })
    const context = legendContext()
    const children = renderLegend(legend, context).children
    const indicators = children.filter((node) => node.kind === 'rect')
    const labels = children.filter((node) => node.kind === 'label')

    expect(indicators[0]).toEqual(
      expect.objectContaining({ y: context.bounds.y, height: 24 }),
    )
    expect(labels[0]).toEqual(expect.objectContaining({ y: 12 }))
  })

  it('clamps indicator width to its allocated column', () => {
    const legend = colorLegend({
      items: colorLegendItems({
        indicator: { width: 400, height: 12, shape: 'line' },
      }),
    })
    const context = legendContext()
    const children = renderLegend(legend, context).children
    const indicators = children.filter((node) => node.kind === 'rule')
    const labels = children.filter((node) => node.kind === 'label')

    expect(indicators[0]).toEqual(
      expect.objectContaining({
        x1: context.bounds.x,
        x2: context.bounds.x + context.bounds.width,
      }),
    )
    expect(labels[0]).toEqual(
      expect.objectContaining({ x: context.bounds.x + context.bounds.width }),
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
          items: colorLegendItems<'Revenue' | 'Orders'>({
            indicator: {
              width: 20,
              height: 12,
              shape: (value) => (value === 'Revenue' ? 'line-dot' : 'square'),
            },
          }),
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
  items: colorLegendItems<'Revenue' | 'Orders'>({
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
  }),
})

colorLegend({
  items: colorLegendItems({
    indicator: {
      // @ts-expect-error Indicator shapes are a closed renderer-neutral set.
      shape: 'triangle',
    },
  }),
})

colorLegend<'Revenue'>({
  items: colorLegendItems<string>(),
})

colorLegend<'Revenue' | 'Orders'>({
  // @ts-expect-error A narrow callback cannot receive a broader legend domain.
  items: colorLegendItems<'Revenue'>(),
})
