export type MosaicMarket = 'Enterprise' | 'Mid-market' | 'SMB' | 'Consumer'
export type MosaicSegment = 'Core' | 'Growth' | 'Services'

export interface MosaicSource {
  market: MosaicMarket
  segment: MosaicSegment
  value: number
}

export const mosaicMarkets: readonly MosaicMarket[] = [
  'Enterprise',
  'Mid-market',
  'SMB',
  'Consumer',
]

export const mosaicSegments: readonly MosaicSegment[] = [
  'Core',
  'Growth',
  'Services',
]

export const mosaicColors: Readonly<Record<MosaicSegment, string>> = {
  Core: '#2563eb',
  Growth: '#0d9488',
  Services: '#d97706',
}

const baseValues: Readonly<
  Record<MosaicMarket, Readonly<Record<MosaicSegment, number>>>
> = {
  Enterprise: { Core: 46, Growth: 24, Services: 30 },
  'Mid-market': { Core: 28, Growth: 35, Services: 17 },
  SMB: { Core: 24, Growth: 18, Services: 12 },
  Consumer: { Core: 14, Growth: 20, Services: 8 },
}

export function mosaicData(revision: number): readonly MosaicSource[] {
  const delta = revision % 2 === 0 ? 0 : 3

  return mosaicMarkets.flatMap((market, marketIndex) =>
    mosaicSegments.map((segment, segmentIndex) => ({
      market,
      segment,
      value:
        baseValues[market][segment] +
        (marketIndex === segmentIndex ? delta : 0),
    })),
  )
}
