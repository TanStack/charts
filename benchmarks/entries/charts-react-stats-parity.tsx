import { Chart } from '@tanstack/react-charts'
import { useMemo } from 'react'
import { defineChart } from '@tanstack/charts'
import { focusGroupX, focusGroupY } from '@tanstack/charts/focus'
import { tooltip } from '@tanstack/charts/tooltip'
import { renderChartSvgWithResources } from '@tanstack/charts/svg/resources'
import {
  createStatsHistoryInput,
  createStatsHistoryChart,
  createStatsLatestInput,
  createStatsLatestChart,
} from '../../packages/charts-fixtures/src/stats-parity'

export function HistoryChart() {
  const definition = useMemo(
    () =>
      defineChart(createStatsHistoryChart(createStatsHistoryInput('stream')), {
        focus: focusGroupX,
        tooltip,
      }),
    [],
  )
  return (
    <Chart
      definition={definition}
      ariaLabel="Package downloads"
      renderSvg={renderChartSvgWithResources}
    />
  )
}

export function RankingChart() {
  const definition = useMemo(
    () =>
      defineChart(
        createStatsLatestChart(createStatsLatestInput('horizontal', true)),
        { focus: focusGroupY, tooltip },
      ),
    [],
  )
  return (
    <Chart
      definition={definition}
      ariaLabel="Package ranking"
      renderSvg={renderChartSvgWithResources}
    />
  )
}
