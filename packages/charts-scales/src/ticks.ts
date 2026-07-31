const preferredMultiples = [1, 2, 5, 10] as const

interface TickPlan {
  firstIndex: number
  lastIndex: number
  interval: number
}

export function ticks(start: number, stop: number, count: number): number[] {
  if (!(count > 0)) return []
  if (start === stop) return [start]

  const descending = stop < start
  const plan = createTickPlan(
    descending ? stop : start,
    descending ? start : stop,
    count,
  )
  if (!(plan.lastIndex >= plan.firstIndex)) return []

  return Array.from(
    { length: plan.lastIndex - plan.firstIndex + 1 },
    (_value, offset) =>
      valueAtIndex(
        descending ? plan.lastIndex - offset : plan.firstIndex + offset,
        plan.interval,
      ),
  )
}

export function tickIncrement(start: number, stop: number, count: number) {
  return createTickPlan(start, stop, count).interval
}

export function tickStep(start: number, stop: number, count: number) {
  const descending = stop < start
  const interval = tickIncrement(
    descending ? stop : start,
    descending ? start : stop,
    count,
  )
  const magnitude = interval < 0 ? -1 / interval : interval
  return descending ? -magnitude : magnitude
}

function createTickPlan(start: number, stop: number, count: number): TickPlan {
  let requestedCount = count

  while (true) {
    const interval = chooseInterval(start, stop, requestedCount)
    const firstIndex = indexAtOrAbove(start, interval)
    const lastIndex = indexAtOrBelow(stop, interval)

    if (
      lastIndex >= firstIndex ||
      !(requestedCount >= 0.5 && requestedCount < 2)
    ) {
      return { firstIndex, lastIndex, interval }
    }
    requestedCount *= 2
  }
}

function chooseInterval(start: number, stop: number, count: number): number {
  const target = (stop - start) / Math.max(0, count)
  const exponent = Math.floor(Math.log10(target))
  const decade = 10 ** exponent
  const multiple = closestPreferredMultiple(target / decade)

  return exponent < 0 ? -(10 ** -exponent) / multiple : decade * multiple
}

function closestPreferredMultiple(normalizedTarget: number): number {
  let selected: number = preferredMultiples[0]
  for (const candidate of preferredMultiples.slice(1)) {
    const midpoint = Math.sqrt(selected * candidate)
    if (!(normalizedTarget >= midpoint)) break
    selected = candidate
  }
  return selected
}

function indexAtOrAbove(value: number, interval: number): number {
  const position = interval < 0 ? value * -interval : value / interval
  const nearest = Math.round(position)
  return nearest < position ? nearest + 1 : nearest
}

function indexAtOrBelow(value: number, interval: number): number {
  const position = interval < 0 ? value * -interval : value / interval
  const nearest = Math.round(position)
  return nearest > position ? nearest - 1 : nearest
}

function valueAtIndex(index: number, interval: number): number {
  return interval < 0 ? index / -interval : index * interval
}
