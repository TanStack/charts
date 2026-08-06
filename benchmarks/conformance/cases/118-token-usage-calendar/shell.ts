import type {
  ConformanceInput,
  ConformanceMount,
  ConformanceTestDriver,
} from '../../types'
import { calendarChartHeight } from './layout'
import {
  formatTokenUsage,
  tokenUsageCalendar,
  type TokenUsageDay,
} from './model'

export function withTokenActivityShell(
  mountChart: ConformanceMount,
): ConformanceMount {
  return (container, input) => {
    let currentInput = input
    let targetDateKey: string | null = null
    const previousMinHeight = container.style.minHeight
    const document = container.ownerDocument
    const shell = document.createElement('div')
    const chartSurface = document.createElement('div')
    const style = document.createElement('style')

    shell.className = 'token-activity-shell'
    shell.style.boxSizing = 'border-box'
    shell.style.width = '100%'
    shell.style.overflow = 'hidden'

    chartSurface.style.minHeight = '0'
    chartSurface.style.width = '100%'
    style.textContent = `
      .ts-chart-tooltip.token-activity-tooltip {
        max-width: calc(100% - 24px) !important;
        padding: 6px 9px !important;
        border: 1px solid #e5e7eb !important;
        border-radius: 9px !important;
        background: #fff !important;
        color: #202124 !important;
        box-shadow: none !important;
        font: 500 12px/1.25 system-ui, sans-serif !important;
        overflow-wrap: normal !important;
        white-space: nowrap !important;
      }
    `
    shell.append(style, chartSurface)
    container.append(shell)

    resizeShell(container, shell, chartSurface, input)
    const chart = mountChart(chartSurface, chartInput(input))

    const driver: ConformanceTestDriver = {
      resolveTarget(target) {
        targetDateKey = null
        if (target.view && target.view !== 'main') return null
        const dateKey = target.anchor.startsWith('date:')
          ? target.anchor.slice('date:'.length)
          : null
        const days = tokenUsageCalendar(currentInput.revision)
        const index = days.findIndex((day) => day.dateKey === dateKey)
        const cell = calendarCells(chartSurface, days.length)[index]
        if (!cell) return null
        targetDateKey = days[index]?.dateKey ?? null
        const bounds = cell.getBoundingClientRect()
        const chart = chartSurface.querySelector<SVGSVGElement>('svg')
        const resolved = {
          x: bounds.left + bounds.width / 2,
          y: bounds.top + bounds.height / 2,
        }
        return chart ? { ...resolved, focusElement: chart } : resolved
      },
      readState() {
        const days = tokenUsageCalendar(currentInput.revision)
        if (chartSurface.querySelector('svg.ts-chart')) {
          return tanstackInteractionState(document, days, targetDateKey)
        }
        const cells = calendarCells(chartSurface, days.length)
        const index = cells.findIndex((cell) => cell.matches(':hover'))
        const day = days[index]
        return interactionState(day)
      },
    }

    return {
      driver,
      update(nextInput) {
        targetDateKey = null
        currentInput = nextInput
        resizeShell(container, shell, chartSurface, nextInput)
        chart.update(chartInput(nextInput))
      },
      destroy() {
        chart.destroy()
        shell.remove()
        container.style.minHeight = previousMinHeight
      },
    }
  }
}

function chartInput(input: ConformanceInput): ConformanceInput {
  return {
    ...input,
    height: calendarChartHeight(input.width),
  }
}

function resizeShell(
  container: HTMLElement,
  shell: HTMLElement,
  chartSurface: HTMLElement,
  input: ConformanceInput,
) {
  const sceneHeight = calendarChartHeight(input.width)
  const height = input.behavior ? sceneHeight + 120 : sceneHeight
  container.style.minHeight = `${height}px`
  shell.style.height = `${height}px`
  chartSurface.style.height = `${height}px`
}

function calendarCells(
  chartSurface: HTMLElement,
  expectedCount: number,
): SVGRectElement[] {
  const tanstack = [
    ...chartSurface.querySelectorAll<SVGRectElement>(
      'rect[data-ts-key^="rect-0:"]',
    ),
  ]
  if (tanstack.length === expectedCount) return tanstack
  const plot = [
    ...chartSurface.querySelectorAll<SVGRectElement>('.token-usage-cells rect'),
  ]
  return plot.length === expectedCount ? plot : []
}

function tanstackInteractionState(
  document: Document,
  days: readonly TokenUsageDay[],
  targetDateKey: string | null,
) {
  const tooltip = document.querySelector<HTMLElement>('.ts-chart-tooltip')
  const bounds = tooltip?.getBoundingClientRect()
  const style = tooltip && document.defaultView?.getComputedStyle(tooltip)
  const visible = Boolean(
    tooltip &&
    !tooltip.hidden &&
    bounds &&
    bounds.width > 0 &&
    bounds.height > 0 &&
    style?.display !== 'none' &&
    style?.visibility !== 'hidden' &&
    style?.opacity !== '0',
  )
  const text = visible ? (tooltip?.textContent?.trim() ?? '') : ''
  const targetDay = days.find((day) => day.dateKey === targetDateKey)
  const day =
    visible && targetDay && text.includes(formatTokenUsage(targetDay))
      ? targetDay
      : undefined
  return interactionState(day, text)
}

function interactionState(day?: TokenUsageDay, text = '') {
  return {
    focus: { date: day?.dateKey ?? null },
    tooltip: {
      visible: Boolean(day),
      text: text || (day ? formatTokenUsage(day) : ''),
    },
  }
}
