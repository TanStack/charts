import { intern, uniqueDomain, type ScaleDomainValue } from './intern'

const implicit = Symbol('implicit')

export interface OrdinalScale<
  TDomain extends ScaleDomainValue = string,
  TRange = unknown,
> {
  (value: TDomain): TRange | undefined
  domain(): TDomain[]
  domain(values: Iterable<TDomain>): OrdinalScale<TDomain, TRange>
  range(): TRange[]
  range(values: Iterable<TRange>): OrdinalScale<TDomain, TRange>
  unknown(): TRange | undefined
  unknown(value: TRange | undefined): OrdinalScale<TDomain, TRange>
  copy(): OrdinalScale<TDomain, TRange>
}

export function scaleOrdinal<
  TDomain extends ScaleDomainValue = string,
  TRange = unknown,
>(): OrdinalScale<TDomain, TRange>
export function scaleOrdinal<TRange>(
  range: Iterable<TRange>,
): OrdinalScale<string, TRange>
export function scaleOrdinal<TDomain extends ScaleDomainValue, TRange>(
  domain: Iterable<TDomain>,
  range: Iterable<TRange>,
): OrdinalScale<TDomain, TRange>
export function scaleOrdinal<TDomain extends ScaleDomainValue, TRange>(
  first?: Iterable<TDomain> | Iterable<TRange>,
  second?: Iterable<TRange>,
): OrdinalScale<TDomain, TRange> {
  let domain: TDomain[] = []
  let index = new Map<string, number>()
  let range: TRange[] = []
  let unknown: TRange | typeof implicit | undefined = implicit

  const scale = ((value: TDomain) => {
    const key = intern(value)
    let position = index.get(key)
    if (position === undefined) {
      if (unknown !== implicit) return unknown
      position = domain.length
      index.set(key, position)
      domain.push(value)
    }
    return range[position % range.length]
  }) as OrdinalScale<TDomain, TRange>

  scale.domain = ((values?: Iterable<TDomain>) => {
    if (values === undefined) return domain.slice()
    const next = uniqueDomain(values)
    domain = next.domain
    index = next.index
    return scale
  }) as OrdinalScale<TDomain, TRange>['domain']

  scale.range = ((values?: Iterable<TRange>) => {
    if (values === undefined) return range.slice()
    range = Array.from(values)
    return scale
  }) as OrdinalScale<TDomain, TRange>['range']

  scale.unknown = function (value?: TRange) {
    if (arguments.length === 0) {
      return unknown === implicit ? undefined : unknown
    }
    unknown = value
    return scale
  } as OrdinalScale<TDomain, TRange>['unknown']

  scale.copy = () => {
    const copy = scaleOrdinal<TDomain, TRange>(domain, range)
    if (unknown !== implicit) copy.unknown(unknown)
    return copy
  }

  if (second !== undefined) {
    scale.domain(first as Iterable<TDomain>).range(second)
  } else if (first !== undefined) {
    scale.range(first as Iterable<TRange>)
  }
  return scale
}
