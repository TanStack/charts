import * as Plot from '@observablehq/plot'
import type {
  BenchmarkChartType,
  BenchmarkHandle,
  BenchmarkInput,
  BenchmarkMount,
} from '../types'
import { createFrameOperation } from '../stress/operation'
import {
  numericMaximum,
  numericMinimum,
  multiSeriesColors,
  pathEndpointVisible,
  pathRightEdgeVisible,
  pathVertexCount,
  renderedSize,
  rightmostMarkVisible,
  seriesColors,
  visibleMultiSeriesRows,
  visibleSeries,
  visibleRows,
  xMaximum,
  xMinimum,
} from './tier'

declare const BENCHMARK_INTERACTIVE: boolean
declare const BENCHMARK_ADVANCED: boolean
declare const BENCHMARK_STRESS: boolean
declare const BENCHMARK_VARIABLE_SIZE: boolean
declare const BENCHMARK_MULTI_SERIES: boolean
declare const BENCHMARK_GROUPED_X_FOCUS: boolean
declare const BENCHMARK_ROLLING_WINDOW: boolean
const seriesDomain = BENCHMARK_ADVANCED
  ? ['Series A', 'Series B']
  : ['Series A']
const color = '#2563eb'

function options(input: BenchmarkInput, maximum = 100): Plot.PlotOptions {
  return {
    width: input.width,
    height: input.height,
    marginTop: 16,
    marginRight: 16,
    marginBottom: 32,
    marginLeft: 48,
    x: { grid: true },
    y: { domain: [0, maximum], grid: true },
    color: BENCHMARK_INTERACTIVE
      ? {
          ...(BENCHMARK_MULTI_SERIES
            ? {
                domain: [...(input.seriesDomain ?? [])],
                range: [...multiSeriesColors],
              }
            : {
                domain: [...seriesDomain],
                range: [...seriesColors],
              }),
          legend: !BENCHMARK_MULTI_SERIES,
        }
      : undefined,
  }
}

