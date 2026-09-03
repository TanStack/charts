import * as React from 'react'
import {
  areaY,
  bandX,
  defineChart,
  lineY,
  whenFocused,
  type ChartInteractionController,
  type ChartPoint,
  type ChartRenderContext,
  type ChartScene,
} from '@tanstack/charts'
import { tooltip } from '@tanstack/charts/tooltip'
import { Chart } from '@tanstack/charts/react'
import { scaleLinear, scaleUtc } from 'd3-scale'

const pageCount = 4
const samplesPerPage = 29
const samplesBetweenPages = samplesPerPage - 1
const sampleIntervalMs = 6 * 60 * 60 * 1_000
const holdDelayMs = 320
const dragThresholdPx = 8
const settleDurationMs = 320
const historyColor = '#0a84ff'
const chartHeight = 340
const chartMargin = { top: 12, right: 10, bottom: 30, left: 48 } as const

interface HistorySample {
  readonly id: number
  readonly at: Date
  readonly value: number
}

interface HistoryPage {
  readonly rows: readonly HistorySample[]
  readonly label: string
}

interface RenderedChart {
  scene: ChartScene<HistorySample, Date, number>
  interaction: ChartInteractionController<HistorySample, Date, number>
}

type GesturePhase = 'idle' | 'pressing' | 'dragging' | 'inspecting'

interface GestureState {
  phase: GesturePhase
  pointerId: number
  startX: number
  startY: number
  startSceneX: number
  sceneX: number
  clientX: number
  clientY: number
  dragX: number
  timer: number | null
}

const historyRows = createHistoryRows()
const historyDomain = resolveHistoryDomain(historyRows)
const historyPages = createHistoryPages(historyRows)

