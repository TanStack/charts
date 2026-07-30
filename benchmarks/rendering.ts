import { performance } from 'node:perf_hooks'
import { JSDOM } from 'jsdom'
import { createPlotRenderer, definePlot } from '../packages/plot/src/index'
import {
  createChartScene,
  defineChart,
  lineY,
  mountChart,
  renderChartSvg,
  type DynamicChartDefinition,
  type StaticChartDefinition,
} from '../packages/charts-core/src/index'
import {
  createChartScene as createD3ChartScene,
  defineChart as defineD3Chart,
  lineY as d3LineY,
  mountChart as mountD3Chart,
  renderChartSvg as renderD3ChartSvg,
  scaleUtc as d3ScaleUtc,
  type StaticChartDefinition as D3StaticChartDefinition,
} from '../packages/charts-core-d3/src/index'
import {
  downloadData,
  downloadsPlot,
  downloadsRenderer,
  latencyData,
  latencyDistributionRenderer,
  type DownloadPoint,
} from '../packages/fixtures/src/index'
import type {
  ChartRenderer,
  ResolvedChartTheme,
} from '../packages/core/src/index'
import { extent, max } from 'd3-array'
import { scaleLinear, scaleUtc } from 'd3-scale'

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  pretendToBeVisual: true,
})
const document = dom.window.document
const theme: ResolvedChartTheme = {
  mode: 'light',
  background: 'transparent',
  foreground: '#18181b',
  muted: '#71717a',
  grid: '#e4e4e7',
  axis: '#71717a',
  tooltipBackground: '#ffffff',
  tooltipForeground: '#18181b',
  focus: '#2563eb',
  selection: '#dbeafe',
  positive: '#15803d',
  negative: '#b91c1c',
  warning: '#b45309',
  neutral: '#71717a',
  categorical: [
    '#2563eb',
    '#7c3aed',
    '#0891b2',
    '#16a34a',
    '#d97706',
    '#db2777',
    '#4f46e5',
    '#0f766e',
  ],
}

const cases = [
  {
    label: 'Trend · 78 points · 320px',
    renderer: downloadsRenderer,
    data: downloadData,
    width: 320,
    height: 330,
  },
  {
    label: 'Trend · 78 points · 1024px',
    renderer: downloadsRenderer,
    data: downloadData,
    width: 1024,
    height: 330,
  },
  {
    label: 'Faceted histogram · 288 points · 320px',
    renderer: latencyDistributionRenderer,
    data: latencyData,
    width: 320,
    height: 360,
  },
  {
    label: 'Faceted histogram · 288 points · 1024px',
    renderer: latencyDistributionRenderer,
    data: latencyData,
    width: 1024,
    height: 360,
  },
] as const

console.log('| Render case | Median | p95 |')
console.log('| --- | ---: | ---: |')

for (const benchmark of cases) {
  const samples = measureRenderer(
    benchmark.renderer as ChartRenderer<unknown>,
    benchmark.data,
    benchmark.width,
    benchmark.height,
  )
  console.log(
    `| ${benchmark.label} | ${formatDuration(percentile(samples, 0.5))} | ${formatDuration(percentile(samples, 0.95))} |`,
  )
}

const nativeDownloads = defineChart({
  marks: [
    lineY(downloadData, {
      id: 'downloads',
      x: 'date',
      y: 'downloads',
      z: 'package',
      key: (point) => `${point.package}:${point.date.toISOString()}`,
    }),
  ],
  x: {
    scale: scaleUtc().domain(downloadData.map((point) => point.date)),
    ticks: 6,
  },
  y: {
    scale: scaleLinear()
      .domain([0, max(downloadData, (point) => point.downloads) ?? 1])
      .nice(5),
    ticks: 5,
  },
})
const largeData = Array.from({ length: 10_000 }, (_, index) => ({
  id: index,
  x: index,
  y: Math.sin(index / 80) * 20 + index / 1_000,
}))
const [largeMinimum = 0, largeMaximum = 1] = extent(
  largeData,
  (point) => point.y,
)
const nativeLarge = defineChart({
  marks: [
    lineY(largeData, {
      x: 'x',
      y: 'y',
      key: 'id',
    }),
  ],
  x: { scale: scaleLinear().domain([0, largeData.length - 1]) },
  y: { scale: scaleLinear().domain([largeMinimum, largeMaximum]) },
})
const d3Downloads = defineD3Chart({
  marks: [
    d3LineY(downloadData, {
      id: 'downloads',
      x: 'date',
      y: 'downloads',
      z: 'package',
      key: (point) => `${point.package}:${point.date.toISOString()}`,
    }),
  ],
  x: { type: d3ScaleUtc(), ticks: 6 },
  y: { ticks: 5 },
})
const d3Large = defineD3Chart({
  marks: [
    d3LineY(largeData, {
      x: 'x',
      y: 'y',
      key: 'id',
    }),
  ],
})

