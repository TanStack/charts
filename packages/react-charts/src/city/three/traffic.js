import * as THREE from 'three'
import { TrafficSimulation } from '../engine/traffic.js'
import { instances, material, dummy, rgb, STEP } from './primitives.js'

// Rendering stays separate from the traffic simulation and its crossing rules.
export function buildTraffic(city) {
  city.traffic = new THREE.Group()
  city.scene.add(city.traffic)
  city.traffic.visible = city.life
  city.simulation = new TrafficSimulation(city.layout.roadBounds)
  const sim = city.simulation,
    colors = ['#faf8eb', '#d7b86c', '#829b9b', '#d28a76', '#52777b', '#f2dfab']
  city.cars = instances(
    new THREE.BoxGeometry(1, 1, 1),
    material('#ffffff'),
    sim.cars.map((c, i) => ({
      x: c.x,
      y: 0.28,
      z: c.z,
      w: 0.58,
      h: 0.32,
      d: 0.95,
      color: colors[i % colors.length],
    })),
    city.traffic,
  )
  city.carTops = instances(
    new THREE.BoxGeometry(1, 1, 1),
    material('#a6bfc1', { roughness: 0.35 }),
    sim.cars.map((c) => ({
      x: c.x,
      y: 0.51,
      z: c.z,
      w: 0.47,
      h: 0.16,
      d: 0.44,
    })),
    city.traffic,
  )
  city.walkers = instances(
    new THREE.BoxGeometry(0.14, 0.36, 0.12),
    material('#ffffff'),
    sim.walkers.map((p, i) => ({
      x: p.x,
      y: 0.34,
      z: p.z,
      color: ['#bb7a66', '#667c84', '#b49e69', '#f5ead4', '#6d8973'][i % 5],
    })),
    city.traffic,
  )
  city.heads = instances(
    new THREE.OctahedronGeometry(0.078, 0),
    material('#dcc7a9'),
    sim.walkers.map((p) => ({ x: p.x, y: 0.57, z: p.z })),
    city.traffic,
  )
  const posts = [],
    housings = [],
    bulbs = []
  city.lampItems = []
  for (const node of sim.intersections) {
    for (const [axis, sign] of [
      ['x', 1],
      ['x', -1],
      ['z', 1],
      ['z', -1],
    ]) {
      const bounds = city.layout.roadBounds
      const x = THREE.MathUtils.clamp(
          node.x + (axis === 'x' ? sign * 1.52 : -sign * 1.52),
          bounds.x1 * STEP - 1.17,
          bounds.x2 * STEP + 1.17,
        ),
        z = THREE.MathUtils.clamp(
          node.z + sign * 1.52,
          bounds.z1 * STEP - 1.17,
          bounds.z2 * STEP + 1.17,
        )
      posts.push({
        x,
        y: 0.75,
        z,
        w: 0.055,
        h: 1.4,
        d: 0.055,
        color: '#596763',
      })
      housings.push({
        x,
        y: 1.6,
        z,
        w: axis === 'x' ? 0.14 : 0.22,
        h: 0.54,
        d: axis === 'x' ? 0.22 : 0.14,
        color: '#35433f',
      })
      for (let k = 0; k < 3; k++) {
        const item = {
          x: x + (axis === 'x' ? -sign * 0.085 : 0),
          y: 1.77 - k * 0.17,
          z: z + (axis === 'z' ? -sign * 0.085 : 0),
          w: 0.06,
          h: 0.06,
          d: 0.06,
          color: '#263b32',
        }
        bulbs.push(item)
        city.lampItems.push({
          node,
          axis,
          state: ['red', 'amber', 'green'][k],
        })
      }
      housings.push({
        x,
        y: 0.97,
        z,
        w: 0.16,
        h: 0.2,
        d: 0.16,
        color: '#35433f',
      })
      bulbs.push({
        x: x + (axis === 'x' ? -sign * 0.09 : 0),
        y: 0.98,
        z: z + (axis === 'z' ? -sign * 0.09 : 0),
        w: 0.045,
        h: 0.065,
        d: 0.045,
        color: '#a3473b',
      })
      city.lampItems.push({ node, axis: 'ped', state: 'walk' })
    }
  }
  instances(
    new THREE.BoxGeometry(1, 1, 1),
    material('#ffffff'),
    posts,
    city.traffic,
  )
  instances(
    new THREE.BoxGeometry(1, 1, 1),
    material('#ffffff'),
    housings,
    city.traffic,
  )
  city.signalLamps = instances(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }),
    bulbs,
    city.traffic,
  )
  city.updateTraffic(0)
}
export function updateTraffic(city, dt) {
  if (!city.simulation || (!city.life && dt > 0)) return
  const sim = city.simulation
  if (city.life) sim.step(dt)
  sim.cars.forEach((c, i) => {
    dummy.position.set(c.x, 0.28, c.z)
    dummy.rotation.set(0, c.ry, 0)
    dummy.scale.set(0.58, 0.32, 0.95)
    dummy.updateMatrix()
    city.cars.setMatrixAt(i, dummy.matrix)
    dummy.position.y = 0.51
    dummy.scale.set(0.47, 0.16, 0.44)
    dummy.updateMatrix()
    city.carTops.setMatrixAt(i, dummy.matrix)
  })
  for (const m of [city.cars, city.carTops]) {
    m.instanceMatrix.needsUpdate = true
    m.frustumCulled = false
  }
  sim.walkers.forEach((p, i) => {
    dummy.position.set(p.x, 0.34, p.z)
    dummy.rotation.set(0, p.ry, 0)
    dummy.scale.setScalar(1)
    dummy.updateMatrix()
    city.walkers.setMatrixAt(i, dummy.matrix)
    dummy.position.y = 0.57
    dummy.updateMatrix()
    city.heads.setMatrixAt(i, dummy.matrix)
  })
  for (const m of [city.walkers, city.heads]) {
    m.instanceMatrix.needsUpdate = true
    m.frustumCulled = false
  }
  city.lampItems.forEach((lamp, i) => {
    const on =
      lamp.axis === 'ped'
        ? sim.canWalk(lamp.node)
        : sim.lamp(lamp.node, lamp.axis) === lamp.state
    const color =
      lamp.axis === 'ped'
        ? on
          ? '#83f5a1'
          : '#df6351'
        : on
          ? { red: '#ff5949', amber: '#ffd56c', green: '#75eda0' }[lamp.state]
          : '#263a32'
    city.signalLamps.setColorAt(i, rgb.set(color))
  })
  city.signalLamps.instanceColor.needsUpdate = true
}
