import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { aapl } from '@tanstack/charts-data/aapl'
import { createChartRuntime } from '@tanstack/charts'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { maximumAapl, minimumAapl, createExampleChart } from './tanstack'
import type { AaplRow } from '@tanstack/charts-data/aapl'
import type { ChartSpecDatum, SceneLabel, SceneNode } from '@tanstack/charts'

type ExtremaDatum = ChartSpecDatum<ReturnType<typeof createExampleChart>>

describe('definition-owned extrema annotations', () => {
  it('selects the original minimum and maximum rows', () => {
    const minimumClose = Math.min(...aapl.map(({ Close }) => Close))
    const maximumClose = Math.max(...aapl.map(({ Close }) => Close))

    expectTypeOf<ExtremaDatum>().toEqualTypeOf<AaplRow>()
    expect(minimumAapl).toHaveLength(1)
    expect(maximumAapl).toHaveLength(1)
    expect(minimumAapl[0]).toBe(
      aapl.find(({ Close }) => Close === minimumClose),
    )
    expect(maximumAapl[0]).toBe(
      aapl.find(({ Close }) => Close === maximumClose),
    )
  })

  it('keeps dots as the sole interaction owners for decorative labels', () => {
    const scene = createChartRuntime<AaplRow>().render(createExampleChart(), {
      width: 640,
      height: 400,
    })
    const minimumPoint = point(scene, 'minimum-point')
    const maximumPoint = point(scene, 'maximum-point')
    const labels = flatten(scene.nodes).filter(
      (node): node is SceneLabel => node.kind === 'label',
    )
    const minimumLabel = labels.find(({ key }) =>
      key.startsWith('minimum-label:'),
    )
    const maximumLabel = labels.find(({ key }) =>
      key.startsWith('maximum-label:'),
    )

    expect(
      scene.points.filter(({ markId }) => markId === 'close-line'),
    ).toHaveLength(aapl.length)
    expect(minimumPoint.datum).toBe(minimumAapl[0])
    expect(maximumPoint.datum).toBe(maximumAapl[0])
    expect(
      scene.points.filter(
        ({ markId }) =>
          markId === 'minimum-label' || markId === 'maximum-label',
      ),
    ).toEqual([])
    expect(minimumLabel).toMatchObject({
      text: `Low $${minimumAapl[0]!.Close.toFixed(2)}`,
      anchor: 'middle',
    })
    expect(maximumLabel).toMatchObject({
      text: `High $${maximumAapl[0]!.Close.toFixed(2)}`,
      anchor: 'end',
    })
  })

  it('keeps selection and presentation directly beside their marks', () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        'benchmarks/conformance/cases/58-select-extrema/example.tsx',
      ),
      'utf8',
    )

    expect(source).toContain("select: 'min'")
    expect(source).toContain("select: 'max'")
    expect(source).toContain('dot(minimumAapl')
    expect(source).toContain('dot(maximumAapl')
    expect(source).toContain('text(minimumAapl')
    expect(source).toContain('text(maximumAapl')
    expect(source).toContain('decorative(')
    expect(source).not.toContain('ExtremumAnnotation')
    expect(source).not.toContain('selectExtrema(')
    expect(source).not.toMatch(/\.\.\.(?:minimum|maximum)/u)
  })
})

function point(
  scene: ReturnType<ReturnType<typeof createChartRuntime<AaplRow>>['render']>,
  markId: string,
) {
  const points = scene.points.filter((candidate) => candidate.markId === markId)
  expect(points).toHaveLength(1)
  return points[0]!
}

function flatten(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'group' ? [node, ...flatten(node.children)] : [node],
  )
}
