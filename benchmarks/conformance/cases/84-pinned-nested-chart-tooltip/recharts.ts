import { createElement, useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
} from 'recharts'
import {
  energyColors,
  energyMonths,
  energyTooltipContent,
  isEnergyMonthId,
} from './model'
import {
  EnergyTooltipBody,
  EnergyTooltipSummary,
  energyTooltipStyles,
} from './tooltip-body'
import type { ChartPoint } from '@tanstack/charts'
import type {
  FocusEvent as ReactFocusEvent,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from 'react'
import type {
  ConformanceInput,
  ConformanceMount,
  ConformanceTarget,
} from '../../types'
import type { EnergyMonth, EnergyMonthId } from './model'

interface InteractionState {
  focusedMonth: EnergyMonthId | null
}

interface EnergyChartProps {
  input: ConformanceInput
  onInteractionChange: (state: InteractionState) => void
}

interface EnergyDotProps {
  cx?: number
  cy?: number
  payload?: EnergyMonth
}

function EnergyChart({ input, onInteractionChange }: EnergyChartProps) {
  const viewRef = useRef<HTMLDivElement>(null)
  const chartFocusRef = useRef<HTMLDivElement>(null)
  const pointElements = useRef(new Map<EnergyMonthId, SVGCircleElement>())
  const suppressFocusRef = useRef(false)
  const [hoveredId, setHoveredId] = useState<EnergyMonthId | null>(null)
  const [focusedId, setFocusedId] = useState<EnergyMonthId | null>(null)
  const [pinnedId, setPinnedId] = useState<EnergyMonthId | null>(null)
  const rows = energyMonths(input.revision)
  const activeId = pinnedId ?? focusedId ?? hoveredId
  const activeMonth = rows.find((month) => month.id === activeId) ?? null
  const pinned = activeMonth !== null && pinnedId === activeMonth.id
  const chartHeight = Math.max(1, input.height - 46)

  useEffect(() => {
    onInteractionChange({ focusedMonth: activeId })
  }, [activeId, onInteractionChange])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const document = view.ownerDocument
    const handleClick = (event: MouseEvent) => {
      const bounds = view.getBoundingClientRect()
      if (
        event.clientX < bounds.left ||
        event.clientX > bounds.right ||
        event.clientY < bounds.top ||
        event.clientY > bounds.bottom
      ) {
        return
      }
      const id = monthIdAtPointer(
        event.target,
        event.clientX,
        event.clientY,
        pointElements.current,
      )
      if (id) setPinnedId((current) => (current === id ? null : id))
    }
    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  }, [])

  const togglePinned = (id: EnergyMonthId) => {
    setPinnedId((current) => (current === id ? null : id))
  }

  const dismiss = () => {
    if (!activeId) return
    const invokingId = activeId
    setPinnedId(null)
    setHoveredId(null)
    setFocusedId(null)
    suppressFocusRef.current = true
    const restoreFocus = () => {
      chartFocusRef.current?.focus()
      suppressFocusRef.current = false
    }
    const view =
      pointElements.current.get(invokingId)?.ownerDocument.defaultView
    if (view?.requestAnimationFrame) view.requestAnimationFrame(restoreFocus)
    else restoreFocus()
  }

  const renderPoint = ({ cx, cy, payload }: EnergyDotProps): ReactNode => {
    if (cx === undefined || cy === undefined || !payload) return null
    const id = payload.id
    const isPinned = id === pinnedId
    const isActive = id === activeId
    return createElement('circle', {
      className: 'recharts-dot',
      id: `energy-month-${id}`,
      cx,
      cy,
      r: isActive ? 7 : 4.5,
      fill: energyColors.generation,
      stroke: 'Canvas',
      strokeWidth: isActive ? 3 : 1.5,
      'data-month-id': id,
      ref: (element: SVGCircleElement | null) => {
        if (element) pointElements.current.set(id, element)
        else pointElements.current.delete(id)
      },
      role: 'option',
      'aria-label': `${payload.month}: ${payload.consumption} kilowatt-hours consumed and ${payload.generation} generated`,
      'aria-selected': isPinned,
      style: { cursor: 'pointer', transition: 'r 160ms ease' },
    })
  }

  return createElement(
    'div',
    {
      ref: viewRef,
      'data-conformance-view': 'main',
      role: 'region',
      tabIndex: -1,
      'aria-label': 'Monthly household energy with an expanding pinned tooltip',
      onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => {
        if (pinnedId) return
        setHoveredId(monthIdFromEventTarget(event.target))
      },
      onPointerLeave: () => setHoveredId(null),
      onKeyDown: (event: ReactKeyboardEvent<HTMLDivElement>) => {
        if (event.key !== 'Escape' || !pinnedId) return
        event.stopPropagation()
        dismiss()
      },
      style: {
        position: 'relative',
        width: `${input.width}px`,
        height: `${input.height}px`,
        color: 'CanvasText',
      },
    },
    [
      createElement('style', { key: 'tooltip-styles' }, energyTooltipStyles),
      createElement(
        'header',
        {
          key: 'header',
          style: {
            display: 'flex',
            minHeight: '40px',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: '16px',
            padding: '3px 18px 0 52px',
            font: '500 12px/1.3 system-ui, sans-serif',
          },
        },
        [
          createElement(
            'strong',
            { key: 'title', style: { fontSize: '14px', fontWeight: 680 } },
            'Household energy',
          ),
          createElement(
            'span',
            { key: 'period', style: { opacity: 0.58 } },
            '2025 · kWh',
          ),
        ],
      ),
      createElement(
        'div',
        {
          key: 'chart-focus',
          ref: chartFocusRef,
          role: 'listbox',
          tabIndex: 0,
          'aria-label': 'Monthly household energy',
          'aria-orientation': 'horizontal',
          'aria-activedescendant': activeId
            ? `energy-month-${activeId}`
            : undefined,
          onFocus: (event: ReactFocusEvent<HTMLDivElement>) => {
            if (
              event.target !== event.currentTarget ||
              suppressFocusRef.current
            ) {
              return
            }
            setFocusedId(
              (current) => current ?? pinnedId ?? rows[0]?.id ?? null,
            )
          },
          onBlur: (event: ReactFocusEvent<HTMLDivElement>) => {
            const NodeConstructor =
              event.currentTarget.ownerDocument.defaultView?.Node
            if (
              NodeConstructor &&
              event.relatedTarget instanceof NodeConstructor &&
              event.currentTarget.contains(event.relatedTarget)
            ) {
              return
            }
            if (!pinnedId) setFocusedId(null)
          },
          onKeyDown: (event: ReactKeyboardEvent<HTMLDivElement>) => {
            if (event.key === 'Escape' && pinnedId) {
              event.preventDefault()
              event.stopPropagation()
              dismiss()
              return
            }
            if (event.key === 'Enter' || event.key === ' ') {
              const id = focusedId ?? pinnedId ?? rows[0]?.id
              if (!id) return
              event.preventDefault()
              togglePinned(id)
              return
            }
            const direction =
              event.key === 'ArrowRight'
                ? 1
                : event.key === 'ArrowLeft'
                  ? -1
                  : 0
            if (!direction) return
            event.preventDefault()
            const currentId = focusedId ?? pinnedId ?? rows[0]?.id
            const currentIndex = rows.findIndex(
              (month) => month.id === currentId,
            )
            const nextIndex = Math.min(
              rows.length - 1,
              Math.max(0, currentIndex + direction),
            )
            setFocusedId(rows[nextIndex]?.id ?? null)
          },
        },
        createElement(
          ComposedChart,
          {
            width: input.width,
            height: chartHeight,
            data: rows,
            margin: { top: 16, right: 22, bottom: 18, left: 12 },
            accessibilityLayer: true,
            role: 'group',
            title:
              'Monthly household electricity consumption and solar generation in 2025',
          },
          [
            createElement(CartesianGrid, {
              key: 'grid',
              stroke: 'color-mix(in srgb, CanvasText 13%, transparent)',
              vertical: false,
            }),
            createElement(XAxis, {
              key: 'x',
              dataKey: 'monthShort',
              tickLine: false,
              axisLine: false,
              tickMargin: 9,
            }),
            createElement(YAxis, {
              key: 'y',
              domain: [0, 850],
              tickCount: 5,
              width: 40,
              label: {
                value: 'kWh',
                angle: -90,
                position: 'insideLeft',
                style: { textAnchor: 'middle' },
              },
            }),
            createElement(Area, {
              key: 'solar-area',
              type: 'monotone',
              dataKey: 'generation',
              fill: energyColors.generation,
              fillOpacity: 0.12,
              stroke: 'none',
              isAnimationActive: false,
            }),
            createElement(Bar, {
              key: 'household',
              dataKey: 'household',
              stackId: 'consumption',
              fill: energyColors.household,
              isAnimationActive: false,
            }),
            createElement(Bar, {
              key: 'heat-pump',
              dataKey: 'heatPump',
              stackId: 'consumption',
              fill: energyColors.heatPump,
              isAnimationActive: false,
            }),
            createElement(Bar, {
              key: 'hot-water',
              dataKey: 'hotWater',
              stackId: 'consumption',
              fill: energyColors.hotWater,
              isAnimationActive: false,
            }),
            createElement(Bar, {
              key: 'ev-charging',
              dataKey: 'evCharging',
              stackId: 'consumption',
              fill: energyColors.evCharging,
              radius: [3, 3, 0, 0],
              isAnimationActive: false,
            }),
            createElement(Line, {
              key: 'generation-line',
              type: 'monotone',
              dataKey: 'generation',
              stroke: energyColors.generation,
              strokeWidth: 2.5,
              dot: renderPoint,
              activeDot: false,
              isAnimationActive: false,
            }),
          ],
        ),
      ),
      activeMonth
        ? createElement(EnergyTooltip, {
            key: 'tooltip',
            month: activeMonth,
            monthIndex: rows.indexOf(activeMonth),
            pinned,
            input,
            view: viewRef.current,
            point: pointElements.current.get(activeMonth.id) ?? null,
            dismiss,
          })
        : null,
    ],
  )
}

