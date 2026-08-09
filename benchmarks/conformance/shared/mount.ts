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
): TanStackConformanceCase<TDatum, TXValue, TYValue> {
  const mount: ConformanceMount = (container, input) => {
    const options = {
      definition: withConformanceBehavior(
        createDefinition(input),
        input,
        interactiveTooltip,
      ),
      width: input.width,
      height: input.height,
      ariaLabel,
    } as const
    const host = mountChart(container, options)

    return {
      update(nextInput) {
        host.update({
          ...options,
          definition: withConformanceBehavior(
            createDefinition(nextInput),
            nextInput,
            interactiveTooltip,
          ),
          width: nextInput.width,
          height: nextInput.height,
        })
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
  interactiveTooltip: true | ChartTooltipOptions<TDatum>
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
): TanStackConformanceCase<TDatum, TXValue, TYValue> {
  return tanstackMount(createDefinition, ariaLabel, interactiveTooltip)
}

export function withConformanceBehavior<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  definition: DomChartDefinition<TDatum, TXValue, TYValue>,
  input: ConformanceInput,
  interactiveTooltip: true | ChartTooltipOptions<TDatum>,
): DomChartDefinition<TDatum, TXValue, TYValue> {
  const behavior: ChartDefinitionOptions<TDatum, TXValue, TYValue, 'dom'> = {
    svgAnimation: false,
    ...(input.interactive === true ? {} : { focus: false }),
    keyboard: input.interactive === true,
    tooltip:
      input.interactive !== true
        ? false
        : interactiveTooltip === true
          ? tooltip
          : { use: tooltip, ...interactiveTooltip },
  }

  if (isResponsiveChartDefinition(definition)) {
    return defineChart(definition, behavior)
  }
  return defineChart(definition, behavior)
}
