import * as THREE from 'three'
import {
  random,
  metricFor,
  metricDomainFor,
  sizeForValue,
} from '../engine/model.js'
import { facadeWindows, windowEmitters } from '../engine/plumes.js'
import { createCriticalBlink } from '../engine/critical-blink.js'
import { instances, material } from './primitives.js'
import { updateWindowLighting } from './lighting.js'
import { buildingMaterial } from './building-material.js'

// One box per company, one plane per window; health never changes its size.
export function buildBuildings(city, companies) {
  const bodies = [],
    windows = [],
    glows = []
  const rng = random(712)
  const domain = city.layout?.metricDomain ?? metricDomainFor(companies)
  city.emitters = []
  city.warningSources = []
  for (const c of companies) {
    const size = sizeForValue(metricFor(c).value, domain)
    c.height = size.height
    c.house = size.house
    const shade = 0.88 + rng() * 0.22
    const tint = city.palettes.get(c.mask).clone().multiplyScalar(shade)
    const w = size.house ? 1.35 : 1.5 + rng() * 0.14
    const d = size.house ? 1.45 : 1.4 + rng() * 0.15
    c.width = w
    c.depth = d
    bodies.push({
      x: c.x,
      y: c.height / 2 + 0.13,
      z: c.z,
      w,
      h: c.height,
      d,
      color: tint,
      shade,
      company: c.id,
    })
    c.roofTop = c.height + 0.13
    const facade = facadeWindows(c, size, w, d),
      emitters = windowEmitters(c, facade),
      emitting = new Map(emitters.map((e) => [e.index, e]))
    city.emitters.push(...emitters)
    const opening = (f, width, height, color, out = 0.012) => ({
      x: f.x + f.nx * out,
      y: f.y,
      z: f.z + f.nz * out,
      w: width,
      h: height,
      d: 1,
      ry: f.nx ? Math.PI / 2 : 0,
      color,
      company: c.id,
    })
    for (const f of facade) {
      const source = emitting.get(f.index)
      if (source) {
        glows.push({
          ...opening(
            f,
            0.23,
            0.32,
            source.critical ? '#ffad37' : '#555956',
            0.029,
          ),
          source,
        })
      } else
        windows.push(
          opening(f, 0.25, 0.35, rng() > 0.75 ? '#f7e6b2' : '#d9e6e8'),
        )
    }
    if (c.status === 'warning')
      city.warningSources.push({
        x: c.x,
        y: c.height + 1.65,
        z: c.z,
        company: c.id,
        phase: rng() * 5,
      })
  }
  const box = new THREE.BoxGeometry(1, 1, 1)
  city.body = instances(
    box,
    buildingMaterial(box, bodies.length),
    bodies,
    city.buildings,
  )
  const windowPlane = new THREE.PlaneGeometry(1, 1)
  city.windows = instances(
    windowPlane,
    material('#ffffff', { roughness: 0.6 }),
    windows,
    city.buildings,
  )
  updateWindowLighting(city)
  city.windowGlow = instances(
    windowPlane,
    new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }),
    glows,
    city.buildings,
  )
  const criticalBlinks = new Map(
    companies
      .filter((c) => c.status === 'critical')
      .map((c) => [c.id, createCriticalBlink(c.id)]),
  )
  city.criticalSurfaces = [city.body].map((mesh) => ({
    mesh,
    items: mesh.userData.items.flatMap((item, index) =>
      criticalBlinks.has(item.company)
        ? [
            {
              index,
              color: item.color.clone(),
              blink: criticalBlinks.get(item.company),
            },
          ]
        : [],
    ),
  }))
}
