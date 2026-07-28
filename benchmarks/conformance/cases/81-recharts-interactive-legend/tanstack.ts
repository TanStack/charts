import { defineChart, lineY, mountChart } from '@tanstack/charts'
import { scaleBand, scaleLinear } from 'd3-scale'
import {
  interactiveLegendData,
  isLegendSeriesId,
  legendPeriods,
  legendSeries,
  toggleLegendSeries,
} from './data'
import type { ChartHost, ChartHostOptions } from '@tanstack/charts'
import type {
  ConformanceInput,
  ConformanceMount,
  ConformanceTarget,
} from '../../types'
import type { LegendDatum, LegendSeriesId } from './data'

interface InteractiveLegendInput extends ConformanceInput {
  visibleSeries: readonly LegendSeriesId[]
}

const yDomain = [0, 120] as const
const initialVisibleSeries: readonly LegendSeriesId[] = ['revenue', 'profit']

const definition = defineChart<InteractiveLegendInput>()(({ input }) => {
  const rows = interactiveLegendData(input.revision)

  return {
    marks: [
      ...(input.visibleSeries.includes('revenue')
        ? [
            lineY(rows, {
              id: 'revenue',
              x: 'period',
              y: 'revenue',
              key: 'period',
              stroke: '#2563eb',
              strokeWidth: 2.5,
            }),
          ]
        : []),
      ...(input.visibleSeries.includes('profit')
        ? [
            lineY(rows, {
              id: 'profit',
              x: 'period',
              y: 'profit',
              key: 'period',
              stroke: '#f97316',
              strokeWidth: 2.5,
            }),
          ]
        : []),
    ],
    x: {
      scale: scaleBand<string>()
        .domain(legendPeriods)
        .paddingInner(0.1)
        .paddingOuter(0.05),
    },
    y: {
      scale: scaleLinear().domain(yDomain),
      ticks: 5,
      grid: true,
    },
    margin: { top: 20, right: 24, bottom: 44, left: 62 },
  }
})

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
  legend.style.justifyContent = 'center'
  legend.style.gap = '16px'
  legend.style.padding = '8px'

  view.append(chartSurface, legend)
  container.append(view)

  let currentInput = input
  let visibleSeries = initialVisibleSeries
  let host: ChartHost<LegendDatum, InteractiveLegendInput>

  const options = (): ChartHostOptions<
    LegendDatum,
    InteractiveLegendInput
  > => ({
    definition,
    input: {
      ...currentInput,
      visibleSeries,
    },
    width: currentInput.width,
    height: Math.max(180, currentInput.height - 42),
    ariaLabel: 'Interactive revenue and profit series',
    animate: false,
    keyboard: false,
  })

  const renderLegend = () => {
    legend.replaceChildren()
    for (const series of legendSeries) {
      const button = container.ownerDocument.createElement('button')
      button.type = 'button'
      button.dataset.seriesId = series.id
      button.setAttribute(
        'aria-pressed',
        String(visibleSeries.includes(series.id)),
      )
      button.textContent = series.label
      button.style.border = `1px solid ${series.color}`
      button.style.borderRadius = '999px'
      button.style.padding = '3px 10px'
      button.style.color = series.color
      button.style.background = 'transparent'
      button.style.opacity = visibleSeries.includes(series.id) ? '1' : '0.45'
      button.addEventListener('click', () => {
        visibleSeries = toggleLegendSeries(visibleSeries, series.id)
        renderLegend()
        host.update(options())
      })
      legend.append(button)
    }
  }

  renderLegend()
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
    .filter((series) => strokes.includes(series.color.toLowerCase()))
    .map((series) => series.id)
}
