import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import {
  adoptResolvedChildMark,
  composeResolvedChildMarks,
} from './resolved-layout-child'
import { defaultChartTheme } from './scene'
import type {
  ChartPoint,
  InitializedMark,
  MarkRenderContext,
  ResolvedMarkLayout,
  ResolvedScale,
  SceneGroup,
  SceneNode,
} from './types'

describe('resolved child mark adoption', () => {
  it('forwards the child fields that may resolve after positional layout', () => {
    const render = vi.fn(() => ({ nodes: [], points: [] }))
    const child: InitializedMark = {
      id: 'child',
      channels: { color: { scale: 'color', values: ['A'] } },
      states: { data: [], definitions: [] },
      layoutLabels: () => [],
      render,
    }

    const adopted = adoptResolvedChildMark(child)

    expect(adopted.channels).toBe(child.channels)
    expect(adopted.states).toBe(child.states)
    expect(adopted.layoutLabels).toBe(child.layoutLabels)
    expect(adopted.render).toBe(render)
  })

  it('rejects recursively resolved child layouts', () => {
    const child: InitializedMark = {
      id: 'nested',
      channels: {},
      render: () => ({ nodes: [], points: [] }),
      resolveLayout: () => ({
        render: () => ({ nodes: [], points: [] }),
      }),
    }

    expect(() => adoptResolvedChildMark(child)).toThrow(
      'cannot adopt child mark "nested" because it has its own layout',
    )
  })

  it('composes pixel children without erasing their scene boundaries', () => {
    const focusPoint = point('links', 'links:one', 10, 20, {
      kind: 'link' as const,
    })
    const statePoint = point('nodes', 'nodes:one', 30, 40, {
      kind: 'node' as const,
    })
    const focusRender = vi.fn(({ scales }: MarkRenderContext) => ({
      nodes: [
        {
          kind: 'group' as const,
          key: 'links',
          children: [
            {
              kind: 'rule' as const,
              key: focusPoint.key,
              x1: scales.x!.map(10),
              y1: scales.y!.map(20),
              x2: scales.x!.map(20),
              y2: scales.y!.map(15),
              interaction: { point: focusPoint },
            },
          ],
        },
      ],
    }))
    const stateRender = vi.fn(({ scales }: MarkRenderContext) => ({
      nodes: [
        {
          kind: 'rect' as const,
          key: statePoint.key,
          x: scales.x!.map(30),
          y: scales.y!.map(40),
          width: 8,
          height: 12,
          interaction: { point: statePoint },
        },
      ],
      points: [statePoint],
    }))
    const focusChild: InitializedMark<{ kind: 'link' }, number, number> = {
      id: 'links',
      channels: {
        x: { scale: 'x', values: [10, 20] },
        y: { scale: 'y', values: [20, 15] },
        color: { scale: 'color', values: ['link'] },
      },
      focus: { match: 'group', retarget: true },
      layoutLabels: ({ scales }) => [
        {
          kind: 'label',
          key: 'links:label',
          x: scales.x!.map(10),
          y: scales.y!.map(20),
          text: 'Links',
        },
      ],
      render: focusRender,
    }
    const stateChild: InitializedMark<{ kind: 'node' }, number, number> = {
      id: 'nodes',
      channels: {
        x: { scale: 'x', values: [30] },
        y: { scale: 'y', values: [40] },
        color: { scale: 'color', values: ['node'] },
      },
      states: { data: [statePoint.datum], definitions: [] },
      layoutLabels: ({ scales }) => [
        {
          kind: 'label',
          key: 'nodes:label',
          x: scales.x!.map(30),
          y: scales.y!.map(40),
          text: 'Nodes',
        },
      ],
      render: stateRender,
    }

    const composed = composeResolvedChildMarks('flow', [
      focusChild,
      stateChild,
    ] as const)
    expectTypeOf(composed).toMatchTypeOf<
      ResolvedMarkLayout<{ kind: 'link' } | { kind: 'node' }, number, number>
    >()
    const context = renderContext()

    expect(composed.channels).toEqual({
      'flow:links:color': { scale: 'color', values: ['link'] },
      'flow:nodes:color': { scale: 'color', values: ['node'] },
    })
    expect(composed.layoutLabels?.(context)).toEqual([
      {
        kind: 'label',
        key: 'flow:links:label',
        x: 10,
        y: 20,
        text: 'Links',
      },
      {
        kind: 'label',
        key: 'flow:nodes:label',
        x: 30,
        y: 40,
        text: 'Nodes',
      },
    ])

    const rendered = composed.render(context)
    expect(focusRender).toHaveBeenCalledOnce()
    expect(stateRender).toHaveBeenCalledOnce()
    expect(rendered.nodes.map((node) => node.key)).toEqual([
      'flow:links:focus',
      'flow:nodes:states',
    ])
    expect(
      flatten(rendered.nodes).every((node) => node.key.startsWith('flow:')),
    ).toBe(true)

    const focusLayer = rendered.nodes[0] as SceneGroup
    expect(focusLayer.focus).toMatchObject({
      match: 'group',
      placement: 'under',
      retarget: true,
    })
    expect(focusLayer.children).toEqual([])
    expect(focusLayer.focus?.points[0]).toMatchObject({
      key: 'flow:links:one',
      markId: 'flow:links',
      x: 10,
      y: 20,
    })
    const focusRule = flatten(focusLayer.focus?.candidates ?? []).find(
      (node) => node.kind === 'rule',
    )
    expect(focusRule?.kind).toBe('rule')
    if (focusRule?.kind !== 'rule') throw new Error('Expected focus rule')
    expect(focusRule.x1).toBe(10)
    expect(focusRule.interaction?.point).toBe(focusLayer.focus?.points[0])

    expect(rendered.points).toHaveLength(1)
    expect(rendered.points?.[0]).toMatchObject({
      key: 'flow:nodes:one',
      markId: 'flow:nodes',
      x: 30,
      y: 40,
    })
    const stateLayer = rendered.nodes[1] as SceneGroup
    expect(stateLayer.states?.points[0]).toBe(rendered.points?.[0])
    const stateRect = flatten(stateLayer.children).find(
      (node) => node.kind === 'rect',
    )
    expect(stateRect?.kind).toBe('rect')
    if (stateRect?.kind !== 'rect') throw new Error('Expected state rect')
    expect(stateRect.x).toBe(30)
    expect(stateRect.interaction?.point).toBe(rendered.points?.[0])
  })

  it('rejects recursively resolved children during composition', () => {
    const child: InitializedMark = {
      id: 'nested',
      channels: {},
      render: () => ({ nodes: [] }),
      resolveLayout: () => ({ render: () => ({ nodes: [] }) }),
    }

    expect(() => composeResolvedChildMarks('parent', [child])).toThrow(
      'cannot compose child mark "nested" because it has its own layout',
    )
  })

  it('rejects duplicate child ids that would collide after namespacing', () => {
    const child = (): InitializedMark => ({
      id: 'duplicate',
      channels: {},
      render: () => ({ nodes: [] }),
    })

    expect(() =>
      composeResolvedChildMarks('parent', [child(), child()]),
    ).toThrow('cannot compose duplicate child mark id "duplicate"')
  })

  it('rejects distinct child ids that collapse to one parent namespace', () => {
    const child = (id: string): InitializedMark => ({
      id,
      channels: {},
      render: () => ({ nodes: [] }),
    })

    expect(() =>
      composeResolvedChildMarks('flow', [child('nodes'), child('flow:nodes')]),
    ).toThrow(
      'child mark ids "nodes" and "flow:nodes" because both resolve to namespace "flow:nodes"',
    )
  })

  it('rejects nonfinite positional channel values before rendering', () => {
    const child: InitializedMark = {
      id: 'bad-pixels',
      channels: {
        x: { scale: 'x', values: [12, Number.NaN] },
      },
      render: () => ({ nodes: [] }),
    }

    expect(() => composeResolvedChildMarks('parent', [child])).toThrow(
      'mark "bad-pixels" x channel "x" requires finite pixel numbers; received NaN at index 1',
    )
  })

  it('rejects nonfinite values passed to a child pixel scale', () => {
    const child: InitializedMark = {
      id: 'late-bad-pixel',
      channels: {},
      render: ({ scales }) => {
        scales.x!.map(Number.POSITIVE_INFINITY)
        return { nodes: [] }
      },
    }
    const composed = composeResolvedChildMarks('parent', [child])

    expect(() => composed.render(renderContext())).toThrow(
      'Resolved child x scale requires a finite pixel number; received Infinity',
    )
  })
})

function point<TDatum>(
  markId: string,
  key: string,
  x: number,
  y: number,
  datum: TDatum,
): ChartPoint<TDatum, number, number> {
  return {
    key,
    markId,
    group: null,
    groupLabel: markId,
    datum,
    datumIndex: 0,
    xValue: x,
    yValue: y,
    x,
    y,
    color: 'currentColor',
  }
}

function renderContext(): MarkRenderContext {
  return {
    markIndex: 0,
    surface: { x: 0, y: 0, width: 100, height: 100 },
    chart: { x: 0, y: 0, width: 100, height: 100 },
    scales: {
      x: scale('x', (value) => Number(value) * 10),
      y: scale('y', (value) => Number(value) * -10),
    },
    theme: defaultChartTheme,
    color: (value) => String(value),
    colors: {
      type: 'ordinal',
      domain: [],
      range: [],
      map: (value) => String(value),
    },
    layout: {},
  }
}

function scale(id: string, map: (value: unknown) => number): ResolvedScale {
  return {
    id,
    type: 'linear',
    domain: [0, 1],
    map,
    ticks: [],
    bandwidth: 0,
  }
}

function flatten(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'group' ? [node, ...flatten(node.children)] : [node],
  )
}
