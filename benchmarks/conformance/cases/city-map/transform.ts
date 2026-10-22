import { districtMasks } from './data'
import type { District, Store } from './data'

interface Bounds {
  x1: number
  x2: number
  z1: number
  z2: number
}
interface Lot {
  x: number
  z: number
  col: number
  row: number
  mask: District
}
type Sizes = Record<'cx' | 'cz' | 'a' | 'b' | 'c' | 'ab' | 'ac' | 'bc', number>
const expansion: Record<Exclude<District, 7>, keyof Sizes> = {
  1: 'a',
  2: 'b',
  4: 'c',
  3: 'ab',
  5: 'ac',
  6: 'bc',
}

export function referenceLots(records: readonly Store[]) {
  const needed = new Map(
    districtMasks.map((mask) => [
      mask,
      records.filter((row) => row.mask === mask).length,
    ]),
  )
  const core = Math.max(
    1,
    Math.ceil(Math.sqrt(Math.max(0, ...needed.values())) / 2),
  )
  const sizes: Sizes = {
    cx: core,
    cz: core,
    a: 1,
    b: 1,
    c: 1,
    ab: 1,
    ac: 1,
    bc: 1,
  }
  let buckets = new Map<District, Lot[]>()
  for (let attempt = 0; attempt < 250; attempt++) {
    const p = sizes
    const a: Bounds = {
      x1: -p.cx - p.ab,
      x2: p.cx + p.ac,
      z1: -p.cz - p.a,
      z2: p.cz,
    }
    const b: Bounds = {
      x1: -p.cx - p.ab - p.b,
      x2: p.cx,
      z1: -p.cz,
      z2: p.cz + p.bc,
    }
    const c: Bounds = {
      x1: -p.cx,
      x2: p.cx + p.ac + p.c,
      z1: -p.cz,
      z2: p.cz + p.bc,
    }
    buckets = new Map(districtMasks.map((mask) => [mask, []]))
    for (let row = a.z1; row <= b.z2; row++) {
      for (let col = b.x1; col <= c.x2; col++) {
        const inside = (bounds: Bounds) =>
          col >= bounds.x1 &&
          col <= bounds.x2 &&
          row >= bounds.z1 &&
          row <= bounds.z2
        const mask = (Number(inside(a)) |
          (Number(inside(b)) << 1) |
          (Number(inside(c)) << 2)) as District | 0
        const park =
          ((Math.imul(col + 59, 7349) ^ Math.imul(row + 41, 9157)) >>> 0) %
            100 <
          9
        if (mask && col % 4 !== 0 && row % 4 !== 0 && !park) {
          buckets
            .get(mask)!
            .push({ x: col * 2.8, z: row * 2.8, col, row, mask })
        }
      }
    }
    const missing = districtMasks.filter(
      (mask) => buckets.get(mask)!.length < needed.get(mask)!,
    )
    if (!missing.length) break
    for (const mask of missing) {
      if (mask === 7) {
        sizes.cx++
        sizes.cz++
      } else sizes[expansion[mask]]++
    }
  }
  for (const lots of buckets.values()) {
    lots.sort(
      (a, b) =>
        a.col * a.col + a.row * a.row - b.col * b.col - b.row * b.row ||
        a.row - b.row ||
        a.col - b.col,
    )
  }
  return records.map((record) => ({
    ...record,
    ...buckets.get(record.mask)!.shift()!,
  }))
}
