import { createElement, useId, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
} from 'recharts'
import {
  isNestedTooltipId,
  nestedTooltipData,
  nestedTooltipServices,
} from './data'
import type { ReactNode } from 'react'
import type { ScatterPointItem, ScatterShapeProps } from 'recharts'
import type { NestedTooltipDatum, NestedTooltipId } from './data'
import type {
  ConformanceInput,
  ConformanceMount,
  ConformanceTarget,
} from '../../types'

interface InteractionState {
  hoveredId: NestedTooltipId | null
  pinnedId: NestedTooltipId | null
}

interface NestedTooltipChartProps {
  input: ConformanceInput
  onInteractionChange: (state: InteractionState) => void
}

function NestedTooltipChart({
  input,
  onInteractionChange,
}: NestedTooltipChartProps) {
  const tooltipTitleId = `recharts-nested-tooltip-${useId()}`
  const pointElements = useRef(new Map<NestedTooltipId, SVGCircleElement>())
  const [hoveredId, setHoveredId] = useState<NestedTooltipId | null>(null)
  const [pinnedId, setPinnedId] = useState<NestedTooltipId | null>(null)
  const rows = nestedTooltipData(input.revision)
  const pinnedDatum = rows.find((row) => row.id === pinnedId)
  const narrow = input.width < 520
  const panelHeight = Math.max(
    96,
    Math.min(154, Math.round(input.height * 0.42)),
  )
  const chartHeight =
    narrow && pinnedDatum
      ? Math.max(1, input.height - panelHeight - 8)
      : input.height

  const updateHovered = (nextHoveredId: NestedTooltipId | null) => {
    setHoveredId(nextHoveredId)
    onInteractionChange({ hoveredId: nextHoveredId, pinnedId })
  }

  const togglePinned = (id: NestedTooltipId) => {
    setPinnedId((current) => {
      const next = current === id ? null : id
      onInteractionChange({ hoveredId, pinnedId: next })
      return next
    })
  }

  const closePinned = () => {
    const invokingId = pinnedId
    if (!invokingId) return
    setPinnedId(null)
    onInteractionChange({ hoveredId, pinnedId: null })
    const restoreFocus = () => pointElements.current.get(invokingId)?.focus()
    const view =
      pointElements.current.get(invokingId)?.ownerDocument.defaultView
    if (view?.requestAnimationFrame) view.requestAnimationFrame(restoreFocus)
    else restoreFocus()
  }

  const renderPoint = (props: ScatterShapeProps): ReactNode => {
    const datum = rows.find((row) => row === props.payload)
    if (!datum || props.cx === undefined || props.cy === undefined) return null
    const pinned = datum.id === pinnedId
    return createElement('circle', {
      className: 'recharts-dot',
      cx: props.cx,
      cy: props.cy,
      r: pinned ? 7 : 5,
      fill: pinned ? '#f97316' : '#2563eb',
      stroke: '#ffffff',
      strokeWidth: pinned ? 2 : 1,
      'data-point-id': datum.id,
      ref: (element: SVGCircleElement | null) => {
        if (element) pointElements.current.set(datum.id, element)
        else pointElements.current.delete(datum.id)
      },
      role: 'button',
      tabIndex: 0,
      focusable: true,
      'aria-label': `${datum.service}, ${datum.latency} milliseconds`,
      'aria-pressed': pinned,
      onPointerEnter: () => updateHovered(datum.id),
      onPointerLeave: () => updateHovered(null),
      onClick: () => togglePinned(datum.id),
      onKeyDown: (event: KeyboardEvent) => {
        if (event.key !== 'Enter' && event.key !== ' ') return
        event.preventDefault()
        togglePinned(datum.id)
      },
    })
  }

  return createElement(
    'div',
    {
      'data-conformance-view': 'main',
      role: 'region',
      'aria-label': 'Service latency with a pinned nested-chart tooltip',
      onKeyDown: (event: KeyboardEvent) => {
        if (event.key !== 'Escape') return
        event.stopPropagation()
        closePinned()
      },
      style: {
        position: 'relative',
        width: `${input.width}px`,
        height: `${input.height}px`,
      },
    },
    [
      createElement(
        ScatterChart,
        {
          key: 'chart',
          width: input.width,
          height: chartHeight,
          margin: { top: 18, right: 24, bottom: 20, left: 16 },
          accessibilityLayer: true,
        },
        [
          createElement(CartesianGrid, {
            key: 'grid',
            stroke: '#e2e8f0',
          }),
          createElement(XAxis, {
            key: 'x',
            type: 'category',
            dataKey: 'service',
            domain: nestedTooltipServices,
            allowDuplicatedCategory: false,
          }),
          createElement(YAxis, {
            key: 'y',
            type: 'number',
            dataKey: 'latency',
            domain: [0, 100],
            ticks: [0, 25, 50, 75, 100],
            width: 52,
          }),
          createElement(Scatter<NestedTooltipDatum, number>, {
            key: 'points',
            data: rows,
            dataKey: 'latency',
            fill: '#2563eb',
            shape: renderPoint,
            isAnimationActive: false,
          }),
        ],
      ),
      pinnedDatum
        ? createElement(PinnedTooltip, {
            key: 'tooltip',
            datum: pinnedDatum,
            input,
            chartHeight,
            panelHeight,
            titleId: tooltipTitleId,
            onClose: closePinned,
          })
        : null,
    ],
  )
}

