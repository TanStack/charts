import { scaleLinear } from 'd3-scale'
import { describe, expect, it, vi } from 'vitest'
import { colorGradientLegend } from './legend'
import { createMark } from './mark'
import { createChartScene, defineChart } from './scene'
import type { MarkRenderContext, MarkResolvedLayoutContext } from './types'

describe('mark resolved layout', () => {
  it('derives final channels and geometry after positional scales resolve', () => {
    const events: string[] = []
    const resolveLayout = vi.fn(
      ({ chart, scales }: MarkResolvedLayoutContext) => {
        events.push('layout')
        const bin = {
          id: 'bin:0',
          x: 5,
          y: 10,
          count: chart.width >= 1 ? 8 : 2,
          source: [{ id: 'a' }, { id: 'b' }],
        }

        return {
          channels: {
            // Resolved positional channels are output metadata only. They do not
            // create a circular positional-domain dependency.
            x: { scale: 'x', values: [100, 200] },
            color: { scale: 'color', values: [2, bin.count] },
          },
          states: {
            data: [bin],
            definitions: [],
          },
          layoutLabels: () => [
            {
              kind: 'label' as const,
              key: 'outside-label',
              x: chart.x + chart.width + 12,
              y: chart.y + chart.height / 2,
              text: 'bin',
              anchor: 'start' as const,
              baseline: 'middle' as const,
              fontSize: 10,
            },
          ],
          render: ({ color }: MarkRenderContext) => {
            events.push('render')
            return {
              nodes: [],
              points: [
                {
                  key: bin.id,
                  markId: 'resolved',
                  group: null,
                  groupLabel: '',
                  datum: bin,
                  datumIndex: 0,
                  xValue: bin.x,
                  yValue: bin.y,
                  x: scales.x!.map(bin.x),
                  y: scales.y!.map(bin.y),
                  color: color(bin.count),
                },
              ],
            }
          },
        }
      },
    )
    const initialize = vi.fn(() => {
      events.push('initialize')
      return {
        id: 'resolved',
        channels: {
          x: { scale: 'x', values: [0, 10] },
          y: { scale: 'y', values: [0, 20] },
        },
        resolveLayout,
      }
    })
    const scene = createChartScene(
      defineChart({
        marks: [createMark(initialize)],
        guides: false,
        focusRing: false,
        x: { scale: scaleLinear },
        y: { scale: scaleLinear },
        color: {
          scale: scaleLinear<string>,
          range: ['#eff6ff', '#1d4ed8'],
          legend: colorGradientLegend({ label: 'Count' }),
        },
      }),
      { width: 480, height: 260 },
    )

    expect(initialize).toHaveBeenCalledOnce()
    expect(resolveLayout.mock.calls.length).toBeGreaterThan(1)
    expect(events[0]).toBe('initialize')
    expect(events.at(-1)).toBe('render')
    expect(events.filter((event) => event === 'render')).toHaveLength(1)
    expect(scene.scales.x!.domain).toEqual([0, 10])
    expect(scene.scales.y!.domain).toEqual([0, 20])
    expect(scene.colors.domain).toEqual([2, 8])
    expect(scene.margin.top).toBeGreaterThan(0)
    expect(scene.margin.right).toBeGreaterThan(12)
    expect(scene.points).toHaveLength(1)
    expect(scene.points[0]?.key).toBe('bin:0')
    expect(scene.points[0]?.datum.source).toEqual([{ id: 'a' }, { id: 'b' }])
    const marks = scene.nodes.find((node) => node.key === 'marks')
    expect(marks?.kind).toBe('group')
    if (marks?.kind !== 'group') throw new Error('Expected marks group')
    expect(marks.children.some((node) => node.key === 'states:resolved')).toBe(
      true,
    )
  })

  it('validates series identity against layout-derived color channels', () => {
    const mark = createMark(() => ({
      id: 'derived-series',
      channels: {
        x: { scale: 'x', values: [0, 1] },
        y: { scale: 'y', values: [0, 1] },
      },
      seriesFromColor: true,
      resolveLayout: () => ({
        channels: { color: { scale: 'color', values: [1, 2] } },
        render: () => ({ nodes: [] }),
      }),
    }))

    expect(() =>
      createChartScene(
        defineChart({
          marks: [mark],
          guides: false,
          x: { scale: scaleLinear },
          y: { scale: scaleLinear },
          color: {
            scale: scaleLinear<string>,
            range: ['#eff6ff', '#1d4ed8'],
          },
        }),
        { width: 320, height: 180 },
      ),
    ).toThrow(
      'A continuous color channel cannot infer series identity; supply z explicitly',
    )
  })
})
