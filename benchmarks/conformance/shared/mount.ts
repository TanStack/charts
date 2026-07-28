import { mountChart } from '@tanstack/charts'
import type { DynamicChartDefinition } from '@tanstack/charts'
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

export function tanstackMount<TDatum>(
  definition: DynamicChartDefinition<
    ConformanceInput,
    ConformanceInput,
    TDatum
  >,
  ariaLabel: string,
): ConformanceMount {
  return (container, input) => {
    const options = {
      definition,
      input,
      width: input.width,
      height: input.height,
      ariaLabel,
      animate: false,
      keyboard: false,
    } as const
    const host = mountChart(container, options)

    return {
      update(nextInput) {
        host.update({
          ...options,
          input: nextInput,
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
