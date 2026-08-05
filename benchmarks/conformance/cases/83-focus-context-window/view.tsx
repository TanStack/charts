import {
  forwardRef,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { defineChart, dot, lineY } from '@tanstack/charts'
import { Chart } from '@tanstack/react-charts'
import { aapl } from '@charts-poc/demo-data/aapl'
import { brushX } from 'd3-brush'
import { scaleLinear, scaleUtc } from 'd3-scale'
import { select } from 'd3-selection'
import { reactMount } from '../../shared/react-mount'
import {
  dateFromAnchor,
  dateKey,
  focusContextDomain,
  initialFocusContextWindow,
  monthlyAaplRows,
  rowsInWindow,
  windowForDate,
} from './model'
import type { ChartScene } from '@tanstack/charts'
import type { AaplRow } from '@charts-poc/demo-data/aapl'
import type { BrushSelection, D3BrushEvent } from 'd3-brush'
import type { FocusContextWindow } from './model'
import type { ConformanceTarget, ConformanceTestDriver } from '../../types'
import type { ReactConformanceProps } from '../../shared/react-mount'

interface BrushStatus {
  dragging: boolean
  outcome: 'idle' | 'dragging' | 'commit' | 'cancel'
}

interface FocusBrushController {
  sync: () => void
  destroy: () => void
}

const detailMargin = { top: 16, right: 24, bottom: 38, left: 52 }
const overviewMargin = { top: 8, right: 24, bottom: 22, left: 52 }
const gap = 8
const focusContextRows = monthlyAaplRows(aapl)
const focusContextDates = focusContextRows.map((row) => row.Date)
const fullDomain = focusContextDomain(focusContextRows)

const FocusContextExample = forwardRef<
  ConformanceTestDriver,
  ReactConformanceProps
>(function FocusContextExample({ input, idPrefix }, ref) {
  const detailSurfaceRef = useRef<HTMLDivElement>(null)
  const overviewSurfaceRef = useRef<HTMLDivElement>(null)
  const overviewSceneRef = useRef<ChartScene<AaplRow> | null>(null)
  const brushGroupRef = useRef<SVGGElement>(null)
  const controllerRef = useRef<FocusBrushController | null>(null)
  const windowRef = useRef(initialFocusContextWindow(focusContextDates))
  const brushStatusRef = useRef<BrushStatus>({
    dragging: false,
    outcome: 'idle',
  })
  const [window, setWindowState] = useState(windowRef.current)
  const [brushStatus, setBrushStatus] = useState(brushStatusRef.current)
  const [overviewScene, setOverviewScene] =
    useState<ChartScene<AaplRow> | null>(null)
  const heights = viewHeights(input.height)
  const detailRows = rowsInWindow(focusContextRows, window)
  const selectedRows = detailRows.filter(
    (row) => row.Date.getTime() === window.selected.getTime(),
  )
  const detailDefinition = useMemo(
    () =>
      defineChart(
        defineChart({
          marks: [
            lineY(detailRows, {
              x: 'Date',
              y: 'Close',
              stroke: '#2563eb',
              strokeWidth: 2.5,
            }),
            dot(detailRows, {
              x: 'Date',
              y: 'Close',
              fill: '#2563eb',
              r: 3,
            }),
            dot(selectedRows, {
              x: 'Date',
              y: 'Close',
              fill: '#f97316',
              stroke: '#ffffff',
              strokeWidth: 2,
              r: 6,
            }),
          ],
          x: {
            scale: scaleUtc().domain([window.start, window.end]),
            axis: { label: 'Selected time window' },
          },
          y: {
            scale: scaleLinear,
            grid: true,
            axis: { label: 'Close ($)' },
          },
          margin: detailMargin,
        }),
        { animate: false, keyboard: false },
      ),
    [window.start, window.end, window.selected],
  )
  const overviewDefinition = useMemo(
    () =>
      defineChart(
        defineChart({
          marks: [
            lineY(focusContextRows, {
              x: 'Date',
              y: 'Close',
              stroke: '#2563eb',
              strokeWidth: 1.75,
            }),
          ],
          x: {
            scale: scaleUtc().domain(fullDomain),
            axis: {
              ticks: {
                count: 4,
                format: (value) =>
                  value.toLocaleDateString(undefined, {
                    month: 'short',
                    timeZone: 'UTC',
                  }),
              },
            },
          },
          y: { scale: scaleLinear, axis: false },
          margin: overviewMargin,
        }),
        { animate: false, keyboard: false },
      ),
    [],
  )
  const chooseDate = (date: Date) => {
    const next = windowForDate(focusContextDates, date)
    windowRef.current = next
    setWindowState(next)
  }
  const ready = overviewScene !== null

  useLayoutEffect(() => {
    const overlay = overviewSurfaceRef.current?.querySelector<SVGSVGElement>(
      '[data-focus-window]',
    )
    const group = brushGroupRef.current
    if (!overlay || !group || !ready) return
    const controller = createFocusBrushController(
      overlay,
      group,
      () => overviewSceneRef.current,
      windowRef,
      brushStatusRef,
      chooseDate,
      () => setBrushStatus({ ...brushStatusRef.current }),
    )
    controllerRef.current = controller
    controller.sync()
    return () => {
      controller.destroy()
      if (controllerRef.current === controller) controllerRef.current = null
    }
  }, [ready])

  useLayoutEffect(() => {
    controllerRef.current?.sync()
  }, [window])

  useImperativeHandle(
    ref,
    () => ({
      resolveTarget(target) {
        const surface = overviewSurfaceRef.current
        const scene = overviewSceneRef.current
        if (
          target.view === 'overview' &&
          target.anchor === 'control:selected-month'
        ) {
          const control = surface?.parentElement?.parentElement?.querySelector(
            'input[aria-label="Selected month"]',
          )
          return control instanceof HTMLInputElement ? center(control) : null
        }
        const date = targetDate(target)
        return surface && scene && date
          ? scenePointToClient(
              surface,
              scene,
              scene.scales.x.map(date),
              scene.chart.y + scene.chart.height / 2,
            )
          : null
      },
      readState() {
        const currentWindow = windowRef.current
        const rows = rowsInWindow(focusContextRows, currentWindow)
        const selectedRow = rows.find(
          (row) => row.Date.getTime() === currentWindow.selected.getTime(),
        )
        return {
          window: {
            selected: dateKey(currentWindow.selected),
            start: dateKey(currentWindow.start),
            end: dateKey(currentWindow.end),
          },
          detail: {
            pointCount: rows.length,
            selectedValue: selectedRow?.Close ?? null,
          },
          control: {
            value: selectedIndex(currentWindow),
            label: rangeLabel(currentWindow),
          },
          brush: brushSelectionState(
            brushGroupRef.current,
            brushStatusRef.current,
          ),
        }
      },
    }),
    [],
  )

  if (input.preview) {
    return (
      <Chart
        idPrefix={idPrefix ? `${idPrefix}-detail` : undefined}
        definition={detailDefinition}
        initialWidth={input.width}
        aspectRatio={input.width / input.height}
        ariaLabel="Detail time window"
      />
    )
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateRows: `${heights.detail}px ${heights.overview}px ${heights.controls}px`,
        gap,
        width: input.width,
        height: input.height,
      }}
    >
      <div ref={detailSurfaceRef} data-conformance-view="detail">
        <Chart
          idPrefix={idPrefix ? `${idPrefix}-detail` : undefined}
          definition={detailDefinition}
          width={input.width}
          height={heights.detail}
          ariaLabel="Detail time window"
        />
      </div>
      <div
        ref={overviewSurfaceRef}
        data-conformance-view="overview"
        style={{ position: 'relative' }}
      >
        <Chart
          idPrefix={idPrefix ? `${idPrefix}-overview` : undefined}
          definition={overviewDefinition}
          width={input.width}
          height={heights.overview}
          ariaLabel="Overview time series with draggable detail window"
          ariaDescription="Drag the visible selection or use the range control below to reposition the four-month detail window."
          onRender={({ scene }) => {
            overviewSceneRef.current = scene
            setOverviewScene(scene)
            controllerRef.current?.sync()
          }}
        />
        {overviewScene ? (
          <svg
            data-focus-window=""
            aria-hidden="true"
            viewBox={`0 0 ${overviewScene.width} ${overviewScene.height}`}
            style={{
              position: 'absolute',
              zIndex: 1,
              inset: 0,
              width: '100%',
              height: '100%',
              touchAction: 'none',
            }}
          >
            <g ref={brushGroupRef} />
          </svg>
        ) : null}
      </div>
      <div
        data-focus-controls=""
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(9rem, 1fr) auto',
          alignItems: 'center',
          gap: 10,
          padding: '4px 12px',
          boxSizing: 'border-box',
          font: '600 11px/1.25 system-ui, sans-serif',
        }}
      >
        <input
          type="range"
          min={0}
          max={focusContextDates.length - 1}
          step={1}
          value={selectedIndex(window)}
          aria-label="Selected month"
          aria-description="Use arrow keys, Home, or End to move the four-month detail window."
          onChange={(event) => {
            const date = focusContextDates[Number(event.currentTarget.value)]
            if (date) chooseDate(date)
          }}
          style={{ width: '100%', minHeight: 44, cursor: 'pointer' }}
        />
        <output data-focus-range="" aria-live="polite">
          {rangeLabel(window)}
        </output>
      </div>
    </div>
  )
})

