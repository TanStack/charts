import {
  defineChart,
  isResponsiveChartDefinition,
  mountChart,
} from '@tanstack/charts'
import { tooltip } from '@tanstack/charts/tooltip'
import type {
  DomChartDefinition,
  ChartDefinitionOptions,
  ChartValue,
  ChartTooltipOptions,
} from '@tanstack/charts'
import type {
  ConformanceHandle,
  ConformanceInput,
  ConformanceMount,
} from '../types'
import { catalogPreviewDefinition, type CatalogPreviewOptions } from './preview'

export function mountObservablePlot(
  container: HTMLElement,
  input: ConformanceInput,
  render: (input: ConformanceInput) => HTMLElement | SVGSVGElement,
): ConformanceHandle {
  let element = render(input)
  container.append(element)

  return {
    update(nextInput) {
      const nextElement = render(nextInput)
      element.replaceWith(nextElement)
      element = nextElement
    },
    destroy() {
      element.remove()
    },
  }
}

export function tanstackMount<
  TDatum,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(
  createDefinition: (
    input: ConformanceInput,
  ) => DomChartDefinition<TDatum, TXValue, TYValue>,
  ariaLabel: string,
  interactiveTooltip: true | ChartTooltipOptions<TDatum> = true,
  previewOptions: CatalogPreviewOptions<TDatum, TXValue, TYValue> = {},
): TanStackConformanceCase<TDatum, TXValue, TYValue> {
  return createTanstackMount(
    createDefinition,
    ariaLabel,
    interactiveTooltip,
    previewOptions,
  )
}

export function tanstackExampleMount<
  TDatum,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(
  createDefinition: (
    input: ConformanceInput,
  ) => DomChartDefinition<TDatum, TXValue, TYValue>,
  ariaLabel: string,
  previewOptions: CatalogPreviewOptions<TDatum, TXValue, TYValue> = {},
): TanStackConformanceCase<TDatum, TXValue, TYValue> {
  return createTanstackMount(
    createDefinition,
    ariaLabel,
    undefined,
    previewOptions,
  )
}

function createTanstackMount<
  TDatum,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(
  createDefinition: (
    input: ConformanceInput,
  ) => DomChartDefinition<TDatum, TXValue, TYValue>,
  ariaLabel: string,
  interactiveTooltip: true | ChartTooltipOptions<TDatum> | undefined,
  previewOptions: CatalogPreviewOptions<TDatum, TXValue, TYValue>,
): TanStackConformanceCase<TDatum, TXValue, TYValue> {
  const mount: ConformanceMount = (container, input) => {
    const options = {
      definition: withConformanceBehavior(
        createDefinition(input),
        input,
        interactiveTooltip,
        previewOptions,
      ),
      width: input.width,
      height: input.height,
      ariaLabel,
    } as const
    const host = mountChart(container, options)
    applyCatalogPreviewFocus(host, input, previewOptions)

    return {
      update(nextInput) {
        host.update({
          ...options,
          definition: withConformanceBehavior(
            createDefinition(nextInput),
            nextInput,
            interactiveTooltip,
            previewOptions,
          ),
          width: nextInput.width,
          height: nextInput.height,
        })
        applyCatalogPreviewFocus(host, nextInput, previewOptions)
      },
      destroy() {
        host.destroy()
      },
    }
  }

  const catalogCase = Object.assign(mount, {
    createDefinition,
    ariaLabel,
    interactiveTooltip,
  })

  return Object.assign(catalogCase, { mount: catalogCase })
}

export interface TanStackConformanceCase<
  TDatum,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> {
  (container: HTMLElement, input: ConformanceInput): ConformanceHandle
  createDefinition: (
    input: ConformanceInput,
  ) => DomChartDefinition<TDatum, TXValue, TYValue>
  ariaLabel: string
  interactiveTooltip: true | ChartTooltipOptions<TDatum> | undefined
  mount: ConformanceMount
}

export function tanstackCase<
  TDatum,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(
  createDefinition: (
    input: ConformanceInput,
  ) => DomChartDefinition<TDatum, TXValue, TYValue>,
  ariaLabel: string,
  interactiveTooltip: true | ChartTooltipOptions<TDatum> = true,
  previewOptions: CatalogPreviewOptions<TDatum, TXValue, TYValue> = {},
): TanStackConformanceCase<TDatum, TXValue, TYValue> {
  return tanstackMount(
    createDefinition,
    ariaLabel,
    interactiveTooltip,
    previewOptions,
  )
}

export function withConformanceBehavior<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  definition: DomChartDefinition<TDatum, TXValue, TYValue>,
  input: ConformanceInput,
  interactiveTooltip: true | ChartTooltipOptions<TDatum> | undefined,
  previewOptions: CatalogPreviewOptions<TDatum, TXValue, TYValue> = {},
): DomChartDefinition<TDatum, TXValue, TYValue> {
  const presentation =
    input.preview === true
      ? catalogPreviewDefinition(definition, previewOptions)
      : definition
  const behavior: ChartDefinitionOptions<TDatum, TXValue, TYValue, 'dom'> = {
    svgAnimation: false,
    ...(input.interactive === true ||
    (input.preview === true && previewOptions.focus)
      ? {}
      : { focus: false }),
    keyboard: input.interactive === true,
    ...(input.interactive !== true
      ? { tooltip: false as const }
      : interactiveTooltip === undefined
        ? {}
        : {
            tooltip:
              interactiveTooltip === true
                ? tooltip
                : { use: tooltip, ...interactiveTooltip },
          }),
  }

  if (isResponsiveChartDefinition(presentation)) {
    return defineChart(presentation, behavior)
  }
  return defineChart(presentation, behavior)
}

function applyCatalogPreviewFocus<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  host: ReturnType<typeof mountChart<TDatum, TXValue, TYValue>>,
  input: ConformanceInput,
  options: CatalogPreviewOptions<TDatum, TXValue, TYValue>,
) {
  if (input.preview !== true || !options.focus) return
  host.interaction.setControlledFocus(options.focus(host.getScene(), input), {
    source: 'programmatic',
  })
}
