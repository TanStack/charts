import {
  binX,
  dot,
  lineY,
  pointerX,
  rectY,
  ruleX,
  ruleY,
  tip,
} from '@observablehq/plot'

export function renderRepresentativeChart(
  data: Array<{ x: number; y: number; group: string }>,
) {
  return {
    line: lineY(data, { x: 'x', y: 'y', stroke: 'group' }),
    dots: dot(data, { x: 'x', y: 'y', fill: 'group' }),
    baseline: ruleY([0]),
    threshold: ruleX([10]),
    histogram: rectY(data, binX({ y: 'count' }, { x: 'x', thresholds: 20 })),
    tooltip: tip(data, pointerX({ x: 'x', y: 'y' })),
  }
}