for (const benchmark of [
  {
    label: 'Product D3-scale line + SVG · 78 points · 320px',
    definition: nativeDownloads,
    width: 320,
    height: 330,
    svg: true,
  },
  {
    label: 'Product D3-scale line + SVG · 78 points · 1024px',
    definition: nativeDownloads,
    width: 1024,
    height: 330,
    svg: true,
  },
  {
    label: 'Product D3-scale line scene · 10,000 points · 1024px',
    definition: nativeLarge,
    width: 1024,
    height: 400,
    svg: false,
  },
  {
    label: 'Product D3-scale line + SVG · 10,000 points · 1024px',
    definition: nativeLarge,
    width: 1024,
    height: 400,
    svg: true,
  },
] as const) {
  const samples = measureNative(
    benchmark.definition,
    benchmark.width,
    benchmark.height,
    benchmark.svg,
  )
  console.log(
    `| ${benchmark.label} | ${formatDuration(percentile(samples, 0.5))} | ${formatDuration(percentile(samples, 0.95))} |`,
  )
}

for (const benchmark of [
  {
    label: 'Historical D3 fork line + SVG · 78 points · 320px',
    definition: d3Downloads,
    width: 320,
    height: 330,
    svg: true,
  },
  {
    label: 'Historical D3 fork line + SVG · 78 points · 1024px',
    definition: d3Downloads,
    width: 1024,
    height: 330,
    svg: true,
  },
  {
    label: 'Historical D3 fork line scene · 10,000 points · 1024px',
    definition: d3Large,
    width: 1024,
    height: 400,
    svg: false,
  },
  {
    label: 'Historical D3 fork line + SVG · 10,000 points · 1024px',
    definition: d3Large,
    width: 1024,
    height: 400,
    svg: true,
  },
] as const) {
  const samples = measureD3(
    benchmark.definition,
    benchmark.width,
    benchmark.height,
    benchmark.svg,
  )
  console.log(
    `| ${benchmark.label} | ${formatDuration(percentile(samples, 0.5))} | ${formatDuration(percentile(samples, 0.95))} |`,
  )
}

const alternateDownloadData = downloadData.map((point, index) => ({
  ...point,
  downloads: Math.round(point.downloads * (0.94 + (index % 5) * 0.025)),
}))
const statefulTrendRenderer = createPlotRenderer(
  definePlot<
    { points: readonly DownloadPoint[] },
    unknown,
    readonly DownloadPoint[]
  >({
    prepare: (input) => input.points,
    plot: (context) =>
      downloadsPlot({
        ...context,
        data: context.prepared as DownloadPoint[],
      }),
  }),
)
const updateSamples = measureStatefulUpdates(
  statefulTrendRenderer,
  [{ points: downloadData }, { points: alternateDownloadData }],
  1024,
  330,
)
console.log(
  `| Stateful trend update · 78 points · 1024px | ${formatDuration(percentile(updateSamples, 0.5))} | ${formatDuration(percentile(updateSamples, 0.95))} |`,
)

const createNativeDynamicDefinition = (input: {
  points: readonly DownloadPoint[]
}) =>
  defineChart(() => {
    const maximum = max(input.points, (point) => point.downloads) ?? 1
    return {
      marks: [
        lineY(input.points, {
          id: 'downloads',
          x: 'date',
          y: 'downloads',
          z: 'package',
          key: (point) => `${point.package}:${point.date.toISOString()}`,
        }),
      ],
      x: {
        scale: scaleUtc().domain(input.points.map((point) => point.date)),
        ticks: 6,
      },
      y: {
        scale: scaleLinear().domain([0, maximum]).nice(5),
        ticks: 5,
      },
    }
  })
const nativeUpdateSamples = measureNativeHostUpdates(
  createNativeDynamicDefinition,
  [{ points: downloadData }, { points: alternateDownloadData }],
  1024,
  330,
)
console.log(
  `| Product D3-scale keyed host update · 78 points · 1024px | ${formatDuration(percentile(nativeUpdateSamples, 0.5))} | ${formatDuration(percentile(nativeUpdateSamples, 0.95))} |`,
)
const d3DynamicDefinition = defineD3Chart<{
  points: readonly DownloadPoint[]
}>()(({ input }) => ({
  marks: [
    d3LineY(input.points, {
      id: 'downloads',
      x: 'date',
      y: 'downloads',
      z: 'package',
      key: (point) => `${point.package}:${point.date.toISOString()}`,
    }),
  ],
  x: { type: d3ScaleUtc(), ticks: 6 },
  y: { ticks: 5 },
}))
const d3UpdateSamples = measureD3HostUpdates(
  d3DynamicDefinition,
  [{ points: downloadData }, { points: alternateDownloadData }],
  1024,
  330,
)
console.log(
  `| Historical D3 fork keyed host update · 78 points · 1024px | ${formatDuration(percentile(d3UpdateSamples, 0.5))} | ${formatDuration(percentile(d3UpdateSamples, 0.95))} |`,
)

