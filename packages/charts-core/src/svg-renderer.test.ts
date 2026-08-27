import { scaleLinear } from 'd3-scale'
import { describe, expect, it } from 'vitest'
import { lineY } from './line'
import { createChartScene, defineChart } from './scene'
import { renderChartSvg } from './svg'
import type { ChartScene } from './types'

describe('SVG scene renderer', () => {
  it('renders structured disconnected polygons and holes with even-odd fill', () => {
    const scene = testScene()
    const svg = renderChartSvg(scene, { ariaLabel: 'Density contour' })

    expect(svg).toContain('fill-rule="evenodd"')
    expect(svg).toContain(
      'd="M0,0L20,0L20,20L0,20ZM5,5L15,5L15,15L5,15ZM30,0L40,0L40,10L30,10Z"',
    )
    expect(svg).not.toContain('M99,99Z')
  })

  it('serializes Cartesian axis-title typography and paint', () => {
    const scene = createChartScene(
      defineChart({
        marks: [lineY([1, 2, 3])],
        scales: {
          x: { scale: scaleLinear().domain([0, 2]), axis: false },
          y: {
            scale: scaleLinear().domain([0, 3]),
            axis: {
              ticks: false,
              label: {
                text: 'Revenue',
                fontSize: 17,
                fontWeight: 650,
                fill: '#0f766e',
                opacity: 0.6,
              },
            },
          },
        },
      }),
      { width: 480, height: 260 },
    )
    const svg = renderChartSvg(scene, { ariaLabel: 'Revenue chart' })

    expect(svg).toMatch(
      /<text data-ts-key="y-label"[^>]* fill="#0f766e" opacity="0\.6"[^>]* font-size="17" font-weight="650"/,
    )
  })
})

function testScene(): ChartScene {
  return {
    width: 100,
    height: 60,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    chart: { x: 0, y: 0, width: 100, height: 60 },
    nodes: [
      {
        kind: 'area',
        key: 'contour',
        points: [[99, 99]],
        path: 'M99,99Z',
        polygons: [
          [
            [
              [0, 0],
              [20, 0],
              [20, 20],
              [0, 20],
            ],
            [
              [5, 5],
              [15, 5],
              [15, 15],
              [5, 15],
            ],
          ],
          [
            [
              [30, 0],
              [40, 0],
              [40, 10],
              [30, 10],
            ],
          ],
        ],
        style: { fill: '#2563eb' },
      },
    ],
    points: [],
    scales: {},
    colors: {
      type: 'ordinal',
      domain: [],
      range: [],
      map: () => '#2563eb',
    },
    gradients: [],
    theme: {
      foreground: '#111111',
      muted: '#666666',
      grid: '#999999',
      background: 'transparent',
      palette: ['#2563eb'],
    },
  }
}
