import { streamingWindowDefinition } from './example'
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Chart } from '@tanstack/charts/react'
import { downloads } from '@charts-poc/demo-data/downloads'
import { catalogPreviewDefinition } from '../../shared/preview'
import { clientPointBounds } from '../../shared/driver-geometry'
import { reactMount } from '../../shared/react-mount'
import { streamingData } from './selection'
import {
  formatStreamingDate,
  streamingDateKey,
  streamingStatus,
  streamingViewportForMode,
  streamingViewportLabel,
  visibleStreamingData,
} from './model'
import type { ChartScene } from '@tanstack/charts'
import type { DownloadsRow } from '@charts-poc/demo-data/downloads'
import type { StreamingViewportMode } from './model'
import type {
  ConformanceGeometryQuery,
  ConformanceGeometrySample,
  ConformanceTarget,
  ConformanceTestDriver,
} from '../../types'
import type { ReactConformanceProps } from '../../shared/react-mount'

const color = '#2563eb'

const StreamingExample = forwardRef<
  ConformanceTestDriver,
  ReactConformanceProps
>(function StreamingExample({ input, idPrefix }, ref) {
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

  useImperativeHandle(
    ref,
    () => ({
      resolveTarget(target) {
        return controlTarget(viewRef.current, target)
      },
      readState() {
        return streamingState(stateRef.current)
      },
      geometry(query) {
        const surface = chartSurfaceRef.current
        const scene = sceneRef.current
        return surface && scene
          ? streamingGeometry(surface, stateRef.current, scene, query)
          : []
      },
    }),
    [],
  )

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

  if (input.preview) {
    return (
      <Chart
        idPrefix={idPrefix}
        definition={catalogPreviewDefinition(definition)}
        initialWidth={input.width}
        aspectRatio={input.width / input.height}
        ariaLabel="Package downloads in a locked time viewport"
      />
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
})

export const catalogComponent = StreamingExample
export const mount = reactMount(StreamingExample)

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

function controlTarget(view: HTMLDivElement | null, target: ConformanceTarget) {
  if (!view || (target.view !== undefined && target.view !== 'main')) {
    return null
  }
  const control =
    target.anchor === 'control:append'
      ? 'append'
      : target.anchor === 'control:follow'
        ? 'follow'
        : target.anchor === 'control:all'
          ? 'all'
          : null
  const button = control
    ? view.querySelector<HTMLElement>(`[data-streaming-control="${control}"]`)
    : null
  if (!button) return null
  const bounds = button.getBoundingClientRect()
  return {
    x: bounds.left + bounds.width / 2,
    y: bounds.top + bounds.height / 2,
    focusElement: button,
  }
}

function streamingState(state: {
  rows: readonly DownloadsRow[]
  appended: number
  viewport: readonly [Date, Date]
  viewportMode: StreamingViewportMode
}) {
  const first = state.rows[0]
  const last = state.rows[state.rows.length - 1]
  const visibleRows = visibleStreamingData(state.rows, state.viewport)
  return {
    data: {
      count: state.rows.length,
      ids: state.rows.map((row) => streamingDateKey(row.date)),
      domainStart: first ? streamingDateKey(first.date) : null,
      domainEnd: last ? streamingDateKey(last.date) : null,
    },
    visible: {
      count: visibleRows.length,
      ids: visibleRows.map((row) => streamingDateKey(row.date)),
    },
    viewport: {
      start: streamingDateKey(state.viewport[0]),
      end: streamingDateKey(state.viewport[1]),
      locked: state.viewportMode === 'locked',
      mode: state.viewportMode,
    },
    control: { appended: state.appended },
  }
}

function streamingGeometry(
  chartSurface: HTMLDivElement,
  state: {
    rows: readonly DownloadsRow[]
    viewport: readonly [Date, Date]
  },
  scene: ChartScene<DownloadsRow>,
  query: ConformanceGeometryQuery,
): readonly ConformanceGeometrySample[] {
  if (query.view !== undefined && query.view !== 'main') return []
  const svg = chartSurface.querySelector<SVGSVGElement>('svg.ts-chart')
  if (!svg) return []
  const rows = visibleStreamingData(state.rows, state.viewport)
  const bounds = svg.getBoundingClientRect()
  const scaleX = bounds.width / scene.width
  const scaleY = bounds.height / scene.height
  const points = rows.map((row): readonly [number, number] => [
    scene.scales.x.map(row.date),
    scene.scales.y.map(row.downloads),
  ])

  if (query.role === 'dot') {
    return points.map((point) => ({
      x: bounds.left + (point[0] - 3.5) * scaleX,
      y: bounds.top + (point[1] - 3.5) * scaleY,
      width: 7 * scaleX,
      height: 7 * scaleY,
      paint: color,
    }))
  }
  if (query.role === 'line') {
    const sample = clientPointBounds(points, bounds, {
      scaleX,
      scaleY,
      paint: color,
    })
    return sample ? [sample] : []
  }
  return []
}
