import { describe, expect, it } from 'vitest'
import { scaleLinear, scaleOrdinal, scaleSequential } from 'd3-scale'
import { createColorScale } from './scales'
import { defaultChartTheme } from './scene'
import { colorGradientLegend } from './legend'

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
      { scale: scaleLinear<string> },
      defaultChartTheme,
    )

    expect(scale.domain).toEqual([4, 9])
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
})
