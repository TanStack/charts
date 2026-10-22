import { random } from './model.js'

// Stable per company, independent of frame rate, pagination and mesh order.
export function createCriticalBlink(companyId) {
  let seed = 2166136261
  for (const character of String(companyId))
    seed = Math.imul(seed ^ character.codePointAt(0), 16777619)
  const rng = random(seed),
    ends = []
  let period = 0
  for (let i = 0; i < 32; i++) {
    period += 0.45 + rng() * 0.65
    ends.push(period)
  }
  const offset = rng() * period
  return (time) => {
    const local = (((time + offset) % period) + period) % period
    return ends.findIndex((end) => local < end) % 2 === 0
  }
}
