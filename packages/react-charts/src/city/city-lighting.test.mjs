import { test } from 'vitest'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import {
  buildLighting,
  advanceLighting,
  LIGHTING_TRANSITION_MS,
  lightingPeriod,
  updateLighting,
} from './three/lighting.js'
import { buildBuildings } from './three/buildings.js'
import { updateEffects } from './three/effects.js'
import { disposeSceneGroups } from './engine/scene-resources.js'

const localTime = (hour, minute = 0) => new Date(2026, 9, 18, hour, minute)
const settleLighting = (city, date) => {
  updateLighting(city, date, 0)
  advanceLighting(city, LIGHTING_TRANSITION_MS)
}

test('the three levels follow local time, including period boundaries', () => {
  for (const [hour, minute, expected] of [
    [0, 0, 'night'],
    [5, 59, 'night'],
    [6, 0, 'twilight'],
    [7, 59, 'twilight'],
    [8, 0, 'day'],
    [16, 59, 'day'],
    [17, 0, 'twilight'],
    [18, 59, 'twilight'],
    [19, 0, 'night'],
    [23, 59, 'night'],
  ]) {
    assert.equal(lightingPeriod(localTime(hour, minute)), expected)
    assert.equal(lightingPeriod(localTime(hour, minute), false), 'day')
  }
})

test('windows follow lighting and rebuilds while preserving independent risk effects', () => {
  const city = {
    scene: new THREE.Scene(),
    buildings: new THREE.Group(),
    life: true,
    effects: false,
    camera: new THREE.PerspectiveCamera(),
    palettes: new Map([[1, new THREE.Color('#4b91ef')]]),
    plumes: { update() {} },
    warning: new THREE.InstancedMesh(
      new THREE.PlaneGeometry(),
      new THREE.MeshBasicMaterial(),
      3,
    ),
    active: new Set([1, 2, 3]),
  }
  city.scene.background = new THREE.Color()
  city.scene.add(city.buildings, city.warning)
  buildLighting(city)
  const companies = ['healthy', 'warning', 'critical'].map((status, i) => ({
    id: i + 1,
    x: i * 3,
    z: 0,
    users: 1000,
    mask: 1,
    status,
  }))
  settleLighting(city, localTime(12))
  buildBuildings(city, companies)
  assert.equal(city.windows.material.emissiveIntensity, 0)
  assert.equal(city.scene.background.getHexString(), 'e9ede4')
  assert.equal(city.lights.hemisphere.intensity, 2.5)
  assert.equal(city.lights.sun.intensity, 3.1)
  assert.equal(city.lights.fill.intensity, 0.75)
  const body = city.body
  for (const hour of [18, 22]) {
    settleLighting(city, localTime(hour))
    updateEffects(city, 0)
    assert.equal(city.body, body)
    assert.ok(city.windows.material.emissiveIntensity > 0)
    const color = new THREE.Color()
    for (let i = 0; i < city.windowGlow.count; i++) {
      city.windowGlow.getColorAt(i, color)
      assert.equal(color.getHexString(), 'ffe0a3')
    }
    assert.equal(city.warning.visible, false)
  }
  city.effects = true
  updateEffects(city, 0)
  assert.equal(city.warning.visible, true)
  const color = new THREE.Color()
  const criticalIndex = city.windowGlow.userData.items.findIndex(
    (item) => item.source.critical,
  )
  city.windowGlow.getColorAt(criticalIndex, color)
  assert.ok(color.r > color.g && color.g > color.b)

  disposeSceneGroups([city.buildings])
  buildBuildings(city, companies)
  assert.ok(city.windows.material.emissiveIntensity > 0)
  city.life = false
  settleLighting(city, localTime(22))
  updateEffects(city, 0)
  assert.equal(city.lightingPeriod, 'day')
  assert.equal(city.windows.material.emissiveIntensity, 0)
  assert.equal(city.scene.background.getHexString(), 'e9ede4')
  assert.equal(city.warning.visible, true)
  assert.equal(updateLighting(city, localTime(22)), false)
  disposeSceneGroups([city.scene])
})

test('lighting and windows interpolate without jumps when the target changes during a transition', () => {
  const city = {
    scene: new THREE.Scene(),
    life: true,
    lightingMode: 'day',
    windows: new THREE.Mesh(
      new THREE.PlaneGeometry(),
      new THREE.MeshStandardMaterial(),
    ),
  }
  city.scene.background = new THREE.Color()
  city.scene.add(city.windows)
  buildLighting(city)
  const day = city.scene.background.clone()
  city.lightingMode = 'night'
  updateLighting(city, localTime(12), 0)
  assert.ok(city.scene.background.equals(day))
  assert.equal(city.windows.material.emissiveIntensity, 0)
  advanceLighting(city, LIGHTING_TRANSITION_MS / 2)
  assert.equal(city.windowLight, 0.5)
  assert.equal(city.windows.material.emissiveIntensity, 0.575)
  assert.ok(city.lights.hemisphere.intensity > 0.65)
  assert.ok(city.lights.hemisphere.intensity < 2.5)
  assert.ok(!city.scene.background.equals(day))
  const halfway = city.scene.background.clone()
  city.lightingMode = 'twilight'
  updateLighting(city, localTime(12), LIGHTING_TRANSITION_MS / 2)
  assert.ok(city.scene.background.equals(halfway))
  assert.equal(city.windowLight, 0.5)
  advanceLighting(city, LIGHTING_TRANSITION_MS)
  assert.equal(city.windowLight, 0.75)
  advanceLighting(city, LIGHTING_TRANSITION_MS * 1.5)
  assert.equal(city.scene.background.getHexString(), 'b99086')
  assert.equal(city.windowLight, 1)
  assert.equal(city.lightingTransition, null)
  assert.equal(advanceLighting(city, LIGHTING_TRANSITION_MS * 2), false)
  city.life = false
  updateLighting(city, localTime(12), LIGHTING_TRANSITION_MS * 2)
  advanceLighting(city, LIGHTING_TRANSITION_MS * 2.5)
  assert.equal(city.windowLight, 0.5)
  advanceLighting(city, LIGHTING_TRANSITION_MS * 3)
  assert.ok(city.scene.background.equals(day))
  assert.equal(city.windows.material.emissiveIntensity, 0)
  disposeSceneGroups([city.scene])
})
