import type { SimpsonsRow } from '@tanstack/charts-data/simpsons'

export type RatedEpisode = SimpsonsRow & {
  readonly imdb_rating: number
}

export const ratingBoundaries = [
  4, 4.25, 4.5, 4.75, 5, 5.25, 5.5, 5.75, 6, 6.25, 6.5, 6.75, 7, 7.25, 7.5,
  7.75, 8, 8.25, 8.5, 8.75, 9, 9.25, 9.5, 9.75, 10,
] as const

export function isRatedEpisode(row: SimpsonsRow): row is RatedEpisode {
  return row.imdb_rating !== null
}

export function ridgeSeasons(revision: number): readonly number[] {
  const offset = revision % 2
  return [1 + offset, 10 + offset, 20 + offset]
}
