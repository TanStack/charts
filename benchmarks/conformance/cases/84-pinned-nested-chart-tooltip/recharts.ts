import { createElement, useEffect, useState } from 'react'
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
  const [hoveredId, setHoveredId] = useState<NestedTooltipId | null>(null)
  const [pinnedId, setPinnedId] = useState<NestedTooltipId | null>(null)
  const rows = nestedTooltipData(input.revision)
  const pinnedDatum = rows.find((row) => row.id === pinnedId)

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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setPinnedId(null)
      onInteractionChange({ hoveredId, pinnedId: null })
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [hoveredId, onInteractionChange])

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
      onPointerEnter: () => updateHovered(datum.id),
      onPointerLeave: () => updateHovered(null),
      onClick: () => togglePinned(datum.id),
    })
  }

  return createElement(
    'div',
    {
      'data-conformance-view': 'main',
      role: 'application',
      'aria-label': 'Service latency with a pinned nested-chart tooltip',
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
          height: input.height,
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
          })
        : null,
    ],
  )
}

function PinnedTooltip({ datum }: { datum: NestedTooltipDatum }) {
  return createElement(
    'aside',
    {
      'data-external-tooltip': 'pinned',
      role: 'status',
      style: tooltipStyle,
    },
    [
      createElement(
        'strong',
        { key: 'title' },
        `${datum.service}: ${datum.latency} ms`,
      ),
      createElement(
        BarChart,
        {
          key: 'mini-chart',
          width: 190,
          height: 96,
          data: datum.history,
          margin: { top: 8, right: 8, bottom: 4, left: 8 },
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
    ],
  )
}

const tooltipStyle = {
  position: 'absolute',
  top: '8px',
  right: '8px',
  zIndex: 2,
  width: '206px',
  padding: '8px',
  border: '1px solid rgb(100 116 139 / 0.35)',
  borderRadius: '8px',
  background: 'Canvas',
  color: 'CanvasText',
  boxShadow: '0 8px 28px rgb(15 23 42 / 0.16)',
  font: '600 12px/1.3 system-ui, sans-serif',
  pointerEvents: 'none',
} as const

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
          tooltip: {
            visible: Boolean(tooltip),
            pinnedId: interaction.pinnedId,
            miniBarCount:
              tooltip?.querySelectorAll('.recharts-bar-rectangle').length ?? 0,
            chartCount: tooltip?.querySelectorAll('svg').length ?? 0,
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
