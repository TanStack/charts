import * as Plot from '@observablehq/plot'
import type { BenchmarkHandle, BenchmarkInput, BenchmarkMount } from '../types'
import { seriesColors, visibleRows } from './tier'

declare const BENCHMARK_INTERACTIVE: boolean
declare const BENCHMARK_ADVANCED: boolean
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
          domain: [...seriesDomain],
          range: [...seriesColors],
          legend: true,
        }
      : undefined,
  }
}

function mountPlot(
  container: HTMLElement,
  input: BenchmarkInput,
  render: (input: BenchmarkInput) => HTMLElement | SVGSVGElement,
): BenchmarkHandle {
  let element = render(input)
  container.append(element)

  return {
    update(nextInput) {
      const nextElement = render(nextInput)
      element.replaceWith(nextElement)
      element = nextElement
    },
    destroy() {
      element.remove()
    },
  }
}

export const mountLine: BenchmarkMount = (container, input) =>
  mountPlot(container, input, (nextInput) => {
    const base = options(nextInput)
    return Plot.plot({
      ...base,
      x: {
        ...base.x,
        domain: [0, Math.max(1, nextInput.rows.length - 1)],
      },
      marks: [
        Plot.lineY(visibleRows(nextInput, BENCHMARK_ADVANCED), {
          x: 'x',
          y: 'y',
          z: BENCHMARK_INTERACTIVE ? 'series' : undefined,
          stroke: BENCHMARK_INTERACTIVE ? 'series' : color,
          curve: BENCHMARK_ADVANCED ? 'catmull-rom' : 'linear',
          tip: BENCHMARK_INTERACTIVE,
        }),
      ],
    })
  })

export const mountBar: BenchmarkMount = (container, input) =>
  mountPlot(container, input, (nextInput) => {
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
  mountPlot(container, input, (nextInput) => {
    const base = options(nextInput, BENCHMARK_ADVANCED ? 200 : 100)
    const data = visibleRows(nextInput, BENCHMARK_ADVANCED)
    return Plot.plot({
      ...base,
      x: {
        ...base.x,
        domain: [0, Math.max(1, nextInput.rows.length - 1)],
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
  mountPlot(container, input, (nextInput) => {
    const base = options(nextInput)
    return Plot.plot({
      ...base,
      x: {
        ...base.x,
        domain: [0, Math.max(1, nextInput.rows.length - 1)],
      },
      marks: [
        Plot.dot(visibleRows(nextInput, BENCHMARK_ADVANCED), {
          x: 'x',
          y: 'y',
          fill: BENCHMARK_INTERACTIVE ? 'series' : color,
          r: BENCHMARK_ADVANCED ? 'size' : 2,
          tip: BENCHMARK_INTERACTIVE,
        }),
      ],
    })
  })
