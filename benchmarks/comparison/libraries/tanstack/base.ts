import {
  mountChart,
  type ChartPoint,
  type ChartScene,
  type DynamicChartDefinition,
  type SceneNode,
} from '@tanstack/charts'
import { focusX } from '@tanstack/charts/focus'
import type { BenchmarkHandle, BenchmarkInput } from '../../types'
import { createFrameOperation } from '../../stress/operation'
import {
  numericMaximum,
  numericMinimum,
  renderedSize,
  visibleSeries,
} from '../tier'

declare const BENCHMARK_STRESS: boolean
declare const BENCHMARK_MULTI_SERIES: boolean
declare const BENCHMARK_GROUPED_X_FOCUS: boolean
declare const BENCHMARK_ROLLING_WINDOW: boolean

export const color = '#2563eb'
export const margin = { top: 16, right: 16, bottom: 32, left: 48 }

export function mountDefinition<TDatum>(
  container: HTMLElement,
  input: BenchmarkInput,
  definition: DynamicChartDefinition<BenchmarkInput, any, TDatum>,
  interactive: boolean,
): BenchmarkHandle {
  const options = {
    definition,
    input,
    width: input.width,
    height: input.height,
    ariaLabel: 'Benchmark chart',
    keyboard: interactive,
    tooltip: BENCHMARK_GROUPED_X_FOCUS
      ? {
          formatGroup(points: readonly ChartPoint<TDatum>[]) {
            const x = points[0]?.xValue
            return [
              `x=${typeof x === 'number' ? x : String(x)}`,
              ...points.map(
                (point) => `${String(point.group)}: ${String(point.yValue)}`,
              ),
            ].join('\n')
          },
        }
      : interactive,
    ...(BENCHMARK_GROUPED_X_FOCUS
      ? {
          focus: focusX,
          maxFocusDistance: Number.POSITIVE_INFINITY,
        }
      : undefined),
    animate: false,
  }
  const host = mountChart(container, options)
  let width = input.width
  let height = input.height
  let currentInput = input

  return {
    ...(BENCHMARK_STRESS ? { ready: createFrameOperation() } : undefined),
    ...(BENCHMARK_STRESS
      ? {
          output: {
            read() {
              const scene = host.getScene()
              const xDomainMinimum = numericMinimum(scene.scales.x?.domain)
              const xDomainMaximum = numericMaximum(scene.scales.x?.domain)
              const seriesVertexCounts = BENCHMARK_MULTI_SERIES
                ? sceneSeriesVertexCounts(scene)
                : undefined
              const seriesColors = BENCHMARK_MULTI_SERIES
                ? sceneSeriesColors(scene)
                : undefined
              return {
                ...renderedSize(container),
                itemCount: scene.points.length,
                vertexCount: seriesVertexCounts
                  ? seriesVertexCounts.reduce(
                      (total, value) => total + value.vertices,
                      0,
                    )
                  : sceneVertexCount(scene.nodes),
                pathCount: BENCHMARK_MULTI_SERIES
                  ? scenePolylineCount(scene.nodes)
                  : undefined,
                seriesCount: seriesVertexCounts?.length,
                seriesIdentities: seriesVertexCounts?.map(
                  ({ series }) => series,
                ),
                seriesVertexCounts,
                seriesColors,
                xDomainMinimum,
                xDomainMaximum,
                viewportClipped: scene.nodes.some(
                  (node) => node.kind === 'group' && node.clip !== undefined,
                ),
                xEndpointVisible:
                  xDomainMaximum === undefined
                    ? undefined
                    : sceneEndpointVisible(scene, xDomainMaximum),
              }
            },
            ...(BENCHMARK_ROLLING_WINDOW
              ? {
                  readData() {
                    return host.getScene().points.flatMap(({ datum }) => {
                      const logical = logicalDatum(datum)
                      return logical ? [logical] : []
                    })
                  },
                  readDataNodes() {
                    return host.getScene().points.flatMap(({ datum, key }) => {
                      const logical = logicalDatum(datum)
                      const node = container.querySelector(
                        `[data-ts-key="${CSS.escape(key)}"]`,
                      )
                      return logical && node ? [{ key: logical.key, node }] : []
                    })
                  },
                }
              : undefined),
          },
        }
      : undefined),
    ...(BENCHMARK_STRESS && interactive
      ? {
          pointer: {
            target(fraction = 0.5) {
              if (BENCHMARK_GROUPED_X_FOCUS) {
                const scene = host.getScene()
                const firstSeries = visibleSeries(currentInput)[0]
                const points = scene.points
                  .filter((point) => point.group === firstSeries)
                  .sort(
                    (left, right) => Number(left.xValue) - Number(right.xValue),
                  )
                const point =
                  points[
                    Math.round(
                      Math.max(0, Math.min(1, fraction)) *
                        Math.max(0, points.length - 1),
                    )
                  ]
                const svg = container.querySelector('svg')
                if (!point || !svg) return undefined
                const bounds = svg.getBoundingClientRect()
                return {
                  x: bounds.left + (point.x / scene.width) * bounds.width,
                  y: bounds.top + (point.y / scene.height) * bounds.height,
                  focusX:
                    typeof point.xValue === 'number' ? point.xValue : undefined,
                }
              }
              const points = container.querySelectorAll<SVGGraphicsElement>(
                'svg circle[data-ts-key]:not([data-ts-chart-focus])',
              )
              const point =
                points[
                  Math.round(
                    Math.max(0, Math.min(1, fraction)) *
                      Math.max(0, points.length - 1),
                  )
                ]
              if (!point) return undefined
              const bounds = point.getBoundingClientRect()
              return {
                x: bounds.left + bounds.width / 2,
                y: bounds.top + bounds.height / 2,
              }
            },
            isActive() {
              const tooltip =
                container.querySelector<HTMLElement>('.ts-chart-tooltip')
              return Boolean(tooltip && !tooltip.hidden)
            },
            signature() {
              const tooltip =
                container.querySelector<HTMLElement>('.ts-chart-tooltip')
              return tooltip && !tooltip.hidden
                ? tooltip.textContent?.trim()
                : undefined
            },
            seriesIdentities() {
              const tooltip =
                container.querySelector<HTMLElement>('.ts-chart-tooltip')
              const text =
                tooltip && !tooltip.hidden ? tooltip.textContent : undefined
              if (!text) return []
              return visibleSeries(currentInput).filter((series) =>
                text.includes(series),
              )
            },
            seriesValues() {
              const tooltip =
                container.querySelector<HTMLElement>('.ts-chart-tooltip')
              const x =
                tooltip && !tooltip.hidden
                  ? tooltipXValue(tooltip.textContent)
                  : undefined
              if (x === undefined) return []
              const values = new Map<string, number>()
              for (const point of host.getScene().points) {
                if (
                  typeof point.group === 'string' &&
                  typeof point.xValue === 'number' &&
                  typeof point.yValue === 'number' &&
                  point.xValue === x
                ) {
                  values.set(point.group, point.yValue)
                }
              }
              return visibleSeries(currentInput).flatMap((series) => {
                const value = values.get(series)
                return value === undefined ? [] : [{ series, value }]
              })
            },
            focusedX() {
              const tooltip =
                container.querySelector<HTMLElement>('.ts-chart-tooltip')
              return tooltip && !tooltip.hidden
                ? tooltipXValue(tooltip.textContent)
                : undefined
            },
          },
        }
      : undefined),
    update(nextInput) {
      currentInput = nextInput
      if (nextInput.width !== width || nextInput.height !== height) {
        width = nextInput.width
        height = nextInput.height
        container.style.width = `${width}px`
        container.style.height = `${height}px`
      }
      host.update({
        ...options,
        input: nextInput,
        width: nextInput.width,
        height: nextInput.height,
      })
      return BENCHMARK_STRESS ? createFrameOperation() : undefined
    },
    destroy() {
      host.destroy()
    },
  }
}