interface PinnedTooltipProps {
  datum: NestedTooltipDatum
  input: ConformanceInput
  chartHeight: number
  panelHeight: number
  titleId: string
  onClose: () => void
}

function PinnedTooltip({
  datum,
  input,
  chartHeight,
  panelHeight,
  titleId,
  onClose,
}: PinnedTooltipProps) {
  const narrow = input.width < 520
  const width = narrow ? Math.max(1, input.width - 16) : 224
  const miniWidth = narrow ? Math.max(1, input.width - 32) : 208
  const miniHeight = narrow ? Math.max(48, panelHeight - 60) : 106
  const position = tooltipPosition(
    datum,
    input,
    chartHeight,
    panelHeight,
    width,
  )
  return createElement(
    'aside',
    {
      'data-external-tooltip': 'pinned',
      role: 'dialog',
      'aria-modal': false,
      'aria-labelledby': titleId,
      'data-placement': position.placement,
      style: { ...tooltipStyle, ...position.style, width },
    },
    [
      createElement(
        'div',
        {
          key: 'header',
          style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            minHeight: '44px',
          },
        },
        [
          createElement(
            'strong',
            { key: 'title', id: titleId },
            `${datum.service}: ${datum.latency} ms`,
          ),
          createElement(
            'button',
            {
              key: 'close',
              type: 'button',
              'aria-label': 'Close pinned service details',
              onPointerDown: (event: PointerEvent) => event.stopPropagation(),
              onClick: onClose,
              style: {
                width: '44px',
                height: '44px',
                padding: 0,
                border:
                  '1px solid color-mix(in srgb, CanvasText 24%, transparent)',
                borderRadius: '6px',
                background: 'Canvas',
                color: 'CanvasText',
                cursor: 'pointer',
                font: '700 20px/1 system-ui, sans-serif',
              },
            },
            '×',
          ),
        ],
      ),
      createElement(
        BarChart,
        {
          key: 'mini-chart',
          width: miniWidth,
          height: miniHeight,
          data: datum.history,
          margin: { top: 6, right: 6, bottom: 12, left: 6 },
          accessibilityLayer: true,
        },
        [
          createElement(XAxis, {
            key: 'x',
            dataKey: 'period',
            tick: { fontSize: 9 },
            tickLine: false,
            axisLine: false,
          }),
          createElement(YAxis, {
            key: 'y',
            domain: [0, 100],
            hide: true,
          }),
          createElement(Bar, {
            key: 'bars',
            dataKey: 'value',
            fill: '#8b5cf6',
            radius: [2, 2, 0, 0],
            isAnimationActive: false,
          }),
        ],
      ),
      createElement(
        'div',
        {
          key: 'history-description',
          style: {
            position: 'absolute',
            width: '1px',
            height: '1px',
            overflow: 'hidden',
            clipPath: 'inset(50%)',
          },
        },
        datum.history
          .map((row) => `${row.period}: ${row.value} milliseconds`)
          .join('. '),
      ),
    ],
  )
}

