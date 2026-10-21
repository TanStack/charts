import { test } from 'vitest'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { disposeSceneGroups } from './engine/scene-resources.js'

test('removed cities release shared resources once and all instance buffers', () => {
  for (let page = 0; page < 20; page++) {
    const terrain = new THREE.Group(),
      buildings = new THREE.Group(),
      geometry = new THREE.BoxGeometry()
    const texture = new THREE.Texture(),
      material = new THREE.MeshStandardMaterial({ map: texture })
    const counts = { geometry: 0, material: 0, texture: 0, instances: 0 }
    geometry.addEventListener('dispose', () => counts.geometry++)
    material.addEventListener('dispose', () => counts.material++)
    texture.addEventListener('dispose', () => counts.texture++)
    for (const group of [terrain, buildings])
      for (let i = 0; i < 3; i++) {
        const mesh = new THREE.InstancedMesh(geometry, material, 100)
        mesh.addEventListener('dispose', () => counts.instances++)
        group.add(mesh)
      }
    disposeSceneGroups([terrain, undefined, buildings])
    assert.equal(terrain.children.length, 0)
    assert.equal(buildings.children.length, 0)
    assert.deepEqual(counts, {
      geometry: 1,
      material: 1,
      texture: 1,
      instances: 6,
    })
    disposeSceneGroups([terrain, buildings])
    assert.deepEqual(counts, {
      geometry: 1,
      material: 1,
      texture: 1,
      instances: 6,
    })
  }
})
