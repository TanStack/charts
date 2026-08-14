import { drillableSunburstDefinition } from './example'
export { drillableSunburstDefinition } from './example'
import { motion } from '@tanstack/charts/motion'
import { mountChartRenderer } from '@tanstack/charts/renderer'
import { readChartMotionState, settleChartMotion } from '../../shared/motion'
import {
  createSunburstCenterControl,
  createSunburstCenterOverlay,
  updateSunburstCenterControl,
  updateSunburstCenterOverlay,
} from './center'
import {
  flareAggregateValue,
  flareHasChildren,
  flareLabel,
  flareParentId,
  flarePreviewRootId,
} from './model'
import type { FlareRow } from '@charts-poc/demo-data/flare'
import type { SunburstNode } from '@tanstack/charts/hierarchy/sunburst'
import type { ChartPoint, ChartRendererHostOptions } from '@tanstack/charts'
import type { ConformanceMount, ConformanceTestDriver } from '../../types'

export { default as Example } from './example'

type DrillDatum = SunburstNode<FlareRow>

export const mount: ConformanceMount = (container, input) => {
  let currentInput = input
  let rootId = flarePreviewRootId
  let focusedId: string | null = null
  let host:
    | ReturnType<typeof mountChartRenderer<DrillDatum, number, number>>
    | undefined
  const renderer = motion<DrillDatum, number, number>({ initial: false })
  const view = container.ownerDocument.createElement('div')
  const chart = container.ownerDocument.createElement('div')
  const centerOverlay = createSunburstCenterOverlay(container.ownerDocument)
  const center = createSunburstCenterControl(container.ownerDocument)
  view.dataset.conformanceView = 'main'
  Object.assign(view.style, {
    position: 'relative',
    width: `${input.width}px`,
    height: `${input.height}px`,
    color: 'CanvasText',
  })
  Object.assign(chart.style, { position: 'absolute', inset: '0' })
  view.append(chart, center)
  container.append(view)

  const selectRoot = (nextRootId: string) => {
    if (nextRootId === rootId || !flareHasChildren(nextRootId)) return
    rootId = nextRootId
    updateCenter()
    host?.update(options())
  }
  const selectPoint = (point: ChartPoint<DrillDatum> | null) => {
    if (point) selectRoot(point.datum.id)
  }
  const goBack = () => {
    const parentId = flareParentId(rootId)
    if (!parentId) return
    rootId = parentId
    updateCenter()
    host?.update(options())
  }
  const options = (): ChartRendererHostOptions<DrillDatum, number, number> => ({
    definition: drillableSunburstDefinition(rootId),
    renderer,
    width: currentInput.width,
    height: currentInput.height,
    ariaLabel: 'Drillable Flare hierarchy',
    ariaDescription:
      'Use arrow keys to inspect segments and Enter or Space to drill into a branch. Use the center button to move up.',
    onFocusChange: (point) => {
      focusedId = point?.datum.id ?? null
    },
    onSelect: selectPoint,
  })
  const updateCenter = () => {
    updateSunburstCenterControl(
      center,
      rootId,
      currentInput.width,
      currentInput.height,
    )
    updateSunburstCenterOverlay(
      centerOverlay,
      rootId,
      currentInput.width,
      currentInput.height,
    )
  }

  center.addEventListener('click', goBack)
  updateCenter()
  host = mountChartRenderer(chart, options())
  chart.append(centerOverlay)

  const driver: ConformanceTestDriver = {
    resolveTarget(target) {
      if (target.view && target.view !== 'main') return null
      if (target.anchor === 'control:back') return centerPoint(center)
      const id = target.anchor.startsWith('node:')
        ? target.anchor.slice('node:'.length)
        : null
      const point = id
        ? host?.getScene().points.find((candidate) => candidate.datum.id === id)
        : null
      if (!point) return null
      const svg = chart.querySelector<SVGSVGElement>('svg.ts-chart')
      if (!svg) return null
      const bounds = svg.getBoundingClientRect()
      return {
        x: bounds.left + point.x,
        y: bounds.top + point.y,
        focusElement: svg,
      }
    },
    readState() {
      const nodes = host?.getScene().points.map((point) => point.datum.id)
      return {
        rootId,
        parentId: flareParentId(rootId),
        label: flareLabel(rootId),
        value: flareAggregateValue(rootId),
        focusedId,
        visibleNodes: nodes ?? [],
        motionState: readChartMotionState(chart),
      }
    },
    settle: () => settleChartMotion(chart, 3_000),
  }

  return {
    driver,
    update(nextInput) {
      currentInput = nextInput
      view.style.width = `${nextInput.width}px`
      view.style.height = `${nextInput.height}px`
      updateCenter()
      host?.update(options())
    },
    destroy() {
      center.removeEventListener('click', goBack)
      host?.destroy()
      view.remove()
    },
  }
}

export const catalogCase = Object.assign(mount, {
  mount,
  createDefinition: () => drillableSunburstDefinition(flarePreviewRootId),
  ariaLabel: 'Drillable Flare hierarchy',
  interactiveTooltip: true as const,
})

function centerPoint(element: HTMLElement) {
  const bounds = element.getBoundingClientRect()
  return {
    x: bounds.left + bounds.width / 2,
    y: bounds.top + bounds.height / 2,
    focusElement: element,
  }
}