export const catalogComponent = FocusContextExample
export const mount = reactMount(FocusContextExample)

function createFocusBrushController(
  overlay: SVGSVGElement,
  group: SVGGElement,
  getScene: () => ChartScene<AaplRow> | null,
  windowRef: { current: FocusContextWindow },
  statusRef: { current: BrushStatus },
  chooseDate: (date: Date) => void,
  publishStatus: () => void,
): FocusBrushController {
  let movingBrush = false
  let brushOrigin: FocusContextWindow | null = null
  let cancelRequested = false
  const brush = brushX<unknown>()
    .touchable(true)
    .handleSize(16)
    .on('start', (event: D3BrushEvent<unknown>) => {
      if (movingBrush || !event.sourceEvent) return
      brushOrigin = { ...windowRef.current }
      statusRef.current = { dragging: true, outcome: 'dragging' }
      cancelRequested = false
      publishStatus()
    })
    .on('end', (event: D3BrushEvent<unknown>) => {
      if (movingBrush || !event.sourceEvent) return
      const touchCancelled =
        event.sourceEvent instanceof Event &&
        event.sourceEvent.type === 'touchcancel'
      if ((cancelRequested || touchCancelled) && brushOrigin) {
        windowRef.current = brushOrigin
        statusRef.current = { dragging: false, outcome: 'cancel' }
        brushOrigin = null
        cancelRequested = false
        publishStatus()
        sync()
        return
      }
      statusRef.current = { dragging: false, outcome: 'commit' }
      brushOrigin = null
      publishStatus()
      const range = event.selection
        ? horizontalBrushRange(event.selection)
        : null
      if (range) {
        chooseDate(nearestDate((range[0] + range[1]) / 2))
      } else if ('clientX' in event.sourceEvent) {
        const scene = getScene()
        if (!scene) return
        const bounds = overlay.getBoundingClientRect()
        chooseDate(
          nearestDate(
            ((Number(event.sourceEvent.clientX) - bounds.left) / bounds.width) *
              scene.width,
          ),
        )
      }
    })
  const nearestDate = (sceneX: number) => {
    const scene = getScene()
    if (!scene) return focusContextDates[0]!
    return focusContextDates.reduce((candidate, date) =>
      Math.abs(scene.scales.x.map(date) - sceneX) <
      Math.abs(scene.scales.x.map(candidate) - sceneX)
        ? date
        : candidate,
    )
  }
  const sync = () => {
    const scene = getScene()
    if (!scene) return
    brush.extent([
      [scene.chart.x, scene.chart.y],
      [scene.chart.x + scene.chart.width, scene.chart.y + scene.chart.height],
    ])
    movingBrush = true
    select(group).call(brush)
    select(group).call(brush.move, [
      scene.scales.x.map(windowRef.current.start),
      scene.scales.x.map(windowRef.current.end),
    ])
    movingBrush = false
    styleBrush(group)
  }
  const cancelActiveBrush = () => {
    if (!statusRef.current.dragging || !brushOrigin) return
    cancelRequested = true
    windowRef.current = brushOrigin
    statusRef.current = { dragging: false, outcome: 'cancel' }
    publishStatus()
    sync()
  }
  overlay.addEventListener('pointercancel', cancelActiveBrush)
  overlay.addEventListener('touchcancel', cancelActiveBrush)
  return {
    sync,
    destroy() {
      overlay.removeEventListener('pointercancel', cancelActiveBrush)
      overlay.removeEventListener('touchcancel', cancelActiveBrush)
      select(group).on('.brush', null)
      group.replaceChildren()
    },
  }
}