interface EnergyTooltipProps {
  month: EnergyMonth
  monthIndex: number
  pinned: boolean
  input: ConformanceInput
  view: HTMLDivElement | null
  point: SVGCircleElement | null
  dismiss: () => void
}

function EnergyTooltip({
  month,
  monthIndex,
  pinned,
  input,
  view,
  point,
  dismiss,
}: EnergyTooltipProps) {
  const content = energyTooltipContent([energyPoint(month, monthIndex)], pinned)
  const accessibleLabel = [
    content.title,
    ...content.rows.map((row) => `${row.label}: ${row.value}`),
  ]
    .filter(Boolean)
    .join('\n')
  const position = tooltipPosition(view, point, input, pinned)
  return createElement(
    'aside',
    {
      className: 'energy-reference-tooltip',
      'data-sticky': String(pinned),
      'data-placement': position.placement,
      role: pinned ? 'dialog' : 'status',
      'aria-modal': pinned ? false : undefined,
      'aria-live': pinned ? undefined : 'polite',
      'aria-label': accessibleLabel,
      style: {
        ...position.style,
        pointerEvents: 'none',
      },
    },
    createElement(
      'div',
      {
        className: 'ts-chart-tooltip__body',
        inert: pinned ? undefined : true,
      },
      createElement(EnergyTooltipBody, {
        month,
        summary: createElement(EnergyTooltipSummary, { content }),
        pinned,
        dismiss,
        consumptionChart: createElement(ConsumptionMixChart, { month }),
      }),
    ),
  )
}

