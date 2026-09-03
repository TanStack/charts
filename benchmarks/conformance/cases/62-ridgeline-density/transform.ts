import { bin } from 'd3-array'
import { ratingBoundaries } from './selection'
import type { RatedEpisode } from './selection'

export interface RidgePoint {
  id: string
  season: number
  imdb_rating: number
  baseline: number
  density: number
}

const createBins = bin<RatedEpisode, number>()
  .value((row) => row.imdb_rating)
  .domain([4, 10])
  .thresholds(ratingBoundaries.slice(1, -1))

export function ridgeDensity(
  episodes: readonly RatedEpisode[],
  seasons: readonly number[],
): readonly RidgePoint[] {
  return seasons.flatMap((season, seasonIndex) => {
    const buckets = createBins(
      episodes.filter((episode) => episode.season === season),
    )
    const maximum = Math.max(...buckets.map((bucket) => bucket.length), 1)

    return buckets.flatMap((bucket, index) => {
      if (bucket.x0 === undefined || bucket.x1 === undefined) return []
      return [
        {
          id: `${season}:${index}`,
          season,
          imdb_rating: (bucket.x0 + bucket.x1) / 2,
          baseline: seasonIndex,
          density: seasonIndex + (bucket.length / maximum) * 0.78,
        },
      ]
    })
  })
}
