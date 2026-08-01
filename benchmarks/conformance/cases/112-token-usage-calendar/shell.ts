import type { ConformanceInput, ConformanceMount } from '../../types'
import { calendarChartHeight } from './layout'

interface TokenActivityShellOptions {
  readonly interactive?: boolean
}

export function withTokenActivityShell(
  mountChart: ConformanceMount,
  options: TokenActivityShellOptions = {},
): ConformanceMount {
  return (container, input) => {
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
      .token-activity-shell .ts-chart__axes text {
        font-size: 13px;
        opacity: 0.62;
      }

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
    const chart = mountChart(chartSurface, chartInput(input, options))
    alignFirstMonthLabel(chartSurface)

    return {
      update(nextInput) {
        resizeShell(container, shell, chartSurface, nextInput)
        chart.update(chartInput(nextInput, options))
        alignFirstMonthLabel(chartSurface)
      },
      destroy() {
        chart.destroy()
        shell.remove()
        container.style.minHeight = previousMinHeight
      },
    }
  }
}

function chartInput(
  input: ConformanceInput,
  options: TokenActivityShellOptions,
): ConformanceInput {
  return {
    ...input,
    height: calendarChartHeight(input.width),
    ...(options.interactive ? { interactive: true } : {}),
  }
}

function alignFirstMonthLabel(chartSurface: HTMLElement) {
  const chart = chartSurface.querySelector<SVGSVGElement>('svg.ts-chart')
  if (!chart) return

  const cells = chart.querySelectorAll<SVGRectElement>(
    'rect[data-ts-key^="rect-0:"]',
  )
  const labels = chart.querySelectorAll<SVGTextElement>('.ts-chart__axes text')
  const firstCell = cells.item(0)
  const firstLabel = labels.item(0)
  if (!firstCell || !firstLabel) return

  const start = Number(firstCell.getAttribute('x'))
  if (!Number.isFinite(start)) return

  firstLabel.setAttribute('x', String(start))
  firstLabel.setAttribute('text-anchor', 'start')
}

function resizeShell(
  container: HTMLElement,
  shell: HTMLElement,
  chartSurface: HTMLElement,
  input: ConformanceInput,
) {
  const height = calendarChartHeight(input.width)
  container.style.minHeight = `${height}px`
  shell.style.height = `${height}px`
  chartSurface.style.height = `${height}px`
}
