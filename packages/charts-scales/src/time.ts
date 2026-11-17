import { scaleLinear } from './linear'
import { tickStep } from './ticks'

export interface UtcScale {
  (value: Date | number | null | undefined): number | undefined
  domain(): [Date, Date]
  domain(values: Iterable<Date | number>): UtcScale
  range(): [number, number]
  range(values: Iterable<number>): UtcScale
  invert(value: number): Date
  clamp(): boolean
  clamp(value: boolean): UtcScale
  ticks(count?: number): Date[]
  tickFormat(count?: number): (value: Date) => string
  nice(count?: number): UtcScale
  copy(): UtcScale
}

type Unit =
  | 'millisecond'
  | 'second'
  | 'minute'
  | 'hour'
  | 'day'
  | 'week'
  | 'month'
  | 'year'
type Interval = readonly [Unit, number, number]
const day = 86_400_000
const year = 365 * day
const intervals: readonly Interval[] = [
  ['second', 1, 1_000],
  ['second', 5, 5_000],
  ['second', 15, 15_000],
  ['second', 30, 30_000],
  ['minute', 1, 60_000],
  ['minute', 5, 300_000],
  ['minute', 15, 900_000],
  ['minute', 30, 1_800_000],
  ['hour', 1, 3_600_000],
  ['hour', 3, 10_800_000],
  ['hour', 6, 21_600_000],
  ['hour', 12, 43_200_000],
  ['day', 1, day],
  ['day', 2, 2 * day],
  ['week', 1, 7 * day],
  ['month', 1, 30 * day],
  ['month', 3, 90 * day],
  ['year', 1, year],
]

export function scaleUtc(): UtcScale
export function scaleUtc(range: Iterable<number>): UtcScale
export function scaleUtc(
  domain: Iterable<Date | number>,
  range: Iterable<number>,
): UtcScale
export function scaleUtc(
  first?: Iterable<Date | number>,
  second?: Iterable<number>,
): UtcScale {
  const linear = scaleLinear([946_684_800_000, 946_771_200_000], [0, 1])
  let dateStart = 946_684_800_000
  let dateSpan = day
  let outputStart = 0
  let outputSpan = 1
  let clamped = false

  function refreshMapping() {
    const domain = linear.domain(),
      range = linear.range()
    dateStart = domain[0]
    dateSpan = domain[1] - domain[0]
    outputStart = range[0]
    outputSpan = range[1] - range[0]
  }

  function scale(value: Date | number | null | undefined) {
    if (value instanceof Date) {
      const timestamp = value.getTime()
      if (!Number.isFinite(timestamp)) return undefined
      let ratio = dateSpan ? (timestamp - dateStart) / dateSpan : 0.5
      if (clamped) ratio = Math.max(0, Math.min(1, ratio))
      return outputStart + ratio * outputSpan
    }
    if (value == null) return undefined
    return Math.abs(value) > 8.64e15 ? undefined : linear(Math.trunc(value))
  }
  function domain(): [Date, Date]
  function domain(values: Iterable<Date | number>): UtcScale
  function domain(values?: Iterable<Date | number>): [Date, Date] | UtcScale {
    if (values === undefined) {
      const [start, stop] = linear.domain()
      return [new Date(start), new Date(stop)]
    }
    const resolved = Array.from(values, (value) =>
      value == null ? NaN : new Date(Number(value)).getTime(),
    )
    if (
      resolved.length !== 2 ||
      resolved.some((value) => !Number.isFinite(value))
    ) {
      throw new TypeError('A UTC scale domain requires exactly two valid dates')
    }
    linear.domain(resolved)
    refreshMapping()
    return result
  }
  function range(): [number, number]
  function range(values: Iterable<number>): UtcScale
  function range(values?: Iterable<number>): [number, number] | UtcScale {
    if (values === undefined) return linear.range()
    linear.range(values)
    refreshMapping()
    return result
  }
  function clamp(): boolean
  function clamp(value: boolean): UtcScale
  function clamp(value?: boolean): boolean | UtcScale {
    if (value === undefined) return linear.clamp()
    linear.clamp(value)
    clamped = Boolean(value)
    return result
  }
  function ticks(count = 10) {
    const [a, b] = linear.domain()
    const start = Math.min(a, b),
      stop = Math.max(a, b)
    const interval = chooseInterval(start, stop, count)
    if (!interval) return []
    const dates: Date[] = []
    for (let value = ceil(start, interval); value <= stop;) {
      dates.push(new Date(value))
      const next = offset(value, interval)
      if (!(next > value)) break
      value = next
    }
    return b < a ? dates.reverse() : dates
  }
  function nice(count = 10): UtcScale {
    const [a, b] = linear.domain()
    const interval = chooseInterval(Math.min(a, b), Math.max(a, b), count)
    if (!interval) return result
    const start = floor(Math.min(a, b), interval),
      stop = ceil(Math.max(a, b), interval)
    if (Math.abs(start) <= 8.64e15 && Math.abs(stop) <= 8.64e15) {
      linear.domain(b < a ? [stop, start] : [start, stop])
      refreshMapping()
    }
    return result
  }
  const result: UtcScale = Object.assign(scale, {
    domain,
    range,
    clamp,
    ticks,
    nice,
    invert: (value: number) => new Date(linear.invert(value)),
    tickFormat: (_count?: number) => formatUtc,
    copy: () => scaleUtc(domain(), range()).clamp(clamp()),
  })
  if (second !== undefined) {
    if (first !== undefined) domain(first)
    range(second)
  } else if (first !== undefined) {
    range(Array.from(first, Number))
  }
  return result
}

