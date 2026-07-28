import { barY, defineChart, dot, mountChart } from '@tanstack/charts'
import { scaleBand, scaleLinear } from 'd3-scale'
import {
  isNestedTooltipId,
  nestedTooltipData,
  nestedTooltipServices,
} from './data'
import type {
  ChartHost,
  ChartPoint,
  DynamicChartHostOptions,
} from '@tanstack/charts'
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

const mainDefinition = defineChart<ConformanceInput>()(({ input }) => {
  const rows = nestedTooltipData(input.revision)
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

const miniDefinition = defineChart<MiniChartInput>()(({ input }) => ({
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
  y: { scale: scaleLinear().domain([0, 100]) },
  guides: false,
  margin: { top: 6, right: 6, bottom: 16, left: 6 },
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
  const tooltipTitle = document.createElement('strong')
  const miniSurface = document.createElement('div')
  view.dataset.conformanceView = 'main'
  view.setAttribute('role', 'application')
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
  tooltip.setAttribute('role', 'status')
  Object.assign(tooltip.style, {
    position: 'absolute',
    top: '8px',
    right: '8px',
    zIndex: '2',
    width: '206px',
    padding: '8px',
    border: '1px solid rgb(100 116 139 / 0.35)',
    borderRadius: '8px',
    background: 'Canvas',
    color: 'CanvasText',
    boxShadow: '0 8px 28px rgb(15 23 42 / 0.16)',
    font: '600 12px/1.3 system-ui, sans-serif',
    pointerEvents: 'none',
  })
  miniSurface.style.width = '190px'
  miniSurface.style.height = '96px'
  tooltip.append(tooltipTitle, miniSurface)
  tooltip.hidden = true
  view.append(chartSurface, tooltip)
  container.append(view)

  let currentInput = input
  let hoveredId: NestedTooltipId | null = null
  let pinnedId: NestedTooltipId | null = null
  let miniHost: ChartHost<NestedTooltipMiniDatum, MiniChartInput> | undefined

  const miniOptions = (
    rows: readonly NestedTooltipMiniDatum[],
  ): DynamicChartHostOptions<NestedTooltipMiniDatum, MiniChartInput> => ({
    definition: miniDefinition,
    input: { rows },
    width: 190,
    height: 96,
    ariaLabel: 'Recent latency for the pinned service',
    animate: false,
    keyboard: false,
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
    tooltip.hidden = false
    if (miniHost) miniHost.update(miniOptions(datum.history))
    else miniHost = mountChart(miniSurface, miniOptions(datum.history))
  }

  let mainHost: ChartHost<NestedTooltipDatum, ConformanceInput>
  const mainOptions = (): DynamicChartHostOptions<
    NestedTooltipDatum,
    ConformanceInput
  > => ({
    definition: mainDefinition,
    input: currentInput,
    width: currentInput.width,
    height: currentInput.height,
    ariaLabel: 'Service latency with selectable points',
    animate: false,
    keyboard: true,
    onFocusChange(point: ChartPoint<NestedTooltipDatum> | null) {
      hoveredId = point?.datum.id ?? null
    },
    onSelect(point: ChartPoint<NestedTooltipDatum> | null) {
      const selectedId = point?.datum.id ?? null
      pinnedId = pinnedId === selectedId ? null : selectedId
      renderTooltip()
      mainHost.update(mainOptions())
    },
  })

  mainHost = mountChart(chartSurface, mainOptions())

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || pinnedId === null) return
    pinnedId = null
    renderTooltip()
  }
  document.addEventListener('keydown', handleKeyDown)

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
        return {
          hoveredId,
          tooltip: {
            visible: !tooltip.hidden,
            pinnedId,
            miniBarCount: tooltip.hidden
              ? 0
              : miniSurface.querySelectorAll('.ts-chart__bar rect').length,
            chartCount: tooltip.hidden
              ? 0
              : miniSurface.querySelectorAll('svg.ts-chart').length,
          },
        }
      },
    },
    destroy() {
      document.removeEventListener('keydown', handleKeyDown)
      miniHost?.destroy()
      mainHost.destroy()
      view.remove()
    },
  }
}
