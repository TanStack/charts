import { d3Curve } from '@tanstack/charts/d3/shape'
import { curveMonotoneX } from 'd3-shape'
import { render } from './charts-curve-svg'

export function renderD3(width: number, height: number): string {
  return render(d3Curve(curveMonotoneX), width, height)
}
