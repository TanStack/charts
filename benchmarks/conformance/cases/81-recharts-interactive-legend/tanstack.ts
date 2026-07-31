import { defineChart, lineY, mountChart } from '@tanstack/charts'
import { industries } from '@charts-poc/demo-data/industries'
import { scaleLinear, scaleUtc } from 'd3-scale'
import {
  isLegendSeriesId,
  legendRows,
  legendSeries,
  toggleLegendSeries,
} from './model'
import type { ChartHost, ChartHostOptions } from '@tanstack/charts'
import type { IndustriesRow } from '@charts-poc/demo-data/industries'
import type {
  ConformanceInput,
  ConformanceMount,
  ConformanceTarget,
} from '../../types'
import type { LegendSeriesId } from './model'

interface InteractiveLegendInput extends ConformanceInput {
  visibleSeries: readonly LegendSeriesId[]
}

const yDomain = [0, 900] as const
const initialVisibleSeries: readonly LegendSeriesId[] = [
  'Manufacturing',
  'Construction',
]
const seriesColors: Readonly<Record<LegendSeriesId, string>> = {
  Manufacturing: '#2563eb',
  Construction: '#f97316',
}

const definition = (input: InteractiveLegendInput) => {
  const rows = legendRows(industries, input.revision)

  return defineChart({
    marks: [
      ...legendSeries.flatMap((series) =>
        input.visibleSeries.includes(series.id)
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
    },
    margin: { top: 20, right: 24, bottom: 44, left: 62 },
  })
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
  const view = container.ownerDocument.createElement('div')
  view.dataset.conformanceView = 'main'
  view.setAttribute('role', 'region')
  view.setAttribute('aria-label', 'Interactive unemployment series')
  view.style.width = `${input.width}px`
  view.style.height = `${input.height}px`
  view.style.display = 'grid'
  view.style.gridTemplateRows = '1fr auto'

  const chartSurface = container.ownerDocument.createElement('div')
  chartSurface.style.minHeight = '0'

  const legend = container.ownerDocument.createElement('div')
  legend.setAttribute('role', 'group')
  legend.setAttribute('aria-label', 'Series visibility')
  legend.style.display = 'flex'
  legend.style.flexWrap = 'wrap'
  legend.style.justifyContent = 'center'
  legend.style.alignItems = 'center'
  legend.style.gap = '8px'
  legend.style.padding = '6px 8px'

  view.append(chartSurface, legend)
  container.append(view)

  let currentInput = input
  let visibleSeries = initialVisibleSeries
  let host: ChartHost<IndustriesRow>
  const buttons = new Map<LegendSeriesId, HTMLButtonElement>()
  const emptyState = container.ownerDocument.createElement('span')
  emptyState.setAttribute('role', 'status')
  emptyState.setAttribute('aria-live', 'polite')
  emptyState.style.color = 'CanvasText'
  emptyState.style.font = '500 12px/1.3 system-ui, sans-serif'

  const options = (): ChartHostOptions<IndustriesRow> => ({
    definition: defineChart(
      definition({
        ...currentInput,
        visibleSeries,
      }),
      { animate: false, keyboard: false },
    ),
    width: currentInput.width,
    height: Math.max(96, currentInput.height - 62),
    ariaLabel: 'Manufacturing and construction unemployment chart',
  })

  const updateLegend = () => {
    for (const series of legendSeries) {
      const button = buttons.get(series.id)
      if (!button) continue
      const visible = visibleSeries.includes(series.id)
      button.setAttribute('aria-pressed', String(visible))
      button.dataset.visible = String(visible)
      button.style.background = visible
        ? 'color-mix(in srgb, CanvasText 7%, Canvas)'
        : 'Canvas'
      button.style.textDecoration = visible ? 'none' : 'line-through'
      const swatch = button.querySelector<HTMLElement>('[data-series-swatch]')
      if (swatch) {
        swatch.style.background = visible
          ? seriesColors[series.id]
          : 'transparent'
      }
    }
    emptyState.textContent = visibleSeries.length === 0 ? 'No series shown' : ''
    emptyState.hidden = visibleSeries.length > 0
  }

  for (const series of legendSeries) {
    const button = container.ownerDocument.createElement('button')
    const swatch = container.ownerDocument.createElement('span')
    const label = container.ownerDocument.createElement('span')
    button.type = 'button'
    button.dataset.seriesId = series.id
    button.setAttribute('aria-label', `Toggle ${series.label} series`)
    Object.assign(button.style, {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '7px',
      minWidth: '110px',
      minHeight: '44px',
      padding: '8px 12px',
      border: '1px solid color-mix(in srgb, CanvasText 28%, transparent)',
      borderRadius: '999px',
      color: 'CanvasText',
      cursor: 'pointer',
      font: '600 13px/1 system-ui, sans-serif',
      outlineOffset: '3px',
    })
    swatch.dataset.seriesSwatch = series.id
    Object.assign(swatch.style, {
      width: '11px',
      height: '11px',
      border: `2px solid ${seriesColors[series.id]}`,
      borderRadius: '3px',
      background: seriesColors[series.id],
    })
    label.textContent = series.label
    button.append(swatch, label)
    button.addEventListener('click', () => {
      visibleSeries = toggleLegendSeries(visibleSeries, series.id)
      updateLegend()
      host.update(options())
    })
    buttons.set(series.id, button)
    legend.append(button)
  }
  legend.append(emptyState)
  updateLegend()
  host = mountChart(chartSurface, options())

  return {
    update(nextInput) {
      currentInput = nextInput
      view.style.width = `${nextInput.width}px`
      view.style.height = `${nextInput.height}px`
      host.update(options())
    },
    driver: {
      resolveTarget(target) {
        const seriesId = seriesFromTarget(target)
        if (!seriesId) return null
        const button = [...legend.querySelectorAll('button')].find(
          (element) => element.dataset.seriesId === seriesId,
        )
        return button ? center(button) : null
      },
      readState() {
        return {
          visibleSeries,
          hiddenSeries: legendSeries
            .map((series) => series.id)
            .filter((seriesId) => !visibleSeries.includes(seriesId)),
          renderedSeries: renderedSeries(chartSurface),
          yDomain,
          focusedSeries:
            container.ownerDocument.activeElement instanceof HTMLElement
              ? (container.ownerDocument.activeElement.dataset.seriesId ?? null)
              : null,
        }
      },
    },
    destroy() {
      host.destroy()
      view.remove()
    },
  }
}

function renderedSeries(surface: HTMLElement) {
  const strokes = [
    ...surface.querySelectorAll<SVGPathElement>('.ts-chart__line path'),
  ].map((path) => path.getAttribute('stroke')?.toLowerCase())
  return legendSeries
    .filter((series) => strokes.includes(seriesColors[series.id].toLowerCase()))
    .map((series) => series.id)
}
