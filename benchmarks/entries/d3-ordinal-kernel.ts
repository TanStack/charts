import { scaleOrdinal } from 'd3-scale'

const scale = scaleOrdinal<string, string>()
  .domain(['a', 'b'])
  .range(['red', 'blue'])

export function mapOrdinal(value: string) {
  return scale(value)
}
