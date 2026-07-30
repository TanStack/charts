import { defineChart, dot, lineY, mountChart } from '@tanstack/charts'
import { focusX } from '@tanstack/charts/focus'
import { scaleLinear, scaleUtc } from 'd3-scale'
import {
  synchronizedCursorAnchorDate,
  synchronizedCursorColors,
  synchronizedCursorData,
  synchronizedCursorDateDomain,
  synchronizedCursorDateKey,
  synchronizedCursorDatumAtDate,
  synchronizedCursorNearestDatum,
  synchronizedCursorViews,
  synchronizedCursorYDomains,
} from './data'
import { createSynchronizedSummary, updateSynchronizedSummary } from './summary'
import type {
  ChartPoint,
  ChartRenderContext,
  ChartScene,
  ChartHostOptions,
} from '@tanstack/charts'
import type { SynchronizedCursorDatum, SynchronizedCursorView } from './data'
import type {
  ConformanceGeometryQuery,
  ConformanceGeometrySample,
  ConformanceHandle,
  ConformanceInput,
  ConformanceJsonObject,
  ConformanceTarget,
  ConformanceTestDriver,
} from '../../types'

interface SynchronizedViewInput extends ConformanceInput {
  view: SynchronizedCursorView
}

interface CrosshairElements {
  overlay: SVGSVGElement
  line: SVGLineElement
  marker: SVGCircleElement
}

const definition = (input: SynchronizedViewInput) =>
  defineChart(() => {
    const rows = synchronizedCursorData(input.view, input.revision)
    return {
      marks: [
        lineY(rows, {
          id: `${input.view}-line`,
          x: 'date',
          y: 'value',
          key: 'id',
          stroke: synchronizedCursorColors[input.view],
          strokeWidth: 2,
        }),
        dot(rows, {
          id: `${input.view}-dots`,
          x: 'date',
          y: 'value',
          key: 'id',
          fill: synchronizedCursorColors[input.view],
          r: 3,
          stroke: '#ffffff',
          strokeWidth: 1,
        }),
      ],
      x: {
        scale: scaleUtc().domain(synchronizedCursorDateDomain),
        format: (value) =>
          value.toLocaleDateString(undefined, {
            month: 'short',
            timeZone: 'UTC',
          }),
      },
      y: {
        scale: scaleLinear().domain(synchronizedCursorYDomains[input.view]),
        ticks: 4,
        grid: true,
        label: input.view === 'primary' ? 'Throughput' : 'Error rate',
      },
      margin: {
        top: 16,
        right: 24,
        bottom: 34,
        left: 62,
      },
    }
  })

