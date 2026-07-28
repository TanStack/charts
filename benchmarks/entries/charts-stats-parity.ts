import { mountChart } from '@tanstack/charts'
import { focusX, focusY } from '@tanstack/charts/focus'
import { renderChartSvgWithResources } from '@tanstack/charts/svg/resources'
import {
  createStatsHistoryInput,
  createStatsLatestInput,
  statsHistoryChart,
  statsLatestChart,
} from '../../packages/charts-fixtures/src/stats-parity'

export function mountHistory(element: HTMLElement) {
  return mountChart(element, {
    definition: statsHistoryChart,
    input: createStatsHistoryInput('stream'),
    ariaLabel: 'Package downloads',
    focus: focusX,
    renderSvg: renderChartSvgWithResources,
    tooltip: true,
  })
}

export function mountRanking(element: HTMLElement) {
  return mountChart(element, {
    definition: statsLatestChart,
    input: createStatsLatestInput('horizontal', true),
    ariaLabel: 'Package ranking',
    focus: focusY,
    renderSvg: renderChartSvgWithResources,
    tooltip: true,
  })
}