function ConsumptionMixChart({ month }: { month: EnergyMonth }) {
  return createElement(
    BarChart,
    {
      width: 264,
      height: 10,
      data: [month],
      layout: 'vertical',
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      accessibilityLayer: true,
      role: 'img',
      title: `${month.month} consumption split`,
    },
    [
      createElement(XAxis, {
        key: 'x',
        type: 'number',
        domain: [0, month.consumption],
        hide: true,
      }),
      createElement(YAxis, {
        key: 'y',
        type: 'category',
        dataKey: 'monthShort',
        hide: true,
      }),
      createElement(Bar, {
        key: 'household',
        dataKey: 'household',
        stackId: 'mix',
        fill: energyColors.household,
        isAnimationActive: false,
      }),
      createElement(Bar, {
        key: 'heat-pump',
        dataKey: 'heatPump',
        stackId: 'mix',
        fill: energyColors.heatPump,
        isAnimationActive: false,
      }),
      createElement(Bar, {
        key: 'hot-water',
        dataKey: 'hotWater',
        stackId: 'mix',
        fill: energyColors.hotWater,
        isAnimationActive: false,
      }),
      createElement(Bar, {
        key: 'ev-charging',
        dataKey: 'evCharging',
        stackId: 'mix',
        fill: energyColors.evCharging,
        isAnimationActive: false,
      }),
    ],
  )
}

function energyPoint(
  month: EnergyMonth,
  datumIndex: number,
): ChartPoint<EnergyMonth, string, number> {
  return {
    key: month.id,
    markId: 'generation-points',
    group: null,
    groupLabel: 'Solar generation',
    datum: month,
    datumIndex,
    xValue: month.monthShort,
    yValue: month.generation,
    x: 0,
    y: 0,
    color: energyColors.generation,
  }
}

function tooltipPosition(
  view: HTMLDivElement | null,
  point: SVGCircleElement | null,
  input: ConformanceInput,
  pinned: boolean,
) {
  const edge = 8
  const gap = 12
  const width = Math.min(304, Math.max(1, input.width - edge * 2))
  const estimatedHeight = pinned ? 306 : 92
  const viewBounds = view?.getBoundingClientRect()
  const pointBounds = point?.getBoundingClientRect()
  const pointX =
    viewBounds && pointBounds
      ? pointBounds.left + pointBounds.width / 2 - viewBounds.left
      : input.width / 2
  const pointY =
    viewBounds && pointBounds
      ? pointBounds.top + pointBounds.height / 2 - viewBounds.top
      : input.height / 2
  const placeRight = pointX + gap + width <= input.width - edge
  const placeLeft = pointX - gap - width >= edge
  const verticalOverlay = !placeRight && !placeLeft
  const left = placeRight
    ? pointX + gap
    : placeLeft
      ? pointX - gap - width
      : Math.max(edge, Math.min(input.width - width - edge, pointX - width / 2))
  const top = verticalOverlay
    ? pointY + gap
    : Math.max(
        edge,
        Math.min(
          input.height - estimatedHeight - edge,
          pointY - estimatedHeight / 2,
        ),
      )
  return {
    placement: placeRight ? 'right' : placeLeft ? 'left' : 'overlay',
    style: {
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
    },
  }
}

function monthIdFromEventTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return null
  const id =
    target.closest<SVGCircleElement>('[data-month-id]')?.dataset.monthId
  return isEnergyMonthId(id) ? id : null
}

function monthIdAtPointer(
  target: EventTarget | null,
  clientX: number,
  clientY: number,
  points: ReadonlyMap<EnergyMonthId, SVGCircleElement>,
) {
  const direct = monthIdFromEventTarget(target)
  if (direct) return direct
  if (
    !(target instanceof Element) ||
    target.closest('.energy-reference-tooltip')
  ) {
    return null
  }
  let nearest: { id: EnergyMonthId; distance: number } | null = null
  for (const [id, point] of points) {
    const bounds = point.getBoundingClientRect()
    const distance = Math.hypot(
      clientX - (bounds.left + bounds.width / 2),
      clientY - (bounds.top + bounds.height / 2),
    )
    if (distance <= 16 && (!nearest || distance < nearest.distance)) {
      nearest = { id, distance }
    }
  }
  return nearest?.id ?? null
}

function monthFromTarget(target: ConformanceTarget) {
  if (target.view !== undefined && target.view !== 'main') return null
  const [kind, id] = target.anchor.split(':')
  return kind === 'month' && isEnergyMonthId(id) ? id : null
}

function center(element: HTMLElement | SVGElement) {
  const bounds = element.getBoundingClientRect()
  return {
    x: bounds.left + bounds.width / 2,
    y: bounds.top + bounds.height / 2,
    focusElement: element,
  }
}

export const mount: ConformanceMount = (container, input) => {
  const surface = container.ownerDocument.createElement('div')
  container.append(surface)
  const root = createRoot(surface)
  let currentInput = input
  let interaction: InteractionState = { focusedMonth: null }

  const onInteractionChange = (next: InteractionState) => {
    interaction = next
  }

  const render = () => {
    flushSync(() => {
      root.render(
        createElement(EnergyChart, {
          input: currentInput,
          onInteractionChange,
        }),
      )
    })
  }

  render()

  return {
    update(nextInput) {
      currentInput = nextInput
      render()
    },
    driver: {
      resolveTarget(target) {
        if (target.anchor === 'tooltip:close') {
          const close = surface.querySelector<HTMLElement>(
            '[data-energy-tooltip-close]',
          )
          return close ? center(close) : null
        }
        const monthId = monthFromTarget(target)
        if (!monthId) return null
        const point = surface.querySelector<SVGCircleElement>(
          `[data-month-id="${monthId}"]`,
        )
        const chartFocus =
          surface.querySelector<HTMLElement>('[role="listbox"]')
        if (!point) return null
        return { ...center(point), focusElement: chartFocus ?? point }
      },
      readState() {
        const tooltip = surface.querySelector<HTMLElement>(
          '.energy-reference-tooltip',
        )
        const body = tooltip?.querySelector<HTMLElement>('.energy-tooltip')
        const reveal = tooltip?.querySelector<HTMLElement>(
          '.energy-tooltip__reveal',
        )
        return {
          focusedMonth: interaction.focusedMonth,
          tooltip: {
            visible: Boolean(tooltip),
            pinned: tooltip?.dataset.sticky === 'true',
            role: tooltip?.getAttribute('role') ?? null,
            inert:
              tooltip
                ?.querySelector('.ts-chart-tooltip__body')
                ?.hasAttribute('inert') ?? false,
            month:
              tooltip
                ?.querySelector('.ts-chart-tooltip__title')
                ?.textContent?.trim() ?? null,
            summaryRowCount:
              tooltip?.querySelectorAll('.ts-chart-tooltip__row').length ?? 0,
            detailRowCount:
              tooltip?.querySelectorAll('[data-energy-detail-row]').length ?? 0,
            detailsExpanded: body?.dataset.expanded === 'true',
            detailHeight: Math.round(
              reveal?.getBoundingClientRect().height ?? 0,
            ),
            nestedBarCount:
              tooltip?.querySelectorAll('.recharts-bar-rectangle').length ?? 0,
            closeVisible: Boolean(
              tooltip?.querySelector('[data-energy-tooltip-close]'),
            ),
            text: tooltip?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
          },
        }
      },
    },
    destroy() {
      flushSync(() => root.unmount())
      surface.remove()
    },
  }
}
