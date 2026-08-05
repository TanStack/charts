import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { defineChart, dot, lineY } from '@tanstack/charts'
import { focusX } from '@tanstack/charts/focus'
import { Chart } from '@tanstack/react-charts'
import { travelers } from '@charts-poc/demo-data/travelers'
import { scaleLinear, scaleUtc } from 'd3-scale'
import { reactMount } from '../../shared/react-mount'
import { selectSynchronizedCursorData } from './selection'
import {
  synchronizedCursorAnchorDate,
  synchronizedCursorDateKey,
  synchronizedCursorDatumAtDate,
  synchronizedCursorNearestDatum,
  synchronizedCursorViews,
  synchronizedCursorYDomains,
} from './model'
import { synchronizedCursorColors } from './colors'
import type { ChartPoint, ChartScene } from '@tanstack/charts'
import type { TravelersRow } from '@charts-poc/demo-data/travelers'
import type { SynchronizedCursorView } from './model'
import type {
  ConformanceGeometryQuery,
  ConformanceGeometrySample,
  ConformanceJsonObject,
  ConformanceTarget,
  ConformanceTestDriver,
} from '../../types'
import type { ReactConformanceProps } from '../../shared/react-mount'

const travelerCountFormat = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

const SynchronizedCursorsExample = forwardRef<
  ConformanceTestDriver,
  ReactConformanceProps
>(function SynchronizedCursorsExample({ input, idPrefix }, ref) {
  const surfacesRef = useRef<
    Partial<Record<SynchronizedCursorView, HTMLDivElement>>
  >({})
  const scenesRef = useRef<
    Record<SynchronizedCursorView, ChartScene<TravelersRow> | null>
  >({ current: null, previous: null })
  const focusedDateRef = useRef<Date | null>(null)
  const pinnedDateRef = useRef<Date | null>(null)
  const [focusedDate, setFocusedDateState] = useState<Date | null>(null)
  const [pinnedDate, setPinnedDateState] = useState<Date | null>(null)
  const [, repaint] = useState(0)
  const rows = useMemo(
    () => selectSynchronizedCursorData(travelers, input.revision),
    [input.revision],
  )
  const viewHeight = Math.max(140, Math.floor((input.height - 56 - 8) / 2))

  const setDates = (focus: Date | null, pin: Date | null) => {
    focusedDateRef.current = focus
    pinnedDateRef.current = pin
    setFocusedDateState(focus)
    setPinnedDateState(pin)
  }
  const handleFocus = (points: readonly ChartPoint<TravelersRow>[]) => {
    if (!points.length && pinnedDateRef.current) return
    const date = points[0]?.datum.date ?? null
    focusedDateRef.current = date
    setFocusedDateState(date)
  }
  const handleSelect = (point: ChartPoint<TravelersRow> | null) => {
    if (!point) return
    const same = pinnedDateRef.current?.getTime() === point.datum.date.getTime()
    setDates(same ? null : point.datum.date, same ? null : point.datum.date)
  }

  useImperativeHandle(
    ref,
    () => ({
      resolveTarget(target) {
        return resolveTarget(
          surfacesRef.current,
          scenesRef.current,
          input,
          target,
        )
      },
      readState() {
        return interactionState(
          scenesRef.current,
          input,
          focusedDateRef.current,
          pinnedDateRef.current !== null,
        )
      },
      geometry(query) {
        return geometry(surfacesRef.current, scenesRef.current, input, query)
      },
      viewBounds(view) {
        const synchronized = synchronizedView(view)
        const surface = synchronized ? surfacesRef.current[synchronized] : null
        const scene = synchronized ? scenesRef.current[synchronized] : null
        return surface && scene ? sceneChartBounds(surface, scene) : null
      },
    }),
    [input],
  )

  const focusedDatum = focusedDate
    ? synchronizedCursorDatumAtDate(rows, focusedDate)
    : null

  if (input.preview) {
    return (
      <CursorChart
        idPrefix={idPrefix ? `${idPrefix}-current` : undefined}
        view="current"
        input={input}
        rows={rows}
        height={input.height}
        focusedDate={focusedDate}
        surfaceRef={(surface) => {
          if (surface) surfacesRef.current.current = surface
        }}
        onScene={(scene) => {
          scenesRef.current.current = scene
        }}
        onFocus={handleFocus}
        onSelect={handleSelect}
      />
    )
  }

  return (
    <div
      onKeyDown={(event) => {
        if (event.key !== 'Escape' || !pinnedDateRef.current) return
        event.preventDefault()
        setDates(null, null)
      }}
      style={{
        display: 'grid',
        gridTemplateRows: '56px minmax(0, 1fr)',
        width: input.width,
        height: input.height,
      }}
    >
      <Summary
        date={focusedDate}
        datum={focusedDatum}
        pinned={Boolean(pinnedDate)}
      />
      <div
        style={{
          display: 'grid',
          gridTemplateRows: `${viewHeight}px ${viewHeight}px`,
          gap: 8,
          minHeight: 0,
        }}
      >
        {synchronizedCursorViews.map((view) => (
          <CursorChart
            key={view}
            idPrefix={idPrefix ? `${idPrefix}-${view}` : undefined}
            view={view}
            input={input}
            rows={rows}
            height={viewHeight}
            focusedDate={focusedDate}
            surfaceRef={(surface) => {
              if (surface) surfacesRef.current[view] = surface
            }}
            onScene={(scene) => {
              scenesRef.current[view] = scene
              repaint((value) => value + 1)
            }}
            onFocus={handleFocus}
            onSelect={handleSelect}
          />
        ))}
      </div>
    </div>
  )
})

