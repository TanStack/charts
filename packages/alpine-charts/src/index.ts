import {
  createChartAdapter,
  resolveChartAdapterLayout,
} from '@tanstack/charts/adapter'
import type {
  ChartHostOptions,
  ChartValue,
  DynamicChartHostOptions,
  StaticChartHostOptions,
} from '@tanstack/charts'

export type StaticChartOptions<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> = StaticChartHostOptions<TDatum, TXValue, TYValue>

export type DynamicChartOptions<
  TDatum = unknown,
  TInput = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> = DynamicChartHostOptions<TDatum, TInput, TXValue, TYValue>

export type ChartOptions<
  TDatum = unknown,
  TInput = undefined,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> = ChartHostOptions<TDatum, TInput, TXValue, TYValue>

interface AlpineDirectiveUtilities {
  evaluateLater: (
    expression: string,
  ) => (receiver: (value: unknown) => void) => void
  effect: (callback: () => void) => void
  cleanup: (callback: () => void) => void
}

interface AlpineLike {
  directive: (
    name: string,
    callback: (
      element: HTMLElement,
      directive: { expression: string },
      utilities: AlpineDirectiveUtilities,
    ) => void,
  ) => void
}

let nextChartId = 0

export function charts(Alpine: AlpineLike) {
  Alpine.directive(
    'chart',
    (element, { expression }, { evaluateLater, effect, cleanup }) => {
      const evaluate = evaluateLater(expression)
      const surface = element.ownerDocument.createElement('div')
      surface.className = 'ts-chart-surface'
      surface.style.width = '100%'
      surface.style.height = '100%'
      const hadHostClass = element.classList.contains('ts-chart-host')
      element.classList.add('ts-chart-host')
      element.append(surface)
      const initialStyle = {
        position: element.style.position,
        width: element.style.width,
        height: element.style.height,
        aspectRatio: element.style.aspectRatio,
      }
      let adapter:
        ReturnType<typeof createChartAdapter<any, any, any, any>> | undefined
      const generatedId = `ts-chart-alpine-${++nextChartId}`

      effect(() => {
        evaluate((value) => {
          const options = value as ChartOptions<any, any, any, any>
          const hostOptions = {
            ...options,
            idPrefix: options.idPrefix ?? generatedId,
          }
          applyLayout(element, options, initialStyle)
          if (adapter) {
            adapter.update(hostOptions)
          } else {
            adapter = createChartAdapter(hostOptions)
            adapter.mount(surface)
          }
        })
      })

      cleanup(() => {
        adapter?.destroy()
        surface.remove()
        if (!hadHostClass) element.classList.remove('ts-chart-host')
        Object.assign(element.style, initialStyle)
      })
    },
  )
}

function applyLayout(
  element: HTMLElement,
  options: ChartOptions<any, any, any, any>,
  initial: {
    position: string
    width: string
    height: string
    aspectRatio: string
  },
) {
  const layout = resolveChartAdapterLayout(options)
  element.style.position = initial.position || 'relative'
  element.style.width =
    options.width === undefined ? initial.width || '100%' : `${options.width}px`
  element.style.height =
    options.height !== undefined
      ? `${options.height}px`
      : layout.aspectRatio === undefined
        ? initial.height || '320px'
        : initial.height
  element.style.aspectRatio =
    options.height === undefined && layout.aspectRatio !== undefined
      ? String(layout.aspectRatio)
      : initial.aspectRatio
}

export type { ChartDefinition, ChartPoint } from '@tanstack/charts'
