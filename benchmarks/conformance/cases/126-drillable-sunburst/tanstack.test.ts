import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createChartRuntime } from '@tanstack/charts'
import { motion } from '@tanstack/charts/motion'
import { describe, expect, it, vi } from 'vitest'
import {
  flareHasChildren,
  flarePreviewRootId,
  flareRootId,
  flareRows,
  flareVisibleDepth,
} from './model'
import { drillableSunburstDefinition, mount } from './tanstack'
import type { FlareRow } from '@tanstack/charts-data/flare'
import type { SunburstNode } from '@tanstack/charts/hierarchy/sunburst'
import type { ChartScene, SceneNode } from '@tanstack/charts'

const clusterId = '/flare/analytics/cluster'
const retainedLeafId = `${clusterId}/AgglomerativeCluster`

describe('drillable native sunburst', () => {
  it('uses the full flat source with a focused root and two visible depths', () => {
    const scene = render(flarePreviewRootId)

    expect(scene.points).toHaveLength(13)
    expect(
      scene.points.every((point) => point.datum.id !== flarePreviewRootId),
    ).toBe(true)
    expect(new Set(scene.points.map((point) => point.datum.depth))).toEqual(
      new Set([1, 2]),
    )
    expect(
      scene.points.find((point) => point.datum.id === clusterId)?.datum,
    ).toMatchObject({
      parentId: flarePreviewRootId,
      ancestorIds: [flarePreviewRootId],
      depth: 1,
      internal: true,
    })
  })

  it('moves retained descendants into the first ring with stable keys', () => {
    const overview = render(flarePreviewRootId)
    const focused = render(clusterId)
    const before = pointById(overview, retainedLeafId)
    const after = pointById(focused, retainedLeafId)

    expect(focused.points).toHaveLength(4)
    expect(after.key).toBe(before.key)
    expect(before.datum.depth).toBe(2)
    expect(after.datum.depth).toBe(1)
    expect(after.yValue).toBeLessThan(before.yValue)
  })

  it('interpolates retained sector paths during a root update', () => {
    const overview = render(flarePreviewRootId)
    const focused = render(clusterId)
    const key = pointById(overview, retainedLeafId).key
    const target = areaPath(focused, key)
    const container = document.createElement('div')
    const surface = motion<SunburstNode<FlareRow>, number, number>({
      initial: false,
    }).mount(container, () => {})
    surface.render(overview, { ariaLabel: 'Drillable sunburst' })
    const retained = pathByKey(container, key)
    const before = retained.getAttribute('d')
    const frames = installManagedFrames()

    try {
      surface.render(focused, { ariaLabel: 'Drillable sunburst' })
      expect(pathByKey(container, key)).toBe(retained)
      expect(retained.getAttribute('d')).toBe(before)
      expect(pathSkeleton(before ?? '')).toBe(pathSkeleton(target))

      frames.run(0)
      frames.run(360)
      expect(retained.getAttribute('d')).not.toBe(before)
      expect(retained.getAttribute('d')).not.toBe(target)
      expectCenteredSectorPath(retained.getAttribute('d'))
      frames.run(720)
      expect(retained.getAttribute('d')).toBe(target)
    } finally {
      surface.destroy()
      frames.restore()
    }
  })

  it('retargets an interrupted sector from its live polar geometry', () => {
    const overview = render(flarePreviewRootId)
    const focused = render(clusterId)
    const key = pointById(overview, retainedLeafId).key
    const overviewPath = areaPath(overview, key)
    const container = document.createElement('div')
    const surface = motion<SunburstNode<FlareRow>, number, number>({
      initial: false,
    }).mount(container, () => {})
    surface.render(overview, { ariaLabel: 'Drillable sunburst' })
    const retained = pathByKey(container, key)
    const frames = installManagedFrames()

    try {
      surface.render(focused, { ariaLabel: 'Drillable sunburst' })
      frames.run(0)
      frames.run(240)
      const interruptedPath = retained.getAttribute('d')
      expect(interruptedPath).not.toBe(overviewPath)
      expectCenteredSectorPath(interruptedPath)

      surface.render(overview, { ariaLabel: 'Drillable sunburst' })
      expect(pathByKey(container, key)).toBe(retained)
      expect(retained.getAttribute('d')).toBe(interruptedPath)

      frames.run(240)
      frames.run(480)
      expect(retained.getAttribute('d')).not.toBe(interruptedPath)
      expectCenteredSectorPath(retained.getAttribute('d'))
      frames.run(960)
      expect(retained.getAttribute('d')).toBe(overviewPath)
    } finally {
      surface.destroy()
      frames.restore()
    }
  })

  it('unfolds entering descendants from their disappearing parent sector', () => {
    const overview = render(flareRootId)
    const focused = render(flarePreviewRootId)
    const parentKey = pointById(overview, flarePreviewRootId).key
    const enteringKey = pointById(focused, clusterId).key
    const source = areaPath(overview, parentKey)
    const target = areaPath(focused, enteringKey)
    const container = document.createElement('div')
    const surface = motion<SunburstNode<FlareRow>, number, number>({
      initial: false,
    }).mount(container, () => {})
    surface.render(overview, { ariaLabel: 'Drillable sunburst' })
    const frames = installManagedFrames()

    try {
      surface.render(focused, { ariaLabel: 'Drillable sunburst' })
      const entering = pathByKey(container, enteringKey)
      expect(entering.getAttribute('d')).toBe(source)
      expect(entering.getAttribute('opacity')).toBe('0')

      frames.run(0)
      frames.run(360)
      expect(entering.getAttribute('d')).not.toBe(source)
      expect(entering.getAttribute('d')).not.toBe(target)
      expectCenteredSectorPath(entering.getAttribute('d'))
      frames.run(720)
      expect(entering.getAttribute('d')).toBe(target)
      expect(entering.hasAttribute('opacity')).toBe(false)
    } finally {
      surface.destroy()
      frames.restore()
    }
  })

  it('collapses exiting descendants into their appearing parent sector', () => {
    const focused = render(flarePreviewRootId)
    const overview = render(flareRootId)
    const exitingKey = pointById(focused, clusterId).key
    const parentKey = pointById(overview, flarePreviewRootId).key
    const source = areaPath(focused, exitingKey)
    const target = areaPath(overview, parentKey)
    const container = document.createElement('div')
    const surface = motion<SunburstNode<FlareRow>, number, number>({
      initial: false,
    }).mount(container, () => {})
    surface.render(focused, { ariaLabel: 'Drillable sunburst' })
    const exiting = pathByKey(container, exitingKey)
    const frames = installManagedFrames()

    try {
      surface.render(overview, { ariaLabel: 'Drillable sunburst' })
      expect(exiting.getAttribute('d')).toBe(source)

      frames.run(0)
      frames.run(160)
      expect(exiting.getAttribute('d')).not.toBe(source)
      expect(exiting.getAttribute('d')).not.toBe(target)
      expectCenteredSectorPath(exiting.getAttribute('d'))
      frames.run(720)
      expect(
        container.querySelector(`path[data-ts-key="${exitingKey}"]`),
      ).toBeNull()
    } finally {
      surface.destroy()
      frames.restore()
    }
  })

  it('drills with keyboard activation and returns through the center control', () => {
    const container = document.createElement('div')
    document.body.append(container)
    const mounted = mount(container, {
      width: 640,
      height: 400,
      revision: 0,
      interactive: true,
    })
    const svg = container.querySelector<SVGSVGElement>('svg.ts-chart')
    const back = container.querySelector<HTMLButtonElement>(
      '[data-conformance-sunburst-back]',
    )
    if (!svg || !back || !mounted.driver) {
      throw new TypeError('Expected mounted drillable sunburst controls')
    }

    try {
      expect(mounted.driver.readState().rootId).toBe(flarePreviewRootId)
      expect(back.getAttribute('aria-label')).toBe('Back to flare')

      svg.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
      for (let index = 0; index < 13; index += 1) {
        const focusedId = mounted.driver.readState().focusedId
        if (typeof focusedId === 'string' && flareHasChildren(focusedId)) break
        svg.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'ArrowRight',
            bubbles: true,
          }),
        )
      }
      const selectedRoot = mounted.driver.readState().focusedId
      expect(
        typeof selectedRoot === 'string' && flareHasChildren(selectedRoot),
      ).toBe(true)
      svg.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
      )
      expect(mounted.driver.readState().rootId).toBe(selectedRoot)
      expect(back.getAttribute('aria-label')).toBe('Back to analytics')

      back.click()
      expect(mounted.driver.readState().rootId).toBe(flarePreviewRootId)
    } finally {
      mounted.destroy()
      container.remove()
    }
  })

  it('keeps hierarchy viewport policy in the mark and navigation in the shell', () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        'benchmarks/conformance/cases/126-drillable-sunburst/example.tsx',
      ),
      'utf8',
    )

    expect(source).toContain('rootId')
    expect(source).toContain('visibleDepth')
    expect(source).not.toContain('partition(')
    expect(source).not.toContain('arc(')
    expect(flareRows()).toHaveLength(252)
    expect(flareVisibleDepth(flarePreviewRootId)).toBe(2)
  })
})

