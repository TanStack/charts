import { describe, expect, it } from 'vitest'
import { geoEqualEarth, geoIdentity } from 'd3-geo'
import type {
  ExtendedFeature,
  ExtendedFeatureCollection,
  GeoGeometryObjects,
} from 'd3-geo'
import { scaleLinear, scaleOrdinal } from 'd3-scale'
import { geoShape } from './geo'
import { createChartScene, defineChart } from './scene'
import { renderChartSvg } from './svg'

interface RegionProperties {
  id: 'west' | 'east'
  fill: string
}

type Polygon = Extract<GeoGeometryObjects, { type: 'Polygon' }>
type Region = ExtendedFeature<Polygon, RegionProperties>
type Point = Extract<GeoGeometryObjects, { type: 'Point' }>
type Place = ExtendedFeature<
  Point,
  { id: 'small' | 'large' | 'invalid'; magnitude: number }
>
type LineString = Extract<GeoGeometryObjects, { type: 'LineString' }>
type Route = ExtendedFeature<LineString, { id: 'route' }>

const regions: readonly Region[] = [
  {
    type: 'Feature',
    id: 'west',
    properties: { id: 'west', fill: '#2563eb' },
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [40, 0],
          [40, 40],
          [0, 40],
          [0, 0],
        ],
      ],
    },
  },
  {
    type: 'Feature',
    id: 'east',
    properties: { id: 'east', fill: '#f97316' },
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [50, 0],
          [100, 0],
          [100, 40],
          [50, 40],
          [50, 0],
        ],
      ],
    },
  },
]

const collection: ExtendedFeatureCollection<Region> = {
  type: 'FeatureCollection',
  features: [...regions],
}

const places: readonly Place[] = [
  {
    type: 'Feature',
    id: 'small',
    properties: { id: 'small', magnitude: 2 },
    geometry: { type: 'Point', coordinates: [20, 20] },
  },
  {
    type: 'Feature',
    id: 'large',
    properties: { id: 'large', magnitude: 4 },
    geometry: { type: 'Point', coordinates: [60, 20] },
  },
  {
    type: 'Feature',
    id: 'invalid',
    properties: { id: 'invalid', magnitude: -1 },
    geometry: { type: 'Point', coordinates: [80, 20] },
  },
]

