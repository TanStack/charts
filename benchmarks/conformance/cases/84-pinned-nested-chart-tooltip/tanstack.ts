import { barY, defineChart, dot, mountChart } from '@tanstack/charts'
import { scaleBand, scaleLinear } from 'd3-scale'
import {
  isNestedTooltipId,
  nestedTooltipData,
  nestedTooltipServices,
} from './data'
import type { ChartHost, ChartPoint, ChartHostOptions } from '@tanstack/charts'
import type {
  NestedTooltipDatum,
  NestedTooltipId,
  NestedTooltipMiniDatum,
} from './data'
import type {
  ConformanceHandle,
  ConformanceInput,
  ConformanceTarget,
} from '../../types'

interface MiniChartInput {
  rows: readonly NestedTooltipMiniDatum[]
}

interface MainChartInput extends ConformanceInput {
  pinnedId: NestedTooltipId | null
}

let tooltipIdSequence = 0

const mainDefinition = (input: MainChartInput) =>
  defineChart(() => {
    const rows = nestedTooltipData(input.revision)
    const selectedRows = rows.filter((row) => row.id === input.pinnedId)
    return {
      marks: [
        dot(rows, {
          id: 'services',
          x: 'service',
          y: 'latency',
          key: 'id',
          r: 5,
          fill: '#2563eb',
          stroke: '#ffffff',
          strokeWidth: 1,
        }),
        ...(selectedRows.length
          ? [
              dot(selectedRows, {
                id: 'pinned-service',
                x: 'service',
                y: 'latency',
                key: 'id',
                r: 9,
                fill: '#f97316',
                stroke: '#ffffff',
                strokeWidth: 3,
              }),
            ]
          : []),
      ],
      x: {
        scale: scaleBand<string>()
          .domain(nestedTooltipServices)
          .paddingInner(0.1)
          .paddingOuter(0.05),
      },
      y: {
        scale: scaleLinear().domain([0, 100]),
        ticks: 5,
        grid: true,
      },
      margin: { top: 18, right: 24, bottom: 42, left: 68 },
    }
  })

const miniDefinition = (input: MiniChartInput) =>
  defineChart(() => ({
    marks: [
      barY(input.rows, {
        id: 'history-bars',
        x: 'period',
        y: 'value',
        key: 'id',
        fill: '#8b5cf6',
        inset: 1,
      }),
    ],
    x: {
      scale: scaleBand<string>()
        .domain(input.rows.map((row) => row.period))
        .paddingInner(0.18)
        .paddingOuter(0.08),
    },
    y: {
      scale: scaleLinear().domain([0, 100]),
      guide: false,
    },
    margin: { top: 6, right: 6, bottom: 24, left: 6 },
  }))

function pointFromTarget(target: ConformanceTarget) {
  if (target.view !== undefined && target.view !== 'main') return null
  const [kind, id] = target.anchor.split(':')
  return kind === 'point' && isNestedTooltipId(id) ? id : null
}