function mountPlot(
  container: HTMLElement,
  input: BenchmarkInput,
  chartType: BenchmarkChartType,
  render: (input: BenchmarkInput) => ReturnType<typeof Plot.plot>,
): BenchmarkHandle {
  let element = normalizeRoot(render(input))
  let currentInput = input
  container.append(element)

  return {
    ...(BENCHMARK_STRESS ? { ready: createFrameOperation() } : undefined),
    ...(BENCHMARK_STRESS
      ? {
          output: {
            read: () => plotOutput(container, element, chartType, currentInput),
            ...(BENCHMARK_ROLLING_WINDOW
              ? {
                  readData: () =>
                    plotLogicalData(
                      element,
                      currentInput,
                      'g[aria-label="dot"] circle',
                    ),
                  readDataNodes: () =>
                    plotDataNodes(
                      element,
                      currentInput,
                      'g[aria-label="dot"] circle',
                    ),
                }
              : undefined),
          },
        }
      : undefined),
    ...(BENCHMARK_STRESS && BENCHMARK_INTERACTIVE
      ? {
          pointer: {
            target(fraction = 0.5) {
              if (BENCHMARK_GROUPED_X_FOCUS) {
                const rows = visibleMultiSeriesRows(currentInput)
                const maximumIndex = Math.max(
                  0,
                  new Set(rows.map((row) => row.x)).size - 1,
                )
                const xValue = Math.round(
                  Math.max(0, Math.min(1, fraction)) * maximumIndex,
                )
                const x = element.scale('x')?.apply(xValue)
                if (typeof x !== 'number' || !Number.isFinite(x)) {
                  return undefined
                }
                const bounds = element.getBoundingClientRect()
                return {
                  x: bounds.left + x,
                  y: bounds.top + bounds.height / 2,
                  focusX: xValue,
                }
              }
              const points = element.querySelectorAll<SVGGraphicsElement>(
                'circle:not([aria-hidden="true"])',
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
              const tip =
                element.querySelector<SVGGraphicsElement>('[aria-label="tip"]')
              return Boolean(tip?.textContent?.trim())
            },
            signature() {
              return element
                .querySelector<SVGGraphicsElement>('[aria-label="tip"]')
                ?.textContent?.trim()
            },
            seriesIdentities() {
              const text =
                element.querySelector<SVGGraphicsElement>(
                  '[aria-label="tip"]',
                )?.textContent
              if (!text) return []
              return visibleSeries(currentInput).filter((series) =>
                text.includes(series),
              )
            },
            seriesValues() {
              const text =
                element.querySelector<SVGGraphicsElement>(
                  '[aria-label="tip"]',
                )?.textContent
              const match = text?.match(/x=(-?\d+(?:\.\d+)?)/)
              const x = match ? Number(match[1]) : Number.NaN
              return Number.isFinite(x)
                ? plotSeriesValuesAtX(element, currentInput, x)
                : []
            },
            focusedX() {
              const text =
                element.querySelector<SVGGraphicsElement>(
                  '[aria-label="tip"]',
                )?.textContent
              const match = text?.match(/x=(-?\d+(?:\.\d+)?)/)
              const value = match ? Number(match[1]) : Number.NaN
              return Number.isFinite(value) ? value : undefined
            },
          },
        }
      : undefined),
    update(nextInput) {
      currentInput = nextInput
      const nextElement = normalizeRoot(render(nextInput))
      element.replaceWith(nextElement)
      element = nextElement
      return BENCHMARK_STRESS ? createFrameOperation() : undefined
    },
    destroy() {
      element.remove()
    },
  }
}

function normalizeRoot<TElement extends HTMLElement | SVGSVGElement>(
  element: TElement,
): TElement {
  element.style.margin = '0'
  element.style.maxWidth = 'none'
  return element
}

export const mountLine: BenchmarkMount = (container, input) =>
  mountPlot(container, input, 'line', (nextInput) => {
    const base = options(nextInput)
    return Plot.plot({
      ...base,
      x: {
        ...base.x,
        domain: BENCHMARK_STRESS
          ? [xMinimum(nextInput), xMaximum(nextInput)]
          : [0, Math.max(1, nextInput.rows.length - 1)],
      },
      marks: [
        Plot.lineY(
          BENCHMARK_MULTI_SERIES
            ? visibleMultiSeriesRows(nextInput)
            : visibleRows(nextInput, BENCHMARK_ADVANCED),
          {
            x: 'x',
            y: 'y',
            z: BENCHMARK_INTERACTIVE ? 'series' : undefined,
            stroke: BENCHMARK_INTERACTIVE ? 'series' : color,
            curve: BENCHMARK_ADVANCED ? 'catmull-rom' : 'linear',
            tip: BENCHMARK_INTERACTIVE && !BENCHMARK_MULTI_SERIES,
            clip: BENCHMARK_STRESS && Boolean(nextInput.xDomain),
          },
        ),
        ...(BENCHMARK_GROUPED_X_FOCUS
          ? [
              Plot.tip(
                multiSeriesFocusRows(nextInput),
                Plot.pointerX({
                  x: 'x',
                  title: 'title',
                  maxRadius: Number.POSITIVE_INFINITY,
                }),
              ),
            ]
          : []),
      ],
    })
  })

export const mountBar: BenchmarkMount = (container, input) =>
  mountPlot(container, input, 'bar', (nextInput) => {
    const base = options(nextInput, BENCHMARK_ADVANCED ? 200 : 100)
    const data = visibleRows(nextInput, BENCHMARK_ADVANCED)
    return Plot.plot({
      ...base,
      marks: [
        BENCHMARK_ADVANCED
          ? Plot.barY(
              data,
              Plot.stackY({
                x: 'category',
                y: 'y',
                fill: 'series',
                tip: true,
              }),
            )
          : Plot.barY(data, {
              x: 'category',
              y: 'y',
              fill: BENCHMARK_INTERACTIVE ? 'series' : color,
              tip: BENCHMARK_INTERACTIVE,
            }),
      ],
    })
  })

export const mountArea: BenchmarkMount = (container, input) =>
  mountPlot(container, input, 'area', (nextInput) => {
    const base = options(nextInput, BENCHMARK_ADVANCED ? 200 : 100)
    const data = visibleRows(nextInput, BENCHMARK_ADVANCED)
    return Plot.plot({
      ...base,
      x: {
        ...base.x,
        domain: BENCHMARK_STRESS
          ? [xMinimum(nextInput), xMaximum(nextInput)]
          : [0, Math.max(1, nextInput.rows.length - 1)],
      },
      marks: BENCHMARK_ADVANCED
        ? [
            Plot.areaY(
              data,
              Plot.stackY({
                x: 'x',
                y: 'y',
                fill: 'series',
                fillOpacity: 0.35,
                curve: 'catmull-rom',
                tip: true,
              }),
            ),
          ]
        : [
            Plot.areaY(data, {
              x: 'x',
              y: 'y',
              z: BENCHMARK_INTERACTIVE ? 'series' : undefined,
              fill: BENCHMARK_INTERACTIVE ? 'series' : color,
              fillOpacity: 0.25,
              tip: BENCHMARK_INTERACTIVE,
            }),
            Plot.lineY(data, {
              x: 'x',
              y: 'y',
              z: BENCHMARK_INTERACTIVE ? 'series' : undefined,
              stroke: BENCHMARK_INTERACTIVE ? 'series' : color,
            }),
          ],
    })
  })

export const mountScatter: BenchmarkMount = (container, input) =>
  mountPlot(container, input, 'scatter', (nextInput) => {
    const base = options(nextInput)
    return Plot.plot({
      ...base,
      x: {
        ...base.x,
        domain: BENCHMARK_STRESS
          ? [xMinimum(nextInput), xMaximum(nextInput)]
          : [0, Math.max(1, nextInput.rows.length - 1)],
      },
      marks: [
        Plot.dot(visibleRows(nextInput, BENCHMARK_ADVANCED), {
          x: 'x',
          y: 'y',
          fill: BENCHMARK_INTERACTIVE ? 'series' : color,
          r: BENCHMARK_ADVANCED || BENCHMARK_VARIABLE_SIZE ? 'size' : 2,
          tip: BENCHMARK_INTERACTIVE,
        }),
      ],
    })
  })

function plotOutput(
  container: HTMLElement,
  plot: ReturnType<typeof Plot.plot>,
  chartType: BenchmarkChartType,
  input: BenchmarkInput,
) {
  const size = renderedSize(container)
  const viewportClipped = Boolean(
    container.querySelector('clipPath') &&
    container.querySelector('[clip-path]'),
  )
  const xDomainMinimum =
    chartType === 'bar' ? undefined : numericMinimum(plot.scale('x')?.domain)
  const xDomainMaximum =
    chartType === 'bar' ? undefined : numericMaximum(plot.scale('x')?.domain)
  switch (chartType) {
    case 'line': {
      const seriesVertexCounts = BENCHMARK_MULTI_SERIES
        ? pathSeriesVertexCounts(plot, input, 'g[aria-label="line"] path')
        : undefined
      const probedSeriesColors = BENCHMARK_MULTI_SERIES
        ? pathSeriesColors(plot, input, 'g[aria-label="line"] path')
        : undefined
      return {
        ...size,
        viewportClipped,
        vertexCount: seriesVertexCounts
          ? seriesVertexCounts.reduce(
              (total, value) => total + value.vertices,
              0,
            )
          : pathVertexCount(plot, 'g[aria-label="line"] path'),
        pathCount: seriesVertexCounts?.length,
        seriesCount: seriesVertexCounts?.length,
        seriesIdentities: seriesVertexCounts?.map(({ series }) => series),
        seriesVertexCounts,
        seriesColors: probedSeriesColors,
        xDomainMinimum,
        xDomainMaximum,
        xEndpointVisible: BENCHMARK_MULTI_SERIES
          ? plotXEndpointVisible(
              plot,
              'g[aria-label="line"] path',
              xDomainMaximum,
            )
          : pathEndpointVisible(plot, 'g[aria-label="line"] path'),
      }
    }
    case 'area':
      return {
        ...size,
        viewportClipped,
        vertexCount: pathVertexCount(plot, 'g[aria-label="area"] path'),
        xDomainMinimum,
        xDomainMaximum,
        xEndpointVisible: pathRightEdgeVisible(
          plot,
          'g[aria-label="area"] path',
        ),
      }
    case 'bar':
      return {
        ...size,
        viewportClipped,
        itemCount: plot.querySelectorAll('g[aria-label="bar"] rect').length,
      }
    case 'scatter':
      return {
        ...size,
        itemCount: plot.querySelectorAll('g[aria-label="dot"] circle').length,
        xDomainMinimum,
        xDomainMaximum,
        xEndpointVisible: rightmostMarkVisible(
          plot,
          'g[aria-label="dot"] circle',
        ),
      }
  }
}

function multiSeriesFocusRows(input: BenchmarkInput) {
  const series = visibleSeries(input)
  const buckets = new Map<number, Map<string, number>>()
  for (const row of visibleMultiSeriesRows(input)) {
    const bucket = buckets.get(row.x) ?? new Map<string, number>()
    bucket.set(row.series, row.y)
    buckets.set(row.x, bucket)
  }
  return [...buckets]
    .sort(([left], [right]) => left - right)
    .map(([x, values]) => ({
      x,
      title: [
        `x=${x}`,
        ...series.map(
          (name) => `${name}: ${values.get(name)?.toFixed(2) ?? '—'}`,
        ),
      ].join('\n'),
    }))
}

function pathSeriesVertexCounts(
  container: ParentNode,
  input: BenchmarkInput,
  selector: string,
): ReadonlyArray<{ series: string; vertices: number }> {
  const rows = visibleMultiSeriesRows(input)
  return [...container.querySelectorAll<SVGPathElement>(selector)].flatMap(
    (path) => {
      const series = boundDataIndices(path)
        .map((index) => rows[index]?.series)
        .find((value): value is string => typeof value === 'string')
      if (!series) return []
      return [
        {
          series,
          vertices: path.getAttribute('d')?.match(/[MLHVCSQTA]/gi)?.length ?? 0,
        },
      ]
    },
  )
}

function pathSeriesColors(
  container: ParentNode,
  input: BenchmarkInput,
  selector: string,
): ReadonlyArray<{ series: string; color: string }> {
  const rows = visibleMultiSeriesRows(input)
  return [...container.querySelectorAll<SVGPathElement>(selector)].flatMap(
    (path) => {
      const color = path.getAttribute('stroke') ?? getComputedStyle(path).stroke
      const series = boundDataIndices(path)
        .map((index) => rows[index]?.series)
        .find((value): value is string => typeof value === 'string')
      return series ? [{ series, color }] : []
    },
  )
}

function plotLogicalData(
  plot: ParentNode,
  input: BenchmarkInput,
  selector: string,
) {
  return [...plot.querySelectorAll(selector)].flatMap((node) =>
    boundDataIndices(node).flatMap((index) => {
      const row = input.rows[index]
      return row
        ? [
            {
              key: row.id,
              x: row.x,
              y: row.y,
              series: row.series,
              category: row.category,
            },
          ]
        : []
    }),
  )
}

function plotDataNodes(
  plot: ParentNode,
  input: BenchmarkInput,
  selector: string,
) {
  return [...plot.querySelectorAll(selector)].flatMap((node) =>
    boundDataIndices(node).flatMap((index) => {
      const row = input.rows[index]
      return row ? [{ key: row.id, node }] : []
    }),
  )
}

function plotSeriesValuesAtX(
  plot: ParentNode,
  input: BenchmarkInput,
  x: number,
) {
  const rows = visibleMultiSeriesRows(input)
  const values = new Map<string, number>()
  for (const path of plot.querySelectorAll('g[aria-label="line"] path')) {
    for (const index of boundDataIndices(path)) {
      const row = rows[index]
      if (row?.x === x) values.set(row.series, row.y)
    }
  }
  return visibleSeries(input).flatMap((series) => {
    const value = values.get(series)
    return value === undefined ? [] : [{ series, value }]
  })
}

function boundDataIndices(node: Element): readonly number[] {
  const value = Object.getOwnPropertyDescriptor(node, '__data__')?.value
  if (typeof value === 'number' && Number.isInteger(value)) return [value]
  return Array.isArray(value)
    ? value.filter(
        (item): item is number =>
          typeof item === 'number' && Number.isInteger(item),
      )
    : []
}

function plotXEndpointVisible(
  plot: ReturnType<typeof Plot.plot>,
  selector: string,
  xDomainMaximum: number | undefined,
): boolean {
  if (xDomainMaximum === undefined || !(plot instanceof SVGSVGElement)) {
    return false
  }
  const x = plot.scale('x')?.apply(xDomainMaximum)
  const rootMatrix = plot.getScreenCTM()
  if (typeof x !== 'number' || !Number.isFinite(x) || !rootMatrix) return false
  const expected = plot.createSVGPoint()
  expected.x = x
  expected.y = 0
  const expectedScreen = expected.matrixTransform(rootMatrix)
  const outputBounds = plot.getBoundingClientRect()

  for (const path of plot.querySelectorAll<SVGPathElement>(selector)) {
    const matrix = path.getScreenCTM()
    const length = path.getTotalLength()
    if (!matrix || !Number.isFinite(length)) continue
    for (const offset of [0, length]) {
      const local = path.getPointAtLength(offset)
      const point = plot.createSVGPoint()
      point.x = local.x
      point.y = local.y
      const screen = point.matrixTransform(matrix)
      if (
        Math.abs(screen.x - expectedScreen.x) <= 3 &&
        screen.y >= outputBounds.top - 2 &&
        screen.y <= outputBounds.bottom + 2
      ) {
        return true
      }
    }
  }
  return false
}
