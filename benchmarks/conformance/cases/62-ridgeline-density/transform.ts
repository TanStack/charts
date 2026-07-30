import { bin } from 'd3-array'
import type { SimpsonsRow } from '@charts-poc/demo-data/simpsons'

export type RatedEpisode = SimpsonsRow & {
  readonly imdb_rating: number
}

export interface RidgePoint {
  id: string
  season: number
  imdb_rating: number
  baseline: number
  density: number
}

const boundaries = [
  4, 4.25, 4.5, 4.75, 5, 5.25, 5.5, 5.75, 6, 6.25, 6.5, 6.75, 7, 7.25, 7.5,
  7.75, 8, 8.25, 8.5, 8.75, 9, 9.25, 9.5, 9.75, 10,
]
const createBins = bin<RatedEpisode, number>()
  .value((row) => row.imdb_rating)
  .domain([4, 10])
  .thresholds(boundaries.slice(1, -1))

export function isRatedEpisode(row: SimpsonsRow): row is RatedEpisode {
  return row.imdb_rating !== null
}

export function ridgeSeasons(revision: number): readonly number[] {
  const offset = revision % 2
  return [1 + offset, 10 + offset, 20 + offset]
}

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