export function PagedHistoryChart() {
  const [pageIndex, setPageIndex] = React.useState(pageCount - 1)
  const [translateX, setTranslateX] = React.useState(0)
  const [plotWidth, setPlotWidth] = React.useState(0)
  const [dragging, setDragging] = React.useState(false)
  const rendered = React.useRef<RenderedChart | null>(null)
  const gesture = React.useRef<GestureState>(createIdleGesture())
  const settleFrame = React.useRef<number | null>(null)
  const activePage = historyPages[pageIndex]!
  const latest = activePage.rows.at(-1)!
  const definition = React.useMemo(
    () => createHistoryDefinition(activePage, translateX),
    [activePage, translateX],
  )

  const clearTimer = React.useCallback(() => {
    if (gesture.current.timer !== null) {
      window.clearTimeout(gesture.current.timer)
      gesture.current.timer = null
    }
  }, [])

  const clearFocus = React.useCallback(() => {
    rendered.current?.interaction.setControlledFocus(null)
  }, [])

  const cancelSettle = React.useCallback(() => {
    if (settleFrame.current !== null) {
      window.cancelAnimationFrame(settleFrame.current)
      settleFrame.current = null
    }
  }, [])

  React.useEffect(
    () => () => {
      clearTimer()
      cancelSettle()
    },
    [cancelSettle, clearTimer],
  )

  const handleRender = React.useCallback(
    ({
      scene,
      interaction,
    }: ChartRenderContext<HistorySample, Date, number>) => {
      rendered.current = { scene, interaction }
      setPlotWidth((current) =>
        current === scene.chart.width ? current : scene.chart.width,
      )
    },
    [],
  )

  const resolvePointer = React.useCallback(
    (clientX: number, clientY: number) => {
      const current = rendered.current
      return current?.interaction.resolvePointer(clientX, clientY) ?? null
    },
    [],
  )

  const clientToScene = React.useCallback(
    (clientX: number, clientY: number) =>
      rendered.current?.interaction.clientToScene(clientX, clientY) ?? null,
    [],
  )

  const inspectPointer = React.useCallback(
    (clientX: number, clientY: number) => {
      const current = rendered.current
      if (!current) return
      const target = resolvePointer(clientX, clientY)
      current.interaction.setControlledFocus(target)
    },
    [resolvePointer],
  )

  const settle = React.useCallback(
    (nextPage: number, target: number, start = translateX) => {
      clearTimer()
      clearFocus()
      cancelSettle()
      setDragging(false)
      gesture.current = createIdleGesture()

      const destination = clamp(nextPage, 0, pageCount - 1)
      if (plotWidth <= 0 || Math.abs(target - start) < 0.5) {
        setPageIndex(destination)
        setTranslateX(0)
        return
      }

      const startedAt = performance.now()
      const frame = (now: number) => {
        const progress = Math.min(1, (now - startedAt) / settleDurationMs)
        const eased = 1 - (1 - progress) ** 3
        setTranslateX(start + (target - start) * eased)
        if (progress < 1) {
          settleFrame.current = window.requestAnimationFrame(frame)
          return
        }
        settleFrame.current = null
        setPageIndex(destination)
        setTranslateX(0)
      }
      settleFrame.current = window.requestAnimationFrame(frame)
    },
    [cancelSettle, clearFocus, clearTimer, plotWidth, translateX],
  )

  const moveToPage = React.useCallback(
    (nextPage: number) => {
      const destination = clamp(nextPage, 0, pageCount - 1)
      const target =
        destination < pageIndex
          ? plotWidth
          : destination > pageIndex
            ? -plotWidth
            : 0
      settle(destination, target)
    },
    [pageIndex, plotWidth, settle],
  )

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (
      !event.isPrimary ||
      event.button !== 0 ||
      settleFrame.current !== null
    ) {
      return
    }
    clearTimer()
    clearFocus()
    const position = clientToScene(event.clientX, event.clientY)
    if (!position) return
    if (event.pointerType === 'mouse') event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    gesture.current = {
      phase: 'pressing',
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startSceneX: position.x,
      sceneX: position.x,
      clientX: event.clientX,
      clientY: event.clientY,
      dragX: 0,
      timer: window.setTimeout(() => {
        if (gesture.current.phase !== 'pressing') return
        gesture.current.phase = 'inspecting'
        inspectPointer(gesture.current.clientX, gesture.current.clientY)
      }, holdDelayMs),
    }
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const current = gesture.current
    if (current.pointerId !== event.pointerId) return

    current.clientX = event.clientX
    current.clientY = event.clientY
    const position = clientToScene(event.clientX, event.clientY)
    if (position) current.sceneX = position.x

    if (current.phase === 'inspecting') {
      event.preventDefault()
      inspectPointer(event.clientX, event.clientY)
      return
    }

    const clientDeltaX = event.clientX - current.startX
    const clientDeltaY = event.clientY - current.startY
    const sceneDeltaX = current.sceneX - current.startSceneX
    if (current.phase === 'pressing') {
      if (
        Math.abs(clientDeltaX) < dragThresholdPx &&
        Math.abs(clientDeltaY) < dragThresholdPx
      ) {
        return
      }
      clearTimer()
      if (Math.abs(clientDeltaY) > Math.abs(clientDeltaX)) {
        gesture.current = createIdleGesture()
        return
      }
      current.phase = 'dragging'
      setDragging(true)
      clearFocus()
    }

    if (current.phase === 'dragging') {
      event.preventDefault()
      const atOlderEdge = pageIndex === 0 && clientDeltaX > 0
      const atNewerEdge = pageIndex === pageCount - 1 && clientDeltaX < 0
      current.dragX =
        atOlderEdge || atNewerEdge ? sceneDeltaX * 0.22 : sceneDeltaX
      setTranslateX(current.dragX)
    }
  }

  const finishPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    const current = gesture.current
    if (current.pointerId !== event.pointerId) return
    clearTimer()

    if (current.phase === 'dragging') {
      const threshold = Math.min(80, event.currentTarget.clientWidth * 0.18)
      const clientDeltaX = event.clientX - current.startX
      if (clientDeltaX > threshold && pageIndex > 0) {
        settle(pageIndex - 1, plotWidth, current.dragX)
      } else if (clientDeltaX < -threshold && pageIndex < pageCount - 1) {
        settle(pageIndex + 1, -plotWidth, current.dragX)
      } else {
        settle(pageIndex, 0, current.dragX)
      }
      return
    }

    clearFocus()
    setDragging(false)
    setTranslateX(0)
    gesture.current = createIdleGesture()
  }

  const cancelPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    if (gesture.current.pointerId !== event.pointerId) return
    clearTimer()
    clearFocus()
    setDragging(false)
    setTranslateX(0)
    gesture.current = createIdleGesture()
  }

  return (
    <section className="chart-card chart-card--feature ios-history">
      <div className="chart-card__header ios-history__header">
        <div>
          <h2>Paged history</h2>
          <p className="chart-card__meta">{activePage.label}</p>
        </div>
        <div className="ios-history__reading">
          <strong>{formatCurrency(latest.value)}</strong>
          <span>{formatCursorDate(latest.at)}</span>
        </div>
      </div>

      <div
        className="ios-history__viewport"
        data-dragging={dragging || undefined}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishPointer}
        onPointerCancel={cancelPointer}
        onContextMenu={(event) => event.preventDefault()}
      >
        <Chart
          definition={definition}
          height={chartHeight}
          initialWidth={960}
          ariaLabel={`Portfolio value for ${activePage.label}`}
          onRender={handleRender}
        />
      </div>

      <div className="ios-history__footer">
        <span>Hold to inspect · Swipe for earlier ranges</span>
        <div className="ios-history__pager" aria-label="History page controls">
          <button
            type="button"
            aria-label="Show older week"
            disabled={pageIndex === 0}
            onClick={() => moveToPage(pageIndex - 1)}
          >
            ←
          </button>
          <span aria-live="polite">
            {pageIndex + 1} of {pageCount}
          </span>
          <button
            type="button"
            aria-label="Show newer week"
            disabled={pageIndex === pageCount - 1}
            onClick={() => moveToPage(pageIndex + 1)}
          >
            →
          </button>
        </div>
      </div>
    </section>
  )
}

