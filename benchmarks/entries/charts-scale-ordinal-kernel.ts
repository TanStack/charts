import { scaleOrdinal } from '@tanstack/charts/scales/ordinal'

const scale = scaleOrdinal<string, string>(['a', 'b'], ['red', 'blue']).unknown(
  'gray',
)

export function inspectOrdinal(value: string) {
  return {
    value: scale(value),
    domain: scale.domain(),
    range: scale.range(),
    copied: scale.copy()(value),
  }
}
