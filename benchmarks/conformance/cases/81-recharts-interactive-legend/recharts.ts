import { createElement, useState } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { CartesianGrid, Legend, Line, LineChart, XAxis, YAxis } from 'recharts'
import {
  interactiveLegendData,
  isLegendSeriesId,
  legendSeries,
  toggleLegendSeries,
} from './data'
import type { LegendPayload } from 'recharts'
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

interface AccessibleLegendProps {
  payload?: ReadonlyArray<LegendPayload>
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

  const renderAccessibleLegend = ({ payload }: AccessibleLegendProps) =>
    createElement(
      'div',
      {
        role: 'group',
        'aria-label': 'Series visibility',
        style: {
          display: 'flex',
          justifyContent: 'center',
          gap: '16px',
          padding: '8px',
        },
      },
      payload?.flatMap((entry) => {
        if (!isLegendSeriesId(entry.dataKey)) return []
        const series = legendSeries.find(
          (candidate) => candidate.id === entry.dataKey,
        )
        if (!series) return []
        const visible = visibleSeries.includes(series.id)
        return [
          createElement(
            'button',
            {
              key: series.id,
              type: 'button',
              'data-series-id': series.id,
              'aria-pressed': String(visible),
              onClick: () => toggleSeries(series.id),
              style: {
                border: `1px solid ${series.color}`,
                borderRadius: '999px',
                padding: '3px 10px',
                color: series.color,
                background: 'transparent',
                opacity: visible ? 1 : 0.45,
              },
            },
            series.label,
          ),
        ]
      }),
    )

  return createElement(
    'div',
    {
      'data-conformance-view': 'main',
      style: {
        width: `${input.width}px`,
        height: `${input.height}px`,
      },
    },
    createElement(
      LineChart,
      {
        width: input.width,
        height: input.height,
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
        createElement(Legend, {
          key: 'legend',
          content: renderAccessibleLegend,
          verticalAlign: 'bottom',
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
  surface.setAttribute('role', 'img')
  surface.setAttribute('aria-label', 'Interactive revenue and profit series')
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
