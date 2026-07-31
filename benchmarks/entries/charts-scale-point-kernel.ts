import { scalePoint } from '@tanstack/charts-scales/point'

const scale = scalePoint(['a', 'b', 'c'], [0, 100])
  .padding(0.2)
  .align(0.4)
  .round(true)

export function inspectPoint(value: 'a' | 'b' | 'c') {
  return {
    value: scale(value),
    bandwidth: scale.bandwidth(),
    step: scale.step(),
    copied: scale.copy()(value),
  }
}
