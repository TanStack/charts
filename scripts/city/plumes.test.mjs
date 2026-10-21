import { test } from 'vitest'
import assert from 'node:assert/strict'
import {
  facadeWindows,
  windowEmitters,
  samplePlume,
  makeParticles,
} from '../../packages/react-charts/src/city/engine/plumes.js'
import { sizeForUsers } from '../../packages/react-charts/src/city/engine/model.js'

function sources(status = 'critical') {
  const c = { id: 'test', x: 10, z: 20, users: 2200, status }
  const size = sizeForUsers(c.users)
  c.height = size.height
  c.house = size.house
  return {
    windows: facadeWindows(c, size, 1.6, 1.5),
    emitters: windowEmitters(c, facadeWindows(c, size, 1.6, 1.5)),
  }
}
test('each emission belongs to a real window and originates inside the building', () => {
  const { windows, emitters } = sources()
  assert.ok(emitters.length > 0)
  for (const e of emitters) {
    assert.ok(windows.some((w) => w.x === e.x && w.y === e.y && w.z === e.z))
    for (let seed = 0; seed < 100; seed++) {
      const p = samplePlume(e, 0, seed)
      const depth = (p.x - e.x) * e.nx + (p.z - e.z) * e.nz
      assert.ok(depth < 0)
      assert.ok(Math.abs(p.y - e.y) + p.radius < e.height / 2)
      const side = -(p.x - e.x) * e.nz + (p.z - e.z) * e.nx
      assert.ok(Math.abs(side) + p.radius < e.width / 2)
    }
  }
})
test('flow fits the opening then expands outward along the normal and rises through buoyancy', () => {
  for (const { emitters } of [sources(), sources('warning')])
    for (const e of emitters)
      for (const kind of ['flame', 'smoke']) {
        let previousY = -Infinity
        for (let age = 0; age < 1.2; age += 0.01) {
          const p = samplePlume(e, age, 3, kind)
          assert.ok(p.y >= previousY - 1e-8)
          previousY = p.y
          if (p.outward < 0.035) {
            const side = -(p.x - e.x) * e.nz + (p.z - e.z) * e.nx
            assert.ok(Math.abs(side) + p.radius < e.width / 2)
            assert.ok(Math.abs(p.y - e.y) + p.length < e.height / 2)
          }
        }
        const birth = samplePlume(e, 0, 3, kind),
          grown = samplePlume(e, 1, 3, kind)
        assert.ok(grown.outward > 0)
        assert.ok(grown.y > birth.y)
        assert.ok(grown.radius > birth.radius)
      }
})
test('medium risk produces only smoke; healthy buildings have no emitter', () => {
  const warning = sources('warning')
  assert.equal(makeParticles(warning.emitters, 'flame').length, 0)
  assert.ok(makeParticles(warning.emitters, 'smoke').length > 0)
  assert.equal(sources('healthy').emitters.length, 0)
  const e = sources().emitters[0]
  const narrow = { ...e, width: e.width / 2, rate: e.rate / 2 }
  assert.ok(
    makeParticles([narrow], 'flame').length <
      makeParticles([e], 'flame').length,
  )
})

test('larger buildings spread smoke across more windows and floors without introducing fire', () => {
  let previous = 0
  for (const users of [30, 300, 1000, 3000]) {
    const size = sizeForUsers(users),
      c = {
        id: `warning-${users}`,
        x: 0,
        z: 0,
        users,
        status: 'warning',
        height: size.height,
        house: size.house,
      }
    const windows = facadeWindows(c, size, 1.5, 1.4),
      emitters = windowEmitters(c, windows)
    assert.ok(emitters.length > previous)
    previous = emitters.length
    assert.equal(new Set(emitters.map((e) => e.index)).size, emitters.length)
    assert.ok(emitters.every((e) => windows.some((w) => w.index === e.index)))
    if (!size.house) {
      assert.ok(new Set(emitters.map((e) => e.y)).size > 1)
      assert.ok(new Set(emitters.map((e) => e.nx)).size > 1)
    }
    assert.equal(makeParticles(emitters, 'flame').length, 0)
  }
})