export const catalogComponent = SynchronizedCursorsExample
export const mount = reactMount(SynchronizedCursorsExample)

function CursorChart({
  focusedDate,
  height,
  idPrefix,
  input,
  onFocus,
  onScene,
  onSelect,
  rows,
  surfaceRef,
  view,
}: {
  focusedDate: Date | null
  height: number
  idPrefix?: string
  input: ReactConformanceProps['input']
  onFocus: (points: readonly ChartPoint<TravelersRow>[]) => void
  onScene: (scene: ChartScene<TravelersRow>) => void
  onSelect: (point: ChartPoint<TravelersRow> | null) => void
  rows: readonly TravelersRow[]
  surfaceRef: (surface: HTMLDivElement | null) => void
  view: SynchronizedCursorView
}) {
  const sceneRef = useRef<ChartScene<TravelersRow> | null>(null)
  const definition = useMemo(
    () =>
      defineChart(
        defineChart({
          marks: [
            lineY(rows, {
              x: 'date',
              y: view,
              stroke: synchronizedCursorColors[view],
              strokeWidth: 2,
            }),
            dot(rows, {
              x: 'date',
              y: view,
              fill: synchronizedCursorColors[view],
              r: 3,
              stroke: '#ffffff',
              strokeWidth: 1,
            }),
          ],
          x: {
            scale: scaleUtc,
            axis: {
              ticks: {
                format: (value) =>
                  value.toLocaleDateString(undefined, {
                    month: 'short',
                    timeZone: 'UTC',
                  }),
              },
            },
          },
          y: {
            scale: scaleLinear().domain(synchronizedCursorYDomains[view]),
            grid: true,
            axis: {
              ticks: { count: 4, format: travelerCountFormat.format },
              label: view === 'current' ? '2020 travelers' : '2019 travelers',
            },
          },
          margin: { top: 16, right: 24, bottom: 34, left: 62 },
        }),
        {
          animate: false,
          keyboard: true,
          focus: focusX,
          maxFocusDistance: Number.POSITIVE_INFINITY,
        },
      ),
    [rows, view],
  )
  const datum = focusedDate
    ? synchronizedCursorDatumAtDate(rows, focusedDate)
    : null
  const scene = sceneRef.current
  const x = scene && focusedDate ? scene.scales.x.map(focusedDate) : null

  if (input.preview) {
    return (
      <Chart
        idPrefix={idPrefix}
        definition={definition}
        initialWidth={input.width}
        aspectRatio={input.width / input.height}
        ariaLabel={
          view === 'current'
            ? 'Linked 2020 airport travelers time series'
            : 'Linked 2019 airport travelers time series'
        }
      />
    )
  }

  return (
    <div
      ref={surfaceRef}
      data-conformance-view={view}
      style={{ position: 'relative' }}
    >
      <Chart
        idPrefix={idPrefix}
        definition={definition}
        width={input.width}
        height={height}
        ariaLabel={
          view === 'current'
            ? 'Linked 2020 airport travelers time series'
            : 'Linked 2019 airport travelers time series'
        }
        onFocusGroupChange={onFocus}
        onSelect={onSelect}
        onRender={({ scene: nextScene }) => {
          sceneRef.current = nextScene
          onScene(nextScene)
        }}
      />
      {scene ? (
        <svg
          data-conformance-overlay="synchronized-crosshair"
          aria-hidden="true"
          viewBox={`0 0 ${scene.width} ${scene.height}`}
          style={overlayStyle}
        >
          {x !== null ? (
            <>
              <line
                data-conformance-crosshair="x"
                x1={x}
                x2={x}
                y1={scene.chart.y}
                y2={scene.chart.y + scene.chart.height}
                stroke="#64748b"
                strokeWidth={1}
                strokeDasharray="4 4"
              />
              {datum ? (
                <circle
                  data-conformance-crosshair="marker"
                  cx={x}
                  cy={scene.scales.y.map(datum[view])}
                  r={5}
                  fill="#ffffff"
                  stroke="#334155"
                  strokeWidth={2}
                />
              ) : null}
            </>
          ) : null}
        </svg>
      ) : null}
    </div>
  )
}

