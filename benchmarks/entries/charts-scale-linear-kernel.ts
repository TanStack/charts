import { scaleLinear } from '@tanstack/charts/scales/linear'

const scale = scaleLinear([0.2, 9.8], [0, 100]).clamp(true).nice(5)

export function inspectLinear(value: number) {
  return {
    value: scale(value),
    inverted: scale.invert(value),
    ticks: scale.ticks(5),
    label: scale.tickFormat(5)(value),
    copied: scale.copy()(value),
  }
}
