import { tickIncrement, ticks as createTicks, tickStep } from './ticks'

export interface LinearScale {
  (value: number | null | undefined): number | undefined
  domain(): [number, number]
  domain(values: Iterable<number>): LinearScale
  range(): [number, number]
  range(values: Iterable<number>): LinearScale
  invert(value: number): number
  clamp(): boolean
  clamp(value: boolean): LinearScale
  ticks(count?: number): number[]
  tickFormat(count?: number): (value: number) => string
  nice(count?: number): LinearScale
  copy(): LinearScale
}

export function scaleLinear(): LinearScale
export function scaleLinear(range: Iterable<number>): LinearScale
export function scaleLinear(
  domain: Iterable<number>,
  range: Iterable<number>,
): LinearScale
export function scaleLinear(
  first?: Iterable<number>,
  second?: Iterable<number>,
): LinearScale {
  let domain: [number, number] = [0, 1]
  let range: [number, number] = [0, 1]
  let clamped = false

  const scale = ((value: number | null | undefined) => {
    if (value == null || !Number.isFinite(Number(value))) return undefined
    return interpolate(Number(value), domain, range, clamped)
  }) as LinearScale

  scale.domain = ((values?: Iterable<number>) => {
    if (values === undefined) return [...domain]
    domain = pair(values, 'domain')
    return scale
  }) as LinearScale['domain']
  scale.range = ((values?: Iterable<number>) => {
    if (values === undefined) return [...range]
    range = pair(values, 'range')
    return scale
  }) as LinearScale['range']
  scale.invert = (value) => interpolate(value, range, domain, clamped)
  scale.clamp = ((value?: boolean) => {
    if (value === undefined) return clamped
    clamped = Boolean(value)
    return scale
  }) as LinearScale['clamp']
  scale.ticks = (count = 10) => createTicks(domain[0], domain[1], count)
  scale.tickFormat = (count = 10) => {
    const step = Math.abs(tickStep(domain[0], domain[1], count))
    const digits =
      step > 0 && step < 1
        ? Math.min(20, Math.max(0, -Math.floor(Math.log10(step))))
        : 0
    return (value) => {
      const formatted = digits ? value.toFixed(digits) : String(value)
      return formatted === '-0' ? '0' : formatted
    }
  }
  scale.nice = (count = 10) => {
    let start = domain[0]
    let stop = domain[1]
    let startIndex = 0
    let stopIndex = 1
    if (stop < start) {
      ;[start, stop] = [stop, start]
      ;[startIndex, stopIndex] = [stopIndex, startIndex]
    }
    let previousStep: number | undefined
    for (let remaining = 10; remaining > 0; remaining--) {
      const step = tickIncrement(start, stop, count)
      if (step === previousStep) {
        const next: [number, number] = [...domain]
        next[startIndex] = start
        next[stopIndex] = stop
        domain = next
        break
      }
      if (step > 0) {
        start = Math.floor(start / step) * step
        stop = Math.ceil(stop / step) * step
      } else if (step < 0) {
        start = Math.ceil(start * step) / step
        stop = Math.floor(stop * step) / step
      } else {
        break
      }
      previousStep = step
    }
    return scale
  }
  scale.copy = () => scaleLinear(domain, range).clamp(clamped)

  if (second !== undefined) {
    scale.domain(first!).range(second)
  } else if (first !== undefined) {
    scale.range(first)
  }
  return scale
}

function interpolate(
  value: number,
  domain: readonly [number, number],
  range: readonly [number, number],
  clamped: boolean,
) {
  const span = domain[1] - domain[0]
  let ratio = span ? (value - domain[0]) / span : 0.5
  if (clamped) ratio = Math.max(0, Math.min(1, ratio))
  return range[0] + ratio * (range[1] - range[0])
}

function pair(
  values: Iterable<number>,
  name: 'domain' | 'range',
): [number, number] {
  const resolved = Array.from(values, Number)
  if (
    resolved.length !== 2 ||
    resolved.some((value) => !Number.isFinite(value))
  ) {
    throw new TypeError(
      `A linear scale ${name} requires exactly two finite numbers`,
    )
  }
  return [resolved[0]!, resolved[1]!]
}
