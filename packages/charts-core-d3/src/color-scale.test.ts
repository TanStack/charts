import { describe, expect, it } from 'vitest'
import { scaleColorLinear } from './color-scale'
import { colorGradientLegend } from './legend'
import { createColorScale } from './scales'
import { defaultChartTheme } from './scene'

describe('continuous color', () => {
  it('maps a numeric domain across a multi-stop range', () => {
    const scale = createColorScale(
      [0, 50, 100],
      {
        type: scaleColorLinear(),
        range: ['#000000', '#ffffff'],
      },
      defaultChartTheme,
    )

    expect(scale.type).toBe('linear')
    expect(scale.domain).toEqual([0, 100])
    expect(scale.map(0)).toBe('rgb(0 0 0)')
    expect(scale.map(50)).toBe('rgb(128 128 128)')
    expect(scale.map(100)).toBe('rgb(255 255 255)')
  })

  it('renders a gradient guide from the resolved scale', () => {
    const colors = createColorScale(
      [10, 20],
      { type: scaleColorLinear() },
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
