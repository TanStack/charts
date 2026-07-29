import { worldPlaces, worldRoutes } from '../102-world-choropleth/geo-data'
import type { WorldPlace } from '../102-world-choropleth/geo-data'

export { worldRoutes }

export function routePlaces(revision = 0): readonly WorldPlace[] {
  const finalStop = revision % 2 === 0 ? 'tokyo' : 'singapore'
  const ids = new Set([
    'san-francisco',
    'new-york',
    'london',
    'lagos',
    'dubai',
    finalStop,
  ])
  return worldPlaces(revision).filter((feature) =>
    ids.has(feature.properties.id),
  )
}
