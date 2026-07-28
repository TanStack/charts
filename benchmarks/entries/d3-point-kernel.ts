import { scalePoint } from 'd3-scale'

const scale = scalePoint<string>().domain(['a', 'b']).range([0, 100])

export function mapPoint(value: string) {
  return scale(value)
}
