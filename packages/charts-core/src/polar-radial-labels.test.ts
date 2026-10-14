import { scaleLinear } from 'd3-scale'
import { describe, expect, it } from 'vitest'
import { defineChart } from './index'
import { createChartRuntime } from './runtime'
import { estimateSceneText, measureSceneLabelBounds } from './guide-layout'
import { pie, polar, radialArc, radialLabels } from './polar'
import type { SceneLabel, SceneNode, ScenePolyline } from './types'

interface Row {
  name: string
  share: number
}

const browsers: readonly Row[] = [
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
  options: { maxShift?: number; rows?: readonly Row[] } = {},
) {
  const { rows = browsers, ...labelOptions } = options
  const slices = pie(rows, { value: 'share' })
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
            ...labelOptions,
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
    scene,
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

  it('keeps every visible label inside a narrow chart', () => {
    const size = { width: 220, height: 480 }
    const { scene, labels } = render(size)
    const centerX = scene.chart.x + scene.chart.width / 2

    expect(labels.length).toBeLessThan(browsers.length)
    labels.forEach((label) => {
      const bounds = measureSceneLabelBounds(label, estimateSceneText)
      expect(centerX + bounds.x).toBeGreaterThanOrEqual(-1e-9)
      expect(centerX + bounds.x + bounds.width).toBeLessThanOrEqual(
        size.width + 1e-9,
      )
    })
  })

  it('shows more labels again when a narrow chart grows', () => {
    const narrow = render({ width: 220, height: 480 }).labels
    const wide = render({ width: 640, height: 480 }).labels

    expect(wide.length).toBeGreaterThan(narrow.length)
    expect(narrow.map((label) => label.key)).toEqual(
      wide
        .filter((label) => narrow.some(({ key }) => key === label.key))
        .map((label) => label.key),
    )
  })

  it('hides a long label but keeps short labels on the same chart', () => {
    const rows = browsers.map((row) =>
      row.name === 'Safari'
        ? { ...row, name: 'Safari (all Apple devices, desktop and mobile)' }
        : row,
    )
    const shown = render({ width: 360, height: 480 }, { rows }).labels.map(
      (label) => label.text,
    )

    expect(shown).not.toContain(rows[1]!.name)
    expect(shown).toContain('Chrome')
    expect(shown).toContain('Edge')
  })

  it('removes the label, connector, and point of a label hidden by maxShift', () => {
    const all = render({ width: 640, height: 480 })
    const limited = render({ width: 640, height: 480 }, { maxShift: 8 })
    const hidden = all.labels
      .map((label) => label.key)
      .filter((key) => !limited.labels.some((label) => label.key === key))

    expect(hidden.length).toBeGreaterThan(0)
    expect(limited.labels.map((label) => label.text)).toContain('Chrome')
    for (const key of hidden) {
      expect(limited.connectors.some((node) => node.key.startsWith(key))).toBe(
        false,
      )
      expect(limited.points.some((point) => point.key === key)).toBe(false)
    }
    expect(limited.connectors).toHaveLength(limited.labels.length)
    expect(limited.points).toHaveLength(limited.labels.length)
  })

  it('keys labels and connectors by datum key across renders and data changes', () => {
    const first = render({ width: 640, height: 480 })
    const changed = render(
      { width: 640, height: 480 },
      {
        rows: browsers.map((row) =>
          row.name === 'Edge' ? { ...row, share: 9 } : row,
        ),
      },
    )
    const keys = (labels: readonly SceneLabel[]) =>
      labels.map((label) => label.key).sort()

    expect(keys(changed.labels)).toEqual(keys(first.labels))
    first.labels.forEach((label) => {
      expect(label.key).toMatch(/^labels:.+:.+$/)
      expect(
        first.connectors.some((node) => node.key === `${label.key}:connector`),
      ).toBe(true)
    })
  })
})

function flatten(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'group' ? [node, ...flatten(node.children)] : [node],
  )
}
