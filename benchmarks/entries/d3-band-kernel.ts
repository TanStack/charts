import { scaleBand } from 'd3-scale'

const scale = scaleBand<string>().domain(['a', 'b']).range([0, 100])

export function mapBand(value: string) {
  return scale(value)
}