function render(rootId: string) {
  return createChartRuntime<SunburstNode<FlareRow>, number, number>().render(
    drillableSunburstDefinition(rootId),
    { width: 640, height: 400 },
  )
}

function pointById(
  scene: ChartScene<SunburstNode<FlareRow>, number, number>,
  id: string,
) {
  const point = scene.points.find((candidate) => candidate.datum.id === id)
  if (!point) throw new TypeError(`Expected point ${id}`)
  return point
}

function areaPath(
  scene: ChartScene<SunburstNode<FlareRow>, number, number>,
  key: string,
) {
  const nodes = flatten(scene.nodes)
  const area = nodes.find((node) => node.kind === 'area' && node.key === key)
  if (!area || area.kind !== 'area' || !area.path) {
    throw new TypeError(`Expected area ${key}`)
  }
  return area.path
}

function flatten(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'group' ? [node, ...flatten(node.children)] : [node],
  )
}

function pathByKey(container: HTMLElement, key: string) {
  const path = container.querySelector<SVGPathElement>(
    `path[data-ts-key="${key}"]`,
  )
  if (!path) throw new TypeError(`Expected path ${key}`)
  return path
}

function pathSkeleton(value: string) {
  return value.replace(/-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi, '#')
}

function expectCenteredSectorPath(path: string | null) {
  const values = [
    ...(path ?? '').matchAll(/-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi),
  ].map((match) => Number(match[0]))
  expect(values).toHaveLength(18)
  const outerRadius = values[2] ?? Number.NaN
  const innerRadius = values[11] ?? Number.NaN
  expect(Math.hypot(values[0] ?? 0, values[1] ?? 0)).toBeCloseTo(outerRadius, 2)
  expect(Math.hypot(values[7] ?? 0, values[8] ?? 0)).toBeCloseTo(outerRadius, 2)
  expect(Math.hypot(values[9] ?? 0, values[10] ?? 0)).toBeCloseTo(
    innerRadius,
    2,
  )
  expect(Math.hypot(values[16] ?? 0, values[17] ?? 0)).toBeCloseTo(
    innerRadius,
    2,
  )
}

function installManagedFrames() {
  const callbacks = new Map<number, FrameRequestCallback>()
  let handle = 0
  const request = vi
    .spyOn(window, 'requestAnimationFrame')
    .mockImplementation((callback) => {
      handle += 1
      callbacks.set(handle, callback)
      return handle
    })
  const cancel = vi
    .spyOn(window, 'cancelAnimationFrame')
    .mockImplementation((frame) => {
      if (frame !== null && frame !== undefined) callbacks.delete(frame)
    })
  return {
    run(time: number) {
      const next = callbacks.entries().next().value as
        [number, FrameRequestCallback] | undefined
      if (!next) throw new Error(`No animation frame scheduled at ${time}ms`)
      callbacks.delete(next[0])
      next[1](time)
    },
    restore() {
      request.mockRestore()
      cancel.mockRestore()
    },
  }
}