const overlayStyle = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  overflow: 'visible',
  pointerEvents: 'none',
} as const

function Summary({
  date,
  datum,
  pinned,
}: {
  date: Date | null
  datum: TravelersRow | null
  pinned: boolean
}) {
  return (
    <div
      data-conformance-synchronized-summary
      data-date={date ? synchronizedCursorDateKey(date) : undefined}
      data-pinned={pinned}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        alignItems: 'center',
        gap: 8,
        minHeight: 56,
        padding: '6px 12px',
        boxSizing: 'border-box',
        borderBottom:
          '1px solid color-mix(in srgb, CanvasText 16%, transparent)',
        background: 'color-mix(in srgb, Canvas 95%, CanvasText 5%)',
        color: 'CanvasText',
        font: '500 12px/1.25 system-ui, sans-serif',
      }}
    >
      <SummaryCell
        label="Linked date"
        color="currentColor"
        value={
          date
            ? `${formatDate(date)}${pinned ? ' · pinned' : ''}`
            : 'Focus either chart'
        }
        data="date"
      />
      <SummaryCell
        label="2020 travelers"
        color={synchronizedCursorColors.current}
        value={datum?.current.toLocaleString() ?? '—'}
        data="current"
      />
      <SummaryCell
        label="2019 travelers"
        color={synchronizedCursorColors.previous}
        value={datum?.previous.toLocaleString() ?? '—'}
        data="previous"
      />
    </div>
  )
}

