import { Chart } from '@tanstack/react-charts'
import { focusX, focusY } from '@tanstack/charts/focus'
import { renderChartSvgWithResources } from '@tanstack/charts/svg/resources'
import {
  createStatsHistoryInput,
  createStatsLatestInput,
  statsHistoryChart,
  statsLatestChart,
} from '../../packages/charts-fixtures/src/stats-parity'

export function HistoryChart() {
  return (
    <Chart
      definition={statsHistoryChart}
      input={createStatsHistoryInput('stream')}
      ariaLabel="Package downloads"
      focus={focusX}
      renderSvg={renderChartSvgWithResources}
      tooltip
    />
  )
}

export function RankingChart() {
  return (
    <Chart
      definition={statsLatestChart}
      input={createStatsLatestInput('horizontal', true)}
      ariaLabel="Package ranking"
      focus={focusY}
      renderSvg={renderChartSvgWithResources}
      tooltip
    />
  )
}
