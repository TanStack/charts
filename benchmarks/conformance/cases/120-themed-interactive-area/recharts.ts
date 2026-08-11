import {
  createElement,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  Tooltip,
  XAxis,
  YAxis,
  matchByDataKey,
} from 'recharts'
import { applyRechartsAccessibility } from '../../shared/recharts-mount'
import {
  createBoundedAnimationTracker,
  rechartsAreaAnimationDuration,
} from './animation'
import {
  formatThemedAreaTick,
  themedAreaRangeDays,
  themedAreaRanges,
  themedAreaRows,
} from './model'
import type { CSSProperties, ReactNode } from 'react'
import type { TooltipValueType } from 'recharts'
import type {
  ConformanceInput,
  ConformanceMount,
  ConformanceTestDriver,
} from '../../types'
import type { ThemedAreaRange, ThemedAreaRow } from './model'

interface RechartsAreaRow extends ThemedAreaRow {
  time: number
}

interface AreaDotProps {
  cx?: number
  cy?: number
  payload?: RechartsAreaRow
}

interface ThemedAreaReferenceProps {
  input: ConformanceInput
  onStateChange: (
    range: ThemedAreaRange,
    rows: readonly RechartsAreaRow[],
    focusedId: string | null,
  ) => void
  onAnimationChange: (animating: boolean) => void
}

