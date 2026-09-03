import { scaleBand } from '@tanstack/charts/scales/band'

const scale = scaleBand(['a', 'b', 'c'], [0, 100])
  .paddingInner(0.1)
  .paddingOuter(0.2)
  .align(0.4)
  .round(true)

export function inspectBand(value: 'a' | 'b' | 'c') {
  return {
    value: scale(value),
    bandwidth: scale.bandwidth(),
    step: scale.step(),
    copied: scale.copy()(value),
  }
}
