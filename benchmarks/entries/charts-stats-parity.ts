import { defineChart, mountChart } from '@tanstack/charts'
import { focusX, focusY } from '@tanstack/charts/focus'
import { tooltip } from '@tanstack/charts/tooltip'
import { renderChartSvgWithResources } from '@tanstack/charts/svg/resources'
import {
  createStatsHistoryInput,
  createStatsHistoryChart,
  createStatsLatestInput,
  createStatsLatestChart,
} from '../../packages/charts-fixtures/src/stats-parity'

export function mountHistory(element: HTMLElement) {
  return mountChart(element, {
    definition: defineChart(
      createStatsHistoryChart(createStatsHistoryInput('stream')),
      { focus: focusX, tooltip },
    ),
    ariaLabel: 'Package downloads',
    renderSvg: renderChartSvgWithResources,
  })
}

export function mountRanking(element: HTMLElement) {
  return mountChart(element, {
    definition: defineChart(
      createStatsLatestChart(createStatsLatestInput('horizontal', true)),
      { focus: focusY, tooltip },
    ),
    ariaLabel: 'Package ranking',
    renderSvg: renderChartSvgWithResources,
  })
}
