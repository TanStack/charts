import { random, ROAD_EVERY } from './model.js'

export const ROAD = {
  step: 2.8,
  width: 2.15,
  lane: 0.5,
  sidewalk: 1.29,
  crosswalk: 1.8,
  stop: 3.42,
  gateHalf: 2.75,
  carLength: 0.95,
  carWidth: 0.58,
  minGap: 2.0,
}
const mod = (n, d) => ((n % d) + d) % d
const clamp = (v, a, b) => Math.min(b, Math.max(a, v))

// The intersection has a full horizontal strip and two non-overlapping vertical
// connectors. Every street meets the next tile at its full 2.8-unit edge.
export function roadTileParts(col, row) {
  const vertical = col % ROAD_EVERY === 0,
    horizontal = row % ROAD_EVERY === 0
  if (!vertical && !horizontal) return []
  if (vertical && horizontal) {
    const gap = (ROAD.step - ROAD.width) / 2
    return [
      { dx: 0, dz: 0, w: ROAD.step, d: ROAD.width },
      { dx: 0, dz: (ROAD.width + gap) / 2, w: ROAD.width, d: gap },
      { dx: 0, dz: -(ROAD.width + gap) / 2, w: ROAD.width, d: gap },
    ]
  }
  return [
    {
      dx: 0,
      dz: 0,
      w: vertical ? ROAD.width : ROAD.step,
      d: horizontal ? ROAD.width : ROAD.step,
    },
  ]
}

export function signalState(time) {
  const t = mod(time, 42)
  if (t < 9) return { x: 'green', z: 'red', walk: false, remaining: 9 - t }
  if (t < 11) return { x: 'amber', z: 'red', walk: false, remaining: 11 - t }
  if (t < 16) return { x: 'red', z: 'red', walk: false, remaining: 16 - t }
  if (t < 25) return { x: 'red', z: 'green', walk: false, remaining: 25 - t }
  if (t < 27) return { x: 'red', z: 'amber', walk: false, remaining: 27 - t }
  if (t < 32) return { x: 'red', z: 'red', walk: false, remaining: 32 - t }
  if (t < 39) return { x: 'red', z: 'red', walk: true, remaining: 39 - t }
  return { x: 'red', z: 'red', walk: false, remaining: 42 - t }
}

export function makeLoop(x0, z0, x1, z1, offset = ROAD.lane, radius = 0.75) {
  const l = x0 + offset,
    r = x1 - offset,
    t = z0 + offset,
    b = z1 - offset
  const w = r - l - 2 * radius,
    h = b - t - 2 * radius,
    arc = (radius * Math.PI) / 2
  const segments = [
    { length: w, x: l + radius, z: t, dx: 1, dz: 0 },
    { length: arc, cx: r - radius, cz: t + radius, angle: -Math.PI / 2 },
    { length: h, x: r, z: t + radius, dx: 0, dz: 1 },
    { length: arc, cx: r - radius, cz: b - radius, angle: 0 },
    { length: w, x: r - radius, z: b, dx: -1, dz: 0 },
    { length: arc, cx: l + radius, cz: b - radius, angle: Math.PI / 2 },
    { length: h, x: l, z: b - radius, dx: 0, dz: -1 },
    { length: arc, cx: l + radius, cz: t + radius, angle: Math.PI },
  ]
  let distance = 0
  const corners = []
  for (let i = 0; i < segments.length; i++) {
    segments[i].start = distance
    if (i % 2) corners.push(distance + arc / 2)
    distance += segments[i].length
  }
  return { segments, radius, length: distance, corners, x0, z0, x1, z1 }
}

export function loopPoint(loop, distance) {
  const s = mod(distance, loop.length)
  const segment =
    loop.segments.find((e) => s < e.start + e.length) || loop.segments.at(-1)
  const u = s - segment.start
  if (segment.cx !== undefined) {
    const a = segment.angle + u / loop.radius
    return {
      x: segment.cx + Math.cos(a) * loop.radius,
      z: segment.cz + Math.sin(a) * loop.radius,
      ry: Math.atan2(-Math.sin(a), Math.cos(a)),
    }
  }
  return {
    x: segment.x + segment.dx * u,
    z: segment.z + segment.dz * u,
    ry: Math.atan2(segment.dx, segment.dz),
  }
}