const tooltipStyle = {
  position: 'absolute',
  zIndex: 2,
  boxSizing: 'border-box',
  padding: '8px',
  border: '1px solid rgb(100 116 139 / 0.35)',
  borderRadius: '8px',
  background: 'Canvas',
  color: 'CanvasText',
  boxShadow: '0 8px 28px rgb(15 23 42 / 0.16)',
  font: '600 12px/1.3 system-ui, sans-serif',
  pointerEvents: 'auto',
} as const

function tooltipPosition(
  datum: NestedTooltipDatum,
  input: ConformanceInput,
  chartHeight: number,
  panelHeight: number,
  width: number,
) {
  if (input.width < 520) {
    return {
      placement: 'panel',
      style: {
        left: '8px',
        top: `${chartHeight + 4}px`,
        height: `${panelHeight}px`,
      },
    }
  }
  const index = Math.max(
    0,
    nestedTooltipServices.findIndex((service) => service === datum.service),
  )
  const chartLeft = 68
  const chartRight = input.width - 24
  const pointX =
    chartLeft +
    ((index + 0.5) / nestedTooltipServices.length) * (chartRight - chartLeft)
  const pointY =
    18 + ((100 - datum.latency) / 100) * Math.max(1, chartHeight - 60)
  const gap = 14
  const edge = 8
  const estimatedHeight = 168
  const placeRight = pointX + gap + width <= input.width - edge
  return {
    placement: placeRight ? 'right' : 'left',
    style: {
      left: `${Math.max(edge, placeRight ? pointX + gap : pointX - gap - width)}px`,
      top: `${Math.max(
        edge,
        Math.min(
          input.height - estimatedHeight - edge,
          pointY - estimatedHeight / 2,
        ),
      )}px`,
    },
  }
}

function center(element: HTMLElement | SVGElement) {
  const bounds = element.getBoundingClientRect()
  return {
    x: bounds.left + bounds.width / 2,
    y: bounds.top + bounds.height / 2,
    focusElement: element,
  }
}

function pointFromTarget(target: ConformanceTarget) {
  if (target.view !== undefined && target.view !== 'main') return null
  const [kind, id] = target.anchor.split(':')
  return kind === 'point' && isNestedTooltipId(id) ? id : null
}

export const mount: ConformanceMount = (container, input) => {
  const surface = container.ownerDocument.createElement('div')
  container.append(surface)
  const root = createRoot(surface)
  let currentInput = input
  let interaction: InteractionState = {
    hoveredId: null,
    pinnedId: null,
  }

  const onInteractionChange = (next: InteractionState) => {
    interaction = next
  }

  const render = () => {
    flushSync(() => {
      root.render(
        createElement(NestedTooltipChart, {
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
          const close = surface.querySelector<HTMLButtonElement>(
            'button[aria-label="Close pinned service details"]',
          )
          return close ? center(close) : null
        }
        const pointId = pointFromTarget(target)
        if (!pointId) return null
        const point = [
          ...surface.querySelectorAll<SVGCircleElement>('[data-point-id]'),
        ].find((element) => element.dataset.pointId === pointId)
        return point ? center(point) : null
      },
      readState() {
        const tooltip = surface.querySelector<HTMLElement>(
          '[data-external-tooltip="pinned"]',
        )
        return {
          hoveredId: interaction.hoveredId,
          focusedPoint:
            surface.ownerDocument.activeElement instanceof SVGElement
              ? (surface.ownerDocument.activeElement.dataset.pointId ?? null)
              : null,
          tooltip: {
            visible: Boolean(tooltip),
            pinnedId: interaction.pinnedId,
            miniBarCount:
              tooltip?.querySelectorAll('.recharts-bar-rectangle').length ?? 0,
            chartCount: tooltip?.querySelectorAll('svg').length ?? 0,
            selectedOverlayCount: surface.querySelectorAll(
              '[data-point-id][aria-pressed="true"]',
            ).length,
            periodLabelCount:
              tooltip?.querySelectorAll(
                '.recharts-xAxis .recharts-cartesian-axis-tick',
              ).length ?? 0,
            placement: tooltip?.dataset.placement ?? null,
            closeVisible: Boolean(
              tooltip?.querySelector(
                'button[aria-label="Close pinned service details"]',
              ),
            ),
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
