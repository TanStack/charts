import { aapl } from '@tanstack/charts-data/aapl'
import { describe, expect, it } from 'vitest'
import { selectZoomRows, visibleZoomLineData, zoomDateKey } from './model'
import type { ZoomLineRow } from './model'

const rows = selectZoomRows(aapl)

describe('visibleZoomLineData', () => {
  it('sorts visible rows and interpolates the viewport boundaries', () => {
    const reversed = [...rows].reverse()
    const originalOrder = reversed.map((row) => row.Date.getTime())
    const lineRows = visibleZoomLineData(
      reversed,
      dateWindow('2018-01-06', '2018-01-14'),
    )

    expect(keys(lineRows)).toEqual([
      '2018-01-06',
      '2018-01-08',
      '2018-01-09',
      '2018-01-10',
      '2018-01-11',
      '2018-01-12',
      '2018-01-14',
    ])
    expect(lineRows[0]?.Close).toBeCloseTo(
      row('2018-01-05').Close +
        (row('2018-01-08').Close - row('2018-01-05').Close) / 3,
    )
    expect(lineRows.at(-1)?.Close).toBeCloseTo(
      row('2018-01-12').Close +
        (row('2018-01-16').Close - row('2018-01-12').Close) / 2,
    )
    expect(reversed.map((row) => row.Date.getTime())).toEqual(originalOrder)
  })

  it('interpolates the segment when the window has no observations', () => {
    const lineRows = visibleZoomLineData(
      rows,
      dateWindow('2018-01-06', '2018-01-07'),
    )
    const before = row('2018-01-05')
    const after = row('2018-01-08')

    expect(keys(lineRows)).toEqual(['2018-01-06', '2018-01-07'])
    expect(lineRows[0]?.Close).toBeCloseTo(
      before.Close + (after.Close - before.Close) / 3,
    )
    expect(lineRows[1]?.Close).toBeCloseTo(
      before.Close + ((after.Close - before.Close) * 2) / 3,
    )
  })

  it('does not synthesize a row where an observation meets the boundary', () => {
    expect(
      keys(visibleZoomLineData(rows, dateWindow('2018-01-08', '2018-01-16'))),
    ).toEqual([
      '2018-01-08',
      '2018-01-09',
      '2018-01-10',
      '2018-01-11',
      '2018-01-12',
      '2018-01-16',
    ])
    expect(
      keys(visibleZoomLineData(rows, dateWindow('2018-01-06', '2018-01-12'))),
    ).toEqual([
      '2018-01-06',
      '2018-01-08',
      '2018-01-09',
      '2018-01-10',
      '2018-01-11',
      '2018-01-12',
    ])
  })

  it('keeps duplicate timestamps in stable source order', () => {
    const jan8 = row('2018-01-08')
    const jan9 = row('2018-01-09')
    const jan10 = row('2018-01-10')
    const duplicate = { ...jan9, Volume: jan9.Volume + 1 }
    const input = [jan10, duplicate, jan8, jan9]

    expect(
      visibleZoomLineData(input, dateWindow('2018-01-08', '2018-01-10')),
    ).toEqual([jan8, duplicate, jan9, jan10])
  })

  it('preserves an invalid close as a line gap', () => {
    const jan8 = row('2018-01-08')
    const gap = { ...row('2018-01-09'), Close: Number.NaN }
    const jan10 = row('2018-01-10')

    const lineRows = visibleZoomLineData(
      [jan10, gap, jan8],
      dateWindow('2018-01-08', '2018-01-10'),
    )

    expect(keys(lineRows)).toEqual(['2018-01-08', '2018-01-09', '2018-01-10'])
    expect(lineRows[1]?.Close).toBeNaN()
  })

  it('does not invent a segment around one exact observation', () => {
    expect(
      keys(visibleZoomLineData(rows, dateWindow('2018-01-09', '2018-01-09'))),
    ).toEqual(['2018-01-09'])
  })

  it('returns no segment for empty, invalid, reversed, or one-sided data', () => {
    expect(
      visibleZoomLineData([], dateWindow('2018-01-06', '2018-01-07')),
    ).toEqual([])
    expect(
      visibleZoomLineData(rows, dateWindow('2018-01-01', '2018-01-01')),
    ).toEqual([])
    expect(
      visibleZoomLineData(rows, dateWindow('2018-01-19', '2018-01-20')),
    ).toEqual([])
    expect(
      visibleZoomLineData(rows, dateWindow('2018-01-10', '2018-01-09')),
    ).toEqual([])
    expect(
      visibleZoomLineData(rows, {
        start: new Date(Number.NaN),
        end: new Date(Date.UTC(2018, 0, 9)),
      }),
    ).toEqual([])
  })
})

function dateWindow(start: string, end: string) {
  return {
    start: new Date(`${start}T00:00:00.000Z`),
    end: new Date(`${end}T00:00:00.000Z`),
  }
}

function keys(input: readonly ZoomLineRow[]) {
  return input.map((row) => zoomDateKey(row.Date))
}

function row(date: string) {
  const match = rows.find((candidate) => zoomDateKey(candidate.Date) === date)
  if (!match) throw new Error(`Missing fixture row for ${date}`)
  return match
}
