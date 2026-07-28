import { lineY, plot } from '@observablehq/plot'

export function renderMinimalLine(data: number[]) {
  return plot({
    marks: [lineY(data)],
  })
}