export class TrafficSimulation {
  constructor(bounds, seed = 529) {
    this.time = 0
    this.intersections = []
    this.routes = []
    this.cars = []
    this.walkers = []
    this.rng = random(seed)
    const nodes = new Map(),
      key = (x, z) => `${x},${z}`
    for (let z = bounds.z1; z <= bounds.z2; z += ROAD_EVERY)
      for (let x = bounds.x1; x <= bounds.x2; x += ROAD_EVERY) {
        const node = {
          id: key(x, z),
          x: x * ROAD.step,
          z: z * ROAD.step,
          owner: null,
          pedestrians: 0,
        }
        nodes.set(node.id, node)
        this.intersections.push(node)
      }
    const blocks = []
    for (let z = bounds.z1; z < bounds.z2; z += ROAD_EVERY)
      for (let x = bounds.x1; x < bounds.x2; x += ROAD_EVERY)
        blocks.push({ x, z })
    for (let i = blocks.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1))
      ;[blocks[i], blocks[j]] = [blocks[j], blocks[i]]
    }
    for (const { x, z } of blocks.slice(0, 18)) {
      const loop = makeLoop(
        x * ROAD.step,
        z * ROAD.step,
        (x + ROAD_EVERY) * ROAD.step,
        (z + ROAD_EVERY) * ROAD.step,
      )
      loop.nodes = [
        nodes.get(key(x + ROAD_EVERY, z)),
        nodes.get(key(x + ROAD_EVERY, z + ROAD_EVERY)),
        nodes.get(key(x, z + ROAD_EVERY)),
        nodes.get(key(x, z)),
      ]
      loop.gates = loop.corners.map((center, i) => ({
        entry: mod(center - ROAD.gateHalf, loop.length),
        node: loop.nodes[i],
        axis: i % 2 ? 'z' : 'x',
      }))
      this.routes.push(loop)
      for (let j = 0; j < 2; j++) {
        const s = loop.segments[0].length * 0.4 + (j * loop.length) / 2
        const car = {
          id: this.cars.length,
          route: loop,
          s,
          speed: 0,
          maxSpeed: 1.65 + this.rng() * 0.35,
          nextGate: j * 2,
          reservation: null,
          distance: 0,
        }
        Object.assign(car, loopPoint(loop, s))
        this.cars.push(car)
      }
      const footLoop = makeLoop(
        x * ROAD.step,
        z * ROAD.step,
        (x + ROAD_EVERY) * ROAD.step,
        (z + ROAD_EVERY) * ROAD.step,
        ROAD.sidewalk,
        0.12,
      )
      for (let j = 0; j < 2; j++) {
        const s = this.rng() * footLoop.length
        this.walkers.push({
          kind: 'stroll',
          route: footLoop,
          s,
          speed: 0.26 + this.rng() * 0.16,
          ...loopPoint(footLoop, s),
        })
      }
    }
    // A pedestrian scramble phase: cars are red in both directions. Pedestrians
    // only enter when the whole junction is clear, and retain it until exit.
    const crossingNodes = [...this.intersections]
    for (let i = 0; i < Math.min(24, crossingNodes.length); i++) {
      const node =
        crossingNodes[
          Math.floor(
            (i * crossingNodes.length) / Math.min(24, crossingNodes.length),
          )
        ]
      const axis = i % 2 ? 'x' : 'z'
      const edge =
        axis === 'z'
          ? node.x >= bounds.x2 * ROAD.step
            ? -1
            : 1
          : node.z >= bounds.z2 * ROAD.step
            ? -1
            : 1
      const walker = {
        kind: 'cross',
        node,
        axis,
        edge,
        progress: 0,
        direction: 1,
        state: 'waiting',
        wait: this.rng() * 7,
        speed: 0.52 + this.rng() * 0.08,
      }
      this.positionCrossing(walker)
      this.walkers.push(walker)
    }
  }
  positionCrossing(w) {
    const cross = (w.progress * 2 - 1) * ROAD.sidewalk
    w.x = w.node.x + (w.axis === 'x' ? cross : w.edge * ROAD.crosswalk)
    w.z = w.node.z + (w.axis === 'z' ? cross : w.edge * ROAD.crosswalk)
    w.ry =
      w.axis === 'x'
        ? w.direction > 0
          ? Math.PI / 2
          : -Math.PI / 2
        : w.direction > 0
          ? 0
          : Math.PI
  }
  lamp(node, axis) {
    const phase = signalState(this.time)
    if (node.pedestrians > 0) return 'red'
    if (node.owner !== null) {
      const owner = this.cars[node.owner]
      if (owner.reservation?.axis !== axis) return 'red'
    }
    return phase[axis]
  }
  canWalk(node) {
    return signalState(this.time).walk && node.owner === null
  }
  step(dt) {
    let left = Math.min(Math.max(0, dt), 0.1)
    while (left > 1e-8) {
      const h = Math.min(left, 1 / 40)
      this.tick(h)
      left -= h
    }
  }
  tick(dt) {
    this.time += dt
    const phase = signalState(this.time)
    for (const w of this.walkers) {
      if (w.kind === 'stroll') {
        w.s += w.speed * dt
        Object.assign(w, loopPoint(w.route, w.s))
        continue
      }
      if (w.state === 'waiting') {
        w.wait = Math.max(0, w.wait - dt)
        const duration = (ROAD.sidewalk * 2) / w.speed
        if (
          w.wait === 0 &&
          phase.walk &&
          phase.remaining > duration + 0.3 &&
          w.node.owner === null
        ) {
          w.state = 'crossing'
          w.node.pedestrians++
        }
      }
      if (w.state === 'crossing') {
        w.progress = clamp(
          w.progress + (w.direction * w.speed * dt) / (2 * ROAD.sidewalk),
          0,
          1,
        )
        if (w.progress === 0 || w.progress === 1) {
          w.node.pedestrians--
          w.state = 'waiting'
          w.direction *= -1
          w.wait = 8
        }
      }
      this.positionCrossing(w)
    }
    for (const car of this.cars) {
      const loop = car.route
      if (car.reservation && car.s >= car.reservation.exitAt - 1e-7) {
        car.reservation.node.owner = null
        car.reservation = null
        car.nextGate = (car.nextGate + 1) % 4
      }
      let gap = Infinity
      for (const other of this.cars)
        if (other !== car && other.route === loop)
          gap = Math.min(gap, mod(other.s - car.s, loop.length))
      let allowed = Math.max(0, gap - ROAD.minGap)
      if (!car.reservation) {
        const gate = loop.gates[car.nextGate]
        let distance = mod(gate.entry - mod(car.s, loop.length), loop.length)
        if (loop.length - distance < 1e-7) distance = 0
        const permitted =
          phase[gate.axis] === 'green' &&
          gate.node.owner === null &&
          gate.node.pedestrians === 0 &&
          gap > 2 * ROAD.gateHalf + ROAD.minGap
        if (permitted && distance < 0.45) {
          gate.node.owner = car.id
          car.reservation = {
            node: gate.node,
            axis: gate.axis,
            exitAt: car.s + distance + 2 * ROAD.gateHalf,
          }
        } else allowed = Math.min(allowed, distance)
      }
      const target = Math.min(car.maxSpeed, Math.sqrt(2 * 2.4 * allowed))
      car.speed =
        target < car.speed
          ? Math.max(target, car.speed - 2.4 * dt)
          : Math.min(target, car.speed + 1.2 * dt)
      const advance = Math.min(car.speed * dt, allowed)
      car.s += advance
      car.distance += advance
      if (advance < car.speed * dt - 1e-8) car.speed = 0
      Object.assign(car, loopPoint(loop, car.s))
    }
  }
}
