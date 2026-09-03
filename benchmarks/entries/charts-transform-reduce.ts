import {
  deviation,
  delta,
  first,
  last,
  median,
  quantile,
  ratio,
  variance,
} from '@tanstack/charts/transform/reduce'
export const output = {
  deviation,
  delta,
  first,
  last,
  median,
  p90: quantile(0.9),
  ratio,
  variance,
}
