import { cumsum, group, sum } from 'd3-array'
import {
  mosaicData,
  mosaicMarkets,
  mosaicSegments,
  type MosaicMarket,
  type MosaicSource,
} from './data'

export interface MosaicCell extends MosaicSource {
  id: string
  x1: number
  x2: number
  y1: number
  y2: number
}

export interface MosaicLabel {
  market: MosaicMarket
  x: number
  y: number
}

export function mosaicLayout(revision: number): {
  cells: readonly MosaicCell[]
  labels: readonly MosaicLabel[]
} {
  const rows = mosaicData(revision)
  const byMarket = group(rows, (row) => row.market)
  const totals = mosaicMarkets.map((market) =>
    sum(byMarket.get(market) ?? [], (row) => row.value),
  )
  const grandTotal = sum(totals)
  const xEnds = cumsum(totals, (value) => value / grandTotal)
  const cells: MosaicCell[] = []
  const labels: MosaicLabel[] = []

  mosaicMarkets.forEach((market, marketIndex) => {
    const marketRows = byMarket.get(market) ?? []
    const marketTotal = totals[marketIndex] ?? 1
    const x1 = marketIndex === 0 ? 0 : (xEnds[marketIndex - 1] ?? 0)
    const x2 = xEnds[marketIndex] ?? x1
    const ordered = mosaicSegments.map(
      (segment) =>
        marketRows.find((row) => row.segment === segment) ?? {
          market,
          segment,
          value: 0,
        },
    )
    const yEnds = cumsum(ordered, (row) => row.value / marketTotal)

    ordered.forEach((row, segmentIndex) => {
      cells.push({
        ...row,
        id: `${market}:${row.segment}`,
        x1,
        x2,
        y1: segmentIndex === 0 ? 0 : (yEnds[segmentIndex - 1] ?? 0),
        y2: yEnds[segmentIndex] ?? 0,
      })
    })
    labels.push({
      market,
      x: (x1 + x2) / 2,
      y: 1.055,
    })
  })

  return { cells, labels }
}
