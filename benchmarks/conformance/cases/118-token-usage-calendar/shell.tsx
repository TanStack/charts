import { forwardRef, useImperativeHandle, useLayoutEffect, useRef } from 'react'
import { reactMount } from '../../shared/react-mount'
import { calendarChartHeight } from './layout'
import {
  formatTokenUsage,
  tokenUsageCalendar,
  type TokenUsageDay,
} from './model'
import type {
  ConformanceHandle,
  ConformanceInput,
  ConformanceMount,
  ConformanceTestDriver,
} from '../../types'
import type { ReactConformanceProps } from '../../shared/react-mount'

export function withTokenActivityShell(
  mountChart: ConformanceMount,
): ConformanceMount {
  const TokenActivityShell = forwardRef<
    ConformanceTestDriver,
    ReactConformanceProps
  >(function TokenActivityShell({ input }, ref) {
    const chartSurfaceRef = useRef<HTMLDivElement>(null)
    const chartRef = useRef<ConformanceHandle>(null)
    const inputRef = useRef(input)
    const renderedInputRef = useRef<ConformanceInput | null>(null)
    const targetDateKeyRef = useRef<string>(null)
    inputRef.current = input
    const sceneHeight = calendarChartHeight(input.width)
    const height = input.behavior ? sceneHeight + 120 : sceneHeight

    useLayoutEffect(() => {
      const chartSurface = chartSurfaceRef.current
      if (!chartSurface) return
      const chart = mountChart(chartSurface, chartInput(inputRef.current))
      chartRef.current = chart
      renderedInputRef.current = inputRef.current
      return () => {
        chartRef.current = null
        chart.destroy()
      }
    }, [])

    useLayoutEffect(() => {
      if (renderedInputRef.current === input) return
      targetDateKeyRef.current = null
      chartRef.current?.update(chartInput(input))
      renderedInputRef.current = input
    }, [input])

    useImperativeHandle(
      ref,
      () => ({
        resolveTarget(target) {
          targetDateKeyRef.current = null
          const chartSurface = chartSurfaceRef.current
          if (!chartSurface || (target.view && target.view !== 'main')) {
            return null
          }
          const dateKey = target.anchor.startsWith('date:')
            ? target.anchor.slice('date:'.length)
            : null
          const days = tokenUsageCalendar(inputRef.current.revision)
          const index = days.findIndex((day) => day.dateKey === dateKey)
          const cell = calendarCells(chartSurface, days.length)[index]
          if (!cell) return null
          targetDateKeyRef.current = days[index]?.dateKey ?? null
          const bounds = cell.getBoundingClientRect()
          const chart = chartSurface.querySelector<SVGSVGElement>('svg')
          const resolved = {
            x: bounds.left + bounds.width / 2,
            y: bounds.top + bounds.height / 2,
          }
          return chart ? { ...resolved, focusElement: chart } : resolved
        },
        readState() {
          const chartSurface = chartSurfaceRef.current
          if (!chartSurface) return interactionState()
          const days = tokenUsageCalendar(inputRef.current.revision)
          if (chartSurface.querySelector('svg.ts-chart')) {
            return tanstackInteractionState(
              chartSurface.ownerDocument,
              days,
              targetDateKeyRef.current,
            )
          }
          const cells = calendarCells(chartSurface, days.length)
          const index = cells.findIndex((cell) => cell.matches(':hover'))
          return interactionState(days[index])
        },
      }),
      [],
    )

    return (
      <div
        className="token-activity-shell"
        style={{
          boxSizing: 'border-box',
          width: '100%',
          height,
          overflow: 'hidden',
        }}
      >
        <style>{`
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
        `}</style>
        <div
          ref={chartSurfaceRef}
          style={{ minHeight: 0, width: '100%', height }}
        />
      </div>
    )
  })

  return reactMount(TokenActivityShell)
}

function chartInput(input: ConformanceInput): ConformanceInput {
  return {
    ...input,
    height: calendarChartHeight(input.width),
  }
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
