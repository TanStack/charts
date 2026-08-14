import { scaleBand, scaleLinear } from 'd3-scale'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { barY } from './bar'
import { dot } from './dot'
import { createMark } from './mark'
import { compositeMark } from './mark-composite'
import { createChartScene, defineChart } from './scene'
import { tickY } from './tick'
import type { ChartDefinition, ChartMotionContext, SceneNode } from './types'

interface Row {
  id: string
  category: string
  value: number
}

const rows: readonly Row[] = [
  { id: 'a', category: 'A', value: 2 },
  { id: 'b', category: 'B', value: 5 },
]

describe('compositeMark', () => {
  it('merges semantic channels and namespaces child scenes and points', () => {
    const mark = compositeMark(
      [
        barY(rows, {
          id: 'bars',
          x: 'category',
          y: 'value',
          key: 'id',
          fill: '#2563eb',
        }),
        tickY(rows, {
          id: 'ticks',
          x: 'category',
          y: 'value',
          key: 'id',
          stroke: '#0f172a',
        }),
      ],
      { id: 'compound' },
    )
    const definition = defineChart({
      marks: [mark],
      x: { scale: scaleBand<string> },
      y: { scale: scaleLinear },
    })
    const scene = createChartScene(definition, { width: 480, height: 280 })

    expectTypeOf(definition).toMatchTypeOf<
      ChartDefinition<Row, string, number>
    >()
    expect(
      Object.keys(mark.initialize({ markIndex: 0 }).channels).sort(),
    ).toEqual([
      'compound:bars:color',
      'compound:bars:x',
      'compound:bars:y',
      'compound:ticks:color',
      'compound:ticks:x',
      'compound:ticks:y',
    ])
    expect(scene.points).toHaveLength(4)
    expect(scene.points.map(({ markId }) => markId)).toEqual([
      'compound:bars',
      'compound:bars',
      'compound:ticks',
      'compound:ticks',
    ])
    for (const row of rows) {
      expect(scene.points.filter(({ datum }) => datum === row)).toHaveLength(2)
    }
    expect(
      flatten(scene.nodes).filter((node) => node.kind === 'rect'),
    ).toHaveLength(2)
    expect(
      flatten(scene.nodes).filter(
        (node) => node.kind === 'rule' && node.key.includes('compound:ticks:'),
      ),
    ).toHaveLength(2)
  })

  it('retains each child interaction point under its own namespace', () => {
    const mark = compositeMark(
      [
        dot(rows, {
          id: 'base',
          x: 'category',
          y: 'value',
          key: 'id',
          r: 5,
        }),
        dot(rows, {
          id: 'ring',
          x: 'category',
          y: 'value',
          key: 'id',
          r: 8,
          fill: 'none',
          stroke: '#0f172a',
        }),
      ],
      { id: 'shared' },
    )
    const scene = createChartScene(
      defineChart({
        marks: [mark],
        x: { scale: scaleBand<string> },
        y: { scale: scaleLinear },
      }),
      { width: 480, height: 280 },
    )
    expect(scene.points).toHaveLength(4)
    expect(scene.points.map(({ markId }) => markId)).toEqual([
      'shared:base',
      'shared:base',
      'shared:ring',
      'shared:ring',
    ])
  })

  it('merges parent and child motion under the resolved child namespace', () => {
    const mark = compositeMark(
      [
        dot(rows, {
          id: 'dots',
          x: 'category',
          y: 'value',
          motion: { delay: 20, transition: { type: 'spring', mass: 2 } },
        }),
      ],
      {
        id: 'compound',
        motion: {
          delay: 5,
          path: { update: 'rolling', x: 'shift' },
          transition: { type: 'spring', damping: 18 },
        },
      },
    )
    const initialized = mark.initialize({ markIndex: 0 })
    const context: ChartMotionContext<Row> = {
      phase: 'update',
      role: 'dot',
      key: 'compound:dots:a',
      markId: 'compound:dots',
      seriesKey: 'compound:dots',
      seriesIndex: 0,
      datumIndex: 0,
      datumCount: 2,
      datum: rows[0],
      point: undefined,
    }

    expect(
      typeof initialized.motion === 'function'
        ? initialized.motion(context)
        : initialized.motion,
    ).toEqual({
      delay: 20,
      path: { update: 'rolling', x: 'shift' },
      transition: { type: 'spring', damping: 18, mass: 2 },
    })
  })

  it('lets child motion disable or re-enable its composite parent', () => {
    const context: ChartMotionContext<Row> = {
      phase: 'enter',
      role: 'dot',
      key: 'compound:dots:a',
      markId: 'compound:dots',
      seriesKey: 'compound:dots',
      seriesIndex: 0,
      datumIndex: 0,
      datumCount: 2,
      datum: rows[0],
      point: undefined,
    }
    const disabledChild = compositeMark(
      [
        dot(rows, {
          id: 'dots',
          x: 'category',
          y: 'value',
          motion: false,
        }),
      ],
      {
        id: 'compound',
        motion: { transition: { type: 'spring', damping: 18 } },
      },
    ).initialize({ markIndex: 0 })
    const enabledChild = compositeMark(
      [
        dot(rows, {
          id: 'dots',
          x: 'category',
          y: 'value',
          motion: { delay: 20 },
        }),
      ],
      { id: 'compound', motion: false },
    ).initialize({ markIndex: 0 })

    expect(
      typeof disabledChild.motion === 'function'
        ? disabledChild.motion(context)
        : disabledChild.motion,
    ).toBe(false)
    expect(
      typeof enabledChild.motion === 'function'
        ? enabledChild.motion(context)
        : enabledChild.motion,
    ).toEqual({ delay: 20 })
  })

  it('rejects duplicate ids and nested resolved layouts', () => {
    const duplicate = compositeMark([
      dot(rows, { id: 'same', x: 'category', y: 'value' }),
      dot(rows, { id: 'same', x: 'category', y: 'value' }),
    ])
    const resolved = createMark<Row>(() => ({
      id: 'resolved',
      channels: {},
      resolveLayout: () => ({ render: () => ({ nodes: [] }) }),
    }))

    expect(() => duplicate.initialize({ markIndex: 0 })).toThrow(
      'Composite mark cannot compose duplicate child mark id "same"',
    )
    expect(() =>
      compositeMark([resolved]).initialize({ markIndex: 0 }),
    ).toThrow(
      'Composite mark cannot compose child mark "resolved" because it has its own layout',
    )
  })
})

function flatten(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'group' ? [node, ...flatten(node.children)] : [node],
  )
}
