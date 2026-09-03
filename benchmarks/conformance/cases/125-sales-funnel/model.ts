import type { FunnelStage } from './data'

export interface FunnelPoint extends FunnelStage {
  boundary: 'start' | 'end'
  y: number
  x1: number
  x2: number
}

export interface FunnelLabel extends FunnelStage {
  x: number
  y: number
  text: string
}

export interface FunnelLayout {
  points: readonly FunnelPoint[]
  labels: readonly FunnelLabel[]
  xDomain: readonly [number, number]
  yDomain: readonly [number, number]
}

const segmentInset = 0.035
const finalWidthRatio = 0.72

export function funnelLayout(stages: readonly FunnelStage[]): FunnelLayout {
  const maximum = Math.max(0, ...stages.map((stage) => stage.value))
  const points = stages.flatMap((stage, index) => {
    const nextValue = stages[index + 1]?.value ?? stage.value * finalWidthRatio
    return [
      funnelPoint(stage, 'start', index + segmentInset, stage.value),
      funnelPoint(stage, 'end', index + 1 - segmentInset, nextValue),
    ]
  })
  const labels = stages.map((stage, index) => ({
    ...stage,
    x: maximum * 0.56,
    y: index + 0.5,
    text: `${stage.label} · ${compactNumber(stage.value)}`,
  }))

  return {
    points,
    labels,
    xDomain: [-maximum / 2, maximum * 0.96],
    yDomain: [stages.length, 0],
  }
}

function funnelPoint(
  stage: FunnelStage,
  boundary: FunnelPoint['boundary'],
  y: number,
  width: number,
): FunnelPoint {
  return {
    ...stage,
    boundary,
    y,
    x1: -width / 2,
    x2: width / 2,
  }
}

function compactNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}