describe('geoShape', () => {
  it('fits a D3 projection to final bounds and emits keyed paths and points', () => {
    const definition = defineChart({
      marks: [
        geoShape(regions, {
          className: 'regions',
          color: (region) => region.properties.id,
          projection: {
            type: geoIdentity,
            fit: collection,
          },
          stroke: '#ffffff',
          strokeWidth: 1,
          strokeDasharray: '3 2',
          opacity: 0.9,
          anchor: (region) =>
            region.properties.id === 'west' ? [20, 20] : [75, 20],
        }),
      ],
      margin: 10,
      color: {
        scale: scaleOrdinal<'west' | 'east', string>()
          .domain(['west', 'east'])
          .range(['#2563eb', '#f97316']),
      },
    })

    const scene = createChartScene(definition, { width: 240, height: 140 })
    const svg = renderChartSvg(scene, { ariaLabel: 'Regions' })

    expect(scene.chart).toEqual({
      x: 10,
      y: 10,
      width: 220,
      height: 120,
    })
    expect(scene.points).toHaveLength(2)
    expect(scene.points.map((point) => point.datum.properties.id)).toEqual([
      'west',
      'east',
    ])
    expect(scene.points.map((point) => [point.xValue, point.yValue])).toEqual([
      [20, 20],
      [75, 20],
    ])
    expect(scene.points.every((point) => Number.isFinite(point.x))).toBe(true)
    expect(svg.match(/class="ts-chart__geo regions"/g)).toHaveLength(1)
    expect(svg.match(/<path/g)).toHaveLength(2)
    expect(svg).toContain('fill="#2563eb"')
    expect(svg).toContain('fill="#f97316"')
    expect(svg).toContain('stroke="#ffffff"')
    expect(svg).toContain('stroke-dasharray="3 2"')
    expect(svg).toContain('opacity="0.9"')
  })

  it('uses the original GeoJSON datum and spherical centroid by default', () => {
    const definition = defineChart({
      marks: [
        geoShape(regions.slice(0, 1), {
          projection: ({ chart }) =>
            geoIdentity().fitExtent(
              [
                [chart.x, chart.y],
                [chart.x + chart.width, chart.y + chart.height],
              ],
              collection,
            ),
          fill: (region) => region.properties.fill,
        }),
      ],
    })

    const scene = createChartScene(definition, { width: 200, height: 100 })
    const point = scene.points[0]

    expect(point?.datum).toBe(regions[0])
    expect(point?.color).toBe('#2563eb')
    expect(point?.xValue).toEqual(expect.any(Number))
    expect(point?.yValue).toEqual(expect.any(Number))
  })

  it('delegates constant and channel-backed point radii to D3 geoPath', () => {
    const variableDefinition = defineChart({
      marks: [
        geoShape(places, {
          projection: () => null,
          r: (place) => place.properties.magnitude,
          rScale: (magnitude) => magnitude * 2,
          fill: '#0ea5e9',
        }),
      ],
    })
    const constantDefinition = defineChart({
      marks: [
        geoShape(places.slice(0, 1), {
          projection: () => null,
          r: 7,
          fill: '#0ea5e9',
        }),
      ],
    })
    const variableScene = createChartScene(variableDefinition, {
      width: 100,
      height: 50,
    })
    const constantScene = createChartScene(constantDefinition, {
      width: 100,
      height: 50,
    })
    const variableSvg = renderChartSvg(variableScene, {
      ariaLabel: 'Variable geographic points',
    })
    const constantSvg = renderChartSvg(constantScene, {
      ariaLabel: 'Constant geographic point',
    })

    expect(variableScene.points).toHaveLength(2)
    expect(variableSvg.match(/<path/g)).toHaveLength(2)
    expect(variableSvg).toContain('m0,4a4,4')
    expect(variableSvg).toContain('m0,8a8,8')
    expect(constantSvg).toContain('m0,7a7,7')
  })

  it('uses semantic color as stroke for linework and fill for closed geometry', () => {
    const route: Route = {
      type: 'Feature',
      id: 'route',
      properties: { id: 'route' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [0, 0],
          [100, 40],
        ],
      },
    }
    const definition = defineChart({
      marks: [
        geoShape([route], {
          color: (feature) => feature.properties.id,
          projection: { type: geoIdentity, fit: 'data' },
        }),
      ],
      color: { domain: ['route'], range: ['#0ea5e9'] },
    })

    const scene = createChartScene(definition, { width: 200, height: 100 })
    const svg = renderChartSvg(scene, { ariaLabel: 'Route' })

    expect(svg).toContain('fill="none"')
    expect(svg).toContain('stroke="#0ea5e9"')
    expect(scene.points[0]?.color).toBe('#0ea5e9')
  })

  it('paints both surfaces and linework in mixed geometry collections', () => {
    const mixed: GeoGeometryObjects = {
      type: 'GeometryCollection',
      geometries: [
        {
          type: 'LineString',
          coordinates: [
            [0, 0],
            [100, 40],
          ],
        },
        regions[0]!.geometry,
      ],
    }
    const definition = defineChart({
      marks: [
        geoShape([mixed], {
          color: () => 'mixed',
          projection: () => null,
        }),
      ],
      color: { domain: ['mixed'], range: ['#0ea5e9'] },
    })

    const svg = renderChartSvg(
      createChartScene(definition, { width: 200, height: 100 }),
      { ariaLabel: 'Mixed geometry' },
    )

    expect(svg).toContain('fill="#0ea5e9"')
    expect(svg).toContain('stroke="#0ea5e9"')
  })

  it('keeps feature identity independent from changing semantic color', () => {
    const definition = (values: readonly number[]) =>
      defineChart({
        marks: [
          geoShape(
            regions.map((region, index) => ({
              ...region,
              properties: {
                ...region.properties,
                value: values[index] ?? 0,
              },
            })),
            {
              color: (feature) => feature.properties.value,
              projection: { type: geoIdentity, fit: collection },
            },
          ),
        ],
        color: {
          scale: scaleLinear<string>,
          domain: [0, 100],
          range: ['#eff6ff', '#1d4ed8'],
        },
      })

    const first = createChartScene(definition([10, 90]), {
      width: 200,
      height: 100,
    })
    const second = createChartScene(definition([80, 20]), {
      width: 200,
      height: 100,
    })

    expect(first.points.map((point) => point.key)).toEqual(
      second.points.map((point) => point.key),
    )
    expect(first.points.every((point) => point.group === null)).toBe(true)
    expect(first.points.map((point) => point.color)).not.toEqual(
      second.points.map((point) => point.color),
    )
  })

  it('fits descriptor projections to data or sphere on every resize', () => {
    const dataProjections: ReturnType<typeof geoIdentity>[] = []
    const sphereProjections: ReturnType<typeof geoEqualEarth>[] = []
    const clampedProjections: ReturnType<typeof geoEqualEarth>[] = []
    const definition = defineChart({
      marks: [
        geoShape(regions, {
          projection: {
            type: () => {
              const projection = geoIdentity()
              dataProjections.push(projection)
              return projection
            },
            fit: 'data',
            inset: 12,
          },
        }),
        geoShape([{ type: 'Sphere' }], {
          projection: {
            type: () => {
              const projection = geoEqualEarth()
              sphereProjections.push(projection)
              return projection
            },
            fit: 'sphere',
            inset: 8,
          },
          fill: 'none',
        }),
        geoShape([{ type: 'Sphere' }], {
          projection: {
            type: () => {
              const projection = geoEqualEarth()
              clampedProjections.push(projection)
              return projection
            },
            fit: 'sphere',
            inset: 10_000,
          },
          fill: 'none',
        }),
      ],
    })

    createChartScene(definition, { width: 240, height: 140 })
    createChartScene(definition, { width: 480, height: 280 })

    expect(dataProjections).toHaveLength(2)
    expect(sphereProjections).toHaveLength(2)
    expect(dataProjections[1]!.scale()).toBeGreaterThan(
      dataProjections[0]!.scale(),
    )
    expect(sphereProjections[1]!.scale()).toBeGreaterThan(
      sphereProjections[0]!.scale(),
    )
    expect(
      sphereProjections.every((projection) => projection.scale() > 0),
    ).toBe(true)
    expect(
      clampedProjections.every((projection) => projection.scale() > 0),
    ).toBe(true)
  })
})
