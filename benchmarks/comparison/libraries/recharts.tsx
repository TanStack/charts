import * as React from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  DefaultTooltipContent,
  Legend,
  Line,
  LineChart,
  Scatter,
  ScatterChart,
  Tooltip,
  type TooltipContentProps,
  useXAxisDomain,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts'
import type {
  BenchmarkChartType,
  BenchmarkDatum,
  BenchmarkHandle,
  BenchmarkInput,
  BenchmarkMount,
} from '../types'
import { createFrameOperation } from '../stress/operation'
import {
  groupedVisibleSeriesRows,
  multiSeriesWideRows,
  pathEndpointVisible,
  pathRightEdgeVisible,
  pathVertexCount,
  renderedSize,
  rightmostMarkVisible,
  seriesColor,
  seriesColors,
  visibleSeries,
  wideRows,
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
const margin = { top: 16, right: 16, bottom: 32, left: 48 }

interface RechartsInstrumentation {
  captureDomain: (domain: readonly unknown[] | undefined) => void
  captureTooltip: (tooltip: CapturedTooltip) => void
}

interface CapturedTooltip {
  active: boolean
  label: string | number | undefined
  values: ReadonlyArray<{ series: string; value: number }>
}

function DomainProbe({
  capture,
}: {
  capture: RechartsInstrumentation['captureDomain']
}) {
  const domain = useXAxisDomain()
  React.useLayoutEffect(() => {
    capture(domain)
  }, [capture, domain])
  return null
}

function axes(
  input: BenchmarkInput,
  instrumentation: RechartsInstrumentation,
  maximum = 100,
) {
  return (
    <>
      <CartesianGrid />
      <XAxis
        dataKey="x"
        type="number"
        domain={
          BENCHMARK_STRESS ? [xMinimum(input), xMaximum(input)] : [0, 'dataMax']
        }
        {...(BENCHMARK_STRESS
          ? { allowDataOverflow: Boolean(input.xDomain) }
          : undefined)}
        tickCount={6}
      />
      <YAxis domain={[0, maximum]} tickCount={5} />
      {BENCHMARK_STRESS ? (
        <DomainProbe capture={instrumentation.captureDomain} />
      ) : null}
    </>
  )
}

function interactions(instrumentation: RechartsInstrumentation) {
  return BENCHMARK_INTERACTIVE ? (
    <>
      <Tooltip
        isAnimationActive={false}
        content={
          BENCHMARK_GROUPED_X_FOCUS
            ? (props: TooltipContentProps) => {
                instrumentation.captureTooltip({
                  active: props.active,
                  label: props.label,
                  values: props.payload.flatMap(({ name, value }) =>
                    typeof name === 'string' &&
                    typeof value === 'number' &&
                    Number.isFinite(value)
                      ? [{ series: name, value }]
                      : [],
                  ),
                })
                return <DefaultTooltipContent {...props} />
              }
            : undefined
        }
      />
      {BENCHMARK_MULTI_SERIES ? null : <Legend />}
    </>
  ) : null
}

function VariableRadiusPoint({
  cx,
  cy,
  fill,
  payload,
}: {
  cx?: number
  cy?: number
  fill?: string
  payload?: BenchmarkDatum
}) {
  if (cx === undefined || cy === undefined || !payload) return null
  return <circle cx={cx} cy={cy} r={payload.size} fill={fill} />
}

function RollingPoint({
  cx,
  cy,
  fill,
  className,
  payload,
}: {
  cx?: number
  cy?: number
  fill?: string
  className?: string
  payload?: BenchmarkDatum
}) {
  if (cx === undefined || cy === undefined || !payload) return null
  return (
    <circle
      className={`${className ?? ''} recharts-scatter-symbol`.trim()}
      cx={cx}
      cy={cy}
      r={2}
      fill={fill}
      data-benchmark-key={payload.id}
      data-benchmark-x={payload.x}
      data-benchmark-y={payload.y}
      data-benchmark-series={payload.series}
      data-benchmark-category={payload.category}
    />
  )
}

function mountReactChart(
  container: HTMLElement,
  input: BenchmarkInput,
  chartType: BenchmarkChartType,
  render: (
    input: BenchmarkInput,
    instrumentation: RechartsInstrumentation,
  ) => React.ReactNode,
): BenchmarkHandle {
  const root = createRoot(container)
  let currentInput = input
  let xDomain: readonly [number, number] | undefined
  let tooltip: CapturedTooltip = {
    active: false,
    label: undefined,
    values: [],
  }
  const instrumentation: RechartsInstrumentation = {
    captureDomain(domain) {
      const first = domain?.[0]
      const last = domain?.at(-1)
      xDomain =
        typeof first === 'number' &&
        Number.isFinite(first) &&
        typeof last === 'number' &&
        Number.isFinite(last)
          ? [first, last]
          : undefined
    },
    captureTooltip(nextTooltip) {
      tooltip = nextTooltip
    },
  }
  const draw = (nextInput: BenchmarkInput) => {
    flushSync(() => {
      root.render(render(nextInput, instrumentation))
    })
  }
  draw(input)

  return {
    ...(BENCHMARK_STRESS ? { ready: createFrameOperation() } : undefined),
    ...(BENCHMARK_STRESS
      ? {
          output: {
            read: () =>
              rechartsOutput(container, chartType, currentInput, xDomain),
            ...(BENCHMARK_ROLLING_WINDOW
              ? {
                  readData: () => rechartsLogicalData(container),
                  readDataNodes: () => rechartsDataNodes(container),
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
                const path = container.querySelector<SVGPathElement>(
                  '.recharts-line-curve',
                )
                const matrix = path?.getScreenCTM()
                const length = path?.getTotalLength()
                const svg = path?.ownerSVGElement
                const selection = rechartsGroupedPointerTarget(
                  currentInput,
                  fraction,
                )
                if (
                  !path ||
                  !matrix ||
                  !svg ||
                  !selection ||
                  length === undefined ||
                  !Number.isFinite(length)
                ) {
                  return undefined
                }
                const local = path.getPointAtLength(
                  selection.hitRegionRatio * length,
                )
                const start = path.getPointAtLength(0)
                const end = path.getPointAtLength(length)
                const point = svg.createSVGPoint()
                point.x = local.x
                point.y = local.y
                const screen = point.matrixTransform(matrix)
                point.x = start.x
                point.y = start.y
                const screenStart = point.matrixTransform(matrix)
                point.x = end.x
                point.y = end.y
                const screenEnd = point.matrixTransform(matrix)
                return {
                  x:
                    screenStart.x +
                    (screenEnd.x - screenStart.x) * selection.hitRegionRatio,
                  y: screen.y,
                  focusX: selection.row.x,
                }
              }
              const points = container.querySelectorAll<SVGGraphicsElement>(
                '.recharts-scatter-symbol, .recharts-symbols path, .recharts-symbols circle',
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
              const tooltip = container.querySelector<HTMLElement>(
                '.recharts-tooltip-wrapper',
              )
              return Boolean(
                tooltip &&
                tooltip.style.visibility !== 'hidden' &&
                tooltip.textContent?.trim(),
              )
            },
            signature() {
              return container
                .querySelector<HTMLElement>('.recharts-tooltip-wrapper')
                ?.textContent?.trim()
            },
            seriesIdentities() {
              return tooltip.active
                ? tooltip.values.map(({ series }) => series)
                : []
            },
            seriesValues() {
              return tooltip.active ? tooltip.values : []
            },
            focusedX() {
              const value = Number(tooltip.label)
              return Number.isFinite(value) ? value : undefined
            },
          },
        }
      : undefined),
    update(nextInput) {
      currentInput = nextInput
      draw(nextInput)
      return BENCHMARK_STRESS ? createFrameOperation() : undefined
    },
    destroy() {
      flushSync(() => root.unmount())
    },
  }
}

export const mountLine: BenchmarkMount = (container, input) =>
  mountReactChart(container, input, 'line', (nextInput, instrumentation) => (
    <LineChart
      width={nextInput.width}
      height={nextInput.height}
      data={
        BENCHMARK_MULTI_SERIES
          ? multiSeriesWideRows(nextInput)
          : BENCHMARK_ADVANCED
            ? wideRows(nextInput)
            : nextInput.rows
      }
      margin={margin}
    >
      {axes(nextInput, instrumentation)}
      {interactions(instrumentation)}
      {BENCHMARK_MULTI_SERIES ? (
        visibleSeries(nextInput).map((series) => (
          <Line
            key={series}
            dataKey={series}
            name={series}
            stroke={seriesColor(nextInput, series)}
            strokeWidth={2}
            dot={false}
            type="linear"
            isAnimationActive={false}
          />
        ))
      ) : (
        <Line
          dataKey="y"
          name="Series A"
          stroke={seriesColors[0]}
          strokeWidth={2}
          dot={false}
          type={BENCHMARK_ADVANCED ? 'monotone' : 'linear'}
          isAnimationActive={false}
        />
      )}
      {!BENCHMARK_MULTI_SERIES && BENCHMARK_ADVANCED ? (
        <Line
          dataKey="yB"
          name="Series B"
          stroke={seriesColors[1]}
          strokeWidth={2}
          dot={false}
          type="monotone"
          isAnimationActive={false}
        />
      ) : null}
    </LineChart>
  ))

export const mountBar: BenchmarkMount = (container, input) =>
  mountReactChart(container, input, 'bar', (nextInput, instrumentation) => (
    <BarChart
      width={nextInput.width}
      height={nextInput.height}
      data={BENCHMARK_ADVANCED ? wideRows(nextInput) : nextInput.rows}
      margin={margin}
    >
      <CartesianGrid />
      <XAxis dataKey="category" />
      <YAxis domain={[0, BENCHMARK_ADVANCED ? 200 : 100]} tickCount={5} />
      {interactions(instrumentation)}
      <Bar
        dataKey="y"
        name="Series A"
        fill={seriesColors[0]}
        stackId={BENCHMARK_ADVANCED ? 'combined' : undefined}
        isAnimationActive={false}
      />
      {BENCHMARK_ADVANCED ? (
        <Bar
          dataKey="yB"
          name="Series B"
          fill={seriesColors[1]}
          stackId="combined"
          isAnimationActive={false}
        />
      ) : null}
    </BarChart>
  ))

export const mountArea: BenchmarkMount = (container, input) =>
  mountReactChart(container, input, 'area', (nextInput, instrumentation) => (
    <AreaChart
      width={nextInput.width}
      height={nextInput.height}
      data={BENCHMARK_ADVANCED ? wideRows(nextInput) : nextInput.rows}
      margin={margin}
    >
      {axes(nextInput, instrumentation, BENCHMARK_ADVANCED ? 200 : 100)}
      {interactions(instrumentation)}
      <Area
        dataKey="y"
        name="Series A"
        stroke={seriesColors[0]}
        fill={seriesColors[0]}
        fillOpacity={0.25}
        stackId={BENCHMARK_ADVANCED ? 'combined' : undefined}
        type={BENCHMARK_ADVANCED ? 'monotone' : 'linear'}
        isAnimationActive={false}
      />
      {BENCHMARK_ADVANCED ? (
        <Area
          dataKey="yB"
          name="Series B"
          stroke={seriesColors[1]}
          fill={seriesColors[1]}
          fillOpacity={0.25}
          stackId="combined"
          type="monotone"
          isAnimationActive={false}
        />
      ) : null}
    </AreaChart>
  ))

export const mountScatter: BenchmarkMount = (container, input) =>
  mountReactChart(container, input, 'scatter', (nextInput, instrumentation) => (
    <ScatterChart
      width={nextInput.width}
      height={nextInput.height}
      margin={margin}
    >
      {axes(nextInput, instrumentation)}
      {interactions(instrumentation)}
      {BENCHMARK_ADVANCED && !BENCHMARK_VARIABLE_SIZE ? (
        <ZAxis dataKey="size" range={[16, 64]} />
      ) : null}
      <Scatter
        data={nextInput.rows}
        dataKey="y"
        name="Series A"
        fill={seriesColors[0]}
        shape={
          BENCHMARK_ROLLING_WINDOW ? (
            <RollingPoint />
          ) : BENCHMARK_VARIABLE_SIZE ? (
            <VariableRadiusPoint />
          ) : undefined
        }
        isAnimationActive={false}
      />
      {BENCHMARK_ADVANCED ? (
        <Scatter
          data={nextInput.secondaryRows}
          dataKey="y"
          name="Series B"
          fill={seriesColors[1]}
          shape={BENCHMARK_VARIABLE_SIZE ? <VariableRadiusPoint /> : undefined}
          isAnimationActive={false}
        />
      ) : null}
    </ScatterChart>
  ))

function rechartsOutput(
  container: HTMLElement,
  chartType: BenchmarkChartType,
  input: BenchmarkInput,
  xDomain: readonly [number, number] | undefined,
) {
  const size = renderedSize(container)
  const viewportClipped = Boolean(
    container.querySelector('clipPath') &&
    container.querySelector('[clip-path]'),
  )
  switch (chartType) {
    case 'line': {
      const seriesPaths = BENCHMARK_MULTI_SERIES
        ? rechartsLineSeriesProbe(container, input)
        : undefined
      const seriesVertexCounts = seriesPaths?.map(({ series, vertices }) => ({
        series,
        vertices,
      }))
      const probedSeriesColors = seriesPaths?.flatMap(({ series, color }) =>
        color ? [{ series, color }] : [],
      )
      return {
        ...size,
        viewportClipped,
        vertexCount: seriesVertexCounts
          ? seriesVertexCounts.reduce(
              (total, value) => total + value.vertices,
              0,
            )
          : pathVertexCount(container, '.recharts-line-curve'),
        pathCount: seriesVertexCounts?.length,
        seriesCount: seriesVertexCounts?.length,
        seriesIdentities: seriesVertexCounts?.map(({ series }) => series),
        seriesVertexCounts,
        seriesColors: probedSeriesColors,
        xDomainMinimum: xDomain?.[0],
        xDomainMaximum: xDomain?.[1],
        xEndpointVisible: pathEndpointVisible(
          container,
          '.recharts-line-curve',
        ),
      }
    }
    case 'area':
      return {
        ...size,
        viewportClipped,
        vertexCount: pathVertexCount(container, '.recharts-area-curve'),
        xDomainMinimum: xDomain?.[0],
        xDomainMaximum: xDomain?.[1],
        xEndpointVisible: pathRightEdgeVisible(
          container,
          '.recharts-area-curve',
        ),
      }
    case 'bar':
      return {
        ...size,
        itemCount: container.querySelectorAll('.recharts-bar-rectangle').length,
      }
    case 'scatter':
      return {
        ...size,
        viewportClipped,
        itemCount: rechartsScatterItemCount(container),
        xDomainMinimum: xDomain?.[0],
        xDomainMaximum: xDomain?.[1],
        xEndpointVisible: rightmostMarkVisible(
          container,
          '.recharts-scatter-symbol',
        ),
      }
  }
}

export function rechartsScatterItemCount(container: ParentNode) {
  return Array.from(
    container.querySelectorAll('.recharts-scatter-symbol'),
  ).filter(
    (symbol) => !symbol.parentElement?.closest('.recharts-scatter-symbol'),
  ).length
}

export function rechartsGroupedPointerTarget(
  input: BenchmarkInput,
  fraction: number,
) {
  const rows = groupedVisibleSeriesRows(input)[0]?.[1]
  const row =
    rows?.[
      Math.round(
        Math.max(0, Math.min(1, fraction)) * Math.max(0, rows.length - 1),
      )
    ]
  if (!row) return undefined
  const domainMinimum = xMinimum(input)
  const domainMaximum = xMaximum(input)
  const domainSpan = domainMaximum - domainMinimum
  const upperNeighbor = rows?.reduce<BenchmarkDatum | undefined>(
    (nearest, candidate) =>
      candidate.x > row.x && (nearest === undefined || candidate.x < nearest.x)
        ? candidate
        : nearest,
    undefined,
  )
  const lowerNeighbor = rows?.reduce<BenchmarkDatum | undefined>(
    (nearest, candidate) =>
      candidate.x < row.x && (nearest === undefined || candidate.x > nearest.x)
        ? candidate
        : nearest,
    undefined,
  )
  const hitRegionNeighbor = upperNeighbor ?? lowerNeighbor
  const hitRegionX =
    row.x +
    // Stay inside the selected tick's Voronoi interval while avoiding the
    // lower boundary produced by browser coordinate quantization.
    ((hitRegionNeighbor?.x ?? row.x) - row.x) * 0.4
  return {
    row,
    domainRatio: domainSpan === 0 ? 0 : (row.x - domainMinimum) / domainSpan,
    hitRegionRatio:
      domainSpan === 0 ? 0 : (hitRegionX - domainMinimum) / domainSpan,
  }
}

export function rechartsLineSeriesProbe(
  container: ParentNode,
  input: BenchmarkInput,
): ReadonlyArray<{ series: string; vertices: number; color?: string }> {
  const order = new Map(
    visibleSeries(input).map((series, index) => [series, index]),
  )
  return [...container.querySelectorAll<SVGPathElement>('.recharts-line-curve')]
    .flatMap((path) => {
      const series = path.getAttribute('name')
      if (!series) return []
      const color = path.getAttribute('stroke')
      return [
        {
          series,
          vertices: path.getAttribute('d')?.match(/[MLHVCSQTA]/gi)?.length ?? 0,
          ...(color ? { color } : undefined),
        },
      ]
    })
    .sort((left, right) => {
      const leftIndex = order.get(left.series) ?? Number.MAX_SAFE_INTEGER
      const rightIndex = order.get(right.series) ?? Number.MAX_SAFE_INTEGER
      return leftIndex - rightIndex
    })
}

function rechartsLogicalData(container: ParentNode) {
  return [...container.querySelectorAll('[data-benchmark-key]')].flatMap(
    (node) => {
      const key = Number(node.getAttribute('data-benchmark-key'))
      const x = Number(node.getAttribute('data-benchmark-x'))
      const y = Number(node.getAttribute('data-benchmark-y'))
      const series = node.getAttribute('data-benchmark-series')
      const category = node.getAttribute('data-benchmark-category')
      return Number.isFinite(key) &&
        Number.isFinite(x) &&
        Number.isFinite(y) &&
        series !== null &&
        category !== null
        ? [{ key, x, y, series, category }]
        : []
    },
  )
}

function rechartsDataNodes(container: ParentNode) {
  return [...container.querySelectorAll('[data-benchmark-key]')].flatMap(
    (node) => {
      const key = Number(node.getAttribute('data-benchmark-key'))
      return Number.isFinite(key) ? [{ key, node }] : []
    },
  )
}
