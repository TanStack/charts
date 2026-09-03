import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Chart } from '@tanstack/charts/react'
import { catalogPreviewDefinition } from '../../shared/preview'
import { reactMount } from '../../shared/react-mount'
import { isLegendSeriesId, legendSeries } from './model'
import {
  initialVisibleSeries,
  interactiveLegendDefinition,
  interactiveLegendPreviewDefinition,
  seriesColors,
  yDomain,
} from './example'
import type { ConformanceTarget, ConformanceTestDriver } from '../../types'
import type { ReactConformanceProps } from '../../shared/react-mount'

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
        definition={catalogPreviewDefinition(
          interactiveLegendPreviewDefinition(input.revision),
          {
            legend: true,
            margin: true,
          },
        )}
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
