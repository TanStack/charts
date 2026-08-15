import { useMemo, useRef, useState } from 'react'
import { travelers } from '@tanstack/charts-data/travelers'
import { Chart } from '@tanstack/charts/react'
import { synchronizedCursorColors } from './colors'
import {
  synchronizedCursorDateKey,
  synchronizedCursorDatumAtDate,
} from './model'
import { selectSynchronizedCursorData } from './selection'
import type { ChartScene } from '@tanstack/charts'
import type { ChartInteractionController } from '@tanstack/charts'
import type { TravelersRow } from '@tanstack/charts-data/travelers'
import { defineChart, dot, lineY } from '@tanstack/charts'
import { focusGuideX } from '@tanstack/charts/focus/guide'
import { decorative } from '@tanstack/charts/mark/decorative'
import { tooltip } from '@tanstack/charts/tooltip'
import { viewGrid } from '@tanstack/charts/view'
import { scaleLinear, scaleUtc } from 'd3-scale'
import { synchronizedCursorViews, synchronizedCursorYDomains } from './model'
import type { ChartTooltipOptions } from '@tanstack/charts'
import type { SynchronizedCursorView } from './model'
function SummaryValue({
  color,
  dataAttribute,
  label,
  value,
}: {
  color: string
  dataAttribute: 'date' | 'current' | 'previous'
  label: string
  value: string
}) {
  return (
    <label
      style={{
        display: 'grid',
        gridTemplateColumns: '8px minmax(0, 1fr)',
        gridTemplateRows: 'auto auto',
        columnGap: 6,
        minWidth: 0,
      }}
    >
      <span
        style={{
          gridRow: '1 / 3',
          alignSelf: 'center',
          width: 8,
          height: 8,
          borderRadius: 999,
          background: color,
        }}
      />
      <span
        style={{
          overflow: 'hidden',
          color: 'currentColor',
          fontSize: 10,
          letterSpacing: '0.02em',
          opacity: 0.68,
          textOverflow: 'ellipsis',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
      <span
        {...{ [`data-conformance-synchronized-${dataAttribute}`]: '' }}
        style={{
          overflow: 'hidden',
          fontWeight: 700,
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {value}
      </span>
    </label>
  )
}

function formatDate(date: Date) {
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export interface ExampleProps {
  width?: number
  height?: number
  revision?: number
}

export const summaryHeight = 56

const viewGap = 8

const viewMargin = { top: 16, right: 24, bottom: 34, left: 62 } as const

const travelerCountFormat = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

const month = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  timeZone: 'UTC',
})

const synchronizedCursorTooltip: ChartTooltipOptions<TravelersRow> = {
  sticky: true,
  visibility: 'pinned',
  anchor: 'point',
  placement: ['bottom-right', 'bottom-left', 'right', 'left'],
  offset: 10,
  formatGroup: () => 'Pinned · Press Escape to release',
}

export const synchronizedCursorDefinition = (input: ExampleChartInput) => {
  const rows = selectSynchronizedCursorData(travelers, input.revision)
  const composed = viewGrid({
    id: 'synchronized-cursors',
    rows: synchronizedCursorViews.map((view) => ({ id: view, grow: 1 })),
    columns: [{ id: 'main', grow: 1 }],
    rowGap: input.preview ? 4 : viewGap,
    views: synchronizedCursorViews.map((view) => ({
      id: view,
      row: view,
      column: 'main' as const,
      ...(view === 'previous' ? { share: { x: 'current' as const } } : {}),
      chart: synchronizedCursorViewDefinition(
        rows,
        view,
        input.preview === true,
      ),
    })),
  })

  return defineChart(composed, {
    svgAnimation: false,
    keyboard: true,
    focus: 'group-x',
    focusRing: false,
    maxFocusDistance: Number.POSITIVE_INFINITY,
    tooltip: {
      use: tooltip,
      ...synchronizedCursorTooltip,
    },
  })
}

function synchronizedCursorViewDefinition(
  rows: readonly TravelersRow[],
  view: SynchronizedCursorView,
  preview: boolean,
) {
  const group = () => view
  return defineChart({
    marks: [
      decorative(
        lineY(rows, {
          id: `${view}-line`,
          key: (row) => synchronizedCursorDateKey(row.date),
          x: 'date',
          y: view,
          z: group,
          stroke: synchronizedCursorColors[view],
          strokeWidth: 2,
        }),
      ),
      dot(rows, {
        id: `${view}-points`,
        key: (row) => synchronizedCursorDateKey(row.date),
        x: 'date',
        y: view,
        z: group,
        fill: synchronizedCursorColors[view],
        r: 3,
        stroke: '#ffffff',
        strokeWidth: 1,
      }),
      focusGuideX(rows, {
        id: `${view}-guide`,
        key: (row) => synchronizedCursorDateKey(row.date),
        x: 'date',
        y: view,
        z: group,
        match: 'x',
        xRule: {
          stroke: '#64748b',
          strokeWidth: 1,
          strokeDasharray: '4 4',
        },
        marker: {
          radius: 5,
          fill: '#ffffff',
          stroke: '#334155',
          strokeWidth: 2,
        },
      }),
    ],
    x: {
      scale: scaleUtc,
      axis: preview
        ? false
        : { ticks: { format: (value) => month.format(value) } },
    },
    y: {
      scale: scaleLinear().domain(synchronizedCursorYDomains[view]),
      grid: !preview,
      axis: preview
        ? false
        : {
            ticks: { count: 4, format: travelerCountFormat.format },
            label: view === 'current' ? '2020 travelers' : '2019 travelers',
          },
    },
    margin: preview ? 0 : viewMargin,
  })
}

export function chartHeight(input: ExampleChartInput) {
  return Math.max(280, input.height - summaryHeight)
}

export interface ExampleChartInput {
  width: number
  height: number
  revision: number
  preview?: boolean
  interactive?: boolean
}

export default function SynchronizedCursorsExample({
  width = 640,
  height = 480,
  revision = 0,
}: ExampleProps = {}) {
  const input = { width, height, revision, preview: false, interactive: true }
  const idPrefix = '87-echarts-synchronized-cursors'
  const chartFrameRef = useRef<HTMLDivElement>(null)

  const sceneRef = useRef<ChartScene<TravelersRow, Date, number>>(null)

  const interactionRef = useRef<
    ChartInteractionController<TravelersRow, Date, number> | undefined
  >(undefined)

  const inputRef = useRef(input)

  const previousInputRef = useRef(input)

  const restoreDateRef = useRef<Date | null | undefined>(undefined)

  const stateRef = useRef<{ date: Date | null; pinned: boolean }>({
    date: null,
    pinned: false,
  })

  const [focusedDate, setFocusedDate] = useState<Date | null>(null)

  const [pinned, setPinned] = useState(false)

  if (previousInputRef.current !== input) {
    restoreDateRef.current = stateRef.current.date
    previousInputRef.current = input
  }

  inputRef.current = input

  stateRef.current = { date: focusedDate, pinned }

  const definition = useMemo(() => synchronizedCursorDefinition(input), [input])

  const rows = useMemo(
    () => selectSynchronizedCursorData(travelers, input.revision),
    [input.revision],
  )

  const row = focusedDate
    ? synchronizedCursorDatumAtDate(rows, focusedDate)
    : undefined

  return (
    <div
      onMouseLeave={() => {
        if (stateRef.current.pinned) return
        interactionRef.current?.setControlledFocus(null)
        stateRef.current = { date: null, pinned: false }
        setFocusedDate(null)
        setPinned(false)
      }}
      style={{
        display: 'grid',
        gridTemplateRows: `${summaryHeight}px minmax(0, 1fr)`,
        width: input.width,
        height: input.height,
      }}
    >
      <div
        data-conformance-synchronized-summary=""
        data-date={
          focusedDate ? synchronizedCursorDateKey(focusedDate) : undefined
        }
        data-pinned={String(pinned)}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          alignItems: 'center',
          gap: 8,
          minHeight: summaryHeight,
          padding: '6px 12px',
          boxSizing: 'border-box',
          borderBottom:
            '1px solid color-mix(in srgb, CanvasText 16%, transparent)',
          background: 'color-mix(in srgb, Canvas 95%, CanvasText 5%)',
          color: 'CanvasText',
          font: '500 12px/1.25 system-ui, sans-serif',
        }}
      >
        <SummaryValue
          dataAttribute="date"
          label="Linked date"
          color="currentColor"
          value={
            focusedDate
              ? `${formatDate(focusedDate)}${pinned ? ' · pinned' : ''}`
              : 'Focus either chart'
          }
        />
        <SummaryValue
          dataAttribute="current"
          label="2020 travelers"
          color={synchronizedCursorColors.current}
          value={row?.current.toLocaleString() ?? '—'}
        />
        <SummaryValue
          dataAttribute="previous"
          label="2019 travelers"
          color={synchronizedCursorColors.previous}
          value={row?.previous.toLocaleString() ?? '—'}
        />
      </div>
      <div
        ref={chartFrameRef}
        style={{ minHeight: 0, width: input.width, height: chartHeight(input) }}
      >
        <Chart
          idPrefix={idPrefix}
          definition={definition}
          width={input.width}
          height={chartHeight(input)}
          ariaLabel="Linked 2020 and 2019 airport traveler time series"
          ariaDescription="Move across either view or use the arrow keys to compare both years at the same date. Select a point to pin the cursor."
          onFocusGroupChange={(points) => {
            const date = points[0]?.datum.date ?? null
            setFocusedDate(date)
            if (!date) setPinned(false)
          }}
          onSelect={(point) => {
            if (!point) return
            setFocusedDate(point.datum.date)
            setPinned((value) => !value)
          }}
          onRender={({ interaction, scene }) => {
            sceneRef.current = scene
            interactionRef.current = interaction
            const restoreDate = restoreDateRef.current
            restoreDateRef.current = undefined
            if (!restoreDate) return
            const timestamp = restoreDate.getTime()
            const point = scene.points.find(
              (candidate) =>
                candidate.markId.endsWith(':current:current-points') &&
                candidate.datum.date.getTime() === timestamp,
            )
            if (point) {
              interaction.setControlledFocus(point, {
                source: 'programmatic',
                pinned: stateRef.current.pinned,
              })
            }
          }}
        />
      </div>
    </div>
  )
}
