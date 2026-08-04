import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { defineChart, lineY } from '@tanstack/charts'
import { Chart } from '@tanstack/react-charts'
import { industries } from '@charts-poc/demo-data/industries'
import { scaleLinear, scaleUtc } from 'd3-scale'
import { reactMount } from '../../shared/react-mount'
import {
  isLegendSeriesId,
  legendRows,
  legendSeries,
  toggleLegendSeries,
} from './model'
import type { ConformanceTarget, ConformanceTestDriver } from '../../types'
import type { ReactConformanceProps } from '../../shared/react-mount'
import type { LegendSeriesId } from './model'

const yDomain = [0, 900] as const
const initialVisibleSeries: readonly LegendSeriesId[] = [
  'Manufacturing',
  'Construction',
]
const seriesColors: Readonly<Record<LegendSeriesId, string>> = {
  Manufacturing: '#2563eb',
  Construction: '#f97316',
}

const InteractiveLegendExample = forwardRef<
  ConformanceTestDriver,
  ReactConformanceProps
>(function InteractiveLegendExample({ input, idPrefix }, ref) {
  const viewRef = useRef<HTMLDivElement>(null)
  const chartSurfaceRef = useRef<HTMLDivElement>(null)
  const [visibleSeries, setVisibleSeries] = useState(initialVisibleSeries)
  const definition = useMemo(() => {
    const rows = legendRows(industries, input.revision)
    return defineChart(
      defineChart({
        marks: legendSeries.flatMap((series) =>
          visibleSeries.includes(series.id)
            ? [
                lineY(
                  rows.filter((row) => row.industry === series.id),
                  {
                    id: series.id,
                    x: 'date',
                    y: 'unemployed',
                    color: 'industry',
                    strokeWidth: 2.5,
                  },
                ),
              ]
            : [],
        ),
        x: {
          scale: scaleUtc,
          axis: {
            ticks: {
              format: (date) =>
                date.toLocaleDateString('en-US', {
                  month: 'short',
                  timeZone: 'UTC',
                }),
            },
          },
        },
        y: {
          scale: scaleLinear().domain(yDomain),
          grid: true,
          axis: { ticks: { count: 5 }, label: 'Unemployed (thousands)' },
        },
        color: {
          domain: legendSeries.map((series) => series.id),
          range: legendSeries.map((series) => seriesColors[series.id]),
        },
        margin: { top: 20, right: 24, bottom: 44, left: 62 },
      }),
      { animate: false, keyboard: false },
    )
  }, [input.revision, visibleSeries])

  useImperativeHandle(
    ref,
    () => ({
      resolveTarget(target) {
        const seriesId = seriesFromTarget(target)
        if (!seriesId) return null
        const button = viewRef.current?.querySelector<HTMLElement>(
          `[data-series-id="${seriesId}"]`,
        )
        return button ? center(button) : null
      },
      readState() {
        const chartSurface = chartSurfaceRef.current
        const activeElement = viewRef.current?.ownerDocument.activeElement
        return {
          visibleSeries,
          hiddenSeries: legendSeries
            .map((series) => series.id)
            .filter((seriesId) => !visibleSeries.includes(seriesId)),
          renderedSeries: chartSurface ? renderedSeries(chartSurface) : [],
          yDomain,
          focusedSeries:
            activeElement instanceof HTMLElement
              ? (activeElement.dataset.seriesId ?? null)
              : null,
        }
      },
    }),
    [visibleSeries],
  )

  if (input.preview) {
    return (
      <Chart
        idPrefix={idPrefix}
        definition={definition}
        initialWidth={input.width}
        aspectRatio={input.width / input.height}
        ariaLabel="Manufacturing and construction unemployment chart"
      />
    )
  }

  return (
    <div
      ref={viewRef}
      data-conformance-view="main"
      role="region"
      aria-label="Interactive unemployment series"
      style={{
        width: input.width,
        height: input.height,
        display: 'grid',
        gridTemplateRows: '1fr auto',
      }}
    >
      <div ref={chartSurfaceRef} style={{ minHeight: 0 }}>
        <Chart
          idPrefix={idPrefix}
          definition={definition}
          width={input.width}
          height={Math.max(96, input.height - 62)}
          ariaLabel="Manufacturing and construction unemployment chart"
        />
      </div>
      <div
        role="group"
        aria-label="Series visibility"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 8,
          padding: '6px 8px',
        }}
      >
        {legendSeries.map((series) => {
          const visible = visibleSeries.includes(series.id)
          return (
            <button
              key={series.id}
              type="button"
              data-series-id={series.id}
              data-visible={visible}
              aria-label={`Toggle ${series.label} series`}
              aria-pressed={visible}
              onClick={() =>
                setVisibleSeries((current) =>
                  toggleLegendSeries(current, series.id),
                )
              }
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 7,
                minWidth: 110,
                minHeight: 44,
                padding: '8px 12px',
                border:
                  '1px solid color-mix(in srgb, CanvasText 28%, transparent)',
                borderRadius: 999,
                color: 'CanvasText',
                background: visible
                  ? 'color-mix(in srgb, CanvasText 7%, Canvas)'
                  : 'Canvas',
                cursor: 'pointer',
                font: '600 13px/1 system-ui, sans-serif',
                outlineOffset: 3,
                textDecoration: visible ? 'none' : 'line-through',
              }}
            >
              <span
                data-series-swatch={series.id}
                style={{
                  width: 11,
                  height: 11,
                  border: `2px solid ${seriesColors[series.id]}`,
                  borderRadius: 3,
                  background: visible ? seriesColors[series.id] : 'transparent',
                }}
              />
              <span>{series.label}</span>
            </button>
          )
        })}
        <span
          role="status"
          aria-live="polite"
          hidden={visibleSeries.length > 0}
          style={{
            color: 'CanvasText',
            font: '500 12px/1.3 system-ui, sans-serif',
          }}
        >
          {visibleSeries.length === 0 ? 'No series shown' : ''}
        </span>
      </div>
    </div>
  )
})

export const catalogComponent = InteractiveLegendExample
export const mount = reactMount(InteractiveLegendExample)

function center(element: HTMLElement | SVGElement) {
  const bounds = element.getBoundingClientRect()
  return {
    x: bounds.left + bounds.width / 2,
    y: bounds.top + bounds.height / 2,
    focusElement: element,
  }
}

function seriesFromTarget(target: ConformanceTarget) {
  if (target.view !== undefined && target.view !== 'main') return null
  const [kind, id] = target.anchor.split(':')
  return kind === 'legend' && isLegendSeriesId(id) ? id : null
}

function renderedSeries(surface: HTMLElement) {
  const strokes = [
    ...surface.querySelectorAll<SVGPathElement>('.ts-chart__line path'),
  ].map((path) => path.getAttribute('stroke')?.toLowerCase())
  return legendSeries
    .filter((series) => strokes.includes(seriesColors[series.id].toLowerCase()))
    .map((series) => series.id)
}
