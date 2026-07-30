import { ScatterChart } from 'echarts/charts'
import { AriaComponent, PolarComponent } from 'echarts/components'
import { use } from 'echarts/core'
import { SVGRenderer } from 'echarts/renderers'
import { echartsMount } from '../../shared/echarts-mount'
import { windDirection, windLatitudeBand, windSpeed } from './transform'
import type { WindRow } from '@charts-poc/demo-data/wind'
import type { EChartsCoreOption, EChartsType } from 'echarts/core'
import type {
  ConformanceGeometryQuery,
  ConformanceGeometrySample,
  ConformanceInput,
  ConformanceTestDriver,
} from '../../types'

use([ScatterChart, PolarComponent, AriaComponent, SVGRenderer])

const dotColor = '#e11d48'
const gridColor = '#94a3b8'
const symbolRadius = 4.5

export const mount = echartsMount(
  polarScatterOption,
  'Surface wind polar scatter',
  ({ chart, surface, getInput }) =>
    staticScatterDriver(chart, surface, getInput),
)

function polarScatterOption(input: ConformanceInput): EChartsCoreOption {
  const rows = windLatitudeBand(input.revision)

  return {
    animation: false,
    aria: {
      enabled: true,
      description:
        'Surface wind observations positioned by direction and speed.',
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
      min: 0,
      max: 13,
      interval: 3,
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
      id: 'polar-scatter',
      type: 'scatter',
      coordinateSystem: 'polar',
      data: rows.map((row) => [windSpeed(row), windDirection(row)]),
      symbol: 'circle',
      symbolSize: symbolRadius * 2,
      itemStyle: {
        color: dotColor,
        borderColor: '#ffffff',
        borderWidth: 1,
      },
      emphasis: { disabled: true },
      animation: false,
    },
  }
}

function staticScatterDriver(
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
      return scatterGeometry(chart, surface, getInput(), query)
    },
    settle() {
      chart.getZr().flush()
    },
  }
}

function scatterGeometry(
  chart: EChartsType,
  surface: HTMLDivElement,
  input: ConformanceInput,
  query: ConformanceGeometryQuery,
): readonly ConformanceGeometrySample[] {
  if (
    (query.view !== undefined && query.view !== 'main') ||
    query.role !== 'dot'
  ) {
    return []
  }
  const surfaceBounds = surface.getBoundingClientRect()
  return windLatitudeBand(input.revision).flatMap((row) => {
    const point = polarPoint(chart, row)
    return point
      ? [
          {
            x: surfaceBounds.left + point[0] - symbolRadius,
            y: surfaceBounds.top + point[1] - symbolRadius,
            width: symbolRadius * 2,
            height: symbolRadius * 2,
            paint: dotColor,
          },
        ]
      : []
  })
}

function polarPoint(
  chart: EChartsType,
  row: WindRow,
): readonly [number, number] | null {
  const point = chart.convertToPixel({ seriesIndex: 0 }, [
    windSpeed(row),
    windDirection(row),
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
