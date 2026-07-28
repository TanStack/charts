export interface HexbinPoint {
  id: number
  x: number
  y: number
}

export function hexbinData(revision = 0): readonly HexbinPoint[] {
  let state = 0x7f4a7c15 ^ (revision * 65537)
  return Array.from({ length: 420 }, (_, index) => {
    state = Math.imul(state ^ (state >>> 16), 0x21f0aaad)
    state = Math.imul(state ^ (state >>> 15), 0x735a2d97)
    state ^= state >>> 15
    const noiseX = ((state >>> 0) / 4_294_967_295 - 0.5) * 24
    state = Math.imul(state ^ (state >>> 16), 0x21f0aaad)
    const noiseY = ((state >>> 0) / 4_294_967_295 - 0.5) * 20
    const cluster = index % 3
    return {
      id: index,
      x: ([27, 53, 73][cluster] ?? 0) + noiseX,
      y: ([66, 32, 69][cluster] ?? 0) + noiseY,
    }
  })
}
