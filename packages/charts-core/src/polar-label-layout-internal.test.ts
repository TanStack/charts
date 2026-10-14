import { describe, expect, it } from 'vitest'
import { layoutRadialLabels } from './polar-label-layout-internal'
import type {
  RadialLabelLayoutOptions,
  RadialLabelPlacement,
} from './polar-label-layout-internal'

const options: RadialLabelLayoutOptions = {
  radius: 100,
  offset: 20,
  elbow: 10,
  padding: 4,
  lineHeight: 16,
  top: -200,
  bottom: 200,
  maxShift: Infinity,
}

const degrees = (value: number) => (value * Math.PI) / 180

function visible(placements: readonly RadialLabelPlacement[]) {
  return placements.flatMap((placement, index) =>
    placement.visible ? [{ index, ...placement }] : [],
  )
}

describe('layoutRadialLabels', () => {
  it('keeps separated labels at their ideal height', () => {
    const placements = layoutRadialLabels(
      [
        { angle: degrees(60), priority: 1 },
        { angle: degrees(240), priority: 1 },
      ],
      options,
    )

    expect(placements[0]).toMatchObject({
      visible: true,
      side: 'right',
      y: expect.closeTo(-Math.cos(degrees(60)) * 120, 8),
    })
    expect(placements[1]).toMatchObject({
      visible: true,
      side: 'left',
      y: expect.closeTo(-Math.cos(degrees(240)) * 120, 8),
    })
  })

  it('pushes crowded labels apart by one line height in angular order', () => {
    const angles = [88, 90, 92, 94].map(degrees)
    const placements = visible(
      layoutRadialLabels(
        angles.map((angle) => ({ angle, priority: 1 })),
        options,
      ),
    )

    expect(placements.map(({ index }) => index)).toEqual([0, 1, 2, 3])
    placements.slice(1).forEach((placement, k) => {
      expect(placement.y - placements[k]!.y).toBeCloseTo(16, 8)
    })
    const idealMean =
      angles.reduce((sum, angle) => sum - Math.cos(angle) * 120, 0) / 4
    const placedMean =
      placements.reduce((sum, placement) => sum + placement.y, 0) / 4
    expect(placedMean).toBeCloseTo(idealMean, 8)
  })

  it('hides the lowest-priority labels when a side runs out of space', () => {
    const placements = layoutRadialLabels(
      [
        { angle: degrees(80), priority: 5 },
        { angle: degrees(85), priority: 1 },
        { angle: degrees(90), priority: 4 },
        { angle: degrees(95), priority: 2 },
        { angle: degrees(100), priority: 3 },
      ],
      { ...options, top: -24, bottom: 24 },
    )

    expect(placements.map((placement) => placement.visible)).toEqual([
      true,
      false,
      true,
      false,
      true,
    ])
  })

  it('hides labels that would move farther than maxShift', () => {
    const angles = [86, 88, 90, 92, 94].map(degrees)
    const placements = layoutRadialLabels(
      angles.map((angle, index) => ({ angle, priority: index === 2 ? 9 : 1 })),
      { ...options, maxShift: 20 },
    )
    const shown = visible(placements)

    expect(shown.map(({ index }) => index)).toContain(2)
    shown.forEach((placement) => {
      const ideal = -Math.cos(angles[placement.index]!) * 120
      expect(Math.abs(placement.y - ideal)).toBeLessThanOrEqual(20)
    })
    expect(shown.length).toBeLessThan(5)
  })

  it('keeps every label box inside the vertical limits', () => {
    const placements = visible(
      layoutRadialLabels(
        [2, 4, 6, 8].map((value) => ({ angle: degrees(value), priority: 1 })),
        { ...options, top: -130, bottom: 130 },
      ),
    )

    expect(placements).toHaveLength(4)
    placements.forEach(({ y }) => {
      expect(y - 8).toBeGreaterThanOrEqual(-130 - 1e-9)
      expect(y + 8).toBeLessThanOrEqual(130 + 1e-9)
    })
  })

  it('draws connectors from the slice edge through the elbow to the text', () => {
    const [placement] = layoutRadialLabels(
      [{ angle: degrees(90), priority: 1 }],
      options,
    )

    expect(placement).toMatchObject({ visible: true, side: 'right' })
    if (!placement?.visible) return
    const [edge, elbow, end] = placement.connector
    expect(edge![0]).toBeCloseTo(100, 8)
    expect(elbow![0]).toBeCloseTo(120, 8)
    expect(end![0]).toBeCloseTo(130, 8)
    expect(placement.x).toBeCloseTo(134, 8)
  })

  it('places labels on the left side with mirrored x positions', () => {
    const [placement] = layoutRadialLabels(
      [{ angle: degrees(270), priority: 1 }],
      options,
    )

    expect(placement).toMatchObject({
      visible: true,
      side: 'left',
      x: expect.closeTo(-134, 8),
    })
  })
})
