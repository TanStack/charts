import { describe, expect, it } from 'vitest'
import { scaleBand, scaleLinear } from 'd3-scale'
import { bandX, bandY } from './band'
import { barY } from './bar'
import { facet, facetChart } from './facet'
import { whenFocused } from './focus-mark'
import { measureSceneLabelBounds } from './guide-layout'
import { lineY } from './line'
import { createMark } from './mark'
import { ruleX } from './rule'
import { createChartScene } from './scene'
import { renderChartSvg } from './svg'
import { svgChartRenderer } from './svg-surface'
import { linearAxes } from './test-scales'
import type { SceneNode } from './types'

describe('facets', () => {
  it('lays out independently rendered groups and offsets interaction points', () => {
    const data = [
      { id: 'a', group: 'Alpha', x: 0, y: 2 },
      { id: 'b', group: 'Alpha', x: 1, y: 4 },
      { id: 'c', group: 'Beta', x: 0, y: 3 },
      { id: 'd', group: 'Beta', x: 1, y: 6 },
    ]
    const definition = facetChart(data, {
      by: 'group',
      minWidth: 240,
      chart: (group) => ({
        marks: [lineY(group, { x: 'x', y: 'y', key: 'id' })],
        ...linearAxes([0, 1], [0, 6]),
      }),
    })
    const scene = createChartScene(definition, { width: 640, height: 260 })
    const facetCells = flatten(scene.nodes).filter((node) =>
      node.key.startsWith('facet-0:string:'),
    )
    const svg = renderChartSvg(scene, { ariaLabel: 'Faceted trends' })

    expect(scene.nodes.some((node) => node.key === 'axes')).toBe(false)
    expect(
      facetCells.filter(
        (node) =>
          node.kind === 'group' && node.className === 'ts-chart__facet-cell',
      ),
    ).toHaveLength(2)
    expect(scene.points).toHaveLength(4)
    expect(new Set(scene.points.map((point) => point.key)).size).toBe(4)
    expect(
      flatten(scene.nodes).filter(
        (node) =>
          node.kind === 'group' &&
          node.className?.includes('ts-chart__focus-layer--default'),
      ),
    ).toHaveLength(1)
    expect(scene.points[2]?.x).toBeGreaterThan(scene.points[0]?.x ?? 0)
    expect(svg).toContain('transform="translate(')
    expect(svg).toContain('Alpha')
    expect(svg).toContain('Beta')
  })

  it('stacks panels when the available width is narrow', () => {
    const data = [
      { group: 'A', value: 1 },
      { group: 'B', value: 2 },
    ]
    const scene = createChartScene(
      facetChart(data, {
        by: 'group',
        minWidth: 220,
        chart: (group) => ({
          marks: [lineY(group, { y: 'value' })],
          ...linearAxes([0, 1], [0, 2]),
        }),
      }),
      { width: 360, height: 500 },
    )
    const cells = flatten(scene.nodes).filter(
      (node) =>
        node.kind === 'group' && node.className === 'ts-chart__facet-cell',
    )

    expect(cells).toHaveLength(2)
    if (cells[0]?.kind !== 'group' || cells[1]?.kind !== 'group') {
      throw new Error('Expected facet groups')
    }
    expect(cells[0].translateX).toBe(cells[1].translateX)
    expect(cells[1].translateY).toBeGreaterThan(cells[0].translateY ?? 0)
    expect(
      flatten(scene.nodes).filter(
        (node) =>
          node.kind === 'group' &&
          node.className?.includes('ts-chart__facet-axis--y'),
      ),
    ).toHaveLength(2)
    expect(
      flatten(scene.nodes).filter(
        (node) =>
          node.kind === 'group' &&
          node.className?.includes('ts-chart__facet-axis--x'),
      ),
    ).toHaveLength(1)
  })

  it('owns shared axes at the outer facet edges with aligned plot bounds', () => {
    const data = [
      { group: 'A', x: 0, y: 2 },
      { group: 'A', x: 1, y: 4 },
      { group: 'B', x: 0, y: 3 },
      { group: 'B', x: 1, y: 6 },
    ]
    const scene = createChartScene(
      facetChart(data, {
        by: 'group',
        columns: 2,
        chart: (group) => ({
          marks: [lineY(group, { x: 'x', y: 'y' })],
          x: {
            scale: scaleLinear().domain([0, 1]),
            axis: { label: 'Horizontal' },
          },
          y: {
            scale: scaleLinear().domain([0, 6]),
            axis: { label: 'Vertical' },
          },
        }),
      }),
      { width: 640, height: 260 },
    )
    const nodes = flatten(scene.nodes)
    const yAxes = nodes.filter(
      (node) =>
        node.kind === 'group' &&
        node.className?.includes('ts-chart__facet-axis--y'),
    )
    const xAxes = nodes.filter(
      (node) =>
        node.kind === 'group' &&
        node.className?.includes('ts-chart__facet-axis--x'),
    )
    const yLabels = nodes.filter(
      (node) => node.kind === 'label' && node.key.startsWith('y-tick-label:'),
    )
    const aPoints = scene.points.filter((point) => point.datum.group === 'A')
    const bPoints = scene.points.filter((point) => point.datum.group === 'B')

    expect(yAxes).toHaveLength(1)
    expect(xAxes).toHaveLength(2)
    expect(nodes.filter((node) => node.key === 'facet-0:x-label')).toHaveLength(
      1,
    )
    expect(nodes.filter((node) => node.key === 'facet-0:y-label')).toHaveLength(
      1,
    )
    expect(yLabels).toHaveLength(
      new Set(yLabels.map((node) => (node.kind === 'label' ? node.text : '')))
        .size,
    )
    expect((aPoints[1]?.x ?? 0) - (aPoints[0]?.x ?? 0)).toBeCloseTo(
      (bPoints[1]?.x ?? 0) - (bPoints[0]?.x ?? 0),
    )
  })

  it('places shared guides on every outer edge of a multi-row grid', () => {
    const data = ['A', 'B', 'C', 'D'].flatMap((group, groupIndex) => [
      { id: `${group}:0`, group, x: 0, y: groupIndex + 1 },
      { id: `${group}:1`, group, x: 1, y: groupIndex + 2 },
    ])
    const scene = createChartScene(
      facetChart(data, {
        by: 'group',
        columns: 2,
        chart: (group) => ({
          marks: [lineY(group, { x: 'x', y: 'y', key: 'id' })],
          x: {
            scale: scaleLinear().domain([0, 1]),
            axis: { label: 'Horizontal' },
          },
          y: {
            scale: scaleLinear().domain([0, 6]),
            axis: { label: 'Vertical' },
          },
        }),
      }),
      { width: 720, height: 480 },
    )
    const nodes = flatten(scene.nodes)
    const cells = nodes.filter(
      (node) =>
        node.kind === 'group' && node.className === 'ts-chart__facet-cell',
    )
    const yAxes = nodes.filter(
      (node): node is Extract<SceneNode, { kind: 'group' }> =>
        node.kind === 'group' &&
        node.className?.includes('ts-chart__facet-axis--y') === true,
    )
    const xAxes = nodes.filter(
      (node): node is Extract<SceneNode, { kind: 'group' }> =>
        node.kind === 'group' &&
        node.className?.includes('ts-chart__facet-axis--x') === true,
    )
    const pointSpans = ['A', 'B', 'C', 'D'].map((group) => {
      const points = scene.points.filter((point) => point.datum.group === group)
      return (points[1]?.x ?? 0) - (points[0]?.x ?? 0)
    })

    expect(cells).toHaveLength(4)
    expect(yAxes).toHaveLength(2)
    expect(xAxes).toHaveLength(2)
    expect(new Set(yAxes.map((axis) => axis.translateY))).toHaveLength(2)
    expect(new Set(xAxes.map((axis) => axis.translateX))).toHaveLength(2)
    expect(nodes.filter((node) => node.key === 'facet-0:x-label')).toHaveLength(
      1,
    )
    expect(nodes.filter((node) => node.key === 'facet-0:y-label')).toHaveLength(
      1,
    )
    expect(pointSpans.every((span) => span === pointSpans[0])).toBe(true)
  })

  it('remeasures shared outer axes after responsive tick thinning', () => {
    const data = ['A', 'B', 'C', 'D'].flatMap((group) => [
      { group, x: 3, y: 2 },
      { group, x: 20, y: 14 },
    ])
    const measureText = (
      text: string,
      options: { fontSize: number; anchor: 'start' | 'middle' | 'end' },
    ) => {
      const width = text.length * options.fontSize * 0.64
      return {
        x:
          options.anchor === 'middle'
            ? -width / 2
            : options.anchor === 'end'
              ? -width
              : 0,
        y: -options.fontSize * 0.8,
        width,
        height: options.fontSize,
      }
    }
    const scene = createChartScene(
      facetChart(data, {
        by: 'group',
        columns: 4,
        gap: 12,
        chart: (group) => ({
          marks: [lineY(group, { x: 'x', y: 'y' })],
          x: {
            scale: scaleLinear().domain([3, 20]),
            axis: { ticks: { count: 5 } },
          },
          y: {
            scale: scaleLinear().domain([2, 14]),
            axis: { ticks: { count: 4 } },
          },
        }),
      }),
      { width: 320, height: 360 },
      { measureText },
    )
    const labels = translatedLabels(scene.nodes)
      .filter(({ label }) => label.key.startsWith('x-tick-label:'))
      .map(({ label, x, y }) =>
        measureSceneLabelBounds(
          { ...label, x: label.x + x, y: label.y + y },
          measureText,
        ),
      )

    expect(labels.length).toBeGreaterThan(0)
    expect(
      Math.min(...labels.map((bounds) => bounds.x)),
    ).toBeGreaterThanOrEqual(0)
    expect(
      Math.max(...labels.map((bounds) => bounds.x + bounds.width)),
    ).toBeLessThanOrEqual(320)
  })

  it('composes nested facets with unique points and responsive outer flow', () => {
    const data = ['North', 'South'].flatMap((region) =>
      ['A', 'B'].flatMap((series, seriesIndex) => [
        {
          id: `${region}:${series}:0`,
          region,
          series,
          x: 0,
          y: seriesIndex + 1,
        },
        {
          id: `${region}:${series}:1`,
          region,
          series,
          x: 1,
          y: seriesIndex + 2,
        },
      ]),
    )
    const definition = facetChart(data, {
      id: 'region',
      by: 'region',
      minWidth: 280,
      axes: 'cell',
      chart: (regionRows) => ({
        marks: [
          facet(regionRows, {
            id: 'series',
            by: 'series',
            columns: 1,
            axes: 'cell',
            chart: (seriesRows) => ({
              marks: [lineY(seriesRows, { x: 'x', y: 'y', key: 'id' })],
              ...linearAxes([0, 1], [0, 3]),
            }),
          }),
        ],
        guides: false,
        margin: 0,
        x: null,
        y: null,
      }),
    })
    const wide = createChartScene(definition, { width: 720, height: 520 })
    const narrow = createChartScene(definition, { width: 320, height: 520 })
    const wideCells = directFacetCells(wide.nodes, 'region')
    const narrowCells = directFacetCells(narrow.nodes, 'region')
    const nestedLabels = flatten(wide.nodes)
      .filter((node) => node.kind === 'label')
      .map((node) => node.text)

    expect(wide.points).toHaveLength(data.length)
    expect(new Set(wide.points.map((point) => point.key))).toHaveLength(
      data.length,
    )
    expect(new Set(narrow.points.map((point) => point.key))).toHaveLength(
      data.length,
    )
    expect(wideCells).toHaveLength(2)
    expect(narrowCells).toHaveLength(2)
    expect(wideCells[1]?.translateX).toBeGreaterThan(
      wideCells[0]?.translateX ?? 0,
    )
    expect(wideCells[1]?.translateY).toBe(wideCells[0]?.translateY)
    expect(narrowCells[1]?.translateX).toBe(narrowCells[0]?.translateX)
    expect(narrowCells[1]?.translateY).toBeGreaterThan(
      narrowCells[0]?.translateY ?? 0,
    )
    expect(nestedLabels).toEqual(
      expect.arrayContaining(['North', 'South', 'A', 'B']),
    )
  })

  it('paints one primary marker when facet points share every channel value', () => {
    const data = ['North', 'South'].flatMap((panel) =>
      [72, 88].map((value, x) => ({ panel, x, value })),
    )
    const scene = createChartScene(
      facetChart(data, {
        by: 'panel',
        columns: 2,
        axes: 'cell',
        chart: (rows) => ({
          marks: [barY(rows, { x: 'x', y: 'value' })],
          x: { scale: scaleBand<number>().domain([0, 1]) },
          y: { scale: scaleLinear().domain([0, 100]) },
          guides: false,
          margin: 0,
        }),
      }),
      { width: 640, height: 260 },
    )
    const focusLayers = flatten(scene.nodes).filter(
      (node) => node.kind === 'group' && node.focus,
    )
    const primary = scene.points.find(
      (point) => point.datum.panel === 'North' && point.datum.x === 1,
    )
    expect(primary).toBeDefined()
    expect(focusLayers).toHaveLength(1)
    if (!primary) return

    const container = document.createElement('div')
    const surface = svgChartRenderer.mount(container, () => {})
    surface.render(scene, { ariaLabel: 'Default faceted focus' })
    surface.paintFocus({
      primary,
      group: [primary],
      source: 'pointer',
      pinned: false,
    })

    const visibleLayers = [
      ...container.querySelectorAll<SVGGElement>(
        '[data-ts-focus-layer][visibility="visible"]',
      ),
    ]
    const visibleMarkers = visibleLayers.flatMap((layer) =>
      [...layer.querySelectorAll<SVGElement>('[visibility="visible"]')].filter(
        (node) => node.matches('circle, rect'),
      ),
    )
    expect(visibleLayers).toHaveLength(1)
    expect(visibleMarkers).toHaveLength(1)
    expect(visibleMarkers[0]?.dataset.tsKey).toContain('string:North')
    surface.destroy()
  })

  it('synchronizes facet cursors only through an explicit x focus mark', () => {
    const data = ['North', 'South'].flatMap((panel) =>
      [72, 88].map((value, x) => ({ panel, x, value })),
    )
    const scene = createChartScene(
      facetChart(data, {
        by: 'panel',
        columns: 2,
        axes: 'cell',
        chart: (rows) => ({
          marks: [
            whenFocused(
              bandX(rows, {
                x: 'x',
                fill: '#d4d4d4',
                inset: 4,
              }),
              { match: 'x' },
            ),
            barY(rows, { x: 'x', y: 'value' }),
          ],
          x: { scale: scaleBand<number>().domain([0, 1]) },
          y: { scale: scaleLinear().domain([0, 100]) },
          guides: false,
          margin: 0,
        }),
      }),
      { width: 640, height: 260 },
    )
    const primary = scene.points.find(
      (point) => point.datum.panel === 'North' && point.datum.x === 1,
    )
    expect(primary).toBeDefined()
    if (!primary) return

    const container = document.createElement('div')
    const surface = svgChartRenderer.mount(container, () => {})
    surface.render(scene, { ariaLabel: 'Synchronized faceted focus' })
    surface.paintFocus({
      primary,
      group: [primary],
      source: 'pointer',
      pinned: false,
    })

    const visibleLayers = [
      ...container.querySelectorAll<SVGGElement>(
        '[data-ts-focus-layer][visibility="visible"]',
      ),
    ]
    const visibleBands = visibleLayers.flatMap((layer) => [
      ...layer.querySelectorAll<SVGRectElement>('rect[visibility="visible"]'),
    ])
    expect(visibleLayers).toHaveLength(3)
    expect(visibleBands).toHaveLength(2)
    expect(
      new Set(visibleBands.map((band) => band.getAttribute('x'))).size,
    ).toBe(1)
    surface.destroy()
  })

  it('prefixes focus-only rule anchors when synchronizing facets', () => {
    const data = ['North', 'South'].flatMap((panel) =>
      [72, 88].map((value, x) => ({ panel, x, value })),
    )
    const scene = createChartScene(
      facetChart(data, {
        by: 'panel',
        columns: 2,
        axes: 'cell',
        chart: (rows) => ({
          marks: [
            whenFocused(ruleX(rows, { id: 'cursor', x: 'x' }), {
              match: 'x',
            }),
            barY(rows, { x: 'x', y: 'value' }),
          ],
          x: { scale: scaleBand<number>().domain([0, 1]) },
          y: { scale: scaleLinear().domain([0, 100]) },
          guides: false,
          margin: 0,
        }),
      }),
      { width: 640, height: 260 },
    )
    const primary = scene.points.find(
      (point) => point.datum.panel === 'North' && point.datum.x === 1,
    )
    expect(primary).toBeDefined()
    if (!primary) return

    const container = document.createElement('div')
    const surface = svgChartRenderer.mount(container, () => {})
    surface.render(scene, { ariaLabel: 'Synchronized faceted rules' })
    surface.paintFocus({
      primary,
      group: [primary],
      source: 'keyboard',
      pinned: false,
    })

    const visibleRules = [
      ...container.querySelectorAll<SVGLineElement>(
        '.ts-chart__rule-x line[visibility="visible"]',
      ),
    ]
    expect(visibleRules).toHaveLength(2)
    expect(
      new Set(visibleRules.map((rule) => rule.getAttribute('x1'))).size,
    ).toBe(1)
    expect(
      visibleRules.every(
        (rule) => rule.getAttribute('x1') === rule.getAttribute('x2'),
      ),
    ).toBe(true)
    surface.destroy()
  })

  it('synchronizes facet cursors only through an explicit y focus mark', () => {
    const data = ['North', 'South'].flatMap((panel) =>
      [72, 88].map((value, x) => ({ panel, x, value })),
    )
    const scene = createChartScene(
      facetChart(data, {
        by: 'panel',
        columns: 2,
        axes: 'cell',
        chart: (rows) => ({
          marks: [
            whenFocused(
              bandY(rows, {
                y: 'value',
                fill: '#d4d4d4',
                inset: -4,
              }),
              { match: 'y' },
            ),
            barY(rows, { x: 'x', y: 'value' }),
          ],
          x: { scale: scaleBand<number>().domain([0, 1]) },
          y: { scale: scaleLinear().domain([0, 100]) },
          guides: false,
          margin: 0,
        }),
      }),
      { width: 640, height: 260 },
    )
    const primary = scene.points.find(
      (point) => point.datum.panel === 'North' && point.datum.value === 88,
    )
    expect(primary).toBeDefined()
    if (!primary) return

    const container = document.createElement('div')
    const surface = svgChartRenderer.mount(container, () => {})
    surface.render(scene, { ariaLabel: 'Y-synchronized faceted focus' })
    surface.paintFocus({
      primary,
      group: [primary],
      source: 'pointer',
      pinned: false,
    })

    const visibleLayers = [
      ...container.querySelectorAll<SVGGElement>(
        '[data-ts-focus-layer][visibility="visible"]',
      ),
    ]
    const visibleBands = visibleLayers.flatMap((layer) => [
      ...layer.querySelectorAll<SVGRectElement>('rect[visibility="visible"]'),
    ])
    expect(visibleLayers).toHaveLength(3)
    expect(visibleBands).toHaveLength(2)
    expect(
      visibleBands.every((band) => Number(band.getAttribute('height')) > 0),
    ).toBe(true)
    expect(
      new Set(visibleBands.map((band) => band.getAttribute('y'))).size,
    ).toBe(1)
    surface.destroy()
  })

  it('retains complete cell axes when independent scales are explicit', () => {
    const data = [
      { group: 'A', value: 1 },
      { group: 'B', value: 20 },
    ]
    const definition = (axes: 'outer' | 'cell') =>
      facetChart(data, {
        by: 'group',
        columns: 2,
        axes,
        chart: (group, { key }) => ({
          marks: [lineY(group, { y: 'value' })],
          x: { scale: scaleLinear().domain([0, 1]) },
          y: {
            scale: scaleLinear().domain(key === 'A' ? [0, 2] : [0, 20]),
          },
        }),
      })

    expect(() =>
      createChartScene(definition('outer'), { width: 640, height: 260 }),
    ).toThrow(/use axes: "cell" for independent scales/)

    const scene = createChartScene(definition('cell'), {
      width: 640,
      height: 260,
    })
    const axes = flatten(scene.nodes).filter(
      (node) => node.kind === 'group' && node.className === 'ts-chart__axes',
    )
    expect(axes).toHaveLength(2)
  })

  it('does not render data marks during the outer-guide prepass', () => {
    const data = [
      { group: 'A', value: 1 },
      { group: 'B', value: 2 },
    ]
    let renders = 0
    const counted = createMark(() => ({
      id: 'counted',
      channels: {},
      render: () => {
        renders += 1
        return { nodes: [] }
      },
    }))

    createChartScene(
      facetChart(data, {
        by: 'group',
        columns: 2,
        chart: (group) => ({
          marks: [lineY(group, { y: 'value' }), counted],
          ...linearAxes([0, 1], [0, 2]),
        }),
      }),
      { width: 640, height: 260 },
    )

    expect(renders).toBe(2)
  })

  it('identifies the facet cell when a nested scale contract is invalid', () => {
    expect(() =>
      createChartScene(
        facetChart([{ group: 'A', value: 1 }], {
          by: 'group',
          chart: (group) => ({
            marks: [lineY(group, { y: 'value' })],
            x: null,
            y: { scale: scaleLinear().domain([0, 1]) },
          }),
        }),
        { width: 360, height: 260 },
      ),
    ).toThrow(/Facet "facet-0" cell "A".*cannot be null/)
  })
})