export function mount(
  container: HTMLElement,
  input: ConformanceInput,
): ConformanceHandle {
  let currentInput = input
  let focusedDate: Date | null = null
  let pinnedDate: Date | null = null
  const scenes: Record<
    SynchronizedCursorView,
    ChartScene<SynchronizedCursorDatum> | null
  > = {
    primary: null,
    secondary: null,
  }
  const document = container.ownerDocument
  const shell = document.createElement('div')
  const summary = createSynchronizedSummary(document)
  const chartStack = document.createElement('div')
  const primarySurface = document.createElement('div')
  const secondarySurface = document.createElement('div')
  const surfaces: Record<SynchronizedCursorView, HTMLDivElement> = {
    primary: primarySurface,
    secondary: secondarySurface,
  }
  primarySurface.dataset.conformanceView = 'primary'
  secondarySurface.dataset.conformanceView = 'secondary'
  primarySurface.style.position = 'relative'
  secondarySurface.style.position = 'relative'
  chartStack.append(primarySurface, secondarySurface)
  shell.append(summary.root, chartStack)
  container.append(shell)

  const elements: Record<SynchronizedCursorView, CrosshairElements | null> = {
    primary: null,
    secondary: null,
  }

  const viewHeight = () =>
    Math.max(140, Math.floor((currentInput.height - 56 - 8) / 2))

  const sizeShell = () => {
    const height = viewHeight()
    shell.style.display = 'grid'
    shell.style.gridTemplateRows = `56px minmax(0, 1fr)`
    shell.style.width = `${currentInput.width}px`
    shell.style.height = `${currentInput.height}px`
    chartStack.style.display = 'grid'
    chartStack.style.gridTemplateRows = `${height}px ${height}px`
    chartStack.style.gap = '8px'
    chartStack.style.minHeight = '0'
  }

  const paintView = (view: SynchronizedCursorView) => {
    const scene = scenes[view]
    const crosshair = elements[view]
    if (!scene || !crosshair) return
    crosshair.overlay.setAttribute(
      'viewBox',
      `0 0 ${scene.width} ${scene.height}`,
    )
    if (!focusedDate) {
      crosshair.line.setAttribute('visibility', 'hidden')
      crosshair.marker.setAttribute('visibility', 'hidden')
      return
    }
    const datum = synchronizedCursorDatumAtDate(
      view,
      currentInput.revision,
      focusedDate,
    )
    const x = scene.scales.x.map(focusedDate)
    crosshair.line.setAttribute('x1', String(x))
    crosshair.line.setAttribute('x2', String(x))
    crosshair.line.setAttribute('y1', String(scene.chart.y))
    crosshair.line.setAttribute(
      'y2',
      String(scene.chart.y + scene.chart.height),
    )
    crosshair.line.setAttribute('visibility', 'visible')
    if (datum) {
      crosshair.marker.setAttribute('cx', String(x))
      crosshair.marker.setAttribute(
        'cy',
        String(scene.scales.y.map(datum.value)),
      )
      crosshair.marker.setAttribute('visibility', 'visible')
    } else {
      crosshair.marker.setAttribute('visibility', 'hidden')
    }
  }

  const paintAll = () => {
    for (const view of synchronizedCursorViews) paintView(view)
    updateSynchronizedSummary(
      summary,
      focusedDate,
      currentInput,
      pinnedDate !== null,
    )
  }

  const setFocusedDate = (
    points: readonly ChartPoint<SynchronizedCursorDatum>[],
  ) => {
    if (!points.length && pinnedDate) return
    focusedDate = points[0]?.datum.date ?? null
    paintAll()
  }

  const selectDate = (point: ChartPoint<SynchronizedCursorDatum> | null) => {
    if (!point) return
    if (pinnedDate?.getTime() === point.datum.date.getTime()) {
      pinnedDate = null
      focusedDate = null
    } else {
      pinnedDate = point.datum.date
      focusedDate = point.datum.date
    }
    paintAll()
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || !pinnedDate) return
    event.preventDefault()
    pinnedDate = null
    focusedDate = null
    paintAll()
  }
  shell.addEventListener('keydown', handleKeyDown)

  const onRender =
    (view: SynchronizedCursorView) =>
    (context: ChartRenderContext<SynchronizedCursorDatum>) => {
      scenes[view] = context.scene
      paintView(view)
    }

  const options = (
    view: SynchronizedCursorView,
  ): ChartHostOptions<SynchronizedCursorDatum> => ({
    definition: definition({
      ...currentInput,
      view,
    }),
    width: currentInput.width,
    height: viewHeight(),
    ariaLabel:
      view === 'primary'
        ? 'Linked primary throughput time series'
        : 'Linked secondary error-rate time series',
    animate: false,
    keyboard: true,
    focus: focusX,
    maxFocusDistance: Number.POSITIVE_INFINITY,
    onFocusGroupChange: setFocusedDate,
    onSelect: selectDate,
    onRender: onRender(view),
  })

  sizeShell()
  const primaryHost = mountChart(primarySurface, options('primary'))
  const secondaryHost = mountChart(secondarySurface, options('secondary'))
  elements.primary = createCrosshair(primarySurface)
  elements.secondary = createCrosshair(secondarySurface)
  scenes.primary = primaryHost.getScene()
  scenes.secondary = secondaryHost.getScene()
  paintAll()

  const driver = createDriver(
    surfaces,
    scenes,
    elements,
    () => currentInput,
    () => focusedDate,
    () => pinnedDate !== null,
  )

  return {
    driver,
    update(nextInput) {
      currentInput = nextInput
      sizeShell()
      primaryHost.update(options('primary'))
      secondaryHost.update(options('secondary'))
      paintAll()
    },
    destroy() {
      shell.removeEventListener('keydown', handleKeyDown)
      primaryHost.destroy()
      secondaryHost.destroy()
      shell.remove()
    },
  }
}

