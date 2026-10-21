import { test } from 'vitest'
import assert from 'node:assert/strict'
import {
  ROAD,
  TrafficSimulation,
  signalState,
  roadTileParts,
} from '../../packages/react-charts/src/city/engine/traffic.js'

const pointInCar = (car, x, z, padding = 0) => {
  const dx = x - car.x,
    dz = z - car.z,
    c = Math.cos(car.ry),
    s = Math.sin(car.ry)
  return (
    Math.abs(dx * c - dz * s) < ROAD.carWidth / 2 + padding &&
    Math.abs(dx * s + dz * c) < ROAD.carLength / 2 + padding
  )
}
function carsOverlap(a, b) {
  const axes = [
    [Math.cos(a.ry), -Math.sin(a.ry)],
    [Math.sin(a.ry), Math.cos(a.ry)],
    [Math.cos(b.ry), -Math.sin(b.ry)],
    [Math.sin(b.ry), Math.cos(b.ry)],
  ]
  const radius = (car, axis) =>
    (Math.abs(axis[0] * Math.cos(car.ry) - axis[1] * Math.sin(car.ry)) *
      ROAD.carWidth) /
      2 +
    (Math.abs(axis[0] * Math.sin(car.ry) + axis[1] * Math.cos(car.ry)) *
      ROAD.carLength) /
      2
  return axes.every(
    (axis) =>
      Math.abs((b.x - a.x) * axis[0] + (b.z - a.z) * axis[1]) <
      radius(a, axis) + radius(b, axis) - 1e-5,
  )
}
test('intersection pavement fully connects all four streets', () => {
  const parts = roadTileParts(0, 0)
  const covered = (x, z) =>
    parts.some(
      (p) =>
        Math.abs(x - p.dx) <= p.w / 2 + 1e-8 &&
        Math.abs(z - p.dz) <= p.d / 2 + 1e-8,
    )
  for (let s = -ROAD.width / 2; s <= ROAD.width / 2; s += 0.05) {
    assert.ok(covered(ROAD.step / 2, s))
    assert.ok(covered(-ROAD.step / 2, s))
    assert.ok(covered(s, ROAD.step / 2))
    assert.ok(covered(s, -ROAD.step / 2))
  }
  assert.equal(roadTileParts(1, 1).length, 0)
})
test('traffic lights alternate and reserve an exclusive pedestrian interval', () => {
  for (let t = 0; t < 84; t += 0.1) {
    const p = signalState(t)
    assert.ok(!(p.x === 'green' && p.z === 'green'))
    if (p.walk) {
      assert.equal(p.x, 'red')
      assert.equal(p.z, 'red')
    }
  }
})
test('traffic maintains separation and respects pedestrians over multiple cycles', () => {
  for (const bounds of [
    { x1: -4, x2: 4, z1: -4, z2: 4 },
    { x1: -12, x2: 12, z1: -8, z2: 8 },
    { x1: -28, x2: -12, z1: 4, z2: 20 },
  ]) {
    const sim = new TrafficSimulation(bounds)
    let crossings = 0,
      stops = 0,
      lastDistances = []
    for (let frame = 0; frame < 5000; frame++) {
      sim.step(0.04)
      if (frame === 2900) lastDistances = sim.cars.map((c) => c.distance)
      for (const node of sim.intersections) {
        assert.ok(
          !(node.owner !== null && node.pedestrians > 0),
          'junction shared by pedestrians and vehicle',
        )
      }
      for (let i = 0; i < sim.cars.length; i++) {
        const a = sim.cars[i]
        if (a.speed < 0.01 && frame > 100) stops++
        for (let j = i + 1; j < sim.cars.length; j++) {
          const b = sim.cars[j]
          if (Math.hypot(a.x - b.x, a.z - b.z) < 1.3)
            assert.ok(!carsOverlap(a, b), `vehicles overlap at frame ${frame}`)
        }
        for (const p of sim.walkers)
          if (Math.hypot(a.x - p.x, a.z - p.z) < 1)
            assert.ok(
              !pointInCar(a, p.x, p.z, 0.09),
              `pedestrian collision at frame ${frame}`,
            )
      }
      crossings += sim.walkers.filter((w) => w.state === 'crossing').length
    }
    assert.ok(crossings > 0)
    assert.ok(stops > 0)
    assert.ok(
      sim.cars.every((c, i) => c.distance - lastDistances[i] > 1),
      'cars should keep moving across later signal cycles',
    )
  }
})
