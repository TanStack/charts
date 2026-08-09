import { intern, uniqueDomain, type ScaleDomainValue } from './intern'

export interface BandScale<TDomain extends ScaleDomainValue = string> {
  (value: TDomain): number | undefined
  domain(): TDomain[]
  domain(values: Iterable<TDomain>): BandScale<TDomain>
  range(): [number, number]
  range(values: Iterable<number>): BandScale<TDomain>
  rangeRound(values: Iterable<number>): BandScale<TDomain>
  bandwidth(): number
  step(): number
  round(): boolean
  round(value: boolean): BandScale<TDomain>
  padding(): number
  padding(value: number): BandScale<TDomain>
  paddingInner(): number
  paddingInner(value: number): BandScale<TDomain>
  paddingOuter(): number
  paddingOuter(value: number): BandScale<TDomain>
  align(): number
  align(value: number): BandScale<TDomain>
  copy(): BandScale<TDomain>
}

export interface PointScale<TDomain extends ScaleDomainValue = string> {
  (value: TDomain): number | undefined
  domain(): TDomain[]
  domain(values: Iterable<TDomain>): PointScale<TDomain>
  range(): [number, number]
  range(values: Iterable<number>): PointScale<TDomain>
  rangeRound(values: Iterable<number>): PointScale<TDomain>
  bandwidth(): 0
  step(): number
  round(): boolean
  round(value: boolean): PointScale<TDomain>
  padding(): number
  padding(value: number): PointScale<TDomain>
  align(): number
  align(value: number): PointScale<TDomain>
  copy(): PointScale<TDomain>
}

export function createBandScale<TDomain extends ScaleDomainValue>(
  point: false,
  first?: Iterable<TDomain> | Iterable<number>,
  second?: Iterable<number>,
): BandScale<TDomain>
export function createBandScale<TDomain extends ScaleDomainValue>(
  point: true,
  first?: Iterable<TDomain> | Iterable<number>,
  second?: Iterable<number>,
): PointScale<TDomain>
export function createBandScale<TDomain extends ScaleDomainValue>(
  point: boolean,
  first?: Iterable<TDomain> | Iterable<number>,
  second?: Iterable<number>,
): BandScale<TDomain> | PointScale<TDomain> {
  let domain: TDomain[] = []
  let index = new Map<string, number>()
  let positions: number[] = []
  let range: [number, number] = [0, 1]
  let step = 1
  let bandwidth = point ? 0 : 1
  let round = false
  let paddingInner = point ? 1 : 0
  let paddingOuter = 0
  let align = 0.5

  const scale = ((value: TDomain) => {
    const position = index.get(intern(value))
    return position === undefined ? undefined : positions[position]
  }) as BandScale<TDomain>

  const rescale = () => {
    const count = domain.length
    const reverse = range[1] < range[0]
    let start = reverse ? range[1] : range[0]
    const stop = reverse ? range[0] : range[1]
    step = (stop - start) / Math.max(1, count - paddingInner + paddingOuter * 2)
    if (round) step = Math.floor(step)
    start += (stop - start - step * (count - paddingInner)) * align
    bandwidth = step * (1 - paddingInner)
    if (round) {
      start = Math.round(start)
      bandwidth = Math.round(bandwidth)
    }
    positions = Array.from(
      { length: count },
      (_value, position) => start + step * position,
    )
    if (reverse) positions.reverse()
    return scale
  }

  scale.domain = ((values?: Iterable<TDomain>) => {
    if (values === undefined) return domain.slice()
    const next = uniqueDomain(values)
    domain = next.domain
    index = next.index
    return rescale()
  }) as BandScale<TDomain>['domain']

  scale.range = ((values?: Iterable<number>) => {
    if (values === undefined) return [...range]
    range = pair(values)
    return rescale()
  }) as BandScale<TDomain>['range']

  scale.rangeRound = (values) => {
    range = pair(values)
    round = true
    return rescale()
  }
  scale.bandwidth = () => bandwidth
  scale.step = () => step
  scale.round = ((value?: boolean) => {
    if (value === undefined) return round
    round = Boolean(value)
    return rescale()
  }) as BandScale<TDomain>['round']
  scale.padding = ((value?: number) => {
    if (value === undefined) return paddingInner
    paddingOuter = number(value)
    paddingInner = Math.min(1, paddingOuter)
    return rescale()
  }) as BandScale<TDomain>['padding']
  scale.paddingInner = ((value?: number) => {
    if (value === undefined) return paddingInner
    paddingInner = Math.min(1, number(value))
    return rescale()
  }) as BandScale<TDomain>['paddingInner']
  scale.paddingOuter = ((value?: number) => {
    if (value === undefined) return paddingOuter
    paddingOuter = number(value)
    return rescale()
  }) as BandScale<TDomain>['paddingOuter']
  scale.align = ((value?: number) => {
    if (value === undefined) return align
    align = Math.max(0, Math.min(1, number(value)))
    return rescale()
  }) as BandScale<TDomain>['align']
  scale.copy = () => {
    const copy = createBandScale<TDomain>(false, domain, range)
    return copy
      .round(round)
      .paddingInner(paddingInner)
      .paddingOuter(paddingOuter)
      .align(align)
  }

  if (point) {
    const pointScale = scale as unknown as PointScale<TDomain>
    pointScale.bandwidth = () => 0
    pointScale.padding = scale.paddingOuter as PointScale<TDomain>['padding']
    pointScale.copy = () => {
      const copy = createBandScale<TDomain>(true, domain, range)
      return copy.round(round).padding(paddingOuter).align(align)
    }
    delete (pointScale as unknown as Partial<BandScale<TDomain>>).paddingInner
    delete (pointScale as unknown as Partial<BandScale<TDomain>>).paddingOuter
  }

  rescale()
  if (second !== undefined) {
    scale.domain(first as Iterable<TDomain>).range(second)
  } else if (first !== undefined) {
    scale.range(first as Iterable<number>)
  }
  return scale as BandScale<TDomain> | PointScale<TDomain>
}

function pair(values: Iterable<number>): [number, number] {
  const resolved = Array.from(values, number)
  if (
    resolved.length !== 2 ||
    resolved.some((value) => !Number.isFinite(value))
  ) {
    throw new TypeError('A scale range requires exactly two finite numbers')
  }
  return [resolved[0]!, resolved[1]!]
}

function number(value: unknown): number {
  return Number(value)
}
