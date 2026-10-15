import { describe, expect, it } from 'vitest'
import { layoutRadialLabels } from './polar-label-layout-internal'
import type {
  RadialLabelInput,
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
  left: -400,
  right: 400,
  maxShift: Infinity,
}

const degrees = (value: number) => (value * Math.PI) / 180

function label(
  angle: number,
  { priority = 1, width = 40 }: { priority?: number; width?: number } = {},
): RadialLabelInput {
  return { angle: degrees(angle), priority, width }
}

function visible(placements: readonly RadialLabelPlacement[]) {
  return placements.flatMap((placement, index) =>
    placement.visible ? [{ index, ...placement }] : [],
  )
}

describe('layoutRadialLabels', () => {
  it('keeps separated labels at their ideal height', () => {
    const placements = layoutRadialLabels([label(60), label(240)], options)

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
    const angles = [88, 90, 92, 94]
    const placements = visible(
      layoutRadialLabels(
        angles.map((angle) => label(angle)),
        options,
      ),
    )

    expect(placements.map(({ index }) => index)).toEqual([0, 1, 2, 3])
    placements.slice(1).forEach((placement, k) => {
      expect(placement.y - placements[k]!.y).toBeCloseTo(16, 8)
    })
    const idealMean =
      angles.reduce((sum, angle) => sum - Math.cos(degrees(angle)) * 120, 0) / 4
    const placedMean =
      placements.reduce((sum, placement) => sum + placement.y, 0) / 4
    expect(placedMean).toBeCloseTo(idealMean, 8)
  })

  it('hides the lowest-priority labels when a side runs out of space', () => {
    const placements = layoutRadialLabels(
      [
        label(80, { priority: 5 }),
        label(85, { priority: 1 }),
        label(90, { priority: 4 }),
        label(95, { priority: 2 }),
        label(100, { priority: 3 }),
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

  it('hides the later label first when priorities are equal', () => {
    const placements = layoutRadialLabels(
      [label(80), label(85), label(90), label(95), label(100)],
      { ...options, top: -24, bottom: 24 },
    )

    expect(placements.map((placement) => placement.visible)).toEqual([
      true,
      true,
      true,
      false,
      false,
    ])
  })

  it('hides labels that would move farther than maxShift', () => {
    const angles = [86, 88, 90, 92, 94]
    const placements = layoutRadialLabels(
      angles.map((angle, index) =>
        label(angle, { priority: index === 2 ? 9 : 1 }),
      ),
      { ...options, maxShift: 20 },
    )
    const shown = visible(placements)

    expect(shown.map(({ index }) => index)).toContain(2)
    shown.forEach((placement) => {
      const ideal = -Math.cos(degrees(angles[placement.index]!)) * 120
      expect(Math.abs(placement.y - ideal)).toBeLessThanOrEqual(20)
    })
    expect(shown.length).toBeLessThan(5)
  })

  it('keeps every label box inside the vertical limits', () => {
    const placements = visible(
      layoutRadialLabels(
        [2, 4, 6, 8].map((angle) => label(angle)),
        { ...options, top: -130, bottom: 130 },
      ),
    )

    expect(placements).toHaveLength(4)
    placements.forEach(({ y }) => {
      expect(y - 8).toBeGreaterThanOrEqual(-130 - 1e-9)
      expect(y + 8).toBeLessThanOrEqual(130 + 1e-9)
    })
  })

  it('hides labels whose text crosses the left or right edge', () => {
    const placements = layoutRadialLabels(
      [
        label(90, { width: 30 }),
        label(120, { width: 200 }),
        label(270, { width: 30 }),
        label(240, { width: 200 }),
      ],
      { ...options, left: -180, right: 180 },
    )

    expect(placements.map((placement) => placement.visible)).toEqual([
      true,
      false,
      true,
      false,
    ])
    visible(placements).forEach(({ x, side, index }) => {
      const width = [30, 200, 30, 200][index]!
      if (side === 'right') expect(x + width).toBeLessThanOrEqual(180)
      else expect(x - width).toBeGreaterThanOrEqual(-180)
    })
  })

  it('lets remaining labels use the space of a hidden long label', () => {
    const crowded = [88, 90, 92]
    const placements = layoutRadialLabels(
      crowded.map((angle, index) =>
        label(angle, { width: index === 1 ? 500 : 30 }),
      ),
      options,
    )
    const [first, , last] = placements

    expect(placements[1]).toEqual({ visible: false })
    expect(first?.visible && last?.visible).toBe(true)
    if (first?.visible && last?.visible) {
      expect(last.y - first.y).toBeCloseTo(16, 8)
    }
  })

  it('draws connectors from the slice edge through the elbow to the text', () => {
    const [placement] = layoutRadialLabels([label(90)], options)

    expect(placement).toMatchObject({ visible: true, side: 'right' })
    if (!placement?.visible) return
    const [edge, elbow, end] = placement.connector
    expect(edge![0]).toBeCloseTo(100, 8)
    expect(elbow![0]).toBeCloseTo(120, 8)
    expect(end![0]).toBeCloseTo(130, 8)
    expect(placement.x).toBeCloseTo(134, 8)
  })

  it('places labels on the left side with mirrored x positions', () => {
    const [placement] = layoutRadialLabels([label(270)], options)

    expect(placement).toMatchObject({
      visible: true,
      side: 'left',
      x: expect.closeTo(-134, 8),
    })
  })

  it('keeps the same labels as removing the lowest priority one at a time', () => {
    const tight = { ...options, top: -40, bottom: 40 }
    const capacity = Math.floor((tight.bottom - tight.top) / tight.lineHeight)
    for (let seed = 1; seed <= 50; seed += 1) {
      const labels = Array.from({ length: 30 }, (_, index) =>
        label(10 + ((index * 37 + seed * 11) % 160), {
          priority: (index * seed) % 4,
        }),
      )
      let expected = labels.map((_, index) => index)
      while (expected.length > capacity) {
        const lowest = expected.reduce((current, index) => {
          const difference = labels[index]!.priority - labels[current]!.priority
          return difference < 0 || (difference === 0 && index > current)
            ? index
            : current
        })
        expected = expected.filter((index) => index !== lowest)
      }

      const shown = visible(layoutRadialLabels(labels, tight))
      expect(shown.map(({ index }) => index).sort((a, b) => a - b)).toEqual(
        expected,
      )
    }
  })

  it('keeps visible labels in angular order after capacity selection', () => {
    const labels = Array.from({ length: 40 }, (_, index) =>
      label(5 + index * 4, { priority: (index * 7) % 5 }),
    )
    const shown = visible(
      layoutRadialLabels(labels, { ...options, top: -60, bottom: 60 }),
    )
    const byHeight = [...shown].sort((a, b) => a.y - b.y)

    expect(byHeight.map(({ index }) => index)).toEqual(
      [...shown]
        .sort((a, b) => labels[a.index]!.angle - labels[b.index]!.angle)
        .map(({ index }) => index),
    )
  })

  it('selects capacity labels from thousands of candidates', () => {
    const labels = Array.from({ length: 5000 }, (_, index) =>
      label(1 + (index / 5000) * 170, { priority: index % 97 }),
    )
    const shown = visible(
      layoutRadialLabels(labels, { ...options, top: -200, bottom: 200 }),
    )

    expect(shown).toHaveLength(25)
    expect(
      Math.min(...shown.map(({ index }) => labels[index]!.priority)),
    ).toBeGreaterThanOrEqual(96)
  })
})
