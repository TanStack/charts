export type ScaleDomainValue = string | number | Date

export function intern(value: ScaleDomainValue): string {
  return value instanceof Date
    ? `date:${value.getTime()}`
    : `${typeof value}:${String(value)}`
}

export function uniqueDomain<TValue extends ScaleDomainValue>(
  values: Iterable<TValue>,
): { domain: TValue[]; index: Map<string, number> } {
  const domain: TValue[] = []
  const index = new Map<string, number>()
  for (const value of values) {
    const key = intern(value)
    if (index.has(key)) continue
    index.set(key, domain.length)
    domain.push(value)
  }
  return { domain, index }
}
