import {
  defineChart,
  isDynamicChartDefinition,
  mountChart,
} from '@tanstack/charts'
import { tooltip } from '@tanstack/charts/tooltip'
import type {
  ChartDefinition,
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
  ) => ChartDefinition<TDatum, TXValue, TYValue>,
  ariaLabel: string,
  interactiveTooltip: true | ChartTooltipOptions<TDatum> = true,
): ConformanceMount {
  return (container, input) => {
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
}

function withConformanceBehavior<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  definition: ChartDefinition<TDatum, TXValue, TYValue>,
  input: ConformanceInput,
  interactiveTooltip: true | ChartTooltipOptions<TDatum>,
): ChartDefinition<TDatum, TXValue, TYValue> {
  const behavior: ChartDefinitionOptions<TDatum, TXValue, TYValue> = {
    animate: false,
    keyboard: input.interactive === true,
    tooltip:
      input.interactive !== true
        ? false
        : interactiveTooltip === true
          ? tooltip
          : { use: tooltip, ...interactiveTooltip },
  }

  if (isDynamicChartDefinition(definition)) {
    return defineChart(definition, behavior)
  }
  return defineChart(definition, behavior)
}
