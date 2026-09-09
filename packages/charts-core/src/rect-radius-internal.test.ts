import { describe, expect, it } from 'vitest'
import {
  rectCornerRadiiPath,
  resolveRectCornerRadii,
} from '@tanstack/charts/renderer/rect'
import {
  containsRectCornerRadii,
  rectCornerRadiiPath as internalRectCornerRadiiPath,
  resolveRectCornerRadii as internalResolveRectCornerRadii,
  squaredDistanceToRectCornerRadii,
} from './rect-radius-internal'

describe('selective rectangle corner geometry', () => {
  it('shares one public normalization and serialization implementation', () => {
    expect(internalResolveRectCornerRadii).toBe(resolveRectCornerRadii)
    expect(internalRectCornerRadiiPath).toBe(rectCornerRadiiPath)
  })

  it('sanitizes radii and proportionally fits every adjacent pair', () => {
    expect(
      resolveRectCornerRadii([-1, Number.NaN, Infinity, 4], 10, 10),
    ).toEqual([0, 0, 0, 4])
    expect(resolveRectCornerRadii([8, 8, 8, 8], 20, 10)).toEqual([5, 5, 5, 5])

    const asymmetric = resolveRectCornerRadii([12, 4, 8, 6], 12, 10)
    expect(asymmetric[0]).toBeCloseTo(20 / 3)
    expect(asymmetric[1]).toBeCloseTo(20 / 9)
    expect(asymmetric[2]).toBeCloseTo(40 / 9)
    expect(asymmetric[3]).toBeCloseTo(10 / 3)
  })

  it('uses one stable path skeleton, including square corners', () => {
    expect(rectCornerRadiiPath(10, 20, 40, 20, [5, 10, 15, 0])).toBe(
      'M14,20H42A8,8 0 0 1 50,28V28A12,12 0 0 1 38,40H10A0,0 0 0 1 10,40V24A4,4 0 0 1 14,20Z',
    )
    expect(rectCornerRadiiPath(50, 40, -40, -20, [5, 10, 15, 0])).toBe(
      'M14,20H42A8,8 0 0 1 50,28V28A12,12 0 0 1 38,40H10A0,0 0 0 1 10,40V24A4,4 0 0 1 14,20Z',
    )
    expect(rectCornerRadiiPath(0, 0, 10, 10, [0, 0, 0, 0])).toBe(
      'M0,0H10A0,0 0 0 1 10,0V10A0,0 0 0 1 10,10H0A0,0 0 0 1 0,10V0A0,0 0 0 1 0,0Z',
    )
  })

  it('contains points against the radius for each physical corner', () => {
    const radii = [20, 0, 10, 0] as const
    expect(containsRectCornerRadii(0, 0, 100, 50, radii, 1, 1)).toBe(false)
    expect(containsRectCornerRadii(0, 0, 100, 50, radii, 10, 10)).toBe(true)
    expect(containsRectCornerRadii(0, 0, 100, 50, radii, 99, 1)).toBe(true)
    expect(containsRectCornerRadii(0, 0, 100, 50, radii, 99, 49)).toBe(false)
    expect(containsRectCornerRadii(0, 0, 100, 50, radii, 50, 25)).toBe(true)
    expect(containsRectCornerRadii(0, 0, 100, 50, radii, Number.NaN, 25)).toBe(
      false,
    )
  })

  it('measures from straight edges and individual corner arcs', () => {
    const radii = [20, 0, 10, 0] as const
    expect(squaredDistanceToRectCornerRadii(0, 0, 100, 50, radii, 50, 25)).toBe(
      0,
    )
    expect(squaredDistanceToRectCornerRadii(0, 0, 100, 50, radii, -5, 25)).toBe(
      25,
    )
    expect(
      Math.sqrt(squaredDistanceToRectCornerRadii(0, 0, 100, 50, radii, 0, 0)),
    ).toBeCloseTo(Math.hypot(20, 20) - 20)
  })
})
