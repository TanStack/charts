import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { downloads } from '@charts-poc/demo-data/downloads'
import { createChartScene, mountChart } from '@tanstack/charts'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { streamingViewportForMode, visibleStreamingData } from './model'
import { streamingData } from './selection'
import { streamingWindowDefinition } from './tanstack'
import type { ChartDefinition, ChartPoint, SceneNode } from '@tanstack/charts'
import type { DownloadsRow } from '@charts-poc/demo-data/downloads'

const size = { width: 640, height: 360 }

describe('definition-owned streaming window', () => {
  it('keeps visible geometry, domains, focus, and tooltip rows in one definition', () => {
    const rows = streamingData(downloads, 0, 1)
    const viewport = streamingViewportForMode(rows, 'locked')
    const definition = streamingWindowDefinition(rows, viewport, 'locked')
    const scene = createChartScene(definition, size)
    const visibleRows = visibleStreamingData(rows, viewport)
    const nodes = flatten(scene.nodes)

    expectTypeOf(definition).toMatchTypeOf<
      ChartDefinition<DownloadsRow, Date, number>
    >()
    expect(scene.scales.x.domain).toEqual(viewport)
    expect(scene.points).toHaveLength(visibleRows.length)
    expect(scene.points.map((point) => point.datum)).toEqual(visibleRows)
    expect(
      scene.points.every((point) => point.markId === 'stream-points'),
    ).toBe(true)
    expect(nodes.filter((node) => node.kind === 'polyline')).toHaveLength(1)
    expect(
      new Set(
        nodes.filter((node) => node.kind === 'dot').map((node) => node.key),
      ),
    ).toHaveLength(visibleRows.length)
    expect(nodes.find((node) => node.kind === 'polyline')).not.toHaveProperty(
      'interaction',
    )
  })

  it('excludes offscreen extremes from the quantitative domain', () => {
    const source = streamingData(downloads, 0, 1)
    const rows = source.map((row) =>
      row.date.toISOString().startsWith('2018-10-13')
        ? { ...row, downloads: 1_000_000_000 }
        : row,
    )
    const viewport = streamingViewportForMode(rows, 'locked')
    const scene = createChartScene(
      streamingWindowDefinition(rows, viewport, 'locked'),
      size,
    )
    const yDomain = scene.scales.y.domain.filter(
      (value): value is number => typeof value === 'number',
    )

    expect(Math.max(...yDomain)).toBeLessThan(1_000_000_000)
    expect(
      scene.points.some((point) => point.datum.downloads === 1_000_000_000),
    ).toBe(false)
  })

  it('preserves inferred date identity when offscreen rows append or revise', () => {
    const initialRows = streamingData(downloads, 0)
    const appendedRows = streamingData(downloads, 0, 1)
    const revisedRows = streamingData(downloads, 1, 1)
    const initial = pointKeys(initialRows, 'locked')
    const appended = pointKeys(appendedRows, 'locked')
    const revised = pointKeys(revisedRows, 'locked')

    expect(appended).toEqual(initial)
    expect(revised).toEqual(initial)
  })

  it('restores a retained date and clears focus when that date leaves the window', () => {
    const container = document.createElement('div')
    document.body.append(container)
    const focusEvents: (ChartPoint<DownloadsRow, Date, number> | null)[] = []
    const initialRows = streamingData(downloads, 0)
    const initialViewport = streamingViewportForMode(initialRows, 'locked')
    const options = {
      definition: streamingWindowDefinition(
        initialRows,
        initialViewport,
        'locked',
      ),
      ...size,
      ariaLabel: 'Streaming downloads',
      onFocusChange(point: ChartPoint<DownloadsRow, Date, number> | null) {
        focusEvents.push(point)
      },
    }
    const host = mountChart(container, options)
    const svg = container.querySelector<SVGSVGElement>('svg.ts-chart')
    if (!svg) throw new Error('Expected the chart surface')

    svg.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    expect(dateKey(focusEvents.at(-1)?.datum.date)).toBe('2018-10-05')

    const appendedRows = streamingData(downloads, 0, 1)
    host.update({
      ...options,
      definition: streamingWindowDefinition(
        appendedRows,
        streamingViewportForMode(appendedRows, 'locked'),
        'locked',
      ),
    })
    expect(dateKey(focusEvents.at(-1)?.datum.date)).toBe('2018-10-05')

    host.update({
      ...options,
      definition: streamingWindowDefinition(
        appendedRows,
        streamingViewportForMode(appendedRows, 'latest'),
        'latest',
      ),
    })
    expect(focusEvents.at(-1)).toBeNull()

    host.destroy()
    container.remove()
  })

  it('keeps only feed and viewport policy in the application shell', () => {
    const directory = resolve(
      process.cwd(),
      'benchmarks/conformance/cases/86-streaming-window-preservation',
    )
    const view = readFileSync(resolve(directory, 'view.tsx'), 'utf8')
    const echarts = readFileSync(resolve(directory, 'echarts.ts'), 'utf8')

    expect(view).toContain('streamingWindowDefinition(')
    expect(view).toContain('decorative(')
    expect(view).not.toContain('<svg')
    expect(view).not.toContain("key: 'date'")
    for (const source of [view, echarts]) {
      expect(source).toContain('streamingViewportForMode(')
      expect(source).not.toContain('latestStreamingViewport(')
      expect(source).not.toContain('fullStreamingViewport(')
    }
  })
})

function pointKeys(
  rows: readonly DownloadsRow[],
  mode: 'locked' | 'latest' | 'all',
) {
  const viewport = streamingViewportForMode(rows, mode)
  const scene = createChartScene(
    streamingWindowDefinition(rows, viewport, mode),
    size,
  )
  return Object.fromEntries(
    scene.points.map((point) => [dateKey(point.datum.date), point.key]),
  )
}

function dateKey(date: Date | undefined) {
  return date?.toISOString().slice(0, 10) ?? null
}

function flatten(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.flatMap((node) => [
    node,
    ...(node.kind === 'group' ? flatten(node.children) : []),
  ])
}
