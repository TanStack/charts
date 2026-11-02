import { describe, expect, it, vi } from 'vitest'
import { projectPolarSector, resolvePolarSector } from './polar-sector-internal'

describe('polar sector projection', () => {
  it.each([
    [0, 2, 20, 60, 0],
    [2, -3, 80, 40, 8],
    [0, Math.PI * 2, 0, 80, 6],
    [0, 0.012, 60, 80, 6],
  ])(
    'keeps the rendered path without sampling its boundary: %j',
    (...values) => {
      const [startAngle, endAngle, innerRadius, outerRadius, cornerRadius] =
        values
      const sector = {
        startAngle: startAngle!,
        endAngle: endAngle!,
        innerRadius: innerRadius!,
        outerRadius: outerRadius!,
        cornerRadius: cornerRadius!,
      }
      const cosine = vi.spyOn(Math, 'cos')
      try {
        const projected = projectPolarSector(sector)
        const projectionCalls = cosine.mock.calls.length
        cosine.mockClear()
        const resolved = resolvePolarSector(sector)
        expect(resolved?.path).toBe(projected)
        expect(resolved!.points.length).toBeGreaterThan(0)
        expect(cosine.mock.calls.length).toBeGreaterThan(projectionCalls)
        expect(projectPolarSector(sector)).toBe(projected)
      } finally {
        cosine.mockRestore()
      }
    },
  )

  it.each([
    'startAngle',
    'endAngle',
    'innerRadius',
    'outerRadius',
    'cornerRadius',
  ] as const)('still rejects nonfinite %s', (field) => {
    const sector = {
      startAngle: 0,
      endAngle: 2,
      innerRadius: 20,
      outerRadius: 60,
      cornerRadius: 0,
      [field]: Number.NaN,
    }
    expect(projectPolarSector(sector)).toBeUndefined()
    expect(resolvePolarSector(sector)).toBeUndefined()
  })
})
