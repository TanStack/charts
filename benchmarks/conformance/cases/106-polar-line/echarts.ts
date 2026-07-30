import { LineChart } from 'echarts/charts'
import { AriaComponent, PolarComponent } from 'echarts/components'
import { use } from 'echarts/core'
import { SVGRenderer } from 'echarts/renderers'
import { echartsMount } from '../../shared/echarts-mount'
import { dayOfYearAngle, seattleWeatherYear } from './transform'
import type { WeatherRow } from '@charts-poc/demo-data/weather'
import type { EChartsCoreOption, EChartsType } from 'echarts/core'
import type {
  ConformanceGeometryQuery,
  ConformanceGeometrySample,
  ConformanceInput,
  ConformanceTestDriver,
} from '../../types'

use([LineChart, PolarComponent, AriaComponent, SVGRenderer])

const lineColor = '#0f766e'
const gridColor = '#94a3b8'

export const mount = echartsMount(
  polarLineOption,
  'Seattle daily high-temperature polar line',
  ({ chart, surface, getInput }) => staticLineDriver(chart, surface, getInput),
)

function polarLineOption(input: ConformanceInput): EChartsCoreOption {
  const rows = seattleWeatherYear(input.revision)

  return {
    animation: false,
    aria: {
      enabled: true,
      description:
        'Seattle daily high temperatures arranged around one calendar year.',
    },
    polar: {
      center: ['50%', '50%'],
      radius: '72%',
    },
    angleAxis: {
      type: 'value',
      min: 0,
      max: 360,
      interval: 45,
      startAngle: 90,
      clockwise: true,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { show: false },
      splitLine: {
        show: true,
        lineStyle: {
          color: gridColor,
          opacity: 0.35,
          width: 1,
        },
      },
    },
    radiusAxis: {
      type: 'value',
      min: -10,
      max: 40,
      interval: 10,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { show: false },
      splitLine: {
        show: true,
        lineStyle: {
          color: gridColor,
          opacity: 0.35,
          width: 1,
        },
      },
    },
    series: {
      id: 'polar-line',
      type: 'line',
      coordinateSystem: 'polar',
      data: rows.map((row) => [row.temp_max, dayOfYearAngle(row)]),
      showSymbol: false,
      smooth: false,
      clip: true,
      lineStyle: {
        color: lineColor,
        width: 2.5,
      },
      itemStyle: { color: lineColor },
      emphasis: { disabled: true },
      animation: false,
    },
  }
}

function staticLineDriver(
  chart: EChartsType,
  surface: HTMLDivElement,
  getInput: () => ConformanceInput,
): ConformanceTestDriver {
  return {
    resolveTarget() {
      return null
    },
    readState() {
      return {}
    },
    geometry(query) {
      return lineGeometry(chart, surface, getInput(), query)
    },
    settle() {
      chart.getZr().flush()
    },
  }
}

function lineGeometry(
  chart: EChartsType,
  surface: HTMLDivElement,
  input: ConformanceInput,
  query: ConformanceGeometryQuery,
): readonly ConformanceGeometrySample[] {
  if (
    (query.view !== undefined && query.view !== 'main') ||
    query.role !== 'line'
  ) {
    return []
  }
  const points = seattleWeatherYear(input.revision).flatMap((row) => {
    const point = polarPoint(chart, row)
    return point ? [point] : []
  })
  const sample = pointsBounds(
    points,
    surface.getBoundingClientRect(),
    lineColor,
  )
  return sample ? [sample] : []
}

function polarPoint(
  chart: EChartsType,
  row: WeatherRow,
): readonly [number, number] | null {
  const point = chart.convertToPixel({ seriesIndex: 0 }, [
    row.temp_max,
    dayOfYearAngle(row),
  ])
  if (
    !Array.isArray(point) ||
    point.length < 2 ||
    typeof point[0] !== 'number' ||
    typeof point[1] !== 'number' ||
    !Number.isFinite(point[0]) ||
    !Number.isFinite(point[1])
  ) {
    return null
  }
  return [point[0], point[1]]
}

function pointsBounds(
  points: readonly (readonly [number, number])[],
  surfaceBounds: DOMRect,
  paint: string,
): ConformanceGeometrySample | null {
  if (!points.length) return null
  const xs = points.map(([x]) => x)
  const ys = points.map(([, y]) => y)
  const left = Math.min(...xs)
  const right = Math.max(...xs)
  const top = Math.min(...ys)
  const bottom = Math.max(...ys)
  return {
    x: surfaceBounds.left + left,
    y: surfaceBounds.top + top,
    width: right - left,
    height: bottom - top,
    paint,
  }
}
