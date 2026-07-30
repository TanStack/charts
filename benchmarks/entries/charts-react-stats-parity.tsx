import { Chart } from '@tanstack/react-charts'
import { useMemo } from 'react'
import { focusX, focusY } from '@tanstack/charts/focus'
import { renderChartSvgWithResources } from '@tanstack/charts/svg/resources'
import {
  createStatsHistoryInput,
  createStatsHistoryChart,
  createStatsLatestInput,
  createStatsLatestChart,
} from '../../packages/charts-fixtures/src/stats-parity'

export function HistoryChart() {
  const definition = useMemo(
    () => createStatsHistoryChart(createStatsHistoryInput('stream')),
    [],
  )
  return (
    <Chart
      definition={definition}
      ariaLabel="Package downloads"
      focus={focusX}
      renderSvg={renderChartSvgWithResources}
      tooltip
    />
  )
}

export function RankingChart() {
  const definition = useMemo(
    () => createStatsLatestChart(createStatsLatestInput('horizontal', true)),
    [],
  )
  return (
    <Chart
      definition={definition}
      ariaLabel="Package ranking"
      focus={focusY}
      renderSvg={renderChartSvgWithResources}
      tooltip
    />
  )
}