function chooseInterval(
  start: number,
  stop: number,
  count: number,
): Interval | undefined {
  if (!(count > 0) || !Number.isFinite(count)) return undefined
  const target = (stop - start) / count
  if (target < 1_000)
    return ['millisecond', Math.max(1, tickStep(start, stop, count) || 1), 1]
  if (target >= year)
    return [
      'year',
      Math.max(1, tickStep(start / year, stop / year, count)),
      year,
    ]
  let previous = intervals[0]!
  for (const next of intervals.slice(1)) {
    if (target < next[2])
      return target / previous[2] < next[2] / target ? previous : next
    previous = next
  }
  return previous
}

function floor(value: number, [unit, step, duration]: Interval): number {
  if (unit === 'millisecond') return Math.floor(value / step) * step
  if (
    unit === 'second' ||
    unit === 'minute' ||
    unit === 'hour' ||
    unit === 'day'
  )
    return Math.floor(value / duration) * duration
  if (unit === 'week')
    return Math.floor((value + 4 * day) / (7 * day)) * 7 * day - 4 * day
  const date = new Date(value)
  date.setUTCHours(0, 0, 0, 0)
  date.setUTCDate(1)
  if (unit === 'month')
    date.setUTCMonth(Math.floor(date.getUTCMonth() / step) * step)
  else
    date.setUTCFullYear(Math.floor(date.getUTCFullYear() / step) * step, 0, 1)
  return date.getTime()
}

function offset(value: number, interval: Interval): number {
  const [unit, step, duration] = interval
  if (unit === 'millisecond') return value + step
  if (
    unit === 'second' ||
    unit === 'minute' ||
    unit === 'hour' ||
    unit === 'day' ||
    unit === 'week'
  )
    return value + duration
  const date = new Date(value)
  if (unit === 'month') date.setUTCMonth(date.getUTCMonth() + step)
  else date.setUTCFullYear(date.getUTCFullYear() + step)
  return floor(date.getTime(), interval)
}

function ceil(value: number, interval: Interval) {
  const rounded = floor(value, interval)
  if (!Number.isFinite(rounded)) {
    const date = new Date(value)
    const [unit, step] = interval
    // The prior calendar boundary can fall outside JavaScript's Date range.
    if (unit === 'month')
      date.setUTCMonth(Math.floor(date.getUTCMonth() / step) * step + step, 1)
    else if (unit === 'year')
      date.setUTCFullYear(
        Math.floor(date.getUTCFullYear() / step) * step + step,
        0,
        1,
      )
    else return NaN
    date.setUTCHours(0, 0, 0, 0)
    return date.getTime()
  }
  return rounded < value ? offset(rounded, interval) : rounded
}

const months = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]
const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const pad = (value: number, width = 2) => String(value).padStart(width, '0')
function formatUtc(date: Date) {
  if (!Number.isFinite(date.getTime())) return 'Invalid Date'
  if (date.getUTCMilliseconds()) return `.${pad(date.getUTCMilliseconds(), 3)}`
  if (date.getUTCSeconds()) return `:${pad(date.getUTCSeconds())}`
  const hour = date.getUTCHours()
  if (date.getUTCMinutes())
    return `${pad(hour % 12 || 12)}:${pad(date.getUTCMinutes())}`
  if (hour) return `${pad(hour % 12 || 12)} ${hour < 12 ? 'AM' : 'PM'}`
  if (date.getUTCDate() !== 1)
    return `${date.getUTCDay() ? weekdays[date.getUTCDay()] : months[date.getUTCMonth()]!.slice(0, 3)} ${pad(date.getUTCDate())}`
  if (date.getUTCMonth()) return months[date.getUTCMonth()]!
  const value = date.getUTCFullYear()
  return `${value < 0 ? '-' : ''}${pad(Math.abs(value), 4)}`
}
