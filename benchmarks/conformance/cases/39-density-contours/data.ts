export interface DensityPoint {
  id: string
  x: number
  y: number
}

export const densityXDomain = [0, 100]
export const densityYDomain = [0, 80]
export const densityBandwidth = 18
export const densityThresholds = [0.04, 0.08, 0.12, 0.16, 0.2, 0.24]

export function densityPoints(revision: number): DensityPoint[] {
  const points: DensityPoint[] = []
  const shift = revision % 2 === 0 ? 0 : 2

  for (let index = 0; index < 52; index++) {
    const angle = index * 2.399963229728653
    const radius = 4 + (index % 13) * 0.72
    points.push({
      id: `west-${index}`,
      x: 34 + shift + Math.cos(angle) * radius * 1.2,
      y: 47 + Math.sin(angle) * radius * 0.82,
    })
  }

  for (let index = 0; index < 44; index++) {
    const angle = index * 2.274
    const radius = 3.5 + (index % 11) * 0.8
    points.push({
      id: `east-${index}`,
      x: 68 - shift * 0.5 + Math.cos(angle) * radius,
      y: 31 + shift * 0.4 + Math.sin(angle) * radius * 1.15,
    })
  }

  return points
}
