import { useCallback, useMemo, useRef, useState } from 'react'
import { defineChart, dot, lineY } from '@tanstack/charts'
import { brushX } from '@tanstack/charts/interaction/brush'
import { controlledSignal } from '@tanstack/charts/interaction/signal'
import { keyedSelection, whenSelected } from '@tanstack/charts/selection'
import { Chart } from '@tanstack/charts/react'
import { aapl } from '@tanstack/charts-data/aapl'
import { scaleLinear, scaleUtc } from 'd3-scale'
import {
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
import type { AaplRow } from '@tanstack/charts-data/aapl'
import type { FocusContextWindow } from './model'

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
    {
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
    },
    { svgAnimation: false, keyboard: false },
  )
}

export function focusContextOverviewDefinition(
  window: FocusContextWindow,
  onChange: (range: BrushRange<Date>, reason: BrushXChange<Date>) => void,
) {
  return defineChart(
    {
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
              value.toLocaleDateString(undefined, {
                month: 'short',
                timeZone: 'UTC',
              }),
          },
        },
      },
      y: { scale: scaleLinear, axis: false },
      margin: overviewMargin,
      controls: [
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
    },
    { svgAnimation: false, keyboard: false },
  )
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

function nearestDateInRange(range: BrushRange<Date>) {
  const midpoint = (range.start.getTime() + range.end.getTime()) / 2
  return focusContextDates.reduce((candidate, date) =>
    Math.abs(date.getTime() - midpoint) <
    Math.abs(candidate.getTime() - midpoint)
      ? date
      : candidate,
  )
}

export interface ExampleProps {
  width?: number
  height?: number
  revision?: number
}

export default function FocusContextExample({
  width = 640,
  height = 480,
  revision = 0,
}: ExampleProps = {}) {
  const input = { width, height, revision, preview: false, interactive: true }
  const idPrefix = '83-focus-context-window'
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
}
