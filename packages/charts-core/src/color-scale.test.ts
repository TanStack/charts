import { describe, expect, it } from 'vitest'
import { scaleLinear, scaleSequential } from 'd3-scale'
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
