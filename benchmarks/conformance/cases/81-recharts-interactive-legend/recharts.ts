import { createElement, useState } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
import {
  interactiveLegendData,
  isLegendSeriesId,
  legendSeries,
  toggleLegendSeries,
} from './data'
import type {
  ConformanceInput,
  ConformanceMount,
  ConformanceTarget,
} from '../../types'
import type { LegendSeriesId } from './data'

const yDomain = [0, 120] as const
const initialVisibleSeries: readonly LegendSeriesId[] = ['revenue', 'profit']

interface InteractiveLegendChartProps {
  input: ConformanceInput
  onVisibleSeriesChange: (series: readonly LegendSeriesId[]) => void
}

function InteractiveLegendChart({
  input,
  onVisibleSeriesChange,
}: InteractiveLegendChartProps) {
  const [visibleSeries, setVisibleSeries] = useState(initialVisibleSeries)

  const toggleSeries = (seriesId: LegendSeriesId) => {
    setVisibleSeries((current) => {
      const next = toggleLegendSeries(current, seriesId)
      onVisibleSeriesChange(next)
      return next
    })
  }

  const renderAccessibleLegend = () =>
    createElement(
      'div',
      {
        key: 'legend',
        role: 'group',
        'aria-label': 'Series visibility',
        style: {
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 8px',
        },
      },
      [
        ...legendSeries.map((series) => {
          const visible = visibleSeries.includes(series.id)
          return createElement(
            'button',
            {
              key: series.id,
              type: 'button',
              'data-series-id': series.id,
              'data-visible': String(visible),
              'aria-label': `Toggle ${series.label} series`,
              'aria-pressed': String(visible),
              onClick: () => toggleSeries(series.id),
              style: {
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '7px',
                minWidth: '110px',
                minHeight: '44px',
                padding: '8px 12px',
                border:
                  '1px solid color-mix(in srgb, CanvasText 28%, transparent)',
                borderRadius: '999px',
                color: 'CanvasText',
                background: visible
                  ? 'color-mix(in srgb, CanvasText 7%, Canvas)'
                  : 'Canvas',
                cursor: 'pointer',
                font: '600 13px/1 system-ui, sans-serif',
                outlineOffset: '3px',
                textDecoration: visible ? 'none' : 'line-through',
              },
            },
            [
              createElement('span', {
                key: 'swatch',
                'data-series-swatch': series.id,
                style: {
                  width: '11px',
                  height: '11px',
                  border: `2px solid ${series.color}`,
                  borderRadius: '3px',
                  background: visible ? series.color : 'transparent',
                },
              }),
              createElement('span', { key: 'label' }, series.label),
            ],
          )
        }),
        createElement(
          'span',
          {
            key: 'empty',
            role: 'status',
            'aria-live': 'polite',
            hidden: visibleSeries.length > 0,
            style: {
              color: 'CanvasText',
              font: '500 12px/1.3 system-ui, sans-serif',
            },
          },
          visibleSeries.length === 0 ? 'No series shown' : '',
        ),
      ],
    )

  return createElement(
    'div',
    {
      'data-conformance-view': 'main',
      role: 'region',
      'aria-label': 'Interactive revenue and profit series',
      style: {
        width: `${input.width}px`,
        height: `${input.height}px`,
        display: 'grid',
        gridTemplateRows: `${Math.max(96, input.height - 62)}px 62px`,
      },
    },
    [
      createElement(
        LineChart,
        {
          key: 'chart',
          width: input.width,
          height: Math.max(96, input.height - 62),
          data: interactiveLegendData(input.revision),
          margin: { top: 20, right: 24, bottom: 16, left: 16 },
          accessibilityLayer: true,
        },
        [
          createElement(CartesianGrid, {
            key: 'grid',
            stroke: '#e2e8f0',
          }),
          createElement(XAxis, {
            key: 'x',
            dataKey: 'period',
            scale: 'band',
          }),
          createElement(YAxis, {
            key: 'y',
            domain: yDomain,
            ticks: [0, 30, 60, 90, 120],
            includeHidden: true,
            width: 52,
          }),
          ...legendSeries.map((series) =>
            createElement(Line, {
              key: series.id,
              dataKey: series.id,
              name: series.label,
              stroke: series.color,
              strokeWidth: 2.5,
              dot: false,
              hide: !visibleSeries.includes(series.id),
              isAnimationActive: false,
            }),
          ),
        ],
      ),
      renderAccessibleLegend(),
    ],
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

function seriesFromTarget(target: ConformanceTarget) {
  if (target.view !== undefined && target.view !== 'main') return null
  const [kind, id] = target.anchor.split(':')
  return kind === 'legend' && isLegendSeriesId(id) ? id : null
}

export const mount: ConformanceMount = (container, input) => {
  const surface = container.ownerDocument.createElement('div')
  container.append(surface)
  const root = createRoot(surface)
  let currentInput = input
  let visibleSeries = initialVisibleSeries

  const render = () => {
    flushSync(() => {
      root.render(
        createElement(InteractiveLegendChart, {
          input: currentInput,
          onVisibleSeriesChange(next) {
            visibleSeries = next
          },
        }),
      )
    })
  }

  render()

  return {
    update(nextInput) {
      currentInput = nextInput
      render()
    },
    driver: {
      resolveTarget(target) {
        const seriesId = seriesFromTarget(target)
        if (!seriesId) return null
        const button = surface.querySelector<HTMLButtonElement>(
          `button[data-series-id="${seriesId}"]`,
        )
        return button ? center(button) : null
      },
      readState() {
        return {
          visibleSeries,
          hiddenSeries: legendSeries
            .map((series) => series.id)
            .filter((seriesId) => !visibleSeries.includes(seriesId)),
          renderedSeries: renderedSeries(surface, '.recharts-line-curve'),
          yDomain,
          focusedSeries:
            surface.ownerDocument.activeElement instanceof HTMLElement
              ? (surface.ownerDocument.activeElement.dataset.seriesId ?? null)
              : null,
        }
      },
    },
    destroy() {
      flushSync(() => {
        root.unmount()
      })
      surface.remove()
    },
  }
}

function renderedSeries(surface: HTMLElement, selector: string) {
  const strokes = [...surface.querySelectorAll<SVGPathElement>(selector)].map(
    (path) => path.getAttribute('stroke')?.toLowerCase(),
  )
  return legendSeries
    .filter((series) => strokes.includes(series.color.toLowerCase()))
    .map((series) => series.id)
}
