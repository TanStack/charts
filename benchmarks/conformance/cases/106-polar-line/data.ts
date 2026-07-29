export interface PolarLineDatum {
  id: string
  angle: number
  radius: number
}

const initialRadii = [42, 57, 78, 66, 84, 62, 48, 58, 75, 88, 69, 50, 42]

export function polarLineData(revision = 0): readonly PolarLineDatum[] {
  return initialRadii.map((initialRadius, index) => {
    const angle = index * 30
    let radius = initialRadius
    if (revision % 2 !== 0) {
      if (angle === 0 || angle === 360) radius = 50
      else if (angle === 60) radius = 70
      else if (angle === 150) radius = 76
      else if (angle === 270) radius = 80
    }
    return {
      id: `angle-${angle}`,
      angle,
      radius,
    }
  })
}
