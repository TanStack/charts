import { describe, expect, it } from 'vitest'
import { createChartSpring } from './spring'

describe('chart spring physics', () => {
  it('samples underdamped motion with overshoot and natural settling', () => {
    const spring = createChartSpring({ stiffness: 170, damping: 12, mass: 1 })
    const duration = settleTime(spring)
    const samples = Array.from(
      { length: 40 },
      (_, index) => spring.sample((duration * index) / 39).value,
    )

    expect(duration).toBeGreaterThan(500)
    expect(duration).toBeLessThan(2_000)
    expect(Math.max(...samples)).toBeGreaterThan(1)
    expect(spring.sample(duration).done).toBe(true)
    expect(spring.sample(duration).value).toBe(1)
  })

  it('supports critical and overdamped motion without overshoot', () => {
    const critical = createChartSpring({
      stiffness: 100,
      damping: 20,
      mass: 1,
    })
    const overdamped = createChartSpring({
      stiffness: 100,
      damping: 30,
      mass: 1,
    })

    for (const spring of [critical, overdamped]) {
      const duration = settleTime(spring)
      const samples = Array.from(
        { length: 30 },
        (_, index) => spring.sample((duration * index) / 29).value,
      )
      expect(Math.min(...samples)).toBeGreaterThanOrEqual(0)
      expect(Math.max(...samples)).toBeLessThanOrEqual(1)
      expect(spring.sample(duration).done).toBe(true)
    }
  })

  it('preserves value and velocity when retargeted', () => {
    const spring = createChartSpring({ stiffness: 170, damping: 16 })
    const first = spring.sample(180, { from: 0, to: 100, velocity: 0 })
    const retargeted = spring.sample(0, {
      from: first.value,
      to: 20,
      velocity: first.velocity,
    })
    const advanced = spring.sample(16, {
      from: first.value,
      to: 20,
      velocity: first.velocity,
    })

    expect(retargeted.value).toBeCloseTo(first.value)
    expect(retargeted.velocity).toBeCloseTo(first.velocity)
    expect(advanced.value).toBeGreaterThan(retargeted.value)
  })

  it('sanitizes nonphysical parameters', () => {
    const spring = createChartSpring({
      stiffness: -1,
      damping: -1,
      mass: 0,
      restDelta: 0,
      restSpeed: 0,
    })

    expect(spring.options).toMatchObject({
      stiffness: 170,
      damping: 0,
      mass: 1,
      restDelta: 0.005,
      restSpeed: 0.01,
    })
    expect(Object.isFrozen(spring.options)).toBe(true)
  })

  it('handles invalid elapsed time and extreme damping without NaN', () => {
    const spring = createChartSpring({ stiffness: 1e8, damping: 1e12 })

    expect(spring.sample(Number.NaN)).toEqual(spring.sample(0))
    expect(spring.sample(-100)).toEqual(spring.sample(0))
    expect(spring.sample(Number.POSITIVE_INFINITY)).toEqual({
      value: 1,
      velocity: 0,
      done: true,
    })
    expect(Number.isFinite(spring.sample(16).value)).toBe(true)
    expect(Number.isFinite(spring.sample(16).velocity)).toBe(true)
  })
})

function settleTime(spring: ReturnType<typeof createChartSpring>) {
  for (let elapsed = 0; elapsed <= 10_000; elapsed += 1_000 / 120) {
    if (spring.sample(elapsed).done) return elapsed
  }
  throw new Error('Spring did not settle within 10 seconds')
}
