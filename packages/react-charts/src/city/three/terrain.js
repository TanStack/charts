import * as THREE from 'three'
import { ROAD } from '../engine/traffic.js'
import { ROAD_EVERY } from '../engine/model.js'
import { greenLots } from '../engine/landscape.js'
import { instances, material, STEP } from './primitives.js'

// Roads, markings and sidewalks are two-triangle surfaces. Trees keep volume.
export function buildTerrain(city) {
  const plane = new THREE.PlaneGeometry(1, 1)
  plane.rotateX(-Math.PI / 2)
  const asphalt = [],
    roadLines = [],
    timber = [],
    leaves = []
  const rb = city.layout.roadBounds
  for (let z = rb.z1; z <= rb.z2; z++)
    for (let x = rb.x1; x <= rb.x2; x++) {
      const road = x % ROAD_EVERY === 0 || z % ROAD_EVERY === 0
      if (road) {
        // One flat strip per complete road replaces every volumetric tile.
        if (x === rb.x1 && z % ROAD_EVERY === 0)
          asphalt.push({
            x: ((rb.x1 + rb.x2) * STEP) / 2,
            y: 0.015,
            z: z * STEP,
            w: (rb.x2 - rb.x1 + 1) * STEP,
            d: ROAD.width,
            color: '#7c8989',
          })
        if (z === rb.z1 && x % ROAD_EVERY === 0)
          asphalt.push({
            x: x * STEP,
            y: 0.016,
            z: ((rb.z1 + rb.z2) * STEP) / 2,
            w: ROAD.width,
            d: (rb.z2 - rb.z1 + 1) * STEP,
            color: '#7c8989',
          })
        const nearJunction = (v) =>
          Math.min(
            ((v % ROAD_EVERY) + ROAD_EVERY) % ROAD_EVERY,
            ROAD_EVERY - (((v % ROAD_EVERY) + ROAD_EVERY) % ROAD_EVERY),
          ) <= 1
        if (x % ROAD_EVERY !== 0 && z % ROAD_EVERY === 0 && !nearJunction(x))
          roadLines.push({
            x: x * STEP,
            y: 0.052,
            z: z * STEP,
            w: 0.7,
            h: 0.012,
            d: 0.035,
            color: '#e4e5da',
          })
        if (x % ROAD_EVERY === 0 && z % ROAD_EVERY !== 0 && !nearJunction(z))
          roadLines.push({
            x: x * STEP,
            y: 0.052,
            z: z * STEP,
            w: 0.035,
            h: 0.012,
            d: 0.7,
            color: '#e4e5da',
          })
        if (x % ROAD_EVERY === 0 && z % ROAD_EVERY === 0) {
          for (const sign of [-1, 1]) {
            for (let i = 0; i < 3; i++) {
              const q = (i - 1) * 0.58
              if (z + sign >= rb.z1 && z + sign <= rb.z2)
                roadLines.push({
                  x: x * STEP + q,
                  y: 0.055,
                  z: z * STEP + sign * ROAD.crosswalk,
                  w: 0.3,
                  h: 0.012,
                  d: 0.5,
                  color: '#f1efe3',
                })
              if (x + sign >= rb.x1 && x + sign <= rb.x2)
                roadLines.push({
                  x: x * STEP + sign * ROAD.crosswalk,
                  y: 0.055,
                  z: z * STEP + q,
                  w: 0.5,
                  h: 0.012,
                  d: 0.3,
                  color: '#f1efe3',
                })
            }
            if (x + sign >= rb.x1 && x + sign <= rb.x2)
              roadLines.push({
                x: x * STEP + sign * ROAD.stop,
                y: 0.055,
                z: z * STEP - sign * ROAD.lane,
                w: 0.07,
                h: 0.012,
                d: 0.82,
                color: '#f1efe3',
              })
            if (z + sign >= rb.z1 && z + sign <= rb.z2)
              roadLines.push({
                x: x * STEP + sign * ROAD.lane,
                y: 0.055,
                z: z * STEP + sign * ROAD.stop,
                w: 0.82,
                h: 0.012,
                d: 0.07,
                color: '#f1efe3',
              })
          }
        }
      }
    }
  for (const lot of greenLots(city.layout)) {
    const x = lot.col * STEP,
      z = lot.row * STEP
    for (const tree of lot.trees) {
      const tx = x + tree.dx,
        tz = z + tree.dz,
        s = tree.scale
      timber.push({
        x: tx,
        y: 0.41,
        z: tz,
        w: 0.12,
        h: 0.65,
        d: 0.12,
        color: '#947c5f',
      })
      leaves.push({
        x: tx,
        y: 0.96,
        z: tz,
        w: s,
        h: s * 1.4,
        d: s,
        color: tree.color,
      })
    }
    // One low block per bench, roughly knee-high to the pedestrians and
    // one third of a small house's width; shares the trunks' instance batch.
    for (const bench of lot.benches) {
      timber.push({
        x: x + bench.dx,
        y: 0.075,
        z: z + bench.dz,
        w: 0.48,
        h: 0.15,
        d: 0.16,
        ry: bench.rotation,
        color: '#987653',
      })
    }
  }
  const box = new THREE.BoxGeometry(1, 1, 1)
  const sidewalks = asphalt.map((strip) => ({
    ...strip,
    y: 0.004,
    w: strip.w === ROAD.width ? STEP : strip.w,
    d: strip.d === ROAD.width ? STEP : strip.d,
    color: '#c5ccd0',
  }))
  // A single lawn plane fills the city. Building lots are beige planes and
  // sidewalks are gray planes, so each use remains readable without boxes.
  const lots = [
    {
      x: ((rb.x1 + rb.x2) * STEP) / 2,
      y: -0.005,
      z: ((rb.z1 + rb.z2) * STEP) / 2,
      w: (rb.x2 - rb.x1 + 1) * STEP,
      d: (rb.z2 - rb.z1 + 1) * STEP,
      color: '#b2c98c',
    },
    ...city.layout.companies.map((company) => ({
      x: company.x,
      y: 0.002,
      z: company.z,
      w: STEP - 0.12,
      d: STEP - 0.12,
      color: '#eee9df',
    })),
  ]
  instances(plane, material('#ffffff'), lots, city.terrain)
  instances(plane, material('#ffffff'), sidewalks, city.terrain)
  instances(plane, material('#ffffff'), asphalt, city.terrain)
  instances(plane, material('#ffffff'), roadLines, city.terrain)
  instances(box, material('#ffffff'), timber, city.terrain)
  instances(
    new THREE.OctahedronGeometry(1, 0),
    material('#ffffff'),
    leaves,
    city.terrain,
  )
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(1600, 1600),
    material('#e9ede4'),
  )
  ground.rotation.x = -Math.PI / 2
  ground.position.y = -0.01
  city.terrain.add(ground)
}
