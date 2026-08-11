import { createElement, useEffect, useId, useMemo, useState } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Rectangle,
  Tooltip,
  XAxis,
  YAxis,
  matchByDataKey,
} from 'recharts'
import { applyRechartsAccessibility } from '../../shared/recharts-mount'
import { dashboardRows, metricTotal } from './model'
import type { CSSProperties, ReactNode } from 'react'
import type { BarShapeProps, TooltipValueType } from 'recharts'
import type {
  ConformanceInput,
  ConformanceMount,
  ConformanceTestDriver,
} from '../../types'
import type { DashboardMetric, DashboardRow } from './model'

const metricLabels: Record<DashboardMetric, string> = {
  desktop: 'Desktop',
  mobile: 'Mobile',
}

const tickIds = ['01', '06', '12', '18', '24']

interface ActiveBarReferenceProps {
  input: ConformanceInput
  onMetricChange: (metric: DashboardMetric, total: number) => void
  onFocusChange: (id: string | null) => void
  onAnimationChange: (animating: boolean) => void
}

function ActiveBarReference({
  input,
  onMetricChange,
  onFocusChange,
  onAnimationChange,
}: ActiveBarReferenceProps) {
  const [metric, setMetric] = useState<DashboardMetric>('desktop')
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const rows = dashboardRows(input.revision)
  const reducedMotion = useMemo(prefersReducedMotion, [])
  const gradientId = `recharts-visitor-bars-${useId().replaceAll(':', '')}`
  const maximum = Math.max(...rows.map((row) => row[metric]))

  useEffect(() => {
    onMetricChange(metric, metricTotal(rows, metric))
  }, [metric, onMetricChange, rows])

  const selectMetric = (nextMetric: DashboardMetric) => {
    setMetric(nextMetric)
    onMetricChange(nextMetric, metricTotal(rows, nextMetric))
  }

  const renderBar = (props: BarShapeProps): ReactNode => {
    const row = rows[props.originalDataIndex] ?? rows[props.index]
    return createElement('rect', {
      x: props.x,
      y: props.y,
      width: props.width,
      height: props.height,
      rx: 4,
      ry: 4,
      fill: `url(#${gradientId})`,
      fillOpacity:
        activeIndex === null || activeIndex === props.index ? 1 : 0.26,
      'data-day-id': row?.id,
    })
  }

  const focusIndex = (index: number | null) => {
    setActiveIndex(index)
    onFocusChange(index === null ? null : (rows[index]?.id ?? null))
  }

  const renderActiveBar = (props: BarShapeProps): ReactNode =>
    createElement(Rectangle, {
      x: props.x - 2,
      y: props.y - 2,
      width: props.width + 4,
      height: props.height + 4,
      radius: [6, 6, 2, 2],
      fill: 'transparent',
      stroke: 'var(--ts-chart-1)',
      strokeWidth: 1.5,
    })

  const chart = (width: number, height: number) =>
    createElement(
      BarChart,
      {
        width,
        height,
        data: rows,
        margin: input.preview
          ? { top: 8, right: 18, bottom: 10, left: 18 }
          : { top: 12, right: 8, bottom: 18, left: 8 },
        accessibilityLayer: true,
      },
      [
        createElement(
          'defs',
          { key: 'defs' },
          createElement(
            'linearGradient',
            { id: gradientId, x1: 0, y1: 1, x2: 0, y2: 0 },
            [
              createElement('stop', {
                key: 'start',
                offset: '0%',
                stopColor: 'var(--ts-chart-1)',
                stopOpacity: 0.42,
              }),
              createElement('stop', {
                key: 'end',
                offset: '100%',
                stopColor: 'var(--ts-chart-1)',
                stopOpacity: 0.96,
              }),
            ],
          ),
        ),
        createElement(CartesianGrid, {
          key: 'grid',
          vertical: false,
          stroke: 'currentColor',
          strokeOpacity: 0.1,
        }),
        createElement(XAxis<DashboardRow>, {
          key: 'x',
          dataKey: 'id',
          ticks: tickIds,
          axisLine: false,
          tickLine: false,
          tickMargin: input.preview ? 4 : 8,
          tick: {
            fill: 'currentColor',
            fillOpacity: 0.52,
            fontSize: input.preview ? 8 : 10,
          },
          tickFormatter: (value) =>
            rows.find((row) => row.id === value)?.day ?? '',
        }),
        createElement(YAxis<DashboardRow>, {
          key: 'y',
          hide: true,
          domain: [0, Math.ceil(maximum * 1.12)],
        }),
        createElement(Tooltip, {
          key: 'tooltip',
          active: activeIndex !== null,
          cursor: false,
          contentStyle: {
            color: 'CanvasText',
            background: 'color-mix(in srgb, Canvas 94%, transparent)',
            border: '1px solid color-mix(in srgb, CanvasText 12%, transparent)',
            borderRadius: 10,
            boxShadow:
              '0 12px 34px color-mix(in srgb, CanvasText 14%, transparent)',
            font: '600 12px/1.35 Inter, ui-sans-serif, system-ui, sans-serif',
          },
          formatter: (value: TooltipValueType | undefined) =>
            [
              `${formatTooltipValue(value)} ${metric} visitors`,
              metricLabels[metric],
            ] as [string, string],
          labelFormatter: (label: ReactNode) =>
            rows.find((row) => row.id === String(label))?.day ?? String(label),
        }),
        createElement<React.ComponentProps<typeof Bar<DashboardRow, number>>>(
          Bar,
          {
            key: 'bars',
            dataKey: metric,
            name: metricLabels[metric],
            fill: `url(#${gradientId})`,
            radius: [4, 4, 0, 0],
            shape: renderBar,
            activeBar: renderActiveBar,
            animationMatchBy: matchByDataKey('id'),
            animationDuration: 720,
            animationEasing: 'ease-out',
            isAnimationActive: !reducedMotion,
            onAnimationStart: () => onAnimationChange(true),
            onAnimationEnd: () => onAnimationChange(false),
            onMouseEnter: (_row, index) => focusIndex(index),
          },
        ),
      ],
    )

  if (input.preview) return chart(input.width, input.height)

  const cardStyle: CSSProperties & Record<`--${string}`, string> = {
    '--ts-chart-1': '#7c3aed',
    boxSizing: 'border-box',
    width: input.width,
    height: input.height,
    overflow: 'hidden',
    border: '1px solid color-mix(in srgb, currentColor 12%, transparent)',
    borderRadius: 18,
    color: 'CanvasText',
    background: 'Canvas',
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    boxShadow: '0 18px 55px color-mix(in srgb, CanvasText 7%, transparent)',
  }
  const chartWidth = Math.max(180, input.width - 32)
  const chartHeight = Math.max(150, input.height - 132)

  return createElement(
    'section',
    {
      'data-conformance-view': 'main',
      'aria-label': 'Visitor analytics',
      onMouseLeave: () => focusIndex(null),
      onPointerLeave: () => focusIndex(null),
      style: cardStyle,
    },
    [
      createElement(
        'header',
        {
          key: 'header',
          style: {
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) auto',
            alignItems: 'stretch',
            borderBottom:
              '1px solid color-mix(in srgb, currentColor 10%, transparent)',
          },
        },
        [
          createElement(
            'div',
            { key: 'total', style: { padding: '20px 22px' } },
            [
              createElement(
                'div',
                {
                  key: 'label',
                  style: { fontSize: 13, fontWeight: 650, opacity: 0.64 },
                },
                'Total visitors',
              ),
              createElement(
                'div',
                {
                  key: 'value',
                  style: {
                    marginTop: 3,
                    fontSize: 24,
                    fontWeight: 720,
                    letterSpacing: '-0.04em',
                  },
                },
                metricTotal(rows, metric).toLocaleString('en-US'),
              ),
            ],
          ),
          createElement(
            'div',
            { key: 'controls', style: { display: 'flex' } },
            (['desktop', 'mobile'] as const).map((id) =>
              createElement(
                'button',
                {
                  key: id,
                  type: 'button',
                  'data-metric': id,
                  'aria-pressed': metric === id,
                  onClick: () => selectMetric(id),
                  style: {
                    minWidth: 104,
                    padding: '14px 18px',
                    border: 0,
                    borderLeft:
                      '1px solid color-mix(in srgb, currentColor 10%, transparent)',
                    color: 'inherit',
                    background:
                      metric === id
                        ? 'color-mix(in srgb, currentColor 7%, Canvas)'
                        : 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                  },
                },
                [
                  createElement(
                    'span',
                    {
                      key: 'label',
                      style: {
                        display: 'block',
                        fontSize: 11,
                        opacity: 0.58,
                      },
                    },
                    metricLabels[id],
                  ),
                  createElement(
                    'span',
                    {
                      key: 'value',
                      style: {
                        display: 'block',
                        marginTop: 3,
                        fontSize: 16,
                        fontWeight: 680,
                      },
                    },
                    metricTotal(rows, id).toLocaleString('en-US'),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
      createElement(
        'div',
        { key: 'chart', style: { padding: '14px 16px 16px' } },
        chart(chartWidth, chartHeight),
      ),
    ],
  )
}

export const mount: ConformanceMount = (container, input) => {
  const surface = container.ownerDocument.createElement('div')
  container.append(surface)
  const root = createRoot(surface)
  let currentInput = input
  let metric: DashboardMetric = 'desktop'
  let total = metricTotal(dashboardRows(input.revision), metric)
  let focusedId: string | null = null
  let animating = false

  const render = () => {
    flushSync(() => {
      root.render(
        createElement(ActiveBarReference, {
          input: currentInput,
          onMetricChange(nextMetric, nextTotal) {
            metric = nextMetric
            total = nextTotal
          },
          onFocusChange(nextFocusedId) {
            focusedId = nextFocusedId
          },
          onAnimationChange(nextAnimating) {
            animating = nextAnimating
          },
        }),
      )
    })
    applyRechartsAccessibility(surface, 'Daily visitor totals by device')
  }

  render()

  const driver: ConformanceTestDriver = {
    resolveTarget(target) {
      if (target.view && target.view !== 'main') return null
      const id = target.anchor.startsWith('metric:')
        ? target.anchor.slice('metric:'.length)
        : null
      if (target.anchor.startsWith('day:')) {
        const dayId = target.anchor.slice('day:'.length)
        const bar = surface.querySelector<SVGElement>(
          `[data-day-id="${dayId}"]`,
        )
        return bar ? center(bar) : null
      }
      const button = id
        ? surface.querySelector<HTMLButtonElement>(
            `button[data-metric="${id}"]`,
          )
        : null
      return button ? center(button) : null
    },
    readState() {
      const tooltip = surface.querySelector<HTMLElement>(
        '.recharts-tooltip-wrapper',
      )
      return {
        metric,
        total,
        focusedId,
        tooltip: {
          visible: isTooltipVisible(tooltip),
          text: tooltip?.textContent?.trim() ?? '',
        },
      }
    },
    viewBounds(view) {
      if (view && view !== 'main') return null
      const element =
        surface.querySelector<HTMLElement>('[data-conformance-view="main"]') ??
        surface
      const bounds = element.getBoundingClientRect()
      return {
        x: bounds.left,
        y: bounds.top,
        width: bounds.width,
        height: bounds.height,
      }
    },
    settle: () => settleAnimation(surface, () => animating),
  }

  return {
    driver,
    update(nextInput) {
      currentInput = nextInput
      render()
    },
    destroy() {
      flushSync(() => root.unmount())
      surface.remove()
    },
  }
}

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
  )
}

function formatTooltipValue(value: TooltipValueType | undefined) {
  if (value === undefined) return '0'
  return Array.isArray(value)
    ? value.map(String).join('–')
    : Number(value).toLocaleString('en-US')
}

function isTooltipVisible(tooltip: HTMLElement | null) {
  if (!tooltip) return false
  const view = tooltip.ownerDocument.defaultView
  const style = view?.getComputedStyle(tooltip)
  return style?.visibility !== 'hidden' && style?.opacity !== '0'
}

function center(element: HTMLElement | SVGElement) {
  const bounds = element.getBoundingClientRect()
  return {
    x: bounds.left + bounds.width / 2,
    y: bounds.top + bounds.height / 2,
    focusElement: element,
  }
}

function settleAnimation(
  root: HTMLElement,
  isAnimating: () => boolean,
  timeout = 2_500,
) {
  const view = root.ownerDocument.defaultView
  if (!view || !isAnimating()) return Promise.resolve()
  const started = view.performance.now()
  return new Promise<void>((resolve) => {
    const check = () => {
      if (!isAnimating() || view.performance.now() - started >= timeout) {
        resolve()
        return
      }
      view.requestAnimationFrame(check)
    }
    check()
  })
}
