import { beagle } from '@tanstack/charts-data/beagle'
import type { ExtendedFeature, GeoGeometryObjects } from 'd3-geo'

type RouteLineString = Extract<GeoGeometryObjects, { type: 'LineString' }>

export type BeagleRoute = ExtendedFeature<
  RouteLineString,
  { name: 'HMS Beagle voyage' }
>

export const beagleRoute: BeagleRoute = {
  type: 'Feature',
  id: 'hms-beagle',
  properties: {
    name: 'HMS Beagle voyage',
  },
  geometry: {
    type: 'LineString',
    coordinates: beagle.map(([longitude, latitude]) => [longitude, latitude]),
  },
}