function ThemedAreaReference({
  input,
  onStateChange,
  onAnimationChange,
}: ThemedAreaReferenceProps) {
  const [range, setRange] = useState<ThemedAreaRange>('30d')
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const onAnimationChangeRef = useRef(onAnimationChange)
  onAnimationChangeRef.current = onAnimationChange
  const animationTracker = useRef<ReturnType<
    typeof createBoundedAnimationTracker
  > | null>(null)
  const reducedMotion = useMemo(prefersReducedMotion, [])
  const gradientId = `recharts-themed-area-${useId().replaceAll(':', '')}`
  const rows = useMemo(
    () =>
      themedAreaRows(range, input.revision).map((row) => ({
        ...row,
        time: row.date.getTime(),
      })),
    [input.revision, range],
  )
  const maximum = Math.max(...rows.map((row) => row.visitors))
  const yMaximum = Math.max(500, Math.ceil((maximum * 1.08) / 100) * 100)
  const dateTicks = evenlySpacedTimes(rows, input.preview ? 3 : 5)

  useEffect(() => {
    onStateChange(range, rows, focusedId)
  }, [focusedId, onStateChange, range, rows])

  useEffect(
    () => () => {
      animationTracker.current?.dispose()
      animationTracker.current = null
    },
    [],
  )

  const selectRange = (nextRange: ThemedAreaRange) => {
    const nextRows = themedAreaRows(nextRange, input.revision).map((row) => ({
      ...row,
      time: row.date.getTime(),
    }))
    setRange(nextRange)
    setFocusedId(null)
    onStateChange(nextRange, nextRows, null)
  }

  const focus = (id: string | null) => {
    setFocusedId(id)
    onStateChange(range, rows, id)
  }

  const startAnimation = () => {
    if (!animationTracker.current) {
      animationTracker.current = createBoundedAnimationTracker((animating) =>
        onAnimationChangeRef.current(animating),
      )
    }
    animationTracker.current.start()
  }
  const endAnimation = () => animationTracker.current?.end()

  const renderPoint = ({ cx, cy, payload }: AreaDotProps): ReactNode => {
    if (cx === undefined || cy === undefined || !payload) return null
    const active = payload.id === focusedId
    return createElement('circle', {
      className: 'recharts-dot',
      cx,
      cy,
      r: active ? 5 : 7,
      fill: 'var(--themed-area-accent)',
      fillOpacity: active ? 1 : 0,
      stroke: 'var(--themed-area-surface)',
      strokeOpacity: active ? 1 : 0,
      strokeWidth: 2,
      pointerEvents: 'all',
      'data-date-id': payload.id,
      onPointerEnter: () => focus(payload.id),
      onPointerMove: () => focus(payload.id),
    })
  }

  const chart = (width: number, height: number) =>
    createElement(
      AreaChart,
      {
        width,
        height,
        data: rows,
        margin: input.preview
          ? { top: 10, right: 18, bottom: 6, left: 18 }
          : { top: 12, right: 18, bottom: 12, left: 18 },
        accessibilityLayer: true,
      },
      [
        createElement(
          'defs',
          { key: 'defs' },
          createElement(
            'linearGradient',
            { id: gradientId, x1: 0, y1: 0, x2: 0, y2: 1 },
            [
              createElement('stop', {
                key: 'top',
                offset: '0%',
                stopColor: 'var(--themed-area-accent)',
                stopOpacity: 0.34,
              }),
              createElement('stop', {
                key: 'middle',
                offset: '58%',
                stopColor: 'var(--themed-area-accent)',
                stopOpacity: 0.13,
              }),
              createElement('stop', {
                key: 'bottom',
                offset: '100%',
                stopColor: 'var(--themed-area-accent)',
                stopOpacity: 0.015,
              }),
            ],
          ),
        ),
        createElement(CartesianGrid, {
          key: 'grid',
          vertical: false,
          horizontalValues: [0, yMaximum / 3, (yMaximum * 2) / 3, yMaximum],
          stroke: 'var(--themed-area-grid)',
          strokeOpacity: 0.11,
        }),
        createElement(XAxis<RechartsAreaRow>, {
          key: 'x',
          type: 'number',
          dataKey: 'time',
          scale: 'time',
          domain: [rows[0]?.time ?? 0, rows.at(-1)?.time ?? 1],
          ticks: dateTicks,
          axisLine: false,
          tickLine: false,
          tickMargin: input.preview ? 5 : 8,
          tick: {
            fill: 'var(--themed-area-muted)',
            fontSize: input.preview ? 8 : 10,
          },
          tickFormatter: (value) => formatThemedAreaTick(new Date(value)),
        }),
        createElement(YAxis<RechartsAreaRow>, {
          key: 'y',
          hide: true,
          domain: [0, yMaximum],
          ticks: [0, yMaximum / 3, (yMaximum * 2) / 3, yMaximum],
        }),
        createElement(Tooltip, {
          key: 'tooltip',
          active: focusedId !== null,
          cursor: {
            stroke: 'var(--themed-area-grid)',
            strokeOpacity: 0.34,
            strokeWidth: 1,
            strokeDasharray: '3 4',
            fill: 'transparent',
          },
          contentStyle: {
            padding: '7px 9px',
            color: 'var(--themed-area-foreground)',
            background:
              'color-mix(in srgb, var(--themed-area-surface) 94%, transparent)',
            border: '1px solid var(--themed-area-border)',
            borderRadius: 8,
            boxShadow: '0 8px 24px rgba(15, 23, 42, 0.13)',
            font: '600 11px/1.35 var(--font-sans, ui-sans-serif, system-ui, sans-serif)',
            backdropFilter: 'blur(8px)',
          },
          formatter: (value: TooltipValueType | undefined) =>
            [`${formatTooltipValue(value)} visitors`, ''] as [string, string],
          labelFormatter: (label: ReactNode) =>
            formatFullDate(new Date(Number(label))),
        }),
        createElement(Area, {
          key: 'area',
          type: 'monotone',
          dataKey: 'visitors',
          baseValue: 0,
          fill: `url(#${gradientId})`,
          fillOpacity: 1,
          stroke: 'none',
          tooltipType: 'none',
          dot: false,
          activeDot: false,
          animationMatchBy: matchByDataKey('id'),
          animationDuration: rechartsAreaAnimationDuration,
          animationEasing: 'ease-out',
          isAnimationActive: !reducedMotion,
          onAnimationStart: startAnimation,
          onAnimationEnd: endAnimation,
        }),
        createElement(Line, {
          key: 'line',
          type: 'monotone',
          dataKey: 'visitors',
          stroke: 'var(--themed-area-accent)',
          strokeWidth: input.preview ? 2 : 2.4,
          dot: renderPoint,
          activeDot: false,
          animationMatchBy: matchByDataKey('id'),
          animationDuration: rechartsAreaAnimationDuration,
          animationEasing: 'ease-out',
          isAnimationActive: !reducedMotion,
          onAnimationStart: startAnimation,
          onAnimationEnd: endAnimation,
        }),
      ],
    )

  if (input.preview) return chart(input.width, input.height)

  const compact = input.width < 420
  const chartHeight = Math.max(120, input.height - (compact ? 96 : 76))
  const cardStyle: CSSProperties & Record<`--${string}`, string> = {
    '--themed-area-surface': 'var(--chart-surface, Canvas)',
    '--themed-area-foreground': 'var(--chart-foreground, CanvasText)',
    '--themed-area-muted': 'var(--chart-muted, GrayText)',
    '--themed-area-grid': 'var(--chart-grid, CanvasText)',
    '--themed-area-border':
      'var(--chart-border, color-mix(in srgb, CanvasText 11%, transparent))',
    '--themed-area-accent': 'var(--chart-accent, light-dark(#2563eb, #60a5fa))',
    boxSizing: 'border-box',
    display: 'grid',
    gridTemplateRows: 'auto minmax(0, 1fr)',
    width: input.width,
    height: input.height,
    overflow: 'hidden',
    color: 'var(--themed-area-foreground)',
    background: 'var(--themed-area-surface)',
    border: '1px solid var(--themed-area-border)',
    borderRadius: 16,
    boxShadow:
      '0 1px 2px rgba(15, 23, 42, 0.04), 0 16px 36px rgba(15, 23, 42, 0.07)',
    fontFamily:
      'var(--font-sans, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)',
  }

  return createElement(
    'section',
    {
      'data-conformance-view': 'main',
      'data-range': range,
      'aria-label': 'Daily visitors with selectable date range',
      onMouseLeave: () => focus(null),
      onPointerLeave: () => focus(null),
      style: cardStyle,
    },
    [
      createElement(
        'header',
        {
          key: 'header',
          style: {
            display: 'flex',
            alignItems: compact ? 'flex-start' : 'center',
            flexDirection: compact ? 'column' : 'row',
            justifyContent: 'space-between',
            gap: compact ? 10 : 16,
            padding: compact ? '14px 14px 6px' : '18px 20px 8px',
          },
        },
        [
          createElement('div', { key: 'heading' }, [
            createElement(
              'h2',
              {
                key: 'title',
                style: {
                  margin: 0,
                  fontSize: 14,
                  fontWeight: 650,
                  letterSpacing: '-0.012em',
                  lineHeight: 1.25,
                },
              },
              'Traffic',
            ),
            createElement(
              'p',
              {
                key: 'description',
                style: {
                  margin: '4px 0 0',
                  color: 'var(--themed-area-muted)',
                  fontSize: 11,
                  lineHeight: 1.3,
                },
              },
              'Daily visitors',
            ),
          ]),
          createElement(
            'div',
            {
              key: 'controls',
              role: 'group',
              'aria-label': 'Date range',
              style: {
                display: 'inline-flex',
                flex: 'none',
                width: compact ? '100%' : undefined,
                gap: 2,
                padding: 3,
                background:
                  'color-mix(in srgb, var(--themed-area-foreground) 5%, transparent)',
                border: '1px solid var(--themed-area-border)',
                borderRadius: 9,
              },
            },
            themedAreaRanges.map((id) =>
              createElement(
                'button',
                {
                  key: id,
                  type: 'button',
                  'data-range-control': id,
                  'aria-label': `Last ${themedAreaRangeDays[id]} days`,
                  'aria-pressed': range === id,
                  onClick: () => selectRange(id),
                  style: {
                    flex: compact ? 1 : undefined,
                    minWidth: 38,
                    minHeight: 30,
                    padding: '0 9px',
                    color:
                      range === id
                        ? 'var(--themed-area-foreground)'
                        : 'var(--themed-area-muted)',
                    background:
                      range === id
                        ? 'var(--themed-area-surface)'
                        : 'transparent',
                    border: 0,
                    borderRadius: 6,
                    boxShadow:
                      range === id
                        ? '0 1px 3px rgba(15, 23, 42, 0.11)'
                        : 'none',
                    cursor: 'pointer',
                    font: '600 10px/1 var(--font-sans, ui-sans-serif, system-ui, sans-serif)',
                  },
                },
                id.toUpperCase(),
              ),
            ),
          ),
        ],
      ),
      createElement(
        'div',
        { key: 'chart', style: { minWidth: 0, minHeight: 0 } },
        chart(input.width, chartHeight),
      ),
    ],
  )
}

