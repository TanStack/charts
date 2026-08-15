import { wind } from '@tanstack/charts-data/wind'

export interface ContourGrid {
  width: number
  height: number
  data: WindRow[]
}

export type WindRow = (typeof wind)[number]

const sourceWidth = 80
export const contourGridWidth = 64
export const contourGridHeight = 60
export const contourThresholds = [2, 4, 6, 8, 10]

export function windObservationGrid(revision: number): ContourGrid {
  const firstColumn = (revision % 2) * 8
  const data: WindRow[] = []

  for (let row = 0; row < contourGridHeight; row++) {
    const rowOffset = row * sourceWidth
    for (let column = 0; column < contourGridWidth; column++) {
      const observation = wind[rowOffset + firstColumn + column]
      if (!observation) {
        throw new Error('Observable Plot wind grid is incomplete.')
      }
      data.push(observation)
    }
  }

  return {
    width: contourGridWidth,
    height: contourGridHeight,
    data,
  }
}
