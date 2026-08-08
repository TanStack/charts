import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { defineChart, dot, lineY } from '@tanstack/charts'
import { brushX } from '@tanstack/charts/interaction/brush'
import { controlledSignal } from '@tanstack/charts/interaction/signal'
import { keyedSelection, whenSelected } from '@tanstack/charts/selection'
import { Chart } from '@tanstack/react-charts'
import { aapl } from '@charts-poc/demo-data/aapl'
import { scaleLinear, scaleUtc } from 'd3-scale'
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
import type {
  BrushRange,
  BrushXChange,
} from '@tanstack/charts/interaction/brush'
import type { KeyedSelectionChange } from '@tanstack/charts/selection'
import type { AaplRow } from '@charts-poc/demo-data/aapl'
import type { FocusContextWindow } from './model'
import type { ConformanceTarget, ConformanceTestDriver } from '../../types'
import type { ReactConformanceProps } from '../../shared/react-mount'

interface BrushStatus {
  dragging: boolean
  outcome: 'idle' | 'dragging' | 'commit' | 'cancel'
}

const detailMargin = { top: 16, right: 24, bottom: 38, left: 52 }
const overviewMargin = { top: 8, right: 24, bottom: 22, left: 52 }
const gap = 8
const focusContextRows = monthlyAaplRows(aapl)
const focusContextDates = focusContextRows.map((row) => row.Date)
const fullDomain = focusContextDomain(focusContextRows)

export function focusContextDetailDefinition(window: FocusContextWindow) {
  const rows = rowsInWindow(focusContextRows, window)
  const selection = keyedSelection<AaplRow, string, Date, number>({
    selected: controlledSignal<
      string | null,
      KeyedSelectionChange<AaplRow, string, Date, number>
    >(dateKey(window.selected), () => {}),
    key: (row) => dateKey(row.Date),
  })
  return defineChart(
    defineChart({
      marks: [
        lineY(rows, {
          id: 'detail-line',
          x: 'Date',
          y: 'Close',
          stroke: '#2563eb',
          strokeWidth: 2.5,
        }),
        dot(rows, {
          id: 'detail-points',
          x: 'Date',
          y: 'Close',
          fill: '#2563eb',
          r: 3,
        }),
        whenSelected(
          dot(rows, {
            id: 'selected-point',
            x: 'Date',
            y: 'Close',
            fill: '#f97316',
            stroke: '#ffffff',
            strokeWidth: 2,
            r: 6,
          }),
          selection,
        ),
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
  )
}

export function focusContextOverviewDefinition(
  window: FocusContextWindow,
  onChange: (range: BrushRange<Date>, reason: BrushXChange<Date>) => void,
) {
  return defineChart(
    defineChart({
      marks: [
        lineY(focusContextRows, {
          id: 'overview-line',
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
              value.toLocaleDateString('en-US', {
                month: 'short',
                timeZone: 'UTC',
              }),
          },
        },
      },
      y: { scale: scaleLinear, axis: false },
      margin: overviewMargin,
      behaviors: [
        brushX({
          id: 'focus-window',
          range: controlledSignal<BrushRange<Date>, BrushXChange<Date>>(
            { start: window.start, end: window.end },
            (next, { reason }) => onChange(next, reason),
          ),
          values: focusContextDates,
          ariaLabel: 'Selected time window',
          startAriaLabel: 'Selected time window start',
          endAriaLabel: 'Selected time window end',
          format: monthLabel,
          handleSize: 16,
          selectionStyle: {
            fill: '#2563eb',
            fillOpacity: 0.16,
            stroke: '#2563eb',
            strokeWidth: 1.5,
          },
          handleStyle: { fill: '#2563eb', fillOpacity: 0.9 },
        }),
      ],
    }),
    { animate: false, keyboard: false },
  )
}

const FocusContextExample = forwardRef<
  ConformanceTestDriver,
  ReactConformanceProps
>(function FocusContextExample({ input, idPrefix }, ref) {
  const detailSurfaceRef = useRef<HTMLDivElement>(null)
  const overviewSurfaceRef = useRef<HTMLDivElement>(null)
  const overviewSceneRef = useRef<ChartScene<AaplRow> | null>(null)
  const windowRef = useRef(initialFocusContextWindow(focusContextDates))
  const brushStatusRef = useRef<BrushStatus>({
    dragging: false,
    outcome: 'idle',
  })
  const [window, setWindowState] = useState(windowRef.current)
  const heights = viewHeights(input.height)
  const detailDefinition = useMemo(
    () => focusContextDetailDefinition(window),
    [window.start, window.end, window.selected],
  )
  const chooseDate = useCallback((date: Date) => {
    const next = windowForDate(focusContextDates, date)
    windowRef.current = next
    setWindowState(next)
  }, [])
  const handleBrushChange = useCallback(
    (range: BrushRange<Date>, reason: BrushXChange<Date>) => {
      brushStatusRef.current = {
        dragging: reason.type === 'preview',
        outcome: reason.type === 'preview' ? 'dragging' : reason.type,
      }
      if (reason.type !== 'commit') return
      chooseDate(nearestDateInRange(range))
    },
    [chooseDate],
  )
  const overviewDefinition = useMemo(
    () => focusContextOverviewDefinition(window, handleBrushChange),
    [handleBrushChange, window.end, window.start],
  )

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
            overviewSurfaceRef.current,
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
          }}
        />
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

function rangeLabel(window: FocusContextWindow) {
  return `${monthLabel(window.start)} – ${monthLabel(window.end)}`
}

function monthLabel(date: Date) {
  return date.toLocaleDateString('en-US', {
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

function brushSelectionState(surface: HTMLElement | null, status: BrushStatus) {
  const selection = surface?.querySelector<SVGRectElement>(
    '[data-chart-brush="focus-window"] .selection',
  )
  return {
    x: Number(selection?.getAttribute('x') ?? 0),
    width: Number(selection?.getAttribute('width') ?? 0),
    dragging: status.dragging,
    outcome: status.outcome,
  }
}

function nearestDateInRange(range: BrushRange<Date>) {
  const midpoint = (range.start.getTime() + range.end.getTime()) / 2
  return focusContextDates.reduce((candidate, date) =>
    Math.abs(date.getTime() - midpoint) <
    Math.abs(candidate.getTime() - midpoint)
      ? date
      : candidate,
  )
}

function center(element: HTMLElement | SVGElement) {
  const bounds = element.getBoundingClientRect()
  return {
    x: bounds.left + bounds.width / 2,
    y: bounds.top + bounds.height / 2,
    focusElement: element,
  }
}
