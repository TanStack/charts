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
import { industries } from '@charts-poc/demo-data/industries'
import { scaleLinear, scaleUtc } from 'd3-scale'
import { reactMount } from '../../shared/react-mount'
import { axisPointerColors } from './colors'
import { axisPointerData, axisPointerIndustries } from './selection'
import {
  axisPointerAnchorDate,
  axisPointerDateKey,
  axisPointerRowsAtDate,
  axisPointerTargetValue,
} from './model'
import type { ChartPoint, ChartScene } from '@tanstack/charts'
import type { AxisPointerDatum } from './selection'
import type {
  ConformanceGeometryQuery,
  ConformanceGeometrySample,
  ConformanceJsonObject,
  ConformanceTarget,
  ConformanceTestDriver,
} from '../../types'
import type { ReactConformanceProps } from '../../shared/react-mount'

const AxisPointerExample = forwardRef<
  ConformanceTestDriver,
  ReactConformanceProps
>(function AxisPointerExample({ input }, ref) {
  const surfaceRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<ChartScene<AxisPointerDatum, Date, number> | null>(
    null,
  )
  const focusedPointsRef = useRef<
    readonly ChartPoint<AxisPointerDatum, Date, number>[]
  >([])
  const [focusedPoints, setFocusedPoints] = useState<
    readonly ChartPoint<AxisPointerDatum, Date, number>[]
  >([])
  const [scene, setScene] = useState<ChartScene<
    AxisPointerDatum,
    Date,
    number
  > | null>(null)
  const definition = useMemo(() => {
    const rows = axisPointerData(industries, input.revision)
    return defineChart(
      defineChart({
        marks: [
          lineY(rows, {
            x: 'date',
            y: 'unemployed',
            color: 'industry',
            strokeWidth: 2,
          }),
          dot(rows, {
            x: 'date',
            y: 'unemployed',
            z: 'industry',
            color: 'industry',
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
          scale: scaleLinear,
          grid: true,
          axis: { ticks: { count: 5 }, label: 'Unemployed (thousands)' },
        },
        color: {
          domain: axisPointerIndustries,
          range: axisPointerIndustries.map(
            (industry) => axisPointerColors[industry],
          ),
        },
        margin: { top: 20, right: 24, bottom: 45, left: 60 },
      }),
      {
        animate: false,
        keyboard: true,
        focus: focusX,
        maxFocusDistance: Number.POSITIVE_INFINITY,
      },
    )
  }, [input.revision])
  const orderedPoints = axisPointerIndustries.flatMap((industry) => {
    const point = focusedPoints.find(
      (candidate) => candidate.datum.industry === industry,
    )
    return point ? [point] : []
  })
  const focusedPoint = orderedPoints[0]
  const tooltipPosition =
    scene && focusedPoint ? positionTooltip(scene, focusedPoint.x) : null

  useImperativeHandle(
    ref,
    () => ({
      resolveTarget(target) {
        const surface = surfaceRef.current
        const currentScene = sceneRef.current
        return surface && currentScene
          ? resolveTarget(surface, input, currentScene, target)
          : null
      },
      readState() {
        return interactionState(focusedPointsRef.current)
      },
      geometry(query) {
        const surface = surfaceRef.current
        const currentScene = sceneRef.current
        return surface && currentScene
          ? geometry(surface, input, currentScene, query)
          : []
      },
    }),
    [input],
  )

  return (
    <div
      ref={surfaceRef}
      data-conformance-view="main"
      style={{ position: 'relative', width: input.width, height: input.height }}
    >
      <Chart
        definition={definition}
        width={input.width}
        height={input.height}
        ariaLabel="Snapped axis pointer with grouped tooltip"
        ariaDescription="Move across the chart or use the arrow keys to compare all three industries at the nearest month."
        onFocusGroupChange={(points) => {
          focusedPointsRef.current = points
          setFocusedPoints(points)
        }}
        onRender={({ scene: nextScene }) => {
          sceneRef.current = nextScene
          setScene(nextScene)
        }}
      />
      <div
        aria-label="Industries"
        style={{
          position: 'absolute',
          top: 2,
          right: 24,
          zIndex: 1,
          display: 'flex',
          gap: 10,
          color: 'CanvasText',
          font: '600 10px/1.4 system-ui, sans-serif',
          pointerEvents: 'none',
        }}
      >
        {axisPointerIndustries.map((industry) => (
          <span
            key={industry}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: 2,
                background: axisPointerColors[industry],
              }}
            />
            {industry}
          </span>
        ))}
      </div>
      <div
        style={{
          position: 'absolute',
          right: 24,
          bottom: 2,
          zIndex: 1,
          color: 'CanvasText',
          opacity: 0.72,
          font: '500 10px/1.4 system-ui, sans-serif',
          pointerEvents: 'none',
        }}
      >
        Hover or use ← → to compare months
      </div>
      {scene ? (
        <svg
          aria-hidden="true"
          data-conformance-overlay="crosshair"
          viewBox={`0 0 ${scene.width} ${scene.height}`}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            overflow: 'visible',
            pointerEvents: 'none',
          }}
        >
          {focusedPoint ? (
            <line
              data-conformance-crosshair="x"
              x1={focusedPoint.x}
              x2={focusedPoint.x}
              y1={scene.chart.y}
              y2={scene.chart.y + scene.chart.height}
              stroke="#64748b"
              strokeWidth={1}
              strokeDasharray="4 4"
            />
          ) : null}
        </svg>
      ) : null}
      <div
        data-conformance-tooltip="grouped"
        data-placement={tooltipPosition?.placement}
        role="status"
        aria-live="polite"
        hidden={!focusedPoint}
        style={{
          position: 'absolute',
          zIndex: 2,
          minWidth: '9rem',
          padding: '0.45rem 0.55rem',
          border: '1px solid color-mix(in srgb, CanvasText 18%, transparent)',
          borderRadius: '0.45rem',
          background: 'Canvas',
          color: 'CanvasText',
          boxShadow: '0 6px 24px rgb(0 0 0 / 0.14)',
          font: '500 0.75rem/1.3 system-ui, sans-serif',
          pointerEvents: 'none',
          left: tooltipPosition?.left,
          top: tooltipPosition?.top,
        }}
      >
        {focusedPoint ? (
          <>
            <strong>
              {focusedPoint.datum.date.toLocaleDateString(undefined, {
                month: 'short',
                year: 'numeric',
                timeZone: 'UTC',
              })}
            </strong>
            {orderedPoints.map((point) => (
              <div
                key={point.datum.industry}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  marginTop: '0.25rem',
                }}
              >
                <span
                  style={{
                    width: '0.5rem',
                    height: '0.5rem',
                    borderRadius: '0.125rem',
                    background: axisPointerColors[point.datum.industry],
                  }}
                />
                <span>{point.datum.industry}</span>
                <strong style={{ marginLeft: 'auto' }}>
                  {point.datum.unemployed.toLocaleString()}
                </strong>
              </div>
            ))}
          </>
        ) : null}
      </div>
    </div>
  )
})