function createCrosshair(surface: HTMLDivElement): CrosshairElements {
  const document = surface.ownerDocument
  const overlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  overlay.dataset.conformanceOverlay = 'synchronized-crosshair'
  overlay.setAttribute('aria-hidden', 'true')
  Object.assign(overlay.style, {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    overflow: 'visible',
    pointerEvents: 'none',
  })
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
  line.dataset.conformanceCrosshair = 'x'
  line.setAttribute('stroke', '#64748b')
  line.setAttribute('stroke-width', '1')
  line.setAttribute('stroke-dasharray', '4 4')
  line.setAttribute('visibility', 'hidden')
  const marker = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'circle',
  )
  marker.dataset.conformanceCrosshair = 'marker'
  marker.setAttribute('r', '5')
  marker.setAttribute('fill', '#ffffff')
  marker.setAttribute('stroke', '#334155')
  marker.setAttribute('stroke-width', '2')
  marker.setAttribute('visibility', 'hidden')
  overlay.append(line, marker)
  surface.append(overlay)
  return { overlay, line, marker }
}

function createDriver(
  surfaces: Readonly<Record<SynchronizedCursorView, HTMLDivElement>>,
  scenes: Readonly<
    Record<SynchronizedCursorView, ChartScene<SynchronizedCursorDatum> | null>
  >,
  elements: Readonly<Record<SynchronizedCursorView, CrosshairElements | null>>,
  getInput: () => ConformanceInput,
  getFocusedDate: () => Date | null,
  getPinned: () => boolean,
): ConformanceTestDriver {
  return {
    resolveTarget(target) {
      return resolveTarget(surfaces, scenes, getInput(), target)
    },
    readState() {
      return interactionState(
        scenes,
        elements,
        getInput(),
        getFocusedDate(),
        getPinned(),
      )
    },
    geometry(query) {
      return geometry(surfaces, scenes, getInput(), query)
    },
    viewBounds(view) {
      const synchronized = synchronizedView(view)
      const scene = synchronized ? scenes[synchronized] : null
      return synchronized && scene
        ? sceneChartBounds(surfaces[synchronized], scene)
        : null
    },
  }
}

function resolveTarget(
  surfaces: Readonly<Record<SynchronizedCursorView, HTMLDivElement>>,
  scenes: Readonly<
    Record<SynchronizedCursorView, ChartScene<SynchronizedCursorDatum> | null>
  >,
  input: ConformanceInput,
  target: ConformanceTarget,
) {
  const view = synchronizedView(target.view)
  const date = synchronizedCursorAnchorDate(target.anchor)
  if (!view || !date) return null
  const scene = scenes[view]
  const datum = synchronizedCursorNearestDatum(view, input.revision, date)
  if (!scene || !datum) return null
  return scenePointToClient(
    surfaces[view],
    scene,
    scene.scales.x.map(date),
    scene.scales.y.map(datum.value),
  )
}

function geometry(
  surfaces: Readonly<Record<SynchronizedCursorView, HTMLDivElement>>,
  scenes: Readonly<
    Record<SynchronizedCursorView, ChartScene<SynchronizedCursorDatum> | null>
  >,
  input: ConformanceInput,
  query: ConformanceGeometryQuery,
): readonly ConformanceGeometrySample[] {
  const view = synchronizedView(query.view)
  if (!view) return []
  const scene = scenes[view]
  const svg = surfaces[view].querySelector<SVGSVGElement>('svg.ts-chart')
  if (!scene || !svg) return []
  const svgBounds = svg.getBoundingClientRect()
  const scaleX = svgBounds.width / scene.width
  const scaleY = svgBounds.height / scene.height
  const rows = synchronizedCursorData(view, input.revision)

  if (query.role === 'dot') {
    return rows.map((datum) => ({
      x: svgBounds.left + scene.scales.x.map(datum.date) * scaleX - 3 * scaleX,
      y: svgBounds.top + scene.scales.y.map(datum.value) * scaleY - 3 * scaleY,
      width: 6 * scaleX,
      height: 6 * scaleY,
      paint: synchronizedCursorColors[view],
    }))
  }

  if (query.role === 'line') {
    const points = rows.map((datum): readonly [number, number] => [
      scene.scales.x.map(datum.date),
      scene.scales.y.map(datum.value),
    ])
    const sample = pointsBounds(
      points,
      svgBounds,
      scaleX,
      scaleY,
      synchronizedCursorColors[view],
    )
    return sample ? [sample] : []
  }

  return []
}

