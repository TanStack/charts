import { scaleOrdinal } from 'd3-scale'
import { describe, expect, it } from 'vitest'
import { areaY } from './area'
import { areaX } from './area-x'
import { barX, barY } from './bar'
import { dot } from './dot'
import { lineY } from './line'
import { ruleY } from './rule'
import { createChartScene, defineChart } from './scene'
import { bandXAxes, bandYAxes, linearAxes } from './test-scales'
import type { SceneArea, SceneNode, SceneRect, SceneRule } from './types'

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

  it('colors individual marks without changing their z groups', () => {
    const data = [
      { id: 'a', series: 'Shared', color: 'Warm', x: 0, y: 1 },
      { id: 'b', series: 'Shared', color: 'Cool', x: 1, y: 2 },
    ]
    const scene = createChartScene(
      defineChart({
        marks: [
          dot(data, {
            x: 'x',
            y: 'y',
            z: 'series',
            color: 'color',
            key: 'id',
          }),
        ],
        ...linearAxes([0, 1], [0, 2]),
        color: { scale: semanticColors() },
      }),
      { width: 480, height: 260 },
    )

    expect(scene.colors.domain).toEqual(['Warm', 'Cool'])
    expect(scene.points.map((point) => point.group)).toEqual([
      'Shared',
      'Shared',
    ])
    expect(scene.points.map((point) => point.color)).toEqual([
      '#dc2626',
      '#2563eb',
    ])
    expect(dotFills(scene.nodes)).toEqual(['#dc2626', '#2563eb'])
  })

  it('colors grouped paths independently from their z groups', () => {
    const data = [
      { id: 'a:0', series: 'Alpha', color: 'Warm', x: 0, y: 1 },
      { id: 'a:1', series: 'Alpha', color: 'Warm', x: 1, y: 2 },
      { id: 'b:0', series: 'Beta', color: 'Cool', x: 0, y: 2 },
      { id: 'b:1', series: 'Beta', color: 'Cool', x: 1, y: 1 },
    ]
    const scene = createChartScene(
      defineChart({
        marks: [
          lineY(data, {
            x: 'x',
            y: 'y',
            z: 'series',
            color: 'color',
            key: 'id',
          }),
        ],
        ...linearAxes([0, 1], [0, 2]),
        color: { scale: semanticColors() },
      }),
      { width: 480, height: 260 },
    )

    expect(scene.colors.domain).toEqual(['Warm', 'Cool'])
    expect(scene.points.map((point) => point.group)).toEqual([
      'Alpha',
      'Alpha',
      'Beta',
      'Beta',
    ])
    expect(scene.points.map((point) => point.color)).toEqual([
      '#dc2626',
      '#dc2626',
      '#2563eb',
      '#2563eb',
    ])
    expect(lineStrokes(scene.nodes)).toEqual(['#dc2626', '#2563eb'])
  })

  it('uses color as the connected-path group when z is omitted', () => {
    const data = [
      { id: 'a:0', series: 'Alpha', position: 0, value: 1 },
      { id: 'b:0', series: 'Beta', position: 0, value: 2 },
      { id: 'a:1', series: 'Alpha', position: 1, value: 2 },
      { id: 'b:1', series: 'Beta', position: 1, value: 1 },
    ]
    const line = createChartScene(
      defineChart({
        marks: [
          lineY(data, {
            x: 'position',
            y: 'value',
            color: 'series',
          }),
        ],
        ...linearAxes([0, 1], [0, 2]),
        color: { scale: fallbackColors() },
      }),
      { width: 480, height: 260 },
    )
    const verticalArea = createChartScene(
      defineChart({
        marks: [
          areaY(data, {
            x: 'position',
            y: 'value',
            color: 'series',
          }),
        ],
        ...linearAxes([0, 1], [0, 2]),
        color: { scale: fallbackColors() },
      }),
      { width: 480, height: 260 },
    )
    const horizontalArea = createChartScene(
      defineChart({
        marks: [
          areaX(data, {
            x: 'value',
            y: 'position',
            color: 'series',
          }),
        ],
        ...linearAxes([0, 2], [0, 1]),
        color: { scale: fallbackColors() },
      }),
      { width: 480, height: 260 },
    )

    for (const scene of [line, verticalArea, horizontalArea]) {
      expect(scene.points.map((point) => point.group)).toEqual([
        'Alpha',
        'Alpha',
        'Beta',
        'Beta',
      ])
    }
    expect(lineStrokes(line.nodes)).toEqual(['#dc2626', '#2563eb'])
    expect(areaFills(verticalArea.nodes)).toEqual(['#dc2626', '#2563eb'])
    expect(areaFills(horizontalArea.nodes)).toEqual(['#dc2626', '#2563eb'])
  })

  it('keeps null and empty-string line groups distinct', () => {
    const rows = [
      { id: 'none:0', series: null as string | null, x: 0, y: 1 },
      { id: 'empty:0', series: '', x: 0, y: 3 },
      { id: 'none:1', series: null as string | null, x: 1, y: 2 },
      { id: 'empty:1', series: '', x: 1, y: 4 },
    ]
    const scene = createChartScene(
      defineChart({
        marks: [lineY(rows, { x: 'x', y: 'y', z: 'series' })],
        ...linearAxes([0, 1], [0, 4]),
      }),
      { width: 480, height: 260 },
    )

    expect(lineStrokes(scene.nodes)).toHaveLength(2)
    expect(scene.points.map((point) => point.group)).toEqual([
      null,
      null,
      '',
      '',
    ])
    expect(new Set(scene.points.map((point) => point.key)).size).toBe(4)
  })

  it('routes rule color through the shared scale', () => {
    const data = [
      { value: 1, status: 'Warm' },
      { value: 2, status: 'Cool' },
    ]
    const scene = createChartScene(
      defineChart({
        marks: [ruleY(data, { y: 'value', color: 'status' })],
        y: linearAxes([0, 1], [0, 3]).y,
        color: { scale: semanticColors() },
      }),
      { width: 480, height: 260 },
    )

    expect(scene.colors.domain).toEqual(['Warm', 'Cool'])
    expect(ruleStrokes(scene.nodes)).toEqual(['#dc2626', '#2563eb'])
  })
})

function fallbackColors() {
  return scaleOrdinal<string, string>()
    .domain(['Alpha', 'Beta'])
    .range(['#dc2626', '#2563eb'])
}

function semanticColors() {
  return scaleOrdinal<string, string>()
    .domain(['Warm', 'Cool'])
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

function dotFills(nodes: readonly SceneNode[]): (string | undefined)[] {
  return flatten(nodes)
    .filter((node) => node.kind === 'dot')
    .map((node) => node.style?.fill)
}

function lineStrokes(nodes: readonly SceneNode[]): (string | undefined)[] {
  return flatten(nodes)
    .filter((node) => node.kind === 'polyline')
    .map((node) => node.style?.stroke)
}

function ruleStrokes(nodes: readonly SceneNode[]): (string | undefined)[] {
  return flatten(nodes)
    .filter(
      (node): node is SceneRule =>
        node.kind === 'rule' && node.key.startsWith('rule-y-'),
    )
    .map((node) => node.style?.stroke)
}

function flatten(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'group'
      ? node.focus
        ? [node]
        : [node, ...flatten(node.children)]
      : [node],
  )
}
