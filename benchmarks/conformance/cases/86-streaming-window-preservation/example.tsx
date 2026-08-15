import { useEffect, useMemo, useRef, useState } from 'react'
import { defineChart, dot, lineY } from '@tanstack/charts'
import { decorative } from '@tanstack/charts/mark/decorative'
import { tooltip } from '@tanstack/charts/tooltip'
import { Chart } from '@tanstack/charts/react'
import { downloads } from '@tanstack/charts-data/downloads'
import { scaleLinear, scaleUtc } from 'd3-scale'
import { streamingData } from './selection'
import {
  formatStreamingDate,
  streamingStatus,
  streamingViewportForMode,
  streamingViewportLabel,
  visibleStreamingData,
} from './model'
import type { ChartScene } from '@tanstack/charts'
import type { DownloadsRow } from '@tanstack/charts-data/downloads'
import type { StreamingViewportMode } from './model'

const color = '#2563eb'

export function streamingWindowDefinition(
  rows: readonly DownloadsRow[],
  viewport: readonly [Date, Date],
  viewportMode: StreamingViewportMode,
) {
  const visibleRows = visibleStreamingData(rows, viewport)
  return defineChart({
    marks: [
      decorative(
        lineY(visibleRows, {
          id: 'stream-line',
          x: 'date',
          y: 'downloads',
          stroke: color,
          strokeWidth: 2.5,
        }),
      ),
      dot(visibleRows, {
        id: 'stream-points',
        x: 'date',
        y: 'downloads',
        fill: color,
        r: 3.5,
        stroke: '#ffffff',
        strokeWidth: 1,
      }),
    ],
    x: {
      scale: scaleUtc().domain(viewport),
      axis: {
        ticks: {
          format: (value) =>
            value.toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              timeZone: 'UTC',
            }),
        },
        label: streamingViewportLabel(viewportMode),
      },
    },
    y: {
      scale: scaleLinear,
      grid: true,
      axis: { ticks: { count: 5 }, label: 'Downloads' },
    },
    margin: { top: 18, right: 24, bottom: 44, left: 58 },
    svgAnimation: false,
    keyboard: true,
    tooltip: {
      use: tooltip,
      format: (point) =>
        `${formatStreamingDate(point.datum.date)} · ${point.datum.downloads.toLocaleString()} downloads`,
    },
  })
}

function ControlButton({
  children,
  control,
  label,
  onClick,
  pressed,
}: {
  children: string
  control: 'append' | 'follow' | 'all'
  label: string
  onClick: () => void
  pressed?: boolean
}) {
  return (
    <button
      type="button"
      data-streaming-control={control}
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
      style={{
        minWidth: 0,
        minHeight: 44,
        padding: '0 10px',
        border: '1px solid color-mix(in srgb, CanvasText 22%, transparent)',
        borderRadius: 7,
        background: 'Canvas',
        color: 'CanvasText',
        font: '600 12px/1.15 system-ui, sans-serif',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}

export interface ExampleProps {
  width?: number
  height?: number
  revision?: number
}

export default function StreamingExample({
  width = 640,
  height = 480,
  revision = 0,
}: ExampleProps = {}) {
  const input = { width, height, revision, preview: false, interactive: true }
  const idPrefix = '86-streaming-window-preservation'
  const viewRef = useRef<HTMLDivElement>(null)

  const chartSurfaceRef = useRef<HTMLDivElement>(null)

  const sceneRef = useRef<ChartScene<DownloadsRow, Date, number> | null>(null)

  const [appended, setAppended] = useState(0)

  const [viewportMode, setViewportMode] =
    useState<StreamingViewportMode>('locked')

  const [announcement, setAnnouncement] = useState('')

  const rows = useMemo(
    () => streamingData(downloads, input.revision, appended),
    [appended, input.revision],
  )

  const viewport = useMemo(
    () => streamingViewportForMode(rows, viewportMode),
    [rows, viewportMode],
  )

  const stateRef = useRef({ rows, appended, viewport, viewportMode })

  stateRef.current = { rows, appended, viewport, viewportMode }

  const chartHeight = Math.max(180, input.height - 78)

  const definition = useMemo(
    () => streamingWindowDefinition(rows, viewport, viewportMode),
    [rows, viewport, viewportMode],
  )

  const status = streamingStatus({
    rows,
    viewport,
    viewportMode,
    announcement,
  })

  useEffect(() => {
    setAnnouncement('')
  }, [input.revision])

  const append = () => {
    const nextAppended = appended + 1
    const nextRows = streamingData(downloads, input.revision, nextAppended)
    const nextViewport = streamingViewportForMode(nextRows, viewportMode)
    const added = nextRows.at(-1)
    setAppended(nextAppended)
    setAnnouncement(
      added
        ? `Added ${formatStreamingDate(added.date)} (${added.downloads.toLocaleString()} downloads). ${
            visibleStreamingData([added], nextViewport).length
              ? 'The new sample is visible.'
              : `It is outside the locked viewport ending ${formatStreamingDate(nextViewport[1])}.`
          }`
        : '',
    )
  }

  return (
    <div
      ref={viewRef}
      data-conformance-view="main"
      style={{
        display: 'grid',
        gridTemplateRows: '78px minmax(0, 1fr)',
        width: input.width,
        height: input.height,
      }}
    >
      <div
        role="group"
        aria-label="Streaming viewport controls"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gridTemplateRows: '44px 18px',
          alignItems: 'center',
          gap: '4px 8px',
          padding: '6px 10px',
          boxSizing: 'border-box',
          background: 'Canvas',
          color: 'CanvasText',
          font: '500 12px/1.2 system-ui, sans-serif',
        }}
      >
        <ControlButton
          control="append"
          label="Append one sample"
          onClick={append}
        >
          Append
        </ControlButton>
        <ControlButton
          control="follow"
          label="Follow the latest eight samples"
          pressed={viewportMode === 'latest'}
          onClick={() => {
            setViewportMode('latest')
            const nextViewport = streamingViewportForMode(rows, 'latest')
            setAnnouncement(
              `Following the latest samples through ${formatStreamingDate(nextViewport[1])}.`,
            )
          }}
        >
          Follow latest
        </ControlButton>
        <ControlButton
          control="all"
          label="Unlock the viewport and show every sample"
          pressed={viewportMode === 'all'}
          onClick={() => {
            setViewportMode('all')
            setAnnouncement(
              `Viewport unlocked. Showing all ${rows.length} samples.`,
            )
          }}
        >
          Show all
        </ControlButton>
        <output
          data-conformance-streaming-status
          aria-live="polite"
          aria-atomic="true"
          title={status}
          style={{
            gridColumn: '1 / -1',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: 'currentColor',
            opacity: 0.72,
          }}
        >
          {status}
        </output>
      </div>
      <div
        ref={chartSurfaceRef}
        style={{ minHeight: 0, width: input.width, height: chartHeight }}
      >
        <Chart
          idPrefix={idPrefix}
          definition={definition}
          width={input.width}
          height={chartHeight}
          ariaLabel={`Package downloads · ${streamingViewportLabel(
            viewportMode,
          )}`}
          onRender={({ scene }) => {
            sceneRef.current = scene
          }}
        />
      </div>
    </div>
  )
}