function viewHeights(height: number) {
  const controls = 52
  const overview = Math.max(56, Math.min(100, Math.round(height * 0.24)))
  return {
    detail: Math.max(1, height - overview - controls - gap * 2),
    overview,
    controls,
  }
}

function targetDate(target: ConformanceTarget) {
  return target.view === 'overview'
    ? dateFromAnchor(focusContextDates, target.anchor)
    : null
}

function scenePointToClient(
  surface: HTMLElement,
  scene: ChartScene<AaplRow>,
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

function styleBrush(group: SVGGElement) {
  const selection = group.querySelector<SVGRectElement>('.selection')
  if (selection) {
    selection.setAttribute('fill', '#2563eb')
    selection.setAttribute('fill-opacity', '0.16')
    selection.setAttribute('stroke', '#2563eb')
    selection.setAttribute('stroke-width', '1.5')
    selection.style.cursor = 'grab'
  }
  group.querySelectorAll<SVGRectElement>('.handle').forEach((handle) => {
    handle.setAttribute('fill', '#2563eb')
    handle.setAttribute('fill-opacity', '0.9')
    handle.setAttribute('width', '8')
  })
}

function rangeLabel(window: FocusContextWindow) {
  return `${monthLabel(window.start)} – ${monthLabel(window.end)}`
}

function monthLabel(date: Date) {
  return date.toLocaleDateString(undefined, {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function selectedIndex(window: FocusContextWindow) {
  return Math.max(
    0,
    focusContextDates.findIndex(
      (date) => date.getTime() === window.selected.getTime(),
    ),
  )
}

function brushSelectionState(group: SVGGElement | null, status: BrushStatus) {
  const selection = group?.querySelector<SVGRectElement>('.selection')
  return {
    x: Number(selection?.getAttribute('x') ?? 0),
    width: Number(selection?.getAttribute('width') ?? 0),
    dragging: status.dragging,
    outcome: status.outcome,
  }
}

function horizontalBrushRange(
  selection: BrushSelection,
): readonly [number, number] | null {
  const [left, right] = selection
  return typeof left === 'number' && typeof right === 'number'
    ? [left, right]
    : null
}

function center(element: HTMLElement | SVGElement) {
  const bounds = element.getBoundingClientRect()
  return {
    x: bounds.left + bounds.width / 2,
    y: bounds.top + bounds.height / 2,
    focusElement: element,
  }
}
