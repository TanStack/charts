import type { ChartJsonIssue } from './types'
import { chartJsonVersion } from './version'

const chartJsonFirstVersion = '0.15.0'

interface SemVer {
  readonly major: number
  readonly minor: number
  readonly patch: number
  readonly prerelease: readonly (string | number)[]
  readonly source: string
}

export function validateChartJsonVersion(
  value: unknown,
  exact: boolean,
  readerVersion = chartJsonVersion,
): readonly ChartJsonIssue[] {
  if (typeof value !== 'string')
    return [
      issue('invalid-version', 'chartsVersion must be a semantic version'),
    ]
  const author = parseSemVer(value)
  const reader = parseSemVer(readerVersion)
  const first = parseSemVer(chartJsonFirstVersion)
  if (!author)
    return [
      issue(
        'invalid-version',
        `invalid semantic version ${JSON.stringify(value)}`,
      ),
    ]
  if (!reader || !first)
    throw new TypeError('The installed Chart JSON version is invalid')
  if (
    exact ? author.source === reader.source : compatible(author, reader, first)
  )
    return []
  return [
    issue(
      'incompatible-version',
      `${value} is not compatible with installed Charts ${readerVersion}`,
    ),
  ]
}

function compatible(author: SemVer, reader: SemVer, first: SemVer): boolean {
  const lowerBound = compare(reader, first) < 0 ? reader : first
  return (
    compare(author, reader) <= 0 &&
    compare(author, lowerBound) >= 0 &&
    (reader.major === 0 ? author.major === 0 : author.major === reader.major)
  )
}

function parseSemVer(source: string): SemVer | undefined {
  const match =
    /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/.exec(
      source,
    )
  if (!match) return undefined
  const prereleaseSource = match[4]?.split('.') ?? []
  if (
    prereleaseSource.some(
      (entry) => /^[0-9]+$/.test(entry) && !/^(0|[1-9][0-9]*)$/.test(entry),
    )
  )
    return undefined
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: prereleaseSource.map((entry) =>
      /^(0|[1-9][0-9]*)$/.test(entry) ? Number(entry) : entry,
    ),
    source,
  }
}

function compare(left: SemVer, right: SemVer): number {
  for (const key of ['major', 'minor', 'patch'] as const) {
    if (left[key] !== right[key]) return left[key] < right[key] ? -1 : 1
  }
  if (!left.prerelease.length || !right.prerelease.length) {
    if (left.prerelease.length === right.prerelease.length) return 0
    return left.prerelease.length ? -1 : 1
  }
  const length = Math.max(left.prerelease.length, right.prerelease.length)
  for (let index = 0; index < length; index++) {
    const a = left.prerelease[index]
    const b = right.prerelease[index]
    if (a === undefined) return -1
    if (b === undefined) return 1
    if (a === b) continue
    if (typeof a === 'number' && typeof b === 'string') return -1
    if (typeof a === 'string' && typeof b === 'number') return 1
    return a < b ? -1 : 1
  }
  return 0
}

function issue(
  code: 'invalid-version' | 'incompatible-version',
  message: string,
): ChartJsonIssue {
  return { code, path: '/chartsVersion', message: `/chartsVersion: ${message}` }
}
