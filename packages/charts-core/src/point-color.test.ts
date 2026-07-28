import { scaleOrdinal } from 'd3-scale'
import { describe, expect, it } from 'vitest'
import { areaY } from './area'
import { areaX } from './area-x'
import { barX, barY } from './bar'
import { createChartScene, defineChart } from './scene'
import { bandXAxes, bandYAxes, linearAxes } from './test-scales'
import type { SceneArea, SceneNode, SceneRect } from './types'

describe('mark point colors', () => {
  it('uses each bar fill instead of the ordinal fallback', () => {
    const data = [
      { id: 'a', category: 'Alpha', value: 12, fill: '#fb7185' },
      { id: 'b', category: 'Beta', value: 18, fill: '#38bdf8' },
    ]
    const vertical = createChartScene(
      defineChart({
        marks: [
          barY(data, {
            x: 'category',
            y: 'value',
            z: 'category',
            key: 'id',
            fill: '#f59e0b',
          }),
        ],
        ...bandXAxes(['Alpha', 'Beta'], [0, 18]),
        color: { scale: fallbackColors() },
      }),
      { width: 480, height: 260 },
    )
    const horizontal = createChartScene(
      defineChart({
        marks: [
          barX(data, {
            x: 'value',
            y: 'category',
            z: 'category',
            key: 'id',
            fill: (datum) => datum.fill,
          }),
        ],
        ...bandYAxes([0, 18], ['Alpha', 'Beta']),
        color: { scale: fallbackColors() },
      }),
      { width: 480, height: 260 },
    )

    expect(rectFills(vertical.nodes)).toEqual(['#f59e0b', '#f59e0b'])
    expect(vertical.points.map((point) => point.color)).toEqual([
      '#f59e0b',
      '#f59e0b',
    ])
    expect(rectFills(horizontal.nodes)).toEqual(data.map((datum) => datum.fill))
    expect(horizontal.points.map((point) => point.color)).toEqual(
      data.map((datum) => datum.fill),
    )
  })

  it('uses each area fill instead of the ordinal fallback', () => {
    const data = [
      { id: 'a:1', series: 'Alpha', position: 1, value: 12, fill: '#a78bfa' },
      { id: 'a:2', series: 'Alpha', position: 2, value: 18, fill: '#a78bfa' },
      { id: 'b:1', series: 'Beta', position: 1, value: 8, fill: '#2dd4bf' },
      { id: 'b:2', series: 'Beta', position: 2, value: 14, fill: '#2dd4bf' },
    ]
    const vertical = createChartScene(
      defineChart({
        marks: [
          areaY(data, {
            x: 'position',
            y: 'value',
            z: 'series',
            key: 'id',
            fill: (datum) => datum.fill,
          }),
        ],
        ...linearAxes([0, 3], [0, 20]),
        color: { scale: fallbackColors() },
      }),
      { width: 480, height: 260 },
    )
    const horizontal = createChartScene(
      defineChart({
        marks: [
          areaX(data, {
            x: 'value',
            y: 'position',
            z: 'series',
            key: 'id',
            fill: '#22c55e',
          }),
        ],
        ...linearAxes([0, 20], [0, 3]),
        color: { scale: fallbackColors() },
      }),
      { width: 480, height: 260 },
    )

    expect(areaFills(vertical.nodes)).toEqual(['#a78bfa', '#2dd4bf'])
    expect(vertical.points.map((point) => point.color)).toEqual([
      '#a78bfa',
      '#a78bfa',
      '#2dd4bf',
      '#2dd4bf',
    ])
    expect(areaFills(horizontal.nodes)).toEqual(['#22c55e', '#22c55e'])
    expect(horizontal.points.map((point) => point.color)).toEqual([
      '#22c55e',
      '#22c55e',
      '#22c55e',
      '#22c55e',
    ])
  })
})

function fallbackColors() {
  return scaleOrdinal<string, string>()
    .domain(['Alpha', 'Beta'])
    .range(['#dc2626', '#2563eb'])
}

function rectFills(nodes: readonly SceneNode[]): (string | undefined)[] {
  return flatten(nodes)
    .filter((node): node is SceneRect => node.kind === 'rect')
    .map((node) => node.style?.fill)
}

function areaFills(nodes: readonly SceneNode[]): (string | undefined)[] {
  return flatten(nodes)
    .filter((node): node is SceneArea => node.kind === 'area')
    .map((node) => node.style?.fill)
}

function flatten(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'group' ? [node, ...flatten(node.children)] : [node],
  )
}
