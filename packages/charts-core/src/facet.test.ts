import { describe, expect, it } from 'vitest'
import { scaleLinear } from 'd3-scale'
import { facetChart } from './facet'
import { lineY } from './line'
import { createMark } from './mark'
import { createChartScene } from './scene'
import { renderChartSvg } from './svg'
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
            label: 'Horizontal',
          },
          y: {
            scale: scaleLinear().domain([0, 6]),
            label: 'Vertical',
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
        chart: (group, key) => ({
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