function flatten(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'group' ? [node, ...flatten(node.children)] : [node],
  )
}

function translatedLabels(
  nodes: readonly SceneNode[],
  x = 0,
  y = 0,
): {
  label: Extract<SceneNode, { kind: 'label' }>
  x: number
  y: number
}[] {
  return nodes.flatMap((node) => {
    if (node.kind === 'label') return [{ label: node, x, y }]
    if (node.kind !== 'group') return []
    return translatedLabels(
      node.children,
      x + (node.translateX ?? 0),
      y + (node.translateY ?? 0),
    )
  })
}

function directFacetCells(
  nodes: readonly SceneNode[],
  facetId: string,
): Extract<SceneNode, { kind: 'group' }>[] {
  const root = findGroup(nodes, facetId)
  if (!root) return []
  return root.children.filter(
    (node): node is Extract<SceneNode, { kind: 'group' }> =>
      node.kind === 'group' && node.className === 'ts-chart__facet-cell',
  )
}

function findGroup(
  nodes: readonly SceneNode[],
  key: string,
): Extract<SceneNode, { kind: 'group' }> | undefined {
  for (const node of nodes) {
    if (node.kind !== 'group') continue
    if (node.key === key) return node
    const nested = findGroup(node.children, key)
    if (nested) return nested
  }
  return undefined
}