export function mount(
  container: HTMLElement,
  input: ConformanceInput,
): ConformanceHandle {
  const document = container.ownerDocument
  const view = document.createElement('div')
  const chartSurface = document.createElement('div')
  const tooltip = document.createElement('aside')
  const tooltipHeader = document.createElement('div')
  const tooltipTitle = document.createElement('strong')
  const closeButton = document.createElement('button')
  const miniSurface = document.createElement('div')
  const historyDescription = document.createElement('div')
  const tooltipTitleId = `tanstack-nested-tooltip-${++tooltipIdSequence}`
  view.dataset.conformanceView = 'main'
  view.setAttribute('role', 'region')
  view.setAttribute(
    'aria-label',
    'Service latency with a pinned nested-chart tooltip',
  )
  Object.assign(view.style, {
    position: 'relative',
    width: `${input.width}px`,
    height: `${input.height}px`,
  })
  tooltip.dataset.externalTooltip = 'pinned'
  tooltip.setAttribute('role', 'dialog')
  tooltip.setAttribute('aria-modal', 'false')
  tooltipTitle.id = tooltipTitleId
  tooltip.setAttribute('aria-labelledby', tooltipTitleId)
  tooltip.tabIndex = -1
  Object.assign(tooltip.style, {
    position: 'absolute',
    zIndex: '2',
    boxSizing: 'border-box',
    width: '224px',
    padding: '8px',
    border: '1px solid rgb(100 116 139 / 0.35)',
    borderRadius: '8px',
    background: 'Canvas',
    color: 'CanvasText',
    boxShadow: '0 8px 28px rgb(15 23 42 / 0.16)',
    font: '600 12px/1.3 system-ui, sans-serif',
    pointerEvents: 'auto',
  })
  Object.assign(tooltipHeader.style, {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    minHeight: '44px',
  })
  closeButton.type = 'button'
  closeButton.textContent = '×'
  closeButton.setAttribute('aria-label', 'Close pinned service details')
  Object.assign(closeButton.style, {
    width: '44px',
    height: '44px',
    padding: '0',
    border: '1px solid color-mix(in srgb, CanvasText 24%, transparent)',
    borderRadius: '6px',
    background: 'Canvas',
    color: 'CanvasText',
    cursor: 'pointer',
    font: '700 20px/1 system-ui, sans-serif',
  })
  miniSurface.style.width = '208px'
  miniSurface.style.height = '106px'
  historyDescription.style.position = 'absolute'
  historyDescription.style.width = '1px'
  historyDescription.style.height = '1px'
  historyDescription.style.overflow = 'hidden'
  historyDescription.style.clipPath = 'inset(50%)'
  tooltipHeader.append(tooltipTitle, closeButton)
  tooltip.append(tooltipHeader, miniSurface, historyDescription)
  tooltip.hidden = true
  view.append(chartSurface, tooltip)
  container.append(view)

  let currentInput = input
  let hoveredId: NestedTooltipId | null = null
  let pinnedId: NestedTooltipId | null = null
  let miniHost: ChartHost<NestedTooltipMiniDatum> | undefined

  const narrowLayout = () => currentInput.width < 520
  const panelHeight = () =>
    Math.max(96, Math.min(154, Math.round(currentInput.height * 0.42)))
  const mainHeight = () =>
    narrowLayout() && pinnedId
      ? Math.max(1, currentInput.height - panelHeight() - 8)
      : currentInput.height
  const miniDimensions = () => ({
    width: narrowLayout() ? Math.max(1, currentInput.width - 32) : 208,
    height: narrowLayout() ? Math.max(48, panelHeight() - 60) : 106,
  })

  const miniOptions = (
    rows: readonly NestedTooltipMiniDatum[],
  ): ChartHostOptions<NestedTooltipMiniDatum> => ({
    definition: defineChart(miniDefinition({ rows }), {
      animate: false,
      keyboard: false,
    }),
    ...miniDimensions(),
    ariaLabel: 'Recent latency for the pinned service',
    ariaDescription: rows
      .map((row) => `${row.period}: ${row.value} milliseconds`)
      .join('. '),
  })

  const renderTooltip = () => {
    const datum = nestedTooltipData(currentInput.revision).find(
      (row) => row.id === pinnedId,
    )
    if (!datum) {
      miniHost?.destroy()
      miniHost = undefined
      tooltip.hidden = true
      miniSurface.replaceChildren()
      return
    }

    tooltipTitle.textContent = `${datum.service}: ${datum.latency} ms`
    historyDescription.textContent = datum.history
      .map((row) => `${row.period}: ${row.value} milliseconds`)
      .join('. ')
    tooltip.hidden = false
    const dimensions = miniDimensions()
    miniSurface.style.width = `${dimensions.width}px`
    miniSurface.style.height = `${dimensions.height}px`
    if (miniHost) miniHost.update(miniOptions(datum.history))
    else miniHost = mountChart(miniSurface, miniOptions(datum.history))
    placeTooltip(datum.id)
  }

  let mainHost: ChartHost<NestedTooltipDatum>
  const mainOptions = (): ChartHostOptions<NestedTooltipDatum> => ({
    definition: defineChart(mainDefinition({ ...currentInput, pinnedId }), {
      animate: false,
      keyboard: true,
    }),
    width: currentInput.width,
    height: mainHeight(),
    ariaLabel: 'Selectable service latency chart',
    ariaDescription:
      'Use arrow keys to choose a service and Enter or Space to pin its recent history.',
    onFocusChange(point: ChartPoint<NestedTooltipDatum> | null) {
      hoveredId = point?.datum.id ?? null
    },
    onSelect(point: ChartPoint<NestedTooltipDatum> | null) {
      const selectedId = point?.datum.id ?? null
      const svg = chartSurface.querySelector<SVGSVGElement>('svg.ts-chart')
      if (svg) delete svg.dataset.restoredPoint
      pinnedId = pinnedId === selectedId ? null : selectedId
      mainHost.update(mainOptions())
      renderTooltip()
    },
  })

  mainHost = mountChart(chartSurface, mainOptions())

  const closePinned = () => {
    if (pinnedId === null) return
    const invokingId = pinnedId
    pinnedId = null
    mainHost.update(mainOptions())
    renderTooltip()
    const svg = chartSurface.querySelector<SVGSVGElement>('svg.ts-chart')
    if (svg) {
      svg.dataset.restoredPoint = invokingId
      svg.focus()
    }
  }
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return
    event.stopPropagation()
    closePinned()
  }
  const stopClosePointer = (event: PointerEvent) => event.stopPropagation()
  closeButton.addEventListener('click', closePinned)
  closeButton.addEventListener('pointerdown', stopClosePointer)
  view.addEventListener('keydown', handleKeyDown)

  return {
    update(nextInput) {
      currentInput = nextInput
      view.style.width = `${nextInput.width}px`
      view.style.height = `${nextInput.height}px`
      mainHost.update(mainOptions())
      renderTooltip()
    },
    driver: {
      resolveTarget(target) {
        if (target.anchor === 'tooltip:close' && !tooltip.hidden) {
          return center(closeButton)
        }
        const pointId = pointFromTarget(target)
        if (!pointId) return null
        const scene = mainHost.getScene()
        const point = scene.points.find(
          (candidate) =>
            candidate.markId === 'services' && candidate.datum.id === pointId,
        )
        const svg = chartSurface.querySelector<SVGSVGElement>('svg.ts-chart')
        if (!point || !svg) return null
        const bounds = svg.getBoundingClientRect()
        return {
          x: bounds.left + (point.x / scene.width) * bounds.width,
          y: bounds.top + (point.y / scene.height) * bounds.height,
          focusElement: svg,
        }
      },
      readState() {
        const svg = chartSurface.querySelector<SVGSVGElement>('svg.ts-chart')
        return {
          hoveredId,
          focusedPoint:
            svg && document.activeElement === svg
              ? (svg.dataset.restoredPoint ?? null)
              : null,
          tooltip: {
            visible: !tooltip.hidden,
            pinnedId,
            miniBarCount: tooltip.hidden
              ? 0
              : miniSurface.querySelectorAll('.ts-chart__bar rect').length,
            chartCount: tooltip.hidden
              ? 0
              : miniSurface.querySelectorAll('svg.ts-chart').length,
            selectedOverlayCount: chartSurface.querySelectorAll(
              '.ts-chart__dot[data-ts-key="pinned-service"] circle',
            ).length,
            periodLabelCount: tooltip.hidden
              ? 0
              : miniSurface.querySelectorAll('[data-ts-key^="x-tick-label:"]')
                  .length,
            placement: tooltip.dataset.placement ?? null,
            closeVisible: !tooltip.hidden && !closeButton.hidden,
          },
        }
      },
    },
    destroy() {
      view.removeEventListener('keydown', handleKeyDown)
      closeButton.removeEventListener('click', closePinned)
      closeButton.removeEventListener('pointerdown', stopClosePointer)
      miniHost?.destroy()
      mainHost.destroy()
      view.remove()
    },
  }

  function placeTooltip(id: NestedTooltipId) {
    if (narrowLayout()) {
      tooltip.dataset.placement = 'panel'
      tooltip.style.left = '8px'
      tooltip.style.top = `${mainHeight() + 4}px`
      tooltip.style.width = `${Math.max(1, currentInput.width - 16)}px`
      tooltip.style.height = `${panelHeight()}px`
      return
    }

    const scene = mainHost.getScene()
    const point = scene.points.find(
      (candidate) =>
        candidate.markId === 'services' && candidate.datum.id === id,
    )
    if (!point) return
    const edge = 8
    const gap = 14
    const width = tooltip.offsetWidth || 224
    const height = tooltip.offsetHeight || 150
    const placeRight = point.x + gap + width <= currentInput.width - edge
    const left = placeRight ? point.x + gap : point.x - gap - width
    const top = Math.max(
      edge,
      Math.min(currentInput.height - height - edge, point.y - height / 2),
    )
    tooltip.dataset.placement = placeRight ? 'right' : 'left'
    tooltip.style.left = `${Math.max(edge, left)}px`
    tooltip.style.top = `${top}px`
    tooltip.style.width = '224px'
    tooltip.style.height = 'auto'
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
