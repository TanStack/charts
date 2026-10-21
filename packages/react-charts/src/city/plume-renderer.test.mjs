import { test } from 'vitest'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { WindowPlumes } from './engine/plume-renderer.js'
import { facadeWindows, windowEmitters } from './engine/plumes.js'
import { sizeForUsers } from './engine/model.js'

test('Three.js volumes remain valid, respect selection and can be hidden', () => {
  const c = {
      id: 'company',
      x: 3,
      z: 6,
      height: 4.3,
      house: false,
      status: 'critical',
    },
    size = sizeForUsers(1000)
  const emitters = windowEmitters(c, facadeWindows(c, size, 1.5, 1.4)),
    parent = new THREE.Group(),
    plumes = new WindowPlumes(emitters, parent)
  for (const time of [0, 0.5, 2, 1000]) {
    plumes.update(time, true, new Set([c.id]))
    for (const { mesh } of plumes.layers) {
      assert.ok(mesh.isInstancedMesh)
      assert.ok(mesh.count > 0)
      assert.ok([...mesh.instanceMatrix.array].every(Number.isFinite))
      assert.ok([...mesh.geometry.attributes.aAlpha.array].some((a) => a > 0))
    }
  }
  plumes.update(1, true, new Set())
  for (const { mesh } of plumes.layers)
    assert.ok([...mesh.geometry.attributes.aAlpha.array].every((a) => a === 0))
  plumes.update(1, false, new Set([c.id]))
  for (const { mesh } of plumes.layers) assert.equal(mesh.visible, false)
  const empty = new WindowPlumes([], new THREE.Group())
  empty.update(1, true, new Set())
  for (const { mesh } of empty.layers) assert.equal(mesh.count, 0)
})