function logicalDatum(value: unknown) {
  if (typeof value !== 'object' || value === null) return undefined
  const key = Reflect.get(value, 'id')
  const x = Reflect.get(value, 'x')
  const y = Reflect.get(value, 'y')
  const series = Reflect.get(value, 'series')
  const category = Reflect.get(value, 'category')
  return typeof key === 'number' &&
    typeof x === 'number' &&
    typeof y === 'number' &&
    typeof series === 'string' &&
    typeof category === 'string'
    ? { key, x, y, series, category }
    : undefined
}

function tooltipXValue(text: string | null | undefined): number | undefined {
  const match = text?.match(/(?:^|\n)x=(-?\d+(?:\.\d+)?)/)
  const value = match ? Number(match[1]) : Number.NaN
  return Number.isFinite(value) ? value : undefined
}

function sceneSeriesVertexCounts(
  scene: ChartScene,
): ReadonlyArray<{ series: string; vertices: number }> {
  const counts = new Map<string, number>()
  for (const point of scene.points) {
    if (typeof point.group !== 'string') continue
    counts.set(point.group, (counts.get(point.group) ?? 0) + 1)
  }
  return [...counts].map(([series, vertices]) => ({ series, vertices }))
}

function sceneSeriesColors(
  scene: ChartScene,
): ReadonlyArray<{ series: string; color: string }> {
  const colors = new Map<string, string>()
  for (const point of scene.points) {
    if (typeof point.group === 'string' && !colors.has(point.group)) {
      colors.set(point.group, point.color)
    }
  }
  return [...colors].map(([series, color]) => ({ series, color }))
}

function scenePolylineCount(nodes: readonly SceneNode[]): number {
  let count = 0
  for (const node of nodes) {
    if (node.kind === 'group') count += scenePolylineCount(node.children)
    else if (node.kind === 'polyline') count++
  }
  return count
}

function sceneVertexCount(nodes: readonly SceneNode[]): number {
  let count = 0
  for (const node of nodes) {
    switch (node.kind) {
      case 'group':
        count += sceneVertexCount(node.children)
        break
      case 'area':
      case 'polyline':
        count += node.points.length
        break
      case 'rule':
        count += 2
        break
      case 'dot':
      case 'label':
      case 'rect':
        count++
        break
    }
  }
  return count
}

function sceneEndpointVisible(
  scene: ChartScene,
  xDomainMaximum: number,
): boolean {
  const tolerance = Math.max(1e-6, Math.abs(xDomainMaximum) * 1e-9)
  return scene.points.some(
    (point) =>
      typeof point.xValue === 'number' &&
      Math.abs(point.xValue - xDomainMaximum) <= tolerance &&
      point.x >= scene.chart.x - 2 &&
      point.x <= scene.chart.x + scene.chart.width + 2 &&
      point.y >= scene.chart.y - 2 &&
      point.y <= scene.chart.y + scene.chart.height + 2,
  )
}