function SummaryCell({
  label,
  color,
  value,
  data,
}: {
  label: string
  color: string
  value: string
  data: 'date' | 'current' | 'previous'
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
        {...{ [`data-conformance-synchronized-${data}`]: '' }}
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

function resolveTarget(
  surfaces: Partial<Record<SynchronizedCursorView, HTMLDivElement>>,
  scenes: Record<SynchronizedCursorView, ChartScene<TravelersRow> | null>,
  input: ReactConformanceProps['input'],
  target: ConformanceTarget,
) {
  const view = synchronizedView(target.view)
  const date = synchronizedCursorAnchorDate(target.anchor)
  const surface = view ? surfaces[view] : null
  const scene = view ? scenes[view] : null
  if (!view || !date || !surface || !scene) return null
  const datum = synchronizedCursorNearestDatum(
    selectSynchronizedCursorData(travelers, input.revision),
    date,
  )
  if (!datum) return null
  return scenePointToClient(
    surface,
    scene,
    scene.scales.x.map(date),
    scene.scales.y.map(datum[view]),
  )
}

function geometry(
  surfaces: Partial<Record<SynchronizedCursorView, HTMLDivElement>>,
  scenes: Record<SynchronizedCursorView, ChartScene<TravelersRow> | null>,
  input: ReactConformanceProps['input'],
  query: ConformanceGeometryQuery,
): readonly ConformanceGeometrySample[] {
  const view = synchronizedView(query.view)
  const surface = view ? surfaces[view] : null
  const scene = view ? scenes[view] : null
  const svg = surface?.querySelector<SVGSVGElement>('svg.ts-chart')
  if (!view || !scene || !svg) return []
  const svgBounds = svg.getBoundingClientRect()
  const scaleX = svgBounds.width / scene.width
  const scaleY = svgBounds.height / scene.height
  const rows = selectSynchronizedCursorData(travelers, input.revision)
  if (query.role === 'dot') {
    return rows.map((datum) => ({
      x: svgBounds.left + scene.scales.x.map(datum.date) * scaleX - 3 * scaleX,
      y: svgBounds.top + scene.scales.y.map(datum[view]) * scaleY - 3 * scaleY,
      width: 6 * scaleX,
      height: 6 * scaleY,
      paint: synchronizedCursorColors[view],
    }))
  }
  if (query.role !== 'line') return []
  const points = rows.map((datum): readonly [number, number] => [
    scene.scales.x.map(datum.date),
    scene.scales.y.map(datum[view]),
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

function synchronizedView(
  view: string | undefined,
): SynchronizedCursorView | null {
  return view === 'current' || view === 'previous' ? view : null
}

function scenePointToClient(
  surface: HTMLDivElement,
  scene: ChartScene<TravelersRow>,
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
  scene: ChartScene<TravelersRow>,
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
  bounds: DOMRect,
  scaleX: number,
  scaleY: number,
  paint: string,
): ConformanceGeometrySample | null {
  if (!points.length) return null
  const xs = points.map(([x]) => x)
  const ys = points.map(([, y]) => y)
  const left = Math.min(...xs)
  const right = Math.max(...xs)
  const top = Math.min(...ys)
  const bottom = Math.max(...ys)
  return {
    x: bounds.left + left * scaleX,
    y: bounds.top + top * scaleY,
    width: Math.max(1, (right - left) * scaleX),
    height: Math.max(1, (bottom - top) * scaleY),
    paint,
  }
}

function interactionState(
  scenes: Record<SynchronizedCursorView, ChartScene<TravelersRow> | null>,
  input: ReactConformanceProps['input'],
  date: Date | null,
  pinned: boolean,
): ConformanceJsonObject {
  const rows = selectSynchronizedCursorData(travelers, input.revision)
  const crosshair = (view: SynchronizedCursorView) => {
    const scene = scenes[view]
    const x = scene && date ? scene.scales.x.map(date) : null
    return {
      visible: x !== null,
      xNormalized:
        x !== null && scene ? (x - scene.chart.x) / scene.chart.width : null,
    }
  }
  const current = crosshair('current')
  const previous = crosshair('previous')
  return {
    shared: {
      date: date ? synchronizedCursorDateKey(date) : null,
      currentValue: date
        ? (synchronizedCursorDatumAtDate(rows, date)?.current ?? null)
        : null,
      previousValue: date
        ? (synchronizedCursorDatumAtDate(rows, date)?.previous ?? null)
        : null,
      pinned,
    },
    crosshairs: {
      aligned:
        current.xNormalized !== null &&
        previous.xNormalized !== null &&
        Math.abs(current.xNormalized - previous.xNormalized) < 0.005,
      current,
      previous,
    },
  }
}
