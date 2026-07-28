import { scaleLinear } from 'd3-scale'

export function mapLinear(value: number) {
  return scaleLinear([0, 1], [0, 100])(value)
}
