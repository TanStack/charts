import { createElement, useEffect, useId, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
} from 'recharts'
import {
  energyAnnualOverview,
  energyColors,
  energyMonths,
  energyTooltipContent,
  formatEnergy,
  formatPercent,
  isEnergyMonthId,
} from './model'
import { EnergyTooltipBody, energyTooltipStyles } from './tooltip-body'
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

interface EnergyXAxisTickProps {
  x?: number | string
  y?: number | string
  fill?: string
  payload?: { value?: unknown }
  activeMonthShort: string | null
  markerLength: number
}

function EnergyChart({ input, onInteractionChange }: EnergyChartProps) {
  const exportedPatternId = `energy-exported-${useId().replaceAll(':', '')}`
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
  const chartWidth = Math.max(1, input.width - 24)
  const chartHeight = Math.max(1, input.height - 48)
  const annualConsumption = rows.reduce(
    (total, month) => total + month.consumption,
    0,
  )

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
      r: isPinned ? 5 : isActive ? 4.5 : 3,
      fill: 'Canvas',
      stroke: energyColors.consumption,
      strokeWidth: isPinned ? 2 : isActive ? 1.8 : 1.4,
      opacity: isActive ? 1 : 0,
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
        paddingTop: '4px',
        background: 'Canvas',
        color: 'CanvasText',
        boxSizing: 'border-box',
      },
    },
    [
      createElement('style', { key: 'tooltip-styles' }, energyTooltipStyles),
      createElement(
        'header',
        {
          key: 'header',
          className: 'energy-overview-card',
          style: {
            display: 'flex',
            height: '36px',
            alignItems: 'center',
            padding: '0 24px',
            font: '500 12px/1.3 system-ui, sans-serif',
          },
        },
        createElement(
          'strong',
          { style: { fontSize: '13px', fontWeight: 680 } },
          'Annual overview',
        ),
      ),
      createElement(
        'div',
        {
          key: 'chart-card',
          style: {
            position: 'relative',
            width: `${chartWidth}px`,
            height: `${chartHeight}px`,
            margin: '0 12px',
            border: '1px solid color-mix(in srgb, CanvasText 8%, transparent)',
            borderRadius: '7px',
            boxSizing: 'border-box',
          },
        },
        [
          createElement(
            'div',
            {
              key: 'annual-metrics',
              'aria-hidden': true,
              style: {
                position: 'absolute',
                zIndex: 1,
                top: '14px',
                left: '16px',
                display: 'flex',
                gap: '26px',
                pointerEvents: 'none',
                font: '500 11px/1.2 system-ui, sans-serif',
              },
            },
            [
              createElement(AnnualMetric, {
                key: 'generation',
                label: 'Energy generated',
                value: formatEnergy(energyAnnualOverview.generation),
              }),
              createElement(AnnualMetric, {
                key: 'consumption',
                label: 'Total consumption',
                value: formatEnergy(annualConsumption),
              }),
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
                width: chartWidth,
                height: chartHeight,
                data: rows,
                margin: { top: 82, right: 24, bottom: 8, left: 12 },
                barCategoryGap: '16%',
                barGap: 0,
                accessibilityLayer: true,
                role: 'group',
                title: 'Annual household energy overview',
              },
              [
                createElement(
                  'defs',
                  { key: 'fills' },
                  createElement(
                    'pattern',
                    {
                      id: exportedPatternId,
                      width: 6,
                      height: 6,
                      patternUnits: 'userSpaceOnUse',
                    },
                    [
                      createElement('rect', {
                        key: 'background',
                        width: 6,
                        height: 6,
                        fill: energyColors.exported,
                      }),
                      createElement('path', {
                        key: 'hatch',
                        d: 'M-1 1L1 -1M0 6L6 0M5 7L7 5',
                        fill: 'none',
                        stroke: energyColors.generation,
                        strokeOpacity: 0.55,
                        strokeWidth: 1,
                      }),
                    ],
                  ),
                ),
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
                  tickMargin: 8,
                  tick: (props) =>
                    createElement(EnergyXAxisTick, {
                      ...props,
                      activeMonthShort: activeMonth?.monthShort ?? null,
                      markerLength: Math.max(
                        14,
                        ((chartWidth - 72 - 24) / 12) * 0.84,
                      ),
                    }),
                }),
                createElement(YAxis, {
                  key: 'y',
                  domain: [0, 2600],
                  tickCount: 5,
                  width: 60,
                  tickLine: false,
                  axisLine: false,
                  tickMargin: 7,
                  tickFormatter: (value: number) =>
                    `${value.toLocaleString('en-US')} kWh`,
                }),
                createElement(Area, {
                  key: 'consumption-area',
                  type: 'monotone',
                  dataKey: 'consumption',
                  fill: energyColors.consumption,
                  fillOpacity: 0.13,
                  stroke: 'none',
                  isAnimationActive: false,
                }),
                createElement(
                  Bar,
                  {
                    key: 'used-on-site',
                    dataKey: 'usedOnSite',
                    stackId: 'generation',
                    fill: energyColors.generationMuted,
                    isAnimationActive: false,
                  },
                  rows.map((row) =>
                    createElement(Cell, {
                      key: row.id,
                      fill:
                        row.id === activeId
                          ? energyColors.generation
                          : energyColors.generationMuted,
                    }),
                  ),
                ),
                createElement(Bar, {
                  key: 'exported',
                  dataKey: 'exported',
                  stackId: 'generation',
                  fill: `url(#${exportedPatternId})`,
                  radius: [3, 3, 0, 0],
                  isAnimationActive: false,
                }),
                activeMonth
                  ? createElement(ReferenceLine, {
                      key: 'focused-month-guide',
                      x: activeMonth.monthShort,
                      stroke: 'CanvasText',
                      strokeOpacity: 0.45,
                      strokeWidth: 1,
                      strokeDasharray: '4 4',
                    })
                  : null,
                createElement(Line, {
                  key: 'consumption-line',
                  type: 'monotone',
                  dataKey: 'consumption',
                  stroke: energyColors.consumption,
                  strokeWidth: 1.6,
                  dot: renderPoint,
                  activeDot: false,
                  isAnimationActive: false,
                }),
              ],
            ),
          ),
        ],
      ),
      activeMonth
        ? createElement(EnergyTooltip, {
            key: 'tooltip',
            month: activeMonth,
            monthIndex: rows.indexOf(activeMonth),
            pinned,
            input,
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
  dismiss: () => void
}

function EnergyTooltip({
  month,
  monthIndex,
  pinned,
  input,
  dismiss,
}: EnergyTooltipProps) {
  const content = energyTooltipContent([energyPoint(month, monthIndex)], pinned)
  const coverage = formatPercent(month.usedOnSite / month.consumption)
  const accessibleLabel = [
    content.title,
    ...content.rows.map((row) => `${row.label}: ${row.value}`),
    ...(pinned
      ? [
          `Consumption mix: Household ${formatEnergy(month.household)}, Heat pump ${formatEnergy(month.heatPump)}, Hot water ${formatEnergy(month.hotWater)}, EV charging ${formatEnergy(month.evCharging)}`,
          `Generation use: Used on site ${formatEnergy(month.usedOnSite)} (${formatPercent(month.usedOnSite / month.generation)}), Exported ${formatEnergy(month.exported)} (${formatPercent(month.exported / month.generation)})`,
        ]
      : []),
    `Solar covered ${coverage} of household consumption`,
  ]
    .filter(Boolean)
    .join('\n')
  const position = tooltipPosition(input, pinned, monthIndex, month.consumption)
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
        transition: 'top 260ms cubic-bezier(0.22, 1, 0.36, 1)',
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
        pinned,
        dismiss,
        consumptionChart: createElement(ConsumptionMixChart, { month }),
      }),
    ),
  )
}

