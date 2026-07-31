import { createBandScale, type BandScale } from './band-kernel'
import type { ScaleDomainValue } from './intern'

export type { BandScale }

export function scaleBand<
  TDomain extends ScaleDomainValue = string,
>(): BandScale<TDomain>
export function scaleBand<TDomain extends ScaleDomainValue = string>(
  range: Iterable<number>,
): BandScale<TDomain>
export function scaleBand<TDomain extends ScaleDomainValue>(
  domain: Iterable<TDomain>,
  range: Iterable<number>,
): BandScale<TDomain>
export function scaleBand<TDomain extends ScaleDomainValue>(
  first?: Iterable<TDomain> | Iterable<number>,
  second?: Iterable<number>,
): BandScale<TDomain> {
  return createBandScale(false, first, second)
}
