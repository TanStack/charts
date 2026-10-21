import { test } from 'vitest'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { mapNorthAngle } from '../../packages/react-charts/src/city/engine/lib/map-compass.js'

test('north follows the projected ground direction at every camera heading and elevation', () => {
  const camera = new THREE.OrthographicCamera(-160, 160, 100, -100, 0.1, 800)
  for (const polar of [1e-6, Math.acos(1 / Math.sqrt(3))]) {
    for (const azimuth of [
      0,
      Math.PI / 4,
      Math.PI / 2,
      Math.PI,
      -Math.PI / 2,
    ]) {
      for (const zoom of [0.5, 1, 3]) {
        const target = new THREE.Vector3(20, 5, -10)
        camera.position
          .copy(target)
          .add(new THREE.Vector3().setFromSphericalCoords(200, polar, azimuth))
        camera.lookAt(target)
        camera.zoom = zoom
        camera.updateProjectionMatrix()
        camera.updateMatrixWorld()
        const origin = target.clone().project(camera)
        const north = target
          .clone()
          .add(new THREE.Vector3(0, 0, -1))
          .project(camera)
        // Convert NDC to pixels for a viewport matching the camera's aspect.
        const expected = Math.atan2(
          (north.x - origin.x) * 160,
          (north.y - origin.y) * 100,
        )
        const actual = mapNorthAngle(camera)
        assert.ok(Math.abs(Math.sin(actual) - Math.sin(expected)) < 1e-9)
        assert.ok(Math.abs(Math.cos(actual) - Math.cos(expected)) < 1e-9)
        if (azimuth === 0) assert.ok(Math.abs(actual) < 1e-9)
      }
    }
  }
})
