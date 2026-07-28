export interface ContourGrid {
  width: number
  height: number
  values: number[]
}

export const contourGridWidth = 32
export const contourGridHeight = 20
export const contourThresholds = [0.16, 0.3, 0.44, 0.58, 0.72]

const contourColors = ['#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#2563eb']

export function contourGrid(revision: number): ContourGrid {
  const values: number[] = []
  const shift = revision % 2 === 0 ? 0 : 1.2

  for (let y = 0; y < contourGridHeight; y++) {
    for (let x = 0; x < contourGridWidth; x++) {
      const western =
        0.92 *
        Math.exp(-(((x - (9 + shift)) / 5.5) ** 2 + ((y - 8.5) / 4.4) ** 2))
      const eastern =
        0.78 *
        Math.exp(
          -(((x - (23 - shift * 0.5)) / 4.5) ** 2 + ((y - 11.5) / 5.2) ** 2),
        )
      const ridge =
        0.25 *
        Math.exp(
          -(((x - 16) / 9) ** 2 + ((y - (5.5 + shift * 0.3)) / 2.5) ** 2),
        )
      values.push(western + eastern + ridge)
    }
  }

  return {
    width: contourGridWidth,
    height: contourGridHeight,
    values,
  }
}

export function contourColor(value: number): string {
  let index = 0
  for (
    let thresholdIndex = 0;
    thresholdIndex < contourThresholds.length;
    thresholdIndex++
  ) {
    const threshold = contourThresholds[thresholdIndex]
    if (threshold !== undefined && value >= threshold) index = thresholdIndex
  }
  return contourColors[index] ?? '#dbeafe'
}