function measureRenderer(
  renderer: ChartRenderer<unknown>,
  data: unknown,
  width: number,
  height: number,
): number[] {
  const container = document.createElement('div')
  document.body.append(container)
  const samples: number[] = []

  for (let index = 0; index < 35; index++) {
    const startedAt = performance.now()
    const result = renderer({
      container,
      data,
      document,
      reducedMotion: false,
      signal: new AbortController().signal,
      theme,
      width,
      height,
    })
    const duration = performance.now() - startedAt
    result.destroy?.()
    result.element.remove()
    if (index >= 5) samples.push(duration)
  }

  container.remove()
  return samples.sort((left, right) => left - right)
}

function measureStatefulUpdates<TInput>(
  renderer: ChartRenderer<TInput>,
  inputs: readonly [TInput, TInput],
  width: number,
  height: number,
): number[] {
  const container = document.createElement('div')
  document.body.append(container)
  const context = {
    container,
    data: inputs[0],
    document,
    reducedMotion: false,
    signal: new AbortController().signal,
    theme,
    width,
    height,
  }
  const result = renderer(context)
  const samples: number[] = []

  for (let index = 0; index < 35; index++) {
    const startedAt = performance.now()
    result.update?.(
      {
        ...context,
        data: inputs[(index + 1) % 2]!,
        signal: new AbortController().signal,
      },
      { reason: 'update' },
    )
    const duration = performance.now() - startedAt
    if (index >= 5) samples.push(duration)
  }

  result.destroy?.()
  result.element.remove()
  container.remove()
  return samples.sort((left, right) => left - right)
}

function measureNative(
  definition: StaticChartDefinition,
  width: number,
  height: number,
  svg: boolean,
): number[] {
  const samples: number[] = []

  for (let index = 0; index < 35; index++) {
    const startedAt = performance.now()
    const scene = createChartScene(definition, { width, height })
    if (svg) renderChartSvg(scene, { ariaLabel: 'Benchmark' })
    const duration = performance.now() - startedAt
    if (index >= 5) samples.push(duration)
  }

  return samples.sort((left, right) => left - right)
}

function measureD3(
  definition: D3StaticChartDefinition,
  width: number,
  height: number,
  svg: boolean,
): number[] {
  const samples: number[] = []

  for (let index = 0; index < 35; index++) {
    const startedAt = performance.now()
    const scene = createD3ChartScene(definition, { width, height })
    if (svg) renderD3ChartSvg(scene, { ariaLabel: 'Benchmark' })
    const duration = performance.now() - startedAt
    if (index >= 5) samples.push(duration)
  }

  return samples.sort((left, right) => left - right)
}

function measureNativeHostUpdates<TInput>(
  createDefinition: (input: TInput) => DynamicChartDefinition<unknown>,
  inputs: readonly [TInput, TInput],
  width: number,
  height: number,
): number[] {
  const container = document.createElement('div')
  document.body.append(container)
  const options = {
    definition: createDefinition(inputs[0]),
    width,
    height,
    ariaLabel: 'Benchmark',
  }
  const host = mountChart(container, options)
  const samples: number[] = []

  for (let index = 0; index < 35; index++) {
    const startedAt = performance.now()
    host.update({
      ...options,
      definition: createDefinition(inputs[(index + 1) % 2]),
    })
    const duration = performance.now() - startedAt
    if (index >= 5) samples.push(duration)
  }

  host.destroy()
  container.remove()
  return samples.sort((left, right) => left - right)
}

function measureD3HostUpdates<TInput>(
  definition: Parameters<typeof mountD3Chart<unknown, TInput>>[1]['definition'],
  inputs: readonly [TInput, TInput],
  width: number,
  height: number,
): number[] {
  const container = document.createElement('div')
  document.body.append(container)
  const options = {
    definition,
    input: inputs[0],
    width,
    height,
    ariaLabel: 'Benchmark',
  }
  const host = mountD3Chart(container, options)
  const samples: number[] = []

  for (let index = 0; index < 35; index++) {
    const startedAt = performance.now()
    host.update({
      ...options,
      input: inputs[(index + 1) % 2],
    })
    const duration = performance.now() - startedAt
    if (index >= 5) samples.push(duration)
  }

  host.destroy()
  container.remove()
  return samples.sort((left, right) => left - right)
}

function percentile(samples: number[], fraction: number): number {
  return samples[
    Math.min(samples.length - 1, Math.floor(samples.length * fraction))
  ]
}

function formatDuration(duration: number): string {
  return `${duration.toFixed(2)} ms`
}