function synchronizedView(
  view: string | undefined,
): SynchronizedCursorView | null {
  return view === 'primary' || view === 'secondary' ? view : null
}

function scenePointToClient(
  surface: HTMLDivElement,
  scene: ChartScene<SynchronizedCursorDatum>,
  x: number,
  y: number,
) {
  const svg = surface.querySelector<SVGSVGElement>('svg.ts-chart')
  if (!svg) return null
  const bounds = svg.getBoundingClientRect()
  return {
    x: bounds.left + (x / scene.width) * bounds.width,
    y: bounds.top + (y / scene.height) * bounds.height,
    focusElement: svg,
  }
}

function sceneChartBounds(
  surface: HTMLDivElement,
  scene: ChartScene<SynchronizedCursorDatum>,
): ConformanceGeometrySample | null {
  const svg = surface.querySelector<SVGSVGElement>('svg.ts-chart')
  if (!svg) return null
  const bounds = svg.getBoundingClientRect()
  const scaleX = bounds.width / scene.width
  const scaleY = bounds.height / scene.height
  return {
    x: bounds.left + scene.chart.x * scaleX,
    y: bounds.top + scene.chart.y * scaleY,
    width: scene.chart.width * scaleX,
    height: scene.chart.height * scaleY,
  }
}

function pointsBounds(
  points: readonly (readonly [number, number])[],
  svgBounds: DOMRect,
  scaleX: number,
  scaleY: number,
  paint: string,
): ConformanceGeometrySample | null {
  if (!points.length) return null
  const xs = points.map((point) => point[0])
  const ys = points.map((point) => point[1])
  const left = Math.min(...xs)
  const right = Math.max(...xs)
  const top = Math.min(...ys)
  const bottom = Math.max(...ys)
  return {
    x: svgBounds.left + left * scaleX,
    y: svgBounds.top + top * scaleY,
    width: Math.max(1, (right - left) * scaleX),
    height: Math.max(1, (bottom - top) * scaleY),
    paint,
  }
}

function interactionState(
  scenes: Readonly<
    Record<SynchronizedCursorView, ChartScene<SynchronizedCursorDatum> | null>
  >,
  elements: Readonly<Record<SynchronizedCursorView, CrosshairElements | null>>,
  input: ConformanceInput,
  date: Date | null,
  pinned: boolean,
): ConformanceJsonObject {
  return {
    shared: {
      date: date ? synchronizedCursorDateKey(date) : null,
      primaryValue: date
        ? (synchronizedCursorDatumAtDate('primary', input.revision, date)
            ?.value ?? null)
        : null,
      secondaryValue: date
        ? (synchronizedCursorDatumAtDate('secondary', input.revision, date)
            ?.value ?? null)
        : null,
      pinned,
    },
    crosshairs: {
      primary: renderedCrosshairState(scenes.primary, elements.primary),
      secondary: renderedCrosshairState(scenes.secondary, elements.secondary),
    },
  }
}

function renderedCrosshairState(
  scene: ChartScene<SynchronizedCursorDatum> | null,
  elements: CrosshairElements | null,
): ConformanceJsonObject {
  const x = Number(elements?.line.getAttribute('x1'))
  const visible =
    Boolean(scene && elements?.line.isConnected) &&
    elements?.line.getAttribute('visibility') === 'visible' &&
    Number.isFinite(x)
  return {
    visible,
    xNormalized:
      visible && scene ? (x - scene.chart.x) / scene.chart.width : null,
  }
}
