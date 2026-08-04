import { describe, expect, it } from 'vitest'
import { resolveRollingPathPlan } from './motion-path'
import type { ChartPoint, ResolvedScale } from './types'

const chart = { x: 0, y: 0, width: 100, height: 100 }

describe('rolling path planning', () => {
  it('resolves a contiguous x shift and affine y-domain reprojection', () => {
    const previousScale = linearScale(0, 100)
    const nextScale = linearScale(20, 80)
    const previous = snapshot(
      ['a', 'b', 'c', 'd', 'e'],
      [-100 / 3, 0, 100 / 3, 200 / 3, 100],
      [20, 40, 30, 60, 50],
      previousScale,
    )
    const next = snapshot(
      ['b', 'c', 'd', 'e', 'f'],
      [-100 / 3, 0, 100 / 3, 200 / 3, 100],
      [40, 30, 60, 50, 70],
      nextScale,
    )

    const plan = resolveRollingPathPlan(previous, next, {
      update: 'rolling',
      x: 'shift',
      y: 'reproject',
    })

    expect(plan.kind).toBe('transform')
    if (plan.kind !== 'transform') return
    expect(plan.batchSize).toBe(1)
    expect(plan.transform.x).toBeCloseTo(100 / 3)
    expect(plan.transform.yScale).toBeCloseTo(0.6)
    expect(plan.transform.y).toBeCloseTo(20)
  })

  it('snaps a rolling update when fixed y geometry changes', () => {
    const previous = snapshot(
      ['a', 'b', 'c', 'd'],
      [-50, 0, 50, 100],
      [20, 40, 60, 80],
      linearScale(0, 100),
    )
    const next = snapshot(
      ['b', 'c', 'd', 'e'],
      [-50, 0, 50, 100],
      [40, 60, 80, 90],
      linearScale(20, 100),
    )

    expect(
      resolveRollingPathPlan(previous, next, {
        update: 'rolling',
        x: 'shift',
      }),
    ).toEqual({
      kind: 'fallback',
      fallback: 'snap',
      reason: 'fixed-y-changed',
    })
  })

  it('rejects changed retained values and insufficient clip coverage', () => {
    const scale = linearScale(0, 100)
    const previous = snapshot(
      ['a', 'b', 'c', 'd'],
      [-50, 0, 50, 100],
      [20, 40, 60, 80],
      scale,
    )
    const changed = snapshot(
      ['b', 'c', 'd', 'e'],
      [-50, 0, 50, 100],
      [41, 60, 80, 90],
      scale,
    )
    expect(
      resolveRollingPathPlan(previous, changed, {
        update: 'rolling',
        x: 'shift',
        fallback: 'morph',
      }),
    ).toEqual({
      kind: 'fallback',
      fallback: 'morph',
      reason: 'semantic-value-changed',
    })

    const uncovered = {
      ...snapshot(
        ['b', 'c', 'd', 'e'],
        [-50, 0, 50, 100],
        [40, 60, 80, 90],
        scale,
      ),
      geometry: [
        [0, 60],
        [50, 40],
        [100, 20],
      ] as const,
    }
    expect(
      resolveRollingPathPlan(previous, uncovered, {
        update: 'rolling',
        x: 'shift',
      }),
    ).toMatchObject({
      kind: 'fallback',
      fallback: 'snap',
      reason: 'insufficient-coverage',
    })
  })

  it('rejects a keyed path that changes primitive kind', () => {
    const scale = linearScale(0, 100)
    const previous = snapshot(
      ['a', 'b', 'c', 'd'],
      [-50, 0, 50, 100],
      [20, 40, 60, 80],
      scale,
    )
    const next = {
      ...snapshot(
        ['b', 'c', 'd', 'e'],
        [-50, 0, 50, 100],
        [40, 60, 80, 90],
        scale,
      ),
      kind: 'area' as const,
    }

    expect(
      resolveRollingPathPlan(previous, next, {
        update: 'rolling',
        x: 'shift',
      }),
    ).toEqual({
      kind: 'fallback',
      fallback: 'snap',
      reason: 'path-kind-changed',
    })
  })

  it('rejects rolling motion during a transient viewport translation', () => {
    const scale = linearScale(0, 100)
    const previous = snapshot(
      ['a', 'b', 'c', 'd'],
      [-50, 0, 50, 100],
      [20, 40, 60, 80],
      scale,
    )
    const next = {
      ...snapshot(
        ['b', 'c', 'd', 'e'],
        [-50, 0, 50, 100],
        [40, 60, 80, 90],
        scale,
      ),
      viewportTranslate: { x: 12, y: 0 },
    }

    expect(
      resolveRollingPathPlan(previous, next, {
        update: 'rolling',
        x: 'shift',
      }),
    ).toEqual({
      kind: 'fallback',
      fallback: 'snap',
      reason: 'transient-viewport',
    })
    expect(
      resolveRollingPathPlan(
        { ...previous, viewportTranslate: { x: -8, y: 0 } },
        { ...next, viewportTranslate: { x: 0, y: 0 } },
        {
          update: 'rolling',
          x: 'shift',
        },
      ),
    ).toEqual({
      kind: 'fallback',
      fallback: 'snap',
      reason: 'transient-viewport',
    })
    expect(
      resolveRollingPathPlan(
        previous,
        { ...next, viewportTranslate: { x: 0, y: 6 } },
        {
          update: 'rolling',
          x: 'shift',
        },
      ),
    ).toEqual({
      kind: 'fallback',
      fallback: 'snap',
      reason: 'transient-viewport',
    })
  })

  it('rejects every unsafe rolling invariant deterministically', () => {
    const scale = linearScale(0, 100)
    const previous = snapshot(
      ['a', 'b', 'c', 'd'],
      [-50, 0, 50, 100],
      [20, 40, 60, 80],
      scale,
    )
    const valid = snapshot(
      ['b', 'c', 'd', 'e'],
      [-50, 0, 50, 100],
      [40, 60, 80, 90],
      scale,
    )
    const point = (index: number, changes: Partial<ChartPoint>) => ({
      ...valid.points[index]!,
      ...changes,
    })
    const cases: Array<{
      reason: string
      next: typeof valid
      y?: 'fixed' | 'reproject'
    }> = [
      { reason: 'missing-clip', next: { ...valid, clipped: false } },
      {
        reason: 'plot-bounds-changed',
        next: { ...valid, chart: { ...chart, width: 101 } },
      },
      { reason: 'custom-path', next: { ...valid, customPath: true } },
      {
        reason: 'unbalanced-batch',
        next: {
          ...valid,
          points: valid.points.slice(0, -1),
        },
      },
      {
        reason: 'unstable-keys',
        next: {
          ...valid,
          points: [
            valid.points[0]!,
            point(1, { key: valid.points[0]!.key }),
            ...valid.points.slice(2),
          ],
        },
      },
      {
        reason: 'noncontiguous-window',
        next: snapshot(
          ['b', 'x', 'd', 'e'],
          [-50, 0, 50, 100],
          [40, 60, 80, 90],
          scale,
        ),
      },
      {
        reason: 'nonuniform-x-shift',
        next: {
          ...valid,
          points: [
            valid.points[0]!,
            point(1, { x: 1 }),
            ...valid.points.slice(2),
          ],
        },
      },
      {
        reason: 'non-affine-y',
        next: {
          ...valid,
          points: [
            valid.points[0]!,
            point(1, { y: valid.points[1]!.y + 7 }),
            ...valid.points.slice(2),
          ],
        },
        y: 'reproject',
      },
    ]

    for (const current of cases) {
      expect(
        resolveRollingPathPlan(previous, current.next, {
          update: 'rolling',
          x: 'shift',
          y: current.y,
        }),
        current.reason,
      ).toMatchObject({ kind: 'fallback', reason: current.reason })
    }
  })
})

function snapshot(
  ids: readonly string[],
  xs: readonly number[],
  values: readonly number[],
  yScale: ResolvedScale,
) {
  const points = ids.map((id, index): ChartPoint => {
    const value = values[index] ?? 0
    return {
      key: `line:null:string:${id}`,
      markId: 'line',
      group: null,
      groupLabel: 'line',
      datum: { id, value },
      datumIndex: index,
      xValue: id,
      yValue: value,
      x: xs[index] ?? 0,
      y: yScale.map(value),
      color: '#000',
    }
  })
  return {
    kind: 'polyline' as const,
    points,
    geometry: points.map((point) => [point.x, point.y] as const),
    chart,
    yScale,
    viewportTranslate: { x: 0, y: 0 },
    clipped: true,
    customPath: false,
  }
}

function linearScale(minimum: number, maximum: number): ResolvedScale {
  return {
    id: 'y',
    type: 'linear',
    domain: [minimum, maximum],
    map: (value) =>
      100 - ((Number(value) - minimum) / (maximum - minimum)) * 100,
    ticks: [],
    bandwidth: 0,
  }
}
