const epsilon = 1e-6

interface ForbiddenInterval {
  readonly minimum: number
  readonly maximum: number
}

interface Candidate {
  readonly value: number
  readonly order: number
}

/** Finds deterministic tangent offsets for circles along one fixed axis. */
export function dodgeOffsets(
  measuredPositions: readonly number[],
  radii: readonly number[],
  padding: number,
  edgeAnchored: boolean,
): readonly number[] {
  if (measuredPositions.length !== radii.length) {
    throw new TypeError('dodge: positions and radii must have equal lengths')
  }

  const offsets = Array.from({ length: measuredPositions.length }, () => 0)
  const order = measuredPositions.map((_position, index) => index)
  if (hasVariableRadius(radii)) {
    order.sort((left, right) => radii[right]! - radii[left]! || left - right)
  }
  const placed: number[] = []

  for (const index of order) {
    const measured = measuredPositions[index]!
    const radius = radii[index]!
    const baseline = edgeAnchored ? radius + padding : 0
    const forbidden: ForbiddenInterval[] = []

    for (const otherIndex of placed) {
      const distance = radius + radii[otherIndex]! + padding
      const measuredDelta = measured - measuredPositions[otherIndex]!
      if (Math.abs(measuredDelta) > distance) continue
      const crossDelta = Math.sqrt(
        Math.max(0, distance * distance - measuredDelta * measuredDelta),
      )
      forbidden.push({
        minimum: offsets[otherIndex]! - crossDelta,
        maximum: offsets[otherIndex]! + crossDelta,
      })
    }

    const candidates: Candidate[] = [{ value: baseline, order: 0 }]
    forbidden.forEach((interval, intervalIndex) => {
      candidates.push(
        { value: interval.minimum, order: intervalIndex * 2 + 1 },
        { value: interval.maximum, order: intervalIndex * 2 + 2 },
      )
    })
    candidates.sort((left, right) => {
      const leftRank = edgeAnchored ? left.value : Math.abs(left.value)
      const rightRank = edgeAnchored ? right.value : Math.abs(right.value)
      return leftRank - rightRank || left.order - right.order
    })

    const selected = candidates.find(
      (candidate) =>
        (!edgeAnchored || candidate.value >= baseline - epsilon) &&
        forbidden.every(
          (interval) =>
            candidate.value <= interval.minimum + epsilon ||
            candidate.value >= interval.maximum - epsilon,
        ),
    )
    if (!selected) {
      throw new TypeError('dodge: could not place a finite circle')
    }
    offsets[index] = selected.value
    placed.push(index)
  }

  return offsets
}

function hasVariableRadius(radii: readonly number[]): boolean {
  const first = radii[0]
  return radii.some((radius) => radius !== first)
}
