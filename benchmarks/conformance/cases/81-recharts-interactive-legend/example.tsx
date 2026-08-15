import { useMemo, useState } from 'react'
import { colorLegend, defineChart, lineY } from '@tanstack/charts'
import { controlledSignal } from '@tanstack/charts/interaction/signal'
import { interactiveColorLegend } from '@tanstack/charts/legend'
import { Chart } from '@tanstack/charts/react'
import { industries } from '@tanstack/charts-data/industries'
import { scaleLinear, scaleUtc } from 'd3-scale'
import { legendRows, legendSeries } from './model'
import type { LegendSeriesId } from './model'

export interface ExampleProps {
  width?: number
  height?: number
  revision?: number
}

export const yDomain = [0, 900] as const
export const initialVisibleSeries: readonly LegendSeriesId[] = [
  'Manufacturing',
  'Construction',
]
export const seriesColors: Readonly<Record<LegendSeriesId, string>> = {
  Manufacturing: '#2563eb',
  Construction: '#f97316',
}

export function interactiveLegendDefinition(
  revision: number,
  visibleSeries: readonly LegendSeriesId[],
  onVisibleSeriesChange: (visible: readonly LegendSeriesId[]) => void,
) {
  const rows = legendRows(industries, revision)
  return defineChart(
    {
      marks: [
        lineY(rows, {
          id: 'industry-lines',
          x: 'date',
          y: 'unemployed',
          color: 'industry',
          strokeWidth: 2.5,
        }),
      ],
      x: {
        scale: scaleUtc,
        axis: {
          ticks: {
            format: (date) =>
              date.toLocaleDateString('en-US', {
                month: 'short',
                timeZone: 'UTC',
              }),
          },
        },
      },
      y: {
        scale: scaleLinear().domain(yDomain),
        grid: true,
        axis: { ticks: { count: 5 }, label: 'Unemployed (thousands)' },
      },
      color: {
        domain: legendSeries.map((series) => series.id),
        range: legendSeries.map((series) => seriesColors[series.id]),
        legend: interactiveColorLegend({
          visible: controlledSignal(visibleSeries, onVisibleSeriesChange),
          placement: 'bottom',
          ariaLabel: 'Series visibility',
        }),
      },
      margin: { top: 20, right: 24, left: 62 },
    },
    { keyboard: true },
  )
}

export default function Example({
  width = 640,
  height = 480,
  revision = 0,
}: ExampleProps = {}) {
  const [visibleSeries, setVisibleSeries] = useState(initialVisibleSeries)
  const definition = useMemo(
    () =>
      interactiveLegendDefinition(revision, visibleSeries, setVisibleSeries),
    [revision, visibleSeries],
  )

  return (
    <Chart
      definition={definition}
      width={width}
      height={height}
      ariaLabel="Manufacturing and construction unemployment chart"
    />
  )
}

export function interactiveLegendPreviewDefinition(revision: number) {
  const rows = legendRows(industries, revision)
  return defineChart({
    marks: [
      lineY(rows, {
        id: 'industry-lines',
        x: 'date',
        y: 'unemployed',
        color: 'industry',
        strokeWidth: 2.5,
      }),
    ],
    x: { scale: scaleUtc },
    y: { scale: scaleLinear().domain(yDomain) },
    color: {
      domain: legendSeries.map((series) => series.id),
      range: legendSeries.map((series) => seriesColors[series.id]),
      legend: colorLegend({ label: 'Series', placement: 'bottom' }),
    },
    margin: 0,
  })
}
