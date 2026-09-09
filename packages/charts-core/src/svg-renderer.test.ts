import { scaleLinear } from 'd3-scale'
import { describe, expect, it } from 'vitest'
import { lineY } from './line'
import { createChartScene, defineChart } from './scene'
import { renderChartSvg } from './svg'
import { withSvgRenderChildren } from './svg-render-context-internal'
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

  it('serializes right-to-left scene direction on the root SVG', () => {
    const scene = createChartScene(
      defineChart({
        marks: [lineY([1, 2, 3])],
        scales: {
          x: { scale: scaleLinear().domain([0, 2]), axis: false },
          y: {
            scale: scaleLinear().domain([0, 3]),
            side: 'right',
          },
        },
      }),
      { width: 480, height: 260 },
      { typography: { direction: 'rtl' } },
    )

    const svg = renderChartSvg(scene, { ariaLabel: 'RTL chart' })

    expect(scene.direction).toBe('rtl')
    expect(svg).toMatch(/^<svg [^>]* direction="rtl"[^>]*>/)
    expect(svg).toMatch(
      /data-ts-key="y-tick-label:[^"]+"[^>]*text-anchor="end"/,
    )
  })

  it('preserves RTL direction while rendering custom group children', () => {
    const scene: ChartScene = {
      ...testScene(),
      direction: 'rtl',
      nodes: [
        {
          kind: 'group',
          key: 'layer',
          children: [
            {
              kind: 'label',
              key: 'original',
              text: 'Original',
              x: 1,
              y: 2,
            },
          ],
        },
      ],
    }
    const options = { ariaLabel: 'RTL custom children' }
    const svg = withSvgRenderChildren(
      options,
      (group) =>
        group.key === 'layer'
          ? [
              {
                kind: 'label',
                key: 'replacement',
                text: 'Replacement',
                x: 1,
                y: 2,
              },
            ]
          : undefined,
      () => renderChartSvg(scene, options),
    )

    expect(svg).toMatch(/^<svg [^>]* direction="rtl"[^>]*>/)
    expect(svg).toContain('data-ts-key="replacement"')
    expect(svg).not.toContain('data-ts-key="original"')
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