export const mount = reactMount(AxisPointerExample)

function positionTooltip(scene: ChartScene<AxisPointerDatum>, pointX: number) {
  const gap = 10
  const edge = 8
  const width = 160
  const preferredRight = pointX + gap
  const left =
    preferredRight + width <= scene.width - edge
      ? preferredRight
      : pointX - gap - width
  return {
    left: Math.max(edge, Math.min(scene.width - width - edge, left)),
    top: scene.chart.y + 8,
    placement: left === preferredRight ? 'right' : 'left',
  }
}

function resolveTarget(
  surface: HTMLDivElement,
  input: ReactConformanceProps['input'],
  scene: ChartScene<AxisPointerDatum>,
  target: ConformanceTarget,
) {
  if (target.view && target.view !== 'main') return null
  const rows = axisPointerData(industries, input.revision)
  const date = axisPointerAnchorDate(target.anchor, rows)
  if (!date) return null
  const focusedRows = axisPointerRowsAtDate(rows, date)
  const targetValue = axisPointerTargetValue(focusedRows)
  if (targetValue === null) return null
  return scenePointToClient(
    surface,
    scene,
    scene.scales.x.map(date),
    scene.scales.y.map(targetValue),
  )
}

function geometry(
  surface: HTMLDivElement,
  input: ReactConformanceProps['input'],
  scene: ChartScene<AxisPointerDatum>,
  query: ConformanceGeometryQuery,
): readonly ConformanceGeometrySample[] {
  if (query.view && query.view !== 'main') return []
  const svg = surface.querySelector<SVGSVGElement>('svg.ts-chart')
  if (!svg) return []
  const svgBounds = svg.getBoundingClientRect()
  const scaleX = svgBounds.width / scene.width
  const scaleY = svgBounds.height / scene.height
  const rows = axisPointerData(industries, input.revision)

  if (query.role === 'dot') {
    return rows.map((row) => ({
      x: svgBounds.left + scene.scales.x.map(row.date) * scaleX - 3 * scaleX,
      y:
        svgBounds.top +
        scene.scales.y.map(row.unemployed) * scaleY -
        3 * scaleY,
      width: 6 * scaleX,
      height: 6 * scaleY,
      paint: axisPointerColors[row.industry],
    }))
  }

  if (query.role === 'line') {
    return axisPointerIndustries.flatMap((industry) => {
      const points = rows
        .filter((row) => row.industry === industry)
        .map((row): readonly [number, number] => [
          scene.scales.x.map(row.date),
          scene.scales.y.map(row.unemployed),
        ])
      const sample = pointsBounds(
        points,
        svgBounds,
        scaleX,
        scaleY,
        axisPointerColors[industry],
      )
      return sample ? [sample] : []
    })
  }

  return []
}

function scenePointToClient(
  surface: HTMLDivElement,
  scene: ChartScene<AxisPointerDatum>,
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
  points: readonly ChartPoint<AxisPointerDatum>[],
): ConformanceJsonObject {
  const ordered = axisPointerIndustries.flatMap((industry) => {
    const point = points.find(
      (candidate) => candidate.datum.industry === industry,
    )
    return point ? [point] : []
  })
  const date = ordered[0]?.datum.date
  return {
    focus: {
      date: date ? axisPointerDateKey(date) : null,
      industries: ordered.map((point) => point.datum.industry),
      values: ordered.map((point) => point.datum.unemployed),
    },
    crosshair: { visible: ordered.length > 0 },
    tooltip: { visible: ordered.length > 0 },
  }
}