function EnergyXAxisTick({
  x,
  y,
  fill = '#666',
  payload,
  activeMonthShort,
  markerLength,
}: EnergyXAxisTickProps) {
  const tickX = Number(x)
  const tickY = Number(y)
  const value = typeof payload?.value === 'string' ? payload.value : ''
  if (!Number.isFinite(tickX) || !Number.isFinite(tickY)) return null
  const active = value === activeMonthShort
  return createElement('g', { transform: `translate(${tickX},${tickY})` }, [
    active
      ? createElement('line', {
          key: 'active-line',
          x1: -markerLength / 2,
          x2: markerLength / 2,
          y1: -6,
          y2: -6,
          stroke: 'CanvasText',
          strokeWidth: 1.5,
        })
      : null,
    active
      ? createElement('line', {
          key: 'active-tick',
          x1: 0,
          x2: 0,
          y1: -6,
          y2: 1,
          stroke: 'CanvasText',
          strokeWidth: 1.5,
        })
      : null,
    createElement(
      'text',
      {
        key: 'label',
        x: 0,
        y: 0,
        dy: '0.71em',
        fill,
        fontSize: 11,
        textAnchor: 'middle',
      },
      value,
    ),
  ])
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
      accessibilityLayer: false,
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

function AnnualMetric({ label, value }: { label: string; value: string }) {
  const [amount, unit] = value.split(' ')
  return createElement('div', { style: { display: 'grid', gap: '3px' } }, [
    createElement(
      'span',
      {
        key: 'label',
        style: {
          color: 'color-mix(in srgb, CanvasText 55%, transparent)',
        },
      },
      label,
    ),
    createElement(
      'strong',
      {
        key: 'value',
        style: {
          fontSize: '19px',
          fontWeight: 680,
          letterSpacing: '-0.02em',
        },
      },
      [
        amount,
        ' ',
        createElement(
          'span',
          {
            key: 'unit',
            style: {
              fontSize: '11px',
              fontWeight: 620,
              letterSpacing: 0,
            },
          },
          unit,
        ),
      ],
    ),
  ])
}

function energyPoint(
  month: EnergyMonth,
  datumIndex: number,
): ChartPoint<EnergyMonth, string, number> {
  return {
    key: month.id,
    markId: 'consumption-points',
    group: null,
    groupLabel: 'Consumption',
    datum: month,
    datumIndex,
    xValue: month.monthShort,
    yValue: month.consumption,
    x: 0,
    y: 0,
    color: energyColors.consumption,
  }
}

function tooltipPosition(
  input: ConformanceInput,
  pinned: boolean,
  monthIndex: number,
  consumption: number,
) {
  const edge = 8
  const gap = 12
  const width = Math.min(292, Math.max(1, input.width - edge * 2))
  const estimatedHeight = pinned ? 334 : 128
  const chartWidth = Math.max(1, input.width - 24)
  const chartHeight = Math.max(1, input.height - 48)
  const plotWidth = Math.max(1, chartWidth - 72 - 24)
  const plotHeight = Math.max(1, chartHeight - 82 - 38)
  const pointX = 12 + 72 + ((monthIndex + 0.5) / 12) * plotWidth
  const pointY = 40 + 82 + (1 - consumption / 2600) * plotHeight
  const placeRight = pointX + gap + width <= input.width - edge
  const placeLeft = pointX - gap - width >= edge
  const verticalOverlay = !placeRight && !placeLeft
  const left = placeRight
    ? pointX + gap
    : placeLeft
      ? pointX - gap - width
      : Math.max(edge, Math.min(input.width - width - edge, pointX - width / 2))
  const top = Math.max(
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
