import { mountChart, type DynamicChartDefinition } from '@tanstack/charts'
import type { BenchmarkHandle, BenchmarkInput } from '../../types'

export const color = '#2563eb'
export const margin = { top: 16, right: 16, bottom: 32, left: 48 }

export function mountDefinition<TDatum>(
  container: HTMLElement,
  input: BenchmarkInput,
  definition: DynamicChartDefinition<BenchmarkInput, any, TDatum>,
  interactive: boolean,
): BenchmarkHandle {
  const options = {
    definition,
    input,
    width: input.width,
    height: input.height,
    ariaLabel: 'Benchmark chart',
    keyboard: interactive,
    tooltip: interactive,
    animate: false,
  }
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
