import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { colorLegend, defineChart, lineY } from '@tanstack/charts'
import { controlledSignal } from '@tanstack/charts/interaction/signal'
import { interactiveColorLegend } from '@tanstack/charts/legend'
import { Chart } from '@tanstack/react-charts'
import { industries } from '@charts-poc/demo-data/industries'
import { scaleLinear, scaleUtc } from 'd3-scale'
import { catalogPreviewDefinition } from '../../shared/preview'
import { reactMount } from '../../shared/react-mount'
import { isLegendSeriesId, legendRows, legendSeries } from './model'
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

export function interactiveLegendDefinition(
  revision: number,
  visibleSeries: readonly LegendSeriesId[],
  onVisibleSeriesChange: (visible: readonly LegendSeriesId[]) => void,
  preview = false,
) {
  const rows = legendRows(industries, revision)
  return defineChart(
    defineChart({
      marks: [
        lineY(rows, {
          id: 'industry-lines',
          x: 'date',
          y: 'unemployed',
          color: 'industry',
          strokeWidth: 2.5,
        }),
      ],
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
        legend: preview
          ? colorLegend({ label: 'Series', placement: 'bottom' })
          : interactiveColorLegend({
              visible: controlledSignal(visibleSeries, onVisibleSeriesChange),
              placement: 'bottom',
              ariaLabel: 'Series visibility',
            }),
      },
      margin: preview
        ? { top: 0, right: 0, left: 0 }
        : { top: 20, right: 24, left: 62 },
    }),
    { svgAnimation: false, keyboard: false },
  )
}

const InteractiveLegendExample = forwardRef<
  ConformanceTestDriver,
  ReactConformanceProps
>(function InteractiveLegendExample({ input, idPrefix }, ref) {
  const viewRef = useRef<HTMLDivElement>(null)
  const [visibleSeries, setVisibleSeries] = useState(initialVisibleSeries)
  const definition = useMemo(
    () =>
      interactiveLegendDefinition(
        input.revision,
        visibleSeries,
        setVisibleSeries,
        input.preview,
      ),
    [input.preview, input.revision, visibleSeries],
  )

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
        const chartSurface = viewRef.current
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
        definition={catalogPreviewDefinition(definition, {
          legend: true,
          margin: true,
        })}
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
      }}
    >
      <Chart
        idPrefix={idPrefix}
        definition={definition}
        width={input.width}
        height={input.height}
        ariaLabel="Manufacturing and construction unemployment chart"
      />
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