export const mount: ConformanceMount = (container, input) => {
  const surface = container.ownerDocument.createElement('div')
  container.append(surface)
  const root = createRoot(surface)
  let currentInput = input
  let range: ThemedAreaRange = '30d'
  let rows = themedAreaRows(range, input.revision).map((row) => ({
    ...row,
    time: row.date.getTime(),
  }))
  let focusedId: string | null = null
  let animating = false

  const render = () => {
    flushSync(() => {
      root.render(
        createElement(ThemedAreaReference, {
          input: currentInput,
          onStateChange(nextRange, nextRows, nextFocusedId) {
            range = nextRange
            rows = [...nextRows]
            focusedId = nextFocusedId
          },
          onAnimationChange(nextAnimating) {
            animating = nextAnimating
          },
        }),
      )
    })
    applyRechartsAccessibility(
      surface,
      'Daily visitors with selectable 7, 30, and 90 day ranges',
    )
  }

  render()

  const driver: ConformanceTestDriver = {
    resolveTarget(target) {
      if (target.view && target.view !== 'main') return null
      if (target.anchor.startsWith('control:')) {
        const id = target.anchor.slice('control:'.length)
        const button = surface.querySelector<HTMLButtonElement>(
          `button[data-range-control="${id}"]`,
        )
        return button ? center(button) : null
      }
      if (!target.anchor.startsWith('date:')) return null
      const id = target.anchor.slice('date:'.length)
      const point = surface.querySelector<SVGCircleElement>(
        `circle[data-date-id="${id}"]`,
      )
      return point ? center(point) : null
    },
    readState() {
      const tooltip = surface.querySelector<HTMLElement>(
        '.recharts-tooltip-wrapper',
      )
      return {
        range,
        rowCount: rows.length,
        firstId: rows[0]?.id ?? null,
        lastId: rows.at(-1)?.id ?? null,
        expectedDays: themedAreaRangeDays[range],
        focusedId,
        tooltip: {
          visible: isTooltipVisible(tooltip),
          text: tooltip?.textContent?.trim() ?? '',
        },
        motionState: animating ? 'running' : 'finished',
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

function evenlySpacedTimes(rows: readonly RechartsAreaRow[], count: number) {
  const first = rows[0]?.time ?? 0
  const last = rows.at(-1)?.time ?? first
  return Array.from(
    { length: count },
    (_value, index) => first + ((last - first) * index) / (count - 1),
  )
}

function formatFullDate(date: Date) {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function formatTooltipValue(value: TooltipValueType | undefined) {
  if (value === undefined) return '0'
  return Array.isArray(value)
    ? value.map(String).join('–')
    : Number(value).toLocaleString('en-US')
}

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
  )
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
