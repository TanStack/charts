import { defineChart, mountChart } from '@tanstack/charts'
import type {
  ChartValue,
  ChartTooltipOptions,
  DynamicChartDefinition,
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
  ) => DynamicChartDefinition<TDatum, TXValue, TYValue>,
  ariaLabel: string,
  interactiveTooltip: true | ChartTooltipOptions<TDatum> = true,
): ConformanceMount {
  return (container, input) => {
    const options = {
      definition: defineChart(createDefinition(input), {
        animate: false,
        keyboard: input.interactive === true,
        tooltip: input.interactive === true ? interactiveTooltip : false,
      }),
      width: input.width,
      height: input.height,
      ariaLabel,
    } as const
    const host = mountChart(container, options)

    return {
      update(nextInput) {
        host.update({
          ...options,
          definition: defineChart(createDefinition(nextInput), {
            animate: false,
            keyboard: nextInput.interactive === true,
            tooltip:
              nextInput.interactive === true ? interactiveTooltip : false,
          }),
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
