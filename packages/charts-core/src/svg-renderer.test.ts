import { describe, expect, it } from 'vitest'
import { renderChartSvg } from './svg'
import type { ChartScene } from './types'

describe('SVG scene renderer', () => {
  it('escapes attributes and labels without changing entities or Unicode', () => {
    const text = 'A &amp; <tag> "quoted" \u0000 🌈'
    const scene = {
      ...testScene(),
      nodes: [{ kind: 'label' as const, key: text, text, x: 1, y: 2 }],
    }
    const svg = renderChartSvg(scene, { ariaLabel: text })
    expect(svg).toContain(
      'aria-label="A &amp;amp; &lt;tag&gt; &quot;quoted&quot; \u0000 🌈"',
    )
    expect(svg).toContain(
      'data-ts-key="A &amp;amp; &lt;tag&gt; &quot;quoted&quot; \u0000 🌈"',
    )
    expect(svg).toContain('>A &amp;amp; &lt;tag&gt; "quoted" \u0000 🌈</text>')
  })

  it('renders structured disconnected polygons and holes with even-odd fill', () => {
    const scene = testScene()
    const svg = renderChartSvg(scene, { ariaLabel: 'Density contour' })

    expect(svg).toContain('fill-rule="evenodd"')
    expect(svg).toContain(
      'd="M0,0L20,0L20,20L0,20ZM5,5L15,5L15,15L5,15ZM30,0L40,0L40,10L30,10Z"',
    )
    expect(svg).not.toContain('M99,99Z')
  })

  it('renders selective radii as a path and preserves numeric rect radii', () => {
    const svg = renderChartSvg(
      {
        ...testScene(),
        nodes: [
          {
            kind: 'rect',
            key: 'selective',
            x: 10,
            y: 10,
            width: 40,
            height: 20,
            cornerRadii: [8, 4, 0, 0],
            style: { fill: '#2563eb' },
          },
          {
            kind: 'rect',
            key: 'legacy',
            x: 60,
            y: 10,
            width: 20,
            height: 20,
            radius: 6,
          },
        ],
      },
      { ariaLabel: 'Rounded rectangles' },
    )

    expect(svg).toContain(
      '<path data-ts-key="selective" fill="#2563eb" d="M18,10H46A4,4 0 0 1 50,14V30A0,0 0 0 1 50,30H10A0,0 0 0 1 10,30V18A8,8 0 0 1 18,10Z"/>',
    )
    expect(svg).toContain(
      '<rect data-ts-key="legacy" x="60" y="10" width="20" height="20" rx="6"/>',
    )
  })

  it('preserves the untyped linear gradient markup', () => {
    const svg = renderChartSvg(
      {
        ...testScene(),
        gradients: [
          {
            id: 'legacy',
            stops: [
              { offset: 0, color: '#123456', opacity: 0.4 },
              { offset: 1, color: '#abcdef' },
            ],
          },
        ],
      },
      { ariaLabel: 'Legacy gradient', idPrefix: 'chart.one' },
    )

    expect(svg).toContain(
      '<defs data-ts-key="gradients"><linearGradient data-ts-key="gradient:legacy" id="chartone-legacy" x1="0%" y1="100%" x2="0%" y2="0%"><stop data-ts-key="gradient:legacy:stop:0" offset="0%" stop-color="#123456" stop-opacity="0.4"/><stop data-ts-key="gradient:legacy:stop:1" offset="100%" stop-color="#abcdef"/></linearGradient></defs>',
    )
  })

  it('renders radial gradients with inherited focal defaults', () => {
    const svg = renderChartSvg(
      {
        ...testScene(),
        gradients: [
          {
            type: 'radial',
            id: 'spot',
            cx: 0.25,
            cy: 0.75,
            r: 1.5,
            fx: -1,
            stops: [{ offset: 0.5, color: '#123456', opacity: 0.6 }],
          },
          {
            type: 'radial',
            id: 'non-finite',
            cx: Number.NaN,
            cy: Number.POSITIVE_INFINITY,
            r: Number.NEGATIVE_INFINITY,
            fy: Number.NaN,
            stops: [{ offset: Number.POSITIVE_INFINITY, color: '#abcdef' }],
          },
        ],
      },
      { ariaLabel: 'Radial gradient', idPrefix: 'chart.one' },
    )

    expect(svg).toContain(
      '<radialGradient data-ts-key="gradient:spot" id="chartone-spot" cx="25%" cy="75%" r="100%" fx="0%" fy="75%"><stop data-ts-key="gradient:spot:stop:0" offset="50%" stop-color="#123456" stop-opacity="0.6"/></radialGradient>',
    )
    expect(svg).toContain(
      '<radialGradient data-ts-key="gradient:non-finite" id="chartone-non-finite" cx="0%" cy="100%" r="0%" fx="0%" fy="0%"><stop data-ts-key="gradient:non-finite:stop:0" offset="100%" stop-color="#abcdef"/></radialGradient>',
    )
  })

  it('clamps decreasing gradient stops forward without reordering colors', () => {
    const svg = renderChartSvg(
      {
        ...testScene(),
        gradients: [
          {
            type: 'radial',
            id: 'authored-order',
            stops: [
              { offset: 1, color: '#ff0000' },
              { offset: 0, color: '#0000ff' },
            ],
          },
        ],
      },
      { ariaLabel: 'Ordered gradient' },
    )

    expect(svg).toContain(
      '<stop data-ts-key="gradient:authored-order:stop:0" offset="100%" stop-color="#ff0000"/><stop data-ts-key="gradient:authored-order:stop:1" offset="100%" stop-color="#0000ff"/>',
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