function createHistoryDefinition(page: HistoryPage, translate: number) {
  const first = page.rows[0]!
  const last = page.rows.at(-1)!
  const contentFirst = historyRows[0]!
  const contentLast = historyRows.at(-1)!

  return defineChart({
    pointer: false,
    focus: 'nearest-x',
    focusRing: true,
    maxFocusDistance: Number.POSITIVE_INFINITY,
    tooltip: {
      use: tooltip,
      className: 'ios-history__tooltip',
      anchor: { x: 'value', y: 'plot-top' },
      placement: 'bottom',
      offset: 10,
      sticky: false,
      format: (point: ChartPoint<HistorySample, Date, number>) =>
        `${formatCurrency(point.datum.value)}\n${formatCursorDate(point.datum.at)}`,
    },
    marks: [
      areaY(historyRows, {
        id: 'history area',
        x: 'at',
        y1: historyDomain[0],
        y2: 'value',
        key: 'id',
        fill: historyColor,
        fillOpacity: 0.1,
      }),
      lineY(historyRows, {
        id: 'history line',
        x: 'at',
        y: 'value',
        key: 'id',
        stroke: historyColor,
        strokeWidth: 2.5,
      }),
      whenFocused(
        bandX(historyRows, {
          id: 'history cursor',
          x: 'at',
          key: 'id',
          width: 1,
          fill: historyColor,
          fillOpacity: 0.55,
        }),
        { match: 'x' },
      ),
    ],
    scales: {
      x: {
        scale: scaleUtc().domain([contentFirst.at, contentLast.at]),
        viewport: {
          domain: [first.at, last.at],
          translate,
        },
        grid: false,
        axis: {
          line: false,
          ticks: { count: 4, format: formatAxisDate, size: 0, padding: 9 },
          tickLabels: { thin: { priority: 'ends', minGap: 28 } },
        },
      },
      y: {
        scale: scaleLinear().domain(historyDomain),
        grid: true,
        axis: {
          line: false,
          ticks: {
            count: 4,
            format: (value: number) => `$${Math.round(value / 1_000)}k`,
            size: 0,
            padding: 8,
          },
          tickLabels: { thin: { priority: 'ends', minGap: 16 } },
        },
      },
    },

    margin: chartMargin,
    clip: true,
  })
}

function createHistoryRows(): readonly HistorySample[] {
  const totalSamples = pageCount * samplesBetweenPages + 1
  const start = Date.UTC(2026, 6, 6, 0, 0, 0)

  return Array.from({ length: totalSamples }, (_, index) => ({
    id: index,
    at: new Date(start + index * sampleIntervalMs),
    value: Math.round(
      42_800 +
        index * 22 +
        Math.sin(index * 0.22) * 1_180 +
        Math.sin(index * 0.71) * 310,
    ),
  }))
}

function createHistoryPages(
  rows: readonly HistorySample[],
): readonly HistoryPage[] {
  return Array.from({ length: pageCount }, (_, index) => {
    const pageRows = rows.slice(
      index * samplesBetweenPages,
      index * samplesBetweenPages + samplesPerPage,
    )
    const first = pageRows[0]!
    const last = pageRows.at(-1)!

    return {
      rows: pageRows,
      label: `${formatPageDate(first.at)}–${formatPageDate(last.at)}`,
    }
  })
}

function resolveHistoryDomain(
  rows: readonly HistorySample[],
): readonly [number, number] {
  const values = rows.map((row) => row.value)
  const minimum = Math.min(...values)
  const maximum = Math.max(...values)
  const padding = (maximum - minimum) * 0.12
  return [Math.floor(minimum - padding), Math.ceil(maximum + padding)]
}

function createIdleGesture(): GestureState {
  return {
    phase: 'idle',
    pointerId: -1,
    startX: 0,
    startY: 0,
    startSceneX: 0,
    sceneX: 0,
    clientX: 0,
    clientY: 0,
    dragX: 0,
    timer: null,
  }
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value))
}

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

function formatCurrency(value: number) {
  return currency.format(value)
}

function formatAxisDate(value: Date) {
  return value.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatPageDate(value: Date) {
  return value.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function formatCursorDate(value: Date) {
  return value.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
  })
}
