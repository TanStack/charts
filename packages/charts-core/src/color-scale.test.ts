import { describe, expect, it } from 'vitest'
import {
  scaleLinear,
  scaleLog,
  scaleOrdinal,
  scaleQuantile,
  scaleQuantize,
  scaleSequential,
  scaleSequentialQuantile,
  scaleThreshold,
} from 'd3-scale'
import { createColorScale } from './scales'
import { defaultChartTheme } from './scene'
import { colorGradientLegend, colorLegend } from './legend'

describe('continuous color', () => {
  it('accepts configured D3 color scales directly', () => {
    const configured = scaleSequential((ratio) => `value:${ratio}`).domain([
      0, 100,
    ])
    const scale = createColorScale(
      [0, 50, 100],
      { scale: configured },
      defaultChartTheme,
    )

    expect(scale.domain).toEqual([0, 100])
    expect(scale.map(50)).toBe(configured(50))
  })

  it('maps a numeric domain across a multi-stop range', () => {
    const configured = scaleLinear<string>()
      .domain([0, 50, 100])
      .range(['#000000', '#808080', '#ffffff'])
    const scale = createColorScale(
      [0, 50, 100],
      { scale: configured },
      defaultChartTheme,
    )

    expect(scale.type).toBe('configured')
    expect(scale.domain).toEqual([0, 50, 100])
    expect(scale.map(0)).toBe('rgb(0, 0, 0)')
    expect(scale.map(50)).toBe('rgb(128, 128, 128)')
    expect(scale.map(100)).toBe('rgb(255, 255, 255)')
  })

  it('infers categorical color domains for factories', () => {
    const scale = createColorScale(
      ['Beta', 'Alpha', 'Beta'],
      {
        scale: () =>
          scaleOrdinal<string, string>().range(['#111111', '#eeeeee']),
      },
      defaultChartTheme,
    )

    expect(scale.domain).toEqual(['Beta', 'Alpha'])
    expect(scale.map('Beta')).toBe('#111111')
    expect(scale.map('Alpha')).toBe('#eeeeee')
  })

  it('applies color options to factory-created scales', () => {
    const scale = createColorScale(
      ['Beta', 'Alpha'],
      {
        scale: scaleOrdinal<string, string>,
        range: ['#111111', '#eeeeee'],
      },
      defaultChartTheme,
    )

    expect(scale.domain).toEqual(['Beta', 'Alpha'])
    expect(scale.range).toEqual(['#111111', '#eeeeee'])
  })

  it('rejects factories that do not return a color scale', () => {
    expect(() =>
      createColorScale(
        ['Alpha'],
        { scale: (() => '#111111') as never },
        defaultChartTheme,
      ),
    ).toThrow('A color scale must be callable and copyable')
  })

  it('infers continuous color domains for factories', () => {
    const scale = createColorScale(
      [4, 9, 7],
      {
        scale: scaleLinear<string>,
        range: ['#eff6ff', '#1d4ed8'],
      },
      defaultChartTheme,
    )

    expect(scale.domain).toEqual([4, 9])
    expect(scale.kind).toBe('continuous')
  })

  it('rejects a factory whose D3 default is not a paint range', () => {
    expect(() =>
      createColorScale(
        [4, 9, 7],
        { scale: scaleLinear<string> },
        defaultChartTheme,
      ),
    ).toThrow('A color-scale factory requires a string range')
    expect(() =>
      createColorScale(
        ['Alpha', 'Beta'],
        { scale: scaleOrdinal<string, string> },
        defaultChartTheme,
      ),
    ).toThrow('A color-scale factory requires a string range')
  })

  it('infers an extent for quantize color factories', () => {
    const scale = createColorScale(
      [9, 4, 7],
      {
        scale: scaleQuantize<string>,
        range: ['#eff6ff', '#93c5fd', '#1d4ed8'],
      },
      defaultChartTheme,
    )

    expect(scale.domain).toEqual([4, 9])
    expect(scale.kind).toBe('quantize')
    expect(scale.map(4)).toBe('#eff6ff')
    expect(scale.map(9)).toBe('#1d4ed8')
  })

  it('passes the observed population to quantile color factories', () => {
    const scale = createColorScale(
      [9, 4, 7, 4],
      {
        scale: scaleQuantile<number, string>,
        range: ['#eff6ff', '#93c5fd', '#1d4ed8'],
      },
      defaultChartTheme,
    )

    expect(scale.domain).toEqual([4, 4, 7, 9])
    expect(scale.kind).toBe('quantile')
  })

  it('requires authored thresholds for threshold color factories', () => {
    expect(() =>
      createColorScale(
        [4, 9, 7],
        {
          scale: scaleThreshold<number, string>,
          range: ['#eff6ff', '#93c5fd', '#1d4ed8'],
        },
        defaultChartTheme,
      ),
    ).toThrow('requires an explicit domain')

    const configured = createColorScale(
      [4, 9, 7],
      {
        scale: scaleThreshold<number, string>,
        domain: [5, 8],
        range: ['#eff6ff', '#93c5fd', '#1d4ed8'],
      },
      defaultChartTheme,
    )
    expect(configured.domain).toEqual([5, 8])
    expect(configured.kind).toBe('threshold')

    const empty = createColorScale(
      [],
      {
        scale: scaleThreshold<number, string>,
        domain: [],
        range: ['#eff6ff'],
      },
      defaultChartTheme,
    )
    expect(empty.domain).toEqual([])
  })

  it('rejects nonnumeric values for quantitative color factories', () => {
    expect(() =>
      createColorScale(
        ['high', 'low'],
        { scale: scaleLinear<string> },
        defaultChartTheme,
      ),
    ).toThrow('A quantitative color-scale factory requires numeric values')
    expect(() =>
      createColorScale(
        ['high', 'low'],
        {
          scale: scaleQuantile<number, string>,
          range: ['#eff6ff', '#1d4ed8'],
        },
        defaultChartTheme,
      ),
    ).toThrow('A quantitative color-scale factory requires numeric values')
    expect(() =>
      createColorScale(
        [4, 'high'],
        { scale: scaleLinear<string> },
        defaultChartTheme,
      ),
    ).toThrow('A quantitative color-scale factory requires numeric values')
    expect(() =>
      createColorScale(
        [4, 'high'],
        {
          scale: scaleQuantile<number, string>,
          range: ['#eff6ff', '#1d4ed8'],
        },
        defaultChartTheme,
      ),
    ).toThrow('A quantitative color-scale factory requires numeric values')
  })

  it('requires inferred log color domains to stay strictly on one side of zero', () => {
    const range = ['#eff6ff', '#1d4ed8']
    expect(
      createColorScale(
        [1, 10],
        { scale: scaleLog<string>, range },
        defaultChartTheme,
      ).domain,
    ).toEqual([1, 10])
    expect(
      createColorScale(
        [-10, -1],
        { scale: scaleLog<string>, range },
        defaultChartTheme,
      ).domain,
    ).toEqual([-10, -1])

    for (const values of [[0], [0, 10], [-10, 0], [-10, 10]]) {
      expect(() =>
        createColorScale(
          values,
          { scale: scaleLog<string>, range },
          defaultChartTheme,
        ),
      ).toThrow('cannot include or cross zero')
    }
  })

  it('matches inferred continuous domains to configured color stops', () => {
    const scale = createColorScale(
      [0, 100],
      {
        scale: () =>
          scaleLinear<string>().range(['#000000', '#808080', '#ffffff']),
      },
      defaultChartTheme,
    )

    expect(scale.domain).toEqual([0, 50, 100])
  })

  it('matches inferred continuous domains to color option stops', () => {
    const scale = createColorScale(
      [0, 100],
      {
        scale: scaleLinear<string>,
        range: ['#000000', '#808080', '#ffffff'],
      },
      defaultChartTheme,
    )

    expect(scale.domain).toEqual([0, 50, 100])
  })

  it('infers a population for sequential quantiles and keeps a ramp legend', () => {
    const colors = createColorScale(
      [9, 4, 7, 4],
      {
        scale: () =>
          scaleSequentialQuantile<string>((ratio) =>
            ratio < 0.5 ? '#eff6ff' : '#1d4ed8',
          ),
      },
      defaultChartTheme,
    )

    expect(colors.domain).toEqual([4, 4, 7, 9])
    expect(colors.kind).toBe('continuous')
    expect(legendRects(colorLegend(), colors)).toHaveLength(32)
  })

  it('renders a gradient guide from the resolved scale', () => {
    const configured = scaleLinear<string>()
      .domain([10, 20])
      .range(['#eff6ff', '#1d4ed8'])
    const colors = createColorScale(
      [10, 20],
      { scale: configured },
      defaultChartTheme,
    )
    const legend = colorGradientLegend({ label: 'Intensity', steps: 4 })
    const node = legend.render({
      colors,
      chart: { x: 40, y: 60, width: 400, height: 200 },
      theme: defaultChartTheme,
      width: 480,
    })

    expect(node.kind).toBe('group')
    if (node.kind !== 'group') throw new Error('Expected a legend group')
    expect(node.children.filter((child) => child.kind === 'rect')).toHaveLength(
      4,
    )
  })

  it.each([
    {
      kind: 'quantize',
      colors: createColorScale(
        [0, 12],
        {
          scale: scaleQuantize<string>,
          range: ['#eff6ff', '#93c5fd', '#1d4ed8'],
        },
        defaultChartTheme,
      ),
      labels: ['0', '4', '8', '12'],
    },
    {
      kind: 'quantile',
      colors: createColorScale(
        [0, 3, 6, 9, 12],
        {
          scale: scaleQuantile<number, string>,
          range: ['#eff6ff', '#93c5fd', '#1d4ed8'],
        },
        defaultChartTheme,
      ),
      labels: ['0', '4', '8', '12'],
    },
    {
      kind: 'threshold',
      colors: createColorScale(
        [0, 30],
        {
          scale: scaleThreshold<number, string>,
          domain: [5, 12, 24],
          range: ['#eff6ff', '#bfdbfe', '#60a5fa', '#1d4ed8'],
        },
        defaultChartTheme,
      ),
      labels: ['5', '12', '24'],
    },
  ])('renders exact $kind color bins and boundaries', ({ colors, labels }) => {
    const legend = colorLegend({ label: 'Intensity' })
    const node = renderLegend(legend, colors)

    expect(legendRects(legend, colors)).toHaveLength(colors.range.length)
    expect(
      node.children
        .filter((child) => child.kind === 'label')
        .map((child) => child.text)
        .filter((text) => text !== 'Intensity'),
    ).toEqual(labels)
  })

  it('uses boundaries supplied by a custom stepped color scale', () => {
    const colors = {
      type: 'custom',
      kind: 'quantile' as const,
      domain: [0, 10],
      range: ['#eff6ff', '#93c5fd', '#1d4ed8'],
      thresholds: [2, 8],
      map: () => '#93c5fd',
    }
    const node = renderLegend(colorLegend(), colors)

    expect(
      node.children
        .filter((child) => child.kind === 'label')
        .map((child) => child.text),
    ).toEqual(['0', '2', '8', '10'])
  })
})

function renderLegend(
  legend: ReturnType<typeof colorLegend>,
  colors: ReturnType<typeof createColorScale>,
) {
  const node = legend.render({
    colors,
    chart: { x: 40, y: 60, width: 400, height: 200 },
    theme: defaultChartTheme,
    width: 480,
  })
  if (node.kind !== 'group') throw new Error('Expected a legend group')
  return node
}

function legendRects(
  legend: ReturnType<typeof colorLegend>,
  colors: ReturnType<typeof createColorScale>,
) {
  return renderLegend(legend, colors).children.filter(
    (child) => child.kind === 'rect',
  )
}
