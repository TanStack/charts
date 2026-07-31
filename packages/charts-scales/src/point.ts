import { createBandScale, type PointScale } from './band-kernel'
import type { ScaleDomainValue } from './intern'

export type { PointScale }

export function scalePoint<
  TDomain extends ScaleDomainValue = string,
>(): PointScale<TDomain>
export function scalePoint<TDomain extends ScaleDomainValue = string>(
  range: Iterable<number>,
): PointScale<TDomain>
export function scalePoint<TDomain extends ScaleDomainValue>(
  domain: Iterable<TDomain>,
  range: Iterable<number>,
): PointScale<TDomain>
export function scalePoint<TDomain extends ScaleDomainValue>(
  first?: Iterable<TDomain> | Iterable<number>,
  second?: Iterable<number>,
): PointScale<TDomain> {
  return createBandScale(true, first, second)
}
