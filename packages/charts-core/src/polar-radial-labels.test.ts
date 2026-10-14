import { scaleLinear } from 'd3-scale'
import { describe, expect, it } from 'vitest'
import { defineChart } from './index'
import { createChartRuntime } from './runtime'
import { pie, polar, radialArc, radialLabels } from './polar'
import type { SceneLabel, SceneNode, ScenePolyline } from './types'

const browsers = [
  { name: 'Chrome', share: 64.2 },
  { name: 'Safari', share: 18.9 },
  { name: 'Edge', share: 5.4 },
  { name: 'Firefox', share: 3.1 },
  { name: 'Samsung', share: 2.4 },
  { name: 'Opera', share: 2.0 },
  { name: 'UC', share: 1.2 },
  { name: 'Yandex', share: 0.9 },
  { name: 'Vivaldi', share: 0.7 },
  { name: 'Brave', share: 0.6 },
  { name: 'Other', share: 0.6 },
]

const lineHeight = 17

function render(
  size: { width: number; height: number },
  options: { maxShift?: number } = {},
) {
  const slices = pie(browsers, { value: 'share' })
  const definition = defineChart({
    marks: [
      polar({
        radiusRatio: 0.5,
        scales: {
          angle: { scale: scaleLinear().domain([0, Math.PI * 2]) },
          radius: { scale: scaleLinear().domain([0, 1]) },
        },
        marks: [
          radialArc(slices, { key: 'name', color: 'name' }),
          radialLabels(slices, {
            id: 'labels',
            text: 'name',
            key: 'name',
            color: 'name',
            lineHeight,
            ...options,
          }),
        ],
      }),
    ],
    scales: { x: null, y: null },
    margin: 0,
  })
  const scene = createChartRuntime().render(definition, size)
  const nodes = flatten(scene.nodes)
  return {
    points: scene.points.filter((point) => point.markId === 'labels'),
    labels: nodes.filter(
      (node): node is SceneLabel =>
        node.kind === 'label' && node.key.startsWith('labels:'),
    ),
    connectors: nodes.filter(
      (node): node is ScenePolyline =>
        node.kind === 'polyline' && node.key.startsWith('labels:'),
    ),
  }
}

describe('radialLabels', () => {
  it('renders one connector and one label per visible slice', () => {
    const { labels, connectors, points } = render({ width: 640, height: 480 })

    expect(labels).toHaveLength(browsers.length)
    expect(connectors).toHaveLength(browsers.length)
    expect(points).toHaveLength(browsers.length)
    connectors.forEach((connector) => {
      expect(connector.path).toMatch(/^M[^L]+L[^L]+L[^L]+$/)
      expect(connector.style?.fill).toBe('none')
    })
  })

  it('keeps labels on the same side from overlapping', () => {
    const { labels } = render({ width: 640, height: 480 })

    for (const anchor of ['start', 'end'] as const) {
      const ys = labels
        .filter((label) => label.anchor === anchor)
        .map((label) => label.y)
        .sort((a, b) => a - b)
      ys.slice(1).forEach((y, index) => {
        expect(y - ys[index]!).toBeGreaterThanOrEqual(lineHeight - 1e-9)
      })
    }
  })

  it('hides the smallest slices first when the chart is too short', () => {
    const { labels } = render({ width: 640, height: 120 })
    const shown = labels.map((label) => label.text)

    expect(shown.length).toBeLessThan(browsers.length)
    expect(shown).toContain('Chrome')
    expect(shown).toContain('Safari')
    expect(shown).not.toContain('Other')
  })

  it('hides labels that would move too far from their slice', () => {
    const all = render({ width: 640, height: 480 }).labels
    const limited = render({ width: 640, height: 480 }, { maxShift: 8 }).labels

    expect(limited.length).toBeLessThan(all.length)
    expect(limited.map((label) => label.text)).toContain('Chrome')
  })
})

function flatten(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'group' ? [node, ...flatten(node.children)] : [node],
  )
}
