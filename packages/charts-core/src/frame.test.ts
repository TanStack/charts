import { describe, expect, it } from 'vitest'
import { frame } from './frame'
import { createChartScene, defineChart } from './scene'
import { renderChartSvg } from './svg'

describe('frame mark', () => {
  it('uses resolved chart bounds without materializing positional scales', () => {
    const scene = createChartScene(
      defineChart({
        marks: [
          frame({
            fill: '#eff6ff',
            stroke: '#2563eb',
            inset: 2,
            radius: 4,
          }),
        ],
        guides: false,
        scales: {
          x: null,
          y: null,
        },
      }),
      { width: 320, height: 180 },
    )
    const svg = renderChartSvg(scene, { ariaLabel: 'Framed chart' })

    expect(scene.points).toHaveLength(0)
    expect(svg).toContain('class="ts-chart__frame"')
    expect(svg).toContain('x="2"')
    expect(svg).toContain('width="316"')
    expect(svg).toContain('rx="4"')
  })
})
