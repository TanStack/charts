import {
  area as createAreaPath,
  curveBasis,
  curveBasisClosed,
  curveBasisOpen,
  curveBumpX,
  curveBumpY,
  curveCardinal,
  curveCardinalClosed,
  curveCardinalOpen,
  curveCatmullRom,
  curveCatmullRomClosed,
  curveCatmullRomOpen,
  curveLinear,
  curveLinearClosed,
  curveMonotoneX,
  curveMonotoneY,
  curveNatural,
  curveStep,
  curveStepAfter,
  curveStepBefore,
  line as createLinePath,
  type CurveFactory,
} from 'd3-shape'
import { describe, expect, it } from 'vitest'
import { d3Curve } from './d3-shape'

const points = [
  [10, 80],
  [55, 20],
  [105, 65],
  [160, 25],
] as const
const bottom = points.map(([x]) => [x, 110] as const)

describe('d3Curve resolved geometry', () => {
  for (const [name, curve] of [
    ['basis', curveBasis],
    ['basis-closed', curveBasisClosed],
    ['basis-open', curveBasisOpen],
    ['bump-x', curveBumpX],
    ['bump-y', curveBumpY],
    ['cardinal', curveCardinal],
    ['cardinal-closed', curveCardinalClosed],
    ['cardinal-open', curveCardinalOpen],
    ['catmull-rom', curveCatmullRom],
    ['catmull-rom-closed', curveCatmullRomClosed],
    ['catmull-rom-open', curveCatmullRomOpen],
    ['linear', curveLinear],
    ['linear-closed', curveLinearClosed],
    ['monotone-x', curveMonotoneX],
    ['monotone-y', curveMonotoneY],
    ['natural', curveNatural],
    ['step', curveStep],
    ['step-after', curveStepAfter],
    ['step-before', curveStepBefore],
  ] satisfies readonly (readonly [string, CurveFactory])[]) {
    it(`preserves D3 ${name} path data while recording hit contours`, () => {
      const adapter = d3Curve(curve)
      const expectedLine =
        createLinePath<readonly [number, number]>().curve(curve)(points)
      const expectedArea = createAreaPath<
        readonly [x: number, y0: number, y1: number]
      >()
        .x((point) => point[0])
        .y0((point) => point[1])
        .y1((point) => point[2])
        .curve(curve)(
        points.map(
          (point, index) =>
            [point[0], bottom[index]?.[1] ?? point[1], point[1]] as const,
        ),
      )
      const lineGeometry = adapter.geometry?.line(points)
      const areaGeometry = adapter.geometry?.area(points, bottom)

      expect(adapter.line(points)).toBe(expectedLine)
      expect(adapter.area(points, bottom)).toBe(expectedArea)
      expect(lineGeometry?.data).toBe(expectedLine)
      expect(areaGeometry?.data).toBe(expectedArea)
      expect(lineGeometry?.contours[0]?.points.length).toBeGreaterThanOrEqual(
        points.length,
      )
      expect(areaGeometry?.contours.some((contour) => contour.closed)).toBe(
        expectedArea?.includes('Z'),
      )
    })
  }
})
