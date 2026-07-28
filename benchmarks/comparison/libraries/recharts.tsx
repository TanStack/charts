import * as React from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts'
import type { BenchmarkHandle, BenchmarkInput, BenchmarkMount } from '../types'
import { seriesColors, wideRows } from './tier'

declare const BENCHMARK_INTERACTIVE: boolean
declare const BENCHMARK_ADVANCED: boolean
const margin = { top: 16, right: 16, bottom: 32, left: 48 }

function axes(maximum = 100) {
  return (
    <>
      <CartesianGrid />
      <XAxis dataKey="x" type="number" domain={[0, 'dataMax']} tickCount={6} />
      <YAxis domain={[0, maximum]} tickCount={5} />
    </>
  )
}

function interactions() {
  return BENCHMARK_INTERACTIVE ? (
    <>
      <Tooltip isAnimationActive={false} />
      <Legend />
    </>
  ) : null
}

function mountReactChart(
  container: HTMLElement,
  input: BenchmarkInput,
  render: (input: BenchmarkInput) => React.ReactNode,
): BenchmarkHandle {
  const root = createRoot(container)
  const draw = (nextInput: BenchmarkInput) => {
    flushSync(() => {
      root.render(render(nextInput))
    })
  }
  draw(input)

  return {
    update: draw,
    destroy() {
      flushSync(() => root.unmount())
    },
  }
}

export const mountLine: BenchmarkMount = (container, input) =>
  mountReactChart(container, input, (nextInput) => (
    <LineChart
      width={nextInput.width}
      height={nextInput.height}
      data={BENCHMARK_ADVANCED ? wideRows(nextInput) : nextInput.rows}
      margin={margin}
    >
      {axes()}
      {interactions()}
      <Line
        dataKey="y"
        name="Series A"
        stroke={seriesColors[0]}
        strokeWidth={2}
        dot={false}
        type={BENCHMARK_ADVANCED ? 'monotone' : 'linear'}
        isAnimationActive={false}
      />
      {BENCHMARK_ADVANCED ? (
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
  mountReactChart(container, input, (nextInput) => (
    <BarChart
      width={nextInput.width}
      height={nextInput.height}
      data={BENCHMARK_ADVANCED ? wideRows(nextInput) : nextInput.rows}
      margin={margin}
    >
      <CartesianGrid />
      <XAxis dataKey="category" />
      <YAxis domain={[0, BENCHMARK_ADVANCED ? 200 : 100]} tickCount={5} />
      {interactions()}
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
  mountReactChart(container, input, (nextInput) => (
    <AreaChart
      width={nextInput.width}
      height={nextInput.height}
      data={BENCHMARK_ADVANCED ? wideRows(nextInput) : nextInput.rows}
      margin={margin}
    >
      {axes(BENCHMARK_ADVANCED ? 200 : 100)}
      {interactions()}
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
  mountReactChart(container, input, (nextInput) => (
    <ScatterChart
      width={nextInput.width}
      height={nextInput.height}
      margin={margin}
    >
      {axes()}
      {interactions()}
      {BENCHMARK_ADVANCED ? <ZAxis dataKey="size" range={[16, 64]} /> : null}
      <Scatter
        data={nextInput.rows}
        dataKey="y"
        name="Series A"
        fill={seriesColors[0]}
        isAnimationActive={false}
      />
      {BENCHMARK_ADVANCED ? (
        <Scatter
          data={nextInput.secondaryRows}
          dataKey="y"
          name="Series B"
          fill={seriesColors[1]}
          isAnimationActive={false}
        />
      ) : null}
    </ScatterChart>
  ))
